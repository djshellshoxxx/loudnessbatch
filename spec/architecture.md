# architecture.md: One Engine, One UI, Three Shells

## 1. Overview

```
                       +-------------------------------+
                       |        lb-core (Rust)         |
                       |  decode (symphonia) + analyze |
                       +---------------+---------------+
             compiled to WASM          |          compiled native
          +----------------------------+---------------------------+
          |                            |                           |
   +------v-------+            +-------v--------+          +-------v-------+
   |   lb-wasm    |            | Tauri backend  |          |    lb-cli     |
   | wasm-bindgen |            |  (rayon pool)  |          |    (clap)     |
   +------+-------+            +-------+--------+          +---------------+
          |                            |
   Web Worker pool               Tauri commands/events
          |                            |
   +------v----------------------------v------+
   |       React UI (TypeScript, Vite)        |
   |  EngineBackend / PlatformBackend iface   |
   |  Web Audio playback graph + worklets     |
   +------------------------------------------+
        served as static site (GitHub Pages, PWA)
        or embedded in Tauri WebView2
```

## 2. Why this stack
- **Rust + symphonia** decodes WAV, MP3, OGG Vorbis, FLAC, AIFF, M4A (AAC, ALAC) and CAF in pure Rust, so the exact same decoder and math run in the browser (WASM) and natively. Results are identical on web and desktop.
- **Browser `decodeAudioData` is not used for analysis**: it resamples to the AudioContext rate and hides the original format, which would break true peak, bit depth and quality detection. It is only a fallback for codecs symphonia can't decode (Opus, HE-AAC), and those results are marked "decoded by browser, resampled".
- **Tauri 2** wraps the same React build in a native window (WebView2 on Windows), gives real file paths and runs the engine natively. Small installer (around 10 MB vs 100+ MB for Electron).
- **React + Vite + TypeScript**: common, well supported, fast builds.

## 3. Packages

| Package | Lang | Role |
|---------|------|------|
| `crates/lb-core` | Rust | Decoding, analysis, comparison, stats, targets, serde result types. No I/O beyond `Read + Seek`. `#![forbid(unsafe_code)]` |
| `crates/lb-wasm` | Rust | `wasm-bindgen` wrapper: `analyze(bytes, name, options, progress_cb) -> JsValue`, `decode_pcm(bytes) -> {sampleRate, channels[]}`, `version()` |
| `crates/lb-cli` | Rust | CLI on lb-core + rayon |
| `app/` | TS/React | The UI, shared by web and desktop |
| `app/src-tauri` | Rust | Tauri 2 app: commands for analyze (paths), decode for playback, file dialogs, app-data storage, watch folder |

Rust workspace at repo root (`Cargo.toml` with members `crates/*` and `app/src-tauri`).

## 4. Backend interfaces (UI side)

The UI never imports `@tauri-apps/*` outside `app/src/platform/tauri/`.

```ts
// app/src/platform/types.ts
export interface FileRef {
  id: string;              // stable id (uuid)
  name: string;
  size: number;
  lastModified: number;
  path?: string;           // desktop only
  handle?: FileSystemFileHandle; // web Chromium only
  file?: File;             // web, while in memory
}

export interface EngineBackend {
  analyze(file: FileRef, opts: AnalysisOptions,
          onProgress: (pct: number) => void, signal: AbortSignal): Promise<TrackResult>;
  decodeForPlayback(file: FileRef, signal: AbortSignal): Promise<DecodedPcm>; // {sampleRate, channels: Float32Array[]}
  concurrency(): number;
}

export interface StorageBackend {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  put<T>(store: StoreName, key: string, value: T): Promise<void>;
  delete(store: StoreName, key: string): Promise<void>;
  list(store: StoreName): Promise<string[]>;
}

export interface PlatformBackend {
  kind: 'web' | 'desktop';
  engine: EngineBackend;
  storage: StorageBackend;
  pickFiles(opts: { folders: boolean }): Promise<FileRef[]>;
  ingestDrop(e: DragEvent): Promise<FileRef[]>;   // recursive folder walk
  saveFile(name: string, data: Blob, mime: string): Promise<void>; // download or native save dialog
  reacquire(ref: FileRef): Promise<FileRef | null>; // re-open a file from a saved session
  revealInFolder?(ref: FileRef): Promise<void>;     // desktop only
  watchFolder?(path: string, cb: (f: FileRef) => void): () => void; // desktop, v1.1
}
```

`app/src/platform/index.ts` picks the implementation at startup: `'__TAURI_INTERNALS__' in window ? tauri : web`.

### 4.1 Web implementation
- **Engine:** `WorkerPool` of `min(navigator.hardwareConcurrency - 1, 8)` (minimum 1) dedicated workers, each loading `lb-wasm`. Details in routing.md section 6.
- **Storage:** IndexedDB via the `idb` package. Stores: `results`, `refsets`, `sessions`, `settings`, `handles`.
- **Files:** `File` objects from drops/pickers. On Chromium, `FileSystemFileHandle`s are saved to IndexedDB so sessions can reopen files after `requestPermission()`.
- **Save:** `showSaveFilePicker` when available, else `<a download>` blob link.

### 4.2 Desktop implementation (Tauri)
- **Engine:** Tauri commands call lb-core on a rayon pool. Files are read from disk by path (streamed, no full copy into memory). Progress and results come back as Tauri events (routing.md section 7).
- **Storage:** JSON files under the Tauri app data dir (`%APPDATA%\com.djshellshoxxx.loudnessbatch\`), same store names as folders.
- **Playback decode:** Rust decodes and returns PCM as raw bytes through a Tauri IPC binary response (`tauri::ipc::Response`), converted to `Float32Array` in JS.
- **Plugins:** `tauri-plugin-dialog`, `tauri-plugin-fs` (scoped), `tauri-plugin-opener` (reveal in folder), `tauri-plugin-updater` (v1.1).

## 5. State management (UI)
- **Zustand** store, split into slices: `tracks`, `analysisQueue`, `comparison`, `playback`, `ui`, `settings`.
- Derived data (reference stats, verdicts, tonal deviations) is computed in TS from `TrackResult`s with memoized selectors. The math for stats/verdicts must match `lb-core::model` exactly; to guarantee this, `lb-wasm` also exports `compute_stats(results_json)` and the UI uses that rather than re-implementing it. (Desktop uses the same WASM build for this; it's cheap.)

## 6. Static web hosting and PWA
- Vite `base: '/loudnessbatch/'` for GitHub Pages.
- `vite-plugin-pwa` (Workbox) precaches all assets including the `.wasm` file, so the app works offline after first load.
- No cross-origin isolation needed (no SharedArrayBuffer). Keep it that way so Pages works without custom headers.
- Content Security Policy via `<meta>`: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'`.

## 7. Self-hosting
A `Dockerfile` builds the static site and serves it with nginx (for running on a home server/Unraid). See build.md.

## 8. Versioning
- Single version number in `Cargo.toml` workspace, mirrored to `app/package.json` and `tauri.conf.json` by `scripts/bump-version`.
- `ANALYSIS_VERSION` constant in lb-core, separate from the app version, bumped whenever any metric's math changes (invalidates caches).
