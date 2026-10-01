# gui.md: Interface

One React UI for web and desktop. Desktop window default 1440 x 900, min 1100 x 700. Web is responsive (section 9).

## 1. Top-level layout

```
+------------------------------------------------------------------------------------------+
| [icon] LoudnessBatch               Session: DnB bounce v3 *   [Compare|Batch]  ⚙  ?      |  Top bar (48 px)
+----------------------+-------------------------------------------------------------------+
|  MY MIX              |  Timeline: waveform + short-term LUFS line + playhead + cue/loop  |  (140 px)
|   ● v3  -8.9 LUFS  A |-------------------------------------------------------------------|
|   ○ v2  -9.6 LUFS    | [Overview] [Tonal] [Dynamics] [Stereo] [Quality] [Streaming]       |
|  ------------------  |                                                                   |
|  REFERENCES  [DnB 26▾]|                    active tab content                            |
|   ● Ref 1  -7.8    B |                                                                   |
|   ● Ref 2  -8.4      |                                                                   |
|   ◐ Ref 3  analyzing |                                                                   |
|   ...                |                                                                   |
|  [+ Add refs]        |                                                                   |
+----------------------+-------------------------------------------------------------------+
| ▶ ❚❚  00:42 / 04:12 | A ⇄ B | Match: Quietest ▾ | Linked/Indep | St M S L R ⇆ | Sub Bass Mid Hi | Vol ─●─ | meter | scope |  Transport (64 px)
+------------------------------------------------------------------------------------------+
| Analyzing 3 of 14 ▓▓▓▓░░░  |  Output: Speakers (48 kHz)  |  Cache 212 MB  |  v1.0.0       |  Status bar (24 px)
+------------------------------------------------------------------------------------------+
```

Left panel width 300 px, resizable (220 to 480), persisted.

## 2. Empty state
Centre shows a large drop zone split in two: **"Drop your mix here"** (left, mix colour) and **"Drop reference tracks or a folder here"** (right). Under it: "Files stay on your computer. Nothing is uploaded." Buttons: Add mix, Add references, Open session, Load reference set. Supported formats line: "WAV, MP3, OGG, FLAC, AIFF, M4A (AAC/ALAC), CAF".

Dropping anywhere on the window when not empty: an overlay appears with the same two zones (and a third "Batch audit" zone when in Batch view).

## 3. Track list (left panel)

Row (32 px): colour swatch, name (ellipsis, full path in tooltip), integrated LUFS (mono font), quality grade chip (A green, B teal, C amber, D orange, F red), slot badge (A/B) if loaded, status (spinner + % while analyzing, ⚠ on error).

- Click: select (detail views follow) and load into the active slot.
- Alt+Click: load into the other slot.
- Double-click: play from cue (or start).
- Checkbox on hover (refs only): include in stats.
- Drag to reorder; drag between Mix and Reference sections to reclassify.
- **Right-click menu:** Play, Load into A, Load into B, Set as mix / Set as reference, Set colour, Rename display name, Set cue at playhead, Clear cue, Analyze again, Copy metrics, Reveal in folder (desktop), Remove.
- Reference set dropdown: switch set, Save set as..., Rename, Duplicate, Export `.lbref`, Import `.lbref`, Delete.
- Missing-file rows (session reopened, file not reachable): italic, "relink" icon. Click opens a picker; on web Chromium tries stored handles first.

## 4. Timeline (top of centre)
- Canvas. Waveform (mid min/max) in the selected track's colour at 35% opacity.
- Short-term LUFS line over it (right axis -40 to 0 LUFS), momentary as a faint line (toggle).
- Horizontal dashed line at the track's integrated value; second dashed line at ref median integrated.
- Red ticks for clip events, orange ticks for intersample overs.
- Playhead; click to seek; drag with Shift to set loop; right-click: set cue here / clear loop.
- Cue marker = small flag. Loop region = shaded band.
- Mouse wheel zooms horizontally, drag scrolls when zoomed.

## 5. Tabs

### 5.1 Overview
Table. Rows grouped (Loudness, Peaks, Dynamics, Tonal, Stereo). Columns:

| Metric | My Mix (each version) | Ref median | Ref range | Δ vs median | Verdict |

- Verdict chip: green ✓ / amber ! / red ✕ / grey –, with tooltip "Inside the reference range" / "0.6 LU above range (tolerance 1.0)" etc.
- Toggle "Show every reference" adds a column per reference (horizontal scroll, sticky first column).
- Hover a row: tiny strip plot under the cell showing each ref as a dot and the mix as a diamond.
- Above the table: **summary cards**: Integrated, True peak, LRA, Tonal match score (100 - 10 x tonal distance to median, clamped 0..100), plus up to 3 plain-English notes ("Your mix is 1.4 LU quieter than the quietest reference", "Low end is wider than all references").

### 5.2 Tonal
- Chart (uPlot): x log 20 Hz to 20 kHz, y dB (auto, default -24 to +12). Shaded P10 to P90 band (ref colour, 20% opacity), median line (ref colour), mix curve(s) (mix colour; older versions dashed). Regions outside the band tinted red/blue (heavy/light).
- Toggles: show individual refs (thin lines), show side curve, tilt compensation slider (0 to +4.5 dB/oct, view only).
- Hover crosshair: frequency, mix dB, median, band.
- Below: 7-band bar chart (mix bars, ref range whiskers) and the deviation sentences list. "Most similar references" list (top 3 with distance in dB, click to load into B).

### 5.3 Dynamics
- Box plots of short-term loudness distribution per track (mix first), with LRA marked.
- PSR over time line chart for selected track vs ref median PSR (horizontal band).
- Table: RMS, Crest, PLR, PSR median, PSR min, Loud section, Momentary max.

