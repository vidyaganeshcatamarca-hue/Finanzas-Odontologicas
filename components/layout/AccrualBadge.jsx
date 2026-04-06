"use client";
import { useApp } from "@/context/AppContext";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import APP_CONFIG from "@/config/app.config";

export default function AccrualBadge() {
  const {
    esMesActual, costoFijoDevengado, costoFijoReferencia,
    factorProrrateo, diaActual, loading
  } = useApp();

  // Solo mostrar en mes actual cuando hay datos
  if (!esMesActual || loading || !costoFijoReferencia) return null;

  const pct = Math.round(factorProrrateo * 100);
  const { texto: tooltipTexto } = APP_CONFIG.tooltips.costoFijoDevengado;

  return (
    <div className="accrual-badge" title={tooltipTexto}>
      <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
        Costos día {diaActual}:&nbsp;
        <strong style={{ color: "var(--color-primary-light)" }}>
          {formatCurrency(costoFijoDevengado)}
        </strong>
      </span>

      <div className="accrual-bar-track">
        <div className="accrual-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <span style={{ whiteSpace: "nowrap", flexShrink: 0, color: "var(--text-muted)" }}>
        {pct}% de {formatCurrency(costoFijoReferencia)}
      </span>
    </div>
  );
}
