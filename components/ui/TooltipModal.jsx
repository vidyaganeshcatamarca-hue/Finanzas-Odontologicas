"use client";
import { useEffect } from "react";

/**
 * TooltipModal — Bottom sheet educativo
 * Se muestra al tocar el botón (i) de cada KPI Card
 */
export default function TooltipModal({ titulo, texto, onClose }) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{ maxWidth: "600px", width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" />
        <div className="modal-title">
          <span style={{ marginRight: "6px" }}>📖</span>
          {titulo}
        </div>
        <p className="modal-text">{texto}</p>
        <button
          onClick={onClose}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "12px",
            background: "var(--bg-hover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontFamily: "var(--font)",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
