"use client";

/**
 * InsightCard — Tarjeta de alerta inteligente del Motor de Diagnóstico
 * Solo se renderiza si la condición del insight está activa
 */
export default function InsightCard({ emoji, titulo, texto, tipo = "info" }) {
  return (
    <div className={`insight-card ${tipo}`}>
      <span className="insight-emoji">{emoji}</span>
      <div>
        <div className="insight-title">{titulo}</div>
        <div style={{ color: "var(--text-secondary)", fontSize:"0.8rem" }}>{texto}</div>
      </div>
    </div>
  );
}
