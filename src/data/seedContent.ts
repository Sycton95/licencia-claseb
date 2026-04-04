import type {
  Chapter,
  ContentCatalog,
  Edition,
  EditorialEvent,
  ExamRuleSet,
  Question,
  QuestionOption,
  SourceDocument,
} from '../types/content.js';

const ACTIVE_EDITION_ID = 'edition-2026';
const SEED_AUTHOR = 'seed@licencia-claseb.local';
const REVIEWED_AT = '2026-04-03T00:00:00.000Z';
const PUBLISHED_AT = '2026-04-03T00:00:00.000Z';

export const EDITIONS: Edition[] = [
  {
    id: ACTIVE_EDITION_ID,
    code: '2026',
    title: 'Libro del Nuevo Conductor Clase B 2026',
    status: 'active',
    isActive: true,
    effectiveFrom: '2026-01-01',
  },
];

export const SOURCE_DOCUMENTS: SourceDocument[] = [
  {
    id: 'manual-claseb-2026',
    title: 'Libro del Nuevo Conductor Clase B 2026',
    issuer: 'Conaset',
    year: 2026,
    url: '/Libro-ClaseB-2026.pdf',
    type: 'manual',
    official: true,
  },
  {
    id: 'decreto-170-claseb',
    title: 'Decreto 170 sobre licencias de conductor',
    issuer: 'Conaset',
    year: 1986,
    url: 'https://mejoresconductores.conaset.cl/assets/data/pdf/NORMATIVA/DTO-170_02-ENE-1986-2.pdf',
    type: 'decree',
    official: true,
  },
  {
    id: 'chileatiende-licencia-claseb',
    title: 'Licencia de conducir clase B',
    issuer: 'ChileAtiende',
    year: 2026,
    url: 'https://www.chileatiende.gob.cl/fichas/ver/20592',
    type: 'service-page',
    official: true,
  },
  {
    id: 'puchuncavi-cuestionario-claseb',
    title: 'Cuestionario Clase B Municipalidad de Puchuncaví',
    issuer: 'Municipalidad de Puchuncaví',
    year: 2026,
    url: 'https://munipuchuncavi.cl/2.0/sitio10/pdf/formularios/transito/cuestionario%20clase%20b.pdf',
    type: 'municipal-questionnaire',
    official: false,
  },
  {
    id: 'crosan-simulador',
    title: 'Simulador de examen Crosan Chile',
    issuer: 'Crosan Chile',
    year: 2026,
    url: 'https://crosanchile.com/pagina/examen/carpeta_1/478.htm',
    type: 'simulator',
    official: false,
  },
];

export const CHAPTERS: Chapter[] = [
  {
    id: 'chapter-1',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 1',
    title: 'Los siniestros de tránsito',
    description: 'Estadísticas, terminología y enfoque de Sistema Seguro.',
    order: 1,
    isActive: true,
  },
  {
    id: 'chapter-2',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 2',
    title: 'Principios de la conducción',
    description: 'Funcionamiento del vehículo, leyes físicas y seguridad activa/pasiva.',
    order: 2,
    isActive: false,
  },
  {
    id: 'chapter-3',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 3',
    title: 'Convivencia y seguridad vial',
    description: 'Convivencia vial, principios y usuarios vulnerables.',
    order: 3,
    isActive: true,
  },
  {
    id: 'chapter-4',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 4',
    title: 'La persona en el tránsito I',
    description: 'Capacidad visual, reacción y percepción selectiva.',
    order: 4,
    isActive: false,
  },
  {
    id: 'chapter-5',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 5',
    title: 'La persona en el tránsito II',
    description: 'Alcohol, drogas, enfermedades y fatiga.',
    order: 5,
    isActive: false,
  },
  {
    id: 'chapter-6',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 6',
    title: 'Usuarios vulnerables',
    description: 'Niños, peatones, ciclistas, motociclistas y sistemas de retención.',
    order: 6,
    isActive: false,
  },
  {
    id: 'chapter-7',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 7',
    title: 'Normas de circulación',
    description: 'Señales, semáforos, prioridades, velocidad y situaciones especiales.',
    order: 7,
    isActive: false,
  },
  {
    id: 'chapter-8',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 8',
    title: 'Conducción eficiente e informaciones importantes',
    description: 'Ahorro de combustible y trámites legales.',
    order: 8,
    isActive: false,
  },
];

export const EXAM_RULE_SET: ExamRuleSet = {
  code: 'class-b-current',
  editionId: ACTIVE_EDITION_ID,
  questionCount: 35,
  maxPoints: 38,
  passingPoints: 33,
  doubleWeightCount: 3,
};

