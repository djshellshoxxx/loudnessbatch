# PROGRESS.md: Build Order

Work top to bottom. Tick a box only when it builds, runs and its tests pass. Add notes under each phase. Record any judgement calls under **Decisions** at the bottom.

## Phase 0: Scaffold
- [ ] Rust workspace, `rust-toolchain.toml`, crates `lb-core`, `lb-wasm`, `lb-cli` (empty but compiling)
- [ ] `app/` Vite + React + TS, pnpm, ESLint + Prettier, theme tokens CSS
- [ ] Tauri 2 added in `app/src-tauri`, `pnpm tauri dev` opens the Vite app
- [ ] `scripts/build.ps1` + `build.sh` skeletons (all steps, even if some are no-ops)
- [ ] CI ci.yml green on an empty app
- [ ] Pin and record tool versions in build.md section 2
- [ ] `README.md`, `LICENSE` (MIT), `CHANGELOG.md`, `.gitignore`

## Phase 1: Engine core (decode + loudness + peaks)
- [ ] symphonia integration, confirm AIFF and CAF support in the pinned version (engine.md 2.1), note result
- [ ] `sniff.rs` file type detection + extension mismatch
- [ ] Block reader, native-rate planar f32, raw integer view
- [ ] K-weighting + momentary/short-term/integrated/LRA
- [ ] True peak (polyphase) + per-block peaks + intersample overs
- [ ] Level analyzer (sample peak, RMS, crest, DC, clipping, silence)
- [ ] Unit tests testing.md 1.1 to 1.3 pass
- [ ] EBU 3341/3342 vectors fetched, expected.json transcribed, tests pass

## Phase 2: Engine: spectrum, stereo, quality, post
- [ ] Mix spectrum (Welch M/S, display curve, bands, tilt, centroid, band widths)
- [ ] Stereo analyzer (correlation + series, width, balance, mono-in-stereo, polarity)
- [ ] Container info + MP3 Xing/LAME/VBRI parser + tags + bitrate/mode
- [ ] Effective bit depth (int + float)
- [ ] Full-band spectrum + spectrogram thumbnail
- [ ] Bandwidth/cutoff, transcode, upsampling, grade with reasons
- [ ] Post-process (PLR, PSR, loud section), waveform
- [ ] TrackResult serde + round-trip test
- [ ] `gen-fixtures.py` + all testing.md 1.4 to 1.5 tests pass
- [ ] Stats, verdicts, tonal deviation sentences, similarity, streaming preview + tests

## Phase 3: CLI
- [ ] `lb-cli analyze` (table, json, csv, ndjson), rayon
- [ ] `quality`, `compare` (table), `info`, `refset`
- [ ] Exit codes + `--fail-on`
- [ ] crosscheck.py run on real files, results noted here

## Phase 4: WASM + web engine backend
- [ ] `lb-wasm` exports: analyze, analyze_pcm, decode_pcm, compute_stats, version
- [ ] SIMD build, size check
- [ ] Worker + WorkerPool + protocol (routing.md 14), cancel by terminate, crash respawn
- [ ] Browser decode fallback path (Opus etc.)
- [ ] WASM/native parity test

## Phase 5: UI shell + ingest + analysis queue
- [ ] PlatformBackend interface, web implementation (IndexedDB storage, drop with folders, pickers, save)
- [ ] Layout: top bar, left track list, centre tabs, transport bar, status bar
- [ ] Empty state + drop overlay zones
- [ ] Ingest, dedupe, classify, cache lookup, AnalysisQueue with progress
- [ ] Track list rows, statuses, right-click menu, include checkbox, colours

## Phase 6: Compare views
- [ ] Overview table + summary cards + plain-English notes
- [ ] Timeline canvas (waveform, LUFS lines, clip ticks, cue, loop, zoom)
- [ ] Tonal tab (uPlot curves, band, deviations, 7-band bars, similar refs)
- [ ] Dynamics tab
- [ ] Stereo tab (static parts)
- [ ] Quality tab (facts grid, spectrogram, full-band chart, verdict boxes)
- [ ] Streaming tab + targets editor

## Phase 7: Playback
- [ ] Player + graph (routing.md Part A), PcmCache, decodeForPlayback
- [ ] A/B in both position modes, click-free
- [ ] Level match modes
- [ ] Monitor matrix, band solo, master, safety clipper worklet
- [ ] meter-tap worklet, meters, vectorscope, correlation meter
- [ ] Cue, loop, output device picker
- [ ] Keyboard shortcuts

## Phase 8: Batch view
- [ ] Virtualised table, column picker, sort, filters, quick filters
- [ ] Side drawer, multi-select actions, footer totals

## Phase 9: Library, sessions, export
- [ ] Reference sets (save/switch/rename/delete), `.lbref` import/export
- [ ] Sessions save/open/autosave, file handles (Chromium), relink dialog
- [ ] CSV, JSON, HTML report, PNG export
- [ ] Settings dialog (all tabs), persistence, reset

## Phase 10: Desktop (Tauri)
- [ ] Tauri PlatformBackend: commands + events (routing.md 15), rayon pool, cancel
- [ ] Native drag-drop with paths, scan_folder, reveal in folder
- [ ] Binary PCM transfer for playback
- [ ] App-data JSON storage
- [ ] Capabilities/scopes locked down
- [ ] NSIS + MSI bundles, file associations, icons

## Phase 11: include.md checklist
- [ ] Help panel + docs/HELP.md
- [ ] Example `.lbref`
- [ ] Reset options
- [ ] Random reference
- [ ] MIDI learn on transport controls
- [ ] Tooltips everywhere
- [ ] Debug report + log viewer
- [ ] Easter egg
- [ ] Icon set
- [ ] Docs: INSTALL, BUILD, PRIVACY, CHANGELOG

## Phase 12: Web deploy + release
- [ ] PWA (offline precache incl. .wasm), CSP meta
- [ ] pages.yml deploys to `djshellshoxxx.github.io/loudnessbatch`
- [ ] Dockerfile + nginx.conf
- [ ] release.yml produces draft release with installer, MSI, CLI, checksums
- [ ] Manual QA checklist (testing.md 7) passed
- [ ] Tag v1.0.0

## Decisions
_(Claude Code: log judgement calls here with date and reason.)_
