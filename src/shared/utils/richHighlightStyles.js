let highlightCssLoaded = false;

export async function ensureHighlightStyles() {
  if (highlightCssLoaded || typeof document === 'undefined') return;
  highlightCssLoaded = true;
  await import('highlight.js/styles/github.css');
}
