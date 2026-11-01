# 0008 — Mensajes pendientes y reintento idempotente

**Estado:** aceptada (2026-11-14).

**Contexto.** Un `chat.send` que se pierde (WebSocket caído, sin ack a tiempo) desaparecía: el compositor mostraba un
error y el usuario tenía que reescribir. El backend ya guarda un `clientMessageId` repetido una sola vez y no vuelve a
anunciarlo, así que reenviar el mismo borrador es seguro.

**Decisión.** Enviar son dos casos de uso: `draftMessage` (valida el texto y sube el archivo; aquí nace el
`ClientMessageId`) y `deliverMessage` (manda ese borrador). El agregado `Chat` guarda los borradores sin confirmar en su
bandeja de salida (`OutgoingMessageList`, estados `sending`/`failed`); el ack los quita y su `message.created` los pone
en el historial. `ChatSession` reenvía los fallidos al reconectar, antes de recargar la página más reciente, y la UI
ofrece "Reintentar" y "Descartar". Una conexión perdida no muestra aviso (lo dice el propio mensaje); un rechazo del
backend sí. Se puede escribir sin conexión: el mensaje espera en la bandeja.

**Consecuencias.** Ningún reintento duplica mensajes, ni automático ni manual. La bandeja vive en memoria: recargar la
pestaña pierde lo no enviado (persistirla exigiría almacenamiento local y caducidad; no se ha necesitado). Un mensaje
rechazado por una regla del backend (p. ej. ya no eres miembro) se vuelve a intentar en cada reconexión hasta que se
descarta, o desaparece si llega `room.removed`.
