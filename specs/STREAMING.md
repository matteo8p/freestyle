# Overview

Right now, the logic for transcription is that we have to record the entire audio. Once the audio is done recording, the audio is sent to OpenAI for transcription. The problem is that there is a delay in sending the audio file over and getting the transcription back.

# Solution

We want to figure out a way to stream the transcription and get the text back in real time. That way, when I release the hotkey for recording, we already have the text that is streamed, and we just paste what we have instead of waiting for a response back.

---

# Technical spec

## Scope

Streaming applies to **cloud mode only** for v1. Local `whisper.cpp` streaming is a separate, larger piece of work (see "Out of scope" below). When cloud mode + streaming are active and the user releases Fn, the paste should fire within ~150 ms of release in the common case, vs. the ~1–3 s tail we have today with batch upload.

We keep batch mode as the **fallback path** for: streaming disabled in settings, local backend, network error mid-stream, or OpenAI rejecting the session.

## Architecture summary

```
┌────────────────┐   WS    ┌──────────────────┐   WS    ┌────────────────┐
│   Renderer     │ ─────── │   Hono backend   │ ─────── │  OpenAI        │
│  (AudioWorklet │  audio  │  /stream         │  audio  │  Realtime      │
│   → PCM 16k)   │ ──────► │  proxy + adapter │ ──────► │  Transcription │
│                │         │                  │         │  (gpt-4o-mini- │
│  text deltas   │ ◄────── │  text deltas     │ ◄────── │   transcribe)  │
└────────────────┘ ─event─►└──────────────────┘ ─event─►└────────────────┘
    paste(text)              session lifecycle            partial/final
```

The renderer talks **only** to our backend; the backend holds the OpenAI key (already encrypted via `safeStorage`) and translates between our internal wire protocol and OpenAI's Realtime API.

## Audio capture (renderer)

Replace `MediaRecorder` with an `AudioContext` + `AudioWorkletNode` pipeline so we can emit raw PCM as it's captured rather than waiting for a finalized blob.

