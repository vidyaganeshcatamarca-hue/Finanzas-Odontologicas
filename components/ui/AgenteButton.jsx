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
export default function AgenteButton({
  label = "Consultar Agente IA",
  webhookUrl = APP_CONFIG.agente.webhookUrl,
  intent = "analisis"
}) {
  const ctx = useApp();
  const [estado, setEstado] = useState("idle");
  const [respuesta, setRespuesta] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleConsultar = async () => {
    if (estado === "loading") return;

    setEstado("loading");
    setErrorMsg(null);

    try {
      const payload = buildAgentePayload(ctx);
      // Sobrescribir intención si se pasa por prop
      payload.config_agente.intencion = intent;

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`El agente respondió con error ${res.status}`);

      const data = await res.json();

      setRespuesta(data);
      setTimestamp(new Date().toISOString());
      setEstado("idle");
      setShowModal(true);
    } catch (err) {
      setErrorMsg(err.message ?? "Error al conectar con el agente");
      setEstado("error");
    }
  };

  const isLoading = estado === "loading";
  const isError   = estado === "error";

  return (
    <>
      <div style={{ marginBottom: "8px" }}>
        {/* Botón principal */}
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
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.boxShadow = "0 6px 28px rgba(0,119,182,0.55)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,119,182,0.35)";
            e.currentTarget.style.transform = "translateY(0)";
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
              {label}
              <Sparkles size={14} style={{ opacity: 0.7 }} />
            </>
          )}
        </button>

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
      {showModal && respuesta && (
        <AgenteResponseModal
          respuesta={respuesta}
          timestamp={timestamp}
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
