import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Save, Tag } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { InventoryItem, InventoryCategory } from '../../types';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: InventoryItem | null;
}

const PRESET_BRANDS = [
  'Wella',
  'Lowell',
  'Erick Kenedy',
  'Truss',
  'Cadiveu',
  'Braé',
  'L\'Oréal',
  'Schwarzkopf',
  'Senscience',
  'Kérastase',
  'Haskell',
  'Outra',
];

const PRESET_CATEGORIES: InventoryCategory[] = [
  'Tintas & Colorações',
  'Pó Descolorante',
  'Água Oxigenada',
  'Hidratações & Máscaras',
  'Shampoos',
  'Condicionadores',
  'Progressivas & Alinhamentos',
  'Finalizadores & Óleos',
  'Esmaltes & Manicure',
  'Descartáveis & Higiene',
  'Outros',
];

const PRESET_UNITS = [
  { value: 'tubo', label: 'Tubo(s)' },
  { value: 'frasco', label: 'Frasco(s)' },
  { value: 'pote', label: 'Pote(s)' },
  { value: 'un', label: 'Unidade(s)' },
  { value: 'litro', label: 'Litro(s)' },
  { value: 'kg', label: 'Quilo(s)' },
  { value: 'cx', label: 'Caixa(s)' },
  { value: 'pct', label: 'Pacote(s)' },
];

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  itemToEdit,
}) => {
  const { addInventoryItem, updateInventoryItem } = useData();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Wella');
  const [customBrand, setCustomBrand] = useState('');
  const [category, setCategory] = useState<string>('Tintas & Colorações');
  const [customCategory, setCustomCategory] = useState('');
  const [currentStock, setCurrentStock] = useState<number>(1);
  const [minStock, setMinStock] = useState<number>(2);
  const [unit, setUnit] = useState<string>('tubo');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [supplier, setSupplier] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setName(itemToEdit.name);
        
        // Brand logic
        if (PRESET_BRANDS.includes(itemToEdit.brand)) {
          setBrand(itemToEdit.brand);
          setCustomBrand('');
        } else {
          setBrand('Outra');
          setCustomBrand(itemToEdit.brand);
        }

        // Category logic
        if (PRESET_CATEGORIES.includes(itemToEdit.category)) {
          setCategory(itemToEdit.category);
          setCustomCategory('');
        } else {
          setCategory('Outros');
          setCustomCategory(itemToEdit.category);
        }

        setCurrentStock(itemToEdit.currentStock);
        setMinStock(itemToEdit.minStock);
        setUnit(itemToEdit.unit || 'un');
        setCostPrice(itemToEdit.costPrice || 0);
        setSupplier(itemToEdit.supplier || '');
        setLocation(itemToEdit.location || '');
        setNotes(itemToEdit.notes || '');
      } else {
        setName('');
        setBrand('Wella');
        setCustomBrand('');
        setCategory('Tintas & Colorações');
        setCustomCategory('');
        setCurrentStock(2);
        setMinStock(2);
        setUnit('tubo');
        setCostPrice(0);
        setSupplier('');
        setLocation('');
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, itemToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('O nome do material ou produto é obrigatório.');
      return;
    }

    const finalBrand = (brand === 'Outra' ? customBrand : brand).trim();
    if (!finalBrand) {
      setError('Por favor, informe a marca do produto.');
      return;
    }

    const finalCategory = (category === 'Outros' && customCategory.trim() ? customCategory : category).trim();

    if (currentStock < 0 || isNaN(currentStock)) {
      setError('A quantidade em estoque não pode ser negativa.');
      return;
    }

    if (minStock < 0 || isNaN(minStock)) {
      setError('O estoque mínimo para alerta deve ser zero ou maior.');
      return;
    }

    const itemPayload = {
      name: name.trim(),
      brand: finalBrand,
      category: finalCategory,
      currentStock: Number(currentStock),
      minStock: Number(minStock),
      unit: unit.trim() || 'un',
      costPrice: costPrice > 0 ? Number(costPrice) : undefined,
      supplier: supplier.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (itemToEdit) {
      const res = updateInventoryItem(itemToEdit.id, itemPayload);
      if (!res.success) {
        setError(res.error || 'Erro ao atualizar item do estoque.');
        return;
      }
    } else {
      const res = addInventoryItem(itemPayload);
      if (!res.success) {
        setError(res.error || 'Erro ao cadastrar produto no estoque.');
        return;
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center border border-tb-rose-light shadow-2xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                {itemToEdit ? 'Editar Produto do Estoque' : 'Novo Produto / Material'}
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                {itemToEdit 
                  ? 'Atualize a quantidade, marca ou estoque mínimo para alertas' 
                  : 'Cadastre tintas, pós, oxigenadas, hidratações, progressivas e mais'}
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

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome do Produto */}
          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Nome do Produto / Descrição <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Color Perfect 7.1 Louro Acinzentado 60g, Pó Descolorante Blondor 800g..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/20"
            />
          </div>

          {/* Marca e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Marca */}
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Marca <span className="text-rose-500">*</span>
              </label>
              <select
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/20"
              >
                {PRESET_BRANDS.map(b => (
                  <option key={b} value={b}>
                    {b === 'Lowell' ? '★ Lowell' : b === 'Wella' ? '★ Wella' : b === 'Erick Kenedy' ? '★ Erick Kenedy' : b}
                  </option>
                ))}
              </select>
              {brand === 'Outra' && (
                <input
                  type="text"
                  placeholder="Digite o nome da marca..."
                  value={customBrand}
                  onChange={e => setCustomBrand(e.target.value)}
                  className="w-full mt-2 text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark"
                />
              )}
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Categoria do Produto <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/20"
              >
                {PRESET_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {category === 'Outros' && (
                <input
                  type="text"
                  placeholder="Especifique a categoria..."
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  className="w-full mt-2 text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark"
                />
              )}
            </div>
          </div>

          {/* Quantidade Atual, Estoque Mínimo e Unidade */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Quantidade Atual <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={currentStock}
                onChange={e => setCurrentStock(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-bold text-center"
              />
              <span className="text-[10px] text-tb-gray-neutral block mt-0.5 text-center">No salão hoje</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1 flex items-center justify-between">
                <span>Estoque Mínimo</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={minStock}
                onChange={e => setMinStock(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-bold text-center text-amber-700"
              />
              <span className="text-[10px] text-amber-600 block mt-0.5 text-center font-medium">Alerta p/ comprar</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Unidade
              </label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full text-xs px-2.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
              >
                {PRESET_UNITS.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
              <span className="text-[10px] text-tb-gray-neutral block mt-0.5 text-center">Tipo de embalagem</span>
            </div>
          </div>

          {/* Preço de Custo e Localização */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Preço de Custo Unitário (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-tb-gray-neutral font-medium">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={costPrice || ''}
                  onChange={e => setCostPrice(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
                />
              </div>
              <span className="text-[10px] text-tb-gray-neutral mt-0.5 block">Para controle do valor investido</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Local de Armazenamento
              </label>
              <input
                type="text"
                placeholder="Ex: Armário 1, Lavatório, Prateleira Química..."
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
              />
              <span className="text-[10px] text-tb-gray-neutral mt-0.5 block">Onde o material fica guardado</span>
            </div>
          </div>

          {/* Fornecedor / Representante */}
          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Fornecedor / Representante Comercial
            </label>
            <input
              type="text"
              placeholder="Ex: Distribuidora Oficial Wella, Representante Lowell..."
              value={supplier}
              onChange={e => setSupplier(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
            />
          </div>

          {/* Observações / Notas */}
          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Observações / Instruções do Produto
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Utilizar preferencialmente para mechas platinadas, diluição 1:2..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/20"
            />
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-3 border-t border-tb-rose-light/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-tb-rose-light hover:bg-tb-beige-light text-xs font-semibold text-tb-brown-dark transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs font-semibold shadow-soft flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              {itemToEdit ? 'Salvar Alterações' : 'Cadastrar no Estoque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
