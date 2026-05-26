import { state } from './state.js';
import { safeUrlRe, safeImageSrcRe } from './constants.js';

export function isValidUrl(str) {
  if (!safeUrlRe.test(str)) return false;
  try {
    const { protocol } = new URL(str);
    return protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:';
  } catch {
    return false;
  }
}

export function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeAttr(str) {
  return str.replace(/"/g, '&quot;');
}

export function sanitizeStyle(style) {
  return style.split(';')
    .map(s => s.trim())
    .filter(s => /^(color|font-size)\s*:/.test(s))
    .join('; ');
}

/**
 * Walk a detached DOM subtree and strip anything not in the safe whitelist:
 * text nodes, <br>, <span style="color/font-size">, <a href="http/https/mailto">.
 * Call this on a temp div BEFORE moving its children into the live document.
 */
export function sanitizeDom(node) {
  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    const child = node.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) { node.removeChild(child); continue; }
    const tag = child.nodeName;
    if (tag === 'BR') continue;
    if (tag === 'SPAN') {
      const safeStyle = sanitizeStyle(child.getAttribute('style') || '');
      [...child.attributes].forEach(a => child.removeAttribute(a.name));
      if (safeStyle) child.setAttribute('style', safeStyle);
      sanitizeDom(child);
      continue;
    }
    if (tag === 'A') {
      const href = child.getAttribute('href') || '';
      if (!isValidUrl(href)) {
        node.replaceChild(document.createTextNode(child.textContent), child);
        continue;
      }
      [...child.attributes].forEach(a => child.removeAttribute(a.name));
      child.setAttribute('href', href);
      child.setAttribute('target', '_blank');
      child.setAttribute('rel', 'noopener noreferrer');
      sanitizeDom(child);
      continue;
    }
    //flatten to its text content
    node.replaceChild(document.createTextNode(child.textContent), child);
  }
}

/**
 * Walk #notepad's DOM and produce a blocks array.
 * Text nodes + inline elements (spans, anchors) → 'text' blocks (safe HTML).
 * .link-card divs → 'card' blocks.
 */
