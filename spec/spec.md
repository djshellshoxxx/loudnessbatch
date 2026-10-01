# spec.md: Product Specification

## 1. Problem

Producers check mixes against commercial reference tracks, but the tools for it are either:

- plugins that sit in the DAW and see one track at a time, or
- web uploaders that measure one file's LUFS and nothing else (and want you to upload your unreleased music to their server).

Nobody gives a quick answer to: "Here are 12 DnB tunes I like and my bounce. Where am I off?" And nobody tells you that half your "WAV" references are actually 128 kbps MP3s someone converted.

LoudnessBatch does both in one window: drop a folder of references and a mix, get a table and charts comparing the mix to the group, see the real quality of every file, and listen to everything level-matched. Nothing leaves your computer.

## 2. Users

- Home-studio producers (FL Studio, REAPER, Ableton, any DAW), genre-focused (DnB, dubstep, house, hip hop...).
- People mastering their own tracks for streaming.
- Mix engineers comparing revision bounces against a client's reference list.
- DJs and collectors auditing a music folder for low-quality or fake-lossless files.

## 3. Core workflows

### 3.1 Compare a mix to references
1. Open the web app or desktop app. Drag a folder of references onto the window.
2. Drag your bounce onto the "My Mix" area.
3. Analysis runs in the background, one file per CPU core. Results fill in as each file finishes.
4. Overview tab: each metric with your value, reference median, range, difference and a green/amber/red verdict.
5. Tonal Balance tab: your spectrum against the shaded reference range, with plain-English notes ("2.3 dB heavy at 80 to 140 Hz").
6. Space to play, Tab to flip between your mix and the selected reference, level-matched.
7. Save the reference set ("DnB 2026") and the session. Export a report.

### 3.2 Batch audit a folder (the "Batch" view)
1. Drag any folder (refs, sample packs, a DJ library).
2. Batch view shows a sortable, filterable table: file type, codec, sample rate, bit depth, bitrate, duration, LUFS, true peak, quality grade, flags.
3. Filter "Problems only": fake lossless, upsampled, padded bit depth, extension mismatch, clipping, low bitrate.
4. Export the table as CSV.

## 4. Features (v1.0)

### 4.1 Input
- Drag and drop files or folders anywhere. Folders scanned recursively (web: via `DataTransferItem.webkitGetAsEntry()` / File System Access API; desktop: native paths).
- **Supported formats:**

| Format | Extensions | Codec(s) |
|--------|------------|----------|
| WAV | .wav, .wave | PCM 8/16/24/32-bit int, 32/64-bit float, WAVE_FORMAT_EXTENSIBLE, RF64/BW64 |
| MP3 | .mp3 | MPEG-1/2/2.5 Layer III, CBR/VBR/ABR |
| OGG | .ogg, .oga | Vorbis (Opus in Ogg via fallback, see engine.md) |
| FLAC | .flac | FLAC 8 to 24-bit, Ogg FLAC |
| Apple | .aif, .aiff, .aifc | AIFF PCM, AIFF-C (sowt, fl32, fl64) |
| Apple | .m4a, .mp4, .aac | AAC-LC, HE-AAC (fallback), ALAC (Apple Lossless) |
| Apple | .caf | Core Audio Format: PCM, ALAC, AAC |

- Mono, stereo and multichannel (BS.1770 weights; downmixed for spectrum/stereo).
- Unsupported or corrupt files show an error row, never crash the batch.

### 4.2 Metrics per track
Full definitions in engine.md.

| Group | Metrics |
|-------|---------|
| **File & Quality** | Detected file type (by content, not extension), extension mismatch flag, container, codec, encoder (e.g. LAME 3.100, iTunes), sample rate, stored bit depth, **effective bit depth**, channels, duration, file size, **bitrate** (nominal and average), CBR/VBR/ABR mode, lossless vs lossy, **effective bandwidth (cutoff frequency)**, **fake lossless / transcode detection** with estimated source bitrate, **upsampling detection**, fake stereo (L = R), inverted channel, MP3 gapless info, metadata tags (title, artist, album, year, BPM, key, ISRC, cover art present), **Quality grade A to F** |
| Loudness | Integrated LUFS, Short-term max, Momentary max, Loudness Range (LRA), Loud-section loudness |
| Peaks | True peak (dBTP, per channel and max), Sample peak, Intersample-over count, Clip events |
| Dynamics | RMS, Crest factor, PLR, PSR (median and minimum) |
| Tonal | 7-band balance, Spectral tilt, Spectral centroid, smoothed spectrum curve |
| Stereo | Correlation (overall, 5th percentile), Width, Per-band width, Low-end mono check, L/R balance |
| Health | DC offset, Leading/trailing silence |
| Time series | Momentary and short-term loudness every 100 ms, correlation series, waveform overview, high-res spectrogram summary for the quality view |

