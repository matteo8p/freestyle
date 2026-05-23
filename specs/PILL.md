# Freestyle Pill — Technical Spec

## Scope

A floating, system-wide indicator that shows recording state at the bottom-center of the screen, above every other window — the Wispr Flow pill, in our brand. The design lives in [`../design/brand-app.jsx`](../design/brand-app.jsx) under `PillArtboard`.

The pill is not a redesign of the existing in-window status; it is an additional surface. The main window's status badge stays as the in-app indicator. The pill is the **system-wide** indicator visible while the user is dictating into Slack, Cursor, Gmail, anywhere.

This spec assumes [`STREAMING.md`](./STREAMING.md) is implemented in parallel. The pill is the consumer of streaming partials: when cloud mode + streaming are active, partial transcripts flow from the OpenAI Realtime session through our backend WS, through the main renderer, into the pill — so words appear as they're spoken, not after the user lets go of the hotkey. In batch mode (local backend, `whisper-1`, or stream fallback) the pill still does a reveal animation, just over the resolved final text. Same UI surface, two sources.

Two requirements drive most of the design:

1. **Smooth, real-time response to mic volume.** Voice bars must move continuously with the live signal, not poll-and-jump. Target 60Hz update rate, end-to-end latency under 50ms.
2. **Text-streaming feel.** Transcript words appear in the pill as they arrive. When streaming is active, they're real partials. When it isn't, they're a reveal animation over the resolved final. The pill UI doesn't care which.

---

## High-level architecture

The pill is a **second Electron `BrowserWindow`** — frameless, transparent, always-on-top, not focusable. Audio capture stays in the main window's renderer; per STREAMING.md it runs through one shared `AudioContext` graph: `getUserMedia` → `MediaStreamSource` fans out to (a) an `AnalyserNode` for live levels and (b) an `AudioWorkletNode` that emits 16 kHz PCM to the streaming WS (or buffers it for batch). Two consumers, one source.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Electron main process                            │
│   ┌────────────────────────────────────┐    ┌────────────────────────┐   │
│   │ Main window (renderer)             │    │ Pill window            │   │
│   │ ───────────────────────────────    │    │ (renderer)             │   │
│   │  MediaStream                       │    │ ─────────────          │   │
│   │    │                               │    │ • Renders pill UI      │   │
│   │    ▼                               │    │ • Receives state +     │   │
│   │  MediaStreamSource ────┬──────┐    │    │   level frames +       │   │
│   │                        │      │    │    │   transcript partials  │   │
│   │             AnalyserNode  AudioWorklet  │ • No mic access        │   │
│   │             (60Hz bars)  (16k PCM) │    └────────────▲───────────┘   │
│   │                        │      │    │                 │               │
│   │                        │      ▼    │                 │               │
│   │                        │   WS → /stream ─┐           │               │
│   │                        │      │ (STREAMING.md)       │               │
│   │                        ▼      │          │           │               │
│   │             audio:frame   transcript:partial / :final              │
│   └──────────────────────┬─┴──────┴──────────┘           │               │
│                          │ ipcRenderer.send              │ webContents   │
│                          ▼                               │ .send         │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │ Main process broker                                              │   │
│   │ • Spawns/positions pill window                                   │   │
│   │ • Forwards audio:frame and transcript:* to pill                  │   │
│   │ • Owns pill state machine, owns hotkey                           │   │
│   │ • Persists pill position (settings store)                        │   │
│   └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

Why two windows and not one: a single window can't render *over* other apps. macOS requires a separate `NSWindow` with the right level + behavior flags. Electron `BrowserWindow` is the path that doesn't require a native module.

Why audio capture stays in the main renderer: only one place opens the mic, the `AudioContext` graph is already there for streaming, and routing it through the pill would risk double-allocation / HFP bluetooth conflicts. The pill renderer is purely a view layer — it receives state, audio levels, and transcript deltas via IPC, no mic permission needed.

