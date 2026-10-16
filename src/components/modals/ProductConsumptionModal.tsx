import React, { useState } from 'react';
import { X, Scale, Package, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Attendance } from '../../types';

interface ProductConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: Attendance | null;
}

export const ProductConsumptionModal: React.FC<ProductConsumptionModalProps> = ({
  isOpen,
  onClose,
  attendance,
}) => {
  const { 
    inventory, 
    addConsumption, 
    deleteConsumption, 
    getConsumptionsByAttendance 
  } = useData();

  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(30);
  const [unit, setUnit] = useState<'g' | 'ml' | 'un'>('g');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !attendance) return null;

  const currentConsumptions = getConsumptionsByAttendance(attendance.id);
  const selectedProduct = inventory.find(i => i.id === selectedProductId);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedProductId) {
      setError('Selecione um produto do estoque.');
      return;
    }
    if (quantity <= 0 || isNaN(quantity)) {
      setError('Informe uma quantidade consumida válida maior que zero.');
      return;
    }

    if (!selectedProduct) {
      setError('Produto não encontrado.');
      return;
    }

    const res = addConsumption({
      attendanceId: attendance.id,
      appointmentId: attendance.appointmentId,
      clientId: attendance.clientId,
      clientName: attendance.clientName,
      serviceId: attendance.serviceId,
      serviceName: attendance.serviceName,
      professionalId: attendance.professionalId,
      professionalName: attendance.professionalName,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity,
      unit,
      date: attendance.date,
    });

    if (!res.success) {
      setError(res.error || 'Erro ao registrar consumo.');
    } else {
      setSuccessMsg(`Consumo de ${quantity}${unit} de ${selectedProduct.name} registrado com sucesso!`);
      setSelectedProductId('');
      setQuantity(30);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleRemove = (id: string) => {
    if (window.confirm('Deseja estornar esse consumo e devolver a quantidade ao estoque?')) {
      deleteConsumption(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                Consumo de Produtos & Gramatura
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                {attendance.clientName} • {attendance.serviceName} ({attendance.professionalName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-tb-gray-neutral hover:text-tb-brown-dark rounded-lg hover:bg-tb-beige-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form to add consumption */}
          <form onSubmit={handleAddProduct} className="p-4 bg-tb-ivory rounded-2xl border border-tb-rose-light/60 space-y-3">
            <h4 className="text-xs font-bold text-tb-brown-dark flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-tb-rose-primary" />
              Lançar Produto Utilizado
            </h4>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Produto do Estoque *
              </label>
              <select
                value={selectedProductId}
                onChange={e => {
                  setSelectedProductId(e.target.value);
                  const p = inventory.find(i => i.id === e.target.value);
                  if (p?.unit.toLowerCase().includes('litro') || p?.unit.toLowerCase().includes('ml')) {
                    setUnit('ml');
                  } else {
                    setUnit('g');
                  }
                }}
                required
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark"
              >
                <option value="">Selecione o produto utilizado...</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.brand} (Estoque: {item.currentStock} {item.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                  Quantidade Consumida *
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={quantity}
                    onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark"
                  />
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as any)}
                    className="text-xs px-2 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark font-semibold"
                  >
                    <option value="g">gramas (g)</option>
                    <option value="ml">ml</option>
                    <option value="un">unidades</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs font-semibold shadow-soft transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Salvar Consumo
                </button>
              </div>
            </div>

            {selectedProduct && (
              <p className="text-[11px] text-tb-gray-neutral mt-1">
                Estoque atual de {selectedProduct.name}: <span className="font-semibold text-tb-brown-dark">{selectedProduct.currentStock} {selectedProduct.unit}</span>. A baixa no estoque será realizada automaticamente.
              </p>
            )}
          </form>

          {/* List of registered consumptions for this attendance */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-tb-brown-dark flex items-center justify-between">
              <span>Produtos Registrados Neste Atendimento</span>
              <span className="text-[10px] text-tb-gray-neutral">
                {currentConsumptions.length} item(ns)
              </span>
            </h4>

            {currentConsumptions.length === 0 ? (
              <p className="text-xs text-tb-gray-neutral p-4 text-center bg-tb-ivory/50 rounded-xl border border-tb-rose-light/30">
                Nenhum produto registrado para este atendimento ainda.
              </p>
            ) : (
              <div className="space-y-1.5">
                {currentConsumptions.map(con => (
                  <div
                    key={con.id}
                    className="p-3 rounded-xl bg-tb-ivory border border-tb-rose-light/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-tb-brown-dark block">
                        {con.productName}
                      </span>
                      <span className="text-[11px] text-tb-rose-primary font-semibold">
                        Consumo: {con.quantity} {con.unit}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(con.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Estornar consumo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-tb-ivory border-t border-tb-rose-light/40 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-tb-brown-dark text-white text-xs font-semibold hover:bg-black transition-colors"
          >
            Concluir Registro
          </button>
        </div>
      </div>
    </div>
  );
};
