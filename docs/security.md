# Seguridad

## Principios

- público anónimo
- un solo admin en esta fase
- mínimo privilegio
- mutaciones críticas fuera del navegador

## Frontend

- usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- lee contenido público vía RLS
- no debe contener `service role`

## Admin

- login por magic link de Supabase
- autorización por `admin_allowlist`
- comprobación final de permisos en rutas `api/`

## Servidor

- `SUPABASE_SERVICE_ROLE_KEY` es opcional pero recomendado
- si no existe, las rutas `api/` aún operan con el JWT del admin y RLS
- toda ruta admin valida:
  - bearer token
  - usuario autenticado
  - permiso editorial
  - payload estructural

## Datos

- `published` es el único estado visible al público
- `editorial_events` registra acciones críticas cuando el esquema `v1` está activo
- `editions` permite aislar cada año de contenido sin mezclar bancos
