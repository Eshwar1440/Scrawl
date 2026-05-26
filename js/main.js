import { state } from './state.js';
import { windowNamePattern, maxWindowNameLength, settingsNameDelayMs } from './constants.js';
import { serializeContent, deserializeContent } from './serialization.js';
import { loadState, saveSettings, updateStatusStorage } from './storage.js';
import {
  openSettings, closeSettings, applyTint, updateSwatchSelection,
  updateStatusCounts, showToast, applyTheme, updateThemeButtons, applyFontFamily,
} from './ui.js';
import {
  attachNotepadListeners, insertTimestamp, changeFontSize, applyTextColor, insertCodeBlock,
} from './editing.js';
import { copyAsPlain, copyAsMarkdown, handleDownload } from './export.js';
import { checkGracePeriod, handleRestore, handleDismissRestore } from './restore.js';
import { handleCapture } from './capture.js';

document.addEventListener('DOMContentLoaded', async () => {
  const els = state.els;
  els.notepad            = document.getElementById('notepad');
  els.windowNameInput    = document.getElementById('window-name-input');
  els.settingsWindowName = document.getElementById('settings-window-name');
  els.colorSwatch        = document.getElementById('color-swatch');
  els.colorPicker        = document.getElementById('color-picker');
  els.btnDownload        = document.getElementById('btn-download');
  els.btnCopy            = document.getElementById('btn-copy');
  els.copyMenu           = document.getElementById('copy-menu');
  els.btnCopyPlain       = document.getElementById('btn-copy-plain');
  els.btnCopyMarkdown    = document.getElementById('btn-copy-markdown');
  els.btnSettings        = document.getElementById('btn-settings');
  els.btnTimestamp       = document.getElementById('btn-timestamp');
  els.btnCloseSettings   = document.getElementById('btn-close-settings');
  els.toggleWarning      = document.getElementById('toggle-warning');
  els.settingsPanel      = document.getElementById('settings-panel');
  els.restoreBanner      = document.getElementById('restore-banner');
  els.restoreBannerText  = document.getElementById('restore-banner-text');
  els.btnRestore         = document.getElementById('btn-restore');
  els.btnDismissRestore  = document.getElementById('btn-dismiss-restore');
  els.btnFontIncrease    = document.getElementById('btn-font-increase');
  els.btnFontDecrease    = document.getElementById('btn-font-decrease');
  els.btnTextColor       = document.getElementById('btn-text-color');
  els.textColorInput     = document.getElementById('text-color-input');
  els.textColorBar       = document.getElementById('text-color-bar');
  els.btnCodeBlock       = document.getElementById('btn-code-block');
  els.statusCounts       = document.getElementById('status-counts');
  els.statusStorage      = document.getElementById('status-storage');
  els.fontFamilySelect   = document.getElementById('font-family-select');

  const win = await chrome.windows.getCurrent();
  state.windowId = win.id;

  await loadState();
  applyState();
  await checkGracePeriod();
  attachListeners();
});

function applyState() {
  const { windowNameInput, settingsWindowName, toggleWarning } = state.els;
  deserializeContent(state.content.blocks || []);
  windowNameInput.value    = state.windowName;
  settingsWindowName.value = state.windowName;
  toggleWarning.checked    = state.warningEnabled;
  applyTint(state.colorTint);
  updateSwatchSelection(state.colorTint);
  applyTheme(state.theme);
  updateThemeButtons(state.theme);
  applyFontFamily(state.fontFamily);
  updateStatusCounts();
  updateStatusStorage();
}

