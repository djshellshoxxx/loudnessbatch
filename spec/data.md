# data.md: Storage, Files and Exports

All JSON is UTF-8, camelCase, with a top-level `"schema"` string and integer `"schemaVersion"`. Loaders must accept older schema versions (migrate on load) and refuse newer ones with a clear message.

## 1. Stores

| Store | Web (IndexedDB `loudnessbatch` db) | Desktop (app data dir) | Content |
|-------|-----------------------------------|------------------------|---------|
| `results` | object store, key = cache key | `cache/<key>.json.gz` | TrackResult |
| `refsets` | object store, key = refset id | `refsets/<id>.json` | ReferenceSet |
| `sessions` | object store, key = session id | `sessions/<id>.json` (+ any user-saved `.lbsession` anywhere) | Session |
| `settings` | single key `settings` | `settings.json` | Settings |
| `handles` | key = FileRef id, value = FileSystemFileHandle | n/a | Chromium only |
| `targets` | single key `targets` | `targets.json` | Platform targets (user edited) |

Desktop app data dir: `%APPDATA%\com.djshellshoxxx.loudnessbatch\` (Windows), via Tauri `app_data_dir()`.

Web: call `navigator.storage.persist()` on first save so the browser doesn't evict data.

## 2. Result cache
- Key and content hash: routing.md section 12, engine.md section 11.
- Web: results stored as JS objects (structured clone). Desktop: gzip JSON (`flate2`).
- Size cap: settings `cacheMaxMb` (default 500). On startup, if over the cap, evict least recently accessed (`lastAccess` field updated on read).
- "Clear cache" button in Settings > Storage.

## 3. ReferenceSet
```json
{
  "schema": "loudnessbatch.refset",
  "schemaVersion": 1,
  "id": "uuid",
  "name": "DnB 2026",
  "genre": "Drum & Bass",
  "notes": "Rollers and some neuro. Mastered loud.",
  "created": "2026-09-30T20:15:00Z",
  "modified": "2026-09-30T20:40:00Z",
  "tracks": [
    {
      "refId": "uuid",
      "displayName": "Artist - Title",
      "colour": "#B39DDB",
      "included": true,
      "cueSec": 61.2,
      "source": { "name": "track.flac", "size": 41234567, "lastModified": 1727712000000, "path": "D:\\Refs\\track.flac" },
      "contentHash": "xxh3:9f0c...",
      "result": { "...": "full TrackResult minus series/waveform/spectrogram (summary only)" }
    }
  ]
}
```
- Each track keeps a **summary result** (all scalars + tonal curve + bands), so stats work even when the audio is gone. Playback needs the file (relink).
- `path` only on desktop. Web uses the `handles` store with `refId`.

## 4. `.lbref` (shareable reference profile)
Same as ReferenceSet with `"schema": "loudnessbatch.refprofile"` and **no** `source.path`, no handles, no tags beyond displayName. Purpose: share the numbers without sharing audio. Import creates a new ReferenceSet with tracks marked `audioMissing: true` (stats work, playback disabled, relink possible).

## 5. Session (`.lbsession`)
```json
{
  "schema": "loudnessbatch.session",
  "schemaVersion": 1,
  "id": "uuid",
  "name": "DnB bounce v3",
  "created": "...", "modified": "...",
  "mixes": [
    { "trackId": "uuid", "displayName": "v3", "colour": "#4FC3F7",
      "source": { "name": "...", "size": 0, "lastModified": 0, "path": "..." },
      "contentHash": "...", "cueSec": null, "loop": null }
  ],
  "referenceSetId": "uuid",
  "referenceOverrides": [ { "refId": "uuid", "included": false } ],
  "batch": [ { "trackId": "uuid", "source": { "...": "..." }, "contentHash": "..." } ],
  "playback": { "matchMode": "quietest", "target": -14, "positionMode": "independent",
                "monitor": "stereo", "bandSolo": "off", "slotA": "uuid", "slotB": "uuid" },
  "ui": { "view": "compare", "tab": "tonal", "leftPanelWidth": 300, "tonal": { "showRefs": false, "tilt": 0 } }
}
```
Opening a session: for each source, try (desktop) path, (web) stored handle with `requestPermission({mode:'read'})`, else look for a cached result by cache key or contentHash. Missing audio = row shown with relink icon; cached metrics still displayed.

## 6. Relinking
Relink dialog lists missing files. User picks a folder (or files). Matching order: same name + size, then contentHash (hash the candidates), then same name only (confirm). Matches update the session/refset.

## 7. Settings
```json
{
  "schema": "loudnessbatch.settings", "schemaVersion": 1,
  "theme": "system", "uiScale": 1.0, "tooltips": true, "reduceMotion": false,
  "audio": { "sinkId": "default", "masterDb": -6, "pcmCacheMb": 600 },
  "analysis": { "threads": 0, "monoAsDualMono": false, "rmsAes17": false,
                "excludeLowQualityRefs": true, "lowEndWidthWarnDb": -15, "ffmpegPath": "" },
  "storage": { "cacheMaxMb": 500 },
  "shortcuts": { "flip": "Tab", "...": "..." },
  "midi": [ { "control": "flip", "type": "cc", "channel": 1, "number": 20 } ],
  "lastRefSetId": "uuid",
  "firstRunDone": true
}
```
`threads: 0` = auto.

## 8. Platform targets (`targets.json`)
Shipped default in `app/src/data/targets.default.json`. User edits stored separately; "Reset to defaults" restores.
```json
{
  "schema": "loudnessbatch.targets", "schemaVersion": 1,
  "lastVerified": "2026-09",
  "note": "Platforms change these. Check before relying on them.",
  "platforms": [
    { "id": "spotify",    "name": "Spotify (Normal)", "targetLufs": -14, "peakCeilingDbtp": -1, "boostsQuiet": true  },
    { "id": "spotifyLoud","name": "Spotify (Loud)",   "targetLufs": -11, "peakCeilingDbtp": -1, "boostsQuiet": true  },
    { "id": "apple",      "name": "Apple Music",      "targetLufs": -16, "peakCeilingDbtp": -1, "boostsQuiet": false },
    { "id": "youtube",    "name": "YouTube",          "targetLufs": -14, "peakCeilingDbtp": -1, "boostsQuiet": false },
    { "id": "amazon",     "name": "Amazon Music",     "targetLufs": -14, "peakCeilingDbtp": -2, "boostsQuiet": false },
    { "id": "tidal",      "name": "Tidal",            "targetLufs": -14, "peakCeilingDbtp": -1, "boostsQuiet": false },
    { "id": "deezer",     "name": "Deezer",           "targetLufs": -15, "peakCeilingDbtp": -1, "boostsQuiet": false },
    { "id": "soundcloud", "name": "SoundCloud",       "targetLufs": -14, "peakCeilingDbtp": -1, "boostsQuiet": false }
  ],
  "tolerances": { "integrated": 1.0, "lra": 1.5, "truePeak": 0.5, "plr": 1.0, "band": 1.5,
                  "tilt": 0.5, "centroidPct": 15, "correlation": 0.1, "width": 2.0 }
}
```
Tolerances from engine.md 12.2 live here so they're user tunable.

## 9. Exports

### 9.1 CSV
- One row per track. Header row with units in brackets: `name,role,type,codec,sampleRateHz,storedBits,effectiveBits,avgKbps,nominalKbps,bitrateMode,lossless,durationSec,sizeBytes,integratedLufs,shortTermMaxLufs,momentaryMaxLufs,lraLu,loudSectionLufs,truePeakDbtp,samplePeakDbfs,ispOvers,clipEvents,rmsDbfs,crestDb,plrDb,psrMedianDb,psrMinDb,sub,bass,lowMid,mid,upperMid,presence,air,tiltDbOct,centroidHz,correlation,correlationP5,widthDb,balanceDb,cutoffHz,steepnessDb,transcodeVerdict,estimatedSource,upsampledFrom,grade,flags,title,artist,album,year,bpm,key,isrc,path`
- RFC 4180 quoting, `.` decimal, 2 decimals for dB values. `-inf` written as `-inf`, n/a as empty.
- Batch view exports exactly the visible columns and filtered rows instead (option to export all columns).

### 9.2 JSON
`{ "schema": "loudnessbatch.export", "schemaVersion": 1, "app": "1.0.0", "analysisVersion": 1, "session": {...}, "stats": {...}, "tracks": [TrackResult...] }`.

### 9.3 HTML report
- Single self-contained file: inline CSS, inline SVG charts (rendered from the same data, not screenshots), no scripts required to read it (a small inline script for light/dark toggle is OK).
- Sections: header (session, date, app version), summary cards, Overview table with verdicts, Tonal chart + band chart + deviation notes, Dynamics table, Stereo table, Streaming table, Quality table for all files with grades and flags, appendix explaining each metric (from the tooltip text).
- Template in `app/src/export/report/` as TS functions returning strings.

### 9.4 PNG
Current chart rendered to canvas at 2x, saved as PNG (`canvas.toBlob`).

## 10. Debug report (include.md)
Zip (via `fflate`): `system.json` (app version, analysis version, platform kind, user agent / OS, CPU threads, audio context sample rate and base latency, sinkId support, WASM SIMD support), `settings.json`, `log.txt` (last 1,000 lines of the in-app ring-buffer logger), `files.json` (for each loaded track: name, size, type, codec, status, error code; paths replaced by `<redacted>` unless "include paths" is ticked). Never includes audio.
