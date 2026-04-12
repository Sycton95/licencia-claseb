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
import { repairPotentialMojibake } from '../lib/textEncoding.js';
import { REVIEWED_IMPORTED_QUESTIONS } from './reviewedImports.js';

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
    title: repairPotentialMojibake('Cuestionario Clase B Municipalidad de PuchuncavÃ­'),
    issuer: repairPotentialMojibake('Municipalidad de PuchuncavÃ­'),
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
    title: 'Los principios de la conducción',
    description: 'Funcionamiento del vehículo, leyes físicas y seguridad activa/pasiva.',
    order: 2,
    isActive: true,
  },
  {
    id: 'chapter-3',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 3',
    title: 'Convivencia vial',
    description: 'Convivencia vial, educación vial, confianza y precaución.',
    order: 3,
    isActive: true,
  },
  {
    id: 'chapter-4',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 4',
    title: 'La persona en el tránsito',
    description: 'Capacidad visual, reacción, percepción y factores humanos de la conducción.',
    order: 4,
    isActive: true,
  },
  {
    id: 'chapter-5',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 5',
    title: 'Las y los usuarios vulnerables',
    description: 'Peatones, ciclistas, motociclistas, niños y otros usuarios vulnerables.',
    order: 5,
    isActive: true,
  },
  {
    id: 'chapter-6',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 6',
    title: 'Normas de circulación',
    description: 'Velocidad, prioridades, adelantamientos, señales y reglas de circulación.',
    order: 6,
    isActive: true,
  },
  {
    id: 'chapter-7',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 7',
    title: 'Conducción en circunstancias especiales',
    description: 'Conducción nocturna, climática y otras condiciones especiales.',
    order: 7,
    isActive: true,
  },
  {
    id: 'chapter-8',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 8',
    title: 'Conducción eficiente',
    description: 'Hábitos de conducción eficiente, consumo y conducción sustentable.',
    order: 8,
    isActive: true,
  },
  {
    id: 'chapter-9',
    editionId: ACTIVE_EDITION_ID,
    code: 'Capítulo 9',
    title: 'Informaciones importantes',
    description: 'Obligaciones legales, documentación y contenidos finales del manual.',
    order: 9,
    isActive: true,
  },
].map((chapter) => ({
  ...chapter,
  code: repairPotentialMojibake(chapter.code),
  title: repairPotentialMojibake(chapter.title),
  description: repairPotentialMojibake(chapter.description),
}));

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
  sourceReference?: string;
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
    prompt: repairPotentialMojibake(input.prompt),
    selectionMode,
    instruction:
      repairPotentialMojibake(input.instruction ?? '') ||
      repairPotentialMojibake(
        selectionMode === 'multiple'
          ? `Marque ${input.correctOptionIndexes.length} respuestas.`
          : 'Marque una respuesta.',
      ),
    sourceDocumentId: 'manual-claseb-2026',
    sourcePage: input.sourcePage,
    sourceReference: repairPotentialMojibake(input.sourceReference ?? `PÃ¡g. ${input.sourcePage}`),
    explanation: repairPotentialMojibake(input.explanation ?? ''),
    publicExplanation: repairPotentialMojibake(input.explanation ?? ''),
    status: 'published',
    isOfficialExamEligible: true,
    doubleWeight: input.doubleWeight ?? false,
    reviewNotes: input.reviewNotes ? repairPotentialMojibake(input.reviewNotes) : undefined,
    createdBy: SEED_AUTHOR,
    updatedBy: SEED_AUTHOR,
    reviewedAt: REVIEWED_AT,
    publishedAt: PUBLISHED_AT,
    options: buildOptions(
      input.id,
      input.options.map((option) => repairPotentialMojibake(option)),
      input.correctOptionIndexes,
    ),
    media: [],
  };
}

