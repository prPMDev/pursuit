// Pursuit Dashboard — Shared utilities

/**
 * Escape HTML entities to prevent XSS.
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

/**
 * Tagged template for readable multi-line HTML strings.
 * Usage: html`<div class="${cls}">${content}</div>`
 */
export function html(strings, ...values) {
  return strings.reduce((result, str, i) => result + str + (values[i] ?? ''), '');
}
