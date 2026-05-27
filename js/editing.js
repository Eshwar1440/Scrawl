import { state } from './state.js';
import { allowedImageMime, fontSizePx } from './constants.js';
import { isValidUrl, buildLinkCardFromURL, buildCodeBlock, buildImageBlock } from './serialization.js';
import { showToast, triggerSave, updateStatusCounts } from './ui.js';

export function attachNotepadListeners() {
  const { notepad } = state.els;

  notepad.addEventListener('input', (event) => {
    if (event.target.closest('.code-block')) { triggerSave(); updateStatusCounts(); return; }
    if (event.data === ' ') tryLinkifyAtCursor();
    triggerSave();
    updateStatusCounts();
  });

  notepad.addEventListener('paste', async (event) => {
    event.preventDefault();

    // Image paste priority over text
    const imageItem = [...event.clipboardData.items].find(item => allowedImageMime.includes(item.type));
    if (imageItem) {
      const blob = imageItem.getAsFile();
      if (!blob) return;
      if (blob.size > 2 * 1024 * 1024) { showToast('Image too large (max 2 MB)'); return; }
      const reader = new FileReader();
      reader.onload = (e) => { insertImageAtCursor(e.target.result); triggerSave(); updateStatusCounts(); };
      reader.readAsDataURL(blob);
      return;
    }

    const rawText = event.clipboardData.getData('text/plain');
    if (rawText.length > 500_000) { showToast('Paste too large (max 500 KB)'); return; }
    const trimmed = rawText.trim();

    // Single-URL paste to render as link card
    if (trimmed && !rawText.includes('\n') && isValidUrl(trimmed)) {
      const sel = window.getSelection();
      // Capture range before the await because user may move cursor while tabs.query runs
      const savedRange = sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;

      const card = await buildLinkCardFromURL(trimmed);

      if (savedRange) {
        savedRange.deleteContents();
        savedRange.insertNode(card);
        const afterRange = document.createRange();
        afterRange.setStartAfter(card);
        afterRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(afterRange);
      } else {
        notepad.appendChild(card);
      }
      triggerSave();
      return;
    }

    // All other pastes: plain text only, no HTML
    // execCommand is deprecated but is still the only way to insert at cursor
    // while keeping the browser's native undo stack intact
    document.execCommand('insertText', false, rawText);
  });

  notepad.addEventListener('keydown', (event) => {
    if (event.target.classList.contains('code-block-pre')) {
      if (event.key === 'Tab') {
        event.preventDefault();
        document.execCommand('insertText', false, '  ');
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        document.execCommand('insertText', false, '\n');
        return;
      }
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
      event.preventDefault();
      insertTimestamp();
    }
  });

  // Remove a link card via event delegation on the notepad
  notepad.addEventListener('click', (event) => {
    const linkRemove = event.target.closest('.link-card-remove');
    if (linkRemove) {
      linkRemove.closest('.link-card')?.remove();
      triggerSave();
      return;
    }
    const codeCopy = event.target.closest('.code-block-copy');
    if (codeCopy) {
      const pre = codeCopy.closest('.code-block')?.querySelector('.code-block-pre');
      if (pre) navigator.clipboard.writeText(pre.innerText).then(() => showToast('Copied!'), () => showToast('Copy failed'));
      return;
    }
    const codeRemove = event.target.closest('.code-block-remove');
    if (codeRemove) {
      codeRemove.closest('.code-block')?.remove();
      triggerSave();
      return;
    }
    const imageDownload = event.target.closest('.image-block-download');
    if (imageDownload) {
      const src = imageDownload.closest('.image-block')?.querySelector('.image-block-img')?.src;
      if (src) downloadImage(src);
      return;
    }
    const imageRemove = event.target.closest('.image-block-remove');
    if (imageRemove) {
      imageRemove.closest('.image-block')?.remove();
      triggerSave();
    }
  });
}

/**
 * After the user types a space, check whether the preceding token in the
 * current text node is a valid URL. If so, wrap it in an <a> element.
 * Only walks back in the current text node.
 */
