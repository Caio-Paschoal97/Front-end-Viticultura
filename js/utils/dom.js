/** Utilitários de DOM usados pela camada de eventos e de renderização. */

export const queryRequired = (selector, root = document) => {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Elemento não encontrado: ${selector}`);
  return element;
};

export const query = (selector, root = document) => root.querySelector(selector);

/** Define o conteúdo de um contêiner a partir de marcação gerada por `html` (valores já escapados). */
export function mount(container, markup) {
  container.innerHTML = String(markup);
}

/** Substitui um elemento por um novo trecho de marcação (usado na troca da área da página). */
export function replaceElement(target, markup) {
  const template = document.createElement('template');
  template.innerHTML = String(markup);
  target.replaceWith(template.content);
}

/** Define a classe `name` conforme `enabled`, sem tocar nas demais. */
export function toggleClass(element, name, enabled) {
  if (!element) return;
  element.classList.toggle(name, Boolean(enabled));
}

export function setAttribute(element, name, value) {
  if (!element) return;
  if (value === null || value === undefined || value === false) element.removeAttribute(name);
  else element.setAttribute(name, String(value));
}

/** Rola a área principal para o topo (troca de página em telas pequenas). */
export function scrollToTop(root = document) {
  if (typeof window === 'undefined') return;
  const main = root.querySelector('main');
  if (main && window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Move o foco para o primeiro elemento focável do contêiner (usado em modais). */
export function focusFirst(container) {
  if (!container) return;
  const target = container.querySelector('input, select, textarea, button');
  if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
}
