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
      // Ejecutamos las 2 llamadas en paralelo para reducir tiempo de respuesta
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear  = month === 0 ? year - 1 : year;
      const prevSheetName = getSheetName(prevYear, prevMonth);
      
      // [OPTIMIZACIÓN 1 + 3: PARALLEL FETCHING + CACHE]
      const [raw, rawPrev] = await Promise.all([
        getCachedKPIs(year, month, () => getMonthlyKPIs(sheetName)),
        getCachedKPIs(prevYear, prevMonth, () => getMonthlyKPIs(prevSheetName)),
      ]);

      if (!raw) {
        return NextResponse.json(
          { error: `La hoja "${sheetName}" no existe en el Google Sheet.` },
          { status: 404 }
        );
      }

      const costosFijosRaw    = parseSheetNumber(raw.costosFijosBase);
      const honorariosRaw     = parseSheetNumber(raw.honorariosLaura);
      const costosTotalesRaw  = parseSheetNumber(raw.costosTotales);
      const costosVariablesCalc = Math.max(costosTotalesRaw - costosFijosRaw, 0);

      const kpis = {
        ventasTotales:      parseSheetNumber(raw.ventasTotales),
        costosVariables:    costosVariablesCalc,          // calculado
        costosFijos:        costosFijosRaw,               // B7
        honorariosLaura:    honorariosRaw,                // B11
        costosFijosTotales: costosFijosRaw + honorariosRaw, // B7 + B11
        costosTotales:      costosTotalesRaw,             // B8
        utilidadOperativa:  parseSheetNumber(raw.utilidadOperativa),
        ingresosReales:     parseSheetNumber(raw.ingresosReales),
        egresosReales:      parseSheetNumber(raw.egresosReales),
        flujoCajaNeto:      parseSheetNumber(raw.flujoCajaNeto),
        puntoEquilibrio:    parseSheetNumber(raw.puntoEquilibrio),
        margenRentabilidad: normalizePercent(raw.margenRentabilidad),
        margenSeguridad:    normalizePercent(raw.margenSeguridad),
        diaEquilibrio:      raw.diaEquilibrio,
        indiceCobrabilidad: parseSheetNumber(raw.indiceCobrabilidad),
        amortizaciones:     parseSheetNumber(raw.amortizaciones),
        ratioMargenReferencia: normalizePercent(raw.ratioMargenReferencia), // AB67
        prev: rawPrev ? {
          ventasTotales:   parseSheetNumber(rawPrev.ventasTotales),
          costosFijos:     parseSheetNumber(rawPrev.costosFijosBase),
          honorariosLaura: parseSheetNumber(rawPrev.honorariosLaura),
          costosFijosTotales: parseSheetNumber(rawPrev.costosFijosBase) + parseSheetNumber(rawPrev.honorariosLaura),
          puntoEquilibrio: parseSheetNumber(rawPrev.puntoEquilibrio),
          margenSeguridad: normalizePercent(rawPrev.margenSeguridad),
          ratioMargenReferencia: normalizePercent(rawPrev.ratioMargenReferencia), // AB67 de mes anterior
        } : null,
        sheetName, prevSheetName, year, month,
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
