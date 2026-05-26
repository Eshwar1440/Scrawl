import { state } from './state.js';
import { defaultTintColor, defaultWindowName, defaultTheme } from './constants.js';

export async function loadState() {
  const sessionKey  = `notepad:${state.windowId}`;
  const settingsKey = `settings:${state.windowId}`;

  const [sessionData, localData] = await Promise.all([
    chrome.storage.session.get(sessionKey),
    chrome.storage.local.get(settingsKey),
  ]);

  state.content = sessionData[sessionKey] ?? { version: 0, blocks: [] };

  const saved          = localData[settingsKey] ?? {};
  state.windowName     = saved.name           ?? defaultWindowName;
  state.colorTint      = saved.color          ?? defaultTintColor;
  state.warningEnabled = saved.warningEnabled ?? true;
  state.theme          = saved.theme          ?? defaultTheme;
  state.fontFamily     = saved.fontFamily     ?? '';
}

export async function saveContent() {
  const sessionKey = `notepad:${state.windowId}`;
  await chrome.storage.session.set({ [sessionKey]: state.content });
  updateStatusStorage();
}

export async function saveSettings() {
  const settingsKey = `settings:${state.windowId}`;
  await chrome.storage.local.set({
    [settingsKey]: {
      name:           state.windowName,
      color:          state.colorTint,
      warningEnabled: state.warningEnabled,
      theme:          state.theme,
      fontFamily:     state.fontFamily,
    },
  });
}

export function updateStatusStorage() {
  const { statusStorage } = state.els;
  if (!statusStorage) return;
  chrome.storage.session.getBytesInUse(null).then(bytes => {
    statusStorage.textContent = `${formatBytes(bytes)} / 10 MB`;
  }).catch(() => { statusStorage.textContent = ''; });
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
