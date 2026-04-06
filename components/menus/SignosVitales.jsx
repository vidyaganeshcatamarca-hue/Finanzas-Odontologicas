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
    diaActual, diaEquilibrioNum, metaAlcanzada,
    estadoGlobal,
    // [NUEVO] Motor Dinámico
    peDinamico, msReal, insightPE, insightMS,
    estadoSemaforo
  } = useApp();

  const [modalKey, setModalKey] = useState(null);
  const openModal = (key) => setModalKey(key);
  const closeModal = () => setModalKey(null);
  const modal = (key) => modalKey === key;

  if (loading) return <SkeletonGrid />;
  if (error) return <ErrorState message={error} />;
  if (!kpis) return null;

  const prev = kpis.prev ?? {};

  // ── Variaciones PTD ─────────────────────────────────────────
  const varVentas = prev.ventasTotales ? formatVariation(kpis.ventasTotales, prev.ventasTotales) : null;
  const varUtilidad = prev.ventasTotales ? formatVariation(utilidadAjustada, prev.ventasTotales * (prev.margenSeguridad ?? 0)) : null;
  const varMS = prev.margenSeguridad ? formatVariation(esMesActual ? msReal : kpis.margenSeguridad, prev.margenSeguridad) : null;

  // ── Color Margen Rentabilidad ────────────────────────────────
  const mrColor = kpis.margenRentabilidad < thresholds.margenRentabilidad.critico
    ? "danger" : "success";

  // ── Insights Activos ─────────────────────────────────────────
  const activeInsights = [];

  // [NUEVO] Diagnóstico Dinámico (Prioridad)
  if (esMesActual) {
    activeInsights.push({ 
      titulo: "Meta de Facturación Hoy", 
      texto: insightPE, 
      color: estadoSemaforo === "DANGER" ? "var(--color-danger)" : "var(--color-success)" 
    });
    activeInsights.push({ 
      titulo: "Estado del Margen", 
      texto: insightMS, 
      color: msReal < 0.20 ? "var(--color-warning)" : "var(--color-success)" 
    });
  }

  // A. Ineficiencia operativa
  if (prev.ventasTotales && prev.puntoEquilibrio &&
    (kpis.ventasTotales / prev.ventasTotales) < (kpis.puntoEquilibrio / prev.puntoEquilibrio)) {
    activeInsights.push(insights.ineficienciaOperativa);
  }

  // B. Margen bajo
  if (kpis.margenRentabilidad < thresholds.margenRentabilidad.critico) {
    activeInsights.push(insights.margenBajo);
  }

  // C. Calendario fallido
  if (diaEquilibrioNum && diaActual > diaEquilibrioNum && utilidadAjustada < 0) {
    activeInsights.push(insights.calendarioFallido);
  }

  // ── Día de equilibrio ────────────────────────────────────────
  const diaEqDisplay = (() => {
    const raw = kpis.diaEquilibrio;
    if (!raw) return "—";
    // Si viene como fecha completa, extraemos el día
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
          label={esMesActual ? "Utilidad" : "Utilidad Operativa"}
          value={formatCurrency(utilidadAjustada)}
          valueColor={utilidadAjustada >= 0 ? "success" : "danger"}
          variation={varUtilidad}
          tooltip={tooltips.utilidadOperativa}
          accent={utilidadAjustada >= 0 ? "success" : "danger"}
        />

        {/* 3. Margen de Rentabilidad */}
        <KPICard
          label="Margen Rentabilidad"
          value={formatPercentSmart(kpis.margenRentabilidad)}
          valueColor={mrColor}
          tooltip={tooltips.margenRentabilidad}
          accent={mrColor}
        />

        {/* 4. Margen de Seguridad — Gauge */}
        <KPICard
          label="Margen de Seguridad"
          value={formatPercentSmart(esMesActual ? msReal : kpis.margenSeguridad)}
          tooltip={tooltips.margenSeguridad}
          accent={estadoSemaforo === "DANGER" ? "danger" : "success"}
          variation={varMS}
          fullWidth={false}
        >
          <GaugeChart value={esMesActual ? msReal : kpis.margenSeguridad} />
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
          <div className="card-label">
            {esMesActual ? "Meta Acumulada (Punto Equilibrio Hoy)" : "Punto de Equilibrio Mensual"}
          </div>
          <div className="card-value-sm" style={{ color: estadoSemaforo === "DANGER" ? "var(--color-danger)" : "var(--color-success-light)" }}>
            {formatCurrency(esMesActual ? peDinamico : kpis.puntoEquilibrio)}
          </div>
          {esMesActual && (
            <div style={{ fontSize: "0.7rem", marginTop: "3px", color: "var(--text-muted)" }}>
              Objetivo total mes: {formatCurrency(kpis.puntoEquilibrio)}
            </div>
          )}
          {!esMesActual && kpis.prev?.puntoEquilibrio && (() => {
            const v = formatVariation(kpis.puntoEquilibrio, kpis.prev.puntoEquilibrio);
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
        <div className="cal-badge" style={{ borderColor: metaAlcanzada ? "var(--color-success)" : "var(--border)" }}>
          <Calendar size={13} style={{ color: "var(--text-secondary)", marginBottom: "2px" }} />
          <div className="cal-day" style={{ color: metaAlcanzada ? "var(--color-success-light)" : "var(--text-primary)" }}>
            {diaEquilibrioNum ?? "—"}
          </div>
          <div className="cal-label">
            {diaEquilibrioNum ? "Equil." : "N/D"}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div className="card-label">Día de Equilibrio</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {diaEqDisplay}
          </div>
          {esMesActual && diaEquilibrioNum && (
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Hoy es día {diaActual} del mes
            </div>
          )}
        </div>

        <InfoButton onClick={() => openModal("diaEquilibrio")} />

        {metaAlcanzada && (
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
