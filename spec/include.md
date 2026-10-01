# include.md: Standard Checklist

Items every one of my projects gets, adapted for a web + desktop app. Each one must be done before v1.0.

- [ ] **Help section.** In-app Help panel (F1 / ?) with: Quick start (3 steps with screenshots), What each metric means (generated from the tooltip text), Reading the Quality tab (transcode/upsample caveats), A/B and level matching explained, Keyboard shortcuts, Web vs desktop differences, FAQ ("Why does my mix read differently in my DAW's meter?" etc.). Also `docs/HELP.md` in the repo with the same content.
- [ ] **Presets.** Reference Sets are the presets. Ship 0 audio but include an example `.lbref` profile ("Example: Modern DnB") built from public test material numbers, clearly labelled as example data. Targets presets: default platforms + user-defined.
- [ ] **Reset.** Settings > "Reset all settings" (keeps data). Settings > Storage > "Delete all data" (confirm twice). View menu: "Reset layout". Each chart: double-click resets zoom.
- [ ] **Randomize.** "Random reference" button (dice icon by the refs dropdown, key R): loads a random included ref into B and jumps to its cue. v1.1: Blind A/B test mode.
- [ ] **Right-click MIDI map.** Right-click any transport control -> MIDI Learn / Clear (gui.md section 8).
- [ ] **Tooltips.** Every control and metric (gui.md section 11).
- [ ] **Debug / troubleshooting export.** Help > "Create debug report..." builds the zip in data.md section 10. Also "Copy system info" to clipboard. In-app log viewer (Help > Log) showing the ring buffer.
- [ ] **Easter egg.** Type `louder` anywhere (not in an input): the amber meter needle in the logo slams into the red, the app shows "LOUDNESS WAR VETERAN" for 3 seconds with a small needle-wobble animation, and every meter briefly reads "+∞". Respects reduced motion (text only). Nothing else changes.
- [ ] **Custom icon.** theme.md section 7. Window icon, taskbar, installer, favicon, PWA icons.
- [ ] **theme.md.** Followed everywhere; no hard-coded colours in components (lint rule: no hex literals outside `theme/`).
- [ ] **Docs in the repo:** `README.md` (what, screenshots, web link, download link), `docs/HELP.md`, `docs/INSTALL.md` (desktop install + troubleshooting: SmartScreen warning on unsigned builds, WebView2 missing, PWA install), `docs/BUILD.md` (compile from source on Windows), `docs/PRIVACY.md` (nothing uploaded, what's stored locally, how to delete it), `CHANGELOG.md`.
- [ ] **Licence.** MIT for the code. Third-party licences listed in About (generated with `cargo about` and `license-checker`). Font licences (OFL) included.
- [ ] **Version shown** in About, status bar and debug report.
