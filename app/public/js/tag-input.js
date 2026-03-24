// Pursuit Dashboard — Reusable Tag Input Component
// Uses Shoelace <sl-tag> for pills, vanilla input + dropdown for suggestions

export class TagInput {
  constructor(container, { suggestions = [], placeholder = 'Type to add...', onChange } = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.suggestions = suggestions;
    this.values = [];
    this.onChange = onChange;
    this.placeholder = placeholder;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.classList.add('tag-input-wrapper');
    this.container.innerHTML = `
      <div class="tag-input-tags"></div>
      <div class="tag-input-field">
        <input type="text" class="tag-input-text" placeholder="${this.placeholder}" autocomplete="off">
        <div class="tag-input-dropdown hidden"></div>
      </div>
    `;
    this.tagsEl = this.container.querySelector('.tag-input-tags');
    this.inputEl = this.container.querySelector('.tag-input-text');
    this.dropdownEl = this.container.querySelector('.tag-input-dropdown');
  }

  bindEvents() {
    this.inputEl.addEventListener('input', () => this.onInput());
    this.inputEl.addEventListener('keydown', (e) => this.onKeydown(e));
    this.inputEl.addEventListener('focus', () => this.onInput());
    this.inputEl.addEventListener('blur', () => {
      // Delay to allow click on dropdown item
      setTimeout(() => this.hideDropdown(), 150);
    });
  }

  onInput() {
    const query = this.inputEl.value.trim().toLowerCase();
    if (!query) {
      this.hideDropdown();
      return;
    }

    const existing = new Set(this.values.map(v => v.toLowerCase()));
    const matches = this.suggestions
      .filter(s => s.toLowerCase().includes(query) && !existing.has(s.toLowerCase()))
      .slice(0, 8);

    if (matches.length === 0) {
      this.hideDropdown();
      return;
    }

    this.dropdownEl.innerHTML = matches
      .map(m => `<div class="tag-input-option" data-value="${this.escapeAttr(m)}">${this.highlight(m, query)}</div>`)
      .join('');

    this.dropdownEl.querySelectorAll('.tag-input-option').forEach(opt => {
      opt.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.addTag(opt.dataset.value);
        this.inputEl.value = '';
        this.hideDropdown();
        this.inputEl.focus();
      });
    });

    this.dropdownEl.classList.remove('hidden');
  }

  onKeydown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = this.inputEl.value.trim().replace(/,$/, '');
      if (val) {
        this.addTag(val);
        this.inputEl.value = '';
        this.hideDropdown();
      }
    } else if (e.key === 'Backspace' && !this.inputEl.value && this.values.length > 0) {
      this.removeTag(this.values[this.values.length - 1]);
    }
  }

  addTag(value) {
    const normalized = value.trim();
    if (!normalized || this.values.some(v => v.toLowerCase() === normalized.toLowerCase())) return;
    this.values.push(normalized);
    this.renderTags();
    this.notify();
  }

  removeTag(value) {
    this.values = this.values.filter(v => v !== value);
    this.renderTags();
    this.notify();
  }

  renderTags() {
    this.tagsEl.innerHTML = this.values
      .map(v => `<sl-tag size="small" removable data-value="${this.escapeAttr(v)}">${this.escapeHtml(v)}</sl-tag>`)
      .join('');

    this.tagsEl.querySelectorAll('sl-tag').forEach(tag => {
      tag.addEventListener('sl-remove', () => {
        this.removeTag(tag.dataset.value);
      });
    });
  }

  hideDropdown() {
    this.dropdownEl.classList.add('hidden');
  }

  getValue() {
    return [...this.values];
  }

  setValue(arr) {
    this.values = [...arr];
    this.renderTags();
  }

  notify() {
    if (this.onChange) this.onChange(this.getValue());
  }

  highlight(text, query) {
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return this.escapeHtml(text);
    return this.escapeHtml(text.slice(0, idx)) +
      '<strong>' + this.escapeHtml(text.slice(idx, idx + query.length)) + '</strong>' +
      this.escapeHtml(text.slice(idx + query.length));
  }

  escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}
