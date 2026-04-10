import fs from 'fs';

// Manual dotenv loading MUST happen before dynamic import
const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEq = trimmed.indexOf('=');
    if (firstEq === -1) return;
    const key = trimmed.substring(0, firstEq).trim();
    const value = trimmed.substring(firstEq + 1).trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n');
    process.env[key] = value;
  });
}

async function test() {
  // Dynamic import so it sees the process.env we just set
  const { getMonthlyKPIs } = await import('./lib/sheets.js');
  const { getSheetName } = await import('./lib/formatters.js');

  console.log('--- DEBUG: ENV CHECK ---');
  console.log('SHEET_ID value:', (process.env.GOOGLE_SHEET_ID || '').substring(0, 5) + '...');
  
  const year = 2026;
  const month = 3; // Abril

  const sheetsToFetch = [
    { name: getSheetName(year, month), label: 'Abril (Actual)' },
    { name: getSheetName(year, month - 1), label: 'Marzo (M-1)' },
    { name: getSheetName(year, month - 2), label: 'Febrero (M-2)' },
    { name: getSheetName(year, month - 3), label: 'Enero (M-3)' }
  ];

  console.log('--- RECOLECCIÓN DE DATOS REALES ---');
  for (const s of sheetsToFetch) {
    try {
      const data = await getMonthlyKPIs(s.name);
      console.log(`${s.label} [${s.name}]: B6=${data.ventasTotales}, B7=${data.costosFijosBase}, AB67=${data.ratioMargenReal}, B11=${data.utilidadOperativa}`);
    } catch (e) {
      console.log(`${s.label} [${s.name}]: ERROR: ${e.message}`);
    }
  }
}

test();
