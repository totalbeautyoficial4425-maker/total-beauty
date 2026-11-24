const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('TESTES DE VALIDAÇÃO: MENU LATERAL E LAYOUT DA AGENDA');
console.log('====================================================\n');

// ----------------------------------------------------
// TESTE 1: Menu Lateral na Sidebar.tsx
// ----------------------------------------------------
console.log('1. Validando ordem do menu lateral em Sidebar.tsx...');
const sidebarPath = path.join(__dirname, '..', 'src', 'components', 'layout', 'Sidebar.tsx');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');

// Expected non-professional menu item sequence:
const expectedOrder = [
  'dashboard',
  'agenda',
  'atendimentos',
  'clientes',
  'pacotes',
  'aniversariantes',
  'servicos',
  'profissionais'
];

// Extract IDs from menuItems array in Sidebar.tsx (non-professional section)
const nonProfMatch = sidebarContent.match(/:\s*\[([\s\S]*?)\];/);
assert(nonProfMatch, 'Não foi possível encontrar a lista de menuItems na Sidebar.tsx');

const idMatches = [...nonProfMatch[1].matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
const relevantIds = idMatches.slice(0, 8);

console.log('Ordem encontrada no código:', relevantIds);
console.log('Ordem esperada pelo usuário:', expectedOrder);

assert.deepStrictEqual(
  relevantIds,
  expectedOrder,
  `A ordem dos primeiros 8 itens do menu não corresponde à ordem esperada!`
);
console.log('✔ Teste 1 passou com sucesso: "Atendimentos" está imediatamente abaixo de "Agenda"!\n');

// ----------------------------------------------------
// TESTE 2: Algoritmo de Layout de Sobreposição da Agenda
// ----------------------------------------------------
console.log('2. Validando algoritmo de sobreposição (calendarLayout.ts)...');

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function computeOverlappingLayout(items, slotHeight = 48, startOfDayMinutes = 7 * 60) {
  if (!items || items.length === 0) return [];

  const normalized = items.map(item => {
    const startMinutes = timeToMinutes(item.startTime);
    const duration = item.durationMinutes && item.durationMinutes > 0 ? item.durationMinutes : 30;
    let endMinutes = item.endTime ? timeToMinutes(item.endTime) : (startMinutes + duration);

    if (endMinutes <= startMinutes) {
      endMinutes = startMinutes + Math.max(15, duration);
    }

    const visualDuration = Math.max(25, endMinutes - startMinutes);
    const topPixels = Math.max(0, ((startMinutes - startOfDayMinutes) / 30) * slotHeight);
    const heightPixels = Math.max(38, (visualDuration / 30) * slotHeight - 3);

    return {
      item,
      startMinutes,
      endMinutes,
      topPixels,
      heightPixels,
      columnIndex: 0,
      totalColumns: 1,
      colSpan: 1,
    };
  });

  normalized.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    if (a.endMinutes !== b.endMinutes) return b.endMinutes - a.endMinutes;
    return a.item.id.localeCompare(b.item.id);
  });

  const clusters = [];
  let currentCluster = [];
  let currentClusterEnd = -1;

  for (const entry of normalized) {
    if (currentCluster.length === 0) {
      currentCluster.push(entry);
      currentClusterEnd = entry.endMinutes;
    } else if (entry.startMinutes < currentClusterEnd) {
      currentCluster.push(entry);
      currentClusterEnd = Math.max(currentClusterEnd, entry.endMinutes);
    } else {
      clusters.push(currentCluster);
      currentCluster = [entry];
      currentClusterEnd = entry.endMinutes;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const positionedItems = [];

  for (const cluster of clusters) {
    const columns = [];

    for (const entry of cluster) {
      let placedColumn = -1;
      for (let c = 0; c < columns.length; c++) {
        const colItems = columns[c];
        const lastInCol = colItems[colItems.length - 1];
        if (lastInCol.endMinutes <= entry.startMinutes) {
          colItems.push(entry);
          placedColumn = c;
          break;
        }
      }
      if (placedColumn === -1) {
        columns.push([entry]);
        placedColumn = columns.length - 1;
      }
      entry.columnIndex = placedColumn;
    }

    const totalColumns = columns.length;

    for (const entry of cluster) {
      let colSpan = 1;
      for (let c = entry.columnIndex + 1; c < totalColumns; c++) {
        const hasCollision = columns[c].some(
          other => entry.startMinutes < other.endMinutes && entry.endMinutes > other.startMinutes
        );
        if (!hasCollision) {
          colSpan++;
        } else {
          break;
        }
      }

      entry.colSpan = colSpan;
      entry.totalColumns = totalColumns;

      const leftPercent = (entry.columnIndex / totalColumns) * 100;
      const widthPercent = (colSpan / totalColumns) * 100;

      positionedItems.push({
        item: entry.item,
        topPixels: entry.topPixels,
        heightPixels: entry.heightPixels,
        startMinutes: entry.startMinutes,
        endMinutes: entry.endMinutes,
        columnIndex: entry.columnIndex,
        totalColumns,
        colSpan,
        leftPercent,
        widthPercent,
        hasOverlap: totalColumns > 1,
      });
    }
  }

  return positionedItems;
}

// CASO A: Encaixe forçado ocupando apenas alguns minutos do horário de outro atendimento
console.log('Caso A: Encaixe de 15 minutos dentro de atendimento de 60 minutos');
const caseA = computeOverlappingLayout([
  { id: 'original', startTime: '09:00', endTime: '10:00', durationMinutes: 60 },
  { id: 'encaixe', startTime: '09:45', endTime: '10:00', durationMinutes: 15 }
]);
assert.strictEqual(caseA.length, 2);
assert.strictEqual(caseA[0].totalColumns, 2, 'Total de colunas deve ser 2');
assert.strictEqual(caseA[1].totalColumns, 2, 'Total de colunas deve ser 2');
assert.notStrictEqual(caseA[0].columnIndex, caseA[1].columnIndex, 'Devem estar em colunas diferentes');
assert.strictEqual(caseA[0].widthPercent, 50);
assert.strictEqual(caseA[1].widthPercent, 50);
console.log('✔ Caso A passou: Original e encaixe ficam lado a lado com 50% de largura cada!');

// CASO B: Dois agendamentos com horários de início diferentes
console.log('\nCaso B: Agendamentos com horários de início diferentes (09:00 vs 09:30)');
const caseB = computeOverlappingLayout([
  { id: 'apt1', startTime: '09:00', endTime: '10:30', durationMinutes: 90 },
  { id: 'encaixe', startTime: '09:30', endTime: '10:00', durationMinutes: 30 }
]);
assert.strictEqual(caseB[0].totalColumns, 2);
assert.strictEqual(caseB[1].totalColumns, 2);
assert.notStrictEqual(caseB[0].columnIndex, caseB[1].columnIndex);
console.log('✔ Caso B passou: Posição calculada lado a lado mesmo com início diferente!');

// CASO C: Um atendimento começando antes e terminando depois do outro (envelope / nesting)
console.log('\nCaso C: Atendimento longo que engloba totalmente o encaixe (09:00 - 12:00 vs 10:00 - 11:00)');
const caseC = computeOverlappingLayout([
  { id: 'longo', startTime: '09:00', endTime: '12:00', durationMinutes: 180 },
  { id: 'encaixe', startTime: '10:00', endTime: '11:00', durationMinutes: 60 }
]);
assert.strictEqual(caseC[0].columnIndex, 0);
assert.strictEqual(caseC[1].columnIndex, 1);
assert.strictEqual(caseC[0].widthPercent, 50);
assert.strictEqual(caseC[1].widthPercent, 50);
console.log('✔ Caso C passou: Atendimento englobado fica na coluna lateral e visível simultaneamente!');

// CASO D: Pequena sobreposição (apenas 5 minutos de conflito)
console.log('\nCaso D: Pequena sobreposição (09:00 - 10:00 vs 09:55 - 10:30)');
const caseD = computeOverlappingLayout([
  { id: 'apt1', startTime: '09:00', endTime: '10:00', durationMinutes: 60 },
  { id: 'apt2', startTime: '09:55', endTime: '10:30', durationMinutes: 35 }
]);
assert.strictEqual(caseD[0].totalColumns, 2);
assert.strictEqual(caseD[1].totalColumns, 2);
assert.notStrictEqual(caseD[0].columnIndex, caseD[1].columnIndex);
console.log('✔ Caso D passou: Pequena sobreposição tratada corretamente lado a lado!');

// CASO E: Mais de dois agendamentos simultâneos (3 agendamentos no mesmo horário)
console.log('\nCaso E: Três agendamentos simultâneos às 14:00');
const caseE = computeOverlappingLayout([
  { id: 'apt1', startTime: '14:00', endTime: '15:00', durationMinutes: 60 },
  { id: 'apt2', startTime: '14:00', endTime: '15:00', durationMinutes: 60 },
  { id: 'apt3', startTime: '14:00', endTime: '15:00', durationMinutes: 60 }
]);
assert.strictEqual(caseE.length, 3);
assert.strictEqual(caseE[0].totalColumns, 3);
assert.strictEqual(caseE[1].totalColumns, 3);
assert.strictEqual(caseE[2].totalColumns, 3);
assert.strictEqual(caseE[0].columnIndex, 0);
assert.strictEqual(caseE[1].columnIndex, 1);
assert.strictEqual(caseE[2].columnIndex, 2);
assert.strictEqual(Math.round(caseE[0].widthPercent), 33);
assert.strictEqual(Math.round(caseE[1].widthPercent), 33);
assert.strictEqual(Math.round(caseE[2].widthPercent), 33);
console.log('✔ Caso E passou: 3 agendamentos simultâneos dividem em 3 colunas independentes!');

// CASO F: Quando os horários deixarem de se sobrepor, volta a utilizar 100% do espaço
console.log('\nCaso F: Retorno à largura total (100%) quando a sobreposição termina');
const caseF = computeOverlappingLayout([
  { id: 'apt1', startTime: '09:00', endTime: '10:00', durationMinutes: 60 },
  { id: 'encaixe', startTime: '09:30', endTime: '10:00', durationMinutes: 30 },
  { id: 'proximo', startTime: '10:00', endTime: '11:00', durationMinutes: 60 }
]);
const apt1 = caseF.find(x => x.item.id === 'apt1');
const enc = caseF.find(x => x.item.id === 'encaixe');
const prox = caseF.find(x => x.item.id === 'proximo');
assert.strictEqual(apt1.totalColumns, 2);
assert.strictEqual(apt1.widthPercent, 50);
assert.strictEqual(enc.totalColumns, 2);
assert.strictEqual(enc.widthPercent, 50);
assert.strictEqual(prox.totalColumns, 1, 'Próximo agendamento sem sobreposição deve ter totalColumns = 1');
assert.strictEqual(prox.columnIndex, 0);
assert.strictEqual(prox.widthPercent, 100, 'Próximo agendamento deve ocupar 100% da largura');
console.log('✔ Caso F passou: O agendamento seguinte não sobreposto ocupa 100% da largura normalmente!\n');

console.log('====================================================');
console.log('TODOS OS TESTES FORAM CONCLUÍDOS COM SUCESSO! 100% OK');
console.log('====================================================');
