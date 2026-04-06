/**
 * app.config.js — Archivo Maestro de Configuración
 * Salud Financiera · Odontologia Maria Laura
 *
 * EDITÁ ESTE ARCHIVO para cambiar textos, umbrales y tooltips
 * sin tocar el código de la aplicación.
 */

const APP_CONFIG = {
  // ── Branding ──────────────────────────────────────────────
  clinicName: "Odontologia Maria Laura",
  appVersion: "1.0.0",

  // ── Paleta de Colores ──────────────────────────────────────
  colors: {
    primary: "#0077B6",   // Azul Médico
    success: "#2D6A4F",   // Verde Sanitario
    warning: "#FFB703",   // Ámbar Advertencia
    danger: "#E63946",   // Rojo Crítico
    bgDark: "#0d1117",
    bgCard: "#161b22",
    bgCardAlt: "#1c2128",
    border: "#30363d",
    textPrimary: "#e6edf3",
    textSecondary: "#8b949e",
    textMuted: "#484f58",
  },

  // ── Tipografía ─────────────────────────────────────────────
  fonts: {
    primary: "'Inter', 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Courier New', monospace",
  },

  // ── Umbrales de Semáforo ───────────────────────────────────
  thresholds: {
    margenSeguridad: {
      critico: 0.10,   // < 10% → CRÍTICO
      alerta: 0.20,   // 10-20% → PRECAUCIÓN
      // > 20% → SALUDABLE
    },
    margenRentabilidad: {
      critico: 0.10,     // < 10% → rojo
      // >= 10% → verde
    },
    indiceCobrabilidad: {
      critico: 0.50,     // < 50% → rojo
      alerta: 0.75,     // 50-75% → amarillo
      // > 75% → verde
    },
    liquidez: {
      umbralCeroFlujo: 0.05, // Flujo_Caja / Ventas < 5% → advertencia
    },
    tendencia: {
      subioBien: 0.05,  // > +5% → verde
      bajo: -0.05,  // < -5% → rojo
    },
    proyeccion: {
      excelente: 1.20,   // Ventas_Proyectadas > PE * 1.20 → en camino
      ajustado: 1.10,   // entre PE y PE * 1.10 → zona de riesgo
    },
    concentracionMargen: {
      optimo: 5,  // 80% margen en > 5 tratamientos
      alerta: 3,  // 80% en 3 tratamientos
      // <= 2 → riesgo
    },
    estrellaPeligro: -0.10,   // Top 1 margen cae > -10%
    eficienciaAgenda: {
      participacionAlta: 0.20, // > 20% ventas
      margenPonderadoBajo: 0.05, // < 5% margen
    },
    equilibrioLejano: 10,  // Día equilibrio > día actual + 10
  },

  // ── Tooltips Educativos ────────────────────────────────────
  tooltips: {
    ventasTotales: {
      titulo: "Ventas Totales",
      texto: "Doctora, este es el total de lo que su clínica facturó en el período. Incluye todos los tratamientos realizados, cobrados o no. Es su punto de partida para cualquier análisis.",
    },
    utilidadOperativa: {
      titulo: "Utilidad Operativa",
      texto: "Es lo que le queda después de pagar todos los costos de la clínica: insumos, alquiler, sueldos y sus honorarios. Si es positiva, la clínica genera dinero. Si es negativa, está perdiendo.",
    },
    margenRentabilidad: {
      titulo: "Margen de Rentabilidad",
      texto: "Doctora, de cada peso que vende, ¿cuánto le queda realmente? Un margen del 20% significa que por cada $100 que cobra, $20 son ganancia neta. La meta mínima es superar el 10%.",
    },
    margenSeguridad: {
      titulo: "Margen de Seguridad",
      texto: "Doctora, este número indica qué tanto pueden caer sus ventas antes de que la clínica empiece a perder dinero. Un 20% es su red de seguridad: significa que puede perder el 20% de sus pacientes y aún así no entrar en pérdida.",
    },
    puntoEquilibrio: {
      titulo: "Punto de Equilibrio",
      texto: "Es el mínimo que debe facturar para cubrir todos sus costos sin ganar ni perder. Por debajo de este número, la clínica opera en pérdida. Por encima, empieza a generar utilidad.",
    },
    diaEquilibrio: {
      titulo: "Día de Equilibrio",
      texto: "Es la fecha del mes en que su clínica habrá cubierto todos sus costos fijos. Desde ese día en adelante, todo lo que facture es ganancia neta. Si ya lo superó, ¡felicitaciones!",
    },
    indiceCobrabilidad: {
      titulo: "Índice de Cobrabilidad",
      texto: "Mide qué porcentaje de lo que usted facturó ya entró efectivamente a la caja. Si es bajo, usted tiene 'ganancia en papel' pero no en el bolsillo. Un valor del 100% significaría que cobró todo lo que vendió.",
    },
    flujoCajaNeto: {
      titulo: "Flujo de Caja Neto",
      texto: "Es la diferencia entre el dinero real que entró a su cuenta y el que salió. A diferencia de la utilidad (que es contable), el flujo de caja es lo que realmente tiene disponible para gastar.",
    },
    honorariosLaura: {
      titulo: "Honorarios M. Laura",
      texto: "Doctora, este es el pago por su trabajo como odontóloga. No lo confunda con la ganancia de la clínica como empresa. La clínica debe generar utilidad ADEMÁS de pagarle su sueldo técnico.",
    },
    margenPonderado: {
      titulo: "Margen Ponderado",
      texto: "Doctora, esto indica cuánto de cada peso que gana la clínica viene específicamente de este tratamiento. Un tratamiento puede tener alto margen unitario pero bajo impacto si se vende poco.",
    },
    costoFijoDevengado: {
      titulo: "Costos Devengados",
      texto: "Aunque no haya pagado el alquiler ni los sueldos todavía, el tiempo que pasa genera una 'deuda invisible'. Este indicador muestra cuánto de sus costos fijos ya 'debe' proporcionalmente a los días transcurridos.",
    },
  },

  // ── Mensajes del Motor de Insights ────────────────────────
  insights: {
    // Menú 1
    ineficienciaOperativa: {
      emoji: "⚠️",
      titulo: "Ineficiencia Detectada",
      texto: "Sus ventas crecen más lento que sus costos fijos. El negocio se está volviendo más pesado de mantener.",
      tipo: "warning",
    },
    margenBajo: {
      emoji: "💡",
      titulo: "Sugerencia de Margen",
      texto: "La rentabilidad está por debajo del 10%. Revise el Menú 3 para identificar tratamientos con margen ponderado bajo que estén consumiendo tiempo de sillón.",
      tipo: "info",
    },
    calendarioFallido: {
      emoji: "❌",
      titulo: "Alerta de Calendario",
      texto: "Hemos superado el día previsto para el Punto de Equilibrio y aún no hay utilidad real. Riesgo alto de cerrar el mes en pérdida si no se acelera la facturación.",
      tipo: "danger",
    },
    // Menú 2
    trampaDePapel: {
      emoji: "⚠️",
      titulo: "La Trampa del Papel",
      texto: "Su clínica es rentable, pero su Índice de Cobrabilidad ({valor}) es muy bajo. Usted está financiando a sus pacientes con su propio capital.",
      tipo: "warning",
    },
    sostenibilidadDueno: {
      emoji: "💡",
      titulo: "Diagnóstico de Retiro",
      texto: "Sus honorarios actuales superan la utilidad que genera la clínica. La empresa no es autosuficiente sin su trabajo operativo; usted está 'comiéndose' el beneficio del negocio.",
      tipo: "info",
    },
    burnRate: {
      emoji: "❌",
      titulo: "Alerta de Salida de Caja",
      texto: "Este mes está saliendo más dinero del que entra. Revise sus fechas de pago a proveedores o acelere las gestiones de cobro de obras sociales.",
      tipo: "danger",
    },
    brechaPapelRealidad: (pct, ic) =>
      `Doctora, hoy existe una brecha del ${pct}% entre su ganancia y su efectivo. Esto se debe a que su Índice de Cobrabilidad es ${ic}%. Usted está 'prestando' su trabajo. Necesitamos acelerar los cobros o renegociar plazos con proveedores para cerrar esta brecha.`,
    // Menú 3
    alertaPrecios: (nombre, caida) => ({
      emoji: "⚠️",
      titulo: "Alerta de Precios",
      texto: `El tratamiento "${nombre}" mantiene sus ventas pero su margen cayó un ${caida}%. Diagnóstico: Sus costos de insumos subieron y usted no ha actualizado el precio al paciente.`,
      tipo: "warning",
    }),
    sillonineficiente: (nombre, participacion, margen) => ({
      emoji: "💡",
      titulo: "Optimización de Agenda",
      texto: `El tratamiento "${nombre}" representa el ${participacion}% de sus ventas pero solo el ${margen}% de su ganancia. Usted está ocupando mucho tiempo de clínica en un servicio que no es rentable.`,
      tipo: "info",
    }),
    estrellaPeligro: (nombre, caida) => ({
      emoji: "❌",
      titulo: "Alerta Comercial",
      texto: `Su principal generador de dinero ("${nombre}") ha caído un ${Math.abs(caida)}% en volumen este mes. Revise si hay competencia o si la tasa de aceptación de presupuestos bajó.`,
      tipo: "danger",
    }),
    // Menú 4
    alertaTendenciaPTD: (pct, monto) => ({
      emoji: "❌",
      titulo: "Alerta de Tendencia",
      texto: `A día de hoy, estamos un ${pct}% por debajo del rendimiento del mes pasado a esta misma fecha. Necesitamos recuperar $${monto} en la próxima semana para igualar el período anterior.`,
      tipo: "danger",
    }),
    semanaFloja: (semana) => ({
      emoji: "💡",
      titulo: "Optimización de Agenda",
      texto: `El Mapa de Calor muestra que la Semana ${semana} es históricamente la más floja. Sugerencia: Planifique campañas de reactivación de pacientes o cirugías de alto margen para cubrir los costos fijos de esos días.`,
      tipo: "info",
    }),
    equilibrioLejano: (dia, diasRestantes) => ({
      emoji: "⚠️",
      titulo: "Meta Lejana",
      texto: `El Punto de Equilibrio se proyecta para el día ${dia}. Solo tendremos ${diasRestantes} días de ganancia neta. Cualquier cancelación de turno en la última semana afectará directamente su utilidad operativa.`,
      tipo: "warning",
    }),
  },

  // ── Textos de Semáforo Global ──────────────────────────────
  statusBar: {
    critico: {
      label: "ESTADO: CRÍTICO",
      descripcion: "El Margen de Seguridad está por debajo del 10%. Acción inmediata requerida.",
    },
    precaucion: {
      label: "ESTADO: PRECAUCIÓN",
      descripcion: "El Margen de Seguridad está entre 10% y 20%. Monitoreo continuo recomendado.",
    },
    saludable: {
      label: "ESTADO: SALUDABLE",
      descripcion: "El Margen de Seguridad supera el 20%. La clínica opera con holgura financiera.",
    },
  },

  // ── Meses en Español (para Google Sheets) ─────────────────
  meses: [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ],

  // ── Navegación Bottom Bar ──────────────────────────────────
  nav: [
    { id: "signos", label: "Signos Vitales", icon: "Stethoscope" },
    { id: "finanzas", label: "Bolsillo/Papel", icon: "Wallet" },
    { id: "produccion", label: "Producción", icon: "BarChart2" },
    { id: "estrategia", label: "Estrategia", icon: "CalendarDays" },
  ],
};

export default APP_CONFIG;
