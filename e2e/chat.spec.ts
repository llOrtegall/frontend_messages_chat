import AxeBuilder from "@axe-core/playwright";
import { API_URL, expect, messages, openChat, openDm, send, test } from "./fixtures.ts";

// 1x1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

test("login and logout through the UI; wrong password shows an error", async ({ users }) => {
  const [ana] = await users("Ana");
  const { page } = ana;
  await page.context().clearCookies();

  await page.goto("/login");
  await page.getByLabel("Email").fill(ana.email);
  await page.getByLabel("Contraseña").fill("wrong-password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert")).toBeVisible();

  await page.getByLabel("Contraseña").fill(ana.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/chat$/);

  await page.reload(); // the session survives a reload (HttpOnly refresh cookie)
  await expect(page).toHaveURL(/\/chat$/);

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/chat");
  await expect(page).toHaveURL(/\/login$/);
});

test("two users chat live: unread, edit, delete, history after reload", async ({ users }) => {
  const [ana, ben] = await users("Ana", "Ben");
  await openChat(ana);
  await openChat(ben);

  await openDm(ana, ben);
  await send(ana, "hola Ben");
  await expect(messages(ana).getByText("hola Ben")).toBeVisible();

  // Ben sees the new DM, titled with Ana's name, with one unread message.
  const room = ben.page.getByRole("button", { name: new RegExp(`${ana.name}.*1 sin leer`) });
  await expect(room).toBeVisible();
  await room.click();
  await expect(messages(ben).getByText("hola Ben")).toBeVisible();
  await send(ben, "hola Ana");
  await expect(messages(ana).getByText("hola Ana")).toBeVisible();

  // Typing indicator
  await ben.page.getByRole("textbox", { name: "Mensaje" }).pressSequentially("escribiendo", { delay: 20 });
  await expect(ana.page.getByText("Está escribiendo…")).toBeVisible();

  // Edit and delete propagate.
  const own = messages(ana).getByText("hola Ben");
  await own.hover();
  await ana.page.getByRole("button", { name: "Editar mensaje" }).first().click();
  await ana.page.getByRole("textbox", { name: "Editar mensaje" }).fill("hola Ben (editado)");
  await ana.page.keyboard.press("Enter");
  await expect(messages(ben).getByText("hola Ben (editado)")).toBeVisible();
  await expect(messages(ben).getByText("· editado")).toBeVisible();

  await messages(ana).getByText("hola Ben (editado)").hover();
  await ana.page.getByRole("button", { name: "Borrar mensaje" }).first().click();
  await expect(messages(ben).getByText("hola Ben (editado)")).toHaveCount(0);

  // Reload keeps the session; the room was read, so no badge comes back.
  await ben.page.reload();
  await expect(ben.page.getByRole("button", { name: new RegExp(ana.name) })).toBeVisible();
  await expect(ben.page.getByText(/sin leer/)).toHaveCount(0);

  const a11y = await new AxeBuilder({ page: ana.page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(a11y.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});

test("a tab out of view doesn't read the open room; the title counts what is unread", async ({ users }) => {
  const [ana, ben] = await users("Ana", "Ben");
  await openChat(ana);
  await openChat(ben);
  await openDm(ana, ben);
  await send(ana, "primero");
  await ben.page.getByRole("button", { name: new RegExp(`${ana.name}.*1 sin leer`) }).click();
  await expect(messages(ben).getByText("primero")).toBeVisible();
  await expect(ben.page).toHaveTitle("Chat App");

  const setVisibility = (state: "hidden" | "visible") =>
    ben.page.evaluate((value) => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => value });
      document.dispatchEvent(new Event("visibilitychange"));
    }, state);

  await setVisibility("hidden");
  await send(ana, "mientras no miras");
  await expect(messages(ben).getByText("mientras no miras")).toBeVisible();
  await expect(ben.page).toHaveTitle("(1) Chat App");

  await setVisibility("visible");
  await expect(ben.page).toHaveTitle("Chat App");
  await expect(ben.page.getByText(/sin leer/)).toHaveCount(0);
  await ben.page.reload();
  await expect(ben.page.getByRole("button", { name: new RegExp(ana.name) })).toBeVisible();
  await expect(ben.page.getByText(/sin leer/)).toHaveCount(0);
});

