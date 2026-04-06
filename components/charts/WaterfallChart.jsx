"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

/**
 * WaterfallChart — Cascada de dinero
 * Ventas → - Costos Variables → - Costos Fijos → - Honorarios → Utilidad
 */
export default function WaterfallChart({ ventas, costosVariables, costosFijos, honorarios, utilidad }) {
  const items = [
    { name: "Ventas",         value: ventas,          color: "#0077B6", isStart: true },
    { name: "Costos Var.",    value: -costosVariables, color: "#E63946" },
    { name: "Costos Fijos",   value: -costosFijos,    color: "#E63946" },
    { name: "Honorarios",     value: -honorarios,     color: "#FFB703" },
    { name: "Utilidad",       value: utilidad,        color: utilidad >= 0 ? "#52B788" : "#E63946", isResult: true },
  ];

  // Calcular bases acumuladas para el efecto cascada
  let running = 0;
  const data = items.map((item) => {
    if (item.isStart || item.isResult) {
      const d = { ...item, base: 0, displayValue: Math.abs(item.value) };
      running = item.isStart ? item.value : 0;
      return d;
    }
    const base = running + Math.min(item.value, 0);
    const d = { ...item, base, displayValue: Math.abs(item.value) };
    running += item.value;
    return d;
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const item = items.find((i) => i.name === label);
    const pct = ventas > 0 ? ((Math.abs(item?.value ?? 0) / ventas) * 100).toFixed(1) : 0;
    return (
      <div style={{
        background: "var(--bg-alt)", border: "1px solid var(--border)",
        borderRadius: "8px", padding: "10px 14px", fontSize: "0.8rem",
      }}>
        <div style={{ fontWeight: 700, marginBottom: "4px" }}>{label}</div>
        <div>{formatCurrency(Math.abs(item?.value ?? 0))}</div>
        <div style={{ color: "var(--text-secondary)", marginTop: "2px" }}>
          {pct}% de ventas
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
            axisLine={false} tickLine={false}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <ReferenceLine y={0} stroke="var(--border)" />

          {/* Barra invisible de base para el offset */}
          <Bar dataKey="base" stackId="a" fill="transparent" />

          {/* Barra visible */}
          <Bar dataKey="displayValue" stackId="a" radius={[4, 4, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
