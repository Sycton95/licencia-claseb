# Quiz Licencia Clase B Chile

Plataforma web en `React + Vite + Vercel` para estudiar la licencia clase B en Chile con dos frentes:

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
- `VITE_PUBLIC_ADMIN_URL`

Servidor:

- `SUPABASE_SERVICE_ROLE_KEY` para escrituras editoriales desde `api/`

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
- [`docs/question-bank-audit.md`](./docs/question-bank-audit.md): auditoría léxica inicial del banco
- [`supabase/migrations/0001_base.sql`](./supabase/migrations/0001_base.sql): esquema base original
- [`supabase/migrations/0002_solid_base_v1.sql`](./supabase/migrations/0002_solid_base_v1.sql): edición activa e historial editorial

## Estado actual

- menú inicial público
- práctica personalizada por capítulo
- simulación del examen clase B con reglas verificadas
- panel admin con flujo editorial controlado
- panel admin con tarjeta de estado operativo
- rutas `api/` para escrituras editoriales en producción
- esquema `v1` activo con trazabilidad editorial
