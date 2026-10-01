# engine.md: Analysis Engine (`lb-core`)

Pure Rust library. Compiles for native targets and `wasm32-unknown-unknown`. No threads, no filesystem, no clock inside lb-core: callers hand it a `Read + Seek` source and get a `TrackResult` back. Threading lives in the callers (Web Workers, rayon).

## 1. Module layout

```
crates/lb-core/src/
  lib.rs                 // pub use; pub const ANALYSIS_VERSION: u32 = 1;
  error.rs               // LbError (thiserror)
  options.rs             // AnalysisOptions (serde)
  decode/
    mod.rs               // open_source(), probe, DecodedStream iterator of f32 blocks + raw int view
    sniff.rs             // magic-byte file type detection
    mp3_info.rs          // Xing/Info/VBRI/LAME header parser
    container_info.rs    // per-format extras: WAV fmt chunk, AIFF COMM, MP4 esds/©too, Vorbis ident/comment, CAF desc
  analysis/
    mod.rs               // Analyzer trait, run_analysis() single-pass driver
    loudness.rs          // BS.1770 K-weighting, momentary, short-term, integrated, LRA
    true_peak.rs         // polyphase oversampling peak + per-block peaks
    level.rs             // sample peak, RMS, DC, clipping, silence
    spectrum.rs          // Welch mid/side, bands, tilt, centroid, display curve
    hires_spectrum.rs    // full-band max-hold + average PSD, spectrogram thumbnail (quality checks)
    stereo.rs            // correlation, width, balance, fake-stereo detection
    bitdepth.rs          // effective bit depth from raw integer / float samples
    waveform.rs          // min/max overview
    post.rs              // PLR, PSR, loud section
  quality/
    mod.rs               // QualityReport assembly + grade
    bandwidth.rs         // cutoff detection, steepness
    transcode.rs         // fake lossless + source bitrate estimate
    upsample.rs          // upsampling detection
  model/
    result.rs            // TrackResult (serde)
    stats.rs             // ReferenceStats
    compare.rs           // verdicts, tonal deviation, similarity
    targets.rs           // platform targets + streaming preview
  util/
    biquad.rs, fir.rs, percentile.rs, db.rs, sliding_max.rs
```

Crates: `symphonia` (formats + codecs, see 2.1), `rustfft` (works in WASM), `serde`, `serde_json`, `thiserror`, `xxhash-rust` (xxh3). No `std::thread`, no `std::fs` in lb-core.

## 2. Decoding

### 2.1 symphonia
Enable features for every supported format: WAV, AIFF, CAF, ISO MP4 (M4A), OGG, FLAC, MP3 (MPA), and codecs PCM, ADPCM, FLAC, MP3, AAC (LC), ALAC, Vorbis. In symphonia 0.5.x that is `features = ["all"]` or the equivalent individual flags (`wav`, `aiff`, `caf`, `isomp4`, `ogg`, `flac`, `mp3`, `aac`, `alac`, `vorbis`, `pcm`, `adpcm`). **Phase 1 task:** pin the newest 0.5.x and confirm AIFF and CAF readers are present in that version. If CAF isn't, add a small CAF chunk parser in `container_info.rs` that feeds PCM/ALAC packets to symphonia's codecs, or fall back as in 2.2.

### 2.2 Fallback decoders
- **Web:** if symphonia fails with `Unsupported` (e.g. Opus, HE-AAC v2, some exotic CAF), the worker returns `NeedsBrowserDecode`. The UI decodes with `OfflineAudioContext.decodeAudioData` at the file's sample rate when it is known from `sniff`/container info (create the OfflineAudioContext with that `sampleRate`), otherwise 48 kHz, then passes PCM to `lb-wasm::analyze_pcm()`. Result gets the flag `decodedBy: "browser"` and a warning that bit depth and some quality checks are unavailable.
- **Desktop/CLI:** if `ffmpeg` is on PATH (or set in settings), pipe `ffmpeg -v error -i <file> -f f32le -acodec pcm_f32le -` into `analyze_pcm()`. Same flags (`decodedBy: "ffmpeg"`).

