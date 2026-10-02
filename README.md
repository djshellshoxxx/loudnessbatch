# LoudnessBatch

**LoudnessBatch by Circuit Drift Labs** batch-analyzes mixes and reference tracks locally in the browser and shows how they compare on loudness, peak level, RMS, dynamics and stereo behaviour.

Live web app: https://djshellshoxxx.github.io/loudnessbatch/

Circuit Drift Labs: https://circuitdriftlabs.djshellshoxxx.github.io/

## Browser V1

The current GitHub Pages build provides:

- local multi-file decoding through Web Audio
- 48 kHz analysis path
- integrated loudness with BS.1770-style K-weighting, 400 ms blocks, 75% overlap, −70 LUFS absolute gating and −10 LU relative gating
- sample peak
- **estimated** true peak for browser V1
- RMS
- crest factor
- clipped-sample count
- DC offset
- stereo correlation
- Reference mode: first file vs reference median/range
- Album / EP Consistency mode
- DJ Crate Consistency mode
- Revision Difference mode
- broad Start / Middle / End section analysis
- CSV and JSON export
- contextual handoff to TrackStats

The browser build deliberately labels its interpolated true-peak value as an estimate. The repository's native-engine specification retains the stricter ITU/EBU true-peak implementation and broader desktop/CLI roadmap.

## Standards

The integrated-loudness implementation follows the current ITU-R BS.1770-5 gating structure. EBU R 128 uses −23 LUFS as a broadcast programme target; LoudnessBatch does not imply that one loudness target is universally correct for music production.

References:

- ITU-R BS.1770-5: https://www.itu.int/rec/R-REC-BS.1770-5-202311-I/en
- EBU R 128: https://tech.ebu.ch/publications/r128

## Privacy

Audio is decoded and analyzed locally. There is no account, upload service or analytics path for audio-derived values.

## Native / desktop roadmap

The detailed `spec/` directory remains the authority for the Rust `lb-core`, WebAssembly, Tauri desktop app and `lb-cli` roadmap. The Pages V1 is an immediately usable web surface, not a replacement for those specifications.

## Related Circuit Drift Labs tools

- TrackStats: https://djshellshoxxx.github.io/trackstats/
- Transposition Calculator: https://djshellshoxxx.github.io/TranspositionCalc/
- MIDItest: https://djshellshoxxx.github.io/Miditest/

Experiments:

- Binaural Web Beats: https://djshellshoxxx.github.io/binerualwebeats/
- BabbleForge: https://djshellshoxxx.github.io/babbleforge/

## Development

The Pages surface is static HTML/CSS/JavaScript.

```bash
node tests/audio-core.test.mjs
```

The larger multi-platform build is documented under `spec/INDEX.md`.

## License

See `LICENSE`.
