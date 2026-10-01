# LoudnessBatch: Spec Index

LoudnessBatch batch-analyzes reference tracks and your own mix, then shows where your mix sits against the references on loudness, dynamics, tonal balance and stereo image. It plays everything back level-matched so you can A/B fairly.

It ships two ways from **one codebase**:

1. **Web app** (static site, GitHub Pages, installable PWA, works offline). Files are analyzed inside the browser and never uploaded.
2. **Downloadable desktop app** (Tauri 2, Windows first, macOS/Linux later). Same UI, native engine, real file paths, watch folders.

Plus a command-line tool (`lb-cli`) built from the same engine.

Supported audio: **WAV, MP3, OGG (Vorbis), FLAC, and Apple formats: AIFF/AIFC, M4A (AAC and ALAC / Apple Lossless), CAF.** See engine.md section 2.

## Read order for Claude Code

Read these in order before writing any code. Re-read the relevant file before starting each phase in PROGRESS.md.

| # | File | What it covers |
|---|------|----------------|
| 1 | `INDEX.md` | This file. Map and ground rules |
| 2 | `spec.md` | Product: problem, users, scope, features, non-goals |
| 3 | `architecture.md` | How web, desktop and CLI share one engine and one UI |
| 4 | `engine.md` | Analysis engine (Rust): decoding, every metric with exact math, comparison model |
| 5 | `routing.md` | Audio playback graph (A/B, level match, monitor modes, band solo) and data/message routing between UI, workers and Tauri |
| 6 | `gui.md` | Layout, every panel, interactions, shortcuts, menus |
| 7 | `theme.md` | Colours, fonts, sizes, chart styling |
| 8 | `data.md` | Sessions, reference sets, cache, exports, settings, platform targets |
| 9 | `cli.md` | `lb-cli` commands and output |
| 10 | `include.md` | Standard checklist every one of my projects gets |
| 11 | `build.md` | Repo layout, toolchain, build.ps1, CI, Pages deploy, desktop releases, Docker |
| 12 | `testing.md` | Test vectors, tolerances, performance targets, manual QA |
| 13 | `PROGRESS.md` | Phased build order with checkboxes. Update as work is completed |

## Ground rules

1. **Stack:** Rust (engine, CLI, Tauri backend), TypeScript + React + Vite (UI), Tauri 2 (desktop shell). See architecture.md.
2. **Engine first.** `lb-core` is a pure Rust library with no UI, no filesystem assumptions, and it must compile to both native and `wasm32-unknown-unknown`. Every metric is unit-tested before any UI shows it.
3. **Standards are not optional.** Loudness and true peak follow ITU-R BS.1770-4/5 and EBU Tech 3341/3342 exactly as written in engine.md. Do not "simplify" the gating.
4. **Never block the UI thread.** Analysis runs in Web Workers (web) or Rust threads (desktop). The audio thread (AudioWorklet) never allocates or posts more than ~30 messages a second.
5. **One UI.** The React app must not import Tauri APIs directly. It talks to an `EngineBackend` / `PlatformBackend` interface (architecture.md). Web and desktop each implement it.
6. **Privacy.** The web build makes zero network requests after load except fetching its own static assets. No analytics, no CDNs at runtime (bundle fonts and libraries).
7. **Deliver whole files.** When changing a file, output the full file, not a diff.
8. **Keep PROGRESS.md honest.** Tick a box only when the feature builds, runs, and its tests pass.
9. **When the spec is silent,** pick the simplest behaviour that fits the rest of the spec, write it under "Decisions" in PROGRESS.md, and carry on.

## Name

**LoudnessBatch.** Repo: `djshellshoxxx/loudnessbatch`. Web: `https://djshellshoxxx.github.io/loudnessbatch/`.

| Thing | Name |
|-------|------|
| Desktop executable | `LoudnessBatch.exe` |
| CLI | `lb-cli` |
| Rust crates | `lb-core`, `lb-wasm`, `lb-cli`, Tauri app crate `loudnessbatch` |
| Session file | `.lbsession` |
| Shareable reference profile | `.lbref` |
| Tauri identifier | `com.djshellshoxxx.loudnessbatch` |
