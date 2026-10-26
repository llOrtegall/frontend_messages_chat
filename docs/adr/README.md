# Architecture Decision Records

Decisiones del frontend. Las que comparte con el backend (contratos, cookie + CSRF, ticket WS, ventana de gracia,
almacenamiento de adjuntos) están en `backend_messages_chat/docs/adr/`.

| # | Decisión |
|---|---|
| [0001](0001-hexagonal-frontend.md) | Frontend hexagonal con stores propios sobre `useSyncExternalStore` |
| [0002](0002-vendored-contracts.md) | Contratos vendorizados del backend y validados en el borde |
| [0003](0003-session-in-memory.md) | Sesión: access token en memoria y guard en el cliente |
| [0004](0004-testing.md) | Tests: `bun test` para capas puras, Playwright contra el backend real |