function attachListeners() {
  const {
    colorSwatch, colorPicker, btnCopy, copyMenu, btnCopyPlain, btnCopyMarkdown,
    btnDownload, btnSettings, btnCloseSettings, settingsPanel, toggleWarning,
    windowNameInput, settingsWindowName, btnTimestamp, btnCodeBlock,
    btnFontIncrease, btnFontDecrease, btnTextColor, textColorInput,
    btnRestore, btnDismissRestore, fontFamilySelect,
  } = state.els;

  attachNotepadListeners();
  attachBeforeunloadListener();

  btnDownload.addEventListener('click', handleDownload);

  // Copy button toggles the dropdown
  btnCopy.addEventListener('click', (event) => {
    event.stopPropagation();
    const nowOpen = copyMenu.hidden;
    copyMenu.hidden = !nowOpen;
    btnCopy.setAttribute('aria-expanded', String(nowOpen));
  });

  btnCopyPlain.addEventListener('click', async () => {
    copyMenu.hidden = true;
    btnCopy.setAttribute('aria-expanded', 'false');
    await copyAsPlain();
  });

  btnCopyMarkdown.addEventListener('click', async () => {
    copyMenu.hidden = true;
    btnCopy.setAttribute('aria-expanded', 'false');
    await copyAsMarkdown();
  });

  btnSettings.addEventListener('click', openSettings);
  btnCloseSettings.addEventListener('click', closeSettings);

  settingsPanel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSettings();
  });

  // Close popovers when clicking outside them
  document.addEventListener('click', (event) => {
    if (!colorSwatch.contains(event.target) && !colorPicker.contains(event.target)) {
      colorPicker.hidden = true;
      colorSwatch.setAttribute('aria-expanded', 'false');
    }
    if (!btnCopy.contains(event.target) && !copyMenu.contains(event.target)) {
      copyMenu.hidden = true;
      btnCopy.setAttribute('aria-expanded', 'false');
    }
  });

  colorSwatch.addEventListener('click', (event) => {
    event.stopPropagation();
    const nowOpen = colorPicker.hidden;
    colorPicker.hidden = !nowOpen;
    colorSwatch.setAttribute('aria-expanded', String(nowOpen));
  });

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.color-option');
    if (!btn) return;
    const color = btn.dataset.color;
    if (!color) return;
    state.colorTint = color;
    applyTint(color);
    updateSwatchSelection(color);
    saveSettings();
    colorPicker.hidden = true;
    colorSwatch.setAttribute('aria-expanded', 'false');
  });

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      state.theme = theme;
      applyTheme(theme);
      updateThemeButtons(theme);
      saveSettings();
    });
  });

  toggleWarning.addEventListener('change', () => {
    state.warningEnabled = toggleWarning.checked;
    saveSettings();
  });

  windowNameInput.addEventListener('input', () => {
    handleWindowNameChange(windowNameInput.value);
  });

  settingsWindowName.addEventListener('input', () => {
    handleWindowNameChange(settingsWindowName.value);
  });

  btnTimestamp.addEventListener('click', () => {
    state.els.notepad.focus();
    insertTimestamp();
  });

  btnCodeBlock.addEventListener('mousedown', e => e.preventDefault());
  btnCodeBlock.addEventListener('click', insertCodeBlock);

  // Font size buttons — mousedown preventDefault keeps focus (and selection) in notepad
  btnFontIncrease.addEventListener('mousedown', e => e.preventDefault());
  btnFontIncrease.addEventListener('click', () => changeFontSize(1));

  btnFontDecrease.addEventListener('mousedown', e => e.preventDefault());
  btnFontDecrease.addEventListener('click', () => changeFontSize(-1));

  // Text color — save selection before native color picker steals focus
  btnTextColor.addEventListener('mousedown', e => e.preventDefault());
  btnTextColor.addEventListener('click', () => {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) { showToast('Select text first'); return; }
    state.savedColorSelection = sel.getRangeAt(0).cloneRange();
    textColorInput.click();
  });

  textColorInput.addEventListener('change', () => applyTextColor(textColorInput.value));

  btnRestore.addEventListener('click', handleRestore);
  btnDismissRestore.addEventListener('click', handleDismissRestore);

  fontFamilySelect.addEventListener('change', () => {
    state.fontFamily = fontFamilySelect.value;
    applyFontFamily(state.fontFamily);
    saveSettings();
  });

  // Receive context-menu captures broadcast from background.js
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (sender.id !== chrome.runtime.id) return false;
    if (message.type === 'capture' && message.windowId === state.windowId) {
      handleCapture(message);
    }
    return false;
  });
}

function handleWindowNameChange(value) {
  const { windowNameInput, settingsWindowName } = state.els;
  if (!windowNamePattern.test(value)) return;
  const trimmed = value.slice(0, maxWindowNameLength);
  state.windowName = trimmed;
  windowNameInput.value    = trimmed;
  settingsWindowName.value = trimmed;
  clearTimeout(state.settingsNameTimer);
  state.settingsNameTimer = setTimeout(() => saveSettings(), settingsNameDelayMs);
}

function attachBeforeunloadListener() {
  window.addEventListener('beforeunload', (event) => {
    if (!state.warningEnabled) return;
    const current = serializeContent();
    const hasContent = current.blocks.some(b =>
      (b.type === 'text' && b.content.trim()) || b.type === 'card' || b.type === 'image',
    );
    if (hasContent) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
}
