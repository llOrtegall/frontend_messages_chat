import { describe, expect, it, mock } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestFailedError } from "../modules/shared/domain/errors/RequestFailedError.ts";
import { AuthForm } from "./AuthForm.tsx";
import { fakeSession, renderInApp } from "./test/renderInApp.tsx";

describe("AuthForm", () => {
  it("signs in with what the user typed", async () => {
    const session = fakeSession();
    renderInApp(<AuthForm mode="login" />, { session });

    await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(session.signIn).toHaveBeenCalledWith({ email: "ana@example.com", password: "password123" });
  });

  it("shows the dictionary message when the credentials are wrong", async () => {
    const session = fakeSession({ signIn: mock(async () => Promise.reject(new RequestFailedError("auth.invalid_credentials", 401))) });
    renderInApp(<AuthForm mode="login" />, { session });

    await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Email o contraseña incorrectos.");
    expect(screen.getByRole("button", { name: "Entrar" })).toHaveProperty("disabled", false);
  });

  it("asks for a display name only when registering", async () => {
    const session = fakeSession();
    renderInApp(<AuthForm mode="register" />, { session });

    await userEvent.type(screen.getByLabelText("Nombre visible"), "Ana");
    await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
    await userEvent.type(screen.getByLabelText(/Contraseña/), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Registrarme" }));

    expect(session.signUp).toHaveBeenCalledWith({ email: "ana@example.com", password: "password123", displayName: "Ana" });
  });
});
