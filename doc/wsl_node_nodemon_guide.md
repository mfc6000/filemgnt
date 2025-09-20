## 🚀 Prevent Node.js Service Auto-Restart in WSL (nodemon)

When running a project in `/mnt/c/...` (Windows mounted directory) under WSL, file system events can be noisy, causing `nodemon` to repeatedly **restart**.  
The following configuration helps stabilize nodemon in this environment.

### 1) Create `nodemon.json` in project root

```json
{
  "watch": ["src"],
  "ext": "js,json",
  "ignore": [
    "node_modules/**",
    ".git/**",
    "dist/**",
    "build/**",
    ".next/**",
    "coverage/**",
    "logs/**",
    "tmp/**",
    "*.log",
    "**/*.swp",
    "**/*.tmp",
    "**/.#*",
    "**/~*"
  ],
  "delay": "400",
  "legacyWatch": true
}
```

- `watch`: only watch the source directory to avoid unnecessary restarts
- `ignore`: ignore logs, build outputs, temporary files
- `delay`: debounce rapid file change events
- `legacyWatch: true`: enable polling mode, avoids inotify issues under `/mnt/c`

### 2) Update `package.json` script

```json
{
  "scripts": {
    "dev": "nodemon src/server.js"
  }
}
```

> `nodemon` will automatically read configuration from `nodemon.json`.

### 3) (Optional) Force polling via environment variables

Add these lines to `~/.bashrc` or `~/.zshrc`:

```bash
export CHOKIDAR_USEPOLLING=1
export CHOKIDAR_INTERVAL=1000   # polling interval in ms (tune between 500–1500)
```

### 4) (Optional) VS Code exclude noisy directories

Create `.vscode/settings.json` in project root:

```json
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.next/**": true
  },
  "search.exclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.next/**": true
  }
}
```

### 5) Server binding recommendation

- For local-only development (IPv4 only):
  ```js
  app.listen(process.env.PORT || 3000, '127.0.0.1');
  ```
- For host/container access:
  ```js
  app.listen(process.env.PORT || 3000, '0.0.0.0');
  ```

### 6) Verify configuration

```bash
npx nodemon --dump      # show final config
ls -lt                  # check if any files are constantly updated
```

### 7) Troubleshooting

- Still restarting → add build output directories (`dist/`, `.next/`) to `ignore`
- TypeScript/transpiler writing into `src/` → adjust output directory or expand `ignore`
- Excessive events in `/mnt/c` → increase `"delay"` or `"CHOKIDAR_INTERVAL"`

> Note: Best practice is to develop in native WSL directories (e.g. `~/project`) to reduce file event noise, but the above settings make `/mnt/c` workable.
