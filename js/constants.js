export const autosaveDelayMs      = 500;
export const settingsNameDelayMs  = 300;
export const toastDurationMs      = 2000;
export const defaultTintColor     = '#4a90e2';
export const defaultTheme         = 'system'; // 'system' | 'light' | 'dark'
export const defaultWindowName    = 'Untitled';
export const maxWindowNameLength  = 30;
export const windowNamePattern    = /^[-a-zA-Z0-9 _]{0,30}$/;

export const presetColors = [
  '#4a90e2', '#5cb85c', '#f0ad4e', '#ff8c42', '#d9534f', '#9b59b6', '#777777',
];

export const defaultFontFamily = '';

export const fontFamilies = [
  { label: 'Default',        value: '' },
  { label: 'Arial',          value: 'Arial, sans-serif' },
  { label: 'Verdana',        value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS',   value: '"Trebuchet MS", sans-serif' },
  { label: 'Georgia',        value: 'Georgia, serif' },
  { label: 'Times New Roman',value: '"Times New Roman", serif' },
  { label: 'Courier New',    value: '"Courier New", monospace' },
  { label: 'Comic Sans MS',  value: '"Comic Sans MS", cursive' },
  { label: 'Impact',         value: 'Impact, fantasy' },
];


export const fontSizePx = [10, 13, 16, 18, 24, 32, 48];

// Whitelist: only http, https, mailto. Used for linkify + paste detection.
export const safeUrlRe     = /^(https?:\/\/|mailto:)[^\s<>"]+$/i;
export const safeUrlInline = /(https?:\/\/|mailto:)[^\s<>"]+/gi;

// Allowed MIME types for image paste.
export const allowedImageMime = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
// Prefix check for stored image data URIs (MIME type must match allowedImageMime)
export const safeImageSrcRe   = /^data:image\/(png|jpeg|gif|webp);base64,/;
