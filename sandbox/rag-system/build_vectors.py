import json

import numpy as np
from openai import OpenAI

from build_manifest import build_manifest
from lib.pipeline_common import get_build_paths, load_json, retry_call


OLLAMA_BASE_URL = "http://localhost:11434/v1"
MAX_EMBED_CHARS = 1000

client = OpenAI(api_key="ollama", base_url=OLLAMA_BASE_URL)


def get_embedding(text: str, model_name: str) -> list[float]:
    response = retry_call(
        lambda: client.embeddings.create(model=model_name, input=[text.replace("\n", " ")]),
        attempts=3,
        sleep_seconds=1.5,
    )
    return response.data[0].embedding


def split_for_embedding(text: str, max_chars: int = MAX_EMBED_CHARS) -> list[str]:
    return [text[i : i + max_chars] for i in range(0, len(text), max_chars)]


def build_vectors(manifest: dict) -> dict:
    build_paths = get_build_paths(manifest["buildId"])
    units = load_json(build_paths.knowledge_units_path, default=[]) or []

    vectors = []
    mapping = []

    for unit in units:
        segments = split_for_embedding(unit["supportingText"])
        for segment_index, segment in enumerate(segments):
            try:
                vector = get_embedding(segment, manifest["models"]["embedModel"])
            except Exception:  # noqa: BLE001
                continue
            vectors.append(vector)
            mapping.append(
                {
                    "vectorIndex": len(vectors) - 1,
                    "unitId": unit["unitId"],
                    "segmentIndex": segment_index,
                }
            )

    np.save(build_paths.vector_path, np.array(vectors))
    with build_paths.vector_mapping_path.open("w", encoding="utf-8") as handle:
        json.dump(mapping, handle, ensure_ascii=False, indent=2)

    return {"vectorCount": len(vectors), "unitCount": len(units)}


if __name__ == "__main__":
    manifest = build_manifest()
    stats = build_vectors(manifest)
    print(f"Saved {stats['vectorCount']} vectors for {stats['unitCount']} knowledge units.")
