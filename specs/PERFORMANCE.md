# Performance & latency optimization

## Constraints (non-negotiable)

1. **No persistent OpenAI WebSocket.** A new session is opened on Fn press and closed on Fn release. We're not paying for idle connection time or holding a session open across dictations.
2. **No always-on macOS mic indicator.** The mic is acquired on Fn press, released on Fn release. No pre-warm of `getUserMedia`. The indicator only appears while the user is actively dictating.

These rule out keeping the OpenAI socket alive between presses *and* keeping the mic stream open between presses. Everything below works within those rules.

## Symptoms

1. **Fn-press → recording feels delayed.** Users miss the first word or two if they speak before the worklet is wired up.
2. **Fn-release → paste** has tail latency from OpenAI processing the un-transcribed audio.

## Where the time goes today

`Streamer.start()` has three sequential awaits, every Fn press:

```
new WebSocket → readyPromise          (5 ms)        loopback open
       ↓ backend opens OpenAI WS, awaits session.created
       ↓ backend sends transcription_session.update
       ↓ backend emits session.ready
                                       (150–400 ms)  OpenAI handshake
await getUserMedia(...)                (50–150 ms)   mic acquire
new AudioContext()
await audioWorklet.addModule(dataUrl)  (20–50 ms)    worklet compile + register
createMediaStreamSource + connect      (<5 ms)
─────────────────────────────────────────────
total cold start                       230–620 ms
```

The OpenAI handshake is the largest single chunk — and per constraint #1, we pay it every press. We can't make it faster. We can only **hide it from the user**.

## Strategy

The plan now has two parts: a fast pre-record path that makes the press *feel* instant despite the OpenAI handshake, plus a tightening of the post-release commit flush.

---

### Part 1 — Parallelize everything in `Streamer.start()`

**Win:** removes serialization waste. Net cold start drops from the **sum** of the three awaits to roughly the **max** (which will be the OpenAI handshake).

- `Promise.all([openWebSocket(), acquireMic(deviceId), bootAudioContext()])` instead of three sequential awaits.
- `openWebSocket()` returns the existing `readyPromise`.
- `acquireMic()` runs `getUserMedia` with the same constraints we use today (echoCancellation off, etc.).
- `bootAudioContext()` does `new AudioContext()` + `audioWorklet.addModule(workletUrl)`.
- Once all three resolve, `wireGraph()` creates the source node, the worklet node, and connects them. This is synchronous.

Pre-condition: the worklet's `port.onmessage` is set up immediately (synchronously) so the moment chunks start arriving they're buffered locally. We already buffer to `bufferedPcm`; we keep doing so, and we gate `ws.send(...)` on `readyState === OPEN`. Buffered chunks flush in order as soon as the WS opens.

**Impact:** ~70–200 ms saved per press. No protocol change, no behavior change, ~30 lines of diff.

---

### Part 2 — Show "recording" the moment the mic is live, not the moment OpenAI is ready

**Win:** the *perceived* cold-start latency drops from "until session.ready" to "until the mic is wired" — about 50–150 ms in practice. The OpenAI handshake (150–400 ms) finishes in parallel and is invisible to the user.

Today `onStart` only flips the pill to `recording` after `streamer.start()` resolves, and `streamer.start()` waits for `session.ready`. Change:

- `Streamer.start()` returns a promise that resolves when the **mic is wired and emitting PCM into the local buffer** — not when the OpenAI session is ready.
- A separate internal `sessionReady` promise tracks the OpenAI handshake. `commit()` awaits it before sending the OpenAI commit message (already the case via the existing readyPromise).
- App.tsx flips the pill to `recording` on `streamer.start()` resolution. The user sees feedback in ~50–150 ms regardless of OpenAI's state.
- Audio captured during the OpenAI-handshake window is buffered in the worklet's `bufferedPcm` queue and uploaded the instant the WS opens. No audio is lost.

**Edge case — the user releases Fn before `session.ready` arrives.** The Streamer still has the full PCM in `bufferedPcm`. `commit()` falls back to the existing batch path automatically: drop the half-opened WS, wrap `bufferedPcm` as a WAV, POST to `/transcribe`. We already have this fallback wired; it just happens to fire more often for very short presses.

