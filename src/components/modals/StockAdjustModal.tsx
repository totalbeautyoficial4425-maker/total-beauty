import React, { useState } from 'react';
import { X, RefreshCw, Plus, Minus, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { InventoryItem } from '../../types';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const { adjustStock } = useData();

  const [type, setType] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const current = item.currentStock;
  let simulatedNext = current;
  if (type === 'entrada') {
    simulatedNext = current + (Math.abs(quantity) || 0);
  } else if (type === 'saida') {
    simulatedNext = Math.max(0, current - (Math.abs(quantity) || 0));
  } else if (type === 'ajuste') {
    simulatedNext = Math.max(0, quantity || 0);
  }

  const isLowStockNext = simulatedNext <= item.minStock;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (quantity < 0 || isNaN(quantity)) {
      setError('Informe uma quantidade válida.');
      return;
    }

    if (type !== 'ajuste' && quantity === 0) {
      setError('A quantidade movimentada deve ser maior que zero.');
      return;
    }

    const res = adjustStock(item.id, quantity, reason.trim() || undefined, type);
    if (!res.success) {
      setError(res.error || 'Erro ao movimentar estoque.');
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center border border-tb-rose-light shadow-2xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                Movimentar Estoque
              </h3>
              <p className="text-xs text-tb-gray-neutral truncate max-w-[220px]">
                {item.name}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Resume Pill */}
          <div className="p-3 rounded-2xl bg-tb-ivory/80 border border-tb-rose-light/40 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-tb-gray-neutral block uppercase tracking-wider font-semibold">
                Estoque Atual
              </span>
              <span className="font-bold text-sm text-tb-brown-dark">
                {item.currentStock} {item.unit}(s)
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-tb-gray-neutral block uppercase tracking-wider font-semibold">
                Mínimo de Alerta
              </span>
              <span className="font-bold text-xs text-amber-700">
                {item.minStock} {item.unit}(s)
              </span>
            </div>
          </div>

          {/* Operation Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1.5">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('entrada')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                  type === 'entrada'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                    : 'bg-tb-ivory text-tb-brown-soft border-tb-rose-light/40 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Entrada (+)
              </button>

              <button
                type="button"
                onClick={() => setType('saida')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                  type === 'saida'
                    ? 'bg-rose-500 text-white border-rose-600 shadow-2xs'
                    : 'bg-tb-ivory text-tb-brown-soft border-tb-rose-light/40 hover:bg-rose-50 hover:text-rose-700'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                Saída (-)
              </button>

              <button
                type="button"
                onClick={() => setType('ajuste')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                  type === 'ajuste'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                    : 'bg-tb-ivory text-tb-brown-soft border-tb-rose-light/40 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Balanço
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              {type === 'entrada' && 'Quantidade a Adicionar'}
              {type === 'saida' && 'Quantidade Utilizada / Consumida'}
              {type === 'ajuste' && 'Nova Quantidade Contada'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="1"
                required
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value, 10) || 0)}
                className="flex-1 text-base font-bold text-center py-2.5 px-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/20"
              />
              <span className="text-xs font-semibold text-tb-brown-soft py-2 px-3 bg-tb-ivory rounded-xl border border-tb-rose-light/40">
                {item.unit}(s)
              </span>
            </div>
          </div>

          {/* Result Preview Box */}
          <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
            isLowStockNext 
              ? 'bg-amber-50 border-amber-200 text-amber-800' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <span>Estoque após confirmação:</span>
            <span className="font-bold text-sm">
              {simulatedNext} {item.unit}(s)
              {isLowStockNext && ' ⚠️ (Abaixo do mínimo)'}
            </span>
          </div>

          {/* Motivo Opcional */}
          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Motivo / Observação (Opcional)
            </label>
            <input
              type="text"
              placeholder={
                type === 'entrada' ? 'Ex: Compra com representante Wella...' :
                type === 'saida' ? 'Ex: Consumo em mechas da cliente...' :
                'Ex: Contagem semanal de inventário...'
              }
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-tb-rose-light text-xs font-semibold text-tb-brown-dark hover:bg-tb-beige-light"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs font-semibold shadow-soft"
            >
              Confirmar Movimentação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