type SeedQuestionInput = {
  id: string;
  chapterId: string;
  week: number;
  prompt: string;
  options: string[];
  correctOptionIndexes: number[];
  sourcePage: number;
  selectionMode?: Question['selectionMode'];
  instruction?: string;
  explanation?: string;
  reviewNotes?: string;
  doubleWeight?: boolean;
};

function buildOptions(
  questionId: string,
  optionTexts: string[],
  correctOptionIndexes: number[],
): QuestionOption[] {
  return optionTexts.map((text, index) => ({
    id: `${questionId}-opt-${String.fromCharCode(97 + index)}`,
    label: String.fromCharCode(65 + index),
    text,
    isCorrect: correctOptionIndexes.includes(index),
    order: index + 1,
  }));
}

function buildQuestion(input: SeedQuestionInput): Question {
  const selectionMode =
    input.selectionMode ?? (input.correctOptionIndexes.length > 1 ? 'multiple' : 'single');

  return {
    id: input.id,
    editionId: ACTIVE_EDITION_ID,
    chapterId: input.chapterId,
    week: input.week,
    prompt: input.prompt,
    selectionMode,
    instruction:
      input.instruction ??
      (selectionMode === 'multiple'
        ? `Marque ${input.correctOptionIndexes.length} respuestas.`
        : 'Marque una respuesta.'),
    sourceDocumentId: 'manual-claseb-2026',
    sourcePage: input.sourcePage,
    sourceReference: `Pág. ${input.sourcePage}`,
    explanation: input.explanation,
    publicExplanation: input.explanation,
    status: 'published',
    isOfficialExamEligible: true,
    doubleWeight: input.doubleWeight ?? false,
    reviewNotes: input.reviewNotes,
    createdBy: SEED_AUTHOR,
    updatedBy: SEED_AUTHOR,
    reviewedAt: REVIEWED_AT,
    publishedAt: PUBLISHED_AT,
    options: buildOptions(input.id, input.options, input.correctOptionIndexes),
    media: [],
  };
}