- `frontend/renderer/lib/pcm-worklet.ts` — `AudioWorkletProcessor` that:
  - Receives 128-sample blocks from the input (Chromium's fixed worklet quantum).
  - Downsamples from the device sample rate (typically 48 kHz) to **16 kHz mono** via a simple polyphase / linear-interp resampler. Speech doesn't need a high-quality filter here.
  - Buffers into ~80 ms chunks (1280 samples) and posts each as an `Int16Array` to the main thread.
- `frontend/renderer/lib/streamer.ts` — orchestrates:
  - Opens the WebSocket to `ws://127.0.0.1:<port>/stream` with the existing `x-freestyle-token` (sent as a query param since browsers don't allow custom WS headers).
  - Forwards each PCM chunk as a **binary** WS message.
  - Receives **JSON** text-event messages and surfaces them to `App.tsx` via callbacks (`onPartial`, `onFinal`, `onError`).

Bandwidth: 16 kHz × 16-bit mono = 32 KB/s. Per 80 ms chunk = 2.56 KB. Negligible.

## Wire protocol — renderer ↔ backend

WebSocket, single channel. Binary frames carry audio; text frames carry JSON events.

| Direction | Type | Payload | Meaning |
|---|---|---|---|
| → server | binary | raw `Int16Array` PCM, 16 kHz mono | append to input buffer |
| → server | text JSON | `{ "type": "commit" }` | hotkey released; flush + request final |
| → server | text JSON | `{ "type": "cancel" }` | discard session without finalizing |
| ← client | text JSON | `{ "type": "session.ready", "model": "..." }` | OpenAI session opened, safe to start sending audio |
| ← client | text JSON | `{ "type": "partial", "text": "<so-far>" }` | rolling transcript update (overwrite previous partial) |
| ← client | text JSON | `{ "type": "final", "text": "<definitive>" }` | finalized transcript; renderer pastes this |
| ← client | text JSON | `{ "type": "error", "message": "..." }` | unrecoverable; fall back to batch mode |

A session is the lifetime of one WebSocket. The connection opens on `hotkey:down`, closes after `final` / `error` / `cancel`.

## Backend ↔ OpenAI Realtime mapping

OpenAI provides a **transcription-only Realtime session** (the lightweight cousin of the full multimodal Realtime API) intended exactly for STT streaming. The backend uses the same OpenAI key the user already pasted in Settings.

| Our event | OpenAI Realtime event |
|---|---|
| binary PCM chunk → backend | `input_audio_buffer.append` with `audio: <base64 of chunk>` |
| `commit` → backend | `input_audio_buffer.commit` then await `conversation.item.input_audio_transcription.completed` |
| `cancel` → backend | close WS without commit |
| `session.ready` → renderer | `session.created` from OpenAI |
| `partial` → renderer | `conversation.item.input_audio_transcription.delta` (concatenated rolling text) |
| `final` → renderer | `conversation.item.input_audio_transcription.completed` |
| `error` → renderer | any OpenAI `error` event, or our own surfaced exception |

**Session config sent on open:**

```json
{
  "type": "transcription_session.update",
  "session": {
    "input_audio_format": "pcm16",
    "input_audio_transcription": {
      "model": "gpt-4o-mini-transcribe"
    },
    "turn_detection": null
  }
}
```

`turn_detection: null` disables server-side VAD — we use hotkey release as the explicit boundary, which is more predictable than VAD for push-to-talk dictation.

The cloud model is whatever the user selected in Settings (`gpt-4o-mini-transcribe` / `gpt-4o-transcribe`). `whisper-1` is **not** streamable; if the user has it selected, we fall back to batch mode.

## Backend implementation

New files:

- `backend/routes/stream.ts` — upgrades HTTP to WebSocket via `@hono/node-ws`. On connect: validate token, open an outbound WS to OpenAI (`wss://api.openai.com/v1/realtime?intent=transcription`), wire the two sockets together, and translate events per the table above.
- `backend/stt/openai-streaming.ts` — pure adapter: takes an upstream client WS and exposes typed callbacks (`onPartial`, `onFinal`, `onError`, `sendAudio`, `commit`, `close`). Keeps the Realtime protocol details contained.

Existing files updated:

- `backend/router.ts` — mount the WS upgrade route. Auth middleware needs to accept the token via `?token=` for the WS handshake.
- `backend/routes/transcribe.ts` — unchanged; remains the fallback path.

## Renderer integration

`App.tsx` decides which path to take in `onStart`:

```
if (cloud && streamingEnabled && cloudModel !== 'whisper-1') → Streamer
else                                                          → Recorder (existing batch path)
```

State while streaming:

- `partialText`: rolling string, updated on every `partial` event. **Display-only** — used optionally to show live preview text in the pill so the user knows transcription is happening. Never written to the clipboard, never pasted.
- `finalText`: set on `final` event. **This is the only value that gets pasted.**

On `hotkey:up`:

1. AudioWorklet stops emitting; WS sends `{ "type": "commit" }`.
2. Pill enters `finalizing` state (so the user has feedback that something's happening).
3. Wait for the `final` event. **Only the `final` text is ever pasted.** Partial deltas exist for live UI preview only — never for paste.
4. On `final` → paste `final.text`, close WS.
5. If no `final` after **5 s** (hard upper bound, indicates a backend or upstream problem) → surface an error in the pill and fall back to the batch path for this utterance by re-uploading the buffered PCM as WAV to `/transcribe`. Pasting partial text is never an option.

The streaming win comes from the fact that finalization is fast: by the time the user releases Fn, the model has already consumed nearly all of the audio. The `final` event typically arrives 100–300 ms after `commit` — much faster than the current batch path (upload-then-transcribe-then-respond). We're trading "almost-instant maybe-truncated" for "fast and definitely correct."

## Settings

Add to `Settings`:

```ts
interface Settings {
  …
  streaming: boolean   // default: true
}
```

Surfaced as a toggle in the Cloud section: "Stream transcript while speaking". Disabled / hidden when backend is `local` or `cloudModel === 'whisper-1'`.

## Fallback path

Streaming is a perf improvement, not a hard dependency. Any of the following silently falls back to batch:

- WebSocket open fails (e.g., network or expired token).
- OpenAI session errors before `session.ready`.
- Stream errors mid-session, or `final` doesn't arrive within 5 s — re-upload the buffered PCM as WAV to `/transcribe` for the same utterance. Partial deltas are discarded.
- User toggled streaming off.
- Cloud model is `whisper-1` or backend is `local`.

In the fallback, the recorder buffers PCM into a WAV like today and POSTs to `/transcribe`. No behavior change vs. current.

## Out of scope (deferred)

- **Local whisper.cpp streaming.** whisper.cpp supports streaming via its `stream` example (continuous decode with overlap windows), but integrating that cleanly — handling rebuffering, overlap stitching, and partial commits — is enough work to deserve its own spec. v1 of streaming = cloud only. Local stays batch.
- **Live preview of partial text in the floating pill.** Display-only; would never affect what gets pasted. Easy to add later once the data flow works.
- **Multi-language streaming.** OpenAI Realtime detects language per session. We don't add language selection in v1.
- **Resume / reconnect across transient network blips.** Not worth it for sub-second dictations.

## Risks / open questions

- **OpenAI Realtime cost model.** Streaming bills per audio-second on the input side and per token on the transcription output. We should expose an estimate-per-minute somewhere in Settings before we default streaming on — particularly for users who dictate continuously.
- **Hotkey release timing vs. tail audio.** If the user releases Fn mid-word, the last ~80 ms chunk may still be in flight. Our `commit` waits for the in-flight chunks to upload before issuing the OpenAI commit; this adds maybe one RTT. Acceptable.
- **WS auth via query string.** Required because browsers can't set custom WS headers. Token still has 24 bytes of entropy, and the server is loopback-only, so this is fine in practice.
- **AudioWorklet bundling.** Vite needs to know how to emit the worklet as a separate module loadable by `AudioWorklet.addModule()`. Confirm electron-vite's renderer config supports `?worker` / `?url` imports for this; if not, we ship the worklet as a static asset.

## Implementation order

1. AudioWorklet + PCM downsampler in renderer (no backend yet — verify chunks come out at 16 kHz).
2. Backend `/stream` WS endpoint that **echoes** chunks back (sanity check on transport).
3. OpenAI Realtime adapter; wire end-to-end with no UI changes (paste still happens on hotkey-up with whatever `partial` we have).
4. 500 ms commit-wait + final-event polish.
5. Settings toggle + fallback wiring.
6. (Stretch) Live partial-text preview in the pill.
