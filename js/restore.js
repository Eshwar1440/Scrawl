import { state } from './state.js';
import { deserializeContent } from './serialization.js';
import { saveContent } from './storage.js';
import { showToast } from './ui.js';
import { getPlainText } from './export.js';

/**
 * Check chrome.storage.session for grace: entries from recently closed windows.
 * Shows the restore banner for the most recent entry that hasn't expired yet.
 */
export async function checkGracePeriod() {
  const allLocal = await chrome.storage.session.get(null);
  const graceMS = 5 * 60 * 1000;
  const now      = Date.now();

  const valid = Object.entries(allLocal)
    .filter(([key]) => key.startsWith('grace:') && key !== `grace:${state.windowId}`)
    .map(([key, value]) => ({
      key,
      windowId: Number(key.slice('grace:'.length)),
      content:  value.content,
      savedAt:  value.savedAt,
    }))
    .filter(entry => now - entry.savedAt < graceMS)
    .sort((a, b) => b.savedAt - a.savedAt); // most recent first

  if (valid.length === 0) return;
  state.graceEntry = valid[0];
  showRestoreBanner();
}

/** Display the restore banner and start the live countdown. */
function showRestoreBanner() {
  const { restoreBanner, restoreBannerText } = state.els;
  if (!state.graceEntry) return;
  restoreBanner.hidden = false;

  function tick() {
    const remaining = 5 * 60 * 1000 - (Date.now() - state.graceEntry.savedAt);
    if (remaining <= 0) { hideRestoreBanner(); return; }
    const mins = Math.floor(remaining / 60000);
    const secs = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
    const t    = new Date(state.graceEntry.savedAt);
    const hh   = String(t.getHours()).padStart(2, '0');
    const mm   = String(t.getMinutes()).padStart(2, '0');
    restoreBannerText.textContent = `Restore notepad from [${hh}:${mm}]? (${mins}:${secs} left)`;
  }

  tick();
  state.countdownTimer = setInterval(tick, 1000);
}

/** Clear the countdown timer and hide the banner. */
function hideRestoreBanner() {
  const { restoreBanner } = state.els;
  clearInterval(state.countdownTimer);
  state.countdownTimer = null;
  restoreBanner.hidden = true;
}

/** Restore button: copy grace content into this window's notepad. */
export async function handleRestore() {
  if (!state.graceEntry) return;

  // Guard: alarm may have fired while the banner was showing
  const check = await chrome.storage.session.get(state.graceEntry.key);
  if (!check[state.graceEntry.key]) {
    hideRestoreBanner();
    showToast('Notepad expired before restore');
    state.graceEntry = null;
    return;
  }

  // Confirm before overwriting existing content
  if (getPlainText().trim().length > 0) {
    const ok = window.confirm('Replace current content with restored notepad?');
    if (!ok) return;
  }

  state.content = state.graceEntry.content ?? { version: 0, blocks: [] };

  deserializeContent(state.content.blocks || []);
  await saveContent();

  // Tell background to cancel the cleanup alarm and delete the storage entry
  try {
    await chrome.runtime.sendMessage({ type: 'cancel-grace', windowId: state.graceEntry.windowId });
  } catch {
    // Service worker may not have responded — clean up directly as fallback
    await chrome.storage.session.remove(state.graceEntry.key);
  }

  hideRestoreBanner();
  showToast('Restored!');
  state.graceEntry = null;
}

/**
 * Dismiss button: hide the banner without deleting the grace data.
 * The alarm in background.js will clean up after 5 minutes.
 */
export function handleDismissRestore() {
  hideRestoreBanner();
}
