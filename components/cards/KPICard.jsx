"use client";
import { useState } from "react";
import TooltipModal from "@/components/ui/TooltipModal";
import { formatVariation } from "@/lib/formatters";

/**
 * KPICard — Card reutilizable con valor, variación PTD y tooltip educativo
 *
 * Props:
 *   label        - Título del KPI
 *   value        - Valor formateado a mostrar (string)
 *   valueColor   - "success" | "danger" | "warning" | null
 *   variation    - { value, label, direction } de formatVariation()
 *   tooltip      - { titulo, texto } del config
 *   accent       - "primary" | "success" | "warning" | "danger"
 *   children     - Contenido extra (gráficos, etc.)
 *   fullWidth    - Si ocupa ancho completo del grid
 */
export default function KPICard({
  label,
  value,
  valueColor,
  subtitle,
  variation,
  tooltip,
  accent = "primary",
  children,
  fullWidth = false,
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div
        className={`card card-accent-${accent} ${fullWidth ? "kpi-grid-full" : ""}`}
        style={{ minHeight: "90px" }}
      >
        {/* Botón info */}
        {tooltip && (
          <button className="info-btn" onClick={() => setShowModal(true)} title="Más información">
            i
          </button>
        )}

        <div className="card-label">{label}</div>

        {value !== undefined && (
          <div className={`card-value ${valueColor ?? ""}`}>{value}</div>
        )}

        {subtitle && (
          <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: "-4px", marginBottom: "4px", fontWeight: 500 }}>
            {subtitle}
          </div>
        )}

        {variation && variation.direction !== "neutral" && (
          <div className={`variation-badge variation-${variation.direction}`}>
            {variation.label}
            <span style={{ fontWeight: 400, marginLeft: "2px", fontSize: "0.65rem" }}>
              vs mes ant.
            </span>
          </div>
        )}

        {children}
      </div>

      {showModal && tooltip && (
        <TooltipModal
          titulo={tooltip.titulo}
          texto={tooltip.texto}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
