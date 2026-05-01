# Launchers

Windows click-to-run launchers for local human testing.

## Included

- `01-admin-local.cmd`
  - Starts the canonical local `/admin` flow
  - Enables local admin and the local PDF worker
  - Uses the shared runtime orchestrator with auto-resolved ports
  - Opens the resolved `/admin` URL when ready

- `02-public-dev.cmd`
  - Starts normal Vite dev mode
  - Opens `http://localhost:5173/`

- `03-local-preview.cmd`
  - Runs a local production build
  - Starts `vite preview` on `http://127.0.0.1:4173`
  - Opens the preview URL

## Notes

- These launchers assume `npm install` has already been run.
- The local Admin launcher is the supported default for editorial work.
- Legacy Beta/Ollama-only launchers were removed from this folder because Ollama is deprecated as the default local Admin path.
