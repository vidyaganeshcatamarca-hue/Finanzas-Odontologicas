/**
 * lib/agente.js — Constructor del Payload para el Agente IA Financiero
 *
 * Función pura que transforma los datos del AppContext en el JSON estructurado
 * que espera el webhook de n8n.
 */

import { getDaysInMonth } from "@/lib/calculations";

// ── Helpers matemáticos ─────────────────────────────────────────────────────
const avg = (arr) => {
  const valid = arr.filter((v) => v != null && !isNaN(v) && v !== 0);
  if (valid.length === 0) return 0;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
};

const calcMedian = (arr) => {
  const sorted = [...arr].filter((v) => v != null && !isNaN(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const round4  = (n) => parseFloat(Number(n ?? 0).toFixed(4));
const roundInt = (n) => Math.round(Number(n ?? 0));

const DOW_NAMES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

// ── Clasificación BCG ───────────────────────────────────────────────────────
const getQuadrant = (vol, mrg, medVol, medMrg) => {
  const altaVol = vol >= medVol;
  const altoMrg = mrg >= medMrg;
  if (altaVol && altoMrg) return "estrella";
  if (altaVol && !altoMrg) return "vaca";
  if (!altaVol && altoMrg) return "dilema";
  return "perro";
};

// ── Builder: Gastos Top 5 con comparación histórica ────────────────────────
function buildGastosDesglose(gastos = [], prevGastos = []) {
  if (!gastos.length) return null;

  const sorted = [...gastos].sort((a, b) => b.total - a.total);
  const top5 = sorted.slice(0, 5).map((g, i) => {
    const prevTotals = prevGastos
      .map((prevList) => prevList?.find((p) => p.nombre === g.nombre)?.total ?? null)
      .filter((v) => v != null && v > 0);

    const prom3m    = prevTotals.length > 0 ? roundInt(avg(prevTotals)) : null;
    const variacion = prom3m && prom3m > 0 ? round4((g.total - prom3m) / prom3m) : null;

    return {
      ranking:      i + 1,
      nombre:       g.nombre,
      total:        roundInt(g.total),
      promedio_3m:  prom3m,
      variacion_pct: variacion,
    };
  });

  return { top_5: top5 };
}

// ── Builder: Matriz BCG (top 20 tratamientos) ───────────────────────────────
function buildMatrizBCG(tratamientos = []) {
  const activos = tratamientos.filter((t) => t.cantidad > 0);
  if (!activos.length) return null;

  const medVol = calcMedian(activos.map((t) => t.cantidad));
  const medMrg = calcMedian(activos.map((t) => t.margenUnitario));

  const sorted = [...activos].sort((a, b) => b.margenTotal - a.margenTotal);

  const top20 = sorted.slice(0, 20).map((t) => ({
    nombre:          t.nombre,
    cantidad:        t.cantidad,
    monto_vendido:   roundInt(t.montoVendido ?? 0),
    margen_unitario: roundInt(t.margenUnitario),
    margen_total:    roundInt(t.margenTotal),
    participacion_pct: round4(t.participacion ?? 0),
    cuadrante:       getQuadrant(t.cantidad, t.margenUnitario, medVol, medMrg),
  }));

  // Concentración: cuántos tratamientos cubren el 80% del margen
  const totalMrg = activos.reduce((s, t) => s + Math.max(0, t.margenTotal), 0);
  let acum = 0; let countAcum = 0;
  for (const t of sorted) {
    acum += Math.max(0, t.margenTotal);
    countAcum++;
    if (acum / (totalMrg || 1) >= 0.8) break;
  }
  const concentracion = countAcum > 5 ? "optimo" : countAcum >= 3 ? "alerta" : "riesgo";

  return {
    total_tratamientos_activos: activos.length,
    mediana_volumen:            roundInt(medVol),
    mediana_margen_unitario:    roundInt(medMrg),
    concentracion_80pct:        concentracion,
    tratamientos:               top20,
  };
}

// ── Builder: Mapa de Calor con patrones ────────────────────────────────────
function buildMapaCalor(heatmapDays = []) {
  if (!heatmapDays.length) return null;

  const days = heatmapDays.map((d) => {
    const date   = new Date(d.fecha);
    const dayNum = date.getUTCDate();
    const dow    = date.getUTCDay();
    const week   = Math.ceil(dayNum / 7);
    return { date, dayNum, dow, week, margen: Number(d.margen) || 0 };
  });

  // Distribución semanal
  const weekMap = {};
  for (const d of days) {
    if (!weekMap[d.week]) weekMap[d.week] = [];
    weekMap[d.week].push(d);
  }
  const distribucion_semanal = Object.entries(weekMap).map(([w, items]) => {
    const margenTotal  = roundInt(items.reduce((s, i) => s + i.margen, 0));
    const diasActivos  = items.filter((i) => i.margen > 0).length;
    return {
      semana:          parseInt(w),
      margen_total:    margenTotal,
      dias_activos:    diasActivos,
      promedio_diario: diasActivos > 0 ? roundInt(margenTotal / diasActivos) : 0,
    };
  });

  const bestWeek  = distribucion_semanal.reduce((b, w) => w.margen_total > (b?.margen_total ?? -Infinity) ? w : b, null)?.semana ?? null;
  const worstWeek = distribucion_semanal.reduce((w, x) => x.margen_total < (w?.margen_total ?? Infinity) ? x : w, null)?.semana ?? null;

  // Patrón por día de semana
  const dowMap = {};
  for (const d of days) {
    if (!dowMap[d.dow]) dowMap[d.dow] = [];
    if (d.margen > 0) dowMap[d.dow].push(d.margen);
  }
  const patron_dia_semana = DOW_NAMES
    .map((nombre, i) => ({
      dia:        nombre,
      promedio:   roundInt(avg(dowMap[i] ?? [])),
      apariciones: (dowMap[i] ?? []).length,
    }))
    .filter((p) => p.apariciones > 0);

  const totalMargen = roundInt(days.reduce((s, d) => s + d.margen, 0));
  const diasConDatos = days.filter((d) => d.margen > 0).length;

  // Lista de días individuales
  const diasDetalle = [...days]
    .sort((a, b) => a.dayNum - b.dayNum)
    .map((d) => ({
      fecha:         d.date.toISOString().split("T")[0],
      dia_semana:    DOW_NAMES[d.dow],
      numero_dia:    d.dayNum,
      semana_del_mes: d.week,
      margen:        roundInt(d.margen),
    }));

  return {
    dias_con_datos:         diasConDatos,
    margen_total_registrado: totalMargen,
    margen_diario_promedio:  diasConDatos > 0 ? roundInt(totalMargen / diasConDatos) : 0,
    mejor_semana:           bestWeek,
    peor_semana:            worstWeek,
    distribucion_semanal,
    patron_dia_semana,
    dias: diasDetalle,
  };
}

// ── Builder principal ───────────────────────────────────────────────────────
export function buildAgentePayload(ctx) {
  const {
    kpis,
    esMesActual,
    selectedYear,
    selectedMonth,
    diaActual,
    diasTotalesMes,
    factorProrrateo,
    costoFijoDevengado,
    costoFijoReferencia,
    utilidadAjustada,
    msCalculado,
    peDinamico,
    currentDiaEq,
    // Datos suplementarios (fetched en AgenteButton antes de llamar aquí)
    tratamientos  = [],
    gastos        = [],
    prevGastos    = [],  // [prev1Gastos, prev2Gastos, prev3Gastos]
    heatmapDays   = [],  // [{ fecha: ISOstring, margen: number }]
  } = ctx;

  const mesLabel = esMesActual
    ? "actual"
    : `${MESES[selectedMonth]} ${selectedYear}`;

  const diaEfectivo = esMesActual ? diaActual : diasTotalesMes;
  const factorEfect = esMesActual ? factorProrrateo : 1.0;

  const ventasTotales = kpis?.ventasTotales ?? 0;
  const margenRentabilidad =
    esMesActual && ventasTotales > 0
      ? utilidadAjustada / ventasTotales
      : (kpis?.margenRentabilidad ?? 0);

  const prev1 = kpis?.prev  ?? null;
  const prev2 = kpis?.prev2 ?? null;
  const prev3 = kpis?.prev3 ?? null;

  // Utilidad diaria promedio del mes anterior
  let utilidadDiariaPromedio = null;
  if (prev1?.utilidadOperativa != null && prev1?.year != null && prev1?.month != null) {
    const diasPrev = getDaysInMonth(prev1.year, prev1.month);
    utilidadDiariaPromedio = roundInt(prev1.utilidadOperativa / (diasPrev || 30));
  }

  const trimMeses    = [prev1, prev2, prev3].filter(Boolean);
  const mesesNombres = [kpis?.prevSheetName, prev2?.nombre, prev3?.nombre].filter(Boolean);

  const utilidadPromedio = roundInt(avg(trimMeses.map((p) => p.utilidadOperativa)));
  const rentabilidadProm = round4(avg(trimMeses.map((p) => p.margenRentabilidad)));
  const msPromedio       = round4(avg(trimMeses.map((p) => p.margenSeguridad)));
  const mrNuevo          = prev1?.margenRentabilidad ?? 0;
  const mrAntiguo        = (prev3 ?? prev2 ?? prev1)?.margenRentabilidad ?? 0;
  const tendencia        = round4(mrNuevo - mrAntiguo);

  return {
    config_agente: {
      menu:      "signos_vitales",
      intencion: "analisis",
      pregunta:  null,
      mes:       mesLabel,
    },

    contexto_temporal: {
      fecha_consulta:              new Date().toISOString(),
      dia_actual:                  diaEfectivo,
      dias_totales_mes:            diasTotalesMes,
      porcentaje_mes_transcurrido: round4(factorEfect),
    },

    metricas_actuales: {
      ventas_totales:                    roundInt(ventasTotales),
      costos_fijos:                      roundInt(kpis?.costosFijos ?? 0),
      costos_fijos_promedio_3m:          roundInt(costoFijoReferencia ?? 0),
      costos_fijos_prorrateados_a_hoy:   roundInt(costoFijoDevengado ?? 0),
      costos_variables:                  roundInt(kpis?.costosVariables ?? 0),
      honorarios_maria_laura:            roundInt(kpis?.honorariosLaura ?? 0),
      utilidad_real_caja:                roundInt(kpis?.flujoCajaNeto ?? 0),
      utilidad_progresiva_teorica:       roundInt(utilidadAjustada ?? 0),
      margen_rentabilidad:               round4(margenRentabilidad),
      margen_seguridad:                  round4(msCalculado ?? 0),
      indice_cobrabilidad:               round4(kpis?.indiceCobrabilidad ?? 0),
      punto_equilibrio:                  roundInt(peDinamico ?? 0),
      dia_pe_proyectado_real:            currentDiaEq ?? null,
    },

    historico_referencia: {
      mes_anterior_cerrado: prev1 ? {
        nombre:                    kpis?.prevSheetName ?? null,
        utilidad_diaria_promedio:  utilidadDiariaPromedio,
        margen_seguridad_final:    round4(prev1.margenSeguridad ?? 0),
        indice_cobrabilidad_final: round4(prev1.indiceCobrabilidad ?? 0),
        margen_rentabilidad_final: round4(prev1.margenRentabilidad ?? 0),
      } : null,

      trimestre_previo: trimMeses.length > 0 ? {
        meses: mesesNombres,
        utilidad_promedio_mensual: utilidadPromedio,
        tendencia_rentabilidad: {
          rentabilidad_promedio: rentabilidadProm,
          tendencia:             tendencia,
        },
        ms_promedio: msPromedio,
      } : null,
    },

    gastos_desglose: buildGastosDesglose(gastos, prevGastos),

    matriz_bcg: buildMatrizBCG(tratamientos),

    mapa_calor: buildMapaCalor(heatmapDays),
  };
}
