/**
 * lib/agente.js — Constructor del Payload para el Agente IA Financiero
 *
 * Función pura que transforma los datos del AppContext en el JSON estructurado
 * que espera el webhook de n8n. Sin side-effects, sin fetch.
 */

import { getDaysInMonth } from "@/lib/calculations";

// ── Helper: promedio seguro de un array de números ─────────────────────────
const avg = (arr) => {
  const valid = arr.filter((v) => v != null && !isNaN(v) && v !== 0);
  if (valid.length === 0) return 0;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
};

const round4 = (n) => parseFloat(Number(n ?? 0).toFixed(4));
const roundInt = (n) => Math.round(Number(n ?? 0));

/**
 * Construye el payload completo para el Agente IA Financiero (Signos Vitales).
 *
 * @param {Object} ctx - Datos del AppContext + valor calculado de margenRentabilidad
 * @returns {Object} Payload JSON listo para enviarse al webhook de n8n
 */
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
  } = ctx;

  // ── Labels de mes ───────────────────────────────────────────────────────
  const MESES = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
  ];
  const mesLabel = esMesActual
    ? "actual"
    : `${MESES[selectedMonth]} ${selectedYear}`;

  // ── Para mes histórico, se considera mes completo ──────────────────────
  const diaEfectivo  = esMesActual ? diaActual : diasTotalesMes;
  const factorEfect  = esMesActual ? factorProrrateo : 1.0;

  // ── Margen rentabilidad dinámico ───────────────────────────────────────
  const ventasTotales = kpis?.ventasTotales ?? 0;
  const margenRentabilidad =
    esMesActual && ventasTotales > 0
      ? utilidadAjustada / ventasTotales
      : (kpis?.margenRentabilidad ?? 0);

  // ── Refs al histórico ──────────────────────────────────────────────────
  const prev1 = kpis?.prev  ?? null;  // mes anterior
  const prev2 = kpis?.prev2 ?? null;  // hace 2 meses
  const prev3 = kpis?.prev3 ?? null;  // hace 3 meses

  // ── Utilidad diaria promedio del mes anterior ──────────────────────────
  let utilidadDiariaPromedio = null;
  if (prev1?.utilidadOperativa != null && prev1?.year != null && prev1?.month != null) {
    const diasPrev = getDaysInMonth(prev1.year, prev1.month);
    utilidadDiariaPromedio = roundInt(prev1.utilidadOperativa / (diasPrev || 30));
  }

  // ── Datos del trimestre ────────────────────────────────────────────────
  const trimMeses  = [prev1, prev2, prev3].filter(Boolean);
  const mesesNombres = [
    kpis?.prevSheetName ?? null,
    prev2?.nombre ?? null,
    prev3?.nombre ?? null,
  ].filter(Boolean);

  const utilidadPromedio  = roundInt(avg(trimMeses.map((p) => p.utilidadOperativa)));
  const rentabilidadProm  = round4(avg(trimMeses.map((p) => p.margenRentabilidad)));
  const msPromedio        = round4(avg(trimMeses.map((p) => p.margenSeguridad)));

  // tendencia: más reciente (prev1) - más antiguo del trimestre disponible
  const mrNuevo   = prev1?.margenRentabilidad ?? 0;
  const mrAntiguo = (prev3 ?? prev2 ?? prev1)?.margenRentabilidad ?? 0;
  const tendencia = round4(mrNuevo - mrAntiguo);

  // ── Payload final ──────────────────────────────────────────────────────
  return {
    config_agente: {
      menu:      "signos_vitales",
      intencion: "analisis",
      pregunta:  null, // [FUTURE] campo de pregunta libre
      mes:       mesLabel,
    },

    contexto_temporal: {
      fecha_consulta:              new Date().toISOString(),
      dia_actual:                  diaEfectivo,
      dias_totales_mes:            diasTotalesMes,
      porcentaje_mes_transcurrido: round4(factorEfect),
    },

    metricas_actuales: {
      ventas_totales:                   roundInt(ventasTotales),
      costos_fijos_mensuales_promedio_3m: roundInt(costoFijoReferencia ?? 0),
      costos_fijos_reales:              roundInt(kpis?.costosFijos ?? 0),
      costos_prorrateados_a_la_fecha:   roundInt(costoFijoDevengado ?? 0),
      utilidad_real_caja:              roundInt(kpis?.flujoCajaNeto ?? 0),
      utilidad_progresiva_teorica:      roundInt(utilidadAjustada ?? 0),
      margen_rentabilidad:              round4(margenRentabilidad),
      margen_seguridad:                 round4(msCalculado ?? 0),
      indice_cobrabilidad:              round4(kpis?.indiceCobrabilidad ?? 0),
      punto_equilibrio:                 roundInt(peDinamico ?? 0),
      dia_pe_proyectado_real:           currentDiaEq ?? null,
    },

    historico_referencia: {
      mes_anterior_cerrado: prev1 ? {
        nombre:                   kpis?.prevSheetName ?? null,
        utilidad_diaria_promedio: utilidadDiariaPromedio,
        margen_seguridad_final:   round4(prev1.margenSeguridad ?? 0),
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
  };
}
