# Freestyle MVP — Technical Spec

## Scope

A macOS desktop app that does one thing: hold a hotkey, speak, release — and the transcribed text is pasted at the cursor in whatever app is focused. No Polish layer, no Context Engine, no dictionary. The minimum settings UI: hotkey picker, transcription backend toggle (local vs. cloud), and an OpenAI API key field for cloud mode. The point is to prove the end-to-end loop works and to lay a real API seam we can grow.

---

## High-level architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Electron app                                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Renderer (React)                Main process (Node)         │
│  ──────────────────              ───────────────────         │
│  • Floating pill UI              • Global hotkey listener    │
│  • Settings panel        ───┐    • Hono HTTP server          │
│  • MediaRecorder            │      (127.0.0.1:<port>)        │
│  • Hono `hc` client      ───┼──▶ ┌────────────────────────┐  │
│                          ipc│    │ POST /transcribe       │  │
│  (hotkey events still       │    │ GET  /settings         │  │
│   over IPC since they're    │    │ PUT  /settings         │  │
│   driven by main)        ───┘    │ POST /api-key          │  │
│                                  │ GET  /models           │  │
│                                  │ GET  /health           │  │
│                                  └──────────┬─────────────┘  │
│                                             │                │
│                                  ┌──────────┴─────────┐      │
│                                  │   STT adapter      │      │
│                                  │   (interface)      │      │
│                                  └──┬──────────────┬──┘      │
│                                     │              │         │
│                            ┌────────┴───┐   ┌──────┴──────┐  │
│                            │ Whisper.cpp│   │ OpenAI API  │  │
│                            │  (local)   │   │ (cloud BYOK)│  │
│                            └────────────┘   └─────────────┘  │
│                                                              │
│                                  ┌────────────────────────┐  │
│                                  │ Paste pipeline         │  │
│                                  │ (clipboard + AppleScr.)│  │
│                                  └────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Two channels between renderer and main:**

- **IPC** — only for push events the main process originates: `hotkey:down`, `hotkey:up`, model download progress.
- **Hono HTTP API on localhost** — everything request/response: transcribe, settings, key management. This is the seam future features (Polish, Context, Command Mode) plug into as new endpoints; same shape today as if we later split the backend out of Electron entirely.

The flow on a single dictation:

