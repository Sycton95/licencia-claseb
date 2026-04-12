# Deploy y Release

## Rama y despliegue

- `main` despliega producción
- ramas `codex/*` o de feature generan preview
- no se edita directamente en producción

## Variables

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY` solo como fallback legado
- `VITE_ENABLE_LOCAL_ADMIN=false`
- `VITE_ENABLE_PREVIEW_ADMIN_BYPASS=false`
- `VITE_PUBLIC_ADMIN_URL=https://licencia-claseb.vercel.app/admin`

Servidor:

- `SUPABASE_SERVICE_ROLE_KEY` para endurecer mutaciones editoriales

Preview mÃ­nimo para validar `GET /api/health`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Regla de separaciÃ³n:

- en este proyecto los env de Preview pueden quedar acoplados al `git branch` cuando se usan overrides por rama
- primero se empuja la rama preview
- despuÃ©s se agregan o sincronizan las tres variables para esa rama concreta
- luego se redeploya y se ejecuta el smoke check contra esa URL preview
- `VITE_ENABLE_PREVIEW_ADMIN_BYPASS` controla solo el acceso UI en preview
- no sustituye la paridad del health check contra Supabase

Mapa con Supabase:

- `Publishable key` -> `VITE_SUPABASE_PUBLISHABLE_KEY`
- `Secret key` -> `SUPABASE_SERVICE_ROLE_KEY`

## Supabase Auth

En `Supabase Dashboard -> Authentication -> URL Configuration`:

- `Site URL`: `https://licencia-claseb.vercel.app`
- `Redirect URL`: `https://licencia-claseb.vercel.app/admin`
- `Redirect URL`: `http://localhost:3000/admin`
- `Redirect URL`: `http://localhost:5173/admin`

Regla operativa:

- login admin normal siempre desde producción
- localhost solo para desarrollo y pruebas controladas
- preview bypass solo cuando `VITE_ENABLE_PREVIEW_ADMIN_BYPASS=true` en Vercel Preview

## Login admin desde teléfono

Checklist:

1. abrir `/admin` en producción
2. pedir el magic link desde `https://licencia-claseb.vercel.app/admin`
3. abrir el correo en el teléfono
4. confirmar que el enlace apunta a `https://licencia-claseb.vercel.app/admin`
5. evitar pedir el enlace desde localhost fuera de pruebas locales

## Prueba local sin magic link

Usa este procedimiento solo para validar UI y flujo editorial local. No sustituye la validación real de auth.

1. crea o actualiza `.env.local`
2. define `VITE_ENABLE_PREVIEW_ADMIN_BYPASS=true`
3. mantén `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` si quieres seguir consumiendo lectura pública real
4. ejecuta `npm run dev`
5. abre `http://localhost:5173/admin`

Resultado esperado:

- el panel admin abre sin magic link
- la sesión se identifica como `local-admin`
- las acciones editoriales usan almacenamiento local del navegador
- no se escriben cambios al backoffice real ni a rutas `api/`

Para volver al flujo real:

1. cambia `VITE_ENABLE_PREVIEW_ADMIN_BYPASS=false`
2. reinicia `npm run dev`
3. prueba el login real desde producción

## Preview sin magic link

Para validar una rama preview sin magic link:

1. define `VITE_ENABLE_PREVIEW_ADMIN_BYPASS=true` en Vercel Preview
2. redeploy de la rama preview
3. abre la URL preview en `/admin`

## Gate de release en 3 capas

1. Gate local
2. Gate preview
3. Gate producciÃ³n

### Gate local

1. `npm run validate:content`
2. `npm run build`
3. `npm run release:check`

### Gate preview

1. empujar la rama preview si todavÃ­a no existe en el remoto
2. sincronizar `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en el scope Preview de esa rama
3. desplegar preview desde la rama o workspace activo
4. verificar `/`, `/practice`, `/exam`, `/admin`, `/api/health`
5. para una URL preview concreta:
   - `RELEASE_CHECK_BASE_URL=https://preview-url npm run smoke:url -- --require-schema=v1`
6. registrar la URL exacta y el resultado en `docs/progress.md` o `docs/releases.md`

### Gate producciÃ³n

1. promover la build validada
2. verificar `/`, `/practice`, `/exam`, `/admin`, `/api/health`
3. registrar deployment y resultado final en `docs/progress.md` o `docs/releases.md`

Resultado esperado:

- no se pide magic link en preview
- el modo admin usa datos locales del navegador en esa build
- la autenticación real de Supabase sigue reservada para producción

## Verificación mínima

Antes de considerar un release sano:

1. `npm run validate:content`
2. `npm run build`
3. `npm run smoke:prod`

Para una URL distinta de producciÃ³n:

1. define `RELEASE_CHECK_BASE_URL`
2. ejecuta `npm run smoke:url`
3. agrega `--require-schema=v1` cuando corresponda

`npm run release:check` es ahora el gate normal y exige `schema: v1`.
`npm run release:check:compat` queda solo como fallback temporal.

## Smoke test

Las rutas mínimas que deben responder:

- `/`
- `/practice`
- `/exam`
- `/admin`
- `/api/health`

`/api/health` debe devolver:

- `ok: true`
- `databaseReachable: true`
- `schema: v1`
- `usesServiceRole: true`
