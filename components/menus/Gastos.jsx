"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import APP_CONFIG from "@/config/app.config";
import { formatCurrency } from "@/lib/formatters";
import { SkeletonTable, SkeletonChart } from "@/components/ui/SkeletonCard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { ChevronRight, ChevronsRight, ChevronsLeft } from "lucide-react";

const { meses, colors } = APP_CONFIG;

const PERIODOS_COMP = [
  { label: "Mes actual",  meses: 1 },
  { label: "2 meses",     meses: 2 },
  { label: "3 meses",     meses: 3 },
];

export default function Gastos() {
  const { selectedYear, selectedMonth } = useApp();

  const [gastos,      setGastos]      = useState([]);
  const [historico,   setHistorico]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [periodos,    setPeriodos]    = useState(1);
  const [totalVentas, setTotalVentas] = useState(0);

  const fetchGastos = useCallback(async (mesesCount) => {
    setLoading(true);
    
    // [COMPLETO: PARALLELIZAR FETCH DE MESES HISTÓRICOS]
    const requests = [];
    for (let i = 0; i < mesesCount; i++) {
      let m = selectedMonth - i;
      let y = selectedYear;
      if (m < 0) { m += 12; y -= 1; }
      requests.push({ year: y, month: m });
    }

    try {
      const results = await Promise.all(
        requests.map(async ({ year: y, month: m }) => {
          try {
            const res = await fetch(`/api/sheets?type=gastos&year=${y}&month=${m}`);
            const data = await res.json();
            if (res.ok) {
              return {
                label:  `${meses[m] ?? m} ${y}`,
                gastos: data.gastos ?? [],
                ventas: data.ventasTotales ?? 0,
                index: y * 12 + m // para orden correcto
              };
            }
          } catch (e) { return null; }
          return null;
        })
      );

      const validResults = results.filter(r => r !== null).sort((a, b) => a.index - b.index);
      setHistorico(validResults);
      if (validResults.length > 0) {
        const last = validResults[validResults.length - 1];
        setGastos(last.gastos);
        setTotalVentas(last.ventas);
      }
    } catch (err) {
      console.error("Error en fetchGastos paralelo:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => { fetchGastos(periodos); }, [periodos, fetchGastos]);

  if (loading) return <><SkeletonChart height={200} /><SkeletonTable rows={8} /></>;

  if (!gastos.length) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)", marginTop: "16px" }}>
        <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📋</div>
        <div>No hay datos de gastos para este período.</div>
      </div>
    );
  }

  // Top 15 ordenado por monto
  const top15 = [...gastos].sort((a, b) => b.total - a.total).slice(0, 15);
  const totalGastos = top15.reduce((s, g) => s + g.total, 0);

  // Colores por magnitud
  const getColor = (idx) => {
    if (idx < 3)  return "#E63946";
    if (idx < 7)  return "#FFB703";
    return "#0077B6";
  };

  const mesesAnteriores = historico.slice(0, historico.length - 1);

  return (
    <div style={{ marginTop: "16px" }}>
      {/* Resumen del mes */}
      <div className="card" style={{ marginBottom: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div>
          <div className="card-label">Total Gastos (Top 15)</div>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--color-danger)" }}>
            {formatCurrency(totalGastos)}
          </div>
        </div>
        <div>
          <div className="card-label">% s/Ventas</div>
          <div style={{
            fontWeight: 800, fontSize: "1.1rem",
            color: totalVentas > 0 && (totalGastos / totalVentas) > 0.7
              ? "var(--color-danger)" : "var(--color-warning)",
          }}>
            {totalVentas > 0 ? ((totalGastos / totalVentas) * 100).toFixed(1) + "%" : "—"}
          </div>
        </div>
      </div>

      {/* Gráfico de barras horizontales */}
      <div className="card" style={{ marginBottom: "8px", padding: "12px" }}>
        <ResponsiveContainer width="100%" height={Math.min(top15.length * 24 + 10, 360)}>
          <BarChart
            layout="vertical"
            data={top15}
            margin={{ left: 0, right: 60, top: 4, bottom: 4 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="nombre"
              width={100}
              tick={{ fontSize: 9, fill: "var(--text-secondary)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.length > 15 ? v.slice(0, 14) + "…" : v}
            />
            <Tooltip
              formatter={(v) => [formatCurrency(v), "Gasto"]}
              contentStyle={{ background: "var(--bg-alt)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.72rem" }}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]} label={{
              position: "right",
              formatter: (v) => formatCurrency(v),
              style: { fontSize: "0.6rem", fill: "var(--text-secondary)" },
            }}>
              {top15.map((_, i) => <Cell key={i} fill={getColor(i)} fillOpacity={0.8} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Selector movido aquí abajo */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px", paddingRight: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "4px 10px" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700 }}>VER COMPARATIVA:</span>
          <select
            value={periodos}
            onChange={(e) => setPeriodos(Number(e.target.value))}
            style={{
              background: "transparent", border: "none",
              color: "var(--text-primary)", fontSize: "0.72rem", cursor: "pointer",
              fontWeight: 800, outline: "none",
            }}
          >
            {PERIODOS_COMP.map((p) => (
              <option key={p.meses} value={p.meses}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla Detallada con Sticky Column */}
      <div className="card" style={{ marginBottom: "16px", padding: "12px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <div className="card-label" style={{ margin: 0 }}>Desarrollo por Cuenta</div>
          {mesesAnteriores.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--color-primary-light)", fontSize: "0.62rem", fontWeight: 700, animation: "pulseLeft 2s infinite" }}>
               <ChevronsLeft size={14} /> SCROLL
            </div>
          )}
        </div>

        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: `${Math.max(300, 160 + mesesAnteriores.length * 85)}px` }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, zIndex: 10, padding: "6px 8px", textAlign: "left", fontSize: "0.7rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}>Cuenta</th>
                <th style={{ padding: "6px 8px", textAlign: "right", fontSize: "0.7rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>Total</th>
                <th style={{ padding: "6px 8px", textAlign: "right", fontSize: "0.7rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>% Gasto</th>
                {mesesAnteriores.map((h, hi) => (
                  <th key={hi} style={{ padding: "6px 8px", textAlign: "right", fontSize: "0.65rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top15.map((g, i) => {
                const pctGasto = totalGastos > 0 ? (g.total / totalGastos) * 100 : 0;
                return (
                  <tr key={i}>
                    <td style={{ position: "sticky", left: 0, zIndex: 10, padding: "8px", fontSize: "0.72rem", borderBottom: "1px solid var(--border-light)", borderRight: "1px solid var(--border)", fontWeight: 500, lineHeight: 1.25, background: "var(--bg-card)", minWidth: "120px", maxWidth: "160px" }}>
                      {g.nombre}
                    </td>
                    <td style={{ padding: "8px", textAlign: "right", fontSize: "0.8rem", borderBottom: "1px solid var(--border-light)", fontWeight: 700 }}>
                      {formatCurrency(g.total)}
                    </td>
                    <td style={{ padding: "8px", textAlign: "right", fontSize: "0.75rem", borderBottom: "1px solid var(--border-light)" }}>
                      {pctGasto.toFixed(1)}%
                    </td>
                    {mesesAnteriores.map((h, hi) => {
                      const prev  = h.gastos?.find((pg) => pg.nombre === g.nombre);
                      const delta = prev?.total > 0 ? ((g.total - prev.total) / prev.total) * 100 : null;
                      return (
                        <td key={hi} style={{ padding: "8px", textAlign: "right", borderBottom: "1px solid var(--border-light)" }}>
                          {prev ? (
                            <div style={{ fontSize: "0.7rem" }}>
                              <div style={{ color: "var(--text-secondary)" }}>{formatCurrency(prev.total)}</div>
                              {delta !== null && (
                                <div style={{ fontSize: "0.6rem", fontWeight: 700, color: delta > 10 ? "var(--color-danger)" : delta < -10 ? "var(--color-success-light)" : "var(--text-muted)" }}>
                                  {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
                                </div>
                              )}
                            </div>
                          ) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulseLeft {
          0% { transform: translateX(0); opacity: 0.6; }
          50% { transform: translateX(-4px); opacity: 1; }
          100% { transform: translateX(0); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
