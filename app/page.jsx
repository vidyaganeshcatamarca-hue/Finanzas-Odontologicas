"use client";
import { useState } from "react";
import { AppProvider } from "@/context/AppContext";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StatusBar from "@/components/layout/StatusBar";
import AccrualBadge from "@/components/layout/AccrualBadge";
import SignosVitales from "@/components/menus/SignosVitales";
import SaludFinanciera from "@/components/menus/SaludFinanciera";
import Produccion from "@/components/menus/Produccion";
import Estrategia from "@/components/menus/Estrategia";

const MENUS = {
  signos:     { label: "Signos Vitales",  Component: SignosVitales },
  finanzas:   { label: "Bolsillo vs Papel", Component: SaludFinanciera },
  produccion: { label: "Producción y Estrellas", Component: Produccion },
  estrategia: { label: "Estrategia y Futuro", Component: Estrategia },
};

function Dashboard() {
  const [activeTab, setActiveTab] = useState("signos");
  const { Component } = MENUS[activeTab];

  return (
    <div className="app-shell">
      <Header />
      <StatusBar />
      <AccrualBadge />

      <main className="app-content">
        <Component />
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  );
}
