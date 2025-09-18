# File Management System Backend Scaffold

This repository contains a Node.js + Express scaffold for the file management system described in the architecture documents. Business logic is intentionally left unimplemented to focus on project structure and bootstrapping.

## Prerequisites

- Node.js 18+
- npm 9+

## Environment variables

Create a `.env` file (or copy from `.env.example`) with the following keys:

```
PORT=3000
DIFY_API_BASE=https://api.dify.ai
DIFY_API_KEY=your_dify_api_key_here
```

`PORT` controls the HTTP port, and the Dify variables will be used once the integration is implemented.

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
