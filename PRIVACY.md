# Privacy Policy - Scrawl

_Last updated: 2026-05-25_

## TL;DR

Scrawl collects nothing. Everything you type stays on your device. No accounts, no servers, no analytics, no tracking. Data is wiped when you close the Chrome window (with a 5-minute undo grace period).

## What data Scrawl handles

- **Text you type into the notepad.** Stored locally via Chrome's `chrome.storage.session` API. Never sent anywhere. Wiped when the Chrome window closes.
- **Text or URLs you capture via the "Send to Scrawl" right-click menu.** Same handling as above — stored locally, never transmitted.
- **Per-window settings** (window name, color tint, warning toggle preference). Stored locally via `chrome.storage.local`. Never sent anywhere. Persists across browser restarts because it's a preference, not data.
- **Grace-period buffer.** When a window closes, the notepad content is moved to local storage for up to 5 minutes so you can restore it if you closed by mistake. Automatically deleted after 5 minutes by a scheduled alarm.

## What Scrawl does NOT do

- Does not send any data over the network
- Does not request host permissions on any website
- Does not read or modify the content of web pages
- Does not use analytics, telemetry, or crash reporting
- Does not use cookies
- Does not sync data across devices
- Does not connect to any third-party service
- Does not display ads

## Permissions explained

| Permission | What it's used for | Network access |
|---|---|---|
| `sidePanel` | Open the notepad in Chrome's side panel | No |
| `storage` | Save your notes and settings locally on your device | No |
| `tabs` | Read the URL and title of the tab you're capturing from when using the right-click menu | No |
| `contextMenus` | Add the "Send to Scrawl" and "Send page URL to Notepad" right-click options | No |
| `alarms` | Schedule the 5-minute grace-period cleanup after a window closes | No |
| `favicon` | Show favicons in link cards using Chrome's built-in favicon cache (avoids fetching from websites) | No |

## Contact

Questions or concerns? Open an issue at:
https://github.com/eshwarr2005/window-notepad/issues
