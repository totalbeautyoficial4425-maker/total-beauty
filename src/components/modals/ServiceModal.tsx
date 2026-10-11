import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Service, ServiceCategory } from '../../types';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceToEdit?: Service | null;
}

const CATEGORIES: { id: ServiceCategory; label: string }[] = [
  { id: 'cabelo', label: 'Cabelo' },
  { id: 'unhas', label: 'Unhas & Manicure' },
  { id: 'sobrancelhas', label: 'Sobrancelhas' },
  { id: 'cilios', label: 'Cílios' },
  { id: 'maquiagem', label: 'Maquiagem' },
  { id: 'estetica', label: 'Estética & Cuidados' },
  { id: 'outros', label: 'Outros' },
];

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  serviceToEdit,
}) => {
  const { addService, updateService } = useData();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('cabelo');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(50);
  const [isActive, setIsActive] = useState(true);
  const [internalNotes, setInternalNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (serviceToEdit) {
        setName(serviceToEdit.name);
        setCategory(serviceToEdit.category);
        setDescription(serviceToEdit.description);
        setPrice(serviceToEdit.price);
        setDurationMinutes(serviceToEdit.durationMinutes);
        setCommissionPercentage(serviceToEdit.commissionPercentage ?? 50);
        setIsActive(serviceToEdit.isActive);
        setInternalNotes(serviceToEdit.internalNotes || '');
      } else {
        setName('');
        setCategory('cabelo');
        setDescription('');
        setPrice(120);
        setDurationMinutes(60);
        setCommissionPercentage(50);
        setIsActive(true);
        setInternalNotes('');
      }
      setError(null);
    }
  }, [isOpen, serviceToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('O nome do serviço é obrigatório.');
      return;
    }
    if (price < 0 || isNaN(price)) {
      setError('Informe um valor de serviço válido.');
      return;
    }
    if (durationMinutes <= 0) {
      setError('A duração deve ser de pelo menos 5 minutos.');
      return;
    }

    if (serviceToEdit) {
      const res = updateService(serviceToEdit.id, {
        name: name.trim(),
        category,
        description: description.trim(),
        price,
        durationMinutes,
        commissionPercentage,
        isActive,
        internalNotes: internalNotes.trim(),
      });
      if (!res.success) {
        setError(res.error || 'Erro ao atualizar serviço.');
        return;
      }
    } else {
      const res = addService({
        name: name.trim(),
        category,
        description: description.trim(),
        price,
        durationMinutes,
        commissionPercentage,
        isActive,
        internalNotes: internalNotes.trim(),
      });
      if (!res.success) {
        setError(res.error || 'Erro ao criar serviço.');
        return;
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-tb-white rounded-2xl shadow-premium border border-tb-rose-light/50 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                {serviceToEdit ? 'Editar Serviço' : 'Novo Serviço no Catálogo'}
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                Defina o valor padrão, duração e categoria
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Nome do Serviço *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Escova Modelada com Nutrição Glow"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Categoria *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ServiceCategory)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Preço Padrão (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-tb-gray-neutral">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Duração Estimada (minutos) *
              </label>
              <input
                type="number"
                step="5"
                min="5"
                required
                value={durationMinutes}
                onChange={e => setDurationMinutes(parseInt(e.target.value) || 30)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                Comissão da Profissional (%) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  required
                  value={commissionPercentage}
                  onChange={e => setCommissionPercentage(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs sm:text-sm pl-3.5 pr-8 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary font-semibold"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-tb-gray-neutral font-bold">%</span>
              </div>
              <span className="text-[10px] text-tb-rose-primary font-semibold mt-1 block">
                Comissão: R$ {((price * commissionPercentage) / 100).toFixed(2)} por procedimento
              </span>
            </div>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-tb-brown-dark">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="rounded text-tb-rose-primary focus:ring-tb-rose-primary"
              />
              <span>Serviço ativo para novos agendamentos no catálogo</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Descrição para Clientes
            </label>
            <textarea
              rows={2}
              placeholder="Descreva as etapas ou produtos usados..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Notas Internas da Equipe (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Tempo de pausa obrigatório de 15min"
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-tb-rose-light/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-tb-brown-soft hover:text-tb-brown-dark rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs sm:text-sm font-semibold bg-tb-rose-primary hover:bg-[#b57f8c] text-white rounded-xl shadow-soft hover:shadow-premium transition-all"
            >
              {serviceToEdit ? 'Atualizar Serviço' : 'Cadastrar Serviço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
