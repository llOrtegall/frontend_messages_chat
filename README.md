# frontend_messages_chat

Cliente web del chat en tiempo real. El backend vive en
[backend_messages_chat](https://github.com/llOrtegall/backend_messages_chat) (REST + WebSocket).

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Estilos | Tailwind CSS 4 |
| Lenguaje | TypeScript 5 (TS 7 cuando `typescript-eslint` lo soporte) |
| Validación | Zod 4, con los contratos del backend |
| Tests | `bun test` |

## Puesta en marcha

Requiere el backend corriendo en `http://localhost:3000` (ver su README: Docker, `bun run migrate`, `bun run seed`,
`bun run dev`).

```bash
bun install
echo 'NEXT_PUBLIC_API_URL=http://localhost:3000' > .env.local
bun dev            # http://localhost:3001 — usuarios de prueba: alice/bob/carol@dev.local · password123
```

## Scripts

| Script | |
|---|---|
| `bun dev` / `bun run build` | Desarrollo (puerto 3001) / build de producción |
| `bun run typecheck` · `bun run lint` | |
| `bun run test` | Tests unitarios, de infraestructura (servidores falsos) y de arquitectura |
| `bun run contracts:sync` | Copia `src/contracts/` desde `../backend_messages_chat` (o `$CONTRACTS_BACKEND_DIR`) |
| `bun run contracts:check` | Falla si `src/contracts/` se editó a mano o difiere del backend |
| `bun scripts/dev/e2e-smoke.ts` | Prueba E2E de las capas de aplicación e infraestructura contra el backend en marcha |
| `bun run e2e` | Playwright (Chromium): flujos de 2 usuarios en el navegador contra el backend real |

### E2E con Playwright

`e2e/` abre un contexto de navegador por usuario (registrados por API en cada test, sin depender del seed) y cubre
login/logout, chat en vivo (no leídos, typing, edición, borrado, recarga), adjuntos al bucket, grupos (roles, salir)
y una pasada de axe (WCAG A/AA, sin violaciones serias). Requisitos:

1. Backend en marcha con su stack (`docker compose -f docker-compose.dev.yml up -d`) y los límites por IP relajados,
   porque todos los navegadores comparten IP:
   `RATE_LIMIT_LOGIN_MAX=1000 RATE_LIMIT_REGISTER_MAX=1000 RATE_LIMIT_REFRESH_MAX=1000 bun run dev`.
2. `bun run e2e` (arranca `bun dev` si no hay frontend en :3001). La primera vez: `bunx playwright install chromium`
   y, en Linux, las dependencias del sistema (`sudo bunx playwright install-deps chromium`). Sin sudo (p. ej. WSL),
   con la imagen oficial:
   `docker run --rm --network host --user $(id -u):$(id -g) -e HOME=/tmp -v $PWD:$PWD -w $PWD mcr.microsoft.com/playwright:v1.64.1-noble npx playwright test`

En CI lo ejecuta `.github/workflows/e2e.yml` (stack del backend con su compose, build de producción, trazas como
artefacto si falla).

## Despliegue

`Dockerfile` construye el servidor standalone de Next (Node 24, usuario no root). La URL del API se fija al construir:
`docker build --build-arg NEXT_PUBLIC_API_URL=https://chat.example.com -t chat-web .`. El stack completo (Caddy, API,
web, Postgres, Redis) está en el backend: [`deploy/README.md`](https://github.com/llOrtegall/backend_messages_chat/blob/master/deploy/README.md).

## Arquitectura (hexagonal)

```
src/
  app/                 Rutas de Next: solo componen la UI
  contracts/           Formato de red del backend (copia sincronizada, no editar)
  domain/              Entidades (tipos de contracts), reglas puras y puertos
  application/         SessionStore y ChatStore: casos de uso + estado (sin React ni fetch)
  infrastructure/      HttpClient y adaptadores REST, WsRealtimeGateway
  ui/                  Componentes y hooks; providers.tsx crea el contenedor
  composition-root.ts  Único sitio que conoce los adaptadores concretos
```

`tests/architecture.test.ts` hace cumplir las dependencias entre capas.

- **Sesión**: el refresh token es una cookie `HttpOnly` del API; el access token vive solo en memoria. Al cargar, la
  sesión se restaura con un refresh (single-flight: el backend revoca la sesión si se reutiliza un token rotado).
- **Tiempo real**: el WebSocket se abre con un ticket de un solo uso (`POST /ws/ticket`), nunca con el JWT en la URL.
  Reconecta con backoff y jitter, re-suscribe las rooms y, tras cada (re)conexión, recarga rooms y la conversación
  abierta porque los eventos perdidos no se reenvían.
- **Contratos**: respuestas REST y frames WS se validan con Zod; un frame inválido se descarta.
- **Rutas**: la protección es en cliente (`SessionGate`): la cookie pertenece al origen del API y el servidor de Next no
  la ve. El API autoriza cada petición igualmente.
