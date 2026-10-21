# Architecture and Design Rationale

Sources: README, `spec/INDEX.md`, `spec/architecture.md`, `CLAUDE.md`, `audio-core.js`.

- **One spec, two surfaces.** The web app and the planned desktop app and CLI come from one codebase and one spec. The browser build is an immediately usable slice, not a replacement for the native engine (README, spec).
- **Local-only analysis.** Files are analysed in the browser and never uploaded (spec, README "Privacy").
- **Standards-aligned loudness.** Integrated loudness follows the BS.1770 structure: K-weighting, 400 ms blocks, 75% overlap, absolute and relative gating (README and `audio-core.js`).
- **Honest limits.** The browser true peak is labelled as an estimate (4x interpolation in `estimatedTruePeak`). The stricter ITU/EBU true peak is kept for the native engine.
- **No single loudness target.** The README states that EBU R 128 targets are for broadcast and do not imply a music target.
- **Pure analysis functions.** The DSP is written as plain functions over channel arrays, which keeps them testable without a browser.
