import { DomainError } from "../modules/shared/domain/DomainError.ts";

// Codes with a meaning of their own. Generic ones (internal, request.failed, request.invalid,
// request.unexpected_response) are left out on purpose: the action that failed explains more.
const MESSAGES: Readonly<Record<string, string>> = {
  "request.network": "No hay conexión con el servidor. Comprueba tu red e inténtalo de nuevo.",
  "request.rate_limited": "Demasiados intentos seguidos. Espera un momento y vuelve a probar.",
  "realtime.disconnected": "Sin conexión con el servidor. Se reintentará al reconectar.",
  "realtime.timeout": "El servidor no respondió a tiempo. Inténtalo de nuevo.",

  "auth.invalid_credentials": "Email o contraseña incorrectos.",
  "auth.email_in_use": "Ya existe una cuenta con ese email.",
  "auth.invalid_password": "La contraseña debe tener entre 8 y 128 caracteres.",
  "auth.wrong_password": "La contraseña actual no es correcta.",
  "auth.invalid_email_token": "El enlace no es válido o ha caducado.",
  "auth.session_not_found": "Esa sesión ya no existe.",
  "auth.unauthenticated": "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  "auth.invalid_refresh_token": "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  "auth.refresh_token_expired": "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  "email.delivery_failed": "No se pudo enviar el email. Inténtalo más tarde.",

  "user.invalid_display_name": "El nombre visible debe tener entre 1 y 64 caracteres.",
  "user.invalid_email": "El email no es válido.",
  "user.avatar_not_image": "La foto de perfil debe ser una imagen.",
  "user.not_found": "Ese usuario no existe.",

  "attachment.too_large": "El archivo supera el tamaño máximo permitido.",
  "attachment.empty": "El archivo está vacío.",
  "attachment.type_not_allowed": "Tipo de archivo no permitido (imágenes, PDF o texto).",
  "attachment.size_not_allowed": "El archivo supera el tamaño máximo permitido.",
  "attachment.not_uploaded": "El archivo no llegó a subirse. Vuelve a adjuntarlo.",
  "attachment.upload_failed": "No se pudo subir el archivo.",

  "room.not_found": "Esa conversación ya no existe.",
  "room.not_member": "Ya no formas parte de esta conversación.",
  "room.not_a_group": "Solo se pueden gestionar miembros en los grupos.",
  "room.already_member": "Esa persona ya está en el grupo.",
  "room.member_not_found": "Esa persona ya no está en el grupo.",
  "room.admin_required": "Solo los administradores pueden hacer esto.",
  "room.owner_required": "Solo el propietario del grupo puede hacer esto.",
  "room.admin_cannot_remove_admin": "Un administrador no puede quitar a otro administrador.",
  "room.owner_untouchable": "El propietario del grupo no se puede quitar ni cambiar de rol.",
  "room.owner_cannot_leave": "El propietario no puede salir del grupo; puede eliminarlo.",
  "room.invalid_mute": "El silencio debe terminar en el futuro.",

  "message.empty": "El mensaje está vacío.",
  "message.not_found": "Ese mensaje ya no existe.",
  "message.not_sender": "Solo puedes editar tus propios mensajes.",
  "message.cannot_delete": "No puedes borrar este mensaje.",
};

const ACTION_FAILURES = {
  "session.login": "No se pudo iniciar sesión.",
  "session.register": "No se pudo crear la cuenta.",
  "profile.save": "No se pudo guardar el perfil.",
  "email.verify": "El enlace no es válido o ha caducado.",
  "email.request_reset": "No se pudo enviar el enlace.",
  "password.reset": "No se pudo cambiar la contraseña.",
  "password.change": "No se pudo cambiar la contraseña.",
  "sessions.load": "No se pudieron cargar las sesiones.",
  "session.end": "No se pudo cerrar la sesión.",
  "users.search": "No se pudo buscar usuarios.",
  "rooms.load": "No se pudieron cargar las conversaciones.",
  "room.open_direct": "No se pudo abrir la conversación.",
  "room.create": "No se pudo crear la conversación.",
  "room.delete": "No se pudo eliminar la conversación.",
  "member.add": "No se pudo añadir al miembro.",
  "member.remove": "No se pudo quitar al miembro.",
  "member.change_role": "No se pudo cambiar el rol.",
  "group.leave": "No se pudo salir del grupo.",
  "messages.load": "No se pudieron cargar los mensajes.",
  "message.send": "No se pudo enviar el mensaje.",
  "message.edit": "No se pudo editar el mensaje.",
  "message.delete": "No se pudo borrar el mensaje.",
} as const;

export type FailedAction = keyof typeof ACTION_FAILURES;

const SOMETHING_WENT_WRONG = "Algo salió mal. Inténtalo de nuevo.";

/** The text to show for a failure: the error's own message when it has one, else what the action couldn't do. */
export const messageFor = (error: unknown, action?: FailedAction): string => {
  const own = error instanceof DomainError ? MESSAGES[error.code] : undefined;
  return own ?? (action ? ACTION_FAILURES[action] : SOMETHING_WENT_WRONG);
};
