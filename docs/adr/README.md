# Architecture Decision Records

Decisiones del frontend. Las que comparte con el backend (contratos, cookie + CSRF, ticket WS, ventana de gracia,
almacenamiento de adjuntos) están en `backend_messages_chat/docs/adr/`.

| # | Decisión |
|---|---|
| [0001](0001-hexagonal-frontend.md) | ~~Frontend hexagonal con stores propios~~ (sustituida por 0005) |
| [0002](0002-vendored-contracts.md) | Contratos vendorizados del backend y validados en el borde |
| [0003](0003-session-in-memory.md) | Sesión: access token en memoria y guard en el cliente |
| [0004](0004-testing.md) | ~~Tests sin DOM~~ (sustituida por 0007) |
| [0005](0005-clean-architecture-modules.md) | Clean Architecture por módulos de negocio; agregado `Chat` y `ChatSession` |
| [0006](0006-tolerant-contract-reads.md) | Lectura tolerante de los contratos (campos nuevos no rompen al frontend) |
| [0007](0007-testing.md) | Tests: dominio/casos de uso/infra sin DOM, componentes con happy-dom, smoke y Playwright |
| [0008](0008-outbox-and-idempotent-retry.md) | Mensajes pendientes en el agregado y reintento con el mismo `clientMessageId` |
