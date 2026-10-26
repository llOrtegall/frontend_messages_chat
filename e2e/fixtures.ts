import { test as base, expect, type Browser, type Page } from "@playwright/test";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000";
const ORIGIN = process.env.E2E_BASE_URL ?? "http://localhost:3001";

export interface ChatUser {
  name: string;
  email: string;
  password: string;
  page: Page;
}

let seq = 0;

/**
 * Registers a fresh user through the API inside its own browser context: the response sets the
 * HttpOnly refresh cookie in that context, so opening the app restores the session like a reload.
 */
async function newUser(browser: Browser, label: string): Promise<ChatUser> {
  const name = `${label} ${Date.now().toString(36)}${++seq}`;
  const email = `e2e-${Date.now()}-${seq}@test.local`;
  const password = "password123";
  const context = await browser.newContext();
  const res = await context.request.post(`${API_URL}/api/v1/auth/register`, {
    headers: { Origin: ORIGIN },
    data: { email, password, displayName: name },
  });
  expect(res.status(), await res.text()).toBe(201);
  return { name, email, password, page: await context.newPage() };
}

export const test = base.extend<{ users: (...labels: string[]) => Promise<ChatUser[]> }>({
  users: async ({ browser }, provide) => {
    const created: ChatUser[] = [];
    await provide(async (...labels) => {
      const users = await Promise.all(labels.map((l) => newUser(browser, l)));
      created.push(...users);
      return users;
    });
    await Promise.all(created.map((u) => u.page.context().close()));
  },
});

export { expect };

/** Opens the chat and waits for the realtime connection. */
export async function openChat(user: ChatUser): Promise<void> {
  await user.page.goto("/chat");
  await expect(user.page.getByRole("tab", { name: /Chats/ })).toBeVisible();
  await expect(user.page.getByText("Sin conexión")).toHaveCount(0, { timeout: 10_000 });
}

/** Starts (or reopens) a DM from the Usuarios tab. */
export async function openDm(from: ChatUser, to: ChatUser): Promise<void> {
  const { page } = from;
  await page.getByRole("tab", { name: /Usuarios/ }).click();
  await page.getByRole("searchbox", { name: "Buscar usuarios" }).fill(to.name);
  await page.getByRole("button", { name: new RegExp(to.name) }).click();
  await expect(page.getByRole("heading", { level: 2, name: to.name })).toBeVisible();
}

export async function send(user: ChatUser, text: string): Promise<void> {
  await user.page.getByRole("textbox", { name: "Mensaje" }).fill(text);
  await user.page.getByRole("button", { name: "Enviar", exact: true }).click();
}

export const messages = (user: ChatUser) => user.page.getByRole("log", { name: "Mensajes" });
