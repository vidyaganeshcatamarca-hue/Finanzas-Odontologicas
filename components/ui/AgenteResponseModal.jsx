"use client";
import { useEffect } from "react";
import { Bot, X, Clock } from "lucide-react";

/**
 * AgenteResponseModal — Panel de respuesta del Agente IA Financiero
 *
 * Slide-up full-screen modal que muestra el análisis generado por n8n.
 * Usa las mismas clases .modal-overlay / .modal-sheet del sistema de diseño.
 */
export default function AgenteResponseModal({ respuesta, timestamp, onClose }) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Parsear la respuesta: puede ser JSON con campo de texto o string directo
  const texto = (() => {
    if (typeof respuesta === "string") return respuesta;
    return (
      respuesta?.mensaje ??
      respuesta?.message ??
      respuesta?.analisis ??
      respuesta?.respuesta ??
      respuesta?.texto ??
      JSON.stringify(respuesta, null, 2)
    );
  })();

  const hora = timestamp
    ? new Date(timestamp).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{ maxWidth: "600px", width: "100%", maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="modal-handle" />

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Ícono con glow suave */}
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "linear-gradient(135deg, #0077B6 0%, #1B4FDE 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 12px rgba(0,119,182,0.5)",
              flexShrink: 0,
            }}>
              <Bot size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                Agente CFO
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Análisis de Signos Vitales
              </div>
            </div>
          </div>

          {/* Timestamp + cerrar */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {hora && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)", fontSize: "0.7rem" }}>
                <Clock size={12} />
                {hora}
              </div>
            )}
            <button
              onClick={onClose}
              style={{
                width: "28px", height: "28px", borderRadius: "50%",
                border: "1px solid var(--border)", background: "var(--bg-hover)",
                color: "var(--text-secondary)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: "1px", background: "linear-gradient(90deg, var(--color-primary) 0%, transparent 100%)",
          marginBottom: "16px", opacity: 0.4,
        }} />

        {/* Cuerpo del análisis */}
        <div style={{
          overflowY: "auto",
          maxHeight: "calc(88vh - 180px)",
          paddingRight: "4px",
        }}>
          <div style={{
            fontSize: "0.85rem",
            lineHeight: 1.75,
            color: "var(--text-primary)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {texto}
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "12px",
            background: "linear-gradient(135deg, #0077B6 0%, #1B4FDE 100%)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            color: "white",
            fontFamily: "var(--font)",
            fontSize: "0.85rem",
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "0.5px",
          }}
        >
          Cerrar análisis
        </button>
      </div>
    </div>
  );
}
