# User Guide

Open the live app: https://djshellshoxxx.github.io/loudnessbatch/ (or serve the folder locally).

1. Add several files (mixes and references). Decoding happens in the browser through Web Audio.
2. Pick a mode: **Reference** (first file against the median and range of the others), **Album / EP
   consistency**, **DJ crate consistency**, or **Revision difference**.
3. Read the per-file values: integrated loudness (BS.1770-style K-weighting, 400 ms blocks, 75% overlap,
   -70 LUFS absolute and -10 LU relative gating), sample peak, **estimated** true peak, RMS, crest factor,
   clipped samples, DC offset and stereo correlation.
4. Start / middle / end section analysis gives a broad view of how the level changes.
5. Export CSV or JSON, or hand a file to TrackStats.

**Note:** the browser build's true peak is an estimate (4x interpolation). The stricter ITU/EBU true-peak
implementation belongs to the native engine in the spec.

**Targets:** EBU R 128 uses -23 LUFS for broadcast programmes. The tool does not assume one loudness target
is right for music production.
