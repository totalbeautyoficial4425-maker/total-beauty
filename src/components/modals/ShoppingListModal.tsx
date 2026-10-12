import React, { useState, useMemo } from 'react';
import { X, ShoppingCart, Copy, Check, Download, AlertTriangle, MessageCircle, Filter } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatBRL, downloadCSV, formatDateBR } from '../../utils/formatters';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { inventory } = useData();
  const [selectedBrand, setSelectedBrand] = useState<string>('todas');
  const [copied, setCopied] = useState(false);

  // Items requiring replenishment (currentStock <= minStock)
  const itemsToBuy = useMemo(() => {
    return inventory
      .filter(item => item.currentStock <= item.minStock)
      .filter(item => selectedBrand === 'todas' || item.brand.toLowerCase() === selectedBrand.toLowerCase())
      .map(item => {
        const suggestedQty = Math.max(1, (item.minStock * 2) - item.currentStock);
        const estCost = suggestedQty * (item.costPrice || 0);
        return {
          ...item,
          suggestedQty,
          estCost,
        };
      });
  }, [inventory, selectedBrand]);

  const totalEstCost = useMemo(() => {
    return itemsToBuy.reduce((sum, item) => sum + item.estCost, 0);
  }, [itemsToBuy]);

  const brandsAvailable = useMemo(() => {
    const set = new Set<string>();
    inventory.filter(i => i.currentStock <= i.minStock).forEach(i => set.add(i.brand));
    return Array.from(set);
  }, [inventory]);

  if (!isOpen) return null;

  // Format order message for WhatsApp
  const generateWhatsAppOrderText = (): string => {
    const today = new Date().toLocaleDateString('pt-BR');
    let text = `📋 *PEDIDO DE REPOSIÇÃO DE ESTOQUE — TOTAL BEAUTY*\n`;
    text += `📅 Data: ${today}\n`;
    if (selectedBrand !== 'todas') {
      text += `🏷️ Marca: *${selectedBrand.toUpperCase()}*\n`;
    }
    text += `\nOlá! Segue a relação de materiais que precisamos comprar novamente para reposição no salão:\n\n`;

    itemsToBuy.forEach((item, index) => {
      const urgency = item.currentStock === 0 ? '🔴 [ZERADO/URGENTE]' : '⚠️ [BAIXO ESTOQUE]';
      text += `${index + 1}. *${item.name}* (${item.brand})\n`;
      text += `   • Quantidade solicitada: *${item.suggestedQty} ${item.unit}(s)*\n`;
      text += `   • Estoque atual no salão: ${item.currentStock} ${item.unit}(s) ${urgency}\n\n`;
    });

    if (totalEstCost > 0) {
      text += `💰 *Valor estimado previsto:* ${formatBRL(totalEstCost)}\n\n`;
    }
    text += `Favor confirmar disponibilidade e prazo de entrega. Muito obrigada! ✨`;
    return text;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppOrderText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportCSV = () => {
    const headers = [
      'Produto',
      'Marca',
      'Categoria',
      'Estoque Atual',
      'Estoque Mínimo',
      'Qtd Sugerida Compra',
      'Unidade',
      'Custo Unitário (R$)',
      'Total Estimado (R$)',
      'Fornecedor'
    ];

    const rows = itemsToBuy.map(item => [
      item.name,
      item.brand,
      item.category,
      item.currentStock,
      item.minStock,
      item.suggestedQty,
      item.unit,
      (item.costPrice || 0).toFixed(2),
      item.estCost.toFixed(2),
      item.supplier || ''
    ]);

    downloadCSV(`lista_compras_total_beauty_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shadow-2xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                Lista de Compras & Reposição
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                {itemsToBuy.length} {itemsToBuy.length === 1 ? 'material precisa' : 'materiais precisam'} de reposição urgente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-tb-gray-neutral hover:text-tb-brown-dark rounded-xl hover:bg-tb-beige-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Top Actions & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tb-rose-light/30">
            {/* Filter by brand */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-tb-brown-soft">Filtrar Fornecedor/Marca:</span>
              <select
                value={selectedBrand}
                onChange={e => setSelectedBrand(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium"
              >
                <option value="todas">Todas as Marcas ({itemsToBuy.length})</option>
                {brandsAvailable.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Total Estimated Cost */}
            {totalEstCost > 0 && (
              <div className="text-xs text-right">
                <span className="text-tb-gray-neutral block text-[10px] uppercase font-bold">Investimento Estimado:</span>
                <span className="font-bold text-tb-rose-primary text-sm">{formatBRL(totalEstCost)}</span>
              </div>
            )}
          </div>

          {/* Items List */}
          {itemsToBuy.length === 0 ? (
            <div className="p-8 text-center bg-tb-ivory/60 rounded-2xl border border-tb-rose-light/40 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h4 className="font-bold text-tb-brown-dark text-sm">Estoque 100% em Dia!</h4>
              <p className="text-xs text-tb-gray-neutral max-w-sm mx-auto">
                Nenhum produto está abaixo do nível mínimo de reposição no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {itemsToBuy.map(item => {
                const isOutOfStock = item.currentStock === 0;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isOutOfStock
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isOutOfStock ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {isOutOfStock ? 'Esgotado (0)' : `Resta ${item.currentStock}`}
                        </span>
                        <p className="text-xs font-bold text-tb-brown-dark truncate">
                          {item.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-tb-brown-soft">
                        <span className="font-medium bg-tb-white px-2 py-0.5 rounded-md border border-tb-rose-light/40">
                          {item.brand}
                        </span>
                        <span>Mínimo: {item.minStock} {item.unit}(s)</span>
                        {item.costPrice ? (
                          <span className="text-tb-gray-neutral">Custo un: {formatBRL(item.costPrice)}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-tb-gray-neutral uppercase block font-semibold">Comprar:</span>
                      <span className="text-sm font-extrabold text-tb-brown-dark bg-tb-white px-2.5 py-1 rounded-xl border border-tb-rose-light/60 shadow-2xs">
                        +{item.suggestedQty} {item.unit}(s)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-tb-ivory border-t border-tb-rose-light/40 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleExportCSV}
            disabled={itemsToBuy.length === 0}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-tb-rose-light bg-tb-white hover:bg-tb-beige-light text-tb-brown-dark flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-tb-rose-primary" />
            Baixar CSV
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-transparent text-tb-brown-soft hover:bg-tb-beige-light transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleCopyWhatsApp}
              disabled={itemsToBuy.length === 0}
              className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-soft flex items-center gap-2 transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              } disabled:opacity-50`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Pedido Copiado!
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4" />
                  Copiar Pedido p/ WhatsApp
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
