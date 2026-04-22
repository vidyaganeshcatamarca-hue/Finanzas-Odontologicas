"use client";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useApp } from "@/context/AppContext";
import APP_CONFIG from "@/config/app.config";
import {
  formatCurrency, formatPercent,
} from "@/lib/formatters";
import {
  calcProyeccionCierre, calcEstadoProyeccion,
  calcVariation, buildHeatmapData,
} from "@/lib/calculations";
import { SkeletonChart } from "@/components/ui/SkeletonCard";
import { useState, useEffect, useCallback } from "react";

const { insights, thresholds, colors } = APP_CONFIG;
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Acumulados diarios a ritmo lineal */
function buildChartData(actualValue, projectedTotal, diaActual, diasTotales, modo, historyData) {
  const ritmoProyectadoRestante = (diasTotales > diaActual && diaActual > 0)
    ? (projectedTotal - actualValue) / (diasTotales - diaActual)
    : 0;
    
  const data = [];
  let currentAccumulated = 0;

  for (let d = 1; d <= diasTotales; d++) {
    const entry = { dia: d };

    if (d <= diaActual) {
      // Valor Real: si hay historial diario, acumulamos. Si no, ritmo lineal.
      if (historyData && historyData[d] !== undefined) {
        currentAccumulated += historyData[d];
        entry.real = Math.round(currentAccumulated);
      } else {
        const ritmoActual = actualValue / diaActual;
        entry.real = Math.round(ritmoActual * d);
      }
      
      // La proyección en el día actual debe coincidir con el real
      if (d === diaActual) {
        entry.proyeccion = entry.real;
      }
    } 
    
    if (d > diaActual) {
      // Línea de proyección: inicia en el último valor real y suma el ritmo futuro
      const diasDesdeHoy = d - diaActual;
      entry.proyeccion = Math.round(actualValue + (ritmoProyectadoRestante * diasDesdeHoy));
    }

    data.push(entry);
  }
  return data;
}

