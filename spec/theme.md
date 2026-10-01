# theme.md: Look and Feel

Studio-dark by default, with a light theme. Flat, calm, data first. Think good hardware meter, not gamer RGB.

## 1. Tokens
All colours are CSS custom properties on `:root[data-theme=dark]` and `:root[data-theme=light]`. Components only use tokens.

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--bg` | `#111316` | `#F5F6F8` | App background |
| `--panel` | `#181B20` | `#FFFFFF` | Panels |
| `--raised` | `#20242B` | `#EEF0F3` | Rows on hover, inputs |
| `--border` | `#2C313A` | `#D9DDE3` | Dividers |
| `--text` | `#E7E9EC` | `#16191D` | Primary text |
| `--text-dim` | `#9AA3AE` | `#5B6470` | Secondary text |
| `--accent` | `#F2B33D` | `#C98A10` | Brand, focus ring, primary buttons (meter amber) |
| `--mix` | `#4FC3F7` | `#0B83C2` | My Mix colour |
| `--ref` | `#B39DDB` | `#6E52B5` | Reference median/band |
| `--ok` | `#4CAF7A` | `#2E8B57` | Green verdict |
| `--warn` | `#E3A33B` | `#B7791F` | Amber verdict |
| `--bad` | `#E35D5D` | `#C53030` | Red verdict |
| `--na` | `#6B7380` | `#9AA3AE` | Grey verdict |
| `--meter-green` | `#3DDC84` | same | Meter < -18 dBFS |
| `--meter-yellow` | `#F2D13D` | same | -18 to -6 |
| `--meter-red` | `#FF4D4D` | same | > -6 |

Reference track palette (8, cycled): `#B39DDB #81C784 #FFB74D #F06292 #4DD0E1 #AED581 #FF8A65 #9575CD`.
Grade chips: A `#4CAF7A`, B `#26A69A`, C `#E3A33B`, D `#F08C3A`, F `#E35D5D`.
Spectrogram colour map: perceptual "magma" style (black to purple to orange to pale yellow), 256-entry LUT in code.

## 2. Type
- UI: **Inter** (variable, OFL), bundled locally (no Google Fonts at runtime).
- Numbers and meters: **JetBrains Mono** (OFL), tabular figures.
- Sizes: 12 px base table text, 13 px UI, 11 px captions, 20 px section titles, 32 px summary card values, 64 px quality grade letter.
- Weights: 400 body, 500 labels, 600 headings.

## 3. Spacing and shape
- 4 px grid. Panel padding 12 px. Row height 32 px (list), 28 px (tables).
- Radius 6 px (panels, buttons), 4 px (chips), 999 px (pills).
- Shadows only on popovers/dialogs: `0 8px 24px rgba(0,0,0,.35)` dark, `.12` light.
- 1 px borders using `--border`.

## 4. Charts
- Background transparent over `--panel`. Grid lines `--border` at 50% opacity, 1 px.
- Axis labels 11 px `--text-dim`, JetBrains Mono for values.
- Line widths: mix 2 px, median 1.5 px, individual refs 1 px at 50% opacity, older mix versions 1.5 px dashed.
- Band fill: `--ref` at 18% opacity.
- Deviations: heavy = `--bad` 20% fill, light = `--mix` 20% fill.
- Crosshair 1 px `--text-dim`, tooltip on `--raised`.

## 5. Meters
- Vertical peak meters 10 px wide each, segment-less gradient with the three meter colours, peak-hold tick 1.5 s, clip lamp latches until clicked.
- Momentary LUFS readout in mono font, 1 decimal.
- Vectorscope: 120 x 120 px (transport) / 320 x 320 (Stereo tab), dots in `--mix` at 40% with persistence fade (draw a translucent `--panel` rect each frame).

## 6. Motion
- 120 ms ease-out for hovers and panel transitions. Charts don't animate data changes (instant), only fade in on first render (150 ms).
- Respect `prefers-reduced-motion`: no fades.

## 7. Icon
- App icon: a **VU-meter needle crossed with a stack of three bars** (the "batch"), amber needle on a dark rounded square. Provide SVG master `assets/icon.svg`, generate PNG/ICO/ICNS sizes with `tauri icon`. Favicon and PWA icons (192, 512, maskable) from the same SVG.
- UI icons: Lucide (bundled, tree-shaken).

## 8. Light theme
Same layout, tokens swap. Charts keep the same hue roles. Default follows system (`prefers-color-scheme`), override in Settings.
