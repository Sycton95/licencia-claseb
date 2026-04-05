import type { SourcePreparationChunk } from '../types/ai.js';

const ACTIVE_EDITION_ID = 'edition-2026';

export const SOURCE_PREPARATION: SourcePreparationChunk[] = [
  {
    id: 'prep-system-safe-components',
    editionId: ACTIVE_EDITION_ID,
    chapterId: 'chapter-1',
    sourceDocumentId: 'manual-claseb-2026',
    sourcePageStart: 9,
    sourcePageEnd: 9,
    topicKey: 'system-safe-components',
    topicTitle: 'Sistema Seguro y redundancia',
    referenceLabel: 'Pág. 9',
    groundingSummary:
      'El Sistema Seguro asume error humano, reconoce límites del cuerpo humano y exige que si un componente falla, otros sigan protegiendo a las personas.',
    rationale:
      'Sirve para generar preguntas conceptuales menos memorizables que las de porcentaje o estadística.',
    benchmarkNote:
      'Usar tono de examen formal; no convertir el concepto en una frase incompleta.',
    candidateQuestion: {
      prompt:
        '¿Qué principio del Sistema Seguro obliga a que la vía, el vehículo y la conducta se diseñen para reducir daños incluso cuando una persona se equivoca?',
      selectionMode: 'single',
      instruction: 'Marque una respuesta.',
      options: [
        'Que la seguridad depende solo de la experiencia del conductor.',
        'Que el sistema debe tolerar errores humanos y seguir protegiendo a las personas.',
        'Que la responsabilidad debe recaer únicamente en la fiscalización.',
        'Que la velocidad de circulación tiene prioridad sobre la protección.',
      ],
      correctOptionIndexes: [1],
      publicExplanation:
        'El enfoque de Sistema Seguro no supone conductas perfectas. Distribuye la protección entre infraestructura, vehículos, normas y comportamiento.',
      reviewNotes:
        'Sugerencia nueva basada en el marco conceptual del capítulo y no en una cifra aislada.',
    },
  },
  {
    id: 'prep-costs-of-sinister',
    editionId: ACTIVE_EDITION_ID,
    chapterId: 'chapter-1',
    sourceDocumentId: 'manual-claseb-2026',
    sourcePageStart: 7,
    sourcePageEnd: 7,
    topicKey: 'costs-of-sinister',
    topicTitle: 'Costos de los siniestros',
    referenceLabel: 'Pág. 7',
    groundingSummary:
      'El manual distingue costos humanos, de salud, materiales y administrativos derivados de un siniestro de tránsito.',
    rationale:
      'Permite ampliar cobertura con preguntas de clasificación y comprensión, no solo de memoria estadística.',
    candidateQuestion: {
      prompt:
        '¿Cuál de las siguientes alternativas corresponde a un costo de salud de un siniestro de tránsito?',
      selectionMode: 'single',
      instruction: 'Marque una respuesta.',
      options: [
        'La reparación del vehículo particular.',
        'La gestión de seguros y trámites legales.',
        'La atención médica y la rehabilitación de personas lesionadas.',
        'La disminución del valor comercial del automóvil.',
      ],
      correctOptionIndexes: [2],
      publicExplanation:
        'Los costos de salud incluyen atención de urgencia, hospitalización, rehabilitación y otros efectos sobre el sistema sanitario.',
      reviewNotes:
        'Sugerencia nueva derivada de la tipología de costos explicada en el manual.',
    },
  },
  {
    id: 'prep-convivencia-vial-space',
    editionId: ACTIVE_EDITION_ID,
    chapterId: 'chapter-3',
    sourceDocumentId: 'manual-claseb-2026',
    sourcePageStart: 33,
    sourcePageEnd: 35,
    topicKey: 'convivencia-vial-space',
    topicTitle: 'La vía como espacio de convivencia',
    referenceLabel: 'Págs. 33-35',
    groundingSummary:
      'La seguridad vial se presenta como una convivencia social basada en respeto, solidaridad, tolerancia, confianza y precaución.',
    rationale:
      'Amplía la cobertura del capítulo con preguntas de principio general, útiles para revisión formativa.',
    candidateQuestion: {
      prompt:
        '¿Qué conducta se ajusta mejor al enfoque de convivencia vial descrito por el manual?',
      selectionMode: 'single',
      instruction: 'Marque una respuesta.',
      options: [
        'Aprovechar cada espacio libre para adelantar sin demora.',
        'Asumir que la vía es un espacio compartido y actuar con respeto hacia otras personas usuarias.',
        'Exigir prioridad permanente a los vehículos motorizados.',
        'Reducir la velocidad solo cuando exista fiscalización visible.',
      ],
      correctOptionIndexes: [1],
      publicExplanation:
        'La convivencia vial implica reconocer que la vía es un espacio compartido, no una competencia entre usuarios.',
      reviewNotes:
        'Sugerencia nueva orientada a comprensión normativa y convivencia, no a repetición literal.',
    },
  },
  {
    id: 'prep-principio-confianza',
    editionId: ACTIVE_EDITION_ID,
    chapterId: 'chapter-3',
    sourceDocumentId: 'manual-claseb-2026',
    sourcePageStart: 34,
    sourcePageEnd: 34,
    topicKey: 'principio-confianza',
    topicTitle: 'Principio de confianza',
    referenceLabel: 'Pág. 34',
    groundingSummary:
      'El principio de confianza permite esperar que otras personas usuarias cumplirán las normas, sin eliminar la necesidad de actuar con precaución.',
    rationale:
      'Permite generar revisiones sobre un concepto recurrente y sensible a redacciones ambiguas.',
    candidateQuestion: {
      prompt:
        'El principio de confianza permite al conductor suponer que las demás personas usuarias:',
      selectionMode: 'single',
      instruction: 'Marque una respuesta.',
      options: [
        'Conducirán siempre sin cometer errores.',
        'Cumplirán normalmente las normas y su papel en la vía, sin reemplazar la precaución propia.',
        'Tienen obligación de ceder el paso a todo vehículo motorizado.',
        'Actuarán de forma idéntica en cualquier circunstancia.',
      ],
      correctOptionIndexes: [1],
      publicExplanation:
        'La confianza no elimina la precaución. Solo permite una convivencia ordenada basada en que, en general, las normas serán respetadas.',
      reviewNotes:
        'La redacción busca evitar una interpretación absoluta o ingenua del principio.',
    },
  },
];
