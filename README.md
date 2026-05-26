# Scrawl

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](manifest.json)

A notepad that lives in your Chrome side panel. Each window gets its own notepad, and notes are wiped when you close the window. If you close too fast, you have 5 minutes to undo.


---

## What makes it different

| | Persistent notepads | TempPad (session-wide) | **Scrawl** |
|---|---|---|---|
| Per-window isolation | ❌ | ❌ | ✅ |
| Wipes when window closes | ❌ | ❌ (browser restart) | ✅ |
| 5-min undo grace period | ❌ | ❌ | ✅ |
| Right-click "Send to Scrawl" | ❌ | ❌ | ✅ |
| Auto-expanding link cards | ❌ | ❌ | ✅ |
| Window naming + color labels | ❌ | ❌ | ✅ |
| Timestamp shortcut | some | ❌ | ✅ |
| Copy as plain or markdown | rare | ❌ | ✅ |

---

## Features

**Window-scoped notes:** each Chrome window gets its own notepad. Opening a second window keeps your notes separate.

**Ephemeral by design:** notes are wiped automatically when you close the window. No manual cleanup needed.

**5-minute undo:** closed the wrong window? A restore banner appears in your next window with a live countdown. One click recovers your notes.

**Right-click capture:** select text on any page, right-click and choose "Send to Scrawl". It lands with a timestamp and a link back to the source page.

**Link cards:** pasting a URL (or right-clicking a page) creates a card with the favicon, page title, and domain. Clickable and deletable.

**Auto-linkify:** type a URL followed by a space and it becomes a clickable link. Works for `http`, `https`, and `mailto`. `javascript:` and `data:` links are blocked.

**Timestamp shortcut:** `Ctrl+Shift+T` (or `Cmd+Shift+T` on Mac) inserts `[HH:MM]` at the cursor. Also available via the toolbar button.

**Download as .txt:** export everything as a text file. The filename includes the window name and date/time.

**Copy as plain text or Markdown:** link cards become `[Title](URL)` in Markdown. A "Copied!" toast confirms the action.

**Window naming + color tint:** pick from 7 preset colors and give the window a name so you can tell windows apart.

**Appearance:** System, Light, or Dark mode. Follows your OS preference when set to System.

---

## Install

### Development (load unpacked)

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in the top-right)
4. Click **Load unpacked** and select the `notepad-extension/` folder
5. The Scrawl icon appears in the toolbar. Click it to open the side panel.

### Chrome Web Store

Coming soon. Once published, a one-click install link will appear here.

---

## How to use

1. **Open the side panel** by clicking the toolbar icon, or use the side panel button near Chrome's address bar.
2. **Type your notes.** They save automatically every 500ms. No manual save needed.
3. **Capture from the web** by selecting text on any page and right-clicking "Send to Scrawl". Or right-click anywhere and choose "Send page URL to Scrawl" for a link card.
4. **Keep or discard.** Download or copy your notes before closing if you want to keep them. Otherwise just close the window and the notes are gone.

**Keyboard shortcuts:**
- `Ctrl+Shift+T` / `Cmd+Shift+T` — insert timestamp `[HH:MM]`

---

## Architecture overview

Scrawl is a Chrome Manifest V3 extension. The main pieces:

- **`background.js`** - service worker that handles the extension lifecycle: opening the side panel, setting up the context menu, saving notes to a 5-minute grace buffer when a window closes, and scheduling the cleanup alarm.
- **`sidepanel.html` + `sidepanel.css`** - the UI: two toolbar rows, a contenteditable notepad area, a settings panel that slides in from the right, and a restore banner.
- **`js/`** - side panel logic split into ES modules: `main.js` (entry point and event wiring), `state.js` (shared state), `serialization.js` (blocks to/from DOM), `storage.js` (Chrome storage), `editing.js` (input handling, linkify, formatting), `export.js` (copy/download), `restore.js` (grace-period banner), `capture.js` (right-click messages), `ui.js` (toasts, settings panel, theming), `constants.js` (shared values).

Notes are stored in `chrome.storage.session` (wiped on browser restart) as a blocks array that preserves text, link cards, code blocks, and images across reloads. Settings are in `chrome.storage.local` (persistent). The two contexts communicate via `chrome.runtime.sendMessage`.

---

## Roadmap

**Planned:**
- Configurable grace-period duration (1 / 5 / 15 / 30 min)
- Right-click "Send this link to Notepad" context menu item
- Session history to browse recently closed windows before they expire

**Under consideration:**
- Full preset themes like Ocean, Forest, Sunset with coordinated colors
- Multiple notepads per window via a tab bar
- Global keyboard shortcut to open/focus the side panel

Have a feature request? [Open an issue]([https://github.com/eshwarr2005/window-notepad/issues](https://github.com/Eshwar1440/Scrawl/issues)).

---

## Project structure

```
notepad-extension/
├── manifest.json          # Extension declaration (MV3)
├── background.js          # Service worker: lifecycle, context menus, grace period
├── sidepanel.html         # Side panel UI markup
├── sidepanel.css          # Styling (light + dark + system mode)
├── js/                    # Side panel logic as ES modules
│   ├── main.js            #   Entry point, DOM wiring
│   ├── state.js           #   Shared mutable state
│   ├── constants.js       #   Shared values and regex
│   ├── serialization.js   #   Blocks to/from DOM
│   ├── storage.js         #   Chrome storage I/O
│   ├── editing.js         #   Input, linkify, formatting
│   ├── export.js          #   Copy and download
│   ├── restore.js         #   Grace-period banner
│   ├── capture.js         #   Right-click message receiver
│   └── ui.js              #   Toasts, settings panel, theming
├── icons/                 # 16/48/128 px PNG icons
├── store-listing/         # Chrome Web Store assets
├── LICENSE                # MIT
├── PRIVACY.md             # Privacy policy (required by Chrome Web Store)
├── CHANGELOG.md           # Version history
└── README.md              # This file
```

---

## Contributing

1. Fork the repo and clone it locally
2. Load unpacked from `notepad-extension/` (see Install above)
3. Make your changes. The side panel reloads when you refresh the extension at `chrome://extensions`.
4. Open a pull request with a clear description of what changed and why.

**Code style:** vanilla JS, no build step, no npm packages. Keep it that way. The goal is that anyone can understand the whole extension just by reading the source files.

**Filing issues:** [GitHub Issues](https://github.com/eshwarr2005/window-notepad/issues). Please include your Chrome version, OS, and steps to reproduce.

---

## License

MIT. See [LICENSE](LICENSE).