1. User holds the global hotkey.
2. Main process emits `hotkey:down` over IPC. Renderer shows the pill and starts `MediaRecorder`.
3. User releases the hotkey. Main emits `hotkey:up`.
4. Renderer finalizes the recording, converts to 16 kHz mono PCM, and `POST`s it to `/transcribe` (multipart, with the user's chosen backend in a header or query param).
5. The Hono handler picks the STT adapter, transcribes, returns `{ text, durationMs }`.
6. Renderer hands the text back to main over IPC (`paste:do`). Main copies to clipboard and fires the synthetic ⌘V into the previously-focused app.
7. Renderer hides the pill.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| App shell | **Electron** | Native macOS integration (global shortcuts, clipboard, focused-app awareness), React-friendly, fast to ship. MVP.md called for it. |
| Language | **TypeScript** | Both main and renderer. |
| UI | **React 18 + Vite** | Standard. Vite for fast renderer dev loop. |
| Styling | **Tailwind CSS** | Minimal UI, but fast to style the pill. |
| **Backend (in main process)** | **[Hono](https://hono.dev) on Node** | Tiny, fast, fully typed. Runs as an HTTP server bound to `127.0.0.1` on a random free port chosen at launch. Renderer hits it with Hono's typed `hc` client, so endpoints are end-to-end type-safe. Sets us up for adding `/polish`, `/commands`, `/dictionary`, etc. without restructuring. |
| Audio capture | **`MediaRecorder` (Web Audio API)** in the renderer | No native deps. Output is downsampled to 16 kHz mono PCM before upload. |
| **STT — local** | **whisper.cpp** via [`smart-whisper`](https://github.com/JigsawStack/smart-whisper) or [`nodejs-whisper`](https://github.com/ChetanXpro/nodejs-whisper) | Runs locally, no API key, no network. CPU + Metal acceleration on Apple Silicon. |
| **STT — cloud** | **OpenAI `gpt-4o-mini-transcribe`** (default), with `gpt-4o-transcribe` and `whisper-1` as fallback options | Newer, faster, and cheaper than `whisper-1`. User supplies their own API key (BYOK). |
| **Secret storage** | **Electron `safeStorage`** (macOS Keychain via `Security.framework`) | API keys encrypted at rest. Never written in plaintext, never logged, never sent over IPC in cleartext after first set. |
| Hotkey | **`electron.globalShortcut`** | Built in. `Fn`-key capture is tricky on macOS — MVP uses `Cmd+Shift+Space` as default. |
| Clipboard | **`electron.clipboard`** | Built in. Preserves and restores the prior clipboard contents. |
| Synthetic paste | **AppleScript via `child_process`** (`osascript -e 'tell application "System Events" to keystroke "v" using command down'`) | Simplest, no native modules. Requires Accessibility permission. |
| Packaging | **`electron-builder`** | Produces a signed `.dmg` for macOS. |

---

## Models

The MVP ships two backends and lets the user toggle between them in Settings.

### Local — whisper.cpp

| Model | Size | Notes |
|---|---|---|
| **Whisper Base (English, quantized q5_1)** | ~60 MB | Default. Best speed/accuracy tradeoff. Loads in <1s on Apple Silicon, transcribes a 10s clip in ~1-2s. |

Downloaded on first launch from Hugging Face (`ggerganov/whisper.cpp` repo) into `~/Library/Application Support/Freestyle/models/` and cached. No bundled weights in the app binary. Larger Whisper variants are out of scope for MVP.

### Cloud — OpenAI (BYOK)

| Model | Notes |
|---|---|
| **`gpt-4o-mini-transcribe`** | Default cloud model. Cheaper and faster than `whisper-1`, with comparable accuracy for everyday dictation. |
| `gpt-4o-transcribe` | Higher-quality option, available in the dropdown. |
| `whisper-1` | Compatibility/fallback option. |

Requires the user to paste their OpenAI API key in Settings. The key is encrypted via `safeStorage` and stored at `~/Library/Application Support/Freestyle/secrets.bin`. The cloud adapter calls `POST https://api.openai.com/v1/audio/transcriptions` with the recorded audio as multipart.

### Backend selection

A single setting — `transcription.backend = "local" | "cloud"` — picks which STT adapter the `/transcribe` endpoint dispatches to. Switching is instant; no restart. If "cloud" is selected and no API key is set, the pill UI shows a clear error and the request is rejected before any audio leaves the renderer.

---

## Project layout

Two clearly-separated top-level folders: **`frontend/`** is everything that makes Freestyle a macOS desktop app (Electron main process + React renderer + preload). **`backend/`** is the Hono API, STT adapters, and supporting libs. Today the backend is booted from the Electron main process and runs in the same Node runtime; tomorrow `backend/` could be lifted out into its own process or even a hosted service with no source changes on either side.

```
freestyle/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
│
├── frontend/                       # Electron app shell + React UI
│   ├── main/                       # Electron main process (Node)
│   │   ├── index.ts                # Entry — boots backend, creates windows
│   │   ├── hotkey.ts               # Global shortcut registration
│   │   ├── paste.ts                # Clipboard save/restore + AppleScript ⌘V
│   │   ├── ipc.ts                  # IPC channel definitions
│   │   └── preload.ts              # Injects backend baseUrl + auth token
│   └── renderer/                   # React UI
│       ├── index.html
│       ├── main.tsx                # React entry
│       ├── App.tsx
│       ├── api.ts                  # Hono `hc` typed client (imports backend router type)
│       ├── components/
│       │   ├── Pill.tsx            # Floating recording indicator
│       │   ├── Settings.tsx        # Hotkey, backend toggle, model status
│       │   └── ApiKeyField.tsx     # Paste/save/clear OpenAI API key
│       └── lib/
│           └── recorder.ts         # MediaRecorder wrapper → 16 kHz PCM
│
├── backend/                        # Hono HTTP API (runs in main process today)
│   ├── index.ts                    # Server bootstrap + free-port selection
│   ├── router.ts                   # Route table; type exported for hc client
│   ├── routes/
│   │   ├── transcribe.ts           # POST /transcribe → dispatches to STT adapter
│   │   ├── settings.ts             # GET/PUT /settings
│   │   ├── api-key.ts              # POST/DELETE /api-key, GET /api-key/status
│   │   ├── models.ts               # GET /models (local download state, cloud opts)
│   │   └── health.ts               # GET /health
│   ├── stt/                        # STT adapter layer
│   │   ├── adapter.ts              # Interface: transcribe(pcm) => Promise<string>
│   │   ├── local-whisper.ts        # whisper.cpp impl
│   │   └── openai.ts               # gpt-4o-mini-transcribe / gpt-4o-transcribe / whisper-1
│   └── lib/
│       ├── secrets.ts              # safeStorage wrapper for API keys
│       ├── settings-store.ts       # JSON-backed settings persistence
│       └── model-manager.ts        # First-run whisper.cpp model download
│
├── shared/                         # Types used by both sides
│   └── types.ts                    # Settings shape, IPC payloads, API DTOs
│
└── resources/                      # Icons, tray assets, .icns
```

**Frontend → backend communication** is HTTP only (the typed `hc` client in `frontend/renderer/api.ts` hits the Hono server). **Frontend main ↔ frontend renderer** uses IPC for the push events listed below. **Backend never imports from `frontend/`** — that's what keeps the seam clean. The only Electron-specific dependency inside `backend/` is `safeStorage` in `lib/secrets.ts`; if the backend is ever extracted, that one file swaps for a different secret store.

Paste is intentionally not a backend endpoint: it requires Electron's main-process access to the previously-focused window. The renderer calls `/transcribe`, receives text, then sends `paste:do` over IPC to `frontend/main` which handles clipboard + AppleScript.

---

## API surface

### HTTP (Hono, `127.0.0.1:<port>`)

Auth is implicit — the server only binds to loopback and a per-launch token is injected into the renderer via Electron `preload` to defeat any other localhost process.

| Method | Path | Request | Response |
|---|---|---|---|
| `POST` | `/transcribe` | `multipart/form-data` with `audio` (16 kHz mono PCM/WAV); optional `?backend=local\|cloud` override | `{ text: string, durationMs: number, backend: "local" \| "cloud", model: string }` |
| `GET` | `/settings` | — | `{ hotkey: string, backend: "local" \| "cloud", cloudModel: string }` |
| `PUT` | `/settings` | partial settings JSON | updated settings |
| `GET` | `/api-key/status` | — | `{ openai: { present: boolean, lastFour?: string } }` |
| `POST` | `/api-key` | `{ provider: "openai", key: string }` | `204` |
| `DELETE` | `/api-key` | `{ provider: "openai" }` | `204` |
| `GET` | `/models` | — | `{ local: { downloaded: boolean, downloadingPercent?: number }, cloudOptions: string[] }` |
| `GET` | `/health` | — | `{ ok: true }` |

Paste is **not** a backend endpoint — see "Project layout" note. The renderer triggers paste over IPC after `/transcribe` returns.

The renderer imports the router type and instantiates Hono's `hc<typeof router>(baseUrl)` for end-to-end typed calls — no hand-maintained client.

### IPC (push events only)

| Channel | Direction | Payload |
|---|---|---|
| `hotkey:down` | main → renderer | `{}` — start recording |
| `hotkey:up` | main → renderer | `{}` — stop recording |
| `model:download-progress` | main → renderer | `{ percent: number }` |
| `server:ready` | main → renderer | `{ baseUrl: string, token: string }` — delivered via `preload` before first render |
| `paste:do` | renderer → main | `{ text: string }` — main copies to clipboard and fires synthetic ⌘V into the previously-focused app |

---

## Settings UI (MVP)

A single panel reachable from the menu bar / tray icon:

- **Hotkey** — accelerator picker (default `Cmd+Shift+Space`).
- **Transcription backend** — radio: Local (whisper.cpp) / Cloud (OpenAI).
- **Local model status** — "Downloaded" / "Downloading X%" / "Re-download".
- **OpenAI API key** — paste field. Shows `sk-…abcd` (last 4 only) once saved, with **Replace** and **Clear** buttons. On save: `POST /api-key` → encrypted with `safeStorage` → written to `secrets.bin`. Never displayed in full again, never returned by any GET endpoint.
- **Cloud model** — dropdown: `gpt-4o-mini-transcribe` (default) / `gpt-4o-transcribe` / `whisper-1`. Disabled while backend = Local.

---

## Permissions

The app requests two macOS permissions on first launch:

1. **Microphone** — for audio capture. Triggered automatically by `MediaRecorder`.
2. **Accessibility** — required to send the synthetic ⌘V via AppleScript into another app. App shows a dialog with a "Open System Settings" button if not granted.

Both are required for the core loop to work. The app refuses to dictate if either is missing and surfaces a clear error in the pill UI.

---

## Out of scope for MVP

Everything in the README feature spec beyond the core loop:

- Polish (LLM cleanup) — raw transcription output only
- Context Engine
- Command Mode
- Personal dictionary, snippets, styles
- Whisper mode (literal)
- Developer mode
- Scratchpad
- Larger Whisper variants, Parakeet, additional cloud STT providers (Deepgram, AssemblyAI)
- Windows and Linux

These are not blocked by MVP choices — the Hono backend, STT adapter interface, and paste pipeline are the seams where each post-MVP feature will plug in as new endpoints or new adapters.

---

## Open questions

- **Hotkey choice.** `Fn` is the natural default but Electron can't intercept it on macOS without a native helper. `Cmd+Shift+Space` for MVP; revisit with a native module post-MVP.
- **Audio format from `MediaRecorder`.** Default WebM/Opus needs decoding before whisper.cpp accepts it. Either pipe through `ffmpeg` (extra dep) or use a `ScriptProcessorNode`/`AudioWorklet` to emit raw 16 kHz PCM directly. The latter is leaner; recommended.
- **Whisper bindings choice.** `smart-whisper` vs `nodejs-whisper` vs a thin custom binding over `whisper.cpp`. Pick after a 30-minute spike on each.
