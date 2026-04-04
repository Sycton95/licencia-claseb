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

Servidor:

- `SUPABASE_SERVICE_ROLE_KEY` recomendado

## Verificación mínima

Antes de considerar un release sano:

1. `npm run validate:content`
2. `npm run build`
3. `npm run smoke:prod`

`npm run release:check` corre los tres pasos.

## Smoke test

Las rutas mínimas que deben responder:

- `/`
- `/practice`
- `/exam`
- `/admin`
- `/api/health`

`/api/health` debe devolver `ok: true` y `databaseReachable: true`.
