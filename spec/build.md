# build.md: Repo, Toolchain, Build, Release

## 1. Repo layout
```
loudnessbatch/
  Cargo.toml                 # Rust workspace: crates/*, app/src-tauri
  rust-toolchain.toml        # pinned stable, targets: wasm32-unknown-unknown
  crates/
    lb-core/                 # engine (engine.md)
    lb-wasm/                 # wasm-bindgen wrapper
    lb-cli/                  # CLI (cli.md)
  app/
    package.json             # pnpm
    vite.config.ts
    index.html
    src/
      main.tsx, App.tsx
      platform/{types.ts,index.ts,web/*,tauri/*}
      audio/{Player.ts,graph.ts,worklets/*.ts}
      store/*.ts             # zustand slices
      views/{compare/*,batch/*,quality/*,settings/*,help/*}
      components/*
      charts/*               # uPlot wrappers, canvas timeline, vectorscope, spectrogram
      export/{csv.ts,json.ts,report/*}
      theme/{tokens.css,dark.css,light.css}
      i18n/en.json
      data/targets.default.json
      wasm/                  # wasm-pack output (gitignored, generated)
    src-tauri/
      Cargo.toml, tauri.conf.json, capabilities/*.json, icons/*
      src/{main.rs,lib.rs,commands.rs,engine_pool.rs,storage.rs}
  spec/                      # these spec files
  docs/                      # HELP, INSTALL, BUILD, PRIVACY
  tests/
    vectors/                 # EBU test files (gitignored, fetched by script)
    fixtures/                # small generated fixtures (committed, < 5 MB total)
  scripts/
    build.ps1                # Windows one-shot build
    build.sh                 # Linux/macOS equivalent
    fetch-test-vectors.ps1 / .sh
    gen-fixtures.py          # makes synthetic test files (numpy + soundfile + ffmpeg)
    bump-version.mjs
  Dockerfile                 # static web build served by nginx
  .github/workflows/{ci.yml,pages.yml,release.yml}
  README.md, LICENSE, CHANGELOG.md, CLAUDE.md
```

## 2. Toolchain (pin exact versions in Phase 0 and record them here)
- Rust stable (latest at project start) with target `wasm32-unknown-unknown`.
- `wasm-pack` (or `wasm-bindgen-cli` matching the `wasm-bindgen` crate version).
- Node LTS + pnpm.
- Tauri CLI 2.x (`pnpm add -D @tauri-apps/cli`).
- Windows: Visual Studio 2022 Build Tools (Desktop C++ workload), WebView2 runtime (present on Win 10/11).
- Python 3 + numpy + soundfile (fixtures only), ffmpeg (fixtures and cross-check tests only).

## 3. Key dependencies
Rust: `symphonia` 0.5.x (all formats/codecs, engine.md 2.1), `rustfft`, `serde`, `serde_json`, `thiserror`, `xxhash-rust`, `sha1`, `flate2` (desktop), `rayon` (cli/desktop), `clap`, `indicatif`, `csv`, `wasm-bindgen`, `js-sys`, `serde-wasm-bindgen`, `console_error_panic_hook`, `tauri` 2, `tauri-plugin-dialog`, `tauri-plugin-fs`, `tauri-plugin-opener`.
TS: `react`, `react-dom`, `zustand`, `uplot`, `@tanstack/react-table`, `@tanstack/react-virtual`, `idb`, `fflate`, `lucide-react`, `vite-plugin-pwa`, `@fontsource-variable/inter`, `@fontsource/jetbrains-mono`, `vitest`, `@playwright/test`.

## 4. WASM build
```
wasm-pack build crates/lb-wasm --release --target web --out-dir ../../app/src/wasm
```
with `RUSTFLAGS="-C target-feature=+simd128"`. Release profile: `opt-level=3, lto=true, codegen-units=1, panic="abort"`. Optional `wasm-opt -O3` pass. Target `.wasm` size < 2.5 MB (gzip < 1 MB).

## 5. build.ps1 (Windows one-shot)
Paste-and-run friendly. Steps, each with a clear `==> Step` header, stops on first error:
1. Check tools (rustc, cargo, wasm-pack, node, pnpm). Print versions. If missing, print the exact install command and exit.
2. `rustup target add wasm32-unknown-unknown` (idempotent).
3. `cargo test -p lb-core --release`.
4. Build WASM (section 4).
5. `pnpm -C app install --frozen-lockfile`.
6. `pnpm -C app test` (vitest).
7. `pnpm -C app build` -> `app/dist` (web).
8. `pnpm -C app tauri build` -> NSIS installer + MSI in `app/src-tauri/target/release/bundle/`.
9. `cargo build -p lb-cli --release`.
10. Copy outputs to `dist/`: `web/`, `LoudnessBatch_<ver>_x64-setup.exe`, `LoudnessBatch_<ver>_x64.msi`, `lb-cli.exe`, `SHA256SUMS.txt`.
Flags: `-WebOnly`, `-DesktopOnly`, `-SkipTests`, `-Clean`.

`build.sh` does the same on Linux/macOS (desktop bundle for that OS).

Dev: `pnpm -C app dev` (web, hot reload; runs a `predev` script that rebuilds WASM if `crates/` changed), `pnpm -C app tauri dev` (desktop).

## 6. CI (GitHub Actions)
- **ci.yml** (push, PR): matrix ubuntu + windows. `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test --workspace`, WASM build, `pnpm lint`, `pnpm test`, `pnpm build`, Playwright smoke test (web build, Chromium): load page, drop fixture files, wait for results, assert integrated LUFS shown within tolerance.
- **pages.yml** (push to main): build web, deploy `app/dist` to GitHub Pages (`actions/upload-pages-artifact` + `actions/deploy-pages`).
- **release.yml** (tag `v*`): `tauri-apps/tauri-action` builds Windows (NSIS + MSI) and, later, macOS/Linux; builds `lb-cli` for windows/linux/macos; creates a draft GitHub Release with all artifacts and SHA256SUMS.

## 7. Desktop packaging
- NSIS installer (per-user install, no admin needed) and MSI.
- WebView2: `webviewInstallMode: downloadBootstrapper` in `tauri.conf.json`.
- Unsigned at first. Windows SmartScreen will warn; docs/INSTALL.md explains "More info > Run anyway". Code signing later (optional).
- File associations: `.lbsession`, `.lbref` open in the app. Also "Open with LoudnessBatch" for audio files (optional, off by default in installer).
- Tauri capabilities: fs read scope = user-chosen files/folders only (via dialog/drop), write scope = app data dir + user-chosen save paths.

## 8. Docker (self-host the web app)
```dockerfile
FROM node:lts AS build
# install rust + wasm-pack, build wasm, pnpm build
...
FROM nginx:alpine
COPY --from=build /src/app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf   # correct MIME for .wasm, long cache for hashed assets, no-cache for index.html and sw.js
EXPOSE 80
```
Vite `base` set from env `LB_BASE` (default `/loudnessbatch/` for Pages, `/` for Docker).
Run: `docker run -d --name loudnessbatch -p 8085:80 loudnessbatch:latest`.

Note: on plain `http://` LAN addresses (not localhost) browsers disable some features (File System Access, service worker/PWA install, `setSinkId` in some cases). Analysis and playback still work. Put it behind HTTPS (reverse proxy) for the full feature set.
