# Developer Guide

## Run and test

```bash
node tests/audio-core.test.mjs     # the only test file; 1 test passes on this snapshot
python3 -m http.server 8000        # static site; open http://localhost:8000
```

The app is plain HTML, CSS and JavaScript (`index.html`, `app.js`, `ui-assistance.js`, `styles.css`) with the
DSP in `audio-core.js`. CI: `.github/workflows/static.yml`.

## Spec-driven work

`CLAUDE.md` says the repo is built from `spec/`. Read `spec/INDEX.md` for the read order and ground rules
before changing code. `spec/PROGRESS.md` tracks status. Use `spec/testing.md` for the test plan.

## Notes

- `audio-core.js` exports pure functions (K-weighting biquads, mean square, peaks, RMS, estimated true peak,
  integrated loudness, section loudness, correlation, percentile and median). Keep them pure so they stay testable.
- Sample rate is fixed at 48 kHz in the browser path; `integratedLufs` throws for other rates.
