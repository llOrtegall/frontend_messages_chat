# 0007 — Estrategia de tests

**Estado:** aceptada (2026-11-14). Sustituye a [0004](0004-testing.md).

**Decisión.** `bun run test` hace dos pasadas de `bun test`:
1. `tests/` y `src/modules/`: dominio (guardas, transiciones, inmutabilidad, ida y vuelta), casos de uso con
   RepositoryMothers (`mock()` de bun) y Object Mothers con faker, repositorios contra servidores `Bun.serve`,
   `ChatSession` con módulos falsos y la regla de arquitectura.
2. `src/components/` con `--preload tests/setup/dom.ts` (happy-dom + Testing Library): contenedores por
   comportamiento visible (rol/etiqueta), con la sesión y el chat como contextos falsos. Va aparte porque happy-dom
   sustituye `fetch` y `WebSocket`, que la primera pasada usa de verdad.

`scripts/dev/e2e-smoke.ts` ejercita los módulos reales contra el backend sin navegador y Playwright (`e2e/`) los
flujos de usuario contra el backend real, con axe.

**Consecuencias.** Los tests de componentes no ven estilos ni el router de Next (`next/link` simulado). Los E2E siguen
necesitando los límites de auth por IP relajados en el backend.
