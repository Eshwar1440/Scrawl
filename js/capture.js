import { state } from './state.js';
import { isValidUrl, buildLinkCard, serializeContent } from './serialization.js';
import { saveContent } from './storage.js';
import { showToast } from './ui.js';

/**
 * Append a capture from background.js to the end of the notepad.
 * Appends directly to the DOM rather than rebuilding from blocks,
 * so the user's cursor position is preserved if they were mid-typing.
 */
export async function handleCapture(message) {
  const { notepad } = state.els;

  // Validate field types and lengths — message comes from our own background.js
  // but we validate defensively in case of confused-deputy scenarios
  const captureUrl   = typeof message.url   === 'string' && isValidUrl(message.url)   ? message.url                    : '';
  const captureText  = typeof message.text  === 'string'                               ? message.text.slice(0, 10_000)  : '';
  const captureTitle = typeof message.title === 'string'                               ? message.title.slice(0, 200)    : captureUrl;

  const now = new Date();
  const hh  = String(now.getHours()).padStart(2, '0');
  const mm  = String(now.getMinutes()).padStart(2, '0');

  // Section divider with timestamp
  notepad.appendChild(document.createTextNode(`\n─── [${hh}:${mm}] ───\n`));

  // Selected text (omitted for page-URL captures)
  if (captureText) {
    notepad.appendChild(document.createTextNode(captureText + '\n'));
  }

  // Link card for the source page
  if (captureUrl) {
    const favicon = chrome.runtime.getURL(
      `_favicon/?pageUrl=${encodeURIComponent(captureUrl)}&size=32`,
    );
    notepad.appendChild(buildLinkCard(captureUrl, captureTitle || captureUrl, favicon));
  }

  // Trailing newline keeps the cursor ready for follow-up notes
  notepad.appendChild(document.createTextNode('\n'));

  // Serialize and save immediately — don't wait for debounce
  state.content = serializeContent();
  await saveContent();

  showToast('Captured!');
}
