import { NextResponse } from "next/server";
import {
  getMonthlyKPIs,
  getTratamientos,
  getAvailableSheets,
  getGastos,
  getHeatmapDays,
} from "@/lib/sheets";
import { getSheetName } from "@/lib/formatters";
import {
  parseSheetNumber,
  normalizePercent,
} from "@/lib/formatters";
// [OPTIMIZACIÓN 3: REACT.CACHE() IMPLEMENTATION]
import {
  getCachedKPIs,
  getCachedTratamientos,
  getCachedGastos,
  getCachedHeatmap,
} from "@/lib/cache";

/**
 * GET /api/sheets?year=2026&month=3&type=kpis|tratamientos|sheets
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type  = searchParams.get("type")  ?? "kpis";
  console.log(`==> API REQUEST: ${type} from ${request.headers.get('host')}`);
  const year  = parseInt(searchParams.get("year")  ?? new Date().getFullYear());
  const month = parseInt(searchParams.get("month") ?? new Date().getMonth());

  try {
    // ── Listar hojas disponibles ─────────────────────────────
    if (type === "sheets") {
      const sheets = await getAvailableSheets();
      return NextResponse.json({ sheets });
    }

    const sheetName = getSheetName(year, month);

    // ── KPIs principales ─────────────────────────────────────
    if (type === "kpis") {
      // [OPTIMIZACIÓN 1: PARALLEL FETCHING]
      const prev1Month = month === 0 ? 11 : month - 1;
      const prev1Year  = month === 0 ? year - 1 : year;
      
      const prev2Month = prev1Month === 0 ? 11 : prev1Month - 1;
      const prev2Year  = prev1Month === 0 ? prev1Year - 1 : prev1Year;
      
      const prev3Month = prev2Month === 0 ? 11 : prev2Month - 1;
      const prev3Year  = prev2Month === 0 ? prev2Year - 1 : prev2Year;

      const prev1SheetName = getSheetName(prev1Year, prev1Month);
      const prev2SheetName = getSheetName(prev2Year, prev2Month);
      const prev3SheetName = getSheetName(prev3Year, prev3Month);
      
      // [OPTIMIZACIÓN 1 + 3: PARALLEL FETCHING + CACHE]
      const [raw, rawPrev1, rawPrev2, rawPrev3] = await Promise.all([
        getCachedKPIs(year, month, () => getMonthlyKPIs(sheetName)),
        getCachedKPIs(prev1Year, prev1Month, () => getMonthlyKPIs(prev1SheetName)),
        getCachedKPIs(prev2Year, prev2Month, () => getMonthlyKPIs(prev2SheetName)),
        getCachedKPIs(prev3Year, prev3Month, () => getMonthlyKPIs(prev3SheetName)),
      ]);

      if (!raw) {
        return NextResponse.json(
          { error: `La hoja "${sheetName}" no existe en el Google Sheet.` },
          { status: 404 }
        );
      }

      // Costos: B7=costosFijos, B8=costosTotales → variables = total - fijos
      const costosFijosRaw    = parseSheetNumber(raw.costosFijosBase);
      const costosTotalesRaw  = parseSheetNumber(raw.costosTotales);
      const costosVariablesCalc = Math.max(costosTotalesRaw - costosFijosRaw, 0);

      // Promediado inteligente Fix (3 meses)
      let sumCostos = 0;
      let countCostos = 0;
      [rawPrev1, rawPrev2, rawPrev3].forEach(p => {
        if (p) {
          const costo = parseSheetNumber(p.costosFijosBase);
          if (costo > 0) {
            sumCostos += costo;
            countCostos++;
          }
        }
      });
      const costoFijoPromedio = countCostos > 0 ? (sumCostos / countCostos) : 0;

      const kpis = {
        ventasTotales:      parseSheetNumber(raw.ventasTotales),
        costosVariables:    costosVariablesCalc,          // calculado
        costosFijos:        costosFijosRaw,               // B7
        costosTotales:      costosTotalesRaw,             // B8
        utilidadOperativa:  parseSheetNumber(raw.utilidadOperativa),
        honorariosLaura:    parseSheetNumber(raw.honorariosLaura),
        ingresosReales:     parseSheetNumber(raw.ingresosReales),
        egresosReales:      parseSheetNumber(raw.egresosReales),
        flujoCajaNeto:      parseSheetNumber(raw.flujoCajaNeto),
        puntoEquilibrio:    parseSheetNumber(raw.puntoEquilibrio),
        margenRentabilidad: normalizePercent(raw.margenRentabilidad),
        margenSeguridad:    normalizePercent(raw.margenSeguridad),
        diaEquilibrio:      raw.diaEquilibrio,
        indiceCobrabilidad: parseSheetNumber(raw.indiceCobrabilidad),
        amortizaciones:     parseSheetNumber(raw.amortizaciones),
        ratioMargenReal:    parseSheetNumber(raw.ratioMargenReal),
        costoFijoPromedio:  costoFijoPromedio,
        // Mes anterior (prev1) — base para comparación y agente IA
        prev: rawPrev1 ? {
          ventasTotales:      parseSheetNumber(rawPrev1.ventasTotales),
          costosFijos:        parseSheetNumber(rawPrev1.costosFijosBase),
          puntoEquilibrio:    parseSheetNumber(rawPrev1.puntoEquilibrio),
          margenSeguridad:    normalizePercent(rawPrev1.margenSeguridad),
          // [AGENTE IA] campos adicionales del mes anterior
          utilidadOperativa:  parseSheetNumber(rawPrev1.utilidadOperativa),
          margenRentabilidad: normalizePercent(rawPrev1.margenRentabilidad),
          indiceCobrabilidad: parseSheetNumber(rawPrev1.indiceCobrabilidad),
          year: prev1Year,
          month: prev1Month,
        } : null,
        // [AGENTE IA] trimestre previo — mismos datos ya fetchados por Promise.all
        prev2: rawPrev2 ? {
          nombre:             prev2SheetName,
          utilidadOperativa:  parseSheetNumber(rawPrev2.utilidadOperativa),
          margenRentabilidad: normalizePercent(rawPrev2.margenRentabilidad),
          margenSeguridad:    normalizePercent(rawPrev2.margenSeguridad),
          year: prev2Year,
          month: prev2Month,
        } : null,
        prev3: rawPrev3 ? {
          nombre:             prev3SheetName,
          utilidadOperativa:  parseSheetNumber(rawPrev3.utilidadOperativa),
          margenRentabilidad: normalizePercent(rawPrev3.margenRentabilidad),
          margenSeguridad:    normalizePercent(rawPrev3.margenSeguridad),
          year: prev3Year,
          month: prev3Month,
        } : null,
        sheetName, prevSheetName: prev1SheetName, year, month,
        fetchedAt: new Date().toISOString(),
      };

      return NextResponse.json(kpis);
    }

    // ── Tabla de tratamientos ────────────────────────────────
    if (type === "tratamientos") {
      // [OPTIMIZACIÓN 1: PARALLEL FETCHING]
      // Ejecutamos las 2 llamadas en paralelo para reducir tiempo de respuesta
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear  = month === 0 ? year - 1 : year;
      const prevSheetName = getSheetName(prevYear, prevMonth);
      
      const [tratamientos, tratamientosPrev] = await Promise.all([
        getTratamientos(sheetName),
        getTratamientos(prevSheetName),
      ]);

      return NextResponse.json({
        tratamientos,
        tratamientosPrev,
        sheetName,
        fetchedAt: new Date().toISOString(),
      });
    }

    // ── gastos por cuenta ──────────────────────────────────────
    if (type === "gastos") {
      // [COMPLETO: PARALLELIZAR GASTOS]
      const [gastos, rawKpis] = await Promise.all([
        getCachedGastos(year, month, () => getGastos(sheetName)),
        getCachedKPIs(year, month, () => getMonthlyKPIs(sheetName)),
      ]);
      const ventasTotales = rawKpis ? parseSheetNumber(rawKpis.ventasTotales) : 0;
      return NextResponse.json({
        gastos,
        ventasTotales,
        sheetName,
        fetchedAt: new Date().toISOString(),
      });
    }

    // ── Heatmap de márgenes diarios ────────────────────────────
    if (type === "heatmap") {
      const days = await getHeatmapDays(sheetName);
      return NextResponse.json({
        days: days.map((d) => ({
          fecha: d.fecha.toISOString(),
          margen: d.margen,
        })),
        sheetName,
        fetchedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Tipo de consulta inválido" }, { status: 400 });

  } catch (error) {
    console.error("[API/sheets] [FORCE_NEW_CODE] Error:", error.message);
    return NextResponse.json(
      { error: "[FORCE_NEW_CODE] Error al conectar con Google Sheets: " + error.message },
      { status: 500 }
    );
  }
}