---

## Pill window — Electron flags

```ts
new BrowserWindow({
  width: 360,
  height: 80,
  frame: false,
  transparent: true,
  backgroundColor: '#00000000',
  alwaysOnTop: true,
  resizable: false,
  movable: true,
  minimizable: false,
  maximizable: false,
  fullscreenable: false,
  skipTaskbar: true,
  focusable: false,                 // <- critical: never steal focus
  hasShadow: false,                 // we draw our own soft shadow in CSS
  show: false,                      // shown after positioning
  webPreferences: { preload: '…/preload-pill.cjs', sandbox: false, contextIsolation: true }
})

// after creation:
pill.setAlwaysOnTop(true, 'screen-saver')      // above fullscreen apps
pill.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
pill.setIgnoreMouseEvents(false)               // pill IS interactive (drag, click to cancel)
```

`focusable: false` is the keystone. When the user holds `fn` while typing in Slack, focus stays in Slack. The pill appears, animates, disappears — and the synthetic ⌘V we send goes to Slack, not the pill.

---

## States

Four visual states, mapped to the existing renderer state machine (`PillState` in `HomePage.tsx`). Plus `hidden` as the resting state at the window level.

| State | Source | Window | Visual |
|---|---|---|---|
| `hidden` | between sessions | hidden (off-screen or `.hide()`) | — |
| `idle` (optional) | brief "hold to talk" hint | shown, ink fill | mic glyph + "Hold `fn` to talk" |
| `recording` | hotkey down → release | shown, **coral** fill | live VoiceBars + timer (`0:04`) |
| `transcribing` | release → text resolved | shown, ink fill | 3-dot pulse + "Transcribing" |
| `pasted` | text resolved → paste OK | shown, ink fill | check + word count, then fades |
| `error` | any failure | shown, ink fill, coral text | message, auto-fades |

