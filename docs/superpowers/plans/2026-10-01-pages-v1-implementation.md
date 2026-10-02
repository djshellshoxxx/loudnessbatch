# LoudnessBatch Pages V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the browser/GitHub Pages portion of LoudnessBatch now, while preserving the repo's existing Rust/Tauri/CLI roadmap.

**Architecture:** A static client-side web app decodes user-selected audio with Web Audio, resamples analysis to 48 kHz, computes batch loudness/dynamics/stereo/spectral measurements in pure JavaScript, and renders reference/album/crate/revision views. No files leave the browser.

**Tech Stack:** HTML, CSS, ES modules, Web Audio API, OfflineAudioContext, Canvas/SVG-free DOM charts, GitHub Pages.

**Spec:** `spec/INDEX.md`, `spec/engine.md`, `spec/gui.md`, plus `spec/circuit-drift-crosslinks.md` and the approved feature addendum.

## Global Constraints

- Keep the existing native/Tauri/CLI specification intact.
- Use ITU-R BS.1770-5 two-stage 400 ms / 75% overlap integrated-loudness gating.
- Do not claim standards-compliant true peak unless the implementation meets the required oversampling filter; browser V1 labels its simpler result `estimated true peak`.
- No audio uploads, analytics, runtime CDN, or account requirement.
- Analysis failure for one track must not abort the batch.

## Review Focus

- Silence/near-silence must not yield NaN/infinite UI failures.
- K-weighting/gating must use 48 kHz analysis samples and -70 LUFS absolute / -10 LU relative gates.
- Mono and stereo buffers must both analyze correctly.
- Album/crate/reference summaries must remain meaningful with only 1–2 tracks.
- Revision comparisons must never imply sample-accurate null testing unless files are truly aligned.

---

### Task 1: Measurement core
Create `audio-core.js` and tests for IIR filtering, gated integrated loudness, sample peak, RMS/crest, correlation and band energy.

### Task 2: Batch decode and dashboard
Create static UI and implement local multi-file decode, progress, per-track results, distributions and reference medians/ranges.

### Task 3: Workflow modes
Add Reference, Album/EP Consistency, DJ Crate Consistency, Revision Difference and Section Analysis views using the same measurements.

### Task 4: Export and ecosystem
Add CSV/JSON export, TrackStats contextual handoff, README and Pages workflow while preserving existing native specs.

### Task 5: Verification
Run core tests/syntax checks, verify empty/silent/mono test cases and inspect Pages workflow.