export function tryLinkifyAtCursor() {
  const { notepad } = state.els;
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return;

  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return;
  if (!notepad.contains(node)) return;
  if (node.parentElement?.closest('.code-block')) return;

  const offset     = range.startOffset;
  const textBefore = node.nodeValue.slice(0, offset);
  const trimmed    = textBefore.trimEnd();
  if (!trimmed) return;

  const lastWS    = Math.max(trimmed.lastIndexOf(' '), trimmed.lastIndexOf('\n'), trimmed.lastIndexOf('\t'));
  const wordStart = lastWS + 1;
  const candidate = trimmed.slice(wordStart);

  if (!candidate || !isValidUrl(candidate)) return;

  const beforeText  = node.nodeValue.slice(0, wordStart);
  const whitespace  = node.nodeValue.slice(trimmed.length, offset);
  const afterCursor = node.nodeValue.slice(offset);

  const a = document.createElement('a');
  a.href = candidate;
  a.textContent = candidate; 
  a.target = '_blank';
  a.rel = 'noopener noreferrer';

  const trailingNode = document.createTextNode(whitespace + afterCursor);
  const parent = node.parentNode;
  const next   = node.nextSibling;

  parent.removeChild(node);

  if (next) {
    parent.insertBefore(trailingNode, next);
    parent.insertBefore(a, trailingNode);
    if (beforeText) parent.insertBefore(document.createTextNode(beforeText), a);
  } else {
    parent.appendChild(trailingNode);
    parent.insertBefore(a, trailingNode);
    if (beforeText) parent.insertBefore(document.createTextNode(beforeText), a);
  }

  const newRange = document.createRange();
  newRange.setStart(trailingNode, whitespace.length);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

export function insertTimestamp() {
  const now = new Date();
  const hh  = String(now.getHours()).padStart(2, '0');
  const mm  = String(now.getMinutes()).padStart(2, '0');
  document.execCommand('insertText', false, `[${hh}:${mm}] `);
}

/**
 * Returns the execCommand fontSize level (1–7) that best matches the computed
 * font size at the start of the current selection.
 */
export function getCurrentFontSizeLevel() {
  const { notepad } = state.els;
  const sel = window.getSelection();
  if (!sel.rangeCount) return 3;
  const node = sel.getRangeAt(0).startContainer;
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  if (!notepad.contains(el)) return 3;
  const px = parseFloat(window.getComputedStyle(el).fontSize);
  let closest = 3;
  let minDiff = Infinity;
  fontSizePx.forEach((size, i) => {
    const diff = Math.abs(size - px);
    if (diff < minDiff) { minDiff = diff; closest = i + 1; }
  });
  return closest;
}

export function changeFontSize(delta) {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) { showToast('Select text first'); return; }
  const next = Math.max(1, Math.min(7, getCurrentFontSizeLevel() + delta));
  document.execCommand('styleWithCSS', false, true);
  document.execCommand('fontSize', false, String(next));
  triggerSave();
}

export function applyTextColor(hex) {
  if (!state.savedColorSelection) return;
  const { notepad, textColorBar } = state.els;
  notepad.focus();
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(state.savedColorSelection);
  document.execCommand('styleWithCSS', false, true);
  document.execCommand('foreColor', false, hex);
  triggerSave();
  if (textColorBar) textColorBar.style.background = hex;
  state.savedColorSelection = null;
}

export function insertCodeBlock() {
  const { notepad } = state.els;
  const block = buildCodeBlock('', '');
  const sel = window.getSelection();

  if (sel.rangeCount > 0) {
    let anchor = sel.getRangeAt(0).startContainer;
    while (anchor && anchor.parentNode !== notepad) anchor = anchor.parentNode;
    if (anchor && anchor.parentNode === notepad) {
      notepad.insertBefore(block, anchor.nextSibling);
    } else {
      notepad.appendChild(block);
    }
  } else {
    notepad.appendChild(block);
  }

  const after = document.createRange();
  after.setStartAfter(block);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);
  block.querySelector('.code-block-pre').focus();
  triggerSave();
}

export function insertImageAtCursor(src) {
  const { notepad } = state.els;
  const block = buildImageBlock(src);
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    let anchor = sel.getRangeAt(0).startContainer;
    while (anchor && anchor.parentNode !== notepad) anchor = anchor.parentNode;
    if (anchor && anchor.parentNode === notepad) {
      notepad.insertBefore(block, anchor.nextSibling);
      return;
    }
  }
  notepad.appendChild(block);
}

export function downloadImage(src) {
  const mimeMatch = src.match(/^data:image\/(\w+);base64,/);
  const ext = mimeMatch ? (mimeMatch[1] === 'jpeg' ? 'jpg' : mimeMatch[1]) : 'png';
  const now  = new Date();
  const date = now.toISOString().slice(0, 10);
  const hhmm = now.toTimeString().slice(0, 5).replace(':', '');
  const anchor = document.createElement('a');
  anchor.href     = src;
  anchor.download = `notepad-image-${date}-${hhmm}.${ext}`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
