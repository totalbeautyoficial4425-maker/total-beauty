import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

// Input file
const jsonPath = 'C:\\Users\\Total Beauty\\.gemini\\antigravity\\scratch\\total-beauty\\src\\data\\avecClients.json';
const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log(`Total de clientes carregados: ${rawData.length}`);

// Format phone helper
function formatPhone(phoneStr) {
  if (!phoneStr) return '';
  const digits = phoneStr.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
  } else if (digits.length === 8) {
    return `(34) ${digits.substring(0, 4)}-${digits.substring(4)}`;
  } else if (digits.length === 9) {
    return `(34) ${digits.substring(0, 5)}-${digits.substring(5)}`;
  }
  return phoneStr;
}

// Clean and sort clients
const sortedClients = rawData
  .map(c => {
    const rawName = (c.name || '').trim();
    const phone = (c.phone || c.whatsapp || '').trim();
    const formattedPhone = formatPhone(phone);
    return {
      Nome: rawName || 'Sem Nome Cadastrado',
      'Telefone / Celular': phone,
      'Telefone Formatado': formattedPhone,
      'Email': c.email || '',
      'Observações / Código': c.notes || ''
    };
  })
  .sort((a, b) => {
    return a.Nome.localeCompare(b.Nome, 'pt-BR', { sensitivity: 'base' });
  });

console.log(`Primeiros 5 clientes ordenados:`);
console.log(sortedClients.slice(0, 5));
console.log(`Últimos 5 clientes ordenados:`);
console.log(sortedClients.slice(-5));

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(sortedClients);

// Set column widths
ws['!cols'] = [
  { wch: 40 }, // Nome
  { wch: 20 }, // Telefone / Celular
  { wch: 22 }, // Telefone Formatado
  { wch: 30 }, // Email
  { wch: 25 }, // Observações
];

XLSX.utils.book_append_sheet(wb, ws, 'Clientes Avec');

// Target Directories
const targetDirs = [
  'C:\\Users\\Total Beauty\\Downloads\\Total Beauty - Clientes',
  'C:\\Users\\Total Beauty\\Documents\\Total Beauty - Clientes',
  'C:\\Users\\Total Beauty\\Downloads'
];

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Output Excel Files
const xlsxFileName = 'Clientes_Total_Beauty_Avec_Ordenados.xlsx';
const csvFileName = 'Clientes_Total_Beauty_Avec_Ordenados.csv';

targetDirs.forEach(dir => {
  const xlsxPath = path.join(dir, xlsxFileName);
  XLSX.writeFile(wb, xlsxPath);
  console.log(`Planilha Excel salva em: ${xlsxPath}`);
  
  // CSV UTF-8 with BOM for Excel compatibility
  const csvPath = path.join(dir, csvFileName);
  const csvContent = XLSX.utils.sheet_to_csv(ws);
  fs.writeFileSync(csvPath, '\ufeff' + csvContent, 'utf8');
  console.log(`Arquivo CSV salvo em: ${csvPath}`);
});

console.log('Finalizado com sucesso!');