### 2.3 Reading
- Decode packet by packet; convert to planar f32 blocks of up to 65,536 frames.
- Keep the **raw integer view** when the decoder output is integer (`AudioBufferRef::S16/S24/S32/U8`) so `bitdepth.rs` sees the true samples before conversion.
- Analyze at the file's native sample rate. Never resample for analysis.
- Supported rates 8,000 to 384,000 Hz. Outside: `UnsupportedSampleRate`.
- Decode errors mid-stream (corrupt frames): skip the packet, count it in `decodeErrors`, continue. More than 1% bad packets: add warning. Zero decodable packets: fail.

### 2.4 Channel handling
- Mono: loudness on one channel, weight 1.0 (BS.1770 strict). Option `mono_as_dual_mono` (default false) adds +3.01 dB. Stereo metrics "n/a (mono)".
- Stereo: L, R.
- Multichannel: BS.1770 weights L, R, C = 1.0; Ls, Rs = 1.41; LFE excluded. Channel order from symphonia's channel map, fallback SMPTE (L R C LFE Ls Rs). For spectrum/stereo, downmix: Lo = L + 0.707C + 0.707Ls, Ro = R + 0.707C + 0.707Rs.

## 3. Single-pass driver

```rust
pub fn analyze<R: Read + Seek + Send + Sync + 'static>(
    src: R, name: &str, file_size: u64, opts: &AnalysisOptions,
    progress: &mut dyn FnMut(f32) -> bool,   // return false = cancel
) -> Result<TrackResult, LbError>;

pub fn analyze_pcm(channels: Vec<Vec<f32>>, sample_rate: u32, meta: ExternalMeta,
                   opts: &AnalysisOptions, progress: &mut dyn FnMut(f32) -> bool)
    -> Result<TrackResult, LbError>;

pub fn decode_all<R: Read + Seek + Send + Sync + 'static>(src: R) -> Result<DecodedPcm, LbError>; // for playback
```

Flow: `sniff -> probe -> container_info -> for each block { every analyzer.process(block) ; progress } -> analyzer.finish() -> post -> quality -> TrackResult`.

Progress callback is called at most every 1% (or every block, whichever is rarer). Analyzers are streaming state machines; only small per-100 ms series are kept in memory.

## 4. Loudness (ITU-R BS.1770-4/5, EBU Tech 3341/3342)

### 4.1 K-weighting
Two cascaded biquads per channel, f64 state, transposed Direct Form II. Coefficients for any `fs`:

**Stage 1, high shelf**
```
f0 = 1681.974450955533
G  = 3.999843853973347
Q  = 0.7071752369554196
K  = tan(pi * f0 / fs)
Vh = 10^(G / 20)
Vb = Vh^0.4996667741545416
a0 = 1 + K/Q + K^2
b0 = (Vh + Vb*K/Q + K^2) / a0
b1 = 2*(K^2 - Vh) / a0
b2 = (Vh - Vb*K/Q + K^2) / a0
a1 = 2*(K^2 - 1) / a0
a2 = (1 - K/Q + K^2) / a0
```

**Stage 2, high pass (RLB)**
```
f0 = 38.13547087602444
Q  = 0.5003270373238773
K  = tan(pi * f0 / fs)
d  = 1 + K/Q + K^2
b  = [1, -2, 1]
a1 = 2*(K^2 - 1) / d
a2 = (1 - K/Q + K^2) / d
```

At 48 kHz these reproduce the BS.1770 table (verified numerically, unit test to 1e-9):
```
Stage 1: b = [1.53512485958697, -2.69169618940638, 1.19839281085285]
         a = [1, -1.69065929318241, 0.73248077421585]
Stage 2: b = [1, -2, 1]
         a = [1, -1.99004745483398, 0.99007225036621]
```

### 4.2 Blocks
- Sum K-weighted squared samples per channel into 100 ms sub-blocks (`round(fs * 0.1)` samples; carry remainders across reads so boundaries are exact).
- Momentary block = 4 sub-blocks (400 ms), hop 100 ms. Short-term block = 30 sub-blocks (3 s), hop 100 ms.
- Per block, mean square per channel `z_i`. Block loudness `L = -0.691 + 10*log10(sum_i G_i * z_i)`. Sum of 0 gives `-inf`.

