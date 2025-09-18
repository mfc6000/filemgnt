# File Management System Backend Scaffold

This repository contains a Node.js + Express scaffold for the file management system described in the architecture documents. Business logic is intentionally left unimplemented to focus on project structure and bootstrapping.

## Prerequisites

- Node.js 18+
- npm 9+

## Environment variables

Create a `.env` file (or copy from `.env.example`) with the following keys:

```
PORT=3000
DIFY_BASE_URL=https://api.dify.ai
DIFY_KB_ID=your_knowledge_base_id
DIFY_API_KEY=your_dify_api_key_here
```

`PORT` controls the HTTP port. The Dify variables configure the knowledge-base API endpoint, the knowledge base to sync files
into, and the API key used for authentication. They are required once the Dify integration is active.

## Installation

```bash
npm install
```

## Available scripts

- `npm run dev` – start the server with hot-reload (uses `nodemon`).
- `npm start` – start the production server with Node.js.

## Development

```bash
npm run dev
```

The server will start on the configured `PORT` (defaults to `3000`). All routes return `501 Not Implemented` until the business logic is added.

## Docker

You can run the scaffolded backend and the Vue frontend together with Docker. The Compose stack builds two images:

- `server`: Node.js Express API (exposes port `5175`)
- `frontend`: Vite-built static assets served by Nginx (exposes port `5173`)

Before building, ensure any Dify configuration is exported in your shell so Compose can forward it to the server container:

```bash
export DIFY_BASE_URL=https://api.dify.ai
export DIFY_KB_ID=your_kb_id
export DIFY_API_KEY=your_api_key
```

Then build and start the services:

```bash
docker compose up --build
```

The API becomes available on `http://localhost:5175` and the frontend on `http://localhost:5173`. Database state (`db.json`) and uploaded files (`uploads/`) are stored on the host via bind mounts so that data persists across container restarts.

## Project structure

```
src/
  app.js              # Express app factory, shared middleware
  server.js           # Entrypoint that boots the HTTP server
  middlewares/        # Error handler, 404 handler, request logger
  routers/            # Route definitions (handlers currently return 501)
  services/           # Placeholder service modules to be implemented
uploads/              # File upload destination (kept empty via .gitkeep)
db.json               # LowDB bootstrap data store
```

## Testing the scaffold

With dependencies installed you can verify the server boots:

```bash
npm start
```

Then send requests (e.g., via curl) to observe `501 Not Implemented` responses.
