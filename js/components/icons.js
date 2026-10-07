/**
 * Conjunto fixo de ícones em SVG inline (sem CDN, sem dependências — RNF07).
 *
 * Cada ícone é um trecho de `path` desenhado em grade 24×24 e colorido por
 * `currentColor`, o que faz o ícone herdar a cor do contexto (inclusive no tema
 * escuro). Nomes desconhecidos lançam erro: é melhor quebrar no desenvolvimento
 * do que renderizar um vazio silencioso na apresentação.
 */

import { trusted } from '../utils/html.js';

const PATHS = {
  /* Navegação e estrutura */
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  'chevron-left': '<path d="M15 6l-6 6 6 6"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
  'arrow-down': '<path d="M12 5v14M6 13l6 6 6-6"/>',
  'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4-2v-4z"/>',
  'chevron-down': '<path d="M6 9l6 6 6-6"/>',

  /* Clima, campo e dados */
  cloud: '<path d="M17.5 19H6.2a4.2 4.2 0 0 1-.7-8.3A6.5 6.5 0 0 1 18 9.5a4.8 4.8 0 0 1-.5 9.5Z"/>',
  'cloud-off': '<path d="M3 3l18 18"/><path d="M17.5 19H6.2a4.2 4.2 0 0 1-.7-8.3 6.5 6.5 0 0 1 3-4"/>',
  thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z"/><path d="M12 9v7"/>',
  drop: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/>',
  leaf: '<path d="M20 4S9 3 5 9c-3 5 1 10 5 10 7 0 10-15 10-15Z"/><path d="M4 21c3-7 8-10 14-14"/>',
  truck: '<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
  server: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3"/>',
  wifi: '<path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0M9.5 16a4 4 0 0 1 5 0"/><circle cx="12" cy="20" r="1"/>',
  'wifi-off': '<path d="M3 3l18 18M8.5 16.4a4 4 0 0 1 5-.4M6 12a9 9 0 0 1 3.6-2.1M18 12a9 9 0 0 0-3-2.6M3 8a14 14 0 0 1 4.2-2.6M21 8a14 14 0 0 0-6.5-3.3"/><circle cx="12" cy="20" r="1"/>',
  activity: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  trend: '<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
  market: '<path d="M4 10h16v10H4z"/><path d="M2 10l3-6h14l3 6M8 20v-6h4v6"/>',
  compare: '<path d="M8 3 4 7l4 4M4 7h13a3 3 0 0 1 3 3v1M16 21l4-4-4-4m4 4H7a3 3 0 0 1-3-3v-1"/>',
  quality: '<path d="m12 3 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.3-4.5 2.3.9-5-3.6-3.5 5-.7z"/><path d="m9.5 11.5 1.5 1.5 3.5-4"/>',
  model: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="m8 7 3 9m5-9-3 9M8 6h8"/>',
  flask: '<path d="M9 3h6v5l4 9a2 2 0 0 1-1.8 3H6.8A2 2 0 0 1 5 17l4-9z"/><path d="M8 14h8"/>',
  report: '<path d="M5 3h11l3 3v15H5z"/><path d="M15 3v4h4M8 12h8M8 16h6M8 8h3"/>',
  clipboard: '<path d="M9 3h6v3H9zM7 5H5v16h14V5h-2"/><path d="M9 12h6M9 16h4"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"/><path d="M8 3v18"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  scale: '<path d="M12 4v16M6 8h12M6 8l-3 6h6zM18 8l-3 6h6z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',

  /* Alertas e status */
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  warning: '<path d="m12 3 10 18H2z"/><path d="M12 9v5M12 18h.01"/>',
  'alert-triangle': '<path d="m12 3 10 18H2z"/><path d="M12 9v5M12 18h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  'x-circle': '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>',

  /* Segurança e administração */
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  key: '<circle cx="8" cy="14" r="4"/><path d="m11 11 8-8M17 5l2 2M14 8l2 2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  'user-check': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
  'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M18 8v6M15 11h6"/>',
  'user-x': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 9 5 5m0-5-5 5"/>',
  logs: '<path d="M5 4h14v16H5zM9 4V2h6v2M8 9h8M8 13h8M8 17h5"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
  'eye-off': '<path d="M3 3l18 18M10.6 10.6A2.5 2.5 0 0 0 12 14.5c.7 0 1.3-.3 1.8-.7M6.5 6.7C3.9 8.2 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1.1M9.9 6.2A11 11 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-2.6 3.2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a2 2 0 0 0 .4 2.2l.1.1-2.6 2.6-.1-.1a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.2 1.8V21h-3.6v-.2A2 2 0 0 0 9 19a2 2 0 0 0-2.2.4l-.1.1-2.6-2.6.1-.1A2 2 0 0 0 4.6 15a2 2 0 0 0-1.8-1.2H3v-3.6h.2A2 2 0 0 0 5 9a2 2 0 0 0-.4-2.2l-.1-.1 2.6-2.6.1.1A2 2 0 0 0 9 4.6a2 2 0 0 0 1.2-1.8V3h3.6v.2A2 2 0 0 0 15 5a2 2 0 0 0 2.2-.4l.1-.1 2.6 2.6-.1.1a2 2 0 0 0-.4 1.8 2 2 0 0 0 1.8 1.2h.2v3.6h-.2A2 2 0 0 0 19.4 15Z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2.8-1.2 1.7M12 17h.01"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',

  /* Ações */
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 19h16"/>',
  upload: '<path d="M12 21V9m-4 4 4-4 4 4M4 5h16"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7V3M8 15h8"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m14 6 4 4"/>',
  send: '<path d="M21 3 3 10l7 3 3 7z"/><path d="m10 13 4-4"/>',
  printer: '<path d="M7 8V3h10v5M7 18H5v-6h14v6h-2M7 14h10v7H7z"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>',
  logout: '<path d="M10 5H4v14h6M14 8l4 4-4 4M18 12H9"/>',
  login: '<path d="M14 5h6v14h-6M10 8 6 12l4 4M6 12h9"/>',

  /* Tema */
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9 6.3 6.3m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M18.5 5.5l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z"/>',

  /* Localização e empresa */
  'map-pin': '<path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/>',
  building: '<path d="M4 21V4h10v17M14 9h6v12M7 8h4M7 12h4M7 16h4M17 13h1M17 17h1"/>',
  package: '<path d="m12 3 8 4v10l-8 4-8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/>',
  route: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M9 18h6a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6"/>',
};

export const iconNames = Object.freeze(Object.keys(PATHS));

export const hasIcon = (name) => Object.prototype.hasOwnProperty.call(PATHS, name);

/** Devolve o SVG do ícone; nome desconhecido lança erro (ver topo do arquivo). */
export function icon(name, size = 18) {
  const path = PATHS[name];
  if (!path) throw new Error(`Ícone não registrado: "${name}". Consulte js/components/icons.js.`);
  return trusted(
    `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`,
  );
}
