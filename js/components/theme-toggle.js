/**
 * Tema claro/escuro.
 *
 * A preferência fica em `localStorage` (`agroclima.theme`) e é aplicada em
 * `<html data-theme="...">` — as cores vivem em `css/variables.css` (tema claro)
 * e `css/theme-dark.css` (tema escuro). O `index.html` já aplica o tema antes da
 * primeira pintura para não haver "flash" de tela clara.
 */

import { html } from '../utils/html.js';
import { STORAGE_KEYS, readStorage, writeStorage } from '../utils/storage.js';
import { icon } from './icons.js';

export const THEMES = Object.freeze({ LIGHT: 'light', DARK: 'dark' });
export const THEME_LABELS = Object.freeze({ light: 'Tema claro', dark: 'Tema escuro' });

const THEME_COLORS = { light: '#167c55', dark: '#0d1512' };

export const isTheme = (value) => value === THEMES.LIGHT || value === THEMES.DARK;

export function currentTheme() {
  if (typeof document !== 'undefined' && document.documentElement?.dataset?.theme) {
    const applied = document.documentElement.dataset.theme;
    if (isTheme(applied)) return applied;
  }
  const stored = readStorage(STORAGE_KEYS.theme, null);
  return isTheme(stored) ? stored : THEMES.LIGHT;
}

export function applyTheme(theme, { persist = true } = {}) {
  const next = isTheme(theme) ? theme : THEMES.LIGHT;
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = next;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[next]);
  }
  if (persist) writeStorage(STORAGE_KEYS.theme, next);
  return next;
}

export const toggleTheme = () => applyTheme(currentTheme() === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK);

/** Botão da barra superior. */
export const themeToggleButton = (theme = currentTheme()) => {
  const next = theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
  const label = `Alternar para ${THEME_LABELS[next].toLowerCase()}`;
  return html`<button type="button" class="theme-btn" data-action="toggle-theme" title="${label}" aria-label="${label}">${icon(theme === THEMES.DARK ? 'sun' : 'moon', 17)}<span>${theme === THEMES.DARK ? 'Claro' : 'Escuro'}</span></button>`;
};

/** Cartões de seleção usados em Configurações › Aparência. */
export const themeOptions = (theme = currentTheme()) =>
  html`<div class="theme-options">${[THEMES.LIGHT, THEMES.DARK].map(
    (option) => html`<label class="${option === theme ? 'selected' : ''}">
      <input type="radio" name="theme" value="${option}"${option === theme ? html` checked` : ''} data-action="set-theme" />
      <div class="theme-preview ${option}"></div>
      <strong>${THEME_LABELS[option]}</strong>
    </label>`,
  )}</div>`;
