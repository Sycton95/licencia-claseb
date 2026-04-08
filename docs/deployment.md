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

Resultado esperado:

- no se pide magic link en preview
- el modo admin usa datos locales del navegador en esa build
- la autenticación real de Supabase sigue reservada para producción

## Verificación mínima

Antes de considerar un release sano:

1. `npm run validate:content`
2. `npm run build`
3. `npm run smoke:prod`

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
