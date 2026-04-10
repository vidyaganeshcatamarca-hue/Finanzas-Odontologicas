async function check() {
    const res = await fetch("http://localhost:3000/api/sheets?type=kpis&year=2026&month=3"); // April
    const data = await res.json();
    console.log("APRIL DATA:");
    console.log("Ventas Totales:", data.ventasTotales);
    console.log("Costo Fijo Promedio:", data.costoFijoPromedio);
    console.log("Ratio Margen Real (B117?):", data.ratioMargenReal);
    console.log("PE (Sheet B16):", data.puntoEquilibrio);
}
check();
