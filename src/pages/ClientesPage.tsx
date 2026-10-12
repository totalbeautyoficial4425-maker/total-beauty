import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  MessageCircle, 
  Phone, 
  Mail, 
  Eye, 
  Edit, 
  CalendarCheck, 
  Archive, 
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Cake
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Client } from '../types';
import { 
  formatBRL, 
  formatDateBR, 
  maskPhoneBR, 
  downloadCSV,
  isClientBirthdayToday,
  isClientBirthdayThisMonth,
  formatBirthdayDayMonth
} from '../utils/formatters';

interface ClientesPageProps {
  onOpenNewClient: () => void;
  onEditClient: (client: Client) => void;
  onViewClientDetails: (client: Client) => void;
  onOpenWhatsApp: (clientName: string, clientPhone: string, appointment?: any, templateKey?: any) => void;
  onNewAppointmentForClient: (clientId: string) => void;
}

export const ClientesPage: React.FC<ClientesPageProps> = ({
  onOpenNewClient,
  onEditClient,
  onViewClientDetails,
  onOpenWhatsApp,
  onNewAppointmentForClient,
}) => {
  const { clients } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'todas' | 'recorrentes' | 'novas' | 'inativas' | 'aniversariantes_hoje' | 'aniversariantes_mes' | 'arquivadas'>('todas');

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // Archive filter
      if (filterType === 'arquivadas') {
        if (!c.isArchived) return false;
      } else {
        if (c.isArchived) return false;
      }

      // Category filters
      if (filterType === 'novas' && c.totalVisits > 1) return false;
      if (filterType === 'recorrentes' && c.totalVisits < 2) return false;
      if (filterType === 'aniversariantes_hoje' && !isClientBirthdayToday(c.birthDate)) return false;
      if (filterType === 'aniversariantes_mes' && !isClientBirthdayThisMonth(c.birthDate)) return false;
      if (filterType === 'inativas') {
        if (!c.lastVisit) return false;
        const lastVisitDate = new Date(c.lastVisit);
        const daysAgo = (Date.now() - lastVisitDate.getTime()) / (1000 * 3600 * 24);
        if (daysAgo < 30) return false;
      }

      // Search query (Nome, Telefone, Email)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [clients, filterType, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID', 'Nome Completo', 'Telefone', 'WhatsApp', 'E-mail', 
      'Data de Nascimento', 'Cidade', 'Total Visitas', 'Total Gasto (R$)', 
      'Última Visita', 'Data Cadastro', 'Status'
    ];

    const rows = filteredClients.map(c => [
      c.id,
      c.name,
      c.phone,
      c.whatsapp || c.phone,
      c.email || '',
      c.birthDate ? formatDateBR(c.birthDate) : '',
      c.address?.city || '',
      c.totalVisits,
      c.totalSpent.toFixed(2),
      c.lastVisit ? formatDateBR(c.lastVisit) : '',
      formatDateBR(c.createdAt),
      c.isArchived ? 'Arquivada' : 'Ativa'
    ]);

    downloadCSV(`clientes_total_beauty_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header Card */}
      <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-tb-rose-primary block mb-1">
            Gestão da Carteira
          </span>
          <h2 className="font-serif-brand text-3xl font-bold text-tb-brown-dark">
            Clientes Total Beauty
          </h2>
          <p className="text-xs text-tb-gray-neutral mt-1">
            {clients.filter(c => !c.isArchived).length} clientes ativas cadastradas no sistema.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl border border-tb-rose-light bg-tb-ivory hover:bg-tb-beige-light text-xs font-semibold text-tb-brown-dark transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-tb-rose-primary" />
            Exportar CSV
          </button>
          <button
            onClick={onOpenNewClient}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-2xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-premium transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Cadastrar Cliente
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-tb-white rounded-2xl p-4 border border-tb-rose-light/40 shadow-soft flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-tb-gray-neutral absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Pesquisar por nome, celular com DDD ou e-mail..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/20"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'todas', label: 'Todas Ativas' },
            { id: 'aniversariantes_hoje', label: '🎂 Aniversário Hoje' },
            { id: 'aniversariantes_mes', label: '🎉 Niver no Mês' },
            { id: 'recorrentes', label: 'Recorrentes (2+ visitas)' },
            { id: 'novas', label: 'Novas Clientes' },
            { id: 'inativas', label: 'Sem retorno (+30 dias)' },
            { id: 'arquivadas', label: 'Arquivadas' },
          ].map(flt => (
            <button
              key={flt.id}
              onClick={() => setFilterType(flt.id as any)}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                filterType === flt.id
                  ? 'bg-tb-rose-primary text-white shadow-sm'
                  : 'bg-tb-ivory text-tb-brown-soft hover:bg-tb-beige-light'
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clientes Table */}
      <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-tb-ivory border-b border-tb-rose-light/40 text-tb-brown-soft font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Contato Celular</th>
                <th className="px-6 py-4">Última Visita</th>
                <th className="px-6 py-4">Visitas</th>
                <th className="px-6 py-4">Total Gasto</th>
                <th className="px-6 py-4 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-tb-gray-neutral">
                    Nenhuma cliente encontrada com os critérios informados.
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => (
                  <tr 
                    key={client.id}
                    className="hover:bg-tb-ivory/50 transition-colors group cursor-pointer"
                    onClick={() => onViewClientDetails(client)}
                  >
                    {/* Name + Monogram */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center font-bold text-xs border border-tb-rose-light shrink-0">
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-tb-brown-dark group-hover:text-tb-rose-primary transition-colors">
                              {client.name}
                            </p>
                            {isClientBirthdayToday(client.birthDate) && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 flex items-center gap-1 shrink-0 animate-pulse border border-pink-200">
                                <Cake className="w-3 h-3 text-pink-600" />
                                Aniversariante Hoje!
                              </span>
                            )}
                            {isClientBirthdayThisMonth(client.birthDate) && !isClientBirthdayToday(client.birthDate) && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-pink-50 text-pink-600 flex items-center gap-1 shrink-0 border border-pink-100">
                                🎂 {formatBirthdayDayMonth(client.birthDate)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-tb-gray-neutral">
                            {client.email || 'Sem e-mail cadastrado'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-tb-brown-soft">
                      {maskPhoneBR(client.phone)}
                    </td>

                    {/* Last Visit */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.lastVisit ? (
                        <span className="font-medium text-tb-brown-dark">
                          {formatDateBR(client.lastVisit)}
                        </span>
                      ) : (
                        <span className="text-tb-gray-neutral italic">Primeira visita</span>
                      )}
                    </td>

                    {/* Total Visits Badge */}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-tb-beige-light text-tb-brown-dark">
                        {client.totalVisits} atendimento(s)
                      </span>
                    </td>

                    {/* Total Spent */}
                    <td className="px-6 py-4 font-bold text-tb-rose-primary whitespace-nowrap">
                      {formatBRL(client.totalSpent)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {isClientBirthdayToday(client.birthDate) ? (
                          <button
                            onClick={() => onOpenWhatsApp(client.name, client.phone, { isBirthday: true }, 'aniversario')}
                            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all flex items-center gap-1 text-[11px] font-semibold shadow-2xs"
                            title="Parabenizar no WhatsApp"
                          >
                            <Cake className="w-3.5 h-3.5" />
                            <span>Parabéns</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenWhatsApp(client.name, client.phone)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onNewAppointmentForClient(client.id)}
                          className="p-2 text-tb-rose-primary hover:bg-tb-rose-blush rounded-xl transition-colors"
                          title="Agendar Horário"
                        >
                          <CalendarCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onViewClientDetails(client)}
                          className="p-2 text-tb-brown-soft hover:bg-tb-beige-light rounded-xl transition-colors"
                          title="Visualizar Ficha Completa"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditClient(client)}
                          className="p-2 text-tb-brown-soft hover:bg-tb-beige-light rounded-xl transition-colors"
                          title="Editar Cadastro"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
