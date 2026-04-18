# Quiz Licencia Clase B Chile

Plataforma web en `React + Vite + Vercel` para estudiar la licencia Clase B en Chile con dos frentes:

- experiencia pública de práctica y simulación de examen
- backoffice editorial privado para revisión manual y publicación de preguntas

## Scripts

```bash
npm install
npm run dev
npm run build
npm run validate:content
npm run smoke:prod
npm run smoke:prod:compat
npm run release:check
npm run release:check:compat
```

`npm run release:check` es ahora el gate normal de release y exige `schema: v1`.
`npm run release:check:compat` queda solo como fallback temporal para depuración.

## Variables de entorno

Usa [`.env.example`](./.env.example) como base.

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY` como fallback legado
- `VITE_ENABLE_LOCAL_ADMIN`
- `VITE_ENABLE_PREVIEW_ADMIN_BYPASS`
- `VITE_ENABLE_ADMIN_BETA_PANEL`
- `VITE_ENABLE_LOCAL_OLLAMA`
- `VITE_OLLAMA_BASE_URL`
- `VITE_OLLAMA_MODEL`
- `VITE_OLLAMA_MAX_GENERATION_MS`
- `VITE_OLLAMA_MAX_ITEMS_PER_RUN`
- `VITE_PUBLIC_ADMIN_URL`

Servidor:

- `SUPABASE_SERVICE_ROLE_KEY` para escrituras editoriales desde `api/`
- `LOCAL_OLLAMA_WORKER_PORT` para el worker local del panel Beta

Mapa con la UI actual de Supabase:

- Supabase `Publishable key` -> app `VITE_SUPABASE_PUBLISHABLE_KEY`
- Supabase `Secret key` -> app `SUPABASE_SERVICE_ROLE_KEY`

## Login admin desde teléfono

Para evitar que el magic link apunte a `localhost`, el proyecto debe usar:

- `VITE_PUBLIC_ADMIN_URL=https://licencia-claseb.vercel.app/admin`

Además, en Supabase Auth:

- `Site URL`: `https://licencia-claseb.vercel.app`
- `Redirect URLs`:
- `https://licencia-claseb.vercel.app/admin`
- `http://localhost:3000/admin`
- `http://localhost:5173/admin`

Regla operativa:

- login admin normal siempre desde producción
- localhost solo para desarrollo y pruebas controladas
- preview bypass solo cuando `VITE_ENABLE_PREVIEW_ADMIN_BYPASS=true` en Vercel Preview; ese modo usa datos locales del navegador y no toca el backoffice real

## Prueba local sin magic link

Para probar `/admin` localmente sin usar magic link:

1. crea o edita `.env.local`
2. define `VITE_ENABLE_PREVIEW_ADMIN_BYPASS=true`
3. deja `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` configurados si quieres seguir leyendo el catálogo publicado real
4. ejecuta `npm run dev`
5. abre `http://localhost:5173/admin`

Comportamiento esperado:

- el panel entra en modo local de pruebas
- no pide magic link
- usa datos locales del navegador para flujos editoriales y cola AI
- no ejecuta escrituras contra el backoffice real de Supabase

Reglas:

- no usar este bypass en producción
- en Vercel Preview se habilita solo con `VITE_ENABLE_PREVIEW_ADMIN_BYPASS=true`
- para probar auth real, desactiva el bypass y usa el flujo normal desde producción

## Beta local Ollama en `/admin`

Usa [`docs/admin-local-beta.md`](./docs/admin-local-beta.md) como documento operativo principal.

Flujo corto:

1. define en `.env.local`:
   - `VITE_ENABLE_LOCAL_ADMIN=true`
   - `VITE_ENABLE_ADMIN_BETA_PANEL=true`
   - `VITE_ENABLE_LOCAL_OLLAMA=true`
2. asegúrate de tener Ollama levantado localmente
3. ejecuta `npm run dev:admin-beta`
4. abre `http://localhost:5173/admin`

Comportamiento esperado:

- el panel `Beta` aparece dentro de `/admin`
- las corridas usan un worker local con progreso en vivo
- CPU y RAM se reportan siempre; GPU es best-effort
- los resultados completados siguen siendo locales y nunca públicos

## Arquitectura

- frontend público: `Vite + React Router`
- persistencia y auth admin: `Supabase`
- mutaciones editoriales en producción: rutas `api/` desplegadas en Vercel
- producción: `main -> GitHub -> Vercel`

## Documentos clave

- [`plan.md`](./plan.md): documento rector del producto
- [`docs/architecture.md`](./docs/architecture.md): arquitectura objetivo y compatibilidad
- [`docs/editorial-rules.md`](./docs/editorial-rules.md): reglas de exactitud y formato
- [`docs/security.md`](./docs/security.md): modelo de seguridad y permisos
- [`docs/deployment.md`](./docs/deployment.md): flujo de release y despliegue
- [`docs/automation-recommendations.md`](./docs/automation-recommendations.md): automatizaciones sugeridas
- [`docs/progress.md`](./docs/progress.md): bitácora operativa y estado de milestones
- [`docs/admin-local-beta.md`](./docs/admin-local-beta.md): enablement y operación del Beta local con Ollama
- [`docs/ai-editorial-policy.md`](./docs/ai-editorial-policy.md): reglas de uso y límites de la capa AI
- [`docs/question-bank-audit.md`](./docs/question-bank-audit.md): auditoría léxica inicial del banco
- [`supabase/migrations/0001_base.sql`](./supabase/migrations/0001_base.sql): esquema base original
- [`supabase/migrations/0002_solid_base_v1.sql`](./supabase/migrations/0002_solid_base_v1.sql): edición activa e historial editorial
- [`supabase/migrations/0003_ai_suggestions.sql`](./supabase/migrations/0003_ai_suggestions.sql): cola AI y auditoría de sugerencias
- [`supabase/migrations/0004_secure_attempt_tables.sql`](./supabase/migrations/0004_secure_attempt_tables.sql): endurecimiento RLS de tablas de intentos

## Estado actual

- menú inicial público
- práctica personalizada por capítulo
- simulación del examen Clase B con reglas verificadas
- panel admin con flujo editorial controlado
- panel admin con tarjeta de estado operativo
- panel admin con inbox privado de sugerencias AI
- panel admin con track local Beta para Ollama, progreso y telemetría local
- rutas `api/` para escrituras editoriales en producción
- esquema `v1` activo con trazabilidad editorial
