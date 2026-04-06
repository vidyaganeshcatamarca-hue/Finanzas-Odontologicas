/**
 * lib/calculations.js — Motor de Cálculos Financieros
 * PTD, Prorrateo de Costos Fijos (Accrual), Proyecciones de Cierre
 */

import { normalizePercent } from "./formatters";

// ── Helpers de Calendario ──────────────────────────────────────────────────

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getCurrentDayOfMonth() {
  return new Date().getDate();
}

export function isCurrentMonth(year, month) {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month;
}

// ── Motor de Prorrateo (Accrual Engine) ────────────────────────────────────
// Solo aplica cuando se visualiza el MES ACTUAL
// NO aplica a meses cerrados (ya tienen costos reales pagados)
// NO aplica al Menú 3 (análisis de margen de contribución)

/**
 * Calcula el Costo Fijo Devengado para el mes actual
 * @param {number} costoFijoReferencia - Promedio de costos fijos de meses anteriores
 * @param {number} diaActual - Día actual del mes (1-31)
 * @param {number} diasTotalesMes - Total de días del mes actual
 * @returns {number} Costo fijo proporcional al día actual
 */
export function calcCostoFijoDevengado(costoFijoReferencia, diaActual, diasTotalesMes) {
  if (!costoFijoReferencia || diasTotalesMes === 0) return 0;
  return costoFijoReferencia * (diaActual / diasTotalesMes);
}

/**
 * Calcula el Factor de Prorrateo (0 a 1)
 */
export function calcFactorProrrateo(diaActual, diasTotalesMes) {
  return diaActual / diasTotalesMes;
}

// ── Cálculos de Utilidad con Accrual ──────────────────────────────────────

/**
 * Utilidad Operativa ajustada con Accrual (Menú 1 — mes actual)
 * Utilidad = Ventas - CostosVariables - CostoFijoDevengado
 */
export function calcUtilidadConAccrual(ventas, costosVariables, costoFijoDevengado) {
  return ventas - costosVariables - costoFijoDevengado;
}

/**
 * Utilidad usando datos reales del Sheet (meses cerrados)
 */
export function calcUtilidadReal(ventas, costosTotales) {
  return ventas - costosTotales;
}

// ── Motor PTD (Period-to-Date) ─────────────────────────────────────────────

/**
 * Determina qué tipo de comparación PTD usar
 * @returns "ptd" si es mes actual, "full" si es mes pasado
 */
export function getPTDMode(selectedYear, selectedMonth) {
  return isCurrentMonth(selectedYear, selectedMonth) ? "ptd" : "full";
}

/**
 * Calcula variación porcentual entre dos valores
 * @returns {number} Variación como decimal (ej: 0.15 = +15%)
 */
