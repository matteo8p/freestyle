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

`MediaRecorder` is replaced (for the streaming path) with an `AudioContext` + `AudioWorkletNode` pipeline so PCM can be emitted as it's captured rather than waiting for a finalized blob. `Recorder` stays in the codebase as the batch fallback.

Files:

- `frontend/renderer/lib/pcm-worklet.js` — `AudioWorkletProcessor` registered as `pcm-downsampler`. Receives 128-sample blocks (Chromium's fixed worklet quantum), linear-interp downsamples from the device sample rate (typically 48 kHz) to **16 kHz mono**, buffers into 1280-sample (80 ms) chunks, and `postMessage`s each as an `Int16Array`. Speech doesn't need a high-quality filter here.
- `frontend/renderer/lib/audio-ctx.ts` — module-level lazy `AudioContext` + worklet-module loader. One context is shared across all sessions (constructing one + `addModule` is slow enough that doing it per-utterance would add ~50–150 ms to first-word latency). Exposes `getAudioContext()` and `prewarmAudio()` (no-throw fire-and-forget).
- `frontend/renderer/lib/streamer.ts` — orchestrates one streaming session. Opens the WS, acquires the mic, builds the `source → AudioWorkletNode` graph, forwards chunks, collects events.
- `frontend/renderer/lib/wav.ts` — `pcm16ToWavBlob(Int16Array[], sampleRate)` for the fallback path (see below).

Two implementation details worth calling out:

**Prewarm at boot.** `App.tsx` calls `prewarmAudio()` after `initApi()` resolves. This constructs the `AudioContext` and loads the worklet module before the user ever presses the hotkey. The cold path is one-time, ~50–150 ms; warm path is sub-millisecond.

**Flush handshake on commit.** When the hotkey is released, the worklet may still hold a partial buffer that hasn't been emitted (chunks emit on 1280-sample boundaries). `streamer.commit()` does:

1. `worklet.port.postMessage({ type: 'flush' })`
2. Worklet emits any partial buffer, then posts `{ type: 'flushed' }`.
3. Streamer awaits the `flushed` ack, then `stopCapture()` and sends `{ type: 'commit' }` over the WS.

Without this, the tail ~80 ms of the utterance gets dropped on release.

**Pre-ready buffering.** OpenAI rejects `input_audio_buffer.append` before the transcription session is configured. The Streamer queues binary chunks in `pendingWsChunks` until `session.ready` arrives, then flushes the queue before unblocking real-time forwarding.

**WS auth.** Browsers can't set custom WS headers, so the existing per-launch token rides on the URL: `ws://127.0.0.1:<port>/stream?token=…`. Server is loopback-only.

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
| `session.ready` → renderer | any of `transcription_session.created`, `transcription_session.updated`, `session.created`, `session.updated` (whichever arrives first) |
| `partial` → renderer | `conversation.item.input_audio_transcription.delta` — adapter accumulates deltas into rolling text and emits the full so-far string each event |
| `final` → renderer | `conversation.item.input_audio_transcription.completed` (uses `evt.transcript` when present, otherwise falls back to the accumulated rolling text) |
| `error` → renderer | any OpenAI `error` event, or our own surfaced exception |

Partial-text accumulation happens in `openai-streaming.ts` (server-side), not in the renderer. The wire protocol between renderer and backend already specifies "overwrite previous partial," so the renderer just sets state — no diffing or stitching client-side.

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

- `backend/stream.ts` — **top-level, not under `routes/`**, because the WebSocket upgrade is attached directly to the Node `http.Server` via `ws`'s `WebSocketServer({ noServer: true })` + the server's `'upgrade'` event. The Hono app doesn't see the handshake at all; we sidestep it because Hono's middleware can't cleanly hand off a raw TCP socket on an upgrade. Auth (the `?token=` check) is duplicated here rather than reusing the Hono middleware.
- `backend/stt/openai-streaming.ts` — pure adapter: connects to OpenAI (`wss://api.openai.com/v1/realtime?intent=transcription`) with `Authorization: Bearer …` + `OpenAI-Beta: realtime=v1`, sends a `transcription_session.update` on open, exposes `sendAudio`, `commit`, `close` and the callback set (`onReady`, `onPartial`, `onFinal`, `onError`, `onClose`). All Realtime protocol details live here.

Wired in `backend/index.ts`:

```ts
const server = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }, info => { … })
attachStreamServer(server, token)   // <- hooks 'upgrade' on the same http.Server
```

Existing files updated:

- `backend/routes/transcribe.ts` — unchanged; remains the fallback path. POST `/transcribe` with a WAV blob.
- `backend/router.ts` — unchanged. The Hono router doesn't know about `/stream`.

## Renderer integration

`App.tsx` decides which path to take in `onStart`:

```ts
function shouldStream(s: Settings): boolean {
  return s.backend === 'cloud' && s.streaming && s.cloudModel !== 'whisper-1'
}

// onStart:
if (shouldStream(s)) {
  try { /* construct Streamer, await streamer.start() */ }
  catch (e) { /* fall through to batch */ }
}
// batch: const rec = new Recorder(); await rec.start(deviceId)
```

The active capture is held in a discriminated union ref:

```ts
type ActiveCapture =
  | { kind: 'recorder'; recorder: Recorder }
  | { kind: 'streamer'; streamer: Streamer; finalPromise: Promise<string> | null }
```

State while streaming:

- **Rolling partial text**: updated on every `partial` event from the Streamer's `onPartial` callback. **Display-only** — currently a no-op in the renderer (`onPartial: () => {}`), reserved for live preview in the pill ([`PILL.md`](./PILL.md)). Never written to the clipboard, never pasted.
- **Final text**: returned by `streamer.commit()` (which resolves on the `final` event). **This is the only value that gets pasted.**

On `hotkey:up`:

1. `streamer.commit()` is called. Internally: flush handshake with the worklet, stop capture, await `session.ready` if not yet ready, send `{ "type": "commit" }`.
2. Pill enters `transcribing` state.
3. `commit()` resolves when `final` arrives. **Only the `final` text is ever pasted.**
4. On `final` → paste `final.text`, close WS.
5. If `commit()` doesn't resolve within `FINAL_TIMEOUT_MS` (5 s, hard upper bound) → `finalizeStream` catches the timeout, calls `streamer.getBufferedPcm()`, wraps it with `pcm16ToWavBlob`, and POSTs to `/transcribe`. The batch path returns the text, and we paste that. Pasting partial text is never an option.

The streaming win comes from the fact that finalization is fast: by the time the user releases Fn, the model has already consumed nearly all of the audio. The `final` event typically arrives 100–300 ms after `commit` — much faster than the current batch path (upload-then-transcribe-then-respond). We're trading "almost-instant maybe-truncated" for "fast and definitely correct."

### Mic acquisition fallback

`Streamer.acquireMic()` retries `getUserMedia` without the `deviceId` constraint on `OverconstrainedError` / `NotFoundError`. Same logic that batch `Recorder` could benefit from — covers the case where the user's persisted built-in mic id no longer matches (USB mic unplugged, device list rotated, etc.).

## Settings

`Settings`:

```ts
interface Settings {
  …
  streaming: boolean   // default: true
}
```

Surfaced in the Cloud section as a `SettingsRow` labeled "Stream transcript" (with a `beta` chip), description: *Send audio as you speak so paste fires fast on release. Falls back to batch on error.* Only rendered when `backend === 'cloud' && cloudModel !== 'whisper-1'`; the row is omitted entirely otherwise rather than shown disabled.

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

- **OpenAI Realtime cost model.** Streaming bills per audio-second on the input side and per token on the transcription output. We should expose an estimate-per-minute somewhere in Settings before we default streaming on — particularly for users who dictate continuously. (Default is currently `true`, called out as a follow-up.)
- **Hotkey release timing vs. tail audio.** Resolved by the flush handshake described in "Audio capture (renderer)" — the worklet acks `flushed` before the streamer sends `commit`, so no tail samples are dropped. Cost: one extra cross-thread round-trip (~few ms).
- **WS auth via query string.** Required because browsers can't set custom WS headers. Token still has 24 bytes of entropy, and the server is loopback-only, so this is fine in practice. Token check is duplicated in `backend/stream.ts` (not reused from the Hono middleware).
- **AudioWorklet bundling.** Resolved. `audio-ctx.ts` uses Vite's `?url` import (`import workletUrl from './pcm-worklet.js?url'`) to emit the worklet as a static asset; `audioWorklet.addModule(workletUrl)` loads it at runtime. The worklet is plain JS (no TS) so it doesn't need a separate compile target.

## Implementation status

Shipped:

1. ✅ AudioWorklet + PCM downsampler in renderer (`pcm-worklet.js`, 16 kHz mono Int16).
2. ✅ Shared lazy `AudioContext` + `prewarmAudio()` at app boot (`audio-ctx.ts`).
3. ✅ Backend `/stream` WS endpoint with token auth + OpenAI Realtime adapter (`backend/stream.ts` + `backend/stt/openai-streaming.ts`).
4. ✅ End-to-end transport: `Streamer` in renderer ↔ `/stream` ↔ OpenAI; `partial`/`final` flowing.
5. ✅ 5 s commit timeout + batch fallback via `pcm16ToWavBlob` re-upload to `/transcribe`.
6. ✅ Settings toggle ("Stream transcript" in cloud section).

Deferred:

7. Live partial-text preview in the pill — wired at the data layer (`onPartial` callback fires) but the renderer's handler is currently a no-op. Owned by [`PILL.md`](./PILL.md).
8. Per-minute cost estimate in Settings (tied to the cost-model risk above).
9. `Recorder` (batch path) doesn't yet have the same mic-acquisition fallback (`OverconstrainedError` retry); only `Streamer` does. Easy port.
