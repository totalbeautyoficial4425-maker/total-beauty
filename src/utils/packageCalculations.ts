import { Service, PackageItemBalance } from '../types';

export interface ServiceItemInput {
  serviceType: string;
  serviceName: string;
  totalQty: number;
  referencePrice?: number;
}

/**
 * Encontra o preço de referência individual cadastrado no Total Beauty
 */
export const findServiceReferencePrice = (
  serviceType: string,
  serviceName: string,
  servicesList: Service[]
): number => {
  const typeLower = (serviceType || '').toLowerCase().trim();
  const nameLower = (serviceName || '').toLowerCase().trim();

  // 1. Busca exata por nome
  const exact = servicesList.find(s => s.name.toLowerCase().trim() === nameLower);
  if (exact && exact.price > 0) return exact.price;

  // 2. Busca por categoria / tipo
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

  // 3. Busca parcial
  const partial = servicesList.find(s => 
    s.price > 0 && (
      s.name.toLowerCase().includes(typeLower) || 
      nameLower.includes(s.name.toLowerCase())
    )
  );
  if (partial) return partial.price;

  // Preços padrões de referência do setor caso não haja serviço correspondente
  if (typeLower === 'manicure' || nameLower.includes('mão')) return 30.00;
  if (typeLower === 'pedicure' || nameLower.includes('pé')) return 35.00;
  if (typeLower === 'escova') return 70.00;

  return 50.00;
};

/**
 * Calcula a distribuição proporcional do valor total do pacote entre os serviços
 * conforme a regra 1.1 do Total Beauty
 */
export const calculateProportionalPackagePrices = (
  totalPricePaid: number,
  items: ServiceItemInput[],
  servicesList: Service[]
): PackageItemBalance[] => {
  if (!items || items.length === 0) return [];

  // 1. Obter os preços de referência de cada item
  const itemsWithRef = items.map(it => {
    const refPrice = it.referencePrice !== undefined && it.referencePrice > 0
      ? it.referencePrice
      : findServiceReferencePrice(it.serviceType, it.serviceName, servicesList);
    const qty = Math.max(1, Number(it.totalQty) || 1);
    const subtotalRef = qty * refPrice;
    return {
      ...it,
      totalQty: qty,
      referencePrice: refPrice,
      subtotalRef,
    };
  });

  const totalReferenceValue = itemsWithRef.reduce((sum, i) => sum + i.subtotalRef, 0);

  // 2. Distribuir proporcionalmente com base no peso de referência
  let allocatedTotal = 0;
  const result: PackageItemBalance[] = itemsWithRef.map((it, idx) => {
    const weight = totalReferenceValue > 0 ? it.subtotalRef / totalReferenceValue : (1 / itemsWithRef.length);
    
    // Valor total do item
    let itemTotalValue = Math.round((totalPricePaid * weight) * 100) / 100;

    // Se for o último item, ajusta centavos para bater exatamente com totalPricePaid
    if (idx === itemsWithRef.length - 1) {
      itemTotalValue = Math.round((totalPricePaid - allocatedTotal) * 100) / 100;
    } else {
      allocatedTotal += itemTotalValue;
    }

    // Valor unitário por crédito
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

  return result;
};

/**
 * Calcula o abatimento financeiro da próxima utilização
 * com ajuste exato de centavos no último crédito do pacote
 */
export const calculateCreditAbatement = (
  totalRemainingCreditsBeforeDeduction: number,
  currentFinancialBalance: number,
  itemUnitPackagePrice: number | undefined
): { abatedAmount: number; nextFinancialBalance: number } => {
  // Se for o último crédito restante do pacote inteiro (créditos restantes = 1 antes de abater),
  // abate exatamente todo o saldo financeiro restante para zerar com precisão absoluta de centavos!
  if (totalRemainingCreditsBeforeDeduction <= 1) {
    const abated = Math.max(0, Math.round(currentFinancialBalance * 100) / 100);
    return {
      abatedAmount: abated,
      nextFinancialBalance: 0,
    };
  }

  // Caso normal: abate o valor proporcional unitário
  const standardUnit = (itemUnitPackagePrice !== undefined && itemUnitPackagePrice > 0)
    ? itemUnitPackagePrice
    : (currentFinancialBalance / totalRemainingCreditsBeforeDeduction);

  const abated = Math.min(
    Math.round(currentFinancialBalance * 100) / 100,
    Math.round(standardUnit * 100) / 100
  );

  const nextBalance = Math.max(0, Math.round((currentFinancialBalance - abated) * 100) / 100);

  return {
    abatedAmount: abated,
    nextFinancialBalance: nextBalance,
  };
};
