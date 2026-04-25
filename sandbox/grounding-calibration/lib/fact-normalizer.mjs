function normalizeNumberToken(raw) {
  const value = String(raw ?? '').trim();
  if (!value) {
    return null;
  }

  const compact = value.replace(/\s+/g, '');
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/u.test(compact)) {
    return Number(compact.replace(/\./g, '').replace(',', '.'));
  }
  if (/^\d+(?:,\d+)?$/u.test(compact)) {
    return Number(compact.replace(',', '.'));
  }
  if (/^\d+(?:\.\d+)?$/u.test(compact)) {
    return Number(compact);
  }
  return null;
}

const NUMBER_WORDS = new Map([
  ['un', 1],
  ['uno', 1],
  ['una', 1],
  ['dos', 2],
  ['tres', 3],
  ['cuatro', 4],
  ['cinco', 5],
  ['seis', 6],
  ['siete', 7],
  ['ocho', 8],
  ['nueve', 9],
  ['diez', 10],
]);

function buildUnitLookup(unitNormalization) {
  const lookup = new Map();
  for (const rule of unitNormalization?.rules ?? []) {
    for (const alias of rule.aliases ?? []) {
      lookup.set(String(alias).toLowerCase(), rule.canonicalUnit);
    }
  }
  return lookup;
}

export function createFactNormalizer({ unitNormalization }) {
  const unitLookup = buildUnitLookup(unitNormalization);

  function normalizeUnit(rawUnit) {
    if (!rawUnit) {
      return '';
    }
    const value = String(rawUnit).toLowerCase().trim();
    return unitLookup.get(value) ?? value;
  }

  function extractEntities(text) {
    const source = String(text ?? '');
    const results = [];
    const numberWithUnitPattern = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?:\s*[-â€“]\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?))?\s*(km\/h|kmh|kms\/h|g\/l|gr\/l|utm|aÃ±os|anos|aÃ±o|ano|meses|mes|cm|cms|centimetro|centimetros|centÃ­metro|centÃ­metros|psi|p\.s\.i\.|gramos por mil|gramos por litro|gramos de alcohol por litro de sangre)?/giu;
    const percentagePattern = /(\d{1,3}(?:[.,]\d+)?)\s*%/giu;
    const millionPesosPattern = /(\d+(?:[.,]\d+)?)\s+millones?\s+de\s+pesos?/giu;
    const wordNumberPattern = /\b(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(aÃ±os|anos|aÃ±o|ano|meses|mes)\b/giu;

    for (const match of source.matchAll(numberWithUnitPattern)) {
      const startValue = normalizeNumberToken(match[1]);
      const endValue = normalizeNumberToken(match[2]);
      const unit = normalizeUnit(match[3]);
      if (startValue === null) {
        continue;
      }

      results.push({
        raw: match[0],
        normalized: startValue,
        normalizedEnd: endValue,
        unit,
      });
    }

    for (const match of source.matchAll(percentagePattern)) {
      const normalized = normalizeNumberToken(match[1]);
      if (normalized === null) {
        continue;
      }
      results.push({
        raw: match[0],
        normalized,
        normalizedEnd: null,
        unit: '%',
      });
    }

    for (const match of source.matchAll(millionPesosPattern)) {
      const normalized = normalizeNumberToken(match[1]);
      if (normalized === null) {
        continue;
      }
      results.push({
        raw: match[0],
        normalized: normalized * 1000000,
        normalizedEnd: null,
        unit: 'pesos',
      });
    }

    for (const match of source.matchAll(wordNumberPattern)) {
      const normalized = NUMBER_WORDS.get(String(match[1]).toLowerCase());
      if (!normalized) {
        continue;
      }
      results.push({
        raw: match[0],
        normalized,
        normalizedEnd: null,
        unit: normalizeUnit(match[2]),
      });
    }

    return results;
  }

  function entitiesContain(entities, expected) {
    const expectedUnit = normalizeUnit(expected.unit);
    return entities.some((entity) => {
      const sameValue =
        entity.normalized === expected.normalized ||
        entity.normalizedEnd === expected.normalized;
      const unitCompatible = !expectedUnit || !entity.unit || entity.unit === expectedUnit;
      return sameValue && unitCompatible;
    });
  }

  return {
    extractEntities,
    entitiesContain,
    normalizeUnit,
  };
}
