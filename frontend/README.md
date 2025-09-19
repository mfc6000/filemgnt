# File Management Frontend

Vue 3 + Vite + TypeScript scaffold for the file management system UI.

## Prerequisites
- Node.js >= 18
- pnpm, npm, or yarn (examples below use npm)

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

The dev server listens on [http://localhost:5173](http://localhost:5173) and proxies API calls to `http://localhost:3000`.

## Available Scripts

- `npm run dev` – start the Vite development server with hot module replacement.
- `npm run build` – type-check with `tsc` and build the production bundle.
- `npm run preview` – preview the production build locally.

## Project Structure

```
frontend/
├── src/
│   ├── api/         # Axios instances and request helpers
│   ├── components/  # Reusable UI building blocks
│   ├── router/      # Vue Router configuration
│   ├── store/       # Pinia stores
│   ├── views/       # Route-level views
│   ├── App.vue      # Root component with layout shell
│   └── main.ts      # Application entry point
└── vite.config.ts   # Vite configuration with backend proxy
```

## Next Steps
- Implement authentication views and tie into the backend mock auth.
- Build repository/file management pages powered by real APIs.
- Integrate Dify search UX once backend endpoints are ready.
