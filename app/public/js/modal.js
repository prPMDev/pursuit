// Pursuit Dashboard — Modal system
import { html } from './util.js';
import { icon } from './icons.js';

const container = () => document.getElementById('modal-container');

/**
 * Create a modal and append it to #modal-container.
 * Returns { show(), hide(), el, contentEl }.
 */
export function createModal(id, { title, wide = false } = {}) {
  const el = document.createElement('div');
  el.className = 'modal hidden';
  el.id = id;

  el.innerHTML = html`
    <div class="modal-content${wide ? ' modal-wide' : ''}">
      <div class="modal-header">
        <h3>${title || ''}</h3>
        <button class="btn btn-icon-only modal-close" data-modal="${id}">
          ${icon('x', 16)}
        </button>
      </div>
      <div class="modal-body"></div>
    </div>
  `;

  // Close on X button
  el.querySelector('.modal-close').addEventListener('click', () => hide());

  // Close on backdrop click
  el.addEventListener('click', (e) => {
    if (e.target === el) hide();
  });

  function show() { el.classList.remove('hidden'); }
  function hide() { el.classList.add('hidden'); }

  container().appendChild(el);

  return {
    show,
    hide,
    el,
    contentEl: el.querySelector('.modal-body'),
  };
}

/**
 * Show a modal by ID (for backwards compat during migration).
 */
export function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

/**
 * Hide a modal by ID (for backwards compat during migration).
 */
export function hideModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

/**
 * Initialize close handlers for any modals already in the DOM.
 */
export function initModals() {
  // Close buttons with data-modal attribute
  document.querySelectorAll('[data-modal]').forEach(el => {
    el.addEventListener('click', () => {
      const modalId = el.dataset.modal;
      if (modalId) hideModal(modalId);
    });
  });

  // Backdrop click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });
}
