import { defaultTintColor, defaultWindowName, defaultTheme, defaultFontFamily } from './constants.js';

export const state = {
  windowId:            null,
  content:             { version: 2, blocks: [] },
  windowName:          defaultWindowName,
  colorTint:           defaultTintColor,
  warningEnabled:      true,
  theme:               defaultTheme,
  fontFamily:          defaultFontFamily,
  // timer IDs (shared across modules)
  saveTimer:           null,
  settingsNameTimer:   null,
  graceEntry:          null,
  countdownTimer:      null,
  savedColorSelection: null,
  // DOM element refs — populated by main.js during DOMContentLoaded
  els: {},
};