export function serializeContent() {
  const { notepad } = state.els;
  const blocks = [];
  let htmlBuffer = '';

  function flushText() {
    const content = htmlBuffer.replace(/<br>$/, '');
    if (content !== '') blocks.push({ type: 'text', content });
    htmlBuffer = '';
  }

  function nodeToHtml(node) {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.nodeValue);
    if (node.nodeName === 'BR') return '<br>';
    if (node.nodeName === 'A') {
      const href = node.getAttribute('href') || '';
      if (!isValidUrl(href)) return escapeHtml(node.textContent);
      return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(node.textContent)}</a>`;
    }
    if (node.nodeName === 'SPAN') {
      const safeStyle = sanitizeStyle(node.getAttribute('style') || '');
      const inner = [...node.childNodes].map(nodeToHtml).join('');
      return safeStyle ? `<span style="${escapeAttr(safeStyle)}">${inner}</span>` : inner;
    }
    if (node.nodeName === 'FONT') {
      // execCommand may generate <font> tags in some Chrome versions - normalize to spans
      const sizeMap = { 1:'10px', 2:'13px', 3:'16px', 4:'18px', 5:'24px', 6:'32px', 7:'48px' };
      const s = node.getAttribute('size');
      const c = node.getAttribute('color');
      const inner = [...node.childNodes].map(nodeToHtml).join('');
      let style = '';
      if (s && sizeMap[s]) style += `font-size: ${sizeMap[s]}; `;
      if (c && /^#[0-9a-fA-F]{3,6}$/.test(c)) style += `color: ${c};`;
      return style ? `<span style="${style.trim()}">${inner}</span>` : inner;
    }
    const isBlock = node.nodeName === 'DIV' || node.nodeName === 'P';
    let h = '';
    for (const child of node.childNodes) h += nodeToHtml(child);
    if (isBlock && h && !h.endsWith('<br>')) h += '<br>';
    return h;
  }

  for (const child of notepad.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains('link-card')) {
      flushText();
      blocks.push({
        type:    'card',
        url:     child.dataset.url,
        title:   child.querySelector('.link-card-title')?.textContent || child.dataset.url,
        favicon: child.querySelector('.link-card-favicon')?.src || '',
      });
    } else if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains('code-block')) {
      flushText();
      blocks.push({
        type:     'code',
        language: child.querySelector('.code-block-lang')?.value || '',
        content:  child.querySelector('.code-block-pre')?.textContent || '',
      });
    } else if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains('image-block')) {
      flushText();
      const src = child.querySelector('.image-block-img')?.src || '';
      if (safeImageSrcRe.test(src)) blocks.push({ type: 'image', src });
    } else {
      const isTopBlock = child.nodeName === 'DIV' || child.nodeName === 'P';
      if (isTopBlock && htmlBuffer !== '') htmlBuffer += '<br>';
      const h = nodeToHtml(child);
      htmlBuffer += isTopBlock ? h.replace(/<br>$/, '') : h;
    }
  }
  flushText();

  return { version: 0, blocks };
}

/** Rebuild #notepad DOM from a v2 blocks array. */
export function deserializeContent(blocks) {
  const { notepad } = state.els;
  while (notepad.firstChild) notepad.removeChild(notepad.firstChild);

  for (const block of blocks) {
    if (block.type === 'text') {
      if (block.content) {
        const temp = document.createElement('div');
        temp.innerHTML = block.content;
        sanitizeDom(temp);
        while (temp.firstChild) notepad.appendChild(temp.firstChild);
      }
    } else if (block.type === 'card') {
      notepad.appendChild(buildLinkCard(block.url, block.title || block.url, block.favicon || ''));
    } else if (block.type === 'code') {
      notepad.appendChild(buildCodeBlock(block.content || '', block.language || ''));
    } else if (block.type === 'image') {
      if (block.src && safeImageSrcRe.test(block.src)) {
        notepad.appendChild(buildImageBlock(block.src));
      }
    }
  }
}

/** Build a link card DOM element without inserting it. */
export function buildLinkCard(url, title, faviconSrc) {
  const card = document.createElement('div');
  card.className = 'link-card';
  card.contentEditable = 'false';
  card.dataset.url = url;

  const img = document.createElement('img');
  img.className = 'link-card-favicon';
  img.src = faviconSrc || '';
  img.alt = '';

  const body = document.createElement('div');
  body.className = 'link-card-body';

  const a = document.createElement('a');
  a.className = 'link-card-title';
  a.href = url;
  a.textContent = (title || url).slice(0, 200);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';

  const domain = document.createElement('span');
  domain.className = 'link-card-domain';
  try { domain.textContent = new URL(url).hostname; } catch { /* leave empty */ }

  const removeBtn = document.createElement('button');
  removeBtn.className = 'link-card-remove';
  removeBtn.setAttribute('aria-label', 'Remove link card');
  removeBtn.textContent = '✕';

  body.appendChild(a);
  body.appendChild(domain);
  card.appendChild(img);
  card.appendChild(body);
  card.appendChild(removeBtn);

  return card;
}

/**
 * Resolve a URL's title from open tabs (if any), then build a card.
 * Always resolves -> falls back to URL as title.
 */
export async function buildLinkCardFromURL(url) {
  let title = url;
  const faviconSrc = chrome.runtime.getURL(`_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`);
  try {
    const tabs = await chrome.tabs.query({});
    const match = tabs.find(t => t.url === url);
    if (match?.title) title = match.title.slice(0, 200);
  } catch { /* fall back to URL */ }
  return buildLinkCard(url, title, faviconSrc);
}

export function buildCodeBlock(content, language) {
  const wrapper = document.createElement('div');
  wrapper.className = 'code-block';
  wrapper.contentEditable = 'false';

  const header = document.createElement('div');
  header.className = 'code-block-header';

  const langInput = document.createElement('input');
  langInput.type        = 'text';
  langInput.className   = 'code-block-lang';
  langInput.placeholder = 'language';
  langInput.value       = language || '';
  langInput.maxLength   = 20;
  langInput.spellcheck  = false;

  const copyBtn = document.createElement('button');
  copyBtn.className   = 'code-block-copy';
  copyBtn.textContent = 'Copy';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'code-block-remove';
  removeBtn.setAttribute('aria-label', 'Remove code block');
  removeBtn.textContent = '✕';

  const pre = document.createElement('pre');
  pre.className       = 'code-block-pre';
  pre.contentEditable = 'true';
  pre.spellcheck      = false;
  pre.textContent     = content || '';

  header.appendChild(langInput);
  header.appendChild(copyBtn);
  header.appendChild(removeBtn);
  wrapper.appendChild(header);
  wrapper.appendChild(pre);

  return wrapper;
}

export function buildImageBlock(src) {
  const wrapper = document.createElement('div');
  wrapper.className = 'image-block';
  wrapper.contentEditable = 'false';

  const img = document.createElement('img');
  img.className = 'image-block-img';
  img.src = src;
  img.alt = 'Pasted image';

  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'image-block-download';
  downloadBtn.setAttribute('aria-label', 'Download image');
  downloadBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'image-block-remove';
  removeBtn.setAttribute('aria-label', 'Remove image');
  removeBtn.textContent = '✕';

  wrapper.appendChild(img);
  wrapper.appendChild(downloadBtn);
  wrapper.appendChild(removeBtn);
  return wrapper;
}