export function calcVariation(current, previous) {
  if (!previous || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

// ── Proyección de Cierre de Mes (Menú 4) ──────────────────────────────────

/**
 * Proyecta las ventas al cierre del mes
 * Combina el ritmo actual (PTD) con estadística histórica de crecimiento
 *
 * @param {number} ventasPTD - Ventas acumuladas hasta hoy
 * @param {number} diaActual - Día actual del mes
 * @param {number} diasTotales - Total días del mes
 * @param {number|null} tasaCrecimientoHistorico - Tasa de crecimiento promedio meses anteriores (opcional)
 * @returns {number} Ventas proyectadas al cierre
 */
export function calcProyeccionCierre(ventasPTD, diaActual, diasTotales, tasaCrecimientoHistorico = null) {
  if (!ventasPTD || diaActual === 0) return 0;

  // Ritmo diario actual
  const ritmoDiario = ventasPTD / diaActual;

  // Días que faltan
  const diasRestantes = diasTotales - diaActual;

  // Proyección base: ritmo actual × días totales
  const proyeccionBase = ritmoDiario * diasTotales;

  // Si tenemos datos históricos, combinar 70% ritmo actual + 30% tendencia histórica
  if (tasaCrecimientoHistorico !== null && !isNaN(tasaCrecimientoHistorico)) {
    const factorHistorico = 1 + tasaCrecimientoHistorico;
    const proyeccionHistorica = ventasPTD + (ritmoDiario * diasRestantes * factorHistorico);
    return proyeccionBase * 0.7 + proyeccionHistorica * 0.3;
  }

  return proyeccionBase;
}

/**
 * Calcula la tasa de crecimiento histórica entre dos meses
 * @param {number} ventasMesActualPTD - Ventas del mes actual hasta día N
 * @param {number} ventasMesAnteriorPTD - Ventas del mes anterior hasta mismo día N
 */
export function calcTasaCrecimientoHistorico(ventasMesActualPTD, ventasMesAnteriorPTD) {
  if (!ventasMesAnteriorPTD || ventasMesAnteriorPTD === 0) return 0;
  return (ventasMesActualPTD - ventasMesAnteriorPTD) / ventasMesAnteriorPTD;
}

// ── Semáforos ──────────────────────────────────────────────────────────────

/**
 * Determina el estado de salud global basado en Margen de Seguridad
 * @param {number} margenSeguridad - Como decimal (ej: 0.18)
 * @returns {"critico"|"precaucion"|"saludable"}
 */
export function calcEstadoGlobal(margenSeguridad) {
  const ms = normalizePercent(margenSeguridad);
  if (ms < 0.10) return "critico";
  if (ms <= 0.20) return "precaucion";
  return "saludable";
}

/**
 * Determina el estado de liquidez (Menú 2)
 * @param {number} utilidad - Utilidad operativa
 * @param {number} flujoCaja - Flujo de caja neto
 * @param {number} ventas - Para calcular ratio de caja
 * @returns {"saludable"|"advertencia"|"riesgo"}
 */
export function calcEstadoLiquidez(utilidad, flujoCaja, ventas) {
  if (utilidad <= 0) return "riesgo";
  if (flujoCaja > 0) return "saludable";
  const ratioCaja = ventas > 0 ? flujoCaja / ventas : 0;
  if (Math.abs(ratioCaja) < 0.05) return "advertencia"; // Caja ≈ 0
  return "riesgo";
}

/**
 * Determina el estado de cumplimiento de metas (Menú 4)
 */
export function calcEstadoProyeccion(ventasProyectadas, puntoEquilibrio) {
  if (ventasProyectadas > puntoEquilibrio * 1.20) return "en_camino";
  if (ventasProyectadas > puntoEquilibrio) return "zona_riesgo";
  return "alerta_perdida";
}

/**
 * Determina concentración de margen para Menú 3
 * Calcula cuántos tratamientos representan el 80% del margen total
 * @param {Array} tratamientos - Array de {nombre, margenTotal}
 * @returns {"optimo"|"alerta"|"riesgo"}
 */
export function calcConcentracionMargen(tratamientos) {
  if (!tratamientos || tratamientos.length === 0) return "optimo";

  const sorted = [...tratamientos].sort((a, b) => b.margenTotal - a.margenTotal);
  const totalMargen = sorted.reduce((sum, t) => sum + Math.max(0, t.margenTotal), 0);

  if (totalMargen === 0) return "optimo";

  let acumulado = 0;
  let count = 0;
  for (const t of sorted) {
    acumulado += Math.max(0, t.margenTotal);
    count++;
    if (acumulado / totalMargen >= 0.8) break;
  }

  if (count > 5) return "optimo";
  if (count === 3) return "alerta";
  return "riesgo"; // 1 o 2 tratamientos
}

// ── Día de Equilibrio ──────────────────────────────────────────────────────

/**
 * Parsea el día de equilibrio del Sheet
 * Puede venir como: número de día (15), fecha texto ("15/04/2026"),
 * o número de serie Excel (46082 = días desde 1/1/1900)
 * @param {string|number} rawValue - Valor crudo del Sheet
 * @returns {number} Número de día del mes (1-31)
 */
export function parseDiaEquilibrio(rawValue) {
  if (!rawValue) return null;

  const num = Number(rawValue);

  // Número de serie Excel: mayor a 1000 → es un serial de fecha
  // Excel: 1 = 01/01/1900. Fórmula: new Date(serial - 25569 días + epoch)
  if (!isNaN(num) && num > 1000) {
    // Convertir serial Excel a fecha JS
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Base Excel
    const date = new Date(excelEpoch.getTime() + num * 86400000);
    return date.getUTCDate(); // retorna el día del mes
  }

  // Si es un número pequeño (día directo: 1-31)
  if (!isNaN(num) && num >= 1 && num <= 31) {
    return Math.round(num);
  }

  // Si es string con formato de fecha "DD/MM/AAAA"
  const str = String(rawValue).trim();
  if (str.includes("/")) {
    const parts = str.split("/");
    return parseInt(parts[0]);
  }
  if (str.includes("-")) {
    const parts = str.split("-");
    return parseInt(parts[2]); // AAAA-MM-DD
  }

  return parseInt(str) || null;
}

// ── Heatmap Data ───────────────────────────────────────────────────────────

/**
 * Genera estructura de datos para el Mapa de Calor mensual
 * Crea grilla de 5 semanas × 7 días para el mes dado
 */
export function buildHeatmapData(year, month, dailyMargins = {}) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
  const daysInMonth = getDaysInMonth(year, month);
  const grid = [];

  let dayNum = 1;
  for (let week = 0; week < 6; week++) {
    const row = [];
    for (let dow = 0; dow < 7; dow++) {
      const cellIndex = week * 7 + dow;
      if (cellIndex < firstDay || dayNum > daysInMonth) {
        row.push({ day: null, margin: null });
      } else {
        row.push({
          day: dayNum,
          margin: dailyMargins[dayNum] ?? null,
        });
        dayNum++;
      }
    }
    if (row.some((c) => c.day !== null)) grid.push(row);
    if (dayNum > daysInMonth) break;
  }
  return grid;
}
