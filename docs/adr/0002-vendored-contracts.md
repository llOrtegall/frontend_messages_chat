# 0002 — Contratos vendorizados y validados en el borde

**Estado:** aceptada (2026-10-25)

**Decisión.** `src/contracts/` es una copia exacta de la del backend (`bun run contracts:sync`; CI falla con
`contracts:check` si difiere o se editó a mano). Los adaptadores validan cada respuesta HTTP y cada frame WS con esos
schemas; un desajuste es un error visible, no un `undefined` silencioso. El dominio solo importa sus tipos.

**Consecuencias.** Cambiar la API exige sincronizar; las reglas que dependen de listas del contrato (tipos de adjunto)
usan `satisfies Record<…>` para que el typecheck detecte divergencias.
