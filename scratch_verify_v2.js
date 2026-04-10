const calcEstadoGlobal = (ms) => {
    const normalizePercent = (v) => {
        const num = Number(v);
        return Math.abs(num) >= 1 ? num / 100 : num;
    };
    const normalized = normalizePercent(ms);
    if (normalized < 0.10) return "critico";
    if (normalized <= 0.20) return "precaucion";
    return "saludable";
};

// Simulation for April 10 (Day 10)
const esMesActual = true;
const diaActual = 10;
const diasTotalesMes = 30;
const costoFijoReferencia = 1900000;
const ratioMargenReal = 0.2759;
const ventasActualesPTD = 9470000;

const peTotalMensual = ratioMargenReal > 0 ? costoFijoReferencia / ratioMargenReal : 0;
const peDinamico = esMesActual ? peTotalMensual * (diaActual / diasTotalesMes) : 1000000;
const msCalculado = (ventasActualesPTD - peDinamico) / ventasActualesPTD;

console.log("PE Total:", peTotalMensual);
console.log("PE Dinamico:", peDinamico);
console.log("MS Calculado:", msCalculado);
console.log("Estado Global:", calcEstadoGlobal(msCalculado));

// Simulation for Past Month (March)
const esMesActualPast = false;
const kpisMargenSeguridadPast = 0.08; // 8% in sheet
const msCalculadoPast = esMesActualPast ? 0.5 : kpisMargenSeguridadPast;
console.log("Estado Global Past (8%):", calcEstadoGlobal(msCalculadoPast));
