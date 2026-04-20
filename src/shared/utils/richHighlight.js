import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import plaintext from 'highlight.js/lib/languages/plaintext';

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

/**
 * Aplica resaltado a todos los `pre code` dentro de un contenedor (seguro tras sanitizar HTML).
 */
export function applyCodeHighlight(root) {
  if (!root) return;
  root.querySelectorAll('pre code').forEach((block) => {
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
