# circuit-drift-labs.md: Circuit Drift Labs Integration and Cross-Links

Date: 2026-10-01

This file is normative for Circuit Drift Labs branding, navigation, and cross-tool handoff behavior in LoudnessBatch. It supplements `spec.md`, `gui.md`, `theme.md`, and `build.md` without changing the audio-analysis requirements.

## 1. Brand integration

LoudnessBatch is a Circuit Drift Labs production utility.

Required:

- Small, unobtrusive Circuit Drift Labs 2D mark in the application header and/or footer.
- Visible text link to `https://circuitdriftlabs.djshellshoxxx.github.io`.
- `A Circuit Drift Labs tool` or equivalent attribution in About/footer copy.
- README and web metadata identify Circuit Drift Labs as the project family/publisher.
- Do not replace LoudnessBatch's established data-first meter theme with a large brand treatment. The shared mark and navigation should fit the existing UI.

## 2. Primary Circuit Drift Labs tools

The shared production-tool list is:

1. TrackStats
2. Transposition Calculator
3. MIDItest
4. LoudnessBatch

A compact `More Circuit Drift Labs tools` area may list the other production tools.

## 3. Experiments

Experiments must be shown separately and below the production-tool list:

1. Binaural Web Beats
2. BabbleForge

They must not be visually mixed into the main production-tool list.

## 4. Contextual handoff after analysis

The most important cross-link is LoudnessBatch -> TrackStats.

After a batch/reference analysis has produced results, display a compact related-tool card near the completed-analysis summary or at the end of the results flow.

Recommended copy:

`Want to know more about your tracks? Check out TrackStats for library-wide format, bitrate, sample-rate, key, BPM, metadata and collection statistics.`

The prompt must:

- appear only after useful analysis results exist;
- not block or cover LoudnessBatch results;
- open the TrackStats GitHub Pages deployment;
- explain what additional information TrackStats provides rather than using generic promotional copy;
- never upload or automatically transmit the analyzed audio, file paths, metadata, hashes, or session data to TrackStats.

## 5. Other contextual handoffs

### Key/BPM metadata -> Transposition Calculator

When a selected analyzed file exposes BPM and/or musical-key metadata, a small contextual action may appear in track details:

`Need to move this track or sample to another key or tempo? Open Transposition Calculator.`

If safe URL-prefill parameters are implemented, only the explicit musical values needed for the calculation may be included. Do not include filenames or local paths.

### MIDItest

MIDItest should remain available in the general Circuit Drift Labs tools list. Do not insert a MIDItest prompt into loudness-analysis results because controller diagnostics are a separate workflow.

## 6. Main-site navigation

Footer/About must link back to the Circuit Drift Labs home page. The home page is the canonical directory for the full suite.

Use final verified GitHub Pages URLs for tool links. Do not hard-code guessed deployment paths when implementation can determine the live URL.

## 7. Web/PWA privacy

The existing zero-upload and zero-runtime-telemetry requirements remain unchanged. Cross-links must not introduce tracking parameters containing analysis-derived data.

## 8. Testing

Add UI/integration tests that verify:

- TrackStats prompt is hidden before analysis completes.
- TrackStats prompt appears after a successful analysis result exists.
- TrackStats prompt contains no file/session data in its URL.
- Transposition Calculator contextual link appears only when relevant BPM/key metadata exists.
- Circuit Drift Labs home link is present.
- Production tools and Experiments are visually separate.
- Binaural Web Beats appears before BabbleForge in the Experiments section.
