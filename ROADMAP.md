# Roadmap

Freestyle's north star is feature parity with [Wispr Flow](https://wisprflow.ai)'s core dictation loop — *local-first, BYOK cloud, no subscription, fully auditable.* The full product spec lives in [`specs/README.md`](./specs/README.md); this file is the shipping plan.

Dates are intentionally absent. Versions ship when they're ready. Order can shift based on user feedback.

---

## v0.1 — Alpha (current)

The minimum loop that's actually useful day-to-day.

- [x] Hold-Fn-to-record global hotkey
- [x] Audio capture + floating pill UI showing recording / processing state
- [x] Local Whisper (`whisper.cpp` via `nodejs-whisper`) — runs on-device
- [x] Cloud BYOK (OpenAI: `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, `whisper-1`)
- [x] Paste pipeline (clipboard save → synthetic ⌘V → restore)
- [x] Settings: backend choice, model picker, microphone pin, encrypted key storage via macOS Keychain
- [x] Apache 2.0 license, public repo

**Known gaps:** macOS only. No undo integration. No Polish layer. No streaming.

---

## v0.2 — Polish layer

An LLM cleanup pass between raw transcription and paste. This is the single biggest quality jump.

- [ ] Pluggable LLM adapter (mirror the STT adapter pattern in `backend/`)
- [ ] User-editable system prompt with sensible default
- [ ] Filler removal (*"um"*, *"like"*, *"you know"*)
- [ ] Backtrack resolution (*"meet at 2... actually 3"* → *"meet at 3"*)
- [ ] Verbatim mode toggle (bypasses the LLM entirely)
- [ ] Cloud BYOK: OpenAI, Anthropic
- [ ] Local: Ollama, llama.cpp

---

## v0.3 — Context Engine

Make output adapt to where the cursor is.

- [ ] Active-app detection on macOS (NSWorkspace)
- [ ] App name passed into Polish prompt as context
- [ ] Per-app tone presets: casual (Slack, iMessage), professional (Mail, Docs), technical (Cursor, VS Code, Terminal)
- [ ] User-configurable per-app rules
- [ ] Developer mode: `camelCase` / `snake_case` / code-fence detection inside IDEs

App name only. No screenshots, no OCR, no window content scraping. That's a privacy floor we don't cross.

---

## v0.4 — Personalization

Make Freestyle learn the user's vocabulary and voice.

- [ ] Personal dictionary: custom words, names, acronyms, phonetic hints
- [ ] Auto-learn from manual corrections within 30s of paste
- [ ] Global + per-app dictionary scopes
- [ ] JSON / CSV import + export
- [ ] Snippets: voice shortcut → expanded text, with `{{date}}` / `{{time}}` / `{{clipboard}}` / `{{cursor}}` variables
- [ ] Styles: user-supplied sample paragraphs as a writing-voice reference for Polish

---

## v0.5 — Command Mode

Highlight text, hold a different hotkey, speak an instruction, watch the selection rewrite in place.

- [ ] Selection capture across apps (Accessibility API)
- [ ] In-place rewrite via the same LLM backend as Polish
- [ ] Undo integration so ⌘Z reverts the rewrite cleanly
- [ ] Preset instructions: "make this formal" / "translate to Spanish" / "shorten to two sentences"

---

## v0.6 — Cross-platform

Port the macOS-specific surfaces. The core (Electron, React, Hono, Whisper) is already portable.

- [ ] Windows hotkey + paste pipeline
- [ ] Windows active-window detection
- [ ] Linux (X11 first, Wayland once it has the APIs we need)
- [ ] Per-platform installers and signing

---

## v1.0 — Stable

The "tell your friends" release.

- [ ] Reproducible builds
- [ ] Auto-update via `electron-updater`
- [ ] One-click installers (`.dmg`, `.msi`, `.AppImage`)
- [ ] Docs site (not just a README)
- [ ] Migration story for settings across versions
- [ ] Performance budget: <500ms from hotkey-release to paste for short clips on M1

---

## Beyond v1

These are real ideas that need v1 stability first.

- **Whisper mode** — VAD tuned for actual whispering, for libraries/meetings/etc.
- **Scratchpad** — floating always-on-top markdown notepad that accepts dictation without stealing focus.
- **Streaming partial results** — show interim transcription in the pill before finalize. Architecture sketch in [`specs/STREAMING.md`](./specs/STREAMING.md).
- **Parakeet support** — NVIDIA's STT model on supported hardware.
- **Hosted cloud tier** — *only* if a meaningful share of BYOK users ask for "just run it for me." Not before.

---

## Explicit non-goals

These are not on the roadmap, and probably never will be. The product is dictation, not a meeting transcriber or a SaaS.

- Mobile apps (iOS / Android)
- Hosted multi-tenant SaaS as the primary product
- Team / admin features (shared dictionaries, SSO, org dashboards)
- Real-time meeting transcription (Granola / Otter territory)
- Telemetry that leaves the user's machine without explicit consent

---

## How to influence the roadmap

- 👍 an existing GitHub issue to upvote it.
- Open a new issue with a concrete use case, not just a feature name.
- Send a PR — see [CONTRIBUTING.md](./CONTRIBUTING.md). Roadmap items marked `[ ]` are fair game; coordinate via the linked issue first so two people don't build the same thing.
