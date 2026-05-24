# Contributing to Freestyle

Thanks for your interest. Freestyle is early — most surfaces are still moving, so the best contributions right now are bug reports with reproduction steps, focused PRs against open issues, and feedback on the [roadmap](./ROADMAP.md).

## Ground rules

- **Be kind.** Disagree on code, not people.
- **Small PRs.** One concern per PR. A 50-line PR gets reviewed in a day; a 500-line PR gets reviewed in three weeks.
- **Open an issue first** for anything beyond a bug fix or typo. A 30-second sanity check saves a wasted weekend.
- **By contributing, you agree your code is licensed under [Apache 2.0](./LICENSE).** No CLA.

## Dev setup

Prereqs: macOS, Node 20+, Xcode CLT, CMake (`brew install cmake`). Full prereq list in the [README](./README.md#prerequisites).

All code lives in `app/`. Everything else at the root (`specs/`, `designs/`, `*.md`, `LICENSE`) is documentation.

```bash
git clone <this-repo>
cd freestyle/app
npm install
npm run dev
```

`npm install` runs the postinstall scripts (`scripts/fix-keylistener.mjs`, `scripts/build-whisper.mjs`) which take ~30–60s the first time. If `whisper.cpp` fails to build, see the README's [Troubleshooting](./README.md#troubleshooting) section before opening an issue.

## Repo layout

```
app/                    ← all code lives here; run npm commands from inside
  frontend/main/        Electron main process (window, hotkey, paste, pill window)
  frontend/renderer/    React app
  backend/              Hono HTTP API, STT adapters (local + OpenAI), settings, secrets
  shared/               Types shared by main + renderer + backend
  scripts/              Postinstall helpers
specs/                  Product spec and MVP technical spec
designs/                Brand and UI design files
```

Communication: main ↔ renderer via IPC for push events; renderer ↔ backend via typed `hc` over HTTP on `127.0.0.1`.

## Before opening a PR

1. `npm run typecheck` — both `:node` and `:web` must pass.
2. `npm run build` — production bundle must build cleanly.
3. **Manually test the change.** Voice dictation has no meaningful test harness yet; if you touched the hotkey, paste, audio capture, or pill window, exercise it end-to-end in `npm run dev`.
4. Keep the diff focused. Don't bundle unrelated refactors.

## Code style

- TypeScript everywhere. No `any` without a comment explaining why.
- No comments that restate what the code does — only comments that explain non-obvious *why*.
- Prefer editing existing files over creating new ones. Don't introduce new abstractions until there are at least three callers.
- Follow the existing patterns in the file you're editing. If you want to introduce a new pattern, open an issue first.

## Filing bugs

Include:

- macOS version, chip (Intel / Apple Silicon), Node version (`node -v`).
- Mode: local Whisper or cloud BYOK (and which model).
- Steps to reproduce. "Hold Fn in Slack, release, nothing pastes" beats "dictation broken."
- Relevant log output. In dev, that's the terminal running `npm run dev`. In a packaged build, `~/Library/Logs/Freestyle/`.

## Filing feature requests

Check [ROADMAP.md](./ROADMAP.md) first — if it's already planned, +1 the existing issue rather than opening a new one. If it's not, open an issue describing the user-facing behavior, not the implementation. "I want per-app dictionaries because X" lands better than "let's add a dictionaryScope field."

## Areas that especially need help

- **Windows + Linux ports.** The hotkey, paste, and active-app detection are macOS-only today. The [roadmap](./ROADMAP.md) covers what's needed.
- **Language support.** Whisper supports 100+ languages; the UI is English-only.
- **Accessibility.** Screen reader support for the main window hasn't been audited.

## Questions

Open a GitHub Discussion or a draft issue. There's no Discord or Slack yet.
