const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
const suspiciousPattern = /(Ã.|Â.|â.|ï¿½|�)/g;

function decodeLatin1AsUtf8(value) {
  const bytes = Uint8Array.from([...String(value ?? '')].map((character) => character.charCodeAt(0) & 0xff));
  return utf8Decoder.decode(bytes);
}

export function recoverMojibake(value) {
  let next = String(value ?? '');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!suspiciousPattern.test(next)) {
      break;
    }
    suspiciousPattern.lastIndex = 0;
    const candidate = decodeLatin1AsUtf8(next);
    if (!candidate || candidate === next) {
      break;
    }
    next = candidate;
  }
  suspiciousPattern.lastIndex = 0;
  return next;
}

function stripDiacritics(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buildRootLookup(domainRoots) {
  const lookup = new Map();
  for (const entry of domainRoots?.roots ?? []) {
    for (const variant of entry.variants ?? []) {
      lookup.set(stripDiacritics(String(variant).toLowerCase()), entry.root);
    }
  }
  return lookup;
}

export function createSpanishTextNormalizer({ stopwords, domainRoots }) {
  const stopwordSet = new Set((stopwords?.items ?? []).map((item) => stripDiacritics(String(item).toLowerCase())));
  const rootLookup = buildRootLookup(domainRoots);

  function normalizeWhitespace(value) {
    return recoverMojibake(String(value ?? ''))
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function toDisplayText(value) {
    return normalizeWhitespace(value);
  }

  function tokenize(value) {
    const normalized = stripDiacritics(normalizeWhitespace(value).toLowerCase());
    return normalized
      .split(/[^a-z0-9/%.-]+/u)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => rootLookup.get(token) ?? token)
      .filter((token) => token.length >= 2 && !stopwordSet.has(token));
  }

  function toSearchText(parts) {
    return parts.flatMap((part) => tokenize(part)).join(' ');
  }

  function normalizeForCompare(value) {
    return stripDiacritics(normalizeWhitespace(value).toLowerCase());
  }

  return {
    toDisplayText,
    tokenize,
    toSearchText,
    normalizeForCompare,
  };
}
