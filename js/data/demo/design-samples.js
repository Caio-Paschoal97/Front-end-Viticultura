/**
 * Amostras fixas usadas apenas na tela Admin › Design System.
 * Reaproveita o gerador de séries do modo demonstração para que os gráficos da
 * documentação tenham exatamente a mesma aparência dos gráficos reais.
 */

import { buildTemperatureSeries } from './series.js';
import { findVariety } from '../catalog.js';

export const TEMPERATURE_SERIES_POINTS = buildTemperatureSeries(findVariety('Uva Itália'), { points: 24, stepMinutes: 60 });
export const HUMIDITY_SERIES_POINTS = buildTemperatureSeries(findVariety('Crimson Seedless'), { points: 24, stepMinutes: 60 });
