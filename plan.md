# Base Sólida para Escalar la App

## Propósito

Construir una plataforma pública de práctica para la licencia clase B en Chile con dos prioridades no negociables:

1. Exactitud de preguntas y respuestas.
2. Trazabilidad completa de las fuentes formales.

La app no debe intentar replicar el banco oficial no público. Debe ofrecer material propio, revisado, explicable y verificable.

## Principios Editoriales

- No publicar preguntas sin fuente formal identificada.
- No publicar preguntas con stems ambiguos, incompletos o estilo "complete la frase".
- No usar simuladores comerciales como autoridad normativa.
- Sí usar cuestionarios municipales y simuladores públicos para revisar formato, tono e instrucciones.
- Registrar siempre fuente primaria cuando exista.
- Diferenciar con claridad entre `draft`, `reviewed`, `published` y `archived`.
- Mantener notas editoriales cuando una pregunta se reescriba por claridad o formato.

## Reglas Oficiales Verificadas

Fuentes de referencia:

- Decreto 170 de Conaset
- ChileAtiende
- Manual oficial 2026 para contenido de estudio

Reglas verificadas hoy para el examen clase B:

- 35 preguntas
- 38 puntos máximos
- 3 preguntas de doble puntuación
- aprobación con 33 puntos

No se fijará una duración oficial del examen en la app hasta contar con una fuente primaria igual de sólida para ese dato.

## Arquitectura

### Frontend

- `Vite + React`
- rutas públicas:
  - `/`
  - `/practice`
  - `/exam`
- ruta privada:
  - `/admin`

### Persistencia

- `Supabase` para:
  - base de datos
  - autenticación admin
  - lecturas públicas filtradas por edición activa
- rutas `api/` de Vercel para mutaciones editoriales en producción
- fallback local en navegador solo para desarrollo o pruebas sin credenciales configuradas

### Deploy

- `main` es la rama de producción
- `GitHub -> Vercel` es la fuente de verdad del despliegue
- deploy manual por CLI solo como respaldo operativo

## Modelo de Datos

Entidades mínimas:

- `editions`
- `chapters`
- `source_documents`
- `questions`
- `question_options`
- `question_media`
- `exam_rule_sets`
- `editorial_events`
- `quiz_attempts`
- `attempt_answers`
- `admin_allowlist`

Campos editoriales obligatorios para preguntas:

- edición activa
- capítulo
- semana
- fuente
- página o referencia
- tipo de respuesta
- instrucción visible
- estado editorial
- notas de revisión
- marca de elegibilidad para examen

## Modos de Usuario

### Público

- `Práctica personalizada`
  - selección de capítulo(s)
  - selección de cantidad de preguntas
  - solo usa preguntas `published`

- `Examen clase B`
  - reglas oficiales verificadas
  - 35 preguntas
  - 3 de doble puntuación
  - 38 puntos máximos
  - aprobación con 33

### Admin

- login con magic link de Supabase
- acceso restringido por email allowlist
- lista de preguntas con filtros
- editor con preview
- acciones explícitas:
  - guardar cambios
  - marcar revisada
  - publicar
  - archivar
- siembra inicial del banco base

## Workflow Editorial

Estados:

- `draft`
- `reviewed`
- `published`
- `archived`

Reglas:

- `draft`: editable, no visible en experiencia pública
- `reviewed`: contenido revisado, aún no visible al público
- `published`: visible en práctica y potencialmente elegible para examen
- `archived`: fuera de circulación

Una pregunta no se puede publicar si le falta:

- fuente formal
- página o referencia
- instrucción
- respuesta correcta válida
- revisión registrada

## Criterios de Publicación

Antes de publicar una pregunta:

- validar ortografía y redacción
- validar exactitud contra la fuente
- validar formato de respuesta
- validar que los distractores sean plausibles
- validar que la instrucción coincida con el tipo de selección
- validar que no existan caracteres corruptos

## Política Operativa

Toda nueva funcionalidad debe responder estas preguntas antes de implementarse:

1. ¿Mejora o protege la exactitud del contenido?
2. ¿Preserva la trazabilidad de la fuente?
3. ¿Evita exponer material no revisado al público?
4. ¿Funciona bien en móvil?

Si la respuesta es no para alguna de estas, la funcionalidad debe replantearse.
