import { describe, expect, it, mock } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestFailedError } from "../modules/shared/domain/errors/RequestFailedError.ts";
import { ChangePasswordForm } from "./ChangePasswordForm.tsx";
import { fakeSession, renderInApp } from "./test/renderInApp.tsx";

const fill = async (current: string, chosen: string, repeated = chosen) => {
  await userEvent.type(screen.getByLabelText("Contraseña actual"), current);
  await userEvent.type(screen.getByLabelText(/^Nueva contraseña/), chosen);
  await userEvent.type(screen.getByLabelText("Repite la nueva contraseña"), repeated);
  await userEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
};

describe("ChangePasswordForm", () => {
  it("changes the password, says the other sessions were closed and lets the list refresh", async () => {
    const session = fakeSession();
    const onChanged = mock(() => {});
    renderInApp(<ChangePasswordForm onChanged={onChanged} />, { session });

    await fill("old secret", "new secret");

    expect(session.changePassword).toHaveBeenCalledWith({ currentPassword: "old secret", newPassword: "new secret" });
    expect(screen.getByText("Contraseña cambiada. Se han cerrado tus otras sesiones.")).toBeTruthy();
    expect(onChanged).toHaveBeenCalled();
    expect(screen.getByLabelText("Contraseña actual")).toHaveProperty("value", "");
  });

  it("doesn't send a new password that wasn't repeated the same", async () => {
    const session = fakeSession();
    renderInApp(<ChangePasswordForm onChanged={() => {}} />, { session });

    await fill("old secret", "new secret", "new secrex");

    expect(screen.getByText("Las contraseñas no coinciden")).toBeTruthy();
    expect(session.changePassword).not.toHaveBeenCalled();
  });

  it("words a wrong current password from the dictionary", async () => {
    const session = fakeSession({
      changePassword: mock(async () => {
        throw new RequestFailedError("auth.wrong_password", 400);
      }),
    });
    renderInApp(<ChangePasswordForm onChanged={() => {}} />, { session });

    await fill("bad", "new secret");

    expect(screen.getByText("La contraseña actual no es correcta.")).toBeTruthy();
  });
});
