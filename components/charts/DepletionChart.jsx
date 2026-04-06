"use client";
import { formatCurrency } from "@/lib/formatters";

/**
 * DepletionChart — "Recorrido del Dinero"
 * Barras verticales que muestran cómo cada costo le resta a las ventas
 * hasta llegar a la utilidad. Primera barra = 100% ventas.
 * Cada siguiente barra = ancho proporcional al % que queda.
 */
export default function DepletionChart({ ventas, costosVariables, costosFijos, honorarios, utilidad }) {
  if (!ventas || ventas === 0) return null;

  const round = (n) => Math.max(n, 0);

  const steps = [
    {
      label: "Ventas",
      value: ventas,
      pct: 100,
      color: "#0077B6",
      accent: "#0096D6",
      emoji: "💰",
      isBase: true,
    },
    {
      label: "– Costos Var.",
      value: costosVariables,
      pct: round((costosVariables / ventas) * 100),
      color: "#E63946",
      accent: "#FF4D5A",
      emoji: "📦",
    },
    {
      label: "– Costos Fijos",
      value: costosFijos,
      pct: round((costosFijos / ventas) * 100),
      color: "#C9184A",
      accent: "#FF4D5A",
      emoji: "🏢",
    },
    {
      label: "– Honorarios",
      value: honorarios,
      pct: round((honorarios / ventas) * 100),
      color: "#FFB703",
      accent: "#FFCA3A",
      emoji: "👩‍⚕️",
    },
    {
      label: "= Utilidad",
      value: utilidad,
      pct: round((utilidad / ventas) * 100),
      color: utilidad >= 0 ? "#52B788" : "#E63946",
      accent: utilidad >= 0 ? "#6FCF97" : "#FF4D5A",
      emoji: utilidad >= 0 ? "✅" : "❌",
      isResult: true,
    },
  ];

  const maxBarHeight = 120; // px — altura de la barra de ventas (100%)

  return (
    <div>
      {/* Barras */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "6px",
        padding: "0 4px",
        marginBottom: "8px",
      }}>
        {steps.map((step, i) => {
          const barH = Math.max((step.pct / 100) * maxBarHeight, step.value !== 0 ? 4 : 0);
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Valor encima de la barra */}
              <div style={{
                fontSize: "0.58rem",
                fontWeight: 700,
                color: step.color,
                marginBottom: "3px",
                textAlign: "center",
                minHeight: "18px",
                display: "flex",
                alignItems: "flex-end",
              }}>
                {step.pct.toFixed(0)}%
              </div>

              {/* Barra */}
              <div style={{
                width: "100%",
                height: `${barH}px`,
                background: `linear-gradient(180deg, ${step.accent} 0%, ${step.color} 100%)`,
                borderRadius: "4px 4px 0 0",
                position: "relative",
                transition: "height 0.6s ease",
                boxShadow: step.isResult ? `0 0 10px ${step.color}44` : "none",
              }} />
            </div>
          );
        })}
      </div>

      {/* Etiquetas y montos debajo */}
      <div style={{
        display: "flex",
        gap: "6px",
        padding: "0 4px",
        borderTop: "1px solid var(--border)",
        paddingTop: "8px",
      }}>
        {steps.map((step, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "0.95rem", marginBottom: "2px" }}>{step.emoji}</div>
            <div style={{
              fontSize: "0.55rem",
              color: "var(--text-secondary)",
              marginBottom: "3px",
              lineHeight: 1.25,
            }}>
              {step.label}
            </div>
            <div style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              color: step.color,
            }}>
              {formatCurrency(Math.abs(step.value))}
            </div>
          </div>
        ))}
      </div>

      {/* Síntesis */}
      <div style={{
        marginTop: "12px",
        padding: "10px 14px",
        background: "var(--bg-hover)",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${steps[4].color}44`,
        fontSize: "0.78rem",
        color: "var(--text-secondary)",
        textAlign: "center",
        lineHeight: 1.5,
      }}>
        De cada <strong style={{ color: "var(--color-primary-light)" }}>$100</strong> de ventas,{" "}
        le quedan{" "}
        <strong style={{ color: steps[4].color, fontSize: "0.9rem" }}>
          ${steps[4].pct.toFixed(1)}
        </strong>{" "}
        de utilidad neta
      </div>
    </div>
  );
}
