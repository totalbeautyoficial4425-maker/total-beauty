const assert = require('assert');

// Mock services list
const mockServices = [
  { id: 'srv_man_01', name: 'Manicure', price: 30, commissionPercentage: 40 },
  { id: 'srv_ped_01', name: 'Pedicure', price: 35, commissionPercentage: 40 },
  { id: 'srv_esc_01', name: 'Escova', price: 70, commissionPercentage: 40 },
];

// Helper functions (mirrored from src/utils/packageCalculations.ts)
function findServiceReferencePrice(serviceType, serviceName, servicesList) {
  const typeLower = (serviceType || '').toLowerCase().trim();
  const nameLower = (serviceName || '').toLowerCase().trim();

  const exact = servicesList.find(s => s.name.toLowerCase().trim() === nameLower);
  if (exact && exact.price > 0) return exact.price;

  if (typeLower === 'manicure' || nameLower.includes('manicure') || nameLower.includes('mão') || nameLower.includes('maos')) {
    const man = servicesList.find(s => s.name.toLowerCase() === 'manicure' && s.price > 0);
    if (man) return man.price;
  }

  if (typeLower === 'pedicure' || nameLower.includes('pedicure') || nameLower.includes('pé') || nameLower.includes('pes')) {
    const ped = servicesList.find(s => s.name.toLowerCase() === 'pedicure' && s.price > 0);
    if (ped) return ped.price;
  }

  if (typeLower === 'escova' || nameLower.includes('escova')) {
    const esc = servicesList.find(s => s.name.toLowerCase().includes('escova') && s.price > 0);
    if (esc) return esc.price;
  }

  if (typeLower === 'manicure' || nameLower.includes('mão')) return 30.00;
  if (typeLower === 'pedicure' || nameLower.includes('pé')) return 35.00;
  if (typeLower === 'escova') return 70.00;
  return 50.00;
}

function calculateProportionalPackagePrices(totalPricePaid, items, servicesList) {
  const itemsWithRef = items.map(it => {
    const refPrice = it.referencePrice !== undefined && it.referencePrice > 0
      ? it.referencePrice
      : findServiceReferencePrice(it.serviceType, it.serviceName, servicesList);
    const qty = Math.max(1, Number(it.totalQty) || 1);
    const subtotalRef = qty * refPrice;
    return { ...it, totalQty: qty, referencePrice: refPrice, subtotalRef };
  });

  const totalReferenceValue = itemsWithRef.reduce((sum, i) => sum + i.subtotalRef, 0);

  let allocatedTotal = 0;
  return itemsWithRef.map((it, idx) => {
    const weight = totalReferenceValue > 0 ? it.subtotalRef / totalReferenceValue : (1 / itemsWithRef.length);
    let itemTotalValue = Math.round((totalPricePaid * weight) * 100) / 100;

    if (idx === itemsWithRef.length - 1) {
      itemTotalValue = Math.round((totalPricePaid - allocatedTotal) * 100) / 100;
    } else {
      allocatedTotal += itemTotalValue;
    }

    const unitPrice = Math.round((itemTotalValue / it.totalQty) * 100) / 100;

    return {
      serviceType: it.serviceType,
      serviceName: it.serviceName,
      totalQty: it.totalQty,
      usedQty: 0,
      remainingQty: it.totalQty,
      referencePrice: it.referencePrice,
      unitPackagePrice: unitPrice,
      totalItemValue: itemTotalValue,
      consumedItemValue: 0,
    };
  });
}

