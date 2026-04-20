/**
 * HTML enriquecido para tickets: párrafos, listas, enlaces y bloques de código (pre/code).
 */

const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
  'A',
  'PRE',
  'CODE',
  'DIV',
]);

function isSafeHref(value) {
  const v = String(value || '').trim();
  if (!v) return false;
  return /^(https?:|mailto:|\/)/i.test(v) && !/^(javascript|data|vbscript):/i.test(v);
}

function sanitizeCodeClass(value) {
  const v = String(value || '').trim();
  if (!v) return null;
  const parts = v.split(/\s+/).filter((c) => {
    if (c === 'rich-inline-code') return true;
    if (/^language-[a-z0-9.+-]+$/i.test(c)) return true;
    return false;
  });
  return parts.length ? parts.join(' ') : null;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Elimina HTML anidado dentro de bloques code (solo texto plano seguro).
 */
function flattenCodeBlocks(root) {
  root.querySelectorAll('pre code').forEach((code) => {
    code.textContent = code.textContent ?? '';
  });
  root.querySelectorAll('code').forEach((code) => {
    if (code.closest('pre')) return;
    code.textContent = code.textContent ?? '';
  });
}

export function sanitizeRichHtml(input) {
  if (!input) return '';
  const template = document.createElement('template');
  template.innerHTML = String(input);
  flattenCodeBlocks(template.content);

  template.content.querySelectorAll('*').forEach((node) => {
    if (!ALLOWED_TAGS.has(node.tagName)) {
      const text = document.createTextNode(node.textContent || '');
      node.replaceWith(text);
      return;
    }

    if (node.tagName === 'A') {
      [...node.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (name === 'href' || name === 'target' || name === 'rel') return;
        node.removeAttribute(attr.name);
      });
      const href = node.getAttribute('href');
      if (!isSafeHref(href)) {
        node.removeAttribute('href');
      } else {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
      return;
    }

    if (node.tagName === 'CODE') {
      const cls = sanitizeCodeClass(node.getAttribute('class'));
      [...node.attributes].forEach((attr) => node.removeAttribute(attr.name));
      if (cls) node.setAttribute('class', cls);
      return;
    }

    if (node.tagName === 'PRE') {
      const cls = String(node.getAttribute('class') || '').trim();
      [...node.attributes].forEach((attr) => node.removeAttribute(attr.name));
      if (cls === 'rich-pre') node.setAttribute('class', 'rich-pre');
      return;
    }

    if (node.tagName === 'DIV') {
      [...node.attributes].forEach((attr) => node.removeAttribute(attr.name));
      return;
    }

    [...node.attributes].forEach((attr) => node.removeAttribute(attr.name));
  });

  return template.innerHTML;
}

export function looksLikeHtml(raw) {
  return /<[a-z][\s\S]*>/i.test(String(raw || '').trim());
}

/**
 * Convierte texto plano multilínea a HTML seguro para el editor.
 */
export function plainTextToEditableHtml(value) {
  const plain = String(value || '').trim();
  if (!plain) return '';
  return plain
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function toEditableHtml(stored) {
  const sanitized = sanitizeRichHtml(stored || '');
  if (sanitized.trim()) return sanitized;
  return plainTextToEditableHtml(stored || '');
}

/** Quita URLs del texto del comentario (los adjuntos se muestran aparte). */
export function stripUrlsForDisplay(text) {
  return String(text || '').replace(/https?:\/\/[^\s)]+/g, '').trim();
}

/** True si el HTML enriquecido no tiene texto visible (p. ej. solo &lt;p&gt;&lt;br&gt;&lt;/p&gt;). */
export function isRichHtmlEmpty(html) {
  const t = document.createElement('template');
  t.innerHTML = String(html || '');
  return !(t.content.textContent || '').replace(/\u200b/g, '').trim();
}
