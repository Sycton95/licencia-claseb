# Launchers

Windows click-to-run launchers for local human testing.

## Included

- `01-admin-beta.cmd`
  - Starts the combined `/admin` Beta local flow
  - Enables local admin + Beta panel + local Ollama flags
  - Opens `http://localhost:5173/admin`

- `02-public-dev.cmd`
  - Starts normal Vite dev mode
  - Opens `http://localhost:5173/`

- `03-local-preview.cmd`
  - Runs a local production build
  - Starts `vite preview` on `http://127.0.0.1:4173`
  - Opens the preview URL

- `04-beta-worker-only.cmd`
  - Starts only the local Ollama worker
  - Useful for worker debugging

- `05-beta-health-check.cmd`
  - Calls the local worker health endpoint
  - Use after the worker is already running

## Notes

- These launchers assume `npm install` has already been run.
- `01-admin-beta.cmd` also assumes Ollama is already running locally.
- The Beta panel is still local-only and never changes production behavior.