### 4.3 Outputs
- **Momentary series** and **Short-term series**: one value per 100 ms hop (f32). Short-term series empty for files under 3 s (Short-term max `n/a`).
- **Momentary max**, **Short-term max**.
- **Integrated (gated):**
  1. All momentary blocks (400 ms, 75% overlap); store each block's weighted power (f64).
  2. Absolute gate: keep blocks with L > -70 LUFS.
  3. Relative threshold = loudness of the mean power of the kept blocks, minus 10 LU.
  4. Integrated = loudness of the mean power of blocks above both gates.
  5. None pass: `-inf` ("silent").
- **LRA (EBU Tech 3342):**
  1. Short-term blocks (3 s, hop 100 ms). Absolute gate -70 LUFS.
  2. Relative gate = loudness of the mean power of the absolute-gated blocks, minus 20 LU.
  3. LRA = P95 - P10 of remaining short-term loudness values (linear interpolation percentiles). Fewer than 2 values: `n/a`.

## 5. True peak (BS.1770 Annex 2)
- Oversampling: `fs < 96000 -> 4x`, `fs < 192000 -> 2x`, else 1x.
- Polyphase FIR per channel: windowed sinc, Kaiser beta 8, 12 taps per phase, cutoff at original Nyquist, each phase normalised to unity DC gain. Precompute per factor.
- Track max |y| per channel, and per 100 ms sub-block (`tp_blocks`, aligned with loudness sub-blocks).
- Outputs: true peak per channel and max (dBTP, `20*log10`). Values above 0 dBTP reported as-is.
- **Intersample overs** = count of 100 ms sub-blocks where oversampled peak > 1.0 but sample peak ≤ 1.0.

## 6. Level
- **Sample peak** per channel and max (dBFS).
- **RMS** (dBFS) over all channels, excluding leading/trailing silence: `20*log10(sqrt(mean(x^2)))`. Sine at 0 dBFS peak = -3.01. Option `rms_aes17` adds +3.01 (default false).
- **Crest factor** = sample peak max (dB) - RMS (dB).
- **DC offset** per channel = mean, as % of full scale. Warn if |DC| > 0.1%.
- **Clip events** per channel: runs of ≥ 3 consecutive samples with |x| ≥ 0.99988 (-0.001 dBFS). Count runs. Keep times of the first 50 for timeline markers.
- **Leading/trailing silence:** seconds before the first and after the last sample with |x| > -60 dBFS.

## 7. Mix-oriented spectrum (`spectrum.rs`)
- Mid `M = (L+R)/2`, Side `S = (L-R)/2`. Mono: M only.
- Welch: FFT size N = next power of two ≥ `fs / 3` (16384 at 44.1/48 kHz). Hann, 50% overlap. Skip frames with mid RMS < -60 dBFS. Accumulate `|X[k]|^2` (f64) for M and S. Average and divide by window power `sum(w^2)`.
- **Band values are summed bin power** (pink noise reads flat on every curve and band). Bins straddling an edge are split proportionally.
- **Display curve:** 1/6-octave bands on a 1/24-octave grid, 20 Hz to 20 kHz (~240 points, capped at fs/2), dB.
- **Normalisation for comparison:** shift each curve so the mean of its dB values from 100 Hz to 10 kHz is 0.
- **7-band balance** (dB relative to total mid power 20 Hz to 20 kHz): Sub 20-60, Bass 60-250, Low-mid 250-500, Mid 500-2k, Upper-mid 2k-4k, Presence 4k-6k, Air 6k-20k (clamp to fs/2). Air marked unreliable if the quality check found a cutoff below 19 kHz.
- **Spectral tilt** (dB/oct): 1/3-octave summed bands (ISO centres 50 Hz to 16 kHz), least-squares slope of dB vs log2(f). Pink ≈ 0, white ≈ +3.
- **Spectral centroid** (Hz): power-weighted mean frequency of mid, 20 Hz to 20 kHz.
- **Per-band stereo width:** Sub < 120 Hz, Low 120-500, Mid 500-4k, High > 4k: `10*log10(sum S_power / sum M_power)` dB. **Low-end mono check:** Sub band width > `low_end_width_warn_db` (default -15 dB) gives a warning.

## 8. Stereo
- **Correlation:** `r = sum(L*R) / sqrt(sum L^2 * sum R^2)` over non-silent samples. 0/0 = n/a.
- **Correlation series:** per 400 ms block, hop 100 ms. **Correlation P5** = 5th percentile (blocks with mid RMS < -60 dBFS ignored).
- **Width:** `10*log10(sum S^2 / sum M^2)` dB.
- **Balance:** `10*log10(sum L^2 / sum R^2)` dB. Warn if |balance| > 1 dB.
- **Fake stereo:** max |L - R| < 1e-6 over the whole file: flag `monoInStereo`.
- **Inverted channel:** max |L + R| < 1e-6 and file not silent: flag `polarityInverted`.

