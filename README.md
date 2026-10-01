# LoudnessBatch

Batch-analyze your reference tracks and your mix, see exactly where your mix sits against them, check the real quality of every file, and A/B everything level-matched.

**Web app** (runs in your browser, files never leave your computer) and a **downloadable desktop app** (Windows first) from one codebase, plus a command-line tool.

> Status: **spec stage.** Nothing is built yet. The full spec lives in [`spec/`](spec/INDEX.md).

## What it does

- **Loudness:** integrated LUFS, short-term and momentary max, loudness range, loud-section loudness (ITU-R BS.1770 / EBU R128)
- **Peaks and dynamics:** true peak, sample peak, intersample overs, clipping, RMS, crest factor, PLR, PSR
- **Tonal balance:** your mix's spectrum against the reference range, 7-band balance, tilt, plain-English notes like "2.3 dB heavy at 80 to 140 Hz"
- **Stereo:** correlation, width per band, low-end mono check, balance
- **File quality:** real file type, codec, encoder, bitrate (CBR/VBR/ABR), sample rate, stored vs effective bit depth, bandwidth cutoff, fake-lossless / transcode detection, upsampling detection, quality grade A to F
- **Streaming preview:** what Spotify, Apple Music, YouTube, Amazon, Tidal, Deezer and SoundCloud would do to your track
- **Level-matched A/B playback** with mono/side/band solo monitoring
- **Batch view:** audit a whole folder, filter to problems only, export CSV

## Formats

WAV, MP3, OGG (Vorbis), FLAC, and Apple formats: AIFF/AIFC, M4A (AAC and ALAC / Apple Lossless), CAF.

## Spec

Start at [`spec/INDEX.md`](spec/INDEX.md). Build order and status: [`spec/PROGRESS.md`](spec/PROGRESS.md).

## License

MIT