### 5.4 Stereo
- Bars: width per band (Sub, Low, Mid, High) for mix vs ref range.
- Correlation over time chart for selected track.
- Live vectorscope (larger version) and correlation meter driven by meter-tap.
- Warnings list: low-end width, balance, mono-in-stereo, polarity inverted.

### 5.5 Quality
Per selected track (and a comparison mini-table for all tracks):
- **Header:** big grade letter with reasons list ("Lossless FLAC, 16-bit effective, full bandwidth to 21.6 kHz").
- **File facts grid:** Detected type (and extension mismatch warning), container, codec, encoder, sample rate, stored bit depth, effective bit depth, channels, duration, size, avg bitrate, nominal bitrate, CBR/VBR/ABR, compression ratio (lossless), gapless info (MP3), tags (title, artist, album, year, BPM, key, ISRC), cover art yes/no with size.
- **Spectrogram** thumbnail (400 x 128, rendered with a perceptual colour map) with a horizontal line at the detected cutoff and a label ("Cutoff 16.0 kHz, brickwall 42 dB").
- **Full-band spectrum** chart (average and max-hold) 0 to fs/2 linear axis, cutoff marker, candidate source rate marker if upsampled.
- **Verdict boxes:** Transcode ("Likely from ~128 kbps MP3, High confidence"), Upsampling, Padded bit depth, Fake stereo, Polarity. Each with the caveat tooltip.

### 5.6 Streaming
Table rows = platforms (from targets), columns: Target, Boosts quiet?, Gain applied, Playback loudness, TP after gain, Warning. Mix versions as column groups. Toggle "include references" to see how refs get turned down too (great for showing that "louder" refs all end up at -14 anyway). Button: "Edit targets..." opens a JSON editor dialog with validation.

## 6. Batch view
Switch in the top bar (`Compare | Batch`). For auditing folders.
- Virtualised table (TanStack Table + TanStack Virtual), handles 10,000 rows.
- Default columns: Status, Name, Folder, Type, Codec, Sample rate, Bit depth (stored/effective), Bitrate (avg), Mode, Duration, Integrated, True peak, LRA, Cutoff, Grade, Flags (icons).
- Column picker: any scalar metric from TrackResult can be shown.
- Sort by any column; multi-sort with Shift.
- Filter bar: text search, Type, Codec, Grade ≥/≤, quick filters: **Problems only**, Lossy only, Fake lossless, Upsampled, Padded bit depth, Extension mismatch, Clipping, True peak > -1.
- Row click: opens a side drawer with that file's Quality tab content + mini loudness timeline + Play button.
- Selection: Shift/Ctrl multi-select. Actions: Add selected as references, Add as mix, Export selected CSV, Remove.
- Footer totals: files, total duration, total size, count per grade.

## 7. Settings dialog (⚙)
Tabs: Audio (output device, master default, PCM cache size), Analysis (threads, mono handling, RMS mode, exclude low-quality refs, low-end width threshold, ffmpeg path [desktop]), Targets (edit JSON, reset to defaults), Appearance (theme dark/light/system, UI scale 80 to 150%, reduce motion), Shortcuts (list, rebindable), MIDI (section 8), Storage (cache size cap, clear cache, export/import all data), About (version, analysis version, licences, credits).

## 8. MIDI control (include.md: right-click MIDI map)
- Web MIDI API (Chromium, WebView2). If unavailable, the MIDI tab says so.
- Right-click any transport control (Play, A/B flip, monitor buttons, band solo buttons, master volume, jump to cue, next/prev track) -> **MIDI Learn** / **Clear MIDI**. Next incoming CC or Note binds it.
- Buttons respond to Note On or CC > 63. Faders map CC 0..127.
- Mappings stored in settings, exportable.

## 9. Responsive (web)
- ≥ 1100 px: full layout.
- 700 to 1099 px: left panel collapses to an overlay drawer (hamburger), transport wraps to two rows.
- < 700 px (phone): tabs become a dropdown, timeline 90 px, Batch table shows Name, Grade, Integrated, Flags only. Everything still works; it's just tighter.

## 10. Keyboard shortcuts
| Key | Action |
|-----|--------|
| Space | Play / pause |
| Tab | Flip A/B |
| A / B | Switch to slot A / B |
| 1 to 9 | Load nth reference into B |
| 0 | Load selected mix into A |
| ← / → | Seek -5 / +5 s (Shift: 1 s) |
| Home | Go to start |
| D | Jump to cue (Shift+D: set cue at playhead) |
| L | Toggle loop |
| M / S / X | Mono / Side / Stereo |
| F1..F4 | Solo Sub / Bass / Mids / Highs (again to clear) |
| ↑ / ↓ | Select previous / next track |
| Ctrl+O | Add references |
| Ctrl+Shift+O | Add mix |
| Ctrl+S | Save session |
| Ctrl+E | Export... |
| Ctrl+B | Toggle Compare / Batch |
| Ctrl+, | Settings |
| F1 or ? | Help |

Shortcuts are ignored while typing in an input.

## 11. Tooltips
Every control and every metric name has a tooltip (500 ms delay) with: what it is, how it's measured (one line), and why it matters. Text lives in `app/src/i18n/en.json` under `tooltips.*`. Setting to turn tooltips off.

## 12. Dialogs
Export (format: HTML / CSV / JSON / PNG of current chart; scope: current session / selected tracks / batch table as filtered), Save reference set, Edit targets, Relink missing files, About, Debug report (include.md), Confirm remove.

## 13. Accessibility
- All interactive elements reachable by keyboard, visible focus ring.
- Verdicts use icon + colour (never colour alone).
- Charts have a "View as table" toggle.
- Respect `prefers-reduced-motion`.
