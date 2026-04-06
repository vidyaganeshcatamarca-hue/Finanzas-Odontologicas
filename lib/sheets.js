/**
 * lib/sheets.js — Cliente Google Sheets (Server-Side Only)
 * Corre EXCLUSIVAMENTE en Next.js API Routes para no exponer credenciales
 */

import { google } from "googleapis";

// ── Autenticación con Service Account ─────────────────────────────────────

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email && !rawKey) throw new Error("Faltan AMBAS: EMAIL y KEY");
  if (!email) throw new Error("Falta variable: GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!rawKey) throw new Error("Falta variable: GOOGLE_PRIVATE_KEY");

  // Limpieza robusta: Vercel puede meter espacios o comillas accidentales
  let key = rawKey.trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.substring(1, key.length - 1);
  }

  // Convertimos \n literales solo si existen en el string
  const privateKey = key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function getSheetsClient(auth) {
  return google.sheets({ version: "v4", auth });
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// ── Función Principal: Leer rango de una hoja ─────────────────────────────

/**
 * Lee un rango de celdas de una hoja específica
 * @param {string} sheetName - Nombre de la hoja (ej: "Abril 2026")
 * @param {string} range - Rango A1 (ej: "B5:B24")
 * @returns {Array} Matriz de valores
 */
export async function readSheetRange(sheetName, range) {
  const auth = getAuth();
  const sheets = getSheetsClient(auth);

  const fullRange = `'${sheetName}'!${range}`;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: fullRange,
      valueRenderOption: "UNFORMATTED_VALUE", // Números reales, no strings formateados
    });
    return response.data.values || [];
  } catch (error) {
    if (error.message?.includes("Unable to parse range")) {
      // La hoja no existe
      return null;
    }
    throw error;
  }
}

/**
 * Lee múltiples rangos de una vez (batch)
 */
async function readBatchRanges(sheetName, ranges) {
  const auth = getAuth();
  const sheets = getSheetsClient(auth);

  const fullRanges = ranges.map((r) => `'${sheetName}'!${r}`);

  try {
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SHEET_ID,
      ranges: fullRanges,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    return response.data.valueRanges || [];
  } catch (error) {
    if (error.message?.includes("Unable to parse range")) return null;
    throw error;
  }
}

// ── Extractor de KPIs Principales (Menús 1 y 2) ───────────────────────────

/**
 * Obtiene todos los KPIs principales de una hoja mensual
 * @param {string} sheetName - Ej: "Abril 2026"
 * @returns {Object} KPIs normalizados
 */
export async function getMonthlyKPIs(sheetName) {
  const ranges = [
    "B5",  // Ventas Totales
    "B7",  // Costos Fijos (parciales / sin honorarios)
    "B8",  // Costos Totales (fijos + variables)
    "B10", // Utilidad Operativa
    "B11", // Honorarios M. Laura
    "B12", // Ingresos Reales (Cobros)
    "B13", // Egresos Reales (Pagos)
    "B14", // Flujo de Caja Neto
    "B16", // Punto de Equilibrio
    "B18", // Margen de Rentabilidad (%)
    "B20", // Margen de Seguridad (%)
    "B22", // Día de Equilibrio (fecha)
    "B24", // Índice de Cobrabilidad (decimal 0–1)
    "B55", // Amortizaciones Equipamiento
  ];

  const batch = await readBatchRanges(sheetName, ranges);
  if (!batch) return null;

  const getValue = (idx) => {
    const vr = batch[idx];
    if (!vr || !vr.values || !vr.values[0]) return null;
    return vr.values[0][0];
  };

  return {
    costosFijosBase:     getValue(1),  // B7 — costos fijos sin honorarios
    costosTotales:       getValue(2),  // B8 — costos totales (fijos + variables)
    ventasTotales:       getValue(0),
    utilidadOperativa:   getValue(3),
    honorariosLaura:     getValue(4),
    ingresosReales:      getValue(5),
    egresosReales:       getValue(6),
    flujoCajaNeto:       getValue(7),
    puntoEquilibrio:     getValue(8),
    margenRentabilidad:  getValue(9),
    margenSeguridad:     getValue(10),
    diaEquilibrio:       getValue(11),
    indiceCobrabilidad:  getValue(12), // decimal 0–1
    amortizaciones:      getValue(13), // B55
  };
}

