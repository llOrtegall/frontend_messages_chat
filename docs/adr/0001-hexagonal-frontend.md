# 0001 — Frontend hexagonal con stores propios

**Estado:** aceptada (2026-10-25)

**Contexto.** La lógica (WebSocket, reconexión, no leídos, typing) vivía en hooks y componentes, difícil de probar.

**Decisión.** `src/domain` (tipos del contrato con `import type`, reglas puras, puertos), `src/application`
(`SessionStore`, `ChatStore`: casos de uso + estado, sin React), `src/infrastructure` (HTTP, WebSocket, subida a S3),
`src/ui` (React) y `src/composition-root.ts`. La UI se suscribe a los stores con `useSyncExternalStore`; no hay
librería de estado. `tests/architecture.test.ts` comprueba los imports.

**Consecuencias.** La lógica se prueba con fakes de los puertos y sin DOM. Los efectos remotos (miembros, borrados)
llegan como eventos y actualizan el store: un solo camino para la pestaña actual y las demás.
