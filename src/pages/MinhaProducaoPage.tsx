import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  User, 
  Sparkles,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatBRL, formatDateBR, downloadCSV } from '../utils/formatters';
import { getTodayDate } from '../services/storage';

export const MinhaProducaoPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { professionals, getProfessionalMetrics } = useData();

  // Find the logged-in professional
  const loggedProf = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.professionalId) {
      return professionals.find(p => p.id === currentUser.professionalId) || null;
    }
    // Fallback: match by username
    return professionals.find(p => p.username === currentUser.username) || null;
  }, [currentUser, professionals]);

  const [periodFilter, setPeriodFilter] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('mes');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch metrics for this professional
  const profMetrics = useMemo(() => {
    if (!loggedProf) {
      return {
        todayCommissions: 0,
        todayGross: 0,
        todayNet: 0,
        monthCommissions: 0,
        monthGross: 0,
        monthNet: 0,
        pendingCommissions: 0,
        todayCompletedCount: 0,
        monthCompletedCount: 0,
        todayAppointments: [],
        myTransactions: [],
      };
    }
    return getProfessionalMetrics(loggedProf.id);
  }, [loggedProf, getProfessionalMetrics]);

  // Filter transactions based on date filter and search query
  const filteredTransactions = useMemo(() => {
    const today = getTodayDate();
    const currentMonth = today.substring(0, 7);

    return profMetrics.myTransactions.filter(tx => {
      // Period filter
      if (periodFilter === 'hoje' && tx.date !== today) return false;
      if (periodFilter === 'mes' && !tx.date.startsWith(currentMonth)) return false;
      if (periodFilter === 'semana') {
        const d = new Date(tx.date + 'T00:00:00');
        const now = new Date();
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7 || diffDays < 0) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (tx.clientName && tx.clientName.toLowerCase().includes(q)) ||
          (tx.serviceName && tx.serviceName.toLowerCase().includes(q)) ||
          tx.description.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [profMetrics.myTransactions, periodFilter, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Data', 'Cliente', 'Serviço Realizado', 'Valor Bruto (R$)', 
      'Desconto (R$)', 'Valor Final (R$)', '% de Comissão', 
      'Minha Comissão (R$)', 'Salão (R$)', 'Status Pagamento'
    ];

    const rows = filteredTransactions.map(tx => [
      formatDateBR(tx.date),
      tx.clientName || 'Cliente',
      tx.serviceName || tx.description,
      tx.grossValue.toFixed(2),
      tx.discount.toFixed(2),
      tx.netValue.toFixed(2),
      `${loggedProf?.commissionPercentage || tx.commissionPercentage || 50}%`,
      (tx.commissionAmount || 0).toFixed(2),
      (Math.max(0, tx.netValue - (tx.commissionAmount || 0))).toFixed(2),
      tx.status.toUpperCase()
    ]);

    downloadCSV(`minha_producao_${currentUser?.username || 'prof'}_${getTodayDate()}`, headers, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered sums
  const filteredCommissionsTotal = filteredTransactions
    .filter(tx => tx.status === 'pago')
    .reduce((acc, tx) => acc + (tx.commissionAmount || 0), 0);

  const filteredPendingTotal = filteredTransactions
    .filter(tx => tx.status !== 'pago')
    .reduce((acc, tx) => {
      const commPercent = tx.commissionPercentage || 50;
      return acc + ((tx.pendingAmount * commPercent) / 100);
    }, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-tb-white rounded-3xl p-6 sm:p-8 border border-tb-rose-light/50 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold tracking-widest text-tb-rose-primary">
              Contabilidade Individual & Comissões
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tb-rose-blush text-tb-rose-primary border border-tb-rose-light">
              Painel Particular
            </span>
          </div>
          <h2 className="font-serif-brand text-3xl font-bold text-tb-brown-dark">
            Minha Produção — {loggedProf?.name || currentUser?.name}
          </h2>
          <p className="text-xs text-tb-gray-neutral mt-1">
            {loggedProf?.specialty || 'Profissional'} • Comissões calculadas conforme as porcentagens oficiais de cada serviço no catálogo • Repasses sobre o valor após descontos
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl border border-tb-rose-light bg-tb-ivory hover:bg-tb-beige-light text-xs font-semibold text-tb-brown-dark transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4 text-tb-rose-primary" />
            Exportar Extrato (CSV)
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs font-semibold shadow-soft transition-all flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Minhas Comissões Hoje */}
        <div className="p-5 rounded-3xl bg-tb-white border-2 border-emerald-300 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Comissão a Pagar Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">
            {formatBRL(profMetrics.todayCommissions)}
          </div>
          <p className="text-[11px] text-emerald-800 mt-1 font-medium">
            Liberado para pagamento diário
          </p>
        </div>

        {/* Card 2: Produção Bruta Hoje */}
        <div className="p-5 rounded-3xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Produção Bruta Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-tb-brown-dark">
            {formatBRL(profMetrics.todayGross)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Base líquida: {formatBRL(profMetrics.todayNet)}
          </p>
        </div>

        {/* Card 3: Total no Mês */}
        <div className="p-5 rounded-3xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Comissões no Mês</span>
            <div className="w-8 h-8 rounded-lg bg-tb-beige-light text-tb-brown-dark flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-tb-rose-primary">
            {formatBRL(profMetrics.monthCommissions)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Bruto mês: {formatBRL(profMetrics.monthGross)}
          </p>
        </div>

        {/* Card 4: Comissões Pendentes */}
        <div className="p-5 rounded-3xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Comissões Pendentes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {formatBRL(profMetrics.pendingCommissions)}
          </div>
          <p className="text-[11px] text-amber-600 mt-1 font-medium">
            Atendimentos aguardando quitação
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-tb-white rounded-2xl p-4 border border-tb-rose-light/40 shadow-soft flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-tb-gray-neutral absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Pesquisar por cliente ou serviço..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
          />
        </div>

        {/* Period Pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'hoje', label: 'Hoje' },
            { id: 'semana', label: 'Últimos 7 Dias' },
            { id: 'mes', label: 'Este Mês' },
            { id: 'todos', label: 'Todo o Histórico' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodFilter(p.id as any)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                periodFilter === p.id
                  ? 'bg-tb-rose-primary text-white shadow-sm'
                  : 'bg-tb-ivory text-tb-brown-soft hover:bg-tb-beige-light'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-tb-brown-dark ml-auto">
          Comissão Filtrada: <span className="text-emerald-700 font-bold">{formatBRL(filteredCommissionsTotal)}</span>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
        <div className="p-5 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
          <div>
            <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
              Extrato Detalhado de Atendimentos & Comissões
            </h3>
            <p className="text-xs text-tb-gray-neutral">
              Detalhamento de cada serviço prestado, descontos aplicados, percentual e repasses líquidos
            </p>
          </div>
          <span className="text-xs font-semibold text-tb-rose-primary bg-tb-rose-blush px-3 py-1 rounded-full">
            {filteredTransactions.length} registro(s)
          </span>
        </div>

        {/* Formula Explanation Banner */}
        <div className="px-5 py-3 bg-tb-rose-blush/30 border-b border-tb-rose-light/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-tb-brown-dark font-medium">
            <Sparkles className="w-4 h-4 text-tb-rose-primary shrink-0" />
            <span>
              <strong>Regra de Cálculo Transparente (Admin):</strong> [Valor Bruto] − [Desconto] = <strong>[Base de Cálculo]</strong> × [% Comissão do Serviço] = <strong>[Seu Repasse Líquido]</strong>
            </span>
          </div>
          <span className="text-[11px] text-tb-brown-soft">
            * O Salão retém o valor restante da base após a dedução da comissão.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-tb-ivory/60 text-tb-brown-soft font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Data</th>
                <th className="px-4 py-3.5">Cliente</th>
                <th className="px-4 py-3.5">Procedimento / Serviço</th>
                <th className="px-4 py-3.5 text-right">Valor Bruto</th>
                <th className="px-4 py-3.5 text-right">Desconto</th>
                <th className="px-4 py-3.5 text-right">Valor Final (Base)</th>
                <th className="px-4 py-3.5 text-center">% Repasse</th>
                <th className="px-4 py-3.5 text-right">Minha Comissão</th>
                <th className="px-4 py-3.5 text-right">Salão</th>
                <th className="px-4 py-3.5 text-center">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-tb-gray-neutral">
                    Nenhum atendimento ou comissão registrada para o período selecionado.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const gross = tx.grossValue || tx.netValue;
                  const disc = tx.discount || 0;
                  const discPct = tx.discountPercentage || (gross > 0 && disc > 0 ? Math.round((disc / gross) * 100) : 0);
                  const salonAmount = Math.max(0, tx.netValue - (tx.commissionAmount || 0));
                  const profCommission = tx.commissionPercentage || 50;

                  return (
                    <tr key={tx.id} className="hover:bg-tb-ivory/50 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap font-medium">
                        {formatDateBR(tx.date)}
                      </td>
                      <td className="px-4 py-3.5 font-bold">
                        {tx.clientName || 'Cliente'}
                      </td>
                      <td className="px-4 py-3.5 text-tb-brown-soft max-w-[180px] truncate">
                        {tx.serviceName || tx.description}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-tb-brown-dark">
                        {formatBRL(gross)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-rose-700 font-medium">
                        {disc > 0 ? (
                          <span>-{formatBRL(disc)} <span className="text-[10px] text-rose-600 font-normal">({discPct}%)</span></span>
                        ) : (
                          <span className="text-tb-gray-neutral/70">R$ 0,00</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-tb-brown-dark">
                        {formatBRL(tx.netValue)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tb-beige-light text-tb-brown-dark">
                          {profCommission}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                        +{formatBRL(tx.commissionAmount || 0)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-tb-brown-soft whitespace-nowrap">
                        {formatBRL(salonAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.status === 'pago' ? 'bg-emerald-100 text-emerald-800' :
                          tx.status === 'parcial' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {tx.status === 'pago' ? 'Quitado' : tx.status === 'parcial' ? 'Parcial' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
