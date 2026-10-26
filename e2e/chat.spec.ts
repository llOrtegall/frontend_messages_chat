import AxeBuilder from "@axe-core/playwright";
import { expect, messages, openChat, openDm, send, test } from "./fixtures.ts";

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
