# cli.md: `lb-cli`

Headless front end on `lb-core`. Native, multithreaded (rayon). Uses `clap` (derive), `indicatif` for progress bars, `serde_json`, `csv`.

## Commands

### analyze
```
lb-cli analyze <PATH>... [--recursive] [--threads N]
                         [--json OUT.json] [--csv OUT.csv] [--ndjson]
                         [--quiet] [--no-cache] [--ffmpeg PATH]
```
- Paths can be files or folders. Folders need `--recursive` to descend.
- Default output: a table on stdout (name, type, codec, sr, bits, kbps, LUFS, TP, LRA, grade, flags).
- `--json` writes the full export JSON (data.md 9.2). `--csv` writes the CSV (data.md 9.1). `--ndjson` streams one TrackResult per line to stdout as each file finishes (for piping into other tools, e.g. Graylog/jq).
- Uses the same desktop cache dir unless `--no-cache`.

### compare
```
lb-cli compare --mix MIX [--mix MIX2 ...] (--refs PATH... | --refset FILE.lbref)
               [--report OUT.html] [--json OUT.json] [--targets targets.json]
```
- Prints the Overview table with verdict symbols (✓ ! ✕ –) and the tonal deviation sentences.
- `--report` writes the same HTML report as the app.

### quality
```
lb-cli quality <PATH>... [--recursive] [--problems-only] [--csv OUT.csv]
```
- Quality-focused table: type, extension mismatch, codec, encoder, stored/effective bits, bitrate and mode, cutoff, transcode verdict + estimated source, upsampled from, grade.
- `--problems-only` lists only grade C or worse, or any quality flag.

### refset
```
lb-cli refset create --name "DnB 2026" <PATH>... [--recursive] -o dnb.lbref
lb-cli refset show dnb.lbref
```

### info
`lb-cli info <FILE>`: everything in FileInfo + tags, no full analysis (fast).

## Exit codes
| Code | Meaning |
|------|---------|
| 0 | All files analyzed |
| 1 | Bad arguments |
| 2 | Some files failed (others succeeded) |
| 3 | All files failed |
| 4 | `--fail-on` condition met (see below) |

`--fail-on "truePeak>-1,integrated>-9,grade<B"`: lets you use the CLI in scripts/CI for a release folder check.

## Output formatting
- Colours when stdout is a TTY (green/amber/red), plain otherwise or with `--no-color`.
- Numbers: dB with 1 decimal in tables, 2 in CSV/JSON.
