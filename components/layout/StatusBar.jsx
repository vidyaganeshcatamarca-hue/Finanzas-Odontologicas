"use client";
import { useApp } from "@/context/AppContext";
import APP_CONFIG from "@/config/app.config";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";

const STATUS_MAP = {
  critico: {
    Icon: AlertCircle,
    className: "critico",
    extraClass: "blink",
    ...APP_CONFIG.statusBar.critico,
  },
  precaucion: {
    Icon: AlertTriangle,
    className: "precaucion",
    extraClass: "",
    ...APP_CONFIG.statusBar.precaucion,
  },
  saludable: {
    Icon: CheckCircle,
    className: "saludable",
    extraClass: "",
    ...APP_CONFIG.statusBar.saludable,
  },
};

export default function StatusBar() {
  const { estadoGlobal, loading, kpis } = useApp();
  if (loading || !estadoGlobal) return null;

  const status = STATUS_MAP[estadoGlobal];
  const { Icon, className, extraClass, label } = status;

  return (
    <div className={`status-bar ${className}`} role="alert">
      <Icon size={16} className={extraClass} />
      <span style={{ fontWeight: 700, letterSpacing: "0.5px" }}>{label}</span>
    </div>
  );
}
