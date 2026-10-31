# 0005 — Clean Architecture por módulos de negocio

**Estado:** aceptada (2026-11-14). Sustituye a [0001](0001-hexagonal-frontend.md).

**Contexto.** La hexagonal por capas globales (0001) usaba como entidades los tipos del contrato, sin comportamiento:
las reglas vivían en funciones sueltas (`rules.ts`) y en un `ChatStore` de casi 400 líneas que mezclaba casos de uso,
estado, temporizadores y el WebSocket. Los errores se mostraban con el texto en inglés del backend.

**Decisión.** Seguir las skills de arquitectura del autor (`clean-architecture-core` + `-frontend`), como el backend (su ADR 0009):
- `src/modules/<m>/{domain,application,infrastructure,test}` por contexto: `shared`, `session`, `user`, `room`,
  `message`, `attachment`, `realtime`, `chat`. Value Objects y entidades inmutables con
  `create`/`ensure*`/`fromPrimitive`/`toPrimitive`, colecciones `XList`; las decisiones viven en el dominio
  (`Room.canRemove`, `Message.canBeEditedBy`, `ProfileChanges.between`, `MessageDraft.hasContent`).
- Casos de uso currificados (dependencias → entrada), uno por acción; `factory.ts` cablea y exporta la instancia que
  usan los hooks (`session`, `rooms`, `chat`…). `modules/shared/application/factory.ts` comparte el único `ApiHttp`
  (el access token). Todo lo externo es un `*Repository` (`HttpRoomRepository`, `WsRealtimeRepository`, `S3AttachmentRepository`).
- El chat en tiempo real es el agregado inmutable `Chat`: `apply(evento)` devuelve el nuevo estado y los efectos que
  decide (marcar leído, recargar salas, caducar el typing). `hooks/ChatSession.ts` es el almacén externo de `useChat`
  (`useSyncExternalStore`): ejecuta esos efectos, lleva los temporizadores y llama a un caso de uso por acción. No usa
  React, así que el smoke (`scripts/dev/e2e-smoke.ts`) lo maneja igual que la UI.
- Fuera de los módulos: `hooks/`, `components/` (contenedor/presentador), `app/` (rutas), `i18n/errorMessages.ts`
  (único diccionario de mensajes, por `code` del backend o de la acción que falló) y `config.ts` (único `process.env`).
- `tests/architecture.test.ts` comprueba estas dependencias.

**Consecuencias.** Más ficheros, pero cada regla tiene un sitio y se prueba sin DOM. Los eventos remotos y las acciones
locales pasan por el mismo agregado. Un fallo de carrera que el diseño anterior escondía (leer el estado antes de un
`await`) quedó cubierto con un test de `ChatSession`.
