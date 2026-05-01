from build_manifest import build_manifest
from build_vectors import build_vectors


if __name__ == "__main__":
    manifest = build_manifest()
    stats = build_vectors(manifest)
    print(
        f"Legacy wrapper complete: saved {stats['vectorCount']} vectors for {stats['unitCount']} knowledge units."
    )
