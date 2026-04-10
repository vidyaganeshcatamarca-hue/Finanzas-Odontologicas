const fs = require('fs');
const path = require('path');

// Manual dotenv loading
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
  }
});

const { getMonthlyKPIs, getSheetName } = require('./lib/sheets');

async function test() {
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
      console.log(`${s.label} (${s.name}): B6=${data.ventasTotales}, B7=${data.costosFijosBase}, AB67=${data.ratioMargenReal}`);
    } catch (e) {
      console.log(`${s.label} (${s.name}): HOJA NO ENCONTRADA O ERROR: ${e.message}`);
    }
  }
  console.log('--- FIN ---');
}

test();
