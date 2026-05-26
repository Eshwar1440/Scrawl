import { state } from './state.js';
import { safeUrlInline } from './constants.js';
import { showToast, buildFilename } from './ui.js';

/** Flatten blocks to plain text. Cards become "Title (URL)" or "(URL)". */
export function getPlainText() {
  if (!state.content?.blocks?.length) return '';
  return state.content.blocks.map(block => {
    if (block.type === 'text') {
      const div = document.createElement('div');
      div.innerHTML = block.content || '';
      div.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      return div.textContent;
    }
    if (block.type === 'card') {
      return block.title !== block.url
        ? `${block.title} (${block.url})`
        : `(${block.url})`;
    }
    if (block.type === 'code') {
      const fence = '```';
      return `${fence}${block.language || ''}\n${block.content}\n${fence}\n`;
    }
    if (block.type === 'image') return '[image]\n';
    return '';
  }).join('');
}

/** Convert blocks to Markdown. Anchors -> [text](url). Cards → [Title](URL). */
export function getMarkdown() {
  if (!state.content?.blocks?.length) return '';
  return state.content.blocks.map(block => {
    if (block.type === 'text') {
      const div = document.createElement('div');
      div.innerHTML = block.content || '';
      div.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href') || '';
        a.replaceWith(document.createTextNode(`[${a.textContent}](${href})`));
      });
      div.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      return div.textContent.replace(safeUrlInline, url => `[${url}](${url})`);
    }
    if (block.type === 'card') {
      const title = block.title !== block.url ? block.title : block.url;
      return `[${title}](${block.url})\n`;
    }
    if (block.type === 'code') {
      const fence = '```';
      return `${fence}${block.language || ''}\n${block.content}\n${fence}\n`;
    }
    if (block.type === 'image') return '[embedded image]\n';
    return '';
  }).join('');
}

export async function copyAsPlain() {
  try {
    await navigator.clipboard.writeText(getPlainText());
    showToast('Copied!');
  } catch {
    showToast('Copy failed');
  }
}

export async function copyAsMarkdown() {
  try {
    await navigator.clipboard.writeText(getMarkdown());
    showToast('Copied!');
  } catch {
    showToast('Copy failed');
  }
}

export function handleDownload() {
  const filename = buildFilename(state.windowName);
  const blob     = new Blob([getPlainText()], { type: 'text/plain;charset=utf-8' });
  const url      = URL.createObjectURL(blob);
  const anchor   = document.createElement('a');
  anchor.href     = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