test("image attachment is uploaded to the bucket and shown to the other user", async ({ users }) => {
  const [ana, ben] = await users("Ana", "Ben");
  await openChat(ana);
  await openChat(ben);
  await openDm(ana, ben);

  await ana.page.getByLabel("Adjuntar archivo").setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
  await expect(ana.page.getByAltText("Vista previa del adjunto")).toBeVisible();
  await send(ana, "una foto");

  await ben.page.getByRole("button", { name: new RegExp(ana.name) }).click();
  const img = messages(ben).getByAltText("Imagen adjunta");
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(1);

  // SVG is not offered and is refused if forced.
  await ana.page.getByLabel("Adjuntar archivo").setInputFiles({ name: "x.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await ana.page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(ana.page.getByRole("alert").filter({ hasText: "Tipo de archivo no permitido" })).toBeVisible();
});

test("groups: sender names, roles and leaving", async ({ users }) => {
  const [ana, ben] = await users("Ana", "Ben");
  await openChat(ana);
  await openChat(ben);

  await ana.page.getByRole("button", { name: "+ Nueva conversación" }).click();
  const dialog = ana.page.getByRole("dialog", { name: "Nueva conversación" });
  await dialog.getByRole("tab", { name: "Grupo" }).click();
  await dialog.getByLabel("Nombre del grupo").fill("Equipo E2E");
  await dialog.getByRole("searchbox", { name: "Buscar usuario" }).fill(ben.name);
  await dialog.getByRole("button", { name: ben.name }).click();
  await dialog.getByRole("button", { name: "Crear grupo" }).click();
  await expect(ana.page.getByRole("heading", { level: 2, name: "Equipo E2E" })).toBeVisible();

  await ben.page.getByRole("button", { name: /Equipo E2E/ }).click();
  await send(ana, "bienvenido");
  await expect(messages(ben).getByText(ana.name, { exact: true })).toBeVisible(); // sender name above group messages

  await ana.page.getByRole("button", { name: /miembros · ver/ }).click();
  const panel = ana.page.getByRole("complementary", { name: /Miembros/ });
  await panel.getByRole("button", { name: "Hacer admin" }).click();
  await ben.page.getByRole("button", { name: /miembros · ver/ }).click();
  const benPanel = ben.page.getByRole("complementary", { name: /Miembros/ });
  await expect(benPanel.getByRole("listitem").filter({ hasText: ben.name })).toContainText("admin");

  ben.page.once("dialog", (d) => void d.accept());
  await benPanel.getByRole("button", { name: "Salir del grupo" }).click();
  await expect(ben.page.getByRole("button", { name: /Equipo E2E/ })).toHaveCount(0);
  await expect(panel.getByRole("listitem")).toHaveCount(1);
});

test("security: end another device's session and change the password", async ({ users, browser, baseURL }) => {
  const [ana] = await users("Ana");
  const origin = { Origin: baseURL! };
  const laptop = await browser.newContext({ userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0" });
  const login = await laptop.request.post(`${API_URL}/api/v1/auth/login`, { headers: origin, data: { email: ana.email, password: ana.password } });
  expect(login.status()).toBe(200);

  await openChat(ana);
  await ana.page.getByRole("button", { name: "Seguridad" }).click();
  const dialog = ana.page.getByRole("dialog", { name: "Seguridad" });
  await expect(dialog.getByText("Esta sesión")).toBeVisible();
  await dialog.getByRole("button", { name: "Cerrar la sesión de Firefox en Linux" }).click();
  await expect(dialog.getByRole("button", { name: /Cerrar la sesión de/ })).toHaveCount(0);
  expect((await laptop.request.post(`${API_URL}/api/v1/auth/refresh`, { headers: origin })).status()).toBe(401);
  await laptop.close();

  await dialog.getByLabel("Contraseña actual").fill("not-my-password");
  await dialog.getByLabel(/^Nueva contraseña/).fill("brand-new-secret");
  await dialog.getByLabel("Repite la nueva contraseña").fill("brand-new-secret");
  await dialog.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(dialog.getByText("La contraseña actual no es correcta.")).toBeVisible();

  await dialog.getByLabel("Contraseña actual").fill(ana.password);
  await dialog.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(dialog.getByText("Contraseña cambiada. Se han cerrado tus otras sesiones.")).toBeVisible();
  const relogin = await ana.page.request.post(`${API_URL}/api/v1/auth/login`, { headers: origin, data: { email: ana.email, password: "brand-new-secret" } });
  expect(relogin.status()).toBe(200);
});

test("direct rooms show what was seen, and a muted room stays quiet", async ({ users }) => {
  const [ana, ben] = await users("Ana", "Ben");
  await openChat(ana);
  await openChat(ben);
  await openDm(ana, ben);
  await send(ana, "¿lo ves?");
  await expect(messages(ana).getByText("· Visto")).toHaveCount(0);

  await ben.page.getByRole("button", { name: new RegExp(`${ana.name}.*1 sin leer`) }).click();
  await expect(messages(ben).getByText("¿lo ves?")).toBeVisible();
  await expect(messages(ana).getByText(/· Visto/)).toBeVisible();

  await ben.page.getByRole("button", { name: "Silenciar conversación" }).click();
  await ben.page.getByRole("menuitem", { name: "Silenciar 1 hora" }).click();
  await expect(ben.page.getByRole("button", { name: /Silenciada hasta/ })).toBeVisible();
  await ben.page.getByRole("button", { name: "Cerrar conversación" }).click();

  await send(ana, "otro más");
  const room = ben.page.getByRole("button", { name: new RegExp(`${ana.name}.*silenciada`) });
  await expect(room).toBeVisible();
  await ben.page.waitForTimeout(500);
  await expect(ben.page.getByText(/sin leer/)).toHaveCount(0);
  await expect(ben.page).toHaveTitle("Chat App");

  await ben.page.reload();
  await expect(ben.page.getByRole("button", { name: new RegExp(`${ana.name}.*silenciada`) })).toBeVisible();
  await room.click();
  await ben.page.getByRole("button", { name: /Silenciada hasta/ }).click();
  await ben.page.getByRole("menuitem", { name: "Reactivar avisos" }).click();
  await expect(ben.page.getByRole("button", { name: "Silenciar conversación" })).toBeVisible();
});