## 9. File & Quality analysis

### 9.1 File type sniffing (`sniff.rs`)
Read the first 64 bytes (skip ID3v2 tag on MP3 by its size field):

| Magic | Type |
|-------|------|
| `RIFF....WAVE`, `RF64....WAVE`, `BW64....WAVE` | WAV (RIFF / RF64 / BW64) |
| `FORM....AIFF` / `FORM....AIFC` | AIFF / AIFF-C |
| `caff` | CAF |
| `....ftyp` with brand `M4A `, `M4B `, `mp42`, `isom` | MP4/M4A |
| `OggS` | Ogg (then codec from first packet: `\x01vorbis`, `OpusHead`, `\x7FFLAC`) |
| `fLaC` | FLAC |
| `ID3` or frame sync `0xFFE` with valid layer III header | MP3 |
| `0xFFF` ADTS sync | raw AAC |

`detectedType` vs extension: mismatch gives flag `extensionMismatch` ("named .wav but is MP3").

### 9.2 Container & codec info (`container_info.rs`, `mp3_info.rs`)
Fill `FileInfo`:
- `container`, `codec` (e.g. "PCM 24-bit int", "IEEE float 32", "FLAC", "ALAC", "AAC-LC", "HE-AAC", "MP3", "Vorbis", "Opus"), `lossless: bool`.
- `sampleRate`, `channels`, `channelLayout`, `durationSec`, `fileSize`.
- `storedBitDepth`: from WAV fmt / AIFF COMM / FLAC STREAMINFO / ALAC magic cookie / CAF desc. `null` for lossy.
- **Bitrate:**
  - `avgBitrateKbps` = audio payload bytes x 8 / duration / 1000 (exclude ID3/APE/metadata/cover art when the container tells us where audio data starts and ends; otherwise file size).
  - `nominalBitrateKbps`: MP3 first frame header or Xing/LAME; Vorbis ident header `bitrate_nominal`; MP4 `esds` `avgBitrate`; lossless = null.
  - `bitrateMode`: MP3 `Info` tag = CBR, `Xing` = VBR (LAME tag VBR method byte refines to ABR/VBR-old/VBR-new), `VBRI` = VBR (Fraunhofer); no tag: scan up to the first 200 frames, all same bitrate = CBR else VBR. Vorbis: VBR. AAC: CBR/VBR from esds max vs avg ratio (max == avg = CBR).
  - Lossless: `compressionRatio` = PCM size (fs x ch x bits x duration / 8) / audio payload bytes.
- **Encoder:** LAME tag string (`LAME3.100`), LAME preset/VBR quality, LAME lowpass (tag stores lowpass / 100 Hz), encoder delay & padding (gapless). MP4 `©too` atom (e.g. "iTunes 12.x", "Lavf"). Vorbis vendor string. FLAC vendor string. WAV `ISFT` in LIST INFO.
- **Metadata tags** (from symphonia metadata + parsers): title, artist, album, year, genre, BPM, key (TKEY / `initialkey`), ISRC, comment, cover art present (bool + mime + pixel size). No cover image stored in results.

### 9.3 Effective bit depth (`bitdepth.rs`)
Integer sources: OR together the two's-complement bit patterns of every sample (masked to stored width). `unusedLsbs = trailing_zeros(or_value)` (all-zero file = n/a). `effectiveBitDepth = storedBitDepth - unusedLsbs`.
Float sources (WAV float, CAF float): for n in [8, 16, 20, 24], if every sample x satisfies `x * 2^(n-1)` is an integer (tolerance 1e-9), effective = smallest such n; else "float (> 24-bit)".
Flags: `paddedBitDepth` if effective < stored (e.g. "24-bit file with 16-bit content").

