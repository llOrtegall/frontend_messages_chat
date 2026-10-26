# 0003 — Sesión: access token en memoria y guard en el cliente

**Estado:** aceptada (2026-10-25)

**Contexto.** El refresh token es una cookie `HttpOnly` del origen del API (ADR 0003 del backend); el servidor Next
no la ve.

**Decisión.** Nada en `localStorage`. Al cargar, `SessionStore.restore()` llama a `/auth/refresh` (single-flight) y
el access token queda en memoria del `HttpClient`, que reintenta una vez tras un 401. Las rutas se protegen en el
cliente con `SessionGate`; el API autoriza todo igualmente. Los tokens de los emails se retiran de la barra de
direcciones al leerlos.

**Consecuencias.** No hay render en servidor de datos privados. Cada recarga cuesta un refresh (limitado por IP).
