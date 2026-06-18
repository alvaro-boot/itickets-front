import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import plaintext from 'highlight.js/lib/languages/plaintext';
import { ensureHighlightStyles } from './richHighlightStyles';

let languagesRegistered = false;

function registerLanguages() {
  if (languagesRegistered) return;
  hljs.registerLanguage('sql', sql);
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('js', javascript);
  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('ts', typescript);
  hljs.registerLanguage('json', json);
  hljs.registerLanguage('bash', bash);
  hljs.registerLanguage('sh', bash);
  hljs.registerLanguage('shell', bash);
  hljs.registerLanguage('xml', xml);
  hljs.registerLanguage('html', xml);
  hljs.registerLanguage('css', css);
  hljs.registerLanguage('plaintext', plaintext);
  hljs.registerLanguage('plain', plaintext);
  hljs.registerLanguage('txt', plaintext);
  languagesRegistered = true;
}

export async function applyCodeHighlight(root) {
  if (!root) return;
  const blocks = root.querySelectorAll('pre code');
  if (!blocks.length) return;
  await ensureHighlightStyles();
  registerLanguages();
  blocks.forEach((block) => {
    try {
      if (block.classList.contains('hljs')) {
        block.classList.remove('hljs');
        block.removeAttribute('data-highlighted');
      }
      hljs.highlightElement(block);
    } catch {
      /* ignore */
    }
  });
}
