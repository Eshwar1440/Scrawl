import { state } from './state.js';
import { autosaveDelayMs, toastDurationMs } from './constants.js';
import { serializeContent } from './serialization.js';
import { saveContent } from './storage.js';

export function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  toast.getBoundingClientRect(); // force reflow so the transition fires
  toast.classList.add('toast--visible');
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, toastDurationMs);
}

export function openSettings() {
  const { btnSettings, settingsPanel } = state.els;
  document.body.classList.add('settings-panel-open');
  btnSettings.setAttribute('aria-expanded', 'true');
  settingsPanel.focus();
}

export function closeSettings() {
  const { btnSettings } = state.els;
  document.body.classList.remove('settings-panel-open');
  btnSettings.setAttribute('aria-expanded', 'false');
  btnSettings.focus();
}

export function applyTint(hex) {
  const root = document.documentElement;
  root.style.setProperty('--tint-color',    hex);
  root.style.setProperty('--tint-color-fg', hex);
  root.style.setProperty('--tint-color-bg', hexToRgba(hex, 0.1));
  const dot = document.querySelector('.swatch-dot');
  if (dot) dot.style.backgroundColor = hex;
}

export function updateSwatchSelection(activeColor) {
  const normalized = activeColor.toLowerCase();
  document.querySelectorAll('.color-option').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.color === normalized));
  });
}

export function updateStatusCounts() {
  const { notepad, statusCounts } = state.els;
  if (!statusCounts) return;
  let text = '';
  for (const child of notepad.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) { text += child.textContent; continue; }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    if (child.classList.contains('link-card') || child.classList.contains('image-block')) continue;
    if (child.classList.contains('code-block')) {
      text += child.querySelector('.code-block-pre')?.textContent || '';
      continue;
    }
    text += child.textContent;
  }
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  statusCounts.textContent = `${words.toLocaleString()} w · ${chars.toLocaleString()} c`;
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark' || theme === 'light') {
    root.setAttribute('data-theme', theme);
  } else {
    root.removeAttribute('data-theme');
  }
}

export function updateThemeButtons(theme) {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.theme === theme));
  });
}

export function applyFontFamily(family) {
  const { notepad, fontFamilySelect } = state.els;
  notepad.style.fontFamily = family || '';
  if (fontFamilySelect) fontFamilySelect.value = family || '';
}

export function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


export function triggerSave() {
  state.content = serializeContent();
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => saveContent(), autosaveDelayMs);
}

export function buildFilename(name) {
  const safe = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  const now  = new Date();
  const date = now.toISOString().slice(0, 10);
  const hhmm = now.toTimeString().slice(0, 5).replace(':', '');
  return safe ? `notepad-${safe}-${date}-${hhmm}.txt` : `notepad-${date}-${hhmm}.txt`;
}