const CORE_SEEDED_QUESTIONS: Question[] = [
  buildQuestion({
    id: 'week1-q01',
    chapterId: 'chapter-1',
    week: 1,
    prompt: "Â¿Por quÃ© el manual considera incorrecto hablar de 'accidente' de trÃ¡nsito?",
    options: [
      'Porque se trata de hechos completamente azarosos e impredecibles.',
      'Porque la mayorÃ­a de los siniestros se puede evitar al eliminar factores de riesgo.',
      'Porque el tÃ©rmino solo se usa cuando no hay personas lesionadas.',
      "Porque la ley obliga a reemplazarlo por 'siniestro' solo en trÃ¡mites de seguros.",
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
      'SegÃºn el manual, Â¿cuÃ¡ntas personas fallecen en promedio cada dÃ­a en Chile por siniestros de trÃ¡nsito?',
    options: ['1 a 2 personas', '10 a 12 personas', '4 a 5 personas', 'MÃ¡s de 20 personas'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q03',
    chapterId: 'chapter-1',
    week: 1,
    prompt: 'Â¿DÃ³nde ocurre la mayor cantidad de siniestros de trÃ¡nsito en Chile?',
    options: ['Carreteras', 'Autopistas', 'VÃ­as urbanas', 'Caminos rurales'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q04',
    chapterId: 'chapter-1',
    week: 1,
    prompt: 'Â¿En quÃ© tipo de vÃ­a se registra la mayor cantidad de personas fallecidas?',
    options: [
      'VÃ­as urbanas',
      'Intersecciones semaforizadas',
      'VÃ­as interurbanas o no urbanas',
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
      'Aproximadamente, Â¿quÃ© porcentaje de los siniestros de trÃ¡nsito ocurre en zonas urbanas?',
    options: ['20%', '50%', '80%', '95%'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q06',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Â¿CuÃ¡l es la principal causa de muerte en la poblaciÃ³n infantil de 1 a 14 aÃ±os en Chile?',
    options: [
      'Enfermedades raras',
      'Siniestros de trÃ¡nsito',
      'Accidentes domÃ©sticos',
      'DesnutriciÃ³n',
    ],
    correctOptionIndexes: [1],
    sourcePage: 6,
  }),
  buildQuestion({
    id: 'week1-q07',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'En personas jÃ³venes de 15 a 29 aÃ±os, Â¿quÃ© causa de muerte antecede a los siniestros de trÃ¡nsito?',
    options: ['Las drogas', 'El cÃ¡ncer', 'Los suicidios', 'Las enfermedades cardÃ­acas'],
    correctOptionIndexes: [2],
    sourcePage: 6,
  }),
  buildQuestion({
    id: 'week1-q08',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'SegÃºn el manual, Â¿a cuÃ¡nto equivale el costo de los siniestros de trÃ¡nsito en Chile?',
    options: ['1% del PIB', '2% del PIB', '5% del PIB', '10% del PIB'],
    correctOptionIndexes: [1],
    sourcePage: 7,
  }),
  buildQuestion({
    id: 'week1-q09',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Â¿Entre quÃ© velocidades la probabilidad de muerte de un peatÃ³n atropellado se multiplica por ocho?',
    options: ['20 a 40 km/h', '30 a 50 km/h', '40 a 60 km/h', '50 a 80 km/h'],
    correctOptionIndexes: [1],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q10',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Si un peatÃ³n es atropellado a 30 km/h o menos, Â¿quÃ© probabilidad de sobrevivir tiene aproximadamente?',
    options: ['50%', '70%', '90%', '100%'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q11',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Â¿A partir de quÃ© velocidad es prÃ¡cticamente seguro que un peatÃ³n atropellado fallezca?',
    options: ['45 km/h', '55 km/h', '65 km/h', '100 km/h'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q12',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'SegÃºn el manual, la falla humana estÃ¡ presente en mÃ¡s de quÃ© porcentaje de los siniestros de trÃ¡nsito?',
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
    prompt: 'Â¿QuÃ© grupo etario concentra cerca del 29% de los conductores fallecidos?',
    options: [
      'Mayores de 65 aÃ±os',
      'JÃ³venes entre 18 y 29 aÃ±os',
      'Personas entre 30 y 45 aÃ±os',
      'Menores de 18 aÃ±os',
    ],
    correctOptionIndexes: [1],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q14',
    chapterId: 'chapter-1',
    week: 1,
    prompt: 'Â¿QuÃ© porcentaje de las personas conductoras fallecidas corresponde a hombres?',
    options: ['50%', '65%', '79%', '92%'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q15',
    chapterId: 'chapter-1',
    week: 1,
    prompt: 'Â¿CuÃ¡les de las siguientes afirmaciones corresponden al enfoque de Sistema Seguro?',
    options: [
      'Reconoce que las personas pueden cometer errores.',
      'Considera aceptables las lesiones graves si el trÃ¡nsito fluye mejor.',
      'Busca que, si un componente falla, otros sigan protegiendo a las personas.',
      'Da prioridad a la velocidad de desplazamiento por sobre la seguridad.',
    ],
    correctOptionIndexes: [0, 2],
    sourcePage: 9,
    doubleWeight: true,
    reviewNotes: 'Convertida a selecciÃ³n mÃºltiple para reflejar mejor el concepto.',
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
    prompt: 'Â¿QuÃ© entiende el manual por convivencia vial?',
    options: [
      'El cumplimiento estricto de multas.',
      'La interacciÃ³n armoniosa y segura entre quienes usan las vÃ­as.',
      'La prioridad absoluta de los automÃ³viles.',
      'La exclusiÃ³n de ciclistas y peatones de la calzada.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 33,
  }),
  buildQuestion({
    id: 'week1-q18',
    chapterId: 'chapter-3',
    week: 1,
    prompt: 'Â¿CuÃ¡l es la meta de la seguridad vial?',
    options: [
      'Recaudar fondos mediante multas.',
      'Eliminar completamente los siniestros de trÃ¡nsito.',
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
      'SegÃºn el manual, la percepciÃ³n de riesgo de la mayorÃ­a de los conductores suele ser:',
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
    prompt: 'Â¿QuÃ© proporciÃ³n aproximada de los siniestros con vÃ­ctimas se atribuye a fallas humanas?',
    options: ['Cerca del 50%', 'Cerca del 75%', 'Cerca del 90%', 'Cerca del 100%'],
    correctOptionIndexes: [2],
    sourcePage: 33,
  }),
  buildQuestion({
    id: 'week1-q21',
    chapterId: 'chapter-3',
    week: 1,
    prompt: 'Â¿QuÃ© expresa el principio de confianza en la conducciÃ³n?',
    options: [
      'Que el vehÃ­culo no presentarÃ¡ fallas mecÃ¡nicas.',
      'Que las demÃ¡s personas cumplirÃ¡n las normas y su papel en la vÃ­a.',
      'Que se puede conducir rÃ¡pido sin asumir riesgos.',
      'Que la fiscalizaciÃ³n no ocurrirÃ¡ si se conduce con cuidado.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 34,
  }),
  buildQuestion({
    id: 'week1-q22',
    chapterId: 'chapter-3',
    week: 1,
    prompt: 'Â¿CuÃ¡l es la virtud mÃ¡s importante al conducir, segÃºn el manual?',
    options: ['La rapidez de reflejos', 'La solidaridad', 'La agresividad', 'La competitividad'],
    correctOptionIndexes: [1],
    sourcePage: 35,
  }),
  buildQuestion({
    id: 'week1-q23',
    chapterId: 'chapter-3',
    week: 1,
    prompt: 'Â¿CuÃ¡l es el principio fundamental en la conducciÃ³n de un vehÃ­culo?',
    options: ['La velocidad', 'La audacia', 'La precauciÃ³n', 'La potencia'],
    correctOptionIndexes: [2],
    sourcePage: 35,
  }),
  buildQuestion({
    id: 'week1-q24',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Â¿QuÃ© tipo de costo representa el sufrimiento fÃ­sico y psicolÃ³gico provocado por un siniestro?',
    options: ['Costo material', 'Costo administrativo', 'Costo de salud', 'Costo humano'],
    correctOptionIndexes: [3],
    sourcePage: 7,
  }),
  buildQuestion({
    id: 'week1-q25',
    chapterId: 'chapter-1',
    week: 1,
    prompt: 'Â¿QuÃ© ejemplo corresponde a un costo administrativo de un siniestro?',
    options: [
      'Primeros auxilios',
      'GestiÃ³n de seguros y trÃ¡mites legales',
      'DaÃ±os a vehÃ­culos',
      'RehabilitaciÃ³n',
    ],
    correctOptionIndexes: [1],
    sourcePage: 7,
  }),
  buildQuestion({
    id: 'week1-q26',
    chapterId: 'chapter-1',
    week: 1,
    prompt: 'Â¿En quÃ© momento del dÃ­a tiende a aumentar la siniestralidad?',
    options: ['MaÃ±ana', 'Tarde', 'Noche y madrugada', 'Al mediodÃ­a'],
    correctOptionIndexes: [2],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q27',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Â¿QuÃ© reconoce el Sistema Seguro respecto de la capacidad del cuerpo humano frente a un impacto?',
    options: [
      'Que es ilimitada.',
      'Que es muy resistente.',
      'Que es limitada para soportar fuerzas antes de sufrir daÃ±o.',
      'Que depende solo de la edad.',
    ],
    correctOptionIndexes: [2],
    sourcePage: 9,
  }),
  buildQuestion({
    id: 'week1-q28',
    chapterId: 'chapter-3',
    week: 1,
    prompt: 'Â¿QuÃ© hÃ¡bitos busca fomentar la educaciÃ³n vial?',
    options: [
      'Competencia y orgullo',
      'Respeto, solidaridad y tolerancia',
      'Miedo y obediencia ciega',
      'Habilidad tÃ©cnica por sobre la convivencia',
    ],
    correctOptionIndexes: [1],
    sourcePage: 33,
  }),
  buildQuestion({
    id: 'week1-q29',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'SegÃºn el manual, Â¿cuÃ¡ntas personas cercanas sufren dolor por cada persona fallecida?',
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
      'En zonas urbanas, Â¿en quÃ© lugar ocurre la mayor cantidad de los siniestros de trÃ¡nsito?',
    options: ['Pasajes', 'Intersecciones o cruces de calles', 'Frente a colegios', 'Avenidas principales'],
    correctOptionIndexes: [1],
    sourcePage: 8,
  }),
  buildQuestion({
    id: 'week1-q31',
    chapterId: 'chapter-1',
    week: 1,
    prompt:
      'Â¿QuÃ© ejemplo usa el manual para mostrar que los siniestros no son hechos puramente azarosos?',
    options: [
      'Que aumentan cuando hay sol.',
      'Que disminuyen cuando hay mÃ¡s vehÃ­culos nuevos.',
      'Que aumentan cuando llueve.',
      'Que desaparecen cuando el trÃ¡nsito es escaso.',
    ],
    correctOptionIndexes: [2],
    sourcePage: 6,
  }),
  buildQuestion({
    id: 'week1-q32',
    chapterId: 'chapter-1',
    week: 1,
    prompt: 'Â¿QuÃ© factor tiene mayor incidencia en la ocurrencia de siniestros?',
    options: [
      'Estado del motor',
      'Consumo de alcohol y exceso de velocidad',
      'Falta de iluminaciÃ³n',
      'AntigÃ¼edad del vehÃ­culo',
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
      'TrÃ¡nsito de mÃ¡quinas',
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
    prompt: 'Â¿QuÃ© acciones favorecen una buena convivencia vial?',
    options: [
      'Ceder el paso cuando corresponde.',
      'Actuar con amabilidad hacia las demÃ¡s personas usuarias.',
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
      'Si uno de los componentes del Sistema Seguro falla, Â¿quÃ© debe ocurrir segÃºn ese enfoque?',
    options: [
      'El sistema completo colapsa.',
      'Las demÃ¡s partes deben seguir protegiendo a las personas.',
      'El conductor debe ser arrestado de inmediato.',
      'La vÃ­a debe cerrarse obligatoriamente.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 9,
  }),
  buildQuestion({
    id: 'week1-q36',
    chapterId: 'chapter-1',
    week: 1,
    prompt: 'Los siniestros de trÃ¡nsito se consideran un problema prioritario de:',
    options: ['EconomÃ­a', 'Salud pÃºblica', 'MecÃ¡nica', 'Orden vial'],
    correctOptionIndexes: [1],
    sourcePage: 6,
  }),
  buildQuestion({
    id: 'week1-q37',
    chapterId: 'chapter-1',
    week: 1,
    prompt: 'Â¿QuÃ© es esencial para adquirir conocimientos sÃ³lidos sobre normas de trÃ¡nsito?',
    options: [
      'Tener un auto rÃ¡pido',
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
    prompt: 'Â¿Por quÃ© un conductor imprudente afecta a toda la sociedad?',
    options: [
      'Porque gasta mÃ¡s bencina.',
      'Porque las consecuencias de su decisiÃ³n se pagan directa o indirectamente.',
      'Porque bloquea el paso del resto.',
      'Porque genera ruido en la vÃ­a.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 6,
  }),
  buildQuestion({
    id: 'week1-q39',
    chapterId: 'chapter-3',
    week: 1,
    prompt: 'Â¿CuÃ¡l de las siguientes conductas perjudica la seguridad vial?',
    options: [
      'Respetar los lÃ­mites de velocidad',
      'Prestar atenciÃ³n a la vÃ­a',
      'Circular a exceso de velocidad para llegar antes',
      'Usar cinturÃ³n de seguridad',
    ],
    correctOptionIndexes: [2],
    sourcePage: 33,
  }),
  buildQuestion({
    id: 'week1-q40',
    chapterId: 'chapter-3',
    week: 1,
    prompt: 'Â¿QuÃ© personas usuarias de las vÃ­as se consideran vulnerables?',
    options: ['Peatones', 'Ciclistas', 'Motociclistas', 'Conductores de buses'],
    correctOptionIndexes: [0, 1, 2],
    sourcePage: 35,
    doubleWeight: true,
    reviewNotes: 'Convertida a selecciÃ³n mÃºltiple para reflejar el concepto del manual.',
  }),
  buildQuestion({
    id: 'week2-q41',
    chapterId: 'chapter-3',
    week: 2,
    prompt:
      'SegÃºn el manual, Â¿quÃ© se necesita para lograr una buena convivencia vial de forma estable?',
    options: [
      'Solo fiscalizaciÃ³n visible en todo momento.',
      'Un nivel adecuado de educaciÃ³n vial en quienes participan del trÃ¡nsito.',
      'Prioridad permanente para los vehÃ­culos mÃ¡s rÃ¡pidos.',
      'Eliminar la circulaciÃ³n de peatones y ciclistas.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 33,
    sourceReference: 'PÃ¡g. 33, Convivencia Vial y EducaciÃ³n Vial',
    explanation:
      'La buena convivencia vial exige que conductores, peatones, pasajeros y demÃ¡s personas usuarias dispongan de educaciÃ³n vial suficiente para interactuar de forma armoniosa y segura.',
  }),
  buildQuestion({
    id: 'week2-q42',
    chapterId: 'chapter-3',
    week: 2,
    prompt:
      'Â¿CÃ³mo define el manual la educaciÃ³n vial dentro del capÃ­tulo sobre convivencia?',
    options: [
      'Como el aprendizaje de maniobras mecÃ¡nicas para aprobar el examen.',
      'Como la adquisiciÃ³n de valores, hÃ¡bitos y actitudes positivas para la conducciÃ³n.',
      'Como el estudio exclusivo de sanciones y multas.',
      'Como una prÃ¡ctica reservada a conductores profesionales.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 33,
    sourceReference: 'PÃ¡g. 33, EducaciÃ³n Vial',
    explanation:
      'El texto presenta la educaciÃ³n vial como formaciÃ³n en valores, hÃ¡bitos y actitudes positivas de convivencia, no como simple memorizaciÃ³n normativa.',
  }),
  buildQuestion({
    id: 'week2-q43',
    chapterId: 'chapter-3',
    week: 2,
    prompt:
      'AdemÃ¡s de inculcar valores, Â¿quÃ© incorpora la educaciÃ³n vial segÃºn el manual?',
    options: [
      'La incorporaciÃ³n de normas de comportamiento y el conocimiento de un catÃ¡logo de seÃ±ales.',
      'La costumbre de seguir a otros vehÃ­culos sin evaluar riesgos.',
      'La preferencia por la velocidad para mejorar la fluidez.',
      'La idea de que basta con conocer el reglamento sin cambiar actitudes.',
    ],
    correctOptionIndexes: [0],
    sourcePage: 33,
    sourceReference: 'PÃ¡g. 33, normas de comportamiento y seÃ±ales',
    explanation:
      'La pÃ¡gina 33 vincula la educaciÃ³n vial con normas de comportamiento, Ley de TrÃ¡nsito y conocimiento de seÃ±ales para contribuir a la seguridad vial.',
  }),
  buildQuestion({
    id: 'week2-q44',
    chapterId: 'chapter-3',
    week: 2,
    prompt:
      'Para practicar una conducciÃ³n segura y responsable, el manual indica que se deben eliminar en lo posible:',
    options: [
      'Las preferencias personales al conducir.',
      'Los factores de riesgo.',
      'Las vÃ­as compartidas con otras personas.',
      'Las normas que retrasan la circulaciÃ³n.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 34,
    sourceReference: 'PÃ¡g. 34, factores de riesgo',
    explanation:
      'El manual seÃ±ala de forma expresa que la conducciÃ³n segura y responsable exige eliminar, en la medida de lo posible, los factores de riesgo.',
  }),
  buildQuestion({
    id: 'week2-q45',
    chapterId: 'chapter-3',
    week: 2,
    prompt:
      'Â¿Por quÃ© pasar una luz roja debilita el principio de confianza, segÃºn el manual?',
    options: [
      'Porque obliga a circular mÃ¡s lento en la siguiente cuadra.',
      'Porque rompe la expectativa de que cada integrante del trÃ¡nsito respetarÃ¡ las normas de convivencia vial.',
      'Porque impide conocer el significado reglamentario del semÃ¡foro.',
      'Porque solo puede ser sancionado si hay otro vehÃ­culo detenido.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 34,
    sourceReference: 'PÃ¡g. 34, principio de confianza',
    explanation:
      'El principio de confianza supone que las demÃ¡s personas respetarÃ¡n las normas y su papel en la vÃ­a. Pasar con luz roja quiebra esa expectativa y puede desencadenar un siniestro.',
  }),
  buildQuestion({
    id: 'week2-q46',
    chapterId: 'chapter-3',
    week: 2,
    prompt:
      'Â¿Por quÃ© la educaciÃ³n vial es indispensable en la formaciÃ³n social e individual de las personas?',
    options: [
      'Porque todas las personas participan del trÃ¡nsito en distintos roles a lo largo de su vida.',
      'Porque reemplaza la necesidad de cumplir las normas de trÃ¡nsito.',
      'Porque solo las personas conductoras deben aprender a convivir en la vÃ­a.',
      'Porque evita por completo la fiscalizaciÃ³n y las sanciones.',
    ],
    correctOptionIndexes: [0],
    sourcePage: 34,
    sourceReference: 'PÃ¡g. 34, EducaciÃ³n Vial y roles en el trÃ¡nsito',
    explanation:
      'El texto explica que todas las personas serÃ¡n peatones, ciclistas, usuarias de vehÃ­culos o conductoras en distintos momentos, por lo que la educaciÃ³n vial tiene alcance social e individual.',
  }),
  buildQuestion({
    id: 'week2-q47',
    chapterId: 'chapter-3',
    week: 2,
    prompt:
      'Â¿QuÃ© exige el principio de precauciÃ³n durante la conducciÃ³n, segÃºn el manual?',
    options: [
      'Confiar en que las demÃ¡s personas no cometerÃ¡n errores.',
      'Aceptar que cualquiera puede equivocarse y mantenerse atento con conducciÃ³n defensiva y preventiva.',
      'Conducir con rapidez para reducir el tiempo de exposiciÃ³n al riesgo.',
      'Desconfiar de toda norma de convivencia para evitar sorpresas.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 35,
    sourceReference: 'PÃ¡g. 35, precauciÃ³n y conducciÃ³n defensiva',
    explanation:
      'La precauciÃ³n parte de admitir el error humano y exige atenciÃ³n permanente a las condiciones del trÃ¡nsito mediante conducciÃ³n defensiva y preventiva.',
  }),
  buildQuestion({
    id: 'week2-q48',
    chapterId: 'chapter-3',
    week: 2,
    prompt:
      'Â¿CuÃ¡l de las siguientes acciones presenta el manual como una expresiÃ³n de solidaridad al conducir?',
    options: [
      'Acelerar para impedir que otro vehÃ­culo adelante.',
      'Dejar espacio suficiente y mostrar consideraciÃ³n hacia personas usuarias vulnerables.',
      'Usar la bocina para exigir prioridad frente a peatones.',
      'Mantener una actitud competitiva para no perder tiempo.',
    ],
    correctOptionIndexes: [1],
    sourcePage: 35,
    sourceReference: 'PÃ¡g. 35, solidaridad y usuarios vulnerables',
    explanation:
      'El manual pone como ejemplos de solidaridad ceder el paso, dejar espacio suficiente y actuar con consideraciÃ³n hacia peatones, ciclistas y otras personas usuarias vulnerables.',
  }),
];

export const SEEDED_QUESTIONS: Question[] = [
  ...CORE_SEEDED_QUESTIONS,
  ...REVIEWED_IMPORTED_QUESTIONS,
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

