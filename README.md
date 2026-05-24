# Freestyle

Open-source AI voice dictation for macOS. Hold a hotkey, speak, release — text appears at your cursor in whatever app is focused.

The product spec lives in [`specs/README.md`](./specs/README.md). The MVP technical spec lives in [`specs/spec.md`](./specs/spec.md).

## Prerequisites

- **macOS** (Apple Silicon or Intel)
- **Node.js 20+** — `node -v` to check. Install via [nvm](https://github.com/nvm-sh/nvm) or `brew install node`.
- **Xcode Command Line Tools** — `xcode-select --install`. Provides the C/C++ compiler used to build `whisper.cpp`.
- **CMake** — `brew install cmake`. Required to build `whisper.cpp` on first install (cloud-only mode does not need this).
- **Homebrew** — needed only for the two `brew install` lines above.

If you plan to use cloud mode only, CMake is optional — the postinstall step will warn and skip the local build.

## Repo layout

```
freestyle/
├── app/         # all source code, configs, package.json — everything you run
├── specs/       # product + technical specs
├── designs/     # brand and UI design files
├── README.md
├── CONTRIBUTING.md
├── ROADMAP.md
└── LICENSE
```

All commands below assume you're inside `app/`.

## Install

```bash
git clone <this-repo>
cd freestyle/app
npm install
```

What `npm install` does:

1. Installs Electron, React, Hono, the OpenAI SDK, `nodejs-whisper`, and `node-global-key-listener`.
2. Runs `scripts/fix-keylistener.mjs` — sets the `+x` bit on the bundled `MacKeyServer` binary (npm doesn't always preserve it).
3. Runs `scripts/build-whisper.mjs` — compiles `whisper.cpp` once via CMake into `node_modules/nodejs-whisper/cpp/whisper.cpp/build/bin/whisper-cli`. Takes ~30–60s the first time and is skipped on subsequent installs.

The Whisper **model** itself (`ggml-base.en.bin`, ~60 MB) is **not** bundled. It downloads on first local-mode use into `~/Library/Application Support/Freestyle/models/` and is symlinked into the directory `nodejs-whisper` expects.

## Run in dev

```bash
npm run dev
```

Launches `electron-vite dev`: the Hono backend boots on `127.0.0.1:<random-port>`, the renderer is served by Vite with HMR, the Electron window opens.

On first launch macOS will prompt for:

1. **Microphone** — granted automatically when you trigger recording.
2. **Accessibility** — required to paste into other apps via synthetic ⌘V. macOS opens System Settings → Privacy & Security → Accessibility; toggle Freestyle (or Electron in dev) on.

## Run the production build locally

```bash
npm run build
npm run start
```

`build` outputs to `out/` (main, preload, renderer). `start` runs `electron-vite preview`, which boots Electron against the bundled production code. Useful for verifying release behavior before packaging.

> One footgun: a microphone you pinned in dev is identified by an origin-salted device ID and won't carry over to the prod build's `file://` origin. Settings detects this on launch and resets the picker to the default mic.

## Use

1. Hotkey: the **Fn / 🌐 globe key** (bottom-left corner of the Mac keyboard). **Hold** to record, **release** to transcribe and paste at the cursor of whichever app was focused.
2. In the Freestyle window, pick a backend:
   - **Local** — runs `whisper.cpp` on-device. First use downloads the model.
   - **Cloud** — uses OpenAI. Paste your API key in the field (`sk-...`). Key is stored encrypted in the macOS Keychain via Electron's `safeStorage`.
3. If using Cloud, pick a model: `gpt-4o-mini-transcribe` (default), `gpt-4o-transcribe`, or `whisper-1`.
4. Microphone picker: pin to the built-in mic so Bluetooth headphones stay in high-quality A2DP mode.

### Free up the globe key

By default macOS uses the Fn / globe key for emoji picker, dictation, or input-source switching, which fires alongside Freestyle. Disable it:

**System Settings → Keyboard → "Press 🌐 key to" → Do Nothing**

(If you still want emoji on a shortcut, set it to a key combo instead in the same panel.)

## Scripts

| Command | What it does |
|---|---|
| `npm install` | Installs deps + runs both postinstall scripts (key listener chmod, whisper.cpp build). |
| `npm run dev` | Dev mode with HMR. |
| `npm run build` | Production bundle to `out/`. |
| `npm run start` | Preview the production bundle in Electron. |
| `npm run typecheck` | TS check both main + renderer. |
| `npm run typecheck:node` | TS check Electron main + backend only. |
| `npm run typecheck:web` | TS check renderer only. |

### Postinstall scripts

- `scripts/fix-keylistener.mjs` — sets `+x` on `node_modules/node-global-key-listener/bin/MacKeyServer`. Runs only on macOS; no-op on other platforms or if the file is already executable.
- `scripts/build-whisper.mjs` — runs `cmake -B build && cmake --build build --config Release` inside the vendored `whisper.cpp` source. No-op if `whisper-cli` already exists. Prints a clear warning if CMake isn't installed rather than failing the whole install.

Both run automatically via the `postinstall` hook in `package.json`. To re-run manually:

```bash
node scripts/fix-keylistener.mjs
node scripts/build-whisper.mjs
```

## Code layout (inside `app/`)

```
app/frontend/   Electron main process + React renderer
app/backend/    Hono HTTP API, STT adapters (local + OpenAI), settings, secrets
app/shared/     Types shared by both sides
app/scripts/    Postinstall helpers
```

## Troubleshooting

- **`nodejs-whisper` install fails or first transcribe returns "Cannot read properties of undefined (reading 'code')"** — CMake is not installed. Run `brew install cmake`, then `npm install` again so the postinstall builds `whisper.cpp`.
- **Hotkey does nothing** — Accessibility permission may not be granted. Open System Settings → Privacy & Security → Accessibility and enable the Freestyle (or Electron) entry.
- **Gatekeeper warning about `MacKeyServer`** — the bundled key-listener helper is unsigned. Click Allow in System Settings → Privacy & Security after the first prompt; the warning won't recur.
- **"chmod: Operation not permitted" on macOS Sequoia** — the postinstall handles this. If you see it anyway, run `node scripts/fix-keylistener.mjs` from inside `app/`.
- **Cloud mode says "API key not set"** — paste the key in the Settings panel and click Save. The field disappears after save and only the last 4 characters are shown.
- **Production build records no audio after working in dev** — Chromium device IDs are origin-salted; the saved ID from dev doesn't exist on the prod build's `file://` origin. Settings auto-clears the stale ID on launch; if it persists, delete `inputDeviceId` from `~/Library/Application Support/Electron/settings.json`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). The shipping plan is in [ROADMAP.md](./ROADMAP.md).

## License

[Apache 2.0](./LICENSE).
