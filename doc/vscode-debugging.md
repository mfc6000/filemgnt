# VS Code Debugging Guide

This guide explains how to debug both the Express backend and the Vue 3 frontend with Visual Studio Code. The configuration works cross-platform and assumes you already installed all project dependencies with `npm install` inside the repository root and inside `frontend/`.

## Prerequisites

- VS Code 1.70+
- Node.js 18+
- Recommended extensions:
  - **ESLint** (dbaeumer.vscode-eslint)
  - **Volar** (Vue language tools) with Take Over Mode enabled
  - **Pinia** DevTools (optional, for state inspection)
  - **Docker** (ms-azuretools.vscode-docker) if you plan to run containers

All commands below are relative to the repository root unless noted otherwise.

## Workspace setup

1. Open the repository root (`filemgnt/`) in VS Code (`File → Open Folder…`).
2. Install recommended extensions when prompted.
3. Allow VS Code to create a `.vscode` folder for debug assets. (The folder is ignored by Git.)

## Backend debugging (Node.js + Express)

### Launch configuration

Create `.vscode/launch.json` with the following configuration:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "API: Dev (Nodemon)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "restart": true,
      "runtimeVersion": "18",
      "envFile": "${workspaceFolder}/.env",
      "skipFiles": ["<node_internals>/**"],
      "outputCapture": "std"
    },
    {
      "name": "API: Attach to running server",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "address": "localhost",
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

- **API: Dev (Nodemon)** boots the Express server via `npm run dev` and attaches the debugger automatically.
- **API: Attach to running server** is useful when you start the backend manually with `NODE_OPTIONS='--inspect=9229' npm run dev` and want to hook VS Code to the existing process.

### Debug steps

1. Set breakpoints inside `src/routers/**`, `src/services/**`, or middleware files.
2. Select `API: Dev (Nodemon)` from the Run and Debug panel and press **F5**.
3. Interact with the API (curl/Postman/frontend). VS Code pauses on breakpoints, lets you inspect locals, evaluate expressions, and step through code.
4. Hot reload works because Nodemon restarts on file changes. The debugger automatically re-attaches.

### Testing helpers

- Use the **Debug Console** to run small snippets (e.g., `await someAsyncFunction()` when paused).
- Add watch expressions for frequently inspected variables (e.g., `req.user`, `res.locals`).
- Combine with VS Code's **npm scripts** view to trigger `npm run test` without leaving the editor.

## Frontend debugging (Vue 3 + Vite)

### Launch configuration

Inside `.vscode/launch.json`, add the following Chrome attach configuration:

```json
{
  "name": "Frontend: Chrome",
  "type": "pwa-chrome",
  "request": "launch",
  "url": "http://localhost:5173",
  "webRoot": "${workspaceFolder}/frontend/src",
  "preLaunchTask": "frontend:dev"
}
```

This configuration launches a Chromium-based browser controlled by VS Code and maps source files back to the Vue single-file components.

### Tasks for Vite server

Create `.vscode/tasks.json` to start the Vite dev server automatically when debugging the frontend:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "frontend:dev",
      "type": "npm",
      "script": "dev",
      "path": "frontend",
      "problemMatcher": []
    }
  ]
}
```

The `preLaunchTask` from the launch configuration ensures Vite is running before the debugger opens the browser.

### Debug steps

1. Open `Run and Debug` (**Ctrl+Shift+D** / **Cmd+Shift+D**).
2. Choose `Frontend: Chrome` and press **F5**.
3. VS Code starts `npm run dev` inside `frontend/`, opens a browser, and connects to it.
4. Set breakpoints directly inside `.vue` files. Ensure Volar is installed and in Take Over Mode for best template debugging support.
5. Use the **Vue DevTools** browser extension alongside VS Code for Pinia state inspection and component hierarchies.

### Mobile viewport tips

- Toggle Chrome DevTools (**Ctrl+Shift+I** / **Cmd+Opt+I**) and enable device emulation to test mobile layouts.
- Combine with responsive CSS utilities or Arco's Grid system to validate breakpoints.

## Full-stack debugging workflows

- **Parallel sessions** – run the backend debug configuration first, then launch the frontend debugger. Both sessions can run simultaneously.
- **Shared environment** – keep `.env` and `frontend/.env` in sync. VS Code automatically reloads environment variables when you restart the debugger.
- **HTTP client inside VS Code** – use the built-in REST Client extension (`humao.rest-client`) to send requests while breakpoints are active.
- **Docker containers** – if you debug inside Docker, expose the inspector port (`--inspect=0.0.0.0:9229`) and set `address` to `localhost` or `127.0.0.1` on the VS Code attach configuration forwarded via Docker extensions.

## Troubleshooting

| Symptom                                   | Fix                                                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Breakpoints are grey / unbound            | Ensure the server is started through VS Code or with `--inspect`. Check the `webRoot` path matches `frontend/src`.    |
| Nodemon restarts too frequently           | Increase the debounce in `nodemon.json` or exclude directories like `uploads/`.                                       |
| TypeScript breakpoints off by a few lines | Make sure source maps are enabled (Vite does this automatically in dev). Clear the browser cache if the map is stale. |
| Chrome instance already running           | Close existing debug sessions or set `"url": "about:blank"` and open the Vite URL manually.                           |
| `preLaunchTask` never finishes            | Ensure `npm install` completed successfully in `frontend/`. The task waits for Vite to print the dev server banner.   |

## Next steps

- Check generated `.vscode` files into your personal workspace only; the repository `.gitignore` keeps them out of Git.
- Customize configurations for unit tests (e.g., Vitest, Jest) once they are added.
- If your team uses Remote Containers or GitHub Codespaces, reuse these launch configurations by placing them under `.devcontainer` and updating paths accordingly.

Happy debugging!