### 9.4 Full-band spectrum (`hires_spectrum.rs`)
Separate from 7, because quality checks need full band to fs/2 with frame max-hold:
- FFT 4096 (scale x2 for fs > 96 kHz), Hann, 50% overlap, channel power summed (L^2 + R^2).
- Skip frames with RMS < -60 dBFS.
- Per frame, reduce to 50 Hz-wide bins from 0 to fs/2. Keep: **average PSD** (dB) and **max-hold PSD** (dB) per 50 Hz bin.
- **Spectrogram thumbnail:** 400 time columns x 128 rows (linear 0 to fs/2), u8 = clamp((dB + 120) x 255/120). Stored base64 in the result for the Quality view. About 50 KB.

### 9.5 Bandwidth / cutoff (`bandwidth.rs`)
1. Work on max-hold PSD from 5 kHz to fs/2.
2. `floor` = 5th percentile of those bins. `cutoffHz` = highest bin centre where max-hold > floor + 15 dB.
3. `steepnessDb` = mean average-PSD in [cutoff - 600, cutoff - 200] minus mean in [cutoff + 200, cutoff + 600] Hz.
4. `brickwall = steepnessDb > 25`.
5. `fullBand = cutoffHz ≥ 0.95 x min(fs/2, 20000)`.

### 9.6 Transcode / fake lossless (`transcode.rs`)
For lossless containers (WAV, AIFF, FLAC, ALAC, CAF PCM):
- `likelyTranscoded = brickwall && !fullBand && 11000 ≤ cutoffHz ≤ 20600`.
- Confidence: High if steepness > 40 dB and the cutoff is constant across time (check cutoff per 10 s segment of the spectrogram thumbnail; std dev < 300 Hz), else Medium.
- Estimated source (heuristic, encoder lowpass defaults, label as "estimate"):

| Cutoff | Likely source |
|--------|---------------|
| < 11.5 kHz | ≤ 64 kbps lossy |
| 11.5 to 15.5 kHz | 96 to 112 kbps lossy |
| 15.5 to 16.5 kHz | 128 kbps MP3 (older encoders) |
| 16.5 to 17.8 kHz | 128 to 160 kbps MP3 (LAME) |
| 17.8 to 19.3 kHz | 192 kbps MP3 / ~128 kbps AAC |
| 19.3 to 19.9 kHz | 224 to 256 kbps |
| 19.9 to 20.6 kHz | 320 kbps MP3 / V0 / 256 kbps AAC |

For lossy files: `bitrateMismatch` if the cutoff implies a much lower source than the nominal bitrate (e.g. 320 kbps MP3 with a 16 kHz cutoff = "upconverted from a low-bitrate file").

Caveat text shown in the UI: some genuine masters are band-limited (old recordings, deliberate low-pass). Flag is a hint, not proof.

### 9.7 Upsampling (`upsample.rs`)
If fs > 48000: for each candidate source rate c in [44100, 48000, 88200, 96000] with c < fs:
- above = mean average-PSD from 1.02 x c/2 to 0.98 x fs/2
- below = mean average-PSD from 0.5 x c/2 to 0.9 x c/2
- If below - above > 60 dB and brickwall-like edge within 2% of c/2: `upsampledFrom = c` (take the lowest c that matches).
Flag "Not genuine hi-res: upsampled from 44.1 kHz".

### 9.8 Quality grade
```
F: decode failure rate > 1%, OR lossy < 96 kbps avg, OR lossless likelyTranscoded with estimated source ≤ 160 kbps
D: lossy 96 to 159 kbps, OR lossless likelyTranscoded with estimated source 192 to 256 kbps, OR bitrateMismatch
C: lossy 160 to 255 kbps, OR lossless likelyTranscoded at 320/V0 level
B: lossy ≥ 256 kbps (≥ 192 kbps for AAC/Vorbis/Opus) with consistent bandwidth,
   OR lossless with paddedBitDepth / upsampledFrom (fine as CD quality, not real hi-res)
A: lossless, effective bit depth ≥ 16, fullBand or no brickwall, no transcode/upsample flags
```
Grade comes with a list of reasons (strings) so the UI can explain it. Mix-related problems (clipping, DC, true peak) are **not** part of the grade; they're shown as warnings.

## 10. Post-process
- **PLR** = true peak max - integrated.
- **PSR series:** for each short-term hop, max true peak over the same 3 s window (sliding max over `tp_blocks`, monotonic deque) in dB minus short-term loudness. Skip hops below the integrated relative gate. Report **PSR median** and **PSR min**.
- **Loud section (LS):** gated short-term values (above the LRA relative gate), keep those ≥ their 75th percentile, LS = loudness of their mean power.

