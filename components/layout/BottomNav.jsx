"use client";
import { Stethoscope, Wallet, BarChart2, CalendarDays } from "lucide-react";

const TABS = [
  { id: "signos",     label: "Signos",     Icon: Stethoscope },
  { id: "finanzas",   label: "Finanzas",   Icon: Wallet },
  { id: "produccion", label: "Producción", Icon: BarChart2 },
  { id: "estrategia", label: "Estrategia", Icon: CalendarDays },
];

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`nav-item ${activeTab === id ? "active" : ""}`}
          onClick={() => onTabChange(id)}
        >
          <Icon size={20} strokeWidth={activeTab === id ? 2.5 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
