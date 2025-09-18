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

## Development workflow

1. Install dependencies: `npm install`
2. Launch the backend with hot reload: `npm run dev`
3. (Optional) Setup the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Visit `http://localhost:5175` for the API and `http://localhost:5173` for the Vite dev server.

> ℹ️ All backend endpoints currently respond with `501 Not Implemented` stubs. Replace the service layers under `src/services/` as features roll in.

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