## 11. TrackResult (serde, camelCase JSON)

```rust
pub struct TrackResult {
    pub analysis_version: u32,
    pub id: String,                 // set by caller
    pub name: String,
    pub content_hash: String,       // xxh3 of size + first 1 MiB + last 1 MiB
    pub decoded_by: DecodedBy,      // Native | Browser | Ffmpeg
    pub file: FileInfo,             // 9.1, 9.2 incl. tags, encoder, bitrate
    pub quality: QualityReport,     // effective bit depth, cutoff, steepness, transcode, upsample,
                                    // monoInStereo, polarityInverted, extensionMismatch, grade, reasons
    pub loudness: Loudness,         // integrated, st_max, m_max, lra, loud_section
    pub peaks: Peaks,               // tp per ch/max, sp per ch/max, isp_overs, clip events + times
    pub dynamics: Dynamics,         // rms, crest, plr, psr_median, psr_min
    pub tonal: Tonal,               // bands[7], tilt, centroid, curve_freq, curve_mid_db, curve_side_db
    pub stereo: Option<Stereo>,     // None for mono
    pub health: Health,             // dc per ch, lead/tail silence, decode_errors
    pub series: Series,             // momentary, short_term, correlation, tp_block_db (f32, 100 ms hop)
    pub waveform: Waveform,         // 2000 min/max per channel
    pub spectrogram: Spectrogram,   // 400 x 128 u8, base64
    pub warnings: Vec<Warning>,     // { code, message, severity }
}
```
- n/a = `null`; silence = the string `"-inf"` (custom serde for f64).
- JSON round-trip test must be exact.

## 12. Reference statistics and comparison (`model/`)

### 12.1 Stats
For every scalar metric across included references (skip null and -inf): n, median, min, max, P10, P25, P75, P90. For curves: per-point median, P10, P90, min, max of the normalised mid curve.
References with grade D/F are excluded from **tonal** stats when `exclude_low_quality_refs` is on (default on); their loudness/dynamics still count.

### 12.2 Verdicts
- **Green:** inside [min, max] (if n ≥ 5 use [P10, P90]).
- **Amber:** outside, within tolerance of the nearest edge. **Red:** beyond. **Grey:** n < 2 or value missing.

| Metric | Tolerance |
|--------|-----------|
| Integrated, Short-term max, Loud section | 1.0 LU |
| LRA | 1.5 LU |
| True peak max | 0.5 dB |
| PLR, PSR median, PSR min, Crest | 1.0 dB |
| Each tonal band | 1.5 dB |
| Tilt | 0.5 dB/oct |
| Centroid | 15% |
| Correlation, Corr P5 | 0.1 |
| Width, band widths | 2 dB |

Absolute warnings (icon, not verdict): TP > -1.0 dBTP, clip events > 0, DC > 0.1%, low-end width over threshold, |balance| > 1 dB, mix sample rate differs from most refs, mix is lossy.

### 12.3 Tonal deviation
Per curve point: deviation = mix dB minus nearest edge of [P10, P90] (0 inside). Regions with |deviation| > 1.5 dB spanning ≥ 1/3 octave become sentences ("Mix is 2.3 dB heavy at 80 to 140 Hz"). Show the top 5 by area (dB x octaves).

### 12.4 Similarity
Distance = RMS difference of normalised mid curves, 40 Hz to 16 kHz (dB). Show the 3 nearest references.

## 13. Streaming preview
```
gain = target - integrated
if gain > 0:
    if !platform.boosts_quiet: gain = 0
    else: gain = max(0, min(gain, platform.peak_ceiling_dbtp - true_peak_max))
playback_lufs = integrated + gain
tp_after      = true_peak_max + gain
```
Show gain ("-4.2 dB, turned down"), playback loudness, TP after gain, and a warning if `true_peak_max > peak_ceiling_dbtp`.

## 14. Performance targets
- 4 min 44.1 kHz stereo WAV: < 1.0 s native single core, < 2.5 s WASM single worker.
- 4 min 320 kbps MP3: < 1.5 s native, < 3.5 s WASM.
- Memory per analysis < 64 MB native; WASM linear memory < file size + 64 MB.
- Build WASM with `opt-level = 3`, `lto = true`, `codegen-units = 1`, and `+simd128` target feature (all current browsers support WASM SIMD).
