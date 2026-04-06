"use client";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

/** Velocímetro (Gauge) — semicírculo para Margen de Seguridad.
 *  Valor mostrado DEBAJO del arco, fuera del gráfico. */
export default function GaugeChart({ value, min = 0, max = 50 }) {
  const pct = typeof value === "number" ? Math.min(Math.max(value * 100, min), max) : 0;

  const color =
    pct < 10 ? "#E63946" :
    pct < 20 ? "#FFB703" :
               "#52B788";

  const filled = pct / max;
  const data = [
    { value: filled },
    { value: 1 - filled },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      {/* Arco semicircular */}
      <div style={{ width: "100%", height: 90, position: "relative" }}>
        <ResponsiveContainer width="100%" height={90}>
          <PieChart>
            {/* Track de fondo */}
            <Pie
              data={[{ value: 1 }]}
              cx="50%" cy="95%"
              startAngle={180} endAngle={0}
              innerRadius="65%" outerRadius="90%"
              fill="var(--bg-hover)"
              stroke="none"
              dataKey="value"
              isAnimationActive={false}
            />
            {/* Arco lleno */}
            <Pie
              data={data}
              cx="50%" cy="95%"
              startAngle={180} endAngle={0}
              innerRadius="65%" outerRadius="90%"
              stroke="none"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              <Cell fill={color} />
              <Cell fill="transparent" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Ticks: 0% izq, 25% centro, 50% der */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          display: "flex", justifyContent: "space-between",
          padding: "0 6px", fontSize: "0.55rem", color: "var(--text-muted)",
        }}>
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
        </div>
      </div>

      {/* Valor debajo del arco */}
      <div style={{ textAlign: "center", marginTop: "4px" }}>
        <div style={{ fontSize: "1.4rem", fontWeight: 800, color, lineHeight: 1 }}>
          {pct.toLocaleString("es-PY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
        </div>
        <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "3px" }}>
          META: &gt;20%
        </div>
      </div>
    </div>
  );
}
