# Arquitectura

## Objetivo

Mantener una arquitectura pequeña, comprensible y segura para una app de quiz público con backoffice editorial privado.

## Capas

- `src/pages` y `src/components`: UI pública y admin
- `src/lib`: acceso a datos, validación y lógica de quiz
- `src/data`: catálogo semilla y contenido de respaldo
- `api/`: mutaciones editoriales y health checks en Vercel
- `supabase/migrations`: esquema y evolución de base de datos

## Lectura y escritura

- lectura pública:
  - desde Supabase con `publishable key`
  - solo preguntas `published`
  - solo edición activa
- escritura editorial:
  - en producción pasa por `api/`
  - el navegador no escribe directo a tablas sensibles
  - el servidor valida sesión admin y luego persiste

## Compatibilidad

La base actual soporta dos esquemas:

- `legacy`: tablas originales sin `editions` ni `editorial_events`
- `v1`: esquema endurecido con edición activa e historial editorial

Esto permite desplegar el frontend y las rutas nuevas sin romper la base actual mientras se aplica la migración incremental.
