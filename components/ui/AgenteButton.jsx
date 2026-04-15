"use client";
import { useState } from "react";
import { Bot, Sparkles, AlertCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import APP_CONFIG from "@/config/app.config";
import { buildAgentePayload } from "@/lib/agente";
import AgenteResponseModal from "@/components/ui/AgenteResponseModal";

/**
 * AgenteButton — Botón genérico para consultar agentes IA
 *
 * Props:
 * - label: Texto del botón
 * - webhookUrl: URL a la que enviar el payload
 * - intent: "analisis" | "pregunta" (default "analisis")
 */
/**
 * AgenteButton — Botón genérico para consultar agentes IA
 *
 * Props:
 * - agentId: Identificador único del agente (para persistencia)
 * - label: Texto del botón base
 * - webhookUrl: URL a la que enviar el payload
 * - intent: "analisis" | "pregunta" (default "analisis")
 */
export default function AgenteButton({
  agentId,
  label = "Consultar Agente IA",
  webhookUrl = APP_CONFIG.agente.webhookUrl,
  intent = "analisis"
}) {
  const { agenteResults, saveAgenteResult, ...ctx } = useApp();
  const [estado, setEstado] = useState("idle");
  const [errorMsg, setErrorMsg] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Obtener resultado previo del contexto global
  const previousResult = agenteResults[agentId];

  const handleConsultar = async () => {
    if (estado === "loading") return;

    setEstado("loading");
    setErrorMsg(null);

    try {
      // ── Helper para calcular mes/año previo ──────────────────────────────
      const getPrevMonth = (year, month, offset) => {
        let m = month - offset;
        let y = year;
        while (m < 0) { m += 12; y--; }
        return { year: y, month: m };
      };

      const { selectedYear, selectedMonth } = ctx;
      const p1 = getPrevMonth(selectedYear, selectedMonth, 1);
      const p2 = getPrevMonth(selectedYear, selectedMonth, 2);
      const p3 = getPrevMonth(selectedYear, selectedMonth, 3);

      // ── Fetch paralelo de datos suplementarios (sin bloquear por errores) ─
      const safeJson = (r) => r.ok ? r.json().catch(() => null) : null;

      const [
        tratamientosRes,
        gastosRes,
        heatmapRes,
        gastosP1,
        gastosP2,
        gastosP3,
      ] = await Promise.all([
        fetch(`/api/sheets?type=tratamientos&year=${selectedYear}&month=${selectedMonth}`).then(safeJson),
        fetch(`/api/sheets?type=gastos&year=${selectedYear}&month=${selectedMonth}`).then(safeJson),
        fetch(`/api/sheets?type=heatmap&year=${selectedYear}&month=${selectedMonth}`).then(safeJson),
        fetch(`/api/sheets?type=gastos&year=${p1.year}&month=${p1.month}`).then(safeJson),
        fetch(`/api/sheets?type=gastos&year=${p2.year}&month=${p2.month}`).then(safeJson),
        fetch(`/api/sheets?type=gastos&year=${p3.year}&month=${p3.month}`).then(safeJson),
      ]);

      const payload = buildAgentePayload({
        ...ctx,
        tratamientos: tratamientosRes?.tratamientos ?? [],
        gastos:       gastosRes?.gastos ?? [],
        prevGastos:   [
          gastosP1?.gastos ?? [],
          gastosP2?.gastos ?? [],
          gastosP3?.gastos ?? [],
        ],
        heatmapDays:  heatmapRes?.days ?? [],
      });
      payload.config_agente.intencion = intent;

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`El agente respondió con error ${res.status}`);

      const data = await res.json();

      // GUARDAR EN CONTEXTO GLOBAL
      saveAgenteResult(agentId, data);
      
      setEstado("idle");
      setShowModal(true);
    } catch (err) {
      setErrorMsg(err.message ?? "Error al conectar con el agente");
      setEstado("error");
    }
  };

  const isLoading = estado === "loading";
  const isError   = estado === "error";
  const hasResult = !!previousResult;

  // Lógica de etiquetas solicitada por el usuario
  const finalLabel = hasResult ? "Volver a Consultar" : label;

  return (
    <>
      <div style={{ marginBottom: "12px" }}>
        {/* Botón principal (Consultar / Volver a Consultar) */}
        <button
          onClick={handleConsultar}
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "14px 16px",
            background: isLoading
              ? "rgba(0,119,182,0.4)"
              : "linear-gradient(135deg, #0077B6 0%, #1B4FDE 100%)",
            border: "1px solid rgba(0,119,182,0.4)",
            borderRadius: "var(--radius-sm)",
            color: "white",
            fontFamily: "var(--font)",
            fontSize: "0.88rem",
            fontWeight: 700,
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            letterSpacing: "0.4px",
            boxShadow: isLoading ? "none" : "0 4px 20px rgba(0,119,182,0.35)",
            transition: "all 0.25s ease",
            marginBottom: hasResult ? "6px" : "0",
          }}
        >
          {isLoading ? (
            <>
              <SpinnerIcon />
              Consultando...
            </>
          ) : (
            <>
              <Bot size={18} />
              {finalLabel}
              <Sparkles size={14} style={{ opacity: 0.7 }} />
            </>
          )}
        </button>

        {/* Link para VER ANÁLISIS PREVIO (sin consultar n8n) */}
        {hasResult && !isLoading && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              width: "100%",
              background: "none",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "8px",
              color: "var(--color-primary)",
              fontSize: "0.75rem",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            Ver último análisis disponible
          </button>
        )}

        {/* Mensaje de error */}
        {isError && (
          <div style={{
            marginTop: "6px",
            padding: "8px 12px",
            background: "rgba(230,57,70,0.1)",
            border: "1px solid rgba(230,57,70,0.3)",
            borderRadius: "var(--radius-sm)",
            display: "flex", alignItems: "center", gap: "8px",
            fontSize: "0.75rem", color: "var(--color-danger)",
          }}>
            <AlertCircle size={14} />
            <span style={{ flex: 1 }}>{errorMsg}</span>
            <button
              onClick={() => setEstado("idle")}
              style={{
                background: "none", border: "none",
                color: "var(--color-danger)", cursor: "pointer",
                fontSize: "0.72rem", textDecoration: "underline",
              }}
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      {/* ── Modal de respuesta ──────────────────────────────────────────── */}
      {showModal && hasResult && (
        <AgenteResponseModal
          respuesta={previousResult.data}
          timestamp={previousResult.timestamp}
          onClose={() => setShowModal(false)}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

/** Spinner SVG inline — evita dependencia externa */
function SpinnerIcon() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
