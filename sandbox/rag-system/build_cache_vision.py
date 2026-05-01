from build_manifest import build_manifest
from extract_pages_vision import extract_page_artifacts


if __name__ == "__main__":
    manifest = build_manifest()
    page_artifacts = extract_page_artifacts(manifest)
    print(
        f"Legacy wrapper complete: extracted {len(page_artifacts)} page artifacts for {manifest['buildId']}."
    )