**Impact:** ~100–300 ms perceived improvement on every press, on top of Part 1.

---

### Part 3 — Pre-warm the AudioContext + worklet at app boot

**Win:** removes the 20–50 ms `addModule(dataUrl)` step from every press.

`AudioContext` and `audioWorklet.addModule` do **not** require microphone access — no permission prompt, no mic indicator. Safe to do at app boot.

- A module-level singleton in `renderer/lib/audio-ctx.ts`:
  ```ts
  let ctxPromise: Promise<AudioContext> | null = null
  export function getAudioContext(): Promise<AudioContext> {
    if (!ctxPromise) {
      ctxPromise = (async () => {
        const ctx = new AudioContext()
        await ctx.audioWorklet.addModule(workletUrl)
        return ctx
      })()
    }
    return ctxPromise
  }
  ```
- Eagerly call `getAudioContext()` after `initApi()` completes in `App.tsx` so the worklet is registered before the first Fn press.
- `Streamer.start()` calls `getAudioContext()` instead of constructing its own. On second and subsequent presses this is a no-op resolve.
- Closing the AudioContext between dictations is unnecessary; an idle context with no source connected consumes negligible CPU and no mic. We just disconnect the source node on `close()` and reuse the context next time.

**Impact:** ~20–50 ms on every press after the first. Trivial diff.

---

### Part 4 — Flush the worklet's in-flight buffer on commit

**Win:** ~20–60 ms shaved off the post-release wait.

Today the worklet posts a chunk every 1280 samples (~80 ms). When Fn releases, the worklet's internal buffer may be 0–80 ms full of un-posted samples. Those samples currently never make it to OpenAI — they're orphaned in the worklet.

- Add a message channel from main thread → worklet: `port.postMessage({ type: 'flush' })`.
- The worklet's `process()` checks for the flush flag and, if set, posts whatever's in `this.buffer` (even if it's not a full chunk) and resets.
- `Streamer.commit()` sends `{ type: 'flush' }` to the worklet, awaits a tiny tick to let the chunk arrive on the main thread and ship via WS, then sends `{ type: 'commit' }` to the backend.

**Impact:** OpenAI now has the absolute end of the audio when it commits; reduces the chance that the model is still digesting tail audio when we ask for final.

---

## Combined expected latency after Parts 1–4

| Phase | Today | After |
|---|---|---|
| Fn press → "recording" pill visible | 230–620 ms | **50–150 ms** (= time to wire mic + worklet, in parallel with OpenAI handshake) |
| Audio actually flowing to OpenAI | same as pill | 150–400 ms (no UX impact — buffered locally) |
| Fn release → paste | 200–600 ms | **80–250 ms** (commit-flush + tightened path) |

We can't beat the OpenAI handshake without violating constraint #1, and we can't beat `getUserMedia` without violating constraint #2. But we can make those costs **happen in parallel** and **happen behind a UI that already says "recording"**.

---

## Settings + telemetry

- Add a hidden debug logger that records timestamps for `fn_down`, `mic_ready`, `worklet_wired`, `session_ready`, `first_chunk_sent`, `fn_up`, `flush_sent`, `commit_sent`, `final_received`, `paste_done`. Surface via a debug panel toggle. Use the numbers to verify wins land as expected and to catch regressions.
- No new user-facing settings. The above is all transparent behavior change.

---

## Out of scope

- **Switching to a faster STT provider** (Deepgram, Groq Whisper). Real latency wins exist but require multi-provider plumbing.
- **Local streaming via whisper.cpp.** Separate spec.
- **Persistent OpenAI session or persistent mic.** Per constraints above.

---

## Recommended sequencing

1. **Parts 1 + 2 together** — they share the same file (`Streamer.start()`) and the same surface area. Ship as one PR.
2. **Part 3** — small, isolated, no protocol change.
3. **Part 4** — needs a tiny worklet update; ship after we verify Parts 1+2 in real use so the baseline numbers are stable.
