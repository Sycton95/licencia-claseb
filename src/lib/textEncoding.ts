const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
const suspiciousPattern = /(\u00C3.|\u00C2.|\u00E2\u20AC|\u00E2\u20AC\u201C|\u00E2\u20AC\u201D|\u00E2\u20AC\u0153|\u00E2\u20AC\u009D|\u00E2\u20AC\u02DC|\u00E2\u20AC\u2122|\u00EF\u00BF\u00BD)/;
const replacementPattern = /\uFFFD/g;

function countSuspiciousMarkers(value: string) {
  return [...value.matchAll(suspiciousPattern)].length + [...value.matchAll(replacementPattern)].length * 2;
}

function decodeLatin1AsUtf8(value: string) {
  const bytes = Uint8Array.from([...value].map((character) => character.charCodeAt(0) & 0xff));
  return utf8Decoder.decode(bytes);
}

export function repairPotentialMojibake(value: string) {
  if (!value || !suspiciousPattern.test(value)) {
    return value;
  }

  let next = value;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const currentScore = countSuspiciousMarkers(next);
    const candidate = decodeLatin1AsUtf8(next);
    const candidateScore = countSuspiciousMarkers(candidate);

    if (candidate === next || candidateScore >= currentScore) {
      break;
    }

    next = candidate;
  }

  return next;
}
