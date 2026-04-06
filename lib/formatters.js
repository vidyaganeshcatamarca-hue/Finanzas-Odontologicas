/**
 * lib/formatters.js — Formato Regional Paraguay
 * Punto para miles, sin decimales en moneda, % con 2 decimales
 */

/**
 * Formatea un número como moneda PYG
 * Ej: 1234567 → "$1.234.567"
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const num = Number(value);
  return "$" + Math.round(num).toLocaleString("es-PY").replace(/,/g, ".");
}

/**
 * Formatea un decimal como porcentaje con 2 decimales
 * Ej: 0.1190 → "11,90%"
 */
export function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const num = Number(value) * 100;
  return num.toLocaleString("es-PY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + "%";
}

/**
 * Formatea un valor ya expresado en % (ej: desde Sheets viene "11.9" o "0.119")
 * Detecta si viene como decimal (< 1) o como porcentaje directo (>= 1)
 */
export function formatPercentSmart(value) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const num = Number(value);
  // Si viene como decimal (ej: 0.119), multiplicar × 100
  const pct = Math.abs(num) < 1 ? num * 100 : num;
  return pct.toLocaleString("es-PY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + "%";
}

/**
 * Normaliza un valor porcentual a decimal (0-1)
 * "11.9" → 0.119 | "0.119" → 0.119
 */
export function normalizePercent(value) {
  const num = Number(value);
  if (isNaN(num)) return 0;
  return Math.abs(num) >= 1 ? num / 100 : num;
}

/**
 * Formatea una fecha en DD/MM/AAAA
 */
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Formatea hora HH:MM
 */
export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Calcula la variación entre dos valores y la formatea
 * Retorna: { value: 0.15, label: "↑ +15,00%", direction: "up" | "down" | "neutral" }
 */
export function formatVariation(current, previous) {
  if (!previous || previous === 0) return { value: 0, label: "—", direction: "neutral" };
  const variation = (current - previous) / Math.abs(previous);
  const pct = (variation * 100).toLocaleString("es-PY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const direction = variation > 0.001 ? "up" : variation < -0.001 ? "down" : "neutral";
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  const sign = variation > 0 ? "+" : "";
  return { value: variation, label: `${arrow} ${sign}${pct}%`, direction };
}

/**
 * Parsea un valor de Google Sheets (puede venir como string con puntos o comas)
 */
export function parseSheetNumber(rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === "") return 0;
  if (typeof rawValue === "number") return rawValue;
  // Remover caracteres no numéricos excepto punto, coma y signo negativo
  const cleaned = String(rawValue)
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")   // punto = miles en es-PY
    .replace(/,/g, ".");  // coma = decimal
  return parseFloat(cleaned) || 0;
}

/**
 * Convierte nombre de mes en español + año a objeto Date
 * Ej: "Abril 2026" → Date(2026, 3, 1)
 */
const MESES_ES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

export function parseSheetMonthName(sheetName) {
  const parts = sheetName.trim().split(" ");
  if (parts.length !== 2) return null;
  const mes = MESES_ES[parts[0].toLowerCase()];
  const anio = parseInt(parts[1]);
  if (mes === undefined || isNaN(anio)) return null;
  return new Date(anio, mes, 1);
}

/**
 * Retorna el nombre de hoja para un mes/año dado
 * Ej: month=3 (abril), year=2026 → "Abril 2026"
 */
const MESES_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function getSheetName(year, month) {
  return `${MESES_NAMES[month]} ${year}`;
}

export function getPreviousSheetName(year, month) {
  if (month === 0) return `Diciembre ${year - 1}`;
  return `${MESES_NAMES[month - 1]} ${year}`;
}

export { MESES_NAMES };
