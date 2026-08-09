# AGENTS.md

## Cursor Cloud specific instructions

TarHeelRatings is a **zero-dependency, no-build Chrome extension (Manifest V3)** — vanilla JS/CSS/HTML. There is no package manager, lockfile, build step, linter, or test framework. "Running" it means loading the unpacked extension (`/workspace`, which holds `manifest.json`) into Chrome. Google Chrome is preinstalled in the VM. There is nothing to install, so the startup update script is a no-op.

### Loading the extension (Chrome 137+ caveat)
The `--load-extension` command-line flag is **disabled** in modern Chrome (this VM runs Chrome 148), even combined with `--disable-features=DisableLoadExtensionCommandLineSwitch`. Use one of:
- **UI:** `chrome://extensions` → enable Developer mode → **Load unpacked** → select `/workspace`.
- **DevTools Protocol:** launch Chrome with `--remote-debugging-pipe --enable-unsafe-extension-debugging` and call `Extensions.loadUnpacked({path:"/workspace"})`. Note the `Extensions` CDP domain is exposed **only over the pipe transport**, not over `--remote-debugging-port` (the port still works for `Runtime`/`Page`/`Input`/screenshots).

Chrome must run **headed** on the VNC display (`DISPLAY=:1`). Content scripts / the MV3 service worker do **not** run reliably under `--headless`.

### Testing without a real UNC login
Content scripts only match `*://*.cc.unc.edu/*` (see `manifest.json`). To exercise the extension end-to-end without ConnectCarolina credentials: add a hosts entry (`echo "127.0.0.1 classes.cc.unc.edu" | sudo tee -a /etc/hosts`), serve a mock Class Search page (`python3 -m http.server`), and open it via `http://classes.cc.unc.edu:<port>/`. Class Search cards are detected by `[class*="MuiCard-root"]` containing an `Instructor: <Name>` field; the Shopping Cart grid uses `[aria-label="Enrollment_Classes"]`. The background service worker fetches live data from the public RateMyProfessors GraphQL API (`https://www.ratemyprofessors.com/graphql`), which is reachable from the VM with no auth (UNC `schoolID` is hard-coded in `extension/rmp.js`).

### Non-obvious behavior
- The **inline** badge is only a small colored star + a colored name link (green ≥4.0, amber ≥3.0, red <3.0). The numeric rating, difficulty, would-take-again %, and rating count appear only in the **hover tooltip**.
- MV3 service-worker cold start: on the very first page load after the worker has been idle, the content script's `sendMessage` calls can race the worker waking up and a field may render as plain text (fields are marked processed and not retried). **Reloading the page** reliably injects the badges once the worker is warm.

### Landing page
`index.html` is a standalone static marketing page (unrelated to extension runtime): serve with `python3 -m http.server` from the repo root and open `index.html`.