// ── Tabla de Tratamientos (Menú 3) ────────────────────────────────────────

/**
 * Lee la tabla de tratamientos del rango AA1:AE66
 * Columnas: AA=Producto, AB=Cantidad, AC=MargenUnitario, AD=MargenTotal, AE=PartPonderada
 * Solo incluye productos con cantidad > 0
 * @param {string} sheetName
 * @returns {Array} Array de objetos de tratamiento
 */
export async function getTratamientos(sheetName) {
  const raw = await readSheetRange(sheetName, "AA1:AF66");
  if (!raw || raw.length < 2) return [];

  // Fila 1 = headers, ignorar
  const rows = raw.slice(1);

  return rows
    .filter((row) => row[0] && Number(row[1]) > 0) // debe tener nombre y cantidad > 0
    .map((row) => ({
      nombre:          String(row[0]).trim(),
      cantidad:        Number(row[1]) || 0,
      montoVendido:    Number(row[2]) || 0, // AC
      margenUnitario:  Number(row[3]) || 0, // AD
      margenTotal:     Number(row[4]) || 0, // AE
      participacion:   Number(row[5]) || 0, // AF
    }));
}

// ── Heatmap: márgenes diarios reales (Menú Estrategia) ───────────────────

/**
 * Lee AA71:AB hacia abajo hasta encontrar "Grand Total" en AA
 * Cada fila: AA = fecha (número serial Excel) o string, AB = margen total del día
 * Devuelve array de { fecha: Date, margen: Number }
 * @param {string} sheetName
 */
export async function getHeatmapDays(sheetName) {
  try {
    // Leemos un bloque amplio — hasta 62 días posibles
    const raw = await readSheetRange(sheetName, "AA71:AB135");
    if (!raw || raw.length === 0) return [];

    const result = [];
    for (const row of raw) {
      const cellA = row[0];
      const cellB = row[1];

      // Detectar fila "Grand Total" → parar
      if (typeof cellA === "string" && cellA.toLowerCase().includes("grand total")) break;
      if (!cellA) continue;

      // cellA puede ser número serial de Excel (fecha) o string de fecha
      let fecha = null;
      if (typeof cellA === "number") {
        // Número serial de Excel → JS Date (Excel epoch: 1-Jan-1900 = 1)
        const msExcel = (cellA - 25569) * 86400 * 1000; // 25569 = diff entre Excel y Unix epoch
        fecha = new Date(msExcel);
      } else if (typeof cellA === "string") {
        fecha = new Date(cellA);
      }

      if (!fecha || isNaN(fecha.getTime())) continue;

      const margen = Number(cellB) || 0;
      result.push({ fecha, margen });
    }
    return result;
  } catch (err) {
    console.error("[getHeatmapDays] Error:", err.message);
    return [];
  }
}

// ── Listado de Hojas Disponibles ──────────────────────────────────────────

/**
 * Obtiene los nombres de todas las hojas del spreadsheet
 * Útil para validar si un mes existe antes de pedirlo
 */
export async function getAvailableSheets() {
  const auth = getAuth();
  const sheets = getSheetsClient(auth);

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      fields: "sheets.properties.title",
    });
    return (response.data.sheets || []).map((s) => s.properties.title);
  } catch {
    return [];
  }
}

// ── Gastos por Cuenta ────────────────────────────────────────
/**
 * Lee la tabla de gastos del rango C39:D53
 * C = Nombre de cuenta, D = Total gastado
 * NOTA: readSheetRange usa UNFORMATTED_VALUE → los números llegan como Number reales
 */
export async function getGastos(sheetName) {
  try {
    const raw = await readSheetRange(sheetName, "C39:D53");
    if (!raw || raw.length === 0) return [];

    return raw
      .filter((row) => row && row[0])           // tiene nombre
      .map((row) => ({
        nombre: String(row[0]).trim(),
        total:  row[1] !== undefined ? Number(row[1]) : 0,
      }))
      .filter((g) => g.nombre && g.total > 0);  // solo gastos con valor
  } catch (err) {
    console.error("[getGastos] Error:", err.message);
    return [];
  }
}