export const SEEDED_QUESTIONS: Question[] = [
  buildQuestion({
    id: 'week1-q01',
    chapterId: 'chapter-1',
    week: 1,
    prompt: "¿Por qué el manual considera incorrecto hablar de 'accidente' de tránsito?",
    options: [
      'Porque se trata de hechos completamente azarosos e impredecibles.',
      'Porque la mayoría de los siniestros se puede evitar al eliminar factores de riesgo.',
      'Porque el término solo se usa cuando no hay personas lesionadas.',
      "Porque la ley obliga a reemplazarlo por 'siniestro' solo en trámites de seguros.",
    ],
    correctOptionIndexes: [1],
    sourcePage: 6,
    doubleWeight: true,
    reviewNotes: 'Reescrita para evitar el tono de frase completada.',
  }),
  buildQuestion({
    id: 'week1-q02',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Según el manual, ¿cuántas personas fallecen en promedio cada día en Chile por siniestros de tránsito?',
    options: ['1 a 2 personas', '10 a 12 personas', '4 a 5 personas', 'Más de 20 personas'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q03',
    chapterId: 'chapter-1',
    week: 1,
    prompt: '¿Dónde ocurre la mayor cantidad de siniestros de tránsito en Chile?',
    options: ['Carreteras', 'Autopistas', 'Vías urbanas', 'Caminos rurales'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q04',
    chapterId: 'chapter-1',
    week: 1,
    prompt: '¿En qué tipo de vía se registra la mayor cantidad de personas fallecidas?',
    options: [
      'Vías urbanas',
      'Intersecciones semaforizadas',
      'Vías interurbanas o no urbanas',
      'Calles residenciales',
    ],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q05',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Aproximadamente, ¿qué porcentaje de los siniestros de tránsito ocurre en zonas urbanas?',
    options: ['20%', '50%', '80%', '95%'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q06',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      '¿Cuál es la principal causa de muerte en la población infantil de 1 a 14 años en Chile?',
    options: [
      'Enfermedades raras',
      'Siniestros de tránsito',
      'Accidentes domésticos',
      'Desnutrición',
    ],
    correctOptionIndexes: [1],
    sourcePage: 6,
  }),
  buildQuestion({
    id: 'week1-q07',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'En personas jóvenes de 15 a 29 años, ¿qué causa de muerte antecede a los siniestros de tránsito?',
    options: ['Las drogas', 'El cáncer', 'Los suicidios', 'Las enfermedades cardíacas'],
    correctOptionIndexes: [2],
    sourcePage: 6,
  }),
  buildQuestion({
    id: 'week1-q08',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Según el manual, ¿a cuánto equivale el costo de los siniestros de tránsito en Chile?',
    options: ['1% del PIB', '2% del PIB', '5% del PIB', '10% del PIB'],
    correctOptionIndexes: [1],
    sourcePage: 7,
  }),
  buildQuestion({
    id: 'week1-q09',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      '¿Entre qué velocidades la probabilidad de muerte de un peatón atropellado se multiplica por ocho?',
    options: ['20 a 40 km/h', '30 a 50 km/h', '40 a 60 km/h', '50 a 80 km/h'],
    correctOptionIndexes: [1],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q10',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Si un peatón es atropellado a 30 km/h o menos, ¿qué probabilidad de sobrevivir tiene aproximadamente?',
    options: ['50%', '70%', '90%', '100%'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q11',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      '¿A partir de qué velocidad es prácticamente seguro que un peatón atropellado fallezca?',
    options: ['45 km/h', '55 km/h', '65 km/h', '100 km/h'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q12',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Según el manual, la falla humana está presente en más de qué porcentaje de los siniestros de tránsito?',
    options: [
      '50% de los siniestros',
      '70% de los siniestros',
      '90% de los siniestros',
      '99% de los siniestros',
    ],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q13',
    chapterId: 'chapter-1',
    week: 1,
    prompt: '¿Qué grupo etario concentra cerca del 29% de los conductores fallecidos?',
    options: [
      'Mayores de 65 años',
      'Jóvenes entre 18 y 29 años',
      'Personas entre 30 y 45 años',
      'Menores de 18 años',
    ],
    correctOptionIndexes: [1],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q14',
    chapterId: 'chapter-1',
    week: 1,
    prompt: '¿Qué porcentaje de las personas conductoras fallecidas corresponde a hombres?',
    options: ['50%', '65%', '79%', '92%'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q15',
    chapterId: 'chapter-1',
    week: 1,
    prompt: '¿Cuáles de las siguientes afirmaciones corresponden al enfoque de Sistema Seguro?',
    options: [
      'Reconoce que las personas pueden cometer errores.',
      'Considera aceptables las lesiones graves si el tránsito fluye mejor.',
      'Busca que, si un componente falla, otros sigan protegiendo a las personas.',
      'Da prioridad a la velocidad de desplazamiento por sobre la seguridad.',
    ],
    correctOptionIndexes: [0, 2],
    sourcePage: 9,
    doubleWeight: true,
    reviewNotes: 'Convertida a selección múltiple para reflejar mejor el concepto.',
  }),
  buildQuestion({
    id: 'week1-q16',
    chapterId: 'chapter-1',
    week: 1,
    prompt: 'En el enfoque de Sistema Seguro, las muertes y lesiones graves se consideran:',
    options: ['Inevitables', 'Aceptables', 'Inaceptables', 'Parte del progreso'],
    correctOptionIndexes: [2],
    sourcePage: 9,
  }),
  buildQuestion({
    id: 'week1-q17',
    chapterId: 'chapter-3',
    week: 1,
    prompt: '¿Qué entiende el manual por convivencia vial?',
    options: [
      'El cumplimiento estricto de multas.',
      'La interacción armoniosa y segura entre quienes usan las vías.',
      'La prioridad absoluta de los automóviles.',
      'La exclusión de ciclistas y peatones de la calzada.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 33,
  }),
  buildQuestion({
    id: 'week1-q18',
    chapterId: 'chapter-3',
    week: 1,
    prompt: '¿Cuál es la meta de la seguridad vial?',
    options: [
      'Recaudar fondos mediante multas.',
      'Eliminar completamente los siniestros de tránsito.',
      'Aumentar la velocidad de los viajes.',
      'Reducir solo los siniestros fatales.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 33,
  }),
  buildQuestion({
    id: 'week1-q19',
    chapterId: 'chapter-3',
    week: 1,
    prompt:
      'Según el manual, la percepción de riesgo de la mayoría de los conductores suele ser:',
    options: [
      'Objetiva y realista.',
      'Superior al riesgo real.',
      'Subjetiva y por debajo del riesgo real.',
      'Nula en todo momento.',
    ],
    correctOptionIndexes: [2],
    sourcePage: 33,
  }),
  buildQuestion({
    id: 'week1-q20',
    chapterId: 'chapter-3',
    week: 1,
    prompt: '¿Qué proporción aproximada de los siniestros con víctimas se atribuye a fallas humanas?',
    options: ['Cerca del 50%', 'Cerca del 75%', 'Cerca del 90%', 'Cerca del 100%'],
    correctOptionIndexes: [2],
    sourcePage: 33,
  }),
  buildQuestion({
    id: 'week1-q21',
    chapterId: 'chapter-3',
    week: 1,
    prompt: '¿Qué expresa el principio de confianza en la conducción?',
    options: [
      'Que el vehículo no presentará fallas mecánicas.',
      'Que las demás personas cumplirán las normas y su papel en la vía.',
      'Que se puede conducir rápido sin asumir riesgos.',
      'Que la fiscalización no ocurrirá si se conduce con cuidado.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 34,
  }),
  buildQuestion({
    id: 'week1-q22',
    chapterId: 'chapter-3',
    week: 1,
    prompt: '¿Cuál es la virtud más importante al conducir, según el manual?',
    options: ['La rapidez de reflejos', 'La solidaridad', 'La agresividad', 'La competitividad'],
    correctOptionIndexes: [1],
    sourcePage: 35,
  }),
  buildQuestion({
    id: 'week1-q23',
    chapterId: 'chapter-3',
    week: 1,
    prompt: '¿Cuál es el principio fundamental en la conducción de un vehículo?',
    options: ['La velocidad', 'La audacia', 'La precaución', 'La potencia'],
    correctOptionIndexes: [2],
    sourcePage: 35,
  }),
  buildQuestion({
    id: 'week1-q24',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      '¿Qué tipo de costo representa el sufrimiento físico y psicológico provocado por un siniestro?',
    options: ['Costo material', 'Costo administrativo', 'Costo de salud', 'Costo humano'],
    correctOptionIndexes: [3],
    sourcePage: 7,
  }),
  buildQuestion({
    id: 'week1-q25',
    chapterId: 'chapter-1',
    week: 1,
    prompt: '¿Qué ejemplo corresponde a un costo administrativo de un siniestro?',
    options: [
      'Primeros auxilios',
      'Gestión de seguros y trámites legales',
      'Daños a vehículos',
      'Rehabilitación',
    ],
    correctOptionIndexes: [1],
    sourcePage: 7,
  }),
  buildQuestion({
    id: 'week1-q26',
    chapterId: 'chapter-1',
    week: 1,
    prompt: '¿En qué momento del día tiende a aumentar la siniestralidad?',
    options: ['Mañana', 'Tarde', 'Noche y madrugada', 'Al mediodía'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q27',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      '¿Qué reconoce el Sistema Seguro respecto de la capacidad del cuerpo humano frente a un impacto?',
    options: [
      'Que es ilimitada.',
      'Que es muy resistente.',
      'Que es limitada para soportar fuerzas antes de sufrir daño.',
      'Que depende solo de la edad.',
    ],
    correctOptionIndexes: [2],
    sourcePage: 9,
  }),
  buildQuestion({
    id: 'week1-q28',
    chapterId: 'chapter-3',
    week: 1,
    prompt: '¿Qué hábitos busca fomentar la educación vial?',
    options: [
      'Competencia y orgullo',
      'Respeto, solidaridad y tolerancia',
      'Miedo y obediencia ciega',
      'Habilidad técnica por sobre la convivencia',
    ],
    correctOptionIndexes: [1],
    sourcePage: 33,
  }),
  buildQuestion({
    id: 'week1-q29',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Según el manual, ¿cuántas personas cercanas sufren dolor por cada persona fallecida?',
    options: [
      'Aproximadamente 10',
      'Aproximadamente 50',
      'Aproximadamente 100',
      'Aproximadamente 500',
    ],
    correctOptionIndexes: [2],
    sourcePage: 7,
  }),
  buildQuestion({
    id: 'week1-q30',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'En zonas urbanas, ¿en qué lugar ocurre la mayor cantidad de los siniestros de tránsito?',
    options: ['Pasajes', 'Intersecciones o cruces de calles', 'Frente a colegios', 'Avenidas principales'],
    correctOptionIndexes: [1],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q31',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      '¿Qué ejemplo usa el manual para mostrar que los siniestros no son hechos puramente azarosos?',
    options: [
      'Que aumentan cuando hay sol.',
      'Que disminuyen cuando hay más vehículos nuevos.',
      'Que aumentan cuando llueve.',
      'Que desaparecen cuando el tránsito es escaso.',
    ],
    correctOptionIndexes: [2],
    sourcePage: 6,
  }),
  buildQuestion({
    id: 'week1-q32',
    chapterId: 'chapter-1',
    week: 1,
    prompt: '¿Qué factor tiene mayor incidencia en la ocurrencia de siniestros?',
    options: [
      'Estado del motor',
      'Consumo de alcohol y exceso de velocidad',
      'Falta de iluminación',
      'Antigüedad del vehículo',
    ],
    correctOptionIndexes: [1],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q33',
    chapterId: 'chapter-3',
    week: 1,
    prompt: 'El entorno vial debe entenderse principalmente como un espacio de:',
    options: [
      'Tránsito de máquinas',
      'Convivencia social',
      'Competencia entre conductores',
      'Uso exclusivo de personas adultas',
    ],
    correctOptionIndexes: [1],
    sourcePage: 34,
  }),
  buildQuestion({
    id: 'week1-q34',
    chapterId: 'chapter-3',
    week: 1,
    prompt: '¿Qué acciones favorecen una buena convivencia vial?',
    options: [
      'Ceder el paso cuando corresponde.',
      'Actuar con amabilidad hacia las demás personas usuarias.',
      'Tocar la bocina para apurar a otros conductores.',
      'Adelantar en curvas para no perder tiempo.',
    ],
    correctOptionIndexes: [0, 1],
    sourcePage: 35,
  }),
  buildQuestion({
    id: 'week1-q35',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Si uno de los componentes del Sistema Seguro falla, ¿qué debe ocurrir según ese enfoque?',
    options: [
      'El sistema completo colapsa.',
      'Las demás partes deben seguir protegiendo a las personas.',
      'El conductor debe ser arrestado de inmediato.',
      'La vía debe cerrarse obligatoriamente.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 9,
  }),
  buildQuestion({
    id: 'week1-q36',
    chapterId: 'chapter-1',
    week: 1,
    prompt: 'Los siniestros de tránsito se consideran un problema prioritario de:',
    options: ['Economía', 'Salud pública', 'Mecánica', 'Orden vial'],
    correctOptionIndexes: [1],
    sourcePage: 6,
  }),
  buildQuestion({
    id: 'week1-q37',
    chapterId: 'chapter-1',
    week: 1,
    prompt: '¿Qué es esencial para adquirir conocimientos sólidos sobre normas de tránsito?',
    options: [
      'Tener un auto rápido',
      'Leer y comprender el manual oficial',
      'Mirar videos en internet',
      'Practicar solo con el examen',
    ],
    correctOptionIndexes: [1],
    sourcePage: 4,
  }),
  buildQuestion({
    id: 'week1-q38',
    chapterId: 'chapter-1',
    week: 1,
    prompt: '¿Por qué un conductor imprudente afecta a toda la sociedad?',
    options: [
      'Porque gasta más bencina.',
      'Porque las consecuencias de su decisión se pagan directa o indirectamente.',
      'Porque bloquea el paso del resto.',
      'Porque genera ruido en la vía.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 6,
  }),
  buildQuestion({
    id: 'week1-q39',
    chapterId: 'chapter-3',
    week: 1,
    prompt: '¿Cuál de las siguientes conductas perjudica la seguridad vial?',
    options: [
      'Respetar los límites de velocidad',
      'Prestar atención a la vía',
      'Circular a exceso de velocidad para llegar antes',
      'Usar cinturón de seguridad',
    ],
    correctOptionIndexes: [2],
    sourcePage: 33,
  }),
  buildQuestion({
    id: 'week1-q40',
    chapterId: 'chapter-3',
    week: 1,
    prompt: '¿Qué personas usuarias de las vías se consideran vulnerables?',
    options: ['Peatones', 'Ciclistas', 'Motociclistas', 'Conductores de buses'],
    correctOptionIndexes: [0, 1, 2],
    sourcePage: 35,
    doubleWeight: true,
    reviewNotes: 'Convertida a selección múltiple para reflejar el concepto del manual.',
  }),
];

export const EDITORIAL_EVENTS: EditorialEvent[] = SEEDED_QUESTIONS.map((question) => ({
  id: `event-${question.id}-published`,
  editionId: question.editionId,
  questionId: question.id,
  actorEmail: SEED_AUTHOR,
  action: 'publish',
  notes: 'Pregunta semilla publicada como base inicial del proyecto.',
  createdAt: PUBLISHED_AT,
}));

export const SEED_CONTENT: ContentCatalog = {
  editions: EDITIONS,
  activeEdition: EDITIONS[0],
  chapters: CHAPTERS,
  sourceDocuments: SOURCE_DOCUMENTS,
  examRuleSet: EXAM_RULE_SET,
  questions: SEEDED_QUESTIONS,
  editorialEvents: EDITORIAL_EVENTS,
};
