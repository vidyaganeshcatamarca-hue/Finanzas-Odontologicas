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
  const year  = parseInt(searchParams.get("year")  ?? new Date().getFullYear());
  const month = parseInt(searchParams.get("month") ?? new Date().getMonth());

  console.log(`==> API V2.0.3 [${type}] Request`);

  try {
    if (type === "sheets") {
      const sheets = await getAvailableSheets();
      return NextResponse.json({ sheets, v: "2.0.3" });
    }

    const sheetName = getSheetName(year, month);

    if (type === "kpis") {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear  = month === 0 ? year - 1 : year;
      const prevSheetName = getSheetName(prevYear, prevMonth);
      
      const [raw, rawPrev] = await Promise.all([
        getCachedKPIs(year, month, () => getMonthlyKPIs(sheetName)),
        getCachedKPIs(prevYear, prevMonth, () => getMonthlyKPIs(prevSheetName)),
      ]);

      if (!raw) {
        return NextResponse.json({ error: `Hoja ${sheetName} no hallada`, v: "2.0.3" }, { status: 404 });
      }

      const kpis = {
        ventasTotales: parseSheetNumber(raw.ventasTotales),
        costosVariables: Math.max(parseSheetNumber(raw.costosTotales) - parseSheetNumber(raw.costosFijosBase), 0),
        costosFijos: parseSheetNumber(raw.costosFijosBase),
        honorariosLaura: parseSheetNumber(raw.honorariosLaura),
        costosFijosTotales: parseSheetNumber(raw.costosFijosBase) + parseSheetNumber(raw.honorariosLaura),
        costosTotales: parseSheetNumber(raw.costosTotales),
        utilidadOperativa: parseSheetNumber(raw.utilidadOperativa),
        ingresosReales: parseSheetNumber(raw.ingresosReales),
        egresosReales: parseSheetNumber(raw.egresosReales),
        flujoCajaNeto: parseSheetNumber(raw.flujoCajaNeto),
        puntoEquilibrio: parseSheetNumber(raw.puntoEquilibrio),
        margenRentabilidad: normalizePercent(raw.margenRentabilidad),
        margenSeguridad:    normalizePercent(raw.margenSeguridad),
        diaEquilibrio:      raw.diaEquilibrio,
        indiceCobrabilidad: parseSheetNumber(raw.indiceCobrabilidad),
        amortizaciones:     parseSheetNumber(raw.amortizaciones),
        ratioMargenReferencia: normalizePercent(raw.ratioMargenReferencia),
        prev: rawPrev ? {
          ventasTotales: parseSheetNumber(rawPrev.ventasTotales),
          costosFijosTotales: parseSheetNumber(rawPrev.costosFijosBase) + parseSheetNumber(rawPrev.honorariosLaura),
          puntoEquilibrio: parseSheetNumber(rawPrev.puntoEquilibrio),
          ratioMargenReferencia: normalizePercent(rawPrev.ratioMargenReferencia),
        } : null,
        sheetName, year, month,
        v: "2.0.3",
        fetchedAt: new Date().toISOString(),
      };
      return NextResponse.json(kpis);
    }

    if (type === "tratamientos") {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear  = month === 0 ? year - 1 : year;
      const prevSheetName = getSheetName(prevYear, prevMonth);
      const [t, tp] = await Promise.all([getTratamientos(sheetName), getTratamientos(prevSheetName)]);
      return NextResponse.json({ tratamientos: t, tratamientosPrev: tp, v: "2.0.3" });
    }

    if (type === "gastos") {
      const [gastos, rawKpis] = await Promise.all([
        getCachedGastos(year, month, () => getGastos(sheetName)),
        getCachedKPIs(year, month, () => getMonthlyKPIs(sheetName)),
      ]);
      return NextResponse.json({ gastos, ventasTotales: rawKpis ? parseSheetNumber(rawKpis.ventasTotales) : 0, v: "2.0.3" });
    }

    if (type === "heatmap") {
      const days = await getHeatmapDays(sheetName);
      return NextResponse.json({ days: days.map(d => ({ fecha: d.fecha.toISOString(), margen: d.margen })), v: "2.0.3" });
    }

    return NextResponse.json({ error: "Tipo inválido", v: "2.0.3" }, { status: 400 });

  } catch (err) {
    console.error("[API V2.0.3] Error:", err.message);
    return NextResponse.json({ error: "[V2.0.3] Error: " + err.message, v: "2.0.3" }, { status: 500 });
  }
}