### 4.3 Comparison
- One or more "My Mix" tracks (versions v1, v2, v3...) against a reference set.
- Per-metric reference stats: median, min, max, P10, P25, P75, P90.
- Verdict per metric: green / amber / red / grey.
- Tonal overlay: reference median, shaded P10 to P90 band, your curve, deviations highlighted and described.
- "Most similar references" ranking by tonal distance.
- Version columns so you can see if v3 moved closer than v2.
- Quality warnings on references (e.g. "3 of 12 references are lossy or transcoded; their Air band is excluded from the tonal range"). Setting: exclude low-quality refs from stats automatically (default on for grades D and F).

### 4.4 Streaming preview
For each platform preset (Spotify, Apple Music, YouTube, Amazon Music, Tidal, Deezer, SoundCloud, plus user-defined): gain the platform would apply, resulting loudness, and true peak after gain. Targets are an editable JSON with a "last verified" date.

### 4.5 Playback (routing.md)
- Play any track. A/B between mix and selected reference with a click-free crossfade.
- Level match: Off, Match to quietest (default, attenuation only), Match to target LUFS, Simulate platform.
- Position mode: Linked (same timestamp) or Independent (each track remembers its own spot).
- Cue point per track (e.g. the drop), loop region per track.
- Monitor: Stereo, Mono, Side, Left, Right, Swap. Band solo: Sub, Bass, Mids, Highs.
- Output meter (peak + momentary LUFS of what you hear) and a live vectorscope.

### 4.6 Library
- Reference Sets: named, reusable groups. Stored metrics persist even if the audio is moved or deleted.
- Shareable reference profiles (`.lbref`): metrics only, no audio.
- Sessions (`.lbsession`): mixes + reference set + cue points + UI state.

### 4.7 Export
HTML report (self-contained), CSV (one row per file, every scalar metric including all File & Quality fields), JSON (everything), PNG snapshot of the current chart, copy-to-clipboard.

### 4.8 Web vs desktop differences

| Capability | Web (Chromium) | Web (Firefox/Safari) | Desktop |
|------------|----------------|----------------------|---------|
| Analyze dropped files/folders | Yes | Yes | Yes |
| Re-open files from a saved session without re-dropping | Yes (File System Access handles) | No, prompts to re-drop (metrics still shown) | Yes |
| Output device picker | Yes (`setSinkId`) | No (system default) | Yes |
| Watch folder (v1.1) | No | No | Yes |
| Install offline | PWA | PWA (Safari: Add to Dock) | Installer |
| Large files (> 1 GB) | Warn | Warn | Yes, streamed |
| Speed | WASM in workers | WASM in workers | Native, about 2x faster |

### 4.9 CLI
`lb-cli` runs the same engine headless. See cli.md.

## 5. v1.1 / later
- Analyze a selected region only (drag on waveform).
- Blind A/B mode (random assignment, guess which is your mix, score at the end).
- Watch folder on desktop: new bounces auto-added as mix versions.
- BPM and key detection.
- Section detection (intro/drop/breakdown) from the loudness curve.
- Duplicate detection across a batch (same audio, different file).
- macOS signed/notarized build, Linux AppImage.

## 6. Non-goals
- Not a plugin.
- Never modifies audio files. No "auto-match EQ", no converting.
- No accounts, no cloud processing, no telemetry.
- No live input metering from a DAW.

## 7. Success criteria
- 20 references + 1 mix (WAV/FLAC), all results visible in under 15 s on an 8-core PC in Chrome, under 8 s on desktop.
- Integrated loudness within 0.1 LU of ffmpeg `ebur128` and pyloudnorm on the same files.
- Transcode detector flags a FLAC made from a 128 kbps MP3 and does not flag a genuine 44.1/16 CD rip of a full-bandwidth master (testing.md).
- A/B switch is click-free and level-matched within 0.1 dB.
- A first-time user gets from launch to a comparison without opening help.
