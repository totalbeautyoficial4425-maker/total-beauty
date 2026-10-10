import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  Plus, 
  Clock, 
  DollarSign, 
  Edit, 
  CheckCircle, 
  XCircle, 
  Scissors, 
  Filter,
  EyeOff
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Service, ServiceCategory } from '../types';
import { formatBRL } from '../utils/formatters';

interface ServicosPageProps {
  onOpenNewService: () => void;
  onEditService: (service: Service) => void;
}

const CATEGORY_NAMES: Record<string, string> = {
  cabelo: 'Cabelos & Terapias',
  unhas: 'Unhas & Spa dos Pés',
  sobrancelhas: 'Design de Sobrancelhas',
  cilios: 'Extensão de Cílios',
  maquiagem: 'Maquiagem & Visagismo',
  estetica: 'Estética & Cuidados Faciais',
  outros: 'Outros Procedimentos',
};

export const ServicosPage: React.FC<ServicosPageProps> = ({
  onOpenNewService,
  onEditService,
}) => {
  const { services, toggleServiceActive } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      if (selectedCategory !== 'todas' && s.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [services, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header Card */}
      <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-tb-rose-primary block mb-1">
            Catálogo Oficial
          </span>
          <h2 className="font-serif-brand text-3xl font-bold text-tb-brown-dark">
            Serviços & Procedimentos
          </h2>
          <p className="text-xs text-tb-gray-neutral mt-1">
            Gerencie preços padrão, durações estimadas e disponibilidade de agendamento.
          </p>
        </div>

        <button
          onClick={onOpenNewService}
          className="px-5 py-2.5 rounded-2xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-premium transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Adicionar Serviço
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-tb-white rounded-2xl p-4 border border-tb-rose-light/40 shadow-soft flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-tb-gray-neutral absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por nome do serviço ou descrição..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/20"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
        >
          <option value="todas">Todas as Categorias</option>
          {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <span className="text-xs font-semibold text-tb-gray-neutral ml-auto">
          {filteredServices.length} serviço(s)
        </span>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-tb-gray-neutral bg-tb-white rounded-3xl border border-tb-rose-light/40">
            Nenhum serviço encontrado no catálogo com esses critérios.
          </div>
        ) : (
          filteredServices.map(service => (
            <div
              key={service.id}
              className={`p-5 rounded-3xl bg-tb-white border transition-all flex flex-col justify-between space-y-4 ${
                service.isActive
                  ? 'border-tb-rose-light/60 shadow-soft hover:shadow-premium'
                  : 'border-gray-200 opacity-60 bg-gray-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-tb-rose-blush text-tb-rose-primary">
                    {CATEGORY_NAMES[service.category] || service.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${service.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    <span className="text-[11px] font-medium text-tb-gray-neutral">
                      {service.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark leading-snug">
                  {service.name}
                </h3>
                <p className="text-xs text-tb-brown-soft mt-1.5 line-clamp-2 leading-relaxed">
                  {service.description || 'Sem descrição cadastrada.'}
                </p>
              </div>

              <div>
                <div className="p-3 bg-tb-ivory rounded-2xl border border-tb-rose-light/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-tb-brown-dark">
                    <Clock className="w-3.5 h-3.5 text-tb-rose-primary" />
                    <span className="font-semibold">{service.durationMinutes} min</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-tb-rose-primary">
                      {formatBRL(service.price)}
                    </span>
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="pt-3 border-t border-tb-rose-light/30 flex items-center justify-between">
                  <button
                    onClick={() => toggleServiceActive(service.id)}
                    className="text-xs font-medium text-tb-gray-neutral hover:text-tb-brown-dark transition-colors"
                  >
                    {service.isActive ? 'Desativar' : 'Ativar no catálogo'}
                  </button>

                  <button
                    onClick={() => onEditService(service)}
                    className="px-3 py-1.5 text-xs font-semibold bg-tb-beige-light hover:bg-tb-beige-champagne text-tb-brown-dark rounded-xl transition-colors flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
