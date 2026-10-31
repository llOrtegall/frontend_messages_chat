# 0006 — Lectura tolerante de los contratos

**Estado:** aceptada (2026-11-14). Matiza [0002](0002-vendored-contracts.md).

**Contexto.** Los contratos son `strictObject` para que el backend no filtre campos. El frontend validaba también con
ellos, así que un campo nuevo en una respuesta (pasó con `mutedUntil` en `GET /rooms`) rompía al frontend que aún no
lo conocía: entre desplegar el backend y el frontend, o en una pestaña abierta desde antes, la pantalla fallaba.

**Decisión.** `modules/shared/infrastructure/readContract.ts` valida con el contrato y, si los únicos fallos son claves
desconocidas, las quita y vuelve a validar. Lo usan `ApiHttp` y `WsRealtimeRepository` (frames y acks). Los schemas no
cambian: el backend sigue validando en estricto en sus tests.

**Consecuencias.** Añadir campos al contrato es compatible hacia atrás con frontends desplegados. Quitar, renombrar o
cambiar el tipo de un campo que el frontend usa sigue fallando (contrato roto). `contracts:check` en CI detecta la deriva.