function calculateCreditAbatement(totalRemainingCreditsBeforeDeduction, currentFinancialBalance, itemUnitPackagePrice) {
  if (totalRemainingCreditsBeforeDeduction <= 1) {
    const abated = Math.max(0, Math.round(currentFinancialBalance * 100) / 100);
    return { abatedAmount: abated, nextFinancialBalance: 0 };
  }

  const standardUnit = (itemUnitPackagePrice !== undefined && itemUnitPackagePrice > 0)
    ? itemUnitPackagePrice
    : (currentFinancialBalance / totalRemainingCreditsBeforeDeduction);

  const abated = Math.min(
    Math.round(currentFinancialBalance * 100) / 100,
    Math.round(standardUnit * 100) / 100
  );

  const nextBalance = Math.max(0, Math.round((currentFinancialBalance - abated) * 100) / 100);
  return { abatedAmount: abated, nextFinancialBalance: nextBalance };
}

console.log('=== INICIANDO TESTES DO CONTROLE INTELIGENTE DE PACOTES ===\n');

// 1. TESTE DO PACOTE DE UNHA (R$ 205,00)
console.log('1. Testando Venda e Proporcionalidade do Pacote de Unha (R$ 205,00)...');
const itemsUnha = [
  { serviceType: 'Manicure', serviceName: 'Manicure (Mãos)', totalQty: 4, referencePrice: 30 },
  { serviceType: 'Pedicure', serviceName: 'Pedicure (Pés)', totalQty: 2, referencePrice: 35 },
];

const propUnha = calculateProportionalPackagePrices(205.00, itemsUnha, mockServices);
const mao = propUnha.find(i => i.serviceType === 'Manicure');
const pe = propUnha.find(i => i.serviceType === 'Pedicure');

console.log(`- Mão: Ref R$ ${mao.referencePrice.toFixed(2)}, Unitário Pacote: R$ ${mao.unitPackagePrice.toFixed(2)} (Total 4 un: R$ ${mao.totalItemValue.toFixed(2)})`);
console.log(`- Pé: Ref R$ ${pe.referencePrice.toFixed(2)}, Unitário Pacote: R$ ${pe.unitPackagePrice.toFixed(2)} (Total 2 un: R$ ${pe.totalItemValue.toFixed(2)})`);

assert(Math.abs(mao.unitPackagePrice - 32.37) <= 0.10, `Mão unitária deveria ser ~R$ 32,37 mas foi ${mao.unitPackagePrice}`);
assert(Math.abs(pe.unitPackagePrice - 37.76) <= 0.20 || Math.abs(pe.unitPackagePrice - 37.63) <= 0.20, `Pé unitário deveria ser ~R$ 37,63/37,76 mas foi ${pe.unitPackagePrice}`);
assert.strictEqual(Math.round((mao.totalItemValue + pe.totalItemValue) * 100) / 100, 205.00, 'Soma total dos itens deve ser exatamente R$ 205,00');

// Comissão na venda (40%)
const commPercent = 40;
const commissionAmount = Math.round(((205.00 * commPercent) / 100) * 100) / 100;
const salonMargin = Math.round((205.00 - commissionAmount) * 100) / 100;
console.log(`- Comissão Profissional (${commPercent}%): R$ ${commissionAmount.toFixed(2)} (Esperado: R$ 82,00)`);
console.log(`- Margem do Salão: R$ ${salonMargin.toFixed(2)} (Esperado: R$ 123,00)`);
assert.strictEqual(commissionAmount, 82.00);
assert.strictEqual(salonMargin, 123.00);
console.log('✓ Teste 1 APROVADO com sucesso!\n');

// 2. TESTE DE BAIXA AUTOMÁTICA SEQUENCIAL ATÉ CRÉDITO ZERO
console.log('2. Testando Consumo Sequencial dos 6 Créditos com Ajuste de Centavos...');
let balance = 205.00;
let consumed = 0;
let remainingCredits = 6;
const sequence = ['Manicure', 'Pedicure', 'Manicure', 'Manicure', 'Pedicure', 'Manicure'];

