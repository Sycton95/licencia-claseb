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

## Login admin desde teléfono

Checklist:

1. abrir `/admin` en producción
2. pedir el magic link desde `https://licencia-claseb.vercel.app/admin`
3. abrir el correo en el teléfono
4. confirmar que el enlace apunta a `https://licencia-claseb.vercel.app/admin`
5. evitar pedir el enlace desde localhost fuera de pruebas locales

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
