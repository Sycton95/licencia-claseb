# Resource Sources

These resources are vendored snapshots for offline calibration work.

## Spanish stopwords

- Base curation derived from common Spanish stopword lists used in IR/NLP practice.
- Adjusted manually for driving-manual retrieval so domain-critical words are preserved.
- This snapshot is intentionally local and must not be fetched at runtime.

## Domain roots

- Derived from the current manual vocabulary and import corpus.
- Only light, domain-specific stemming rules are allowed here.
- Do not add aggressive generic stemming that could merge legally distinct concepts.

## Unit normalization and domain facts

- Seeded from the current 2026 manual knowledge pack.
- Expanded for benchmark-first sandbox work only.
- Production `ground-truth.json` remains independent until this sandbox is validated.
