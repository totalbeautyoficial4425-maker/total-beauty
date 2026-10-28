import React, { useState, useMemo } from 'react';
import { X, Scale, Package, Plus, Trash2, AlertCircle, CheckCircle2, Search, Check } from 'lucide-react';
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
  const [isChangingProduct, setIsChangingProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [quantity, setQuantity] = useState<number>(30);
  const [unit, setUnit] = useState<'g' | 'ml' | 'un'>('g');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentConsumptions = attendance ? getConsumptionsByAttendance(attendance.id) : [];
  const selectedProduct = useMemo(() => {
    return inventory.find(i => i.id === selectedProductId);
  }, [inventory, selectedProductId]);

  // Unique categories from inventory
  const productCategories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [inventory]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return inventory.filter(item => {
      if (categoryFilter !== 'todas' && item.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [inventory, productSearch, categoryFilter]);

  if (!isOpen || !attendance) return null;

  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    setIsChangingProduct(false);
    setProductSearch('');
    const p = inventory.find(i => i.id === prodId);
    if (p?.unit.toLowerCase().includes('litro') || p?.unit.toLowerCase().includes('ml')) {
      setUnit('ml');
    } else if (p?.unit.toLowerCase().includes('un')) {
      setUnit('un');
    } else {
      setUnit('g');
    }
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedProductId || !selectedProduct) {
      setError('Por favor, pesquise e marque um produto do estoque.');
      return;
    }
    if (quantity <= 0 || isNaN(quantity)) {
      setError('Informe uma quantidade consumida válida maior que zero.');
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
      setIsChangingProduct(false);
      setQuantity(30);
      setTimeout(() => setSuccessMsg(null), 3500);
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

            {/* Confirmed Product or Search Box */}
            {selectedProduct && !isChangingProduct ? (
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 font-bold" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-tb-brown-dark flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{selectedProduct.name}</span>
                      <span className="text-[10px] bg-tb-rose-blush text-tb-rose-primary px-2 py-0.5 rounded-full font-bold shrink-0">
                        {selectedProduct.brand}
                      </span>
                    </div>
                    <div className="text-[11px] text-tb-gray-neutral mt-0.5">
                      Estoque disponível: <strong className="text-emerald-800">{selectedProduct.currentStock} {selectedProduct.unit}</strong> • {selectedProduct.category}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingProduct(true);
                    setProductSearch('');
                  }}
                  className="text-xs font-semibold text-tb-rose-primary hover:text-tb-rose-dark px-3 py-1.5 rounded-xl border border-tb-rose-light hover:bg-tb-white transition-colors shrink-0"
                >
                  Trocar Produto
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-tb-brown-dark">
                    Buscar e Marcar Produto do Estoque *
                  </label>
                  <span className="text-[10px] text-tb-gray-neutral">
                    {filteredProducts.length} disponíveis
                  </span>
                </div>

                {/* Search input with clear button */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-tb-gray-neutral pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou marca (ex: Lowell, Wella, Braé, Pó, Tinta)..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark font-medium focus:ring-2 focus:ring-tb-rose-primary/20"
                    autoFocus={isChangingProduct}
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-tb-gray-neutral hover:text-tb-brown-dark"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                {productCategories.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('todas')}
                      className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-colors ${
                        categoryFilter === 'todas'
                          ? 'bg-tb-rose-primary text-white font-bold'
                          : 'bg-tb-white text-tb-gray-neutral hover:bg-tb-beige-light border border-tb-rose-light/50'
                      }`}
                    >
                      Todas ({inventory.length})
                    </button>
                    {productCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg shrink-0 capitalize font-medium transition-colors ${
                          categoryFilter === cat
                            ? 'bg-tb-rose-primary text-white font-bold'
                            : 'bg-tb-white text-tb-gray-neutral hover:bg-tb-beige-light border border-tb-rose-light/50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {/* Clickable filtered list of products */}
                <div className="max-h-48 overflow-y-auto rounded-xl border border-tb-rose-light/60 bg-tb-white divide-y divide-tb-rose-light/30 shadow-xs">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-xs text-center text-tb-gray-neutral">
                      Nenhum produto encontrado com "{productSearch}".
                    </div>
                  ) : (
                    filteredProducts.slice(0, 40).map(p => {
                      const isCurrent = p.id === selectedProductId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProduct(p.id)}
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-tb-ivory transition-colors ${
                            isCurrent ? 'bg-emerald-50/70 font-semibold' : ''
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-bold text-tb-brown-dark flex items-center gap-1.5">
                              <span className="truncate">{p.name}</span>
                              <span className="text-[10px] text-tb-gray-neutral font-normal shrink-0">({p.brand})</span>
                            </div>
                            <div className="text-[11px] text-tb-gray-neutral">
                              Estoque: <strong className="text-tb-brown-dark">{p.currentStock} {p.unit}</strong> • {p.category}
                            </div>
                          </div>
                          {isCurrent ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                              <Check className="w-3 h-3" /> Marcado
                            </span>
                          ) : (
                            <span className="text-[10px] text-tb-rose-primary hover:underline font-semibold shrink-0">
                              Marcar
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedProduct && isChangingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingProduct(false);
                      setProductSearch('');
                    }}
                    className="text-xs text-tb-gray-neutral hover:text-tb-brown-dark underline"
                  >
                    Cancelar troca e manter {selectedProduct.name}
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
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
                  disabled={!selectedProductId}
                  className="w-full py-2 px-4 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-soft transition-all flex items-center justify-center gap-1.5"
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
