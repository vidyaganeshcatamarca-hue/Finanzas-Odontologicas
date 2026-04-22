"use client";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
  BarChart, Bar,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";
import APP_CONFIG from "@/config/app.config";
import { SkeletonChart, SkeletonTable } from "@/components/ui/SkeletonCard";
import { Search, Info, ChevronRight, MousePointer2, ChevronsLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const { insights, thresholds, colors } = APP_CONFIG;

/**
 * Cuadrantes BCG — eje X = volumen (cantidad), eje Y = margenUnitario
 *
 * CORRECCIÓN de definición:
 *   ⭐ Estrella  → alto volumen (derecha) + alto margen unitario (arriba)
 *   🐄 Vaca      → alto volumen (derecha) + bajo margen unitario (abajo)
 *   ❓ Dilema    → bajo volumen (izquierda) + alto margen unitario (arriba)
 *   🐕 Perro     → bajo volumen (izquierda) + bajo margen unitario (abajo)
 */
const QUADRANTS = {
  estrella: { label: "Estrella", color: "#2D6A4F", emoji: "⭐" },   // verde
  dilema:   { label: "Dilema",  color: "#FFB703", emoji: "❓" },   // amarillo
  vaca:     { label: "Vaca",    color: "#0077B6", emoji: "🐄" },   // azul
  perro:    { label: "Perro",   color: "#E63946", emoji: "🐕" },   // rojo
};

function getQuadrant(volumen, margenUnitario, medVolumen, medMargen) {
  if (volumen > medVolumen && margenUnitario > medMargen) return QUADRANTS.estrella;
  if (volumen <= medVolumen && margenUnitario > medMargen) return QUADRANTS.dilema;
  if (volumen > medVolumen && margenUnitario <= medMargen) return QUADRANTS.vaca;
  return QUADRANTS.perro;
}

export default function Produccion() {
  const { 
    selectedYear, selectedMonth, 
    tratamientos, tratPrev, loadingTrat, isRefreshingTrat, 
    fetchTratamientosForCurrentMonth 
  } = useApp();
  
  const [search, setSearch]             = useState("");
  const [selectedBubble, setSelectedBubble] = useState(null);
  const [showGuia, setShowGuia]         = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    fetchTratamientosForCurrentMonth();
  }, [selectedYear, selectedMonth, fetchTratamientosForCurrentMonth]);

  // Click fuera para cerrar detalle
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Si el click fue en el fondo o en un elemento que no es parte de la lógica de selección, cerramos
      // Pero mejor aún, el usuario pide que SIEMPRE cerremos si hay click en pantalla
      // exceptuando el click que abre el globo?
      // "al click sobre cualquier parte de la pantalla lo borras (incluso si el click es sobre el mismo recuadro)"
      if (selectedBubble) {
        // Ignoramos el primer click que abre la burbuja (que ya dispara setSelectedBubble)
        // Pero el scatter de recharts no da un 'container' fácil.
        // Usamos un timeout mínimo o simplemente el evento de scatter maneja su estado.
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [selectedBubble]);

  const handleContainerClick = () => {
    if (selectedBubble) setSelectedBubble(null);
  };

  if (loadingTrat) return <><SkeletonChart height={220} /><SkeletonTable rows={8} /></>;
  if (!tratamientos.length) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
        No hay datos de tratamientos para este período.
      </div>
    );
  }

  // ── Filtrado y Ordenamiento ──
  // No considerar productos con 0 ventas para la matriz
  const dataForMatrix = tratamientos.filter(t => t.cantidad > 0);
  
  const sorted = [...dataForMatrix].sort((a, b) => b.margenTotal - a.margenTotal);
  const top20  = sorted.slice(0, 20);
  const top5   = top20.slice(0, 5);

  // Intersección (Centro) basada en el Rango del Top 20 
  const volumes  = top20.map((t) => t.cantidad);
  const marginsU = top20.map((t) => t.margenUnitario);

  const medVolumen = volumes.length > 0 ? (Math.max(...volumes) + Math.min(...volumes)) / 2 : 0;
  const medMargen  = marginsU.length > 0 ? (Math.max(...marginsU) + Math.min(...marginsU)) / 2 : 0;

  // Datos burbuja enriquecidos
  const bubbleData = top20.map((t) => {
    const q = getQuadrant(t.cantidad, t.margenUnitario, medVolumen, medMargen);
    return {
      ...t,
      x: t.cantidad,
      y: t.margenUnitario,
      z: Math.max(t.margenTotal, 1),
      qLabel: q.label,
      qColor: q.color,
      qEmoji: q.emoji,
    };
  });

  const getTendencia = (nombre) => {
    const prev   = tratPrev.find((p) => p.nombre === nombre);
    const actual = tratamientos.find((t) => t.nombre === nombre)?.margenTotal ?? 0;
    if (!prev) return { emoji: "🟡", texto: "—", valor: null };
    const delta = prev.margenTotal > 0 ? (actual - prev.margenTotal) / prev.margenTotal : 0;
    const pct   = (delta * 100).toFixed(0);
    if (delta > 0.10)  return { emoji: "🟢", texto: `+${pct}%`, valor: delta };
    if (delta < -0.10) return { emoji: "🔴", texto: `${pct}%`,  valor: delta };
    return { emoji: "🟡", texto: pct !== "0" ? `${delta > 0 ? "+" : ""}${pct}%` : "≈", valor: delta };
  };

  const tableData = tratamientos
    .filter((t) => t.nombre.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.margenTotal - a.margenTotal)
    .slice(0, 15);

  const detailBubble = bubbleData.find(b => b.nombre === selectedBubble);

  return (
    <div onClick={handleContainerClick}>
      {/* Matriz de Rentabilidad */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <div className="section-title" style={{ margin: 0 }}>Matriz de Rentabilidad (Top 20)</div>
        <button onClick={(e) => { e.stopPropagation(); setShowGuia(!showGuia); }} style={{
          display: "flex", alignItems: "center", gap: "4px",
          background: "var(--bg-hover)", border: "1px solid var(--border)",
          borderRadius: "20px", padding: "4px 10px", cursor: "pointer",
          fontSize: "0.7rem", color: "var(--text-secondary)",
        }}>
          <Info size={12} /> Guía
        </button>
      </div>

      <div className="card" style={{ marginBottom: "16px", padding: "12px", position: "relative" }}>
        {showGuia && (
          <div style={{
            position: "absolute", top: "10px", right: "10px", left: "10px",
            background: "rgba(30, 30, 45, 0.98)", border: "1px solid var(--border)",
            borderRadius: "12px", padding: "16px", zIndex: 50,
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            fontSize: "0.72rem", lineHeight: 1.5, backdropFilter: "blur(4px)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <strong style={{ fontSize: "0.8rem", color: "var(--color-primary-light)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Info size={14} /> GUÍA DE LA MATRIZ BCG
              </strong>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowGuia(false); }} 
                style={{ background: "var(--bg-hover)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >✕</button>
            </div>
            
            <div style={{ display: "grid", gap: "10px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ width: 14, height: 14, borderRadius: "4px", background: "#2D6A4F", marginTop: "2px", flexShrink: 0 }} />
                <div><strong>Estrellas (Top-Der):</strong> Alta demanda y alta ganancia. Son los productos líderes del mes.</div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ width: 14, height: 14, borderRadius: "4px", background: "#FFB703", marginTop: "2px", flexShrink: 0 }} />
                <div><strong>Dilemas (Top-Izq):</strong> Mucho margen pero pocas ventas. Tienen potencial si se promocionan más.</div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ width: 14, height: 14, borderRadius: "4px", background: "#0077B6", marginTop: "2px", flexShrink: 0 }} />
                <div><strong>Vacas (Base-Der):</strong> Mucho volumen pero margen bajo. Generan flujo para pagar costos fijos.</div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ width: 14, height: 14, borderRadius: "4px", background: "#E63946", marginTop: "2px", flexShrink: 0 }} />
                <div><strong>Perros (Base-Izq):</strong> Bajo volumen y bajo margen. Productos a revisar o renovar.</div>
              </div>
            </div>
            
            <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border)", fontSize: "0.68rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              📍 <strong>Burbujas:</strong> Su tamaño representa el <strong>Margen Total ($)</strong>, indicando su peso real en la rentabilidad. El cruce de ejes se calcula según el rango de ventas del mes actual.
            </div>
          </div>
        )}

        <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "8px", display: "flex", gap: "10px", justifyContent: "center" }}>
          {Object.values(QUADRANTS).map((q) => (
            <div key={q.label} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: q.color }} />
              {q.label}
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis type="number" dataKey="x" name="Cantidad" hide domain={['dataMin - 1', 'dataMax + 1']} />
            <YAxis type="number" dataKey="y" name="Margen/u" hide domain={['dataMin - 1', 'dataMax + 1']} />
            <ZAxis type="number" dataKey="z" range={[80, 800]} />
            <ReferenceLine x={medVolumen} stroke="var(--border)" strokeDasharray="3 3" />
            <ReferenceLine y={medMargen}  stroke="var(--border)" strokeDasharray="3 3" />
            <Scatter
              data={bubbleData}
              onClick={(data, index, e) => {
                e.stopPropagation();
                setSelectedBubble(selectedBubble === data.nombre ? null : data.nombre);
              }}
            >
              {bubbleData.map((entry, i) => (
                <Cell 
                  key={i} 
                  fill={entry.qColor} 
                  fillOpacity={selectedBubble ? (selectedBubble === entry.nombre ? 1 : 0.2) : 0.8}
                  style={{ cursor: "pointer", transition: "all 0.2s" }}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Ejes Visuales (Labels) */}
        <div style={{ position: "absolute", bottom: "10px", right: "12px", fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 700, padding: "2px 6px", background: "rgba(10,10,20,0.5)", borderRadius: "4px" }}>+ VOLUMEN</div>
        <div style={{ position: "absolute", top: "12px", left: "10px", fontSize: "0.55rem", color: "var(--text-muted)", fontWeight: 700, writingMode: "vertical-lr", transform: "rotate(180deg)", padding: "6px 2px", background: "rgba(10,10,20,0.5)", borderRadius: "4px" }}>+ MARGEN UNITARIO</div>

        {/* Globo de Detalle (al centro o sobre el chart) */}
        {selectedBubble && detailBubble && (
          <div 
            onClick={(e) => { e.stopPropagation(); setSelectedBubble(null); }}
            style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              background: "var(--bg-card)", border: "2px solid " + detailBubble.qColor,
              borderRadius: "12px", padding: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              zIndex: 10, minWidth: "180px", cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 800, color: detailBubble.qColor, fontSize: "0.9rem", marginBottom: "8px" }}>{detailBubble.nombre}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px", fontSize: "0.75rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Cantidad:</span>
              <span style={{ fontWeight: 700 }}>{detailBubble.cantidad}</span>
              <span style={{ color: "var(--text-secondary)" }}>Margen/u:</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(detailBubble.margenUnitario)}</span>
              <span style={{ color: "var(--text-secondary)" }}>Margen Total:</span>
              <span style={{ fontWeight: 700, color: detailBubble.qColor }}>{formatCurrency(detailBubble.margenTotal)}</span>
            </div>
            <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border)", textAlign: "center", fontSize: "0.65rem", color: "var(--text-muted)" }}>
              Tipo: <strong>{detailBubble.qLabel}</strong> {detailBubble.qEmoji}
            </div>
          </div>
        )}
      </div>

      {/* Top 5 por Margen Total */}
      <div className="section-title">Top 5 por Margen Total</div>
      <div className="card" style={{ marginBottom: "16px", padding: "12px" }}>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart layout="vertical" data={top5} margin={{ left: 0, right: 70, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="nombre"
              width={130}
              tick={(props) => {
                const { x, y, payload } = props;
                const words = payload.value.split(" ");
                const half  = Math.ceil(words.length / 2);
                const line1 = words.slice(0, half).join(" ");
                const line2 = words.slice(half).join(" ");
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={0} y={0} dy={line2 ? -5 : 4} textAnchor="end" fill="var(--text-secondary)" fontSize={10}>{line1}</text>
                    {line2 && <text x={0} y={0} dy={9}  textAnchor="end" fill="var(--text-secondary)" fontSize={10}>{line2}</text>}
                  </g>
                );
              }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="margenTotal" radius={[0, 4, 4, 0]}>
              {top5.map((entry, i) => {
                const q = getQuadrant(entry.cantidad, entry.margenUnitario, medVolumen, medMargen);
                return <Cell key={i} fill={q.color} fillOpacity={1 - i * 0.1} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla de Rendimiento */}
      <div className="section-title">Tabla de Rendimiento (Top 15)</div>
      <div className="card" style={{ padding: "12px", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div className="search-wrap" style={{ margin: 0, width: "180px" }}>
            <Search size={14} className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--color-primary-light)", fontSize: "0.62rem", fontWeight: 700, animation: "pulseLeft 2s infinite" }}>
             <ChevronsLeft size={14} /> SCROLL
          </div>
        </div>
        
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "400px" }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, zIndex: 10, padding: "8px", textAlign: "left", fontSize: "0.7rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}>Producto</th>
                <th style={{ padding: "8px", textAlign: "right", fontSize: "0.7rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>Cant.</th>
                <th style={{ padding: "8px", textAlign: "right", fontSize: "0.7rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>Margen</th>
                <th style={{ padding: "8px", textAlign: "right", fontSize: "0.7rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>Part.%</th>
                <th style={{ padding: "8px", textAlign: "center", fontSize: "0.7rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>Tend.</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((t, i) => {
                const tend = getTendencia(t.nombre);
                return (
                  <tr key={i}>
                    <td style={{ position: "sticky", left: 0, zIndex: 10, padding: "10px 8px", fontSize: "0.75rem", borderBottom: "1px solid var(--border-light)", borderRight: "1px solid var(--border)", fontWeight: 500, lineHeight: 1.25, background: "var(--bg-card)", minWidth: "135px", maxWidth: "200px" }}>
                      {t.nombre}
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontSize: "0.78rem", borderBottom: "1px solid var(--border-light)" }}>{t.cantidad}</td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontSize: "0.78rem", borderBottom: "1px solid var(--border-light)", fontWeight: 700 }}>{formatCurrency(t.margenTotal)}</td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontSize: "0.78rem", borderBottom: "1px solid var(--border-light)" }}>
                      {(t.participacion * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "center", borderBottom: "1px solid var(--border-light)" }}>
                      <span style={{ fontSize: "0.85rem" }}>{tend.emoji}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulseLeft {
          0% { transform: translateX(0); opacity: 0.6; }
          50% { transform: translateX(-4px); opacity: 1; }
          100% { transform: translateX(0); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
