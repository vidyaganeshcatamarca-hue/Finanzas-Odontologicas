"use client";
import { useApp } from "@/context/AppContext";
import APP_CONFIG from "@/config/app.config";
import { formatCurrency, formatPercentSmart } from "@/lib/formatters";
import DepletionChart from "@/components/charts/DepletionChart";
import Gastos from "@/components/menus/Gastos";
import { SkeletonGrid, SkeletonChart } from "@/components/ui/SkeletonCard";
import { Wallet, FileText, Layers } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import TooltipModal from "@/components/ui/TooltipModal";

const { tooltips, thresholds } = APP_CONFIG;

const PERIODOS = [
  { label: "Mes actual",   meses: 1 },
  { label: "Últ. 2 meses", meses: 2 },
  { label: "Últ. 3 meses", meses: 3 },
  { label: "6 meses",      meses: 6 },
  { label: "12 meses",     meses: 12 },
];

export default function SaludFinanciera() {
  const {
    kpis, loading, error,
    utilidadAjustada, costoFijoDevengado, esMesActual,
    selectedYear, selectedMonth,
  } = useApp();

  const [showHonorariosModal, setShowHonorariosModal] = useState(false);
  const [subTab, setSubTab]             = useState("flujo"); // "flujo" | "gastos"
  const [periodoCalle, setPeriodoCalle] = useState(1);
  const [dineroCalle, setDineroCalle]   = useState([]);
  const [loadingCalle, setLoadingCalle] = useState(false);

  const fetchCalle = useCallback(async (meses) => {
    setLoadingCalle(true);
    const results = [];
    for (let i = 0; i < meses; i++) {
      let m = selectedMonth - i;
      let y = selectedYear;
      if (m < 0) { m += 12; y -= 1; }
      try {
        const res  = await fetch(`/api/sheets?type=kpis&year=${y}&month=${m}`);
        const data = await res.json();
        if (res.ok && data.ventasTotales != null) {
          results.push({
            label:  `${APP_CONFIG.meses?.[m] ?? m} ${y}`,
            calle:  (data.ventasTotales ?? 0) - (data.ingresosReales ?? 0),
            ventas: data.ventasTotales ?? 0,
          });
        }
      } catch { /* ignorar mes no disponible */ }
    }
    setDineroCalle(results.reverse());
    setLoadingCalle(false);
  }, [selectedYear, selectedMonth]);

  useEffect(() => { fetchCalle(periodoCalle); }, [periodoCalle, fetchCalle]);

  if (loading) return <><SkeletonChart height={220} /><SkeletonGrid /></>;
  if (error)   return <ErrorState message={error} />;
  if (!kpis)   return null;

  const {
    ventasTotales, costosVariables, costosFijos,
    honorariosLaura, flujoCajaNeto,
    ingresosReales, egresosReales, indiceCobrabilidad,
    amortizaciones,
  } = kpis;

  const costosFijosDisplay = esMesActual ? costoFijoDevengado : (costosFijos ?? 0);

  const liquidezColor =
    flujoCajaNeto > 0 && utilidadAjustada > 0 ? "var(--color-success-light)" :
    flujoCajaNeto >= 0 ? "var(--color-warning)" :
    "var(--color-danger)";

  const liquidezLabel =
    flujoCajaNeto > 0 && utilidadAjustada > 0 ? "🟢 SALUDABLE" :
    flujoCajaNeto >= 0 ? "🟡 ADVERTENCIA" :
    "🔴 RIESGO DE LIQUIDEZ";


  const totalCalle = dineroCalle.reduce((s, d) => s + d.calle, 0);
  const totalVentasCalle = dineroCalle.reduce((s, d) => s + d.ventas, 0);
  const pctCalle = totalVentasCalle > 0 ? totalCalle / totalVentasCalle : 0;

  return (
    <div>
      {/* ── Sub-tabs ── */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
        {[
          { id: "flujo",   label: "💸 Flujo de Caja" },
          { id: "gastos",  label: "📋 Gastos" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            style={{
              flex: 1, padding: "8px 6px",
              background: subTab === id ? "var(--color-primary)" : "var(--bg-hover)",
              color:      subTab === id ? "white" : "var(--text-secondary)",
              border:     subTab === id ? "none"  : "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.78rem", fontWeight: subTab === id ? 700 : 400,
              cursor: "pointer", transition: "all 0.2s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Gastos sub-tab ── */}
      {subTab === "gastos" && <Gastos />}

      {/* ── Flujo de Caja sub-tab ── */}
      {subTab === "flujo" && (
        <div>
          {/* Gráfico Depleción */}
          <div className="section-title">Recorrido del Dinero</div>
          <div className="card" style={{ marginBottom: "16px", padding: "16px" }}>
            <DepletionChart
              ventas={ventasTotales}
              costosVariables={costosVariables ?? 0}
              costosFijos={costosFijosDisplay}
              honorarios={honorariosLaura ?? 0}
              utilidad={utilidadAjustada}
            />
            {esMesActual && (
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textAlign: "center", marginTop: "6px" }}>
                * Costos fijos con prorrateo accrual al día actual
              </div>
            )}
          </div>

          {/* Honorarios */}
          <div className="card" style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="card-label">Honorarios M. Laura</div>
              <div className="card-value-sm" style={{ color: "var(--color-warning)" }}>
                {formatCurrency(honorariosLaura)}
              </div>
            </div>
            <button
              style={{
                width: "28px", height: "28px", borderRadius: "50%",
                border: "1px solid var(--border)", background: "var(--bg-hover)",
                color: "var(--text-secondary)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "0.75rem",
              }}
              onClick={() => setShowHonorariosModal(true)}
            >
              ?
            </button>
          </div>

          {/* Amortizaciones */}
          {(amortizaciones ?? 0) > 0 && (
            <div className="card" style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
              <Layers size={18} color="var(--color-primary-light)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="card-label">Amortizaciones Equipamiento</div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--color-primary-light)" }}>
                  {formatCurrency(amortizaciones)} / mes
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Acumulado año: {formatCurrency((amortizaciones ?? 0) * (selectedMonth + 1))}
                </div>
              </div>
            </div>
          )}

          {/* Dinero en la Calle */}
          <div className="section-title">Dinero Financiado en la Calle</div>
          <div className="card" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div>
                <div className="card-label">
                  {totalCalle >= 0 ? "Ventas no cobradas (período)" : "Excedente de Cobros (Recupero)"}
                </div>
                <div style={{ 
                  fontSize: "1.1rem", fontWeight: 800, 
                  color: totalCalle < 0 ? "var(--color-success-light)" : (pctCalle > 0.3 ? "var(--color-danger)" : "var(--color-warning)") 
                }}>
                  {totalCalle < 0 ? `+ ${formatCurrency(Math.abs(totalCalle))}` : formatCurrency(totalCalle)}
                </div>
              </div>
              <select
                value={periodoCalle}
                onChange={(e) => setPeriodoCalle(Number(e.target.value))}
                style={{
                  background: "var(--bg-hover)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)", padding: "6px 10px",
                  color: "var(--text-primary)", fontSize: "0.75rem", cursor: "pointer",
                }}
              >
                {PERIODOS.map((p) => (
                  <option key={p.meses} value={p.meses}>{p.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                <span>{totalCalle >= 0 ? "Vendido sin cobrar" : "Cobrado por encima de ventas"}</span>
                <span>{totalCalle >= 0 ? `${(pctCalle * 100).toFixed(1)}% del total` : "Cobro histórico"}</span>
              </div>
              <div style={{ height: "8px", background: "var(--bg-hover)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(pctCalle * 100, 100)}%`, height: "100%",
                  background: pctCalle > 0.3 ? "var(--color-danger)" : "var(--color-warning)",
                  borderRadius: "4px", transition: "width 0.6s ease",
                }} />
              </div>
            </div>

            {loadingCalle ? (
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", padding: "8px" }}>Cargando...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                {dineroCalle.map((d, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{d.label}</span>
                    <span style={{ fontWeight: 600, color: d.calle > 0 ? "var(--color-warning)" : "var(--color-success-light)" }}>
                      {d.calle > 0 ? `${formatCurrency(d.calle)} sin cobrar` : "✅ Cobrado"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Papel vs Realidad */}
          <div className="section-title">Papel vs. Realidad</div>
          <div className="card" style={{ marginBottom: "12px" }}>
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <FileText size={14} color="var(--color-primary-light)" />
                <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>Resultado Operativo (Papel)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Ganancia según registros</span>
                <span style={{ fontWeight: 700, color: "var(--color-primary-light)" }}>{formatCurrency(utilidadAjustada)}</span>
              </div>
              <ProgressBar value={utilidadAjustada} max={ventasTotales} color="var(--color-primary)" />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Wallet size={14} color={liquidezColor} />
                <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>Flujo de Caja (Realidad)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Dinero real en su cuenta</span>
                <span style={{ fontWeight: 700, color: liquidezColor }}>{formatCurrency(flujoCajaNeto)}</span>
              </div>
              <ProgressBar value={flujoCajaNeto} max={ventasTotales} color={liquidezColor} />
            </div>
          </div>

          {/* Semáforo de Liquidez */}
          <div className="card" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1rem" }}>{liquidezLabel.split(" ")[0]}</span>
              <div>
                <div style={{ fontWeight: 700, color: liquidezColor, fontSize: "0.85rem" }}>
                  {liquidezLabel.replace(/^[^\s]+\s/, "")}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  {flujoCajaNeto > 0 && utilidadAjustada > 0
                    ? "Sus ganancias se están transformando en dinero real."
                    : flujoCajaNeto >= 0
                    ? "Cuidado: Está ganando dinero pero no le queda nada en la cuenta."
                    : "Alerta Crítica: Usted es rentable pero se está quedando sin efectivo."}
                </div>
              </div>
            </div>
          </div>


          {/* Modal Honorarios */}
          {showHonorariosModal && (
            <TooltipModal
              titulo={tooltips.honorariosLaura.titulo}
              texto={tooltips.honorariosLaura.texto}
              onClose={() => setShowHonorariosModal(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) * 100 : 0;
  return (
    <div style={{ height: "6px", background: "var(--bg-hover)", borderRadius: "3px", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.6s ease" }} />
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