export default function Estrategia() {
  const {
    kpis, loading, error,
    selectedYear, selectedMonth,
    diaActual, diasTotalesMes, esMesActual,
    utilidadAjustada, costoFijoReferencia,
    peDinamico, msCalculado,
  } = useApp();

  const [heatmapReal, setHeatmapReal] = useState(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const modo = "ventas"; // Forzado a ventas solamente

  const fetchHeatmap = useCallback(async () => {
    setLoadingHeatmap(true);
    try {
      const res  = await fetch(`/api/sheets?type=heatmap&year=${selectedYear}&month=${selectedMonth}`);
      const data = await res.json();
      if (res.ok && data.days?.length > 0) {
        const map = {};
        data.days.forEach(({ fecha, margen }) => {
          const d = new Date(fecha).getDate();
          map[d] = (map[d] ?? 0) + margen;
        });
        setHeatmapReal(map);
      } else {
        setHeatmapReal({});
      }
    } catch {
      setHeatmapReal({});
    } finally {
      setLoadingHeatmap(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => { fetchHeatmap(); }, [fetchHeatmap]);

  if (loading) return <SkeletonChart height={240} />;
  if (error)   return <ErrorState message={error} />;
  if (!kpis)   return null;

  const ventasPTD      = kpis.ventasTotales ?? 0;
  const puntoEquilibrio = kpis.puntoEquilibrio ?? 0;
  const margenHist     = kpis.margenRentabilidad ?? 0;
  const prev           = kpis.prev;

  const tasaCrecimiento = prev?.ventasTotales
    ? calcVariation(ventasPTD, prev.ventasTotales * (diaActual / diasTotalesMes))
    : null;

  const ventasProyectadas = calcProyeccionCierre(ventasPTD, diaActual, diasTotalesMes, tasaCrecimiento);
  const currentPE = peDinamico;
  const estadoProyeccion  = calcEstadoProyeccion(ventasProyectadas, currentPE);

  const semaforo = {
    en_camino:     { color: colors.success, emoji: "🟢", label: "EN CAMINO",      desc: "Proyección Excelente: El mes cerrará con un margen de seguridad sólido." },
    zona_riesgo:   { color: colors.warning, emoji: "🟡", label: "ZONA DE RIESGO", desc: "Cierre Ajustado: Alcanzaremos el equilibrio, pero la utilidad será mínima." },
    alerta_perdida:{ color: colors.danger,  emoji: "🔴", label: "ALERTA DE PÉRDIDA", desc: "Pronóstico Crítico: Al ritmo actual, el mes cerrará por debajo de los costos." },
  }[estadoProyeccion];

  const refLineValue = currentPE;
  const refLineLabel = "P.E.";

  const chartData = buildChartData(
    ventasPTD,
    ventasProyectadas,
    diaActual, 
    diasTotalesMes,
    modo,
    null // Ventas no necesita el historial detallado de márgenes por ahora
  );

  const grossMargins = (() => {
    if (heatmapReal && Object.keys(heatmapReal).length > 0) return heatmapReal;
    const map = {};
    if (diaActual > 0) {
      const ritmoProduction = (ventasPTD * (margenHist || 0.2)) / diaActual;
      for (let d = 1; d <= (esMesActual ? diaActual : diasTotalesMes); d++) {
        map[d] = ritmoProduction;
      }
    }
    return map;
  })();

  const heatmapData = buildHeatmapData(selectedYear, selectedMonth, grossMargins); // Heatmap usa bruto (Actividad)
  
  const activeDailyMargins = Object.values(grossMargins).filter(v => v > 0);
  const maxMargin = activeDailyMargins.length > 0 ? Math.max(...activeDailyMargins) : 0;
  const minMargin = activeDailyMargins.length > 0 ? Math.min(...activeDailyMargins) : 1;

  const diaEqProyectado = ventasPTD > 0
    ? Math.ceil(currentPE / (ventasPTD / diaActual))
    : null;
  const diasRentabilidad = diaEqProyectado
    ? Math.max(diasTotalesMes - diaEqProyectado, 0)
    : 0;


  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "var(--bg-alt)", border: "1px solid var(--border)",
        borderRadius: "8px", padding: "8px 12px", fontSize: "0.78rem",
      }}>
        <div style={{ fontWeight: 700, marginBottom: "4px" }}>Día {label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </div>
        ))}
      </div>
    );
  };

  if (!esMesActual) {
    const ventasReales = ventasPTD;
    const deltaVentas = prev?.ventasTotales
      ? ((ventasPTD - prev.ventasTotales) / prev.ventasTotales * 100).toFixed(1)
      : null;

    return (
      <div>
        <div style={{
          marginBottom: "12px", padding: "10px 14px",
          background: "rgba(255,183,3,0.08)", border: "1px solid rgba(255,183,3,0.25)",
          borderRadius: "var(--radius-sm)", fontSize: "0.78rem",
          color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px",
        }}>
          📅 <span>Mes cerrado — análisis de ritmo y distribución de ingresos</span>
        </div>

        {deltaVentas !== null && (
          <div className="card" style={{ marginBottom: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div>
              <div className="card-label">Ventas vs mes anterior</div>
              <div style={{
                fontSize: "1.1rem", fontWeight: 800,
                color: Number(deltaVentas) >= 0 ? colors.success : colors.danger,
              }}>
                {Number(deltaVentas) > 0 ? "+" : ""}{deltaVentas}%
              </div>
            </div>
            <div>
              <div className="card-label">Días rentables</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: diasRentabilidad > 7 ? colors.success : colors.warning }}>
                {diasRentabilidad} días
              </div>
            </div>
          </div>
        )}

        <div className="section-title">Mapa de Calor del Mes</div>
        <HeatmapGrid 
          heatmapData={heatmapData} 
          esMesActual={false} 
          diaActual={0} 
          formatCurrency={formatCurrency} 
          min={minMargin} 
          max={maxMargin} 
        />
      </div>
    );
  }

  return (
    <div>

      <div className="section-title">Tendencia y Pronóstico de Ventas</div>
      <div className="card" style={{ marginBottom: "16px", padding: "12px" }}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={colors.primary} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gradProy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={semaforo.color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={semaforo.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={refLineValue}
              stroke={modo === "ventas" ? colors.danger : colors.warning}
              strokeDasharray="6 3"
              label={{ value: refLineLabel, fill: modo === "ventas" ? colors.danger : colors.warning, fontSize: 10, position: "right" }}
            />
            <Area type="monotone" dataKey="real" stroke={colors.primary} strokeWidth={2} fill="url(#gradReal)" connectNulls={false} dot={false} />
            <Area type="monotone" dataKey="proyeccion" stroke={semaforo.color} strokeWidth={2} strokeDasharray="6 3" fill="url(#gradProy)" connectNulls={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="section-title">Mapa de Calor del Mes</div>
      <HeatmapGrid 
        heatmapData={heatmapData} 
        esMesActual={esMesActual} 
        diaActual={diaActual} 
        formatCurrency={formatCurrency} 
        min={minMargin} 
        max={maxMargin} 
      />

      {diaEqProyectado && (
        <div className="card" style={{ marginBottom: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <div className="card-label">Día Equilibrio Proy.</div>
            <div className="card-value-sm">{diaEqProyectado > diasTotalesMes ? "Fuera" : `Día ${diaEqProyectado}`}</div>
          </div>
          <div>
            <div className="card-label">Días de Ganancia</div>
            <div className="card-value-sm" style={{ color: diasRentabilidad > 7 ? colors.success : colors.warning }}>
              {diasRentabilidad} días
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function HeatmapGrid({ heatmapData, esMesActual, diaActual, formatCurrency, min, max }) {
  const step = max / 4;
  const L1 = step;
  const L2 = 2 * step;
  const L3 = 3 * step;

  const heatColor = (m) => {
    if (!m || m <= 0) return "var(--bg-hover)";
    if (m < L1) return "#FFF59D";  // Amarillo (< 1/4 max)
    if (m < L2) return "#FFB703";  // Naranja (< 2/4 max)
    if (m < L3) return "#E63946";  // Rojo (< 3/4 max)
    return "#800F2F";              // Rojo Oscuro (>= 3/4 max)
  };

  const textColor = (m) => (m && m >= L2) ? "white" : "var(--text-muted)";

  return (
    <div className="card" style={{ marginBottom: "16px", padding: "12px" }}>
      <div style={{ marginBottom: "10px", padding: "8px 10px", background: "var(--bg-hover)", borderRadius: "var(--radius-sm)", fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
        🔥 <strong>Intensidad de Ingresos Diarios:</strong><br/>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
          <span><span style={{ color: "#FFF59D", paddingRight: "4px" }}>■</span> - de {formatCurrency(L1)}</span>
          <span><span style={{ color: "#FFB703", paddingRight: "4px" }}>■</span> - de {formatCurrency(L2)}</span>
          <span><span style={{ color: "#E63946", paddingRight: "4px" }}>■</span> - de {formatCurrency(L3)}</span>
          <span><span style={{ color: "#800F2F", paddingRight: "4px" }}>■</span> + de {formatCurrency(L3)}</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "3px", marginBottom: "4px" }}>
        {["D","L","M","M","J","V","S"].map((d, i) => ( <div key={i} style={{ fontSize: "0.58rem", color: "var(--text-muted)", textAlign: "center", fontWeight: 600 }}>{d}</div> ))}
      </div>
      {heatmapData.map((week, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "3px", marginBottom: "3px" }}>
          {week.map((cell, di) => {
            const m = cell.margin;
            const bg = cell.day === null ? "transparent" : m === null ? "var(--bg-hover)" : heatColor(m);
            const isToday = esMesActual && cell.day === diaActual;
            return (
              <div key={di} title={cell.day ? `Día ${cell.day}: ${m ? formatCurrency(m) : "—"}` : ""} style={{ height: "30px", borderRadius: "4px", background: bg, border: isToday ? "2px solid var(--color-primary)" : "1px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", color: m ? textColor(m) : "var(--text-muted)", fontWeight: isToday ? 800 : 500 }}>
                {cell.day ?? ""}
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: "2px", marginTop: "10px", opacity: 0.8 }}>
        {[min, L1, L2, L3].map((v, i) => ( <div key={i} style={{ flex: 1, height: "6px", borderRadius: "1px", background: heatColor(v) }} /> ))}
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "32px 16px" }}>
      <div style={{ fontSize: "2rem" }}>🔌</div>
      <div style={{ fontWeight: 700 }}>Error al cargar datos</div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{message}</div>
    </div>
  );
}
