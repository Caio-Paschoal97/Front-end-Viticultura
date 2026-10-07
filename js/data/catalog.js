/**
 * Catálogo de variedades de uva monitoradas.
 *
 * Espelha a entidade `GrapeVariety` do back-end (`name`, `variety_type`,
 * `cycle_days`, `active`) e acrescenta as faixas agronômicas usadas nas telas
 * do produtor (temperatura/umidade ideais) e o preço de referência do mercado.
 */

export const DEFAULT_VARIETY = 'Uva Itália';

export const VARIETIES = Object.freeze([
  {
    name: 'Uva Itália',
    short: 'Itália',
    type: 'Uva de mesa',
    cycleDays: 120,
    color: 'green',
    active: true,
    idealTemperature: { min: 24, max: 30 },
    idealHumidity: { min: 60, max: 72 },
    basePrice: 8.42,
    temperature: 28.4,
    humidity: 67,
    market: 'União Europeia',
  },
  {
    name: 'Crimson Seedless',
    short: 'Crimson',
    type: 'Sem sementes',
    cycleDays: 115,
    color: 'wine',
    active: true,
    idealTemperature: { min: 24, max: 31 },
    idealHumidity: { min: 58, max: 70 },
    basePrice: 9.18,
    temperature: 27.9,
    humidity: 65,
    market: 'Estados Unidos',
  },
  {
    name: 'Thompson Seedless',
    short: 'Thompson',
    type: 'Sem sementes',
    cycleDays: 110,
    color: 'gold',
    active: true,
    idealTemperature: { min: 23, max: 30 },
    idealHumidity: { min: 55, max: 68 },
    basePrice: 8.76,
    temperature: 29.1,
    humidity: 71,
    market: 'Reino Unido',
  },
  {
    name: 'Sweet Globe',
    short: 'Sweet Globe',
    type: 'Sem sementes',
    cycleDays: 118,
    color: 'blue',
    active: true,
    idealTemperature: { min: 24, max: 30 },
    idealHumidity: { min: 58, max: 70 },
    basePrice: 10.25,
    temperature: 28.2,
    humidity: 66,
    market: 'União Europeia',
  },
  {
    name: 'Uva Vitória',
    short: 'Vitória',
    type: 'Sem sementes',
    cycleDays: 112,
    color: 'purple',
    active: true,
    idealTemperature: { min: 24, max: 30 },
    idealHumidity: { min: 60, max: 72 },
    basePrice: 9.64,
    temperature: 28.7,
    humidity: 69,
    market: 'Canadá',
  },
]);

export const findVariety = (name) => VARIETIES.find((variety) => variety.name === name) ?? VARIETIES[0];

export const varietyNames = () => VARIETIES.map((variety) => variety.name);

export const varietyExists = (name) => VARIETIES.some((variety) => variety.name === name);

/** Mercados de destino considerados nos embarques (RF03/RF07). */
export const MARKETS = Object.freeze([
  { name: 'União Europeia', share: 34, demand: 'HIGH' },
  { name: 'Estados Unidos', share: 26, demand: 'HIGH' },
  { name: 'Reino Unido', share: 18, demand: 'MEDIUM' },
  { name: 'Canadá', share: 12, demand: 'MEDIUM' },
  { name: 'Emirados Árabes', share: 6, demand: 'LOW' },
  { name: 'Argentina', share: 4, demand: 'LOW' },
]);
