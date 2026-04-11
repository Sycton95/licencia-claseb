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
  {
    id: 'prep-education-vial-values',
    editionId: ACTIVE_EDITION_ID,
    chapterId: 'chapter-3',
    sourceDocumentId: 'manual-claseb-2026',
    sourcePageStart: 33,
    sourcePageEnd: 33,
    topicKey: 'education-vial-values',
    topicTitle: 'Educación vial y valores de convivencia',
    referenceLabel: 'Pág. 33',
    groundingSummary:
      'La convivencia vial exige que quienes participan en el tránsito cuenten con educación vial, entendida como adquisición de valores, hábitos y actitudes positivas para convivir de forma armoniosa y segura.',
    rationale:
      'Permite ampliar el capítulo con preguntas sobre educación vial como base de la convivencia, sin repetir las definiciones más obvias ya sembradas.',
    candidateQuestion: {
      prompt:
        'Según el manual, ¿qué requiere una buena convivencia vial para lograrse de manera estable?',
      selectionMode: 'single',
      instruction: 'Marque una respuesta.',
      options: [
        'Solo fiscalización visible en las vías.',
        'Un nivel adecuado de educación vial en quienes participan del tránsito.',
        'Prioridad permanente para los vehículos más rápidos.',
        'Que no existan peatones ni ciclistas en la circulación.',
      ],
      correctOptionIndexes: [1],
      publicExplanation:
        'El manual vincula la convivencia vial con una interacción respetuosa y segura, lo que exige educación vial suficiente en todas las personas involucradas.',
      reviewNotes:
        'Basada en la explicación de convivencia vial y educación vial de la página 33.',
    },
  },
  {
    id: 'prep-risk-factors-confidence',
    editionId: ACTIVE_EDITION_ID,
    chapterId: 'chapter-3',
    sourceDocumentId: 'manual-claseb-2026',
    sourcePageStart: 34,
    sourcePageEnd: 34,
    topicKey: 'risk-factors-confidence',
    topicTitle: 'Factores de riesgo y debilitamiento de la confianza',
    referenceLabel: 'Pág. 34',
    groundingSummary:
      'Para conducir de forma segura y responsable se deben eliminar, en lo posible, los factores de riesgo. Las conductas e infracciones que vulneran la convivencia ordenada debilitan el principio de confianza.',
    rationale:
      'Aporta base directa para preguntas sobre prevención activa, conducta infractora y principio de confianza sin depender de interpretación externa.',
    candidateQuestion: {
      prompt:
        '¿Qué indica el manual para reducir la probabilidad de sufrir un siniestro vial?',
      selectionMode: 'single',
      instruction: 'Marque una respuesta.',
      options: [
        'Asumir que la experiencia personal basta para controlar el riesgo.',
        'Eliminar los factores de riesgo en la medida de lo posible.',
        'Confiar en que la sanción solo llegará si hay fiscalización.',
        'Aumentar la velocidad para pasar menos tiempo expuesto.',
      ],
      correctOptionIndexes: [1],
      publicExplanation:
        'La página 34 indica expresamente que la conducción segura y responsable exige eliminar los factores de riesgo en la medida de lo posible.',
      reviewNotes:
        'Sirve para reforzar el vínculo entre prevención y comportamiento vial.',
    },
  },
  {
    id: 'prep-education-social-role',
    editionId: ACTIVE_EDITION_ID,
    chapterId: 'chapter-3',
    sourceDocumentId: 'manual-claseb-2026',
    sourcePageStart: 34,
    sourcePageEnd: 34,
    topicKey: 'education-social-role',
    topicTitle: 'Educación vial como formación social e individual',
    referenceLabel: 'Pág. 34',
    groundingSummary:
      'El manual señala que la educación vial es indispensable en la formación social e individual porque todas las personas, en distintos momentos, serán peatones, ciclistas, usuarias de vehículos o conductoras.',
    rationale:
      'Permite generar preguntas de comprensión sobre por qué la educación vial no se limita a quienes conducen automóviles.',
    candidateQuestion: {
      prompt:
        '¿Por qué la educación vial es indispensable en la educación social e individual de las personas?',
      selectionMode: 'single',
      instruction: 'Marque una respuesta.',
      options: [
        'Porque solo las personas conductoras profesionales la necesitan.',
        'Porque todas las personas participan del tránsito en distintos roles a lo largo de su vida.',
        'Porque reemplaza el conocimiento de las normas de tránsito.',
        'Porque permite conducir sin fiscalización ni sanciones.',
      ],
      correctOptionIndexes: [1],
      publicExplanation:
        'La página 34 explica que todas las personas serán peatones, ciclistas, usuarias de vehículos o conductoras en distintos momentos, por lo que la educación vial es transversal.',
      reviewNotes:
        'Refuerza el carácter social de la educación vial dentro del capítulo.',
    },
  },
  {
    id: 'prep-precaution-defensive-driving',
    editionId: ACTIVE_EDITION_ID,
    chapterId: 'chapter-3',
    sourceDocumentId: 'manual-claseb-2026',
    sourcePageStart: 35,
    sourcePageEnd: 35,
    topicKey: 'precaution-defensive-driving',
    topicTitle: 'Precaución, error humano y conducción defensiva',
    referenceLabel: 'Pág. 35',
    groundingSummary:
      'La precaución es el principio fundamental en la conducción. El manual indica que se debe admitir que todas las personas pueden equivocarse y mantenerse atento a las condiciones del tránsito mediante conducción defensiva y preventiva.',
    rationale:
      'Entrega base precisa para nuevas preguntas sobre el sentido práctico de la precaución, evitando repetir solo el enunciado conceptual.',
    candidateQuestion: {
      prompt:
        '¿Qué exige la precaución, según el manual, durante la conducción de un vehículo?',
      selectionMode: 'single',
      instruction: 'Marque una respuesta.',
      options: [
        'Confiar en que las demás personas no cometerán errores.',
        'Aceptar que cualquiera puede equivocarse y conducir de forma defensiva y preventiva.',
        'Conducir rápido para evitar permanecer expuesto al riesgo.',
        'Dar prioridad a la fluidez por sobre la atención al entorno.',
      ],
      correctOptionIndexes: [1],
      publicExplanation:
        'La página 35 relaciona la precaución con admitir el error humano y mantenerse atento a las condiciones del tránsito mediante conducción defensiva y preventiva.',
      reviewNotes:
        'Permite distinguir precaución de simple desconfianza o temor.',
    },
  },
  {
    id: 'prep-solidarity-actions',
    editionId: ACTIVE_EDITION_ID,
    chapterId: 'chapter-3',
    sourceDocumentId: 'manual-claseb-2026',
    sourcePageStart: 35,
    sourcePageEnd: 35,
    topicKey: 'solidarity-actions',
    topicTitle: 'Solidaridad aplicada a la conducción',
    referenceLabel: 'Pág. 35',
    groundingSummary:
      'El manual define la solidaridad como una virtud clave al conducir y la ejemplifica con ceder el paso, dejar espacio para permitir adelantamientos y mostrar consideración con personas usuarias vulnerables.',
    rationale:
      'Aporta un bloque útil para preguntas de aplicación práctica apoyadas en ejemplos concretos del texto.',
    candidateQuestion: {
      prompt:
        '¿Qué ejemplo entrega el manual como expresión de solidaridad al conducir?',
      selectionMode: 'single',
      instruction: 'Marque una respuesta.',
      options: [
        'Acelerar para impedir que otro vehículo adelante.',
        'Ceder el paso y dejar espacio suficiente cuando corresponde.',
        'Usar la bocina para exigir prioridad.',
        'Desentenderse de las personas usuarias vulnerables.',
      ],
      correctOptionIndexes: [1],
      publicExplanation:
        'La página 35 vincula la solidaridad con acciones concretas que favorecen la convivencia vial, como ceder el paso, dejar espacio y considerar a quienes son más vulnerables.',
      reviewNotes:
        'Basada en ejemplos explícitos del cierre de la página 35.',
    },
  },
];