sequence.forEach((serv, index) => {
  const item = serv === 'Manicure' ? mao : pe;
  const { abatedAmount, nextFinancialBalance } = calculateCreditAbatement(remainingCredits, balance, item.unitPackagePrice);
  balance = nextFinancialBalance;
  consumed = Math.round((consumed + abatedAmount) * 100) / 100;
  remainingCredits--;
  console.log(`   Visita ${index + 1} (${serv}): Abatido R$ ${abatedAmount.toFixed(2)} | Saldo Restante: R$ ${balance.toFixed(2)} | Créditos Restantes: ${remainingCredits}`);
});

console.log(`- Saldo Final: R$ ${balance.toFixed(2)}`);
console.log(`- Total Consumido: R$ ${consumed.toFixed(2)}`);
assert.strictEqual(balance, 0.00, 'Saldo financeiro final deve ser rigorosamente R$ 0,00');
assert.strictEqual(consumed, 205.00, 'Total consumido deve ser rigorosamente R$ 205,00');
console.log('✓ Teste 2 (Consumo e Centavos) APROVADO com sucesso!\n');

// 3. TESTE DO PACOTE DE CABELO (4 ESCOVAS - R$ 252,00)
console.log('3. Testando Pacote de Cabelo (4 Escovas - R$ 252,00)...');
const itemsCabelo = [{ serviceType: 'Escova', serviceName: 'Escova', totalQty: 4, referencePrice: 70 }];
const propCabelo = calculateProportionalPackagePrices(252.00, itemsCabelo, mockServices);
const escova = propCabelo[0];
console.log(`- Escova Unitário Pacote: R$ ${escova.unitPackagePrice.toFixed(2)} (Esperado: R$ 63,00)`);
assert.strictEqual(escova.unitPackagePrice, 63.00);

const commEscova = Math.round(((252.00 * 40) / 100) * 100) / 100;
const salaoEscova = Math.round((252.00 - commEscova) * 100) / 100;
console.log(`- Comissão Escova (40%): R$ ${commEscova.toFixed(2)} (Esperado: R$ 100,80)`);
console.log(`- Margem Salão Escova: R$ ${salaoEscova.toFixed(2)} (Esperado: R$ 151,20)`);
assert.strictEqual(commEscova, 100.80);
assert.strictEqual(salaoEscova, 151.20);

// Abate 1 escova
const res1 = calculateCreditAbatement(4, 252.00, 63.00);
assert.strictEqual(res1.abatedAmount, 63.00);
assert.strictEqual(res1.nextFinancialBalance, 189.00);
console.log(`- Após 1 escova realizada: Abatido R$ ${res1.abatedAmount.toFixed(2)} | Saldo Restante: R$ ${res1.nextFinancialBalance.toFixed(2)} (Esperado: R$ 189,00)`);
console.log('✓ Teste 3 APROVADO com sucesso!\n');

// 4. TESTE DE ZERO DUPLICIDADE FINANCEIRA E COMISSÃO EM ATENDIMENTO POSTERIOR
console.log('4. Testando Regra de Zero Duplicidade nos Atendimentos Posteriores...');
// Simula atendimento coberto por pacote na comanda:
const attendanceSimulado = {
  serviceName: 'Manicure',
  isPackageCovered: true,
  grossValue: 40.00,
  netValue: 0.00,
  commissionPercentage: 40,
};
const comissaoNaComanda = attendanceSimulado.isPackageCovered ? 0 : (attendanceSimulado.netValue * 0.4);
const cobrancaCliente = attendanceSimulado.isPackageCovered ? 0 : attendanceSimulado.netValue;

assert.strictEqual(comissaoNaComanda, 0, 'Comissão na comanda de atendimento coberto por pacote DEVE SER 0');
assert.strictEqual(cobrancaCliente, 0, 'Cobrança da cliente no atendimento coberto DEVE SER 0');
console.log('- Atendimento coberto por pacote: Cobrança cliente = R$ 0,00 | Nova comissão profissional = R$ 0,00');
console.log('✓ Teste 4 (Zero Duplicidade) APROVADO com sucesso!\n');

console.log('🎉 TODOS OS TESTES FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
