# 0004 — Estrategia de tests

**Estado:** sustituida por [0007](0007-testing.md) (aceptada 2026-10-26)

**Decisión.** `bun test` (mismo runner que el backend) para dominio, stores con fakes, adaptadores contra servidores
`Bun.serve` locales y la regla de arquitectura. `scripts/dev/e2e-smoke.ts` ejercita las capas reales contra el
backend sin navegador. Playwright (`e2e/`, Chromium) cubre los flujos de usuario en navegador contra el backend real
con usuarios creados por API en cada test, más una pasada de axe; en CI con el compose del backend.

**Consecuencias.** No hay tests de componentes con DOM simulado: la UI se cubre de extremo a extremo. Los E2E
necesitan los límites de auth por IP relajados en el backend.
