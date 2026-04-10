"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  isCurrentMonth,
  getDaysInMonth,
  getCurrentDayOfMonth,
  calcCostoFijoDevengado,
  calcFactorProrrateo,
  calcEstadoGlobal,
  calcEstadoLiquidez,
  parseDiaEquilibrio,
} from "@/lib/calculations";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Mes seleccionado (default: mes actual) ─────────────────
  const now = new Date();
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  // ── Estado de datos ────────────────────────────────────────
  const [kpis,          setKpis]          = useState(null);
  const [tratamientos,  setTratamientos]  = useState([]);
  const [tratPrev,      setTratPrev]      = useState([]);
  // [OPTIMIZACIÓN 2: UI LOADING PATTERNS]
  // loading: solo cuando NO hay datos (carga inicial)
  // isRefreshing: cuando YA hay datos pero se actualizan
  const [loading,       setLoading]       = useState(true);
  const [isRefreshing,  setIsRefreshing] = useState(false);
  const [loadingTrat,   setLoadingTrat]   = useState(false);
  const [isRefreshingTrat, setIsRefreshingTrat] = useState(false);
  const [error,         setError]         = useState(null);
  const [lastSync,      setLastSync]      = useState(null);
  const [availableSheets, setAvailableSheets] = useState([]);

  // [SOLUCIÓN: EVITAR BUCLE INFINITO]
  // Usamos Refs para chequear si ya hay datos sin disparar una recreación de la función
  const kpisRef = React.useRef(kpis);
  const tratRef = React.useRef(tratamientos);
  
  useEffect(() => { kpisRef.current = kpis; }, [kpis]);
  useEffect(() => { tratRef.current = tratamientos; }, [tratamientos]);

  // ── Accrual Engine (solo mes actual) ──────────────────────
  const diaActual      = getCurrentDayOfMonth();
  const diasTotalesMes = getDaysInMonth(selectedYear, selectedMonth);
  const esMesActual    = isCurrentMonth(selectedYear, selectedMonth);

  // Costo Fijo de Referencia = Promedio histórico (hasta 3 meses) desde kpis.costoFijoPromedio
  const costoFijoReferencia = kpis?.costoFijoPromedio ?? 0;

  const costoFijoDevengado = esMesActual
    ? calcCostoFijoDevengado(costoFijoReferencia, diaActual, diasTotalesMes)
    : kpis?.costosFijos ?? 0;

  const factorProrrateo = calcFactorProrrateo(diaActual, diasTotalesMes);

  // ── Utilidad ajustada (con accrual en mes actual) ─────────
  const utilidadAjustada = esMesActual && kpis
    ? (kpis.ventasTotales ?? 0) - (kpis.costosVariables ?? 0) - costoFijoDevengado
    : kpis?.utilidadOperativa ?? 0;

  // ── MOTOR DE CÁLCULO DINÁMICO (PE Y MS GLOBAL) ───────────
  const ratioRaw = kpis?.ratioMargenReal || 0.4287;
  const ratioMargenReal = ratioRaw > 1 ? ratioRaw / 100 : ratioRaw;
  const ventasActualesPTD = kpis?.ventasTotales || 0;

  const peTotalMensual = ratioMargenReal > 0 ? costoFijoReferencia / ratioMargenReal : 0;
  const peDinamico = esMesActual 
    ? peTotalMensual * (diaActual / (diasTotalesMes || 30)) 
    : (kpis?.puntoEquilibrio || 0);

  const msCalculado = esMesActual
    ? (ventasActualesPTD > 0 ? (ventasActualesPTD - peDinamico) / ventasActualesPTD : 0)
    : (kpis?.margenSeguridad || 0);

  // ── Estados semáforo ───────────────────────────────────────
  const estadoGlobal = kpis
    ? calcEstadoGlobal(msCalculado)
    : null;

  const estadoLiquidez = kpis
    ? calcEstadoLiquidez(utilidadAjustada, kpis.flujoCajaNeto, kpis.ventasTotales)
    : null;

  const diaEquilibrioNum = kpis
    ? parseDiaEquilibrio(kpis.diaEquilibrio)
    : null;

  // Día de Equilibrio Dinámico Proyectado
  const projectedVelocity = ventasActualesPTD / (diaActual || 1);
  const currentDiaEq = esMesActual
    ? (projectedVelocity > 0 ? Math.max(1, Math.ceil(peTotalMensual / projectedVelocity)) : null)
    : diaEquilibrioNum;

  const currentMetaAlcanzada = esMesActual 
    ? (currentDiaEq && diaActual >= currentDiaEq) 
    : (diaEquilibrioNum && diaActual >= diaEquilibrioNum);

  // ── Fetch de datos principales ─────────────────────────────
  const fetchKPIs = useCallback(async (year, month) => {
    // [OPTIMIZACIÓN 2: UI LOADING PATTERNS - FIJJED]
    // Usamos el Ref para evitar el bucle infinito por dependencia circular
    const hasData = kpisRef.current !== null;
    if (hasData) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/sheets?type=kpis&year=${year}&month=${month}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setKpis(data);
      setLastSync(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []); // Dependencias vacías para evitar loop

  const fetchTratamientos = useCallback(async (year, month) => {
    // [OPTIMIZACIÓN 2: UI LOADING PATTERNS - FIXED]
    const hasData = tratRef.current.length > 0;
    if (hasData) {
      setIsRefreshingTrat(true);
    } else {
      setLoadingTrat(true);
    }
    try {
      const res = await fetch(`/api/sheets?type=tratamientos&year=${year}&month=${month}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setTratamientos(data.tratamientos ?? []);
      setTratPrev(data.tratamientosPrev ?? []);
    } catch (err) {
      console.error("Error cargando tratamientos:", err);
    } finally {
      setLoadingTrat(false);
      setIsRefreshingTrat(false);
    }
  }, []); // Dependencias vacías para evitar loop

  const fetchAvailableSheets = useCallback(async () => {
    try {
      const res = await fetch("/api/sheets?type=sheets");
      const data = await res.json();
      setAvailableSheets(data.sheets ?? []);
    } catch {
      // no crítico
    }
  }, []);

  // ── Carga inicial y al cambiar mes ─────────────────────────
  useEffect(() => {
    fetchKPIs(selectedYear, selectedMonth);
    fetchAvailableSheets();
  }, [selectedYear, selectedMonth, fetchKPIs, fetchAvailableSheets]);

  // ── Selector de mes ────────────────────────────────────────
  const setMonth = useCallback((year, month) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  }, []);

  const refetch = useCallback(() => {
    fetchKPIs(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchKPIs]);

  const fetchTratamientosForCurrentMonth = useCallback(() => {
    fetchTratamientos(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchTratamientos]);

  return (
    <AppContext.Provider
      value={{
        // Mes
        selectedYear,
        selectedMonth,
        setMonth,
        esMesActual,
        diaActual,
        diasTotalesMes,
        // Datos
        kpis,
        tratamientos,
        tratPrev,
        // Estado
        loading,
        loadingTrat,
        error,
        lastSync,
        availableSheets,
        // [OPTIMIZACIÓN 2: UI LOADING PATTERNS]
        isRefreshing,
        isRefreshingTrat,
        // Accrual & Dinámico
        costoFijoDevengado,
        costoFijoReferencia,
        factorProrrateo,
        utilidadAjustada,
        peDinamico,
        msCalculado,
        currentDiaEq,
        ratioMargenReal,
        // Semáforos
        estadoGlobal,
        estadoLiquidez,
        diaEquilibrioNum,
        metaAlcanzada: currentMetaAlcanzada,
        // Acciones
        refetch,
        fetchTratamientosForCurrentMonth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de AppProvider");
  return ctx;
}
