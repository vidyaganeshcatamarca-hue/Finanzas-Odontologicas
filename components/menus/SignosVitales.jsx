"use client";
import { useApp } from "@/context/AppContext";
import APP_CONFIG from "@/config/app.config";
import {
  formatCurrency, formatPercent, formatPercentSmart, formatVariation,
} from "@/lib/formatters";
import { calcVariation, parseDiaEquilibrio } from "@/lib/calculations";
import KPICard from "@/components/cards/KPICard";
import InsightCard from "@/components/cards/InsightCard";
import GaugeChart from "@/components/charts/GaugeChart";
import DonutChart from "@/components/charts/DonutChart";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import TooltipModal from "@/components/ui/TooltipModal";
import { Trophy, Calendar } from "lucide-react";
import { useState } from "react";

const { tooltips, insights, thresholds } = APP_CONFIG;

export default function SignosVitales() {
  const {
    kpis, loading, error,
    utilidadAjustada, esMesActual,
    diaActual, diaEquilibrioNum, 
    metaAlcanzada: currentMetaAlcanzada,
    estadoGlobal,
    costoFijoReferencia, diasTotalesMes,
    peDinamico, msCalculado, currentDiaEq,
    projectedVelocity,
  } = useApp();

  const [modalKey, setModalKey] = useState(null);
  const openModal = (key) => setModalKey(key);
  const closeModal = () => setModalKey(null);
  const modal = (key) => modalKey === key;

  if (loading) return <SkeletonGrid />;
  if (error) return <ErrorState message={error} />;
  if (!kpis) return null;

  // Usamos los valores calculados centralmente en AppContext
  const currentPE = peDinamico;
  const currentMS = msCalculado;

  // 1. Margen de Rentabilidad Dinámico
  const currentMR = esMesActual 
    ? (kpis.ventasTotales > 0 ? utilidadAjustada / kpis.ventasTotales : 0)
    : kpis.margenRentabilidad;

  // ── Variaciones PTD ─────────────────────────────────────────
  const prev = kpis.prev ?? {};
  const varVentas = prev.ventasTotales ? formatVariation(kpis.ventasTotales, prev.ventasTotales) : null;
  const varUtilidad = prev.ventasTotales ? formatVariation(utilidadAjustada, prev.ventasTotales * (prev.margenSeguridad ?? 0)) : null;
  const varMS = prev.margenSeguridad ? formatVariation(currentMS, prev.margenSeguridad) : null;

  // ── Color Margen Rentabilidad ────────────────────────────────
  const mrColor = currentMR < thresholds.margenRentabilidad.critico
    ? "danger" : "success";

  // ── Insights Activos ─────────────────────────────────────────
  const activeInsights = [];

  // A. Ineficiencia operativa
  if (prev.ventasTotales && prev.puntoEquilibrio &&
    (kpis.ventasTotales / prev.ventasTotales) < (kpis.puntoEquilibrio / prev.puntoEquilibrio)) {
    activeInsights.push(insights.ineficienciaOperativa);
  }

  // B. Margen bajo
  if (currentMR < thresholds.margenRentabilidad.critico) {
    activeInsights.push(insights.margenBajo);
  }

  // C. Calendario fallido
  if (currentDiaEq && diaActual > currentDiaEq && utilidadAjustada < 0) {
    activeInsights.push(insights.calendarioFallido);
  }

  // D. Motor Dinámico MS (Mes Actual)
  if (esMesActual) {
    activeInsights.push({
      emoji: currentMS < 0.20 ? "🚨" : "🛡️",
      titulo: `Día ${diaActual}: Meta de Equilibrio Dinámico`,
      texto: `Doctor, al día ${diaActual}, su meta de facturación para cubrir costos es de ${formatCurrency(peDinamico)}.\n\nSu Margen de Seguridad actual es del ${formatPercentSmart(currentMS)}. Esto indica que sus ventas pueden caer un ${formatPercentSmart(currentMS)} antes de que la clínica empiece a perder dinero hoy.`,
      tipo: currentMS < 0.20 ? "danger" : "info"
    });
  }

  // ── Día de equilibrio ────────────────────────────────────────
  const diaEqDisplay = (() => {
    if (esMesActual) {
      if (!currentDiaEq) return "Proyección inviable (ventas $0)";
      if (currentDiaEq > diasTotalesMes) return `No se logrará (${currentDiaEq} días req.)`;
      return `Proyectado: Día ${currentDiaEq}`;
    }
    const raw = kpis.diaEquilibrio;
    if (!raw || String(raw).includes("#N/A") || String(raw).includes("2042")) return "No se alcanzó";
    const n = parseDiaEquilibrio(raw);
    return n ? `Día ${n}` : String(raw);
  })();

  return (
    <div>
      {/* ── Grid de KPIs ── */}
      <div className="kpi-grid">

        {/* 1. Ventas Totales */}
        <KPICard
          label="Ventas Totales"
          value={formatCurrency(kpis.ventasTotales)}
          variation={varVentas}
          tooltip={tooltips.ventasTotales}
          accent="primary"
          fullWidth
        />

        {/* 2. Utilidad Operativa */}
        <KPICard
          label={esMesActual ? "Utilidad (Real a la fecha)" : "Utilidad Operativa"}
          value={formatCurrency(kpis.utilidadOperativa)}
          valueColor={kpis.utilidadOperativa >= 0 ? "success" : "danger"}
          subtitle={esMesActual ? `Progresiva: ${formatCurrency(utilidadAjustada)}` : null}
          variation={varUtilidad}
          tooltip={tooltips.utilidadOperativa}
          accent={utilidadAjustada >= 0 ? "success" : "danger"}
        />

        {/* 3. Margen de Rentabilidad */}
        <KPICard
          label={esMesActual ? "M. Rentabilidad (Dinámico)" : "Margen de Rentabilidad"}
          value={formatPercentSmart(currentMR)}
          valueColor={mrColor}
          tooltip={tooltips.margenRentabilidad}
          accent={mrColor}
        />

        {/* 4. Margen de Seguridad — Gauge */}
        <KPICard
          label="Margen de Seguridad"
          tooltip={tooltips.margenSeguridad}
          accent={currentMS < 0.20 ? "danger" : estadoGlobal === "precaucion" ? "warning" : "success"}
          fullWidth={false}
        >
          <GaugeChart value={currentMS} />
        </KPICard>

        {/* 5. Índice de Cobrabilidad — Donut */}
        <KPICard
          label="Índice de Cobrabilidad"
          tooltip={tooltips.indiceCobrabilidad}
          accent={
            kpis.indiceCobrabilidad < 0.5 ? "danger" :
              kpis.indiceCobrabilidad < 0.75 ? "warning" : "success"
          }
        >
          <DonutChart value={kpis.indiceCobrabilidad} />
        </KPICard>

      </div>

      {/* ── Punto de Equilibrio ── */}
      <div className="card" style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="card-label">{esMesActual ? "Punto de Eq. Dinámico (Hoy)" : "Punto de Equilibrio (Mes)"}</div>
          <div className="card-value-sm" style={{ color: "var(--color-primary-light)" }}>
            {formatCurrency(currentPE)}
          </div>
          {kpis.prev?.puntoEquilibrio && (() => {
            const v = formatVariation(currentPE, kpis.prev.puntoEquilibrio);
            return (
              <div style={{ fontSize: "0.7rem", marginTop: "3px", color: v.direction === "up" ? "var(--color-success-light)" : v.direction === "down" ? "var(--color-danger)" : "var(--text-muted)", fontWeight: 600 }}>
                {v.label} vs. mes ant.
              </div>
            );
          })()}
        </div>
        <InfoButton onClick={() => openModal("puntoEquilibrio")} />
      </div>

      {/* ── Hito: Día de Equilibrio ── */}
      <div className="card" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
        <div className="cal-badge" style={{ borderColor: currentMetaAlcanzada ? "var(--color-success)" : "var(--border)" }}>
          <Calendar size={13} style={{ color: "var(--text-secondary)", marginBottom: "2px" }} />
          <div className="cal-day" style={{ color: currentMetaAlcanzada ? "var(--color-success-light)" : "var(--text-primary)" }}>
            {currentDiaEq && currentDiaEq <= diasTotalesMes ? currentDiaEq : "—"}
          </div>
          <div className="cal-label">
            {currentDiaEq && currentDiaEq <= diasTotalesMes ? "Equil." : "N/D"}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div className="card-label">Día de Equilibrio</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {diaEqDisplay}
          </div>
          {esMesActual && currentDiaEq && (
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Velocidad actual: {formatCurrency(projectedVelocity)}/día
            </div>
          )}
        </div>

        <InfoButton onClick={() => openModal("diaEquilibrio")} />

        {currentMetaAlcanzada && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            background: "rgba(45,106,79,0.15)", padding: "8px 10px",
            borderRadius: "var(--radius-sm)", border: "1px solid rgba(82,183,136,0.3)",
          }}>
            <Trophy size={18} color="var(--color-success-light)" />
            <span style={{ fontSize: "0.58rem", color: "var(--color-success-light)", fontWeight: 700, marginTop: "2px" }}>
              META
            </span>
          </div>
        )}
      </div>

      {/* ── Motor de Insights ── */}
      {activeInsights.length > 0 && (
        <>
          <div className="section-title">Diagnóstico Inteligente</div>
          {activeInsights.map((insight, i) => (
            <InsightCard key={i} {...insight} />
          ))}
        </>
      )}

      {activeInsights.length === 0 && !loading && (
        <div style={{
          textAlign: "center", padding: "16px",
          color: "var(--text-muted)", fontSize: "0.8rem",
        }}>
          ✅ No hay alertas activas este período
        </div>
      )}

      {/* ── Modales ── */}
      {modal("puntoEquilibrio") && (
        <TooltipModal
          titulo={tooltips.puntoEquilibrio.titulo}
          texto={tooltips.puntoEquilibrio.texto}
          onClose={closeModal}
        />
      )}
      {modal("diaEquilibrio") && (
        <TooltipModal
          titulo={tooltips.diaEquilibrio.titulo}
          texto={tooltips.diaEquilibrio.texto}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

/** Botón ⓘ para abrir tooltip */
function InfoButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "26px", height: "26px", borderRadius: "50%",
        border: "1px solid var(--border)", background: "var(--bg-hover)",
        color: "var(--text-secondary)", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: "0.75rem", flexShrink: 0,
      }}
    >
      i
    </button>
  );
}

function ErrorState({ message }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "32px 16px" }}>
      <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🔌</div>
      <div style={{ fontWeight: 700, marginBottom: "6px" }}>Error al cargar datos</div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{message}</div>
    </div>
  );
}
