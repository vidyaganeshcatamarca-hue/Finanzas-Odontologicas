"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

/** Donut — Índice de Cobrabilidad. Valor FUERA del anillo (debajo). */
export default function DonutChart({ value }) {
  const pct = typeof value === "number" ? Math.min(Math.max(value, 0), 1) : 0;

  const color =
    pct < 0.50 ? "#E63946" :
    pct < 0.75 ? "#FFB703" :
                 "#52B788";

  const data = [
    { name: "Cobrado",   value: pct },
    { name: "Pendiente", value: 1 - pct },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "var(--bg-alt)", border: "1px solid var(--border)",
        borderRadius: "8px", padding: "8px 12px", fontSize: "0.78rem",
      }}>
        <strong>{payload[0].name}</strong><br />
        {(payload[0].value * 100).toFixed(1)}%
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      {/* Anillo sin texto interno */}
      <ResponsiveContainer width="100%" height={90}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius="55%" outerRadius="80%"
            startAngle={90} endAngle={-270}
            stroke="none"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            <Cell fill={color} />
            <Cell fill="var(--bg-hover)" />
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Valor FUERA del anillo */}
      <div style={{ textAlign: "center", marginTop: "4px" }}>
        <div style={{ fontSize: "1.4rem", fontWeight: 800, color, lineHeight: 1 }}>
          {(pct * 100).toLocaleString("es-PY", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
        </div>
        <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "3px" }}>
          COBRADO
        </div>
      </div>
    </div>
  );
}
