# Deploy y Release

## Rama y despliegue

- `main` despliega producción
- ramas `codex/*` o de feature deben generar preview
- no se edita directamente en producción

## Variables

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ENABLE_LOCAL_ADMIN=false`
- `VITE_PUBLIC_ADMIN_URL=https://licencia-claseb.vercel.app/admin`

Servidor:

- `SUPABASE_SERVICE_ROLE_KEY` recomendado para endurecer mutaciones editoriales

Checks:

- `RELEASE_CHECK_BASE_URL=https://licencia-claseb.vercel.app`
- `RELEASE_REQUIRED_SCHEMA=v1` una vez aplicada la migración `0002`

## Supabase Auth

En `Supabase Dashboard -> Authentication -> URL Configuration` deja estos valores:

- `Site URL`: `https://licencia-claseb.vercel.app`
- `Redirect URL`: `https://licencia-claseb.vercel.app/admin`
- `Redirect URL`: `http://localhost:3000/admin`
- `Redirect URL`: `http://localhost:5173/admin`

Regla operativa:

- login admin normal siempre desde producción
- localhost solo para desarrollo y pruebas controladas

## Login admin desde teléfono

Checklist para evitar enlaces rotos:

1. abrir `/admin` en producción
2. pedir el magic link desde `https://licencia-claseb.vercel.app/admin`
3. abrir el correo en el teléfono
4. confirmar que el enlace apunta a `https://licencia-claseb.vercel.app/admin`
5. evitar pedir el enlace desde localhost si no estás haciendo una prueba local

## Verificación mínima

Antes de considerar un release sano:

1. `npm run validate:content`
2. `npm run build`
3. `npm run smoke:prod`

`npm run release:check` corre los tres pasos.
`npm run release:check:v1` corre los tres pasos y exige `schema: v1`.

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
- `schema: v1` cuando la migración `0002_solid_base_v1.sql` ya esté aplicada
- `usesServiceRole: true` cuando `SUPABASE_SERVICE_ROLE_KEY` ya esté cargada en Vercel
