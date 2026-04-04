# Automatizaciones Recomendadas

## Salud diaria

- build diario + `validate:content`
- smoke test diario contra producción

## Seguridad y datos

- revisión periódica de dependencias `npm`
- chequeo de schema/RLS esperado en Supabase
- alerta si existen preguntas `published` sin fuente válida
- alerta si existen preguntas `multiple` con menos de dos respuestas correctas

## Editorial

- reporte semanal de:
  - preguntas `draft`
  - preguntas `reviewed` pendientes de publicación
  - cobertura por capítulo
  - preguntas aptas para examen

## Operación

- verificación automática de que `main` siga desplegando en Vercel
- recordatorio de revisión anual de edición activa cuando cambie el manual
