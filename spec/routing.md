# routing.md: Audio Routing and Data Routing

Two kinds of routing:
- **Part A:** the playback signal graph (Web Audio API, identical in browser and Tauri WebView2).
- **Part B:** how files, jobs, results and events move between UI, workers, the Tauri backend and storage.

---

# Part A: Playback graph

## 1. AudioContext
- One `AudioContext({ latencyHint: 'playback' })`, created on first user gesture (autoplay policy).
- Context sample rate = device rate. Each track's `AudioBuffer` is created at the **file's native rate**; Web Audio resamples on playback. Analysis never uses this path.
- Output device: if `AudioContext.prototype.setSinkId` exists (Chromium, WebView2), show a device picker (`navigator.mediaDevices.enumerateDevices()`, kind `audiooutput`). Otherwise hide it.

## 2. Graph

```
  Slot A: AudioBufferSourceNode --> GainNode slotGainA (matchGain x fadeGain) --+
                                                                               +--> GainNode sumBus
  Slot B: AudioBufferSourceNode --> GainNode slotGainB (matchGain x fadeGain) --+
                                                                                     |
                                                                                     v
                                               MonitorMatrix (ChannelSplitter -> 4 GainNodes -> ChannelMerger)
                                                                                     |
                                                                                     v
                                     BandSolo (dry path GainNode  +  filtered path: 4 x BiquadFilterNode per edge)
                                                                                     |
                                                                                     v
                                                                  GainNode masterGain (-60..0 dB)
                                                                                     |
                                                                                     v
                                                     AudioWorkletNode "safety-clipper" (ear protection)
                                                                                     |
                                                     +-------------------------------+
                                                     v                               v
                                   AudioWorkletNode "meter-tap"            AudioContext.destination
                                   (peak, momentary LUFS, correlation,
                                    vectorscope points -> port.postMessage)
```

All graph nodes except sources are created once at startup and live for the session. Sources are one-shot and recreated on every play/seek (standard Web Audio practice).

## 3. Slots and the PCM cache
- Two slots, **A** and **B**. A is usually "My Mix (selected version)", B the selected reference. Any track can be loaded into either slot (UI: click a track = load into the active slot; Alt+click = load into the other slot).
- PCM comes from `engine.decodeForPlayback(file)` (worker or Tauri) as planar `Float32Array`s, then `new AudioBuffer({ numberOfChannels, length, sampleRate })` and `copyToChannel`.
- **PcmCache:** LRU of decoded AudioBuffers. Limit by memory (default 1.5 GB desktop, 600 MB web; setting). Slots A and B are pinned. A 4 min stereo 44.1 kHz track is about 85 MB.
- Pre-decode: when a track is selected in the list, decode it in the background so Play is instant.
- Mono files: AudioBuffer with 1 channel; Web Audio upmixes to both speakers (speakers interpretation). Matrix still works.

## 4. Level matching (matchGain)
Computed from each track's `loudness.integrated` (from analysis, not from the playback buffer).

| Mode | matchGain for a track |
|------|-----------------------|
| Off | 0 dB |
| Match to quietest (default) | `min(integrated of loaded A, B) - integrated(track)` (only cuts, never boosts) |
| Match all to quietest in session | same, but quietest across all loaded tracks, so switching among any refs stays matched |
| Match to target | `target - integrated(track)`, target default -14 LUFS, boost capped at +12 dB |
| Simulate platform | the platform's playback gain from engine.md section 13 |

- Applied on `slotGain` via `setTargetAtTime(linear, now, 0.01)`.
- If boosting would push `truePeakMax + gain` above 0 dBTP, show an amber "clipper active" badge (the safety clipper will catch it).
- Tracks with `-inf` loudness: matchGain = 0.

## 5. A/B switching

