# File Management System Scaffold

This repository provides the groundwork for the file management platform: a Node.js + Express backend, a Vue 3 + Vite + TypeScript frontend, LowDB storage, and Docker tooling. The HTTP handlers still return `501 Not Implemented`, allowing teams to focus on architecture, conventions, and integration points before building full features.

## Prerequisites

- Node.js 18+
- npm 9+
- Docker (optional, for containerised workflow)

## Environment variables

Duplicate `.env.example` to `.env` and tweak the values as needed.

| Key | Purpose |
| --- | --- |
| `PORT` | Port exposed by the Express API (Compose maps it to `5175`). |
| `DIFY_BASE_URL`, `DIFY_KB_ID`, `DIFY_API_KEY` | Credentials for the Dify Knowledge Base integration. |
| `UPLOAD_MAX_BYTES`, `UPLOAD_ALLOWED_MIME` | File size ceiling and MIME whitelist enforced during uploads. |

## Local environment setup (testing & debugging)

Follow the steps below to spin up a fully working local stack, exercise the APIs, and debug changes.

### 1. Install dependencies

```bash
# Backend
npm install

# Frontend (run in a second terminal)
cd frontend
npm install
```

> If the package registry is slow/blocked in your region, configure an npm mirror before running `npm install`.

### 2. Prepare environment files

1. Copy `.env.example` to `.env` at the repository root and adjust values if needed. Leaving the Dify keys blank keeps the backend in "local search" mode.
2. (Optional) Duplicate `frontend/.env.example` to `frontend/.env` if you want to override the Vite dev server port or inject additional frontend environment variables.

### 3. Seed local data

- `db.json` ships with sample accounts (`admin` / `admin123`, `user` / `user123`), repositories, and files. Modify it freely while iterating.  
- To reset the datastore, delete `db.json` and restore it from version control (e.g., `git checkout -- db.json`) or keep a personal template handy.  
- Uploaded binaries land under `uploads/`. Remove files here if you want a clean state.

### 4. Run the backend

```bash
npm run dev
```

`npm run dev` starts the Express server with Nodemon on port `5175`, automatically reloading when you edit source files. Useful debugging tricks:

- **Enable verbose logging** – the request logger middleware already prints every API call; add `console.log` statements inside routers/services as needed.
- **Attach a debugger** – run `NODE_OPTIONS='--inspect=9229' npm run dev` (or `node --inspect src/server.js`) and connect Chrome DevTools / VS Code to `localhost:9229`.
- **Override ports** – set `PORT=4000` (or any free port) in your `.env` before booting.

Once the server is running you can verify authentication with curl/Postman:

```bash
curl -X POST http://localhost:5175/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

The response contains a mock JWT-like token. Reuse it for protected routes:

```bash
TOKEN=$(curl -sX POST http://localhost:5175/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0, 'utf8')).token")

curl http://localhost:5175/api/repos \
  -H "Authorization: Bearer ${TOKEN}"
```

### 5. Run the frontend dev server

```bash
cd frontend
npm run dev
```

Vite serves the SPA on `http://localhost:5173` with hot module replacement. The app proxies API calls to `http://localhost:5175/api` by default. While debugging UI flows:

- Inspect network requests via the browser DevTools console.
- Use Pinia DevTools (Vue DevTools extension) to watch auth state, repositories, and upload progress stores.
- Adjust the Axios instance in `src/api/http.ts` if you need to hit a remote backend or tunnel.
- Prefer a full IDE workflow? See [VS Code Debugging Guide](doc/vscode-debugging.md) for step-by-step backend and frontend breakpoint setup, including launch configurations and Chrome integration.

### 6. Exercise Dify integration (optional)

If you have Dify credentials, populate `DIFY_BASE_URL`, `DIFY_KB_ID`, and `DIFY_API_KEY` in `.env`, restart the backend, and re-upload a file. The backend streams uploads into Dify, records the returned `difyDocId`, and triggers an index refresh so the document becomes searchable. Failures are logged but do not block local persistence. Without credentials the system falls back to fuzzy matching over local filenames.

### 7. Run automated checks

Backend and frontend share a placeholder smoke test:

```bash
npm run test
```

Augment this script with unit or integration tests as implementation progresses. For frontend-only checks, run the same command within the `frontend/` directory once you add tooling (Vitest, Playwright, etc.).

### 8. Troubleshooting tips

- **Reset state quickly** – stop the servers, delete `uploads/` content, and restore `db.json` from a known snapshot.  
- **CORS errors** – ensure the backend is running before the frontend; the Express app already enables CORS for dev hosts.  
- **Port conflicts** – change Vite's port via `frontend/vite.config.ts` or set `VITE_PORT` in `frontend/.env`.  
- **Docker parity** – if something only fails in containers, run `docker compose up --build` to reproduce the stack with the same environment variables.

## Testing

Run the placeholder smoke test:

```bash
npm run test
```

Extend this command with real unit/integration tests once business logic is delivered.

## Build & production run

```bash
npm install
npm start
```

`npm start` boots the Express server with production settings. Add additional build steps (TypeScript compilation, bundling, etc.) when you introduce them.

## Docker workflow

The repository ships with Dockerfiles for the API and the frontend plus a Compose stack that wires them together.

```bash
# Ensure Dify variables exist in your shell or .env file
export DIFY_BASE_URL=https://api.dify.ai
export DIFY_KB_ID=your_kb_id
export DIFY_API_KEY=your_api_key

# Build and launch
docker compose up --build
```

Services start on:

- `http://localhost:5175` – Express API
- `http://localhost:5173` – Frontend (Nginx)

Database state (`db.json`) and uploaded files (`uploads/`) are bind-mounted to preserve data across container restarts. Shut everything down with `docker compose down`.

## Project structure

```
src/
  app.js              # Express app factory & shared middleware
  server.js           # HTTP entry point
  middlewares/        # Error/404/logging middleware
  routers/            # Route definitions (currently 501 stubs)
  services/           # Placeholder service implementations
uploads/              # File upload destination (kept empty via .gitkeep)
db.json               # LowDB datastore seeded with demo content
doc/                  # Architecture, API, and data model references
frontend/             # Vue 3 + Vite scaffold
```

Refer to the documents inside `doc/` for acceptance criteria, architecture notes, and upgrade guidance.


## Notes and Comments
👉 [WSL Node.js Guide](doc/wsl_node_nodemon_guide.md)

