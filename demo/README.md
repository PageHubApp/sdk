# SDK Demo

Interactive demo showing @pagehub/sdk embedded as a white-label page builder.

## Run it

```bash
# From packages/sdk/
pnpm run build    # build the SDK first
pnpm run demo     # opens http://localhost:4400/demo/
```

## What it shows

- **Vanilla JS integration** — no React app, just `PageHub.init()` into a `<div>`
- **Save/load** with an in-memory mock database
- **Export JSON** — get the raw CraftJS state
- **Toggle edit/view** — switch between editor and read-only mode
- **Configure** — change theme colors, toggle features, connect to a real API
- **Load from API** — fetch a real site or template from a PageHub backend

## How it works

`index.html` loads React from CDN, the UMD build from `../dist/`, and `demo.js` which calls `PageHub.init()` with callbacks. The editor state is stored in a `mockDB` object — replace the callbacks with real API calls for production.

## URL params

- `?site=<id>` — auto-load a template by slug (e.g. `?site=bold-digital-agency`)
- `?draft=<draftId>` — auto-load a site by draft ID (requires API key in config)
