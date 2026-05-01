from build_manifest import build_manifest
from generate_candidates import generate_candidates


if __name__ == "__main__":
    manifest = build_manifest()
    candidates = generate_candidates(manifest)
    print(
        f"Legacy wrapper complete: generated {len(candidates)} candidates for {manifest['buildId']}."
    )