### 5.1 Linked position mode (same song versions)
- Both sources run at the same time from the same position. Inactive slot's fadeGain = 0.
- Switch = equal-power crossfade 25 ms: `fadeA = cos(t x pi/2)`, `fadeB = sin(t x pi/2)`, done with `setValueCurveAtTime` on a 32-point curve.
- Seek restarts both sources at the same offset (clamped to each buffer's duration; a shorter track goes silent past its end).

### 5.2 Independent position mode (different songs, default)
- Only the active slot's source runs. Each track stores its own `positionSec`.
- Switch: fade out active 15 ms, stop at fade end, remember its position, start the other slot's source at its stored position with a 15 ms fade in.
- Position of a running source = `offsetAtStart + (ctx.currentTime - startTime)` (wrapped inside loop region if looping).

### 5.3 Cue and loop
- Each track has optional `cueSec` and `loop {start, end}`.
- Jump to cue = seek to cueSec (both slots in Linked mode use each track's own cue if set).
- Loop: `source.loop = true; loopStart; loopEnd`, start with offset inside the loop.

## 6. Monitor matrix
`outL = a*inL + b*inR`, `outR = c*inL + d*inR`. Built from a ChannelSplitter(2), four GainNodes and a ChannelMerger(2). Coefficient changes ramp over 10 ms.

| Mode | a | b | c | d |
|------|---|---|---|---|
| Stereo | 1 | 0 | 0 | 1 |
| Mono (M) | 0.5 | 0.5 | 0.5 | 0.5 |
| Side (S) | 0.5 | -0.5 | 0.5 | -0.5 |
| Left only | 1 | 0 | 1 | 0 |
| Right only | 0 | 1 | 0 | 1 |
| Swap | 0 | 1 | 1 | 0 |

Set `channelCountMode = 'explicit'`, `channelCount = 2` on sumBus so mono sources are upmixed before the splitter.

## 7. Band solo
- Linkwitz-Riley 4th order (LR4) = two identical Butterworth 2nd-order `BiquadFilterNode`s in series, `Q = 0.7071`.

| Band | Filters |
|------|---------|
| Sub | LP 60 Hz x2 |
| Bass | HP 60 x2 -> LP 250 x2 |
| Mids | HP 250 x2 -> LP 4000 x2 |
| Highs | HP 4000 x2 |

- Implementation: a fixed chain of 4 biquads (HP, HP, LP, LP). For a band, set the frequencies. Unused stages are parked out of the way: unused HPs at 10 Hz, unused LPs at `min(22000, ctx.sampleRate * 0.45)` Hz (near transparent).
- Bypass vs solo: parallel **dry** GainNode and **filtered** GainNode, crossfade 20 ms between them. No graph rewiring while playing.

## 8. Master and safety
- `masterGain`: UI fader -60 to 0 dB, default -6 dB. Persisted.
- **safety-clipper** AudioWorklet: soft-knee clipper, transparent below -1 dBFS, tanh curve to a hard ceiling of -0.3 dBFS. Reports `clipping: true` (max 10 messages/s) so the UI lights a lamp. It also mutes for 500 ms if a block has a peak > +12 dBFS (ear protection against bugs).

## 9. meter-tap AudioWorklet
Runs on what you actually hear (post matrix, post band solo, post master). Per 128-frame render quantum it accumulates; every ~33 ms it posts one message:
```ts
{ peakL, peakR,           // dBFS, max since last message
  momentaryLufs,          // BS.1770 400 ms, K-weighting computed for ctx.sampleRate (same formulas as engine.md 4.1)
  correlation,            // over last 400 ms
  scope: Float32Array }   // 256 (x, y) pairs for the vectorscope, decimated; transferred
```
Worklet code lives in `app/src/audio/worklets/*.ts`, built as separate files by Vite (`new URL('./meter-tap.ts', import.meta.url)`).

## 10. Transport API (UI side)
`app/src/audio/Player.ts`:
```ts
class Player {
  init(): Promise<void>;
  load(slot: 'A'|'B', trackId: string): Promise<void>;
  play(): void; pause(): void; toggle(): void;
  seek(sec: number): void;
  switchTo(slot: 'A'|'B'): void; flip(): void;
  setPositionMode(m: 'linked'|'independent'): void;
  setMatchMode(m: MatchMode, target?: number): void;
  setMonitor(m: MonitorMode): void;
  setBandSolo(b: 'off'|'sub'|'bass'|'mids'|'highs'): void;
  setMaster(db: number): void;
  setLoop(trackId: string, loop: {start: number, end: number} | null): void;
  setCue(trackId: string, sec: number | null): void;
  jumpToCue(): void;
  setSinkId?(deviceId: string): Promise<void>;
  on(event: 'position'|'meter'|'clip'|'ended', cb: (...a: any[]) => void): () => void;
}
```
Position events at 30 Hz via `requestAnimationFrame` (not from the audio thread).

---

# Part B: Data routing

## 11. Ingest
```
drop / picker / CLI path
   -> PlatformBackend.ingestDrop()  -> FileRef[] (recursive; ignore hidden files, .asd, .reapeaks, .pkf, .DS_Store)
   -> filter by extension AND allow unknown extensions to be sniffed (engine decides)
   -> dedupe by (name, size, lastModified)
   -> classify: dropped on "My Mix" zone = mix, anywhere else = reference (or Batch view: plain batch item)
   -> tracks slice: status 'queued'
   -> cache lookup -> hit: status 'done' immediately
                   -> miss: AnalysisQueue.enqueue()
```

## 12. Cache key
`key = sha1(name | size | lastModified | ANALYSIS_VERSION | optionsHash)` (Web Crypto `subtle.digest` on web, `sha1` crate on desktop). `contentHash` in the result enables relinking moved files (data.md).

## 13. AnalysisQueue (UI)
- Priority: mixes first, then references in drop order, then batch items.
- Concurrency = `engine.concurrency()`.
- Each job: `AbortController`; progress throttled to 10 Hz into the store.
- Per-job states: `queued -> reading -> analyzing -> done | error | cancelled`.
- "Analyze again" removes the cache entry and re-enqueues.

## 14. Web Worker protocol (web backend)
Worker script `app/src/platform/web/engine.worker.ts` loads `lb-wasm` once.

Main -> worker:
```ts
{ type: 'analyze', jobId, name, size, bytes: ArrayBuffer /* transferred */, options }
{ type: 'analyzePcm', jobId, name, sampleRate, channels: Float32Array[] /* transferred */, meta, options }
{ type: 'decode', jobId, bytes: ArrayBuffer /* transferred */ }
```
Worker -> main:
```ts
{ type: 'progress', jobId, pct }                       // ≤ 10/s
{ type: 'done', jobId, result: TrackResult }
{ type: 'pcm', jobId, sampleRate, channels: Float32Array[] /* transferred */ }
{ type: 'needsBrowserDecode', jobId, sampleRateHint?: number }
{ type: 'error', jobId, code, message }
```
- **Cancel:** WASM runs synchronously, so cancelling a running job = `worker.terminate()` and spawn a fresh worker. Queued jobs are just removed.
- Files are read with `file.arrayBuffer()`. Files over 1 GB: warn and still try (v1). v1.1: stream with `FileReaderSync` + `Blob.slice` behind a `Read + Seek` shim.
- Crash safety: if a worker dies (`error` event), mark its job failed, respawn the worker, continue the queue.

## 15. Tauri protocol (desktop backend)
Commands (`app/src-tauri/src/commands.rs`):
```rust
#[tauri::command] async fn analyze_paths(app: AppHandle, jobs: Vec<JobSpec>, options: AnalysisOptions) -> Result<(), String>;
#[tauri::command] async fn cancel_job(job_id: String) -> Result<(), String>;
#[tauri::command] async fn decode_for_playback(path: String) -> Result<tauri::ipc::Response, String>; // binary, layout below
#[tauri::command] async fn scan_folder(path: String) -> Result<Vec<FileRefDto>, String>;
#[tauri::command] async fn reveal_in_folder(path: String) -> Result<(), String>;
```
- `analyze_paths` spawns each job on a rayon pool (threads = cores - 1) and returns immediately.
- Events emitted to the window: `lb://progress {jobId, pct}` (≤ 10/s per job), `lb://done {jobId, result}`, `lb://error {jobId, code, message}`.
- Cancel: each job holds an `Arc<AtomicBool>` checked in the progress callback.
- Playback PCM binary layout: `u32 sampleRate | u32 channels | u64 frames | f32 LE planar data`. JS wraps slices in `Float32Array` without copying.
- Drag-drop on desktop: use Tauri's window drag-drop event (gives real paths), not HTML5 drop.

## 16. Results -> UI
```
done result -> tracks slice (by id)
            -> StorageBackend.put('results', key, result)
            -> comparison slice recompute (debounced 150 ms): lb-wasm compute_stats(refs, mixes, targets)
            -> views re-render from selectors
```
Session state changes mark the session dirty (title bar dot). Autosave of the current session to storage every 30 s while dirty.
