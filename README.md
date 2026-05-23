# Freestyle

Open-source AI voice dictation for macOS. Hold a hotkey, speak, release — text appears at your cursor in whatever app is focused.

The product spec lives in [`specs/README.md`](./specs/README.md). The MVP technical spec lives in [`specs/spec.md`](./specs/spec.md).

## Prerequisites

- **macOS** (Apple Silicon or Intel)
- **Node.js 20+** — `node -v` to check. Install via [nvm](https://github.com/nvm-sh/nvm) or `brew install node`.
- **Xcode Command Line Tools** — `xcode-select --install`. Required because `nodejs-whisper` compiles `whisper.cpp` from source on first install.

## Install

```bash
git clone <this-repo>
cd freestyle
npm install
```

The install step pulls Electron, React, Hono, the OpenAI SDK, and `nodejs-whisper`. The whisper model itself (`ggml-base.en.bin`, ~60 MB) is **not** bundled — it downloads on first local-mode transcription into `~/Library/Application Support/Freestyle/models/`.

## Run in dev

```bash
npm run dev
```

This launches `electron-vite dev`: the Hono backend boots on `127.0.0.1:<random-port>`, the renderer hot-reloads over Vite, and the Electron window opens.

On first launch macOS will prompt for:

1. **Microphone** — granted automatically when you trigger recording.
2. **Accessibility** — required to paste into other apps via synthetic ⌘V. macOS opens System Settings → Privacy & Security → Accessibility; toggle Freestyle (or Electron in dev) on.

## Use

1. Hotkey: the **Fn / 🌐 globe key** (bottom-left corner of the Mac keyboard). **Hold** to record, **release** to transcribe and paste at the cursor of whichever app was focused.
2. In the Freestyle window, pick a backend:
   - **Local** — runs `whisper.cpp` on-device. First use downloads the model.
   - **Cloud** — uses OpenAI. Paste your API key in the field (`sk-...`). Key is stored encrypted in the macOS Keychain via Electron's `safeStorage`.
3. If using Cloud, pick a model: `gpt-4o-mini-transcribe` (default), `gpt-4o-transcribe`, or `whisper-1`.

### Free up the globe key

By default macOS uses the Fn / globe key for emoji picker, dictation, or input-source switching, which fires alongside Freestyle. Disable it:

**System Settings → Keyboard → "Press 🌐 key to" → Do Nothing**

(If you still want emoji on a shortcut, set it to a key combo instead in the same panel.)

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev mode with HMR. |
| `npm run build` | Production bundle to `out/`. |
| `npm run start` | Preview the production bundle. |
| `npm run typecheck` | Run TS on both main and renderer. |

## Project layout

```
frontend/     Electron main process + React renderer
backend/      Hono HTTP API, STT adapters (local + OpenAI), settings, secrets
shared/       Types shared by both sides
specs/        Product spec and MVP technical spec
```

## Troubleshooting

- **`nodejs-whisper` install fails** — make sure Xcode CLT is installed (`xcode-select --install`). The package builds `whisper.cpp` from source.
- **Hotkey does nothing** — Accessibility permission may not be granted. Open System Settings → Privacy & Security → Accessibility and enable the Freestyle (or Electron) entry.
- **Cloud mode says "API key not set"** — paste the key in the Settings panel and click Save. The field disappears after save and only the last 4 characters are shown.
