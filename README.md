# Freestyle

Freestyle is an open-source AI voice dictation app inspired by [Wispr Flow](https://wisprflow.ai). Press a hotkey, speak naturally, and clean, formatted text appears at your cursor in any app — Slack, Gmail, VS Code, Cursor, Notion, anything with a text field. Unlike Wispr Flow, Freestyle runs locally by default, has no subscription, and is fully auditable.

---

## Goals and non-goals

### Goals

- **Feature parity with Wispr Flow's core dictation loop.** Hotkey → speak → polished text at cursor, with context-aware formatting, filler removal, backtrack handling, and per-app tone adaptation.
- **Local-first.** Whisper + Parakeet models run on-device. Cloud models are opt-in BYOK.
- **Cross-platform.** macOS, Windows, Linux — one codebase.
- **Pluggable.** Bring your own STT model, your own LLM, your own dictionary.

### Non-goals (for v1)

- Mobile apps (iOS/Android).
- Hosted multi-tenant SaaS.
- Team/admin features (shared dictionaries, SSO, dashboards).
- Real-time meeting transcription. The product is dictation, not a Granola/Otter competitor.

---

## Feature spec

### 1. Core dictation loop

Hold a global hotkey (default `Fn`, fallback `Ctrl+Space`), speak, release. Transcribed text is pasted at the cursor in the active app. Clipboard is saved before and restored after. A small floating pill UI shows recording state and processing status. `Esc` cancels; `Cmd/Ctrl+Z` undoes.

### 2. Transcription engine

Local-first, with a clean adapter so any model can plug in.

- **Local:** Whisper (Tiny → Turbo), NVIDIA Parakeet on supported hardware.
- **Cloud (BYOK):** OpenAI, Deepgram, AssemblyAI, or any OpenAI-compatible endpoint.

### 3. AI cleanup layer ("Polish")

After raw transcription, text is optionally passed through an LLM to remove fillers, resolve backtracks (*"meet at 2... actually 3"* → *"meet at 3"*), add punctuation, format lists, and fix obvious errors. Verbatim mode disables rewriting. System prompt is user-editable. LLM backends: local (Ollama, llama.cpp, MLX) or cloud BYOK.

### 4. Context Engine

The active application name is passed into the Polish prompt so the LLM adapts tone: casual in Slack, professional in Mail, technical in IDEs. App name only — no screenshots, no OCR, no window content. Per-app rules are user-configurable.

### 5. Command Mode

Highlight text, press a hotkey, speak an instruction ("make this more formal", "translate to Spanish", "shorten to two sentences"). Selected text is rewritten in place. Uses the same LLM backend as Polish.

### 6. Personal dictionary

Custom words, names, acronyms. Auto-learns from manual corrections within 30 seconds. Optional phonetic hints. Entries can be global or scoped to specific apps. Import/export as JSON or CSV.

### 7. Snippets

Voice shortcuts → expanded text. Variables: `{{date}}`, `{{time}}`, `{{clipboard}}`, `{{cursor}}`. Markdown preserved on insert.

### 8. Styles (writing voice)

User-defined sample paragraphs the LLM uses as a style reference during Polish, plus preferred/avoided patterns ("use em dashes", "avoid the word 'leverage'").

### 9. Whisper mode (literal)

Works when the user is literally whispering, via VAD tuned for low-amplitude speech.

### 10. Developer mode

For Cursor, VS Code, Zed, terminals. Handles `camelCase`, `snake_case`, file extensions, shell commands. Code-fence detection auto-engages raw mode inside triple-backtick blocks.

### 11. Scratchpad

Floating, always-on-top markdown notepad with live preview. Dictate directly into it without stealing focus.

### 12. Languages

100+ languages via Whisper. Auto-detection by default; user can pin a language.

---

## Roadmap

- **v0.1 — Alpha (current):** Hotkey, audio capture, floating pill, local Whisper, paste pipeline, settings.
- **v0.2 — Polish layer:** LLM cleanup, user-editable prompt, backtrack/filler removal, verbatim mode.
- **v0.3 — Context Engine:** Active app detection across platforms, per-app tone, developer mode.
- **v0.4 — Personalization:** Dictionary with auto-learn, snippets, styles.
- **v0.5 — Command Mode:** Selection capture, edit-in-place rewrite, undo integration.
- **v1.0 — Stable:** Reproducible builds, auto-update, docs site, one-click installers.

