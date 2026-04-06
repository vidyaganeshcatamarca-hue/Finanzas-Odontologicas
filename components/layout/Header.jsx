"use client";
import { useApp } from "@/context/AppContext";
import { MESES_NAMES } from "@/lib/formatters";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

function formatTime(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

export default function Header() {
  const {
    selectedYear, selectedMonth, setMonth,
    loading, isRefreshing, refetch, lastSync,
    availableSheets,
  } = useApp();

  const now = new Date();
  const currentYear = now.getFullYear();

  // Años disponibles: año actual ± 1
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const handleMonthChange = (e) => {
    const [y, m] = e.target.value.split("-").map(Number);
    setMonth(y, m);
  };

  const handleRefresh = () => { refetch(); };

  const selectValue = `${selectedYear}-${selectedMonth}`;

  return (
    <header className="app-header">
      <div>
        <div className="app-header-title">Odontologia Maria Laura</div>
        <div className="app-header-subtitle" style={{ color: "var(--text-muted)" }}>
          {lastSync ? `Sync: ${formatTime(lastSync)}` : "Cargando..."}
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        <select
          className="month-select"
          value={selectValue}
          onChange={handleMonthChange}
        >
          {years.map((yr) =>
            MESES_NAMES.map((mes, idx) => {
              const sheetName = `${mes} ${yr}`;
              const exists = availableSheets.length === 0 || availableSheets.includes(sheetName);
              return (
                <option key={`${yr}-${idx}`} value={`${yr}-${idx}`} disabled={!exists}>
                  {mes} {yr}
                </option>
              );
            })
          )}
        </select>

        <button
          className="btn"
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
          style={{ padding:"6px 8px", minWidth:"auto" }}
          title="Refrescar datos"
        >
          <RefreshCw
            size={14}
            style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }}
          />
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </header>
  );
}