Transitions: opacity + slight Y-translate (slide-up 6px) on enter; cross-fade between states; opacity-out + Y-translate-down on hide. CSS transitions handle the entire envelope (no Framer Motion dependency for v1 — we don't need a layout engine).

The `idle` "hold to talk" state is **opt-in via Settings**. Some users want a persistent pill at the screen edge; others want it to appear only while recording. Default: appear only during active states (no idle resting state).

---

## Audio-level pipeline (the real-time path)

This is the hot loop. Latency budget end-to-end: <50ms.

### Capture side (main renderer)

The `AudioContext` is shared with the STREAMING.md pipeline. The `AnalyserNode` is a sibling consumer of the `MediaStreamSource`, parallel to the `AudioWorkletNode` that produces PCM for the WS.

```ts
// Owned by the streaming layer (per STREAMING.md); pill code reuses it.
const ctx = new AudioContext({ sampleRate: 16000 })
const source = ctx.createMediaStreamSource(stream)

// Pill-specific tap — parallel to, not in series with, the worklet.
const analyser = ctx.createAnalyser()
analyser.fftSize = 256                  // 128 freq bins, ~16ms time resolution
analyser.smoothingTimeConstant = 0.6    // built-in EMA — alive but not jittery
source.connect(analyser)                 // analyser has no further connection — read-only tap

const bins = new Uint8Array(analyser.frequencyBinCount)
const BARS = 14                          // matches the design's VoiceBars count

function tick(): void {
  if (!recording) return
  analyser.getByteFrequencyData(bins)
  const bars = bucket(bins, BARS)        // log-spaced buckets, more bars at speech freqs
  const rms = computeRms(bins)
  window.freestyle.publishAudioFrame({ bars, rms, t: performance.now() })
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)
```

- **One source, two taps.** The AnalyserNode and the AudioWorkletNode both connect *from* `source`. Neither feeds the other. The worklet's 80 ms chunk cadence (12.5 Hz) and the pill's rAF cadence (60 Hz) are independent.
- **rAF cadence** matches the display refresh. No setInterval — that drifts and causes visible jitter.
- **Log-spaced bucketing** (not linear): speech sits in ~200–4000Hz. Linear bins over the full Nyquist range waste resolution on inaudible high frequencies and the bars look dead in the middle. Log buckets give the bars a lively, balanced look.
- **`smoothingTimeConstant: 0.6`** on the AnalyserNode is a built-in EMA — bars feel alive but not seizure-y. Adjust to taste in dev.

### Transport (renderer → main → pill)

Each frame is ~16 bytes of payload (14 bytes for bars + an rms + a timestamp). At 60Hz that's 1KB/s — IPC is comfortable here, no need for `postMessage` between renderers.

```ts
// preload-main.ts
publishAudioFrame: (frame) => ipcRenderer.send('audio:frame', frame)

// main process
ipcMain.on('audio:frame', (_, frame) => pill?.webContents.send('audio:frame', frame))
```

If profiling shows the round-trip ever becoming a bottleneck (it shouldn't at this rate), swap in `MessagePortMain` for renderer-to-renderer direct messaging — same shape on both ends.

### Render side (pill renderer)

```ts
const [bars, setBars] = useState<number[]>(() => new Array(BARS).fill(0))
useEffect(() => {
  return window.freestylePill.onAudioFrame((frame) => {
    setBars(prev => smoothBars(prev, frame.bars))   // spring or simple lerp
  })
}, [])
```

- `smoothBars` is a per-bar critically-damped spring (or just `prev * 0.6 + next * 0.4` if springs feel like overkill). This is on top of the AnalyserNode's smoothing — render-side smoothing hides any IPC stutter and keeps motion continuous even if a frame drops.
- The bars themselves are SVG `<line>` elements with rounded caps (matching `art.tsx`'s `VoiceBars`). They animate via React state, not SVG SMIL — SMIL doesn't smoothly interpolate state changes.

State change events (`idle → recording → transcribing → pasted`) flow over a separate IPC channel (`pill:state`) so we don't blast state on the audio-frame bus.

---

## Text-streaming feel

The pill UI shows words appearing live above the voice bars. The **source of those words depends on which transcription path is active**:

| Path | Source of words shown in pill | Triggered when |
|---|---|---|
| **Streaming** (cloud + `streaming === true` + model ≠ `whisper-1`) | Real `partial` events forwarded from the WS via `transcript:partial` IPC. Overwrites previous partial each tick. | hotkey:down → hotkey:up |
| **Reveal** (everything else: local, `whisper-1`, stream fallback, streaming disabled) | The resolved `final` text, animated word-by-word via a rAF-driven token index | hotkey:up → final resolves → pasted |

Same component renders both — it takes a `(text, isComplete)` tuple. In streaming mode, partials arrive incrementally and `isComplete` flips true on `final`. In reveal mode, the component receives the full text once and self-paces its own reveal.

**Critical: only `final` text is ever pasted.** This is stated in STREAMING.md and bears repeating here — partials shown in the pill are display-only. The pill rendering and the paste pipeline read from different state, so there is no path where a partial sneaks into the clipboard.

The reveal animation uses `requestAnimationFrame` with a token index advancing on a frame budget (~30–50ms per word, ramping faster for long transcripts), not `setTimeout` per token — better for skipping a frame under load.

---

## IPC contract

New channels (all on top of the existing hotkey + paste IPC):

| Channel | Direction | Payload | Cadence |
|---|---|---|---|
| `audio:frame` | main-renderer → main → pill-renderer | `{ bars: number[14], rms: number, t: number }` | ~60Hz, only while recording |
| `transcript:partial` | main-renderer → main → pill-renderer | `{ text: string }` | per WS `partial` event (typically every few words) |
| `transcript:final` | main-renderer → main → pill-renderer | `{ text: string }` | once per session, on WS `final` (or on batch resolve) |
| `pill:state` | main → pill-renderer | `{ state: PillState, durationMs?: number, message?: string }` | on transitions only |
| `pill:position` | pill-renderer → main | `{ x: number, y: number }` | on drag end |
| `pill:cancel` | pill-renderer → main | `{}` | on user-initiated cancel (click or Esc inside pill) |

Audio frames are *not* sent when `recording === false`. Pill never receives data it shouldn't render. `transcript:partial` is only ever emitted on the streaming path — in batch mode the pill jumps straight from the bars view to the reveal animation when `transcript:final` arrives.

---

## Lifecycle

The two paths share most of the timeline; they diverge in *when* words start showing in the pill.

### Streaming path (cloud + streaming on)

```
app ready
  └─ create main window
  └─ create pill window (hidden, positioned bottom-center of primary display)

hotkey down
  └─ open WS to /stream (STREAMING.md)
  └─ main renderer: start AudioContext graph, publish audio:frame frames
  └─ main process: pill.show(); send pill:state { state: 'recording' }
  └─ as partials arrive: forward transcript:partial → pill renders live words

hotkey up
  └─ main renderer: stop AudioWorklet, send WS { type: 'commit' }
  └─ main process: send pill:state { state: 'transcribing' }
  └─ WS resolves with final
  └─ main process: forward transcript:final → pill marks reveal complete
  └─ paste fires → cursor receives text
  └─ main process: send pill:state { state: 'pasted', durationMs }
  └─ pill auto-hides after ~1500ms (fade out)
```

### Batch / fallback path (local backend, whisper-1, streaming disabled, stream error)

```
hotkey down
  └─ main renderer: start AudioContext graph + recorder buffer
  └─ pill.show(); pill:state { state: 'recording' }

hotkey up
  └─ pill:state { state: 'transcribing' }
  └─ POST /transcribe resolves
  └─ transcript:final → pill runs reveal animation over the resolved text
  └─ paste fires
  └─ pill:state { state: 'pasted' }
  └─ pill auto-hides after ~1500ms
```

Cancel paths (Esc during recording or transcribing) reset the pill to `hidden` immediately and drop any pending audio. The WS sends `{ type: 'cancel' }`; the batch path simply discards the buffer.

---

## Animation strategy (smoothness)

| Element | Mechanism | Notes |
|---|---|---|
| Window enter/exit | CSS `transition: opacity, transform; ~180ms` on the root pill `<div>` | Window stays visible during fade-out; `setOpacity` is also available but CSS is smoother |
| State cross-fade | CSS `transition: opacity 150ms` on inner state-specific layers | Both layers mounted briefly during transition |
| Voice bars | React state + per-bar spring/lerp | rAF-driven; do **not** use CSS transitions on individual bars — they fight rapid state updates |
| Spinner dots (transcribing) | CSS keyframe animation, GPU-only properties (opacity, transform) | Cheap, no rerender |
| Word reveal | rAF with index advancing on frame budget | Skips frames cleanly under load |
| Background tint (coral when recording) | CSS `transition: background-color 200ms` | Single property, GPU-composited |

Two rules to keep it smooth:

1. **GPU-only properties.** Everything that animates uses `opacity` and `transform` only. No `width`, no `height` (the bars use SVG attributes which sidestep this), no `left/top` (we position via `transform: translate`).
2. **One source of truth per moving thing.** Either CSS owns it (transitions/keyframes) or React owns it (state + rAF). Never both — they fight each other and produce jank.

---

## Project layout additions

```
frontend/
├── pill/                            ← new renderer entry
│   ├── index.html
│   ├── main.tsx
│   ├── Pill.tsx                     ← root component, state machine
│   ├── PillIdle.tsx
│   ├── PillRecording.tsx            ← bars + timer
│   ├── PillTranscribing.tsx
│   ├── PillPasted.tsx
│   └── lib/
│       ├── smoothBars.ts            ← per-bar critically-damped spring
│       └── wordReveal.ts            ← rAF token animator
│
├── main/
│   ├── pill-window.ts               ← creates pill BrowserWindow, owns pos
│   ├── preload-pill.ts              ← typed bridge for pill renderer
│   └── index.ts                     ← wires hotkey → pill-window
│
└── renderer/
    └── lib/recorder.ts              ← +AnalyserNode + onAudioFrame callback
```

`electron.vite.config.ts` gains a second renderer input:

```ts
renderer: {
  build: {
    rollupOptions: {
      input: {
        main: 'frontend/renderer/index.html',
        pill: 'frontend/pill/index.html'
      }
    }
  }
}
```

Brand art (`VoiceBars`, `MicGlyph`, `CheckIcon`) already lives in `frontend/renderer/components/art.tsx`. The pill imports from there directly; no symlink needed since both renderers compile from the same source tree.

---

## Settings additions

Pill-owned fields:

| Field | Default | Purpose |
|---|---|---|
| `pill.enabled` | `true` | Master toggle. Off = no pill window created. |
| `pill.idleVisible` | `false` | Show a persistent "hold fn to talk" pill at rest. Off = pill only appears during active states. |
| `pill.position` | `null` (= compute bottom-center) | Persisted `{ x, y }` from user drag. |

Surfaced in Settings as a new `SettingsRow label="Floating pill"` block.

The `streaming` flag (already defined in `shared/types.ts`) is owned by STREAMING.md, but the pill reads it to decide whether to expect `transcript:partial` events or jump straight to the reveal animation. The pill itself does not gate on `streaming` for showing/hiding — only for which source feeds the word display.

---

## Multi-monitor

v1: pill anchors to the **primary display**, bottom-center, persisted position relative to that display. If primary display changes between sessions, fall back to default.

Post-v1 (when someone asks): pill follows the display containing the focused app. This requires reading the focused app's window bounds, which is a native call on macOS — defer.

---

## Permissions

No new permissions. The pill renderer doesn't access the mic — that's still the main renderer's job. Accessibility (paste) and Microphone (capture) are already requested by the main app.

---

## Out of scope for v1

- Streaming transcription itself — owned by [`STREAMING.md`](./STREAMING.md). The pill consumes its events; it doesn't implement the WS or the OpenAI Realtime adapter.
- Click-to-cancel mid-recording, click-to-redo on the pasted state, hover preview of full transcript. Hooks are designed in (`pill:cancel`), UI deferred.
- Drag-to-snap edges, magnetic anchoring.
- Pill on non-primary displays (defer until requested).
- Custom user themes for the pill. The pill is brand-consistent only — ink/coral, fixed.
- Windows / Linux behavior. The window flags above are macOS-specific; cross-platform port is a separate spec.

---

## Open questions

- **`screen-saver` vs `floating` always-on-top level.** `screen-saver` puts the pill above macOS fullscreen apps, which is what we want for someone dictating into a fullscreen Slack or Notion. But some users report the pill obscuring system dialogs that shouldn't be obscured. Try `screen-saver` first, fall back to `floating` if user reports surface conflicts.
- **AnalyserNode FFT size.** 256 (default proposed) is responsive but a touch noisy. 512 is calmer but laggier. Tune in dev with real speech.
- **Idle "hold to talk" pill behavior** (`pill.idleVisible`). If enabled, where should it sit when the user clicks away from the focused app to another app — stay put, or follow the focused window's edge? v1 ships with "stay put"; revisit.
- **Pill width.** The design specifies 48px height. Width varies by state (idle ~180px, recording ~280px with bars). Two options: dynamically resize the BrowserWindow per state, or fix the window at the max width and have the pill body center inside a transparent canvas. Latter is simpler and animates more smoothly (no window-resize jank). Default to the latter unless a reason emerges to resize.
