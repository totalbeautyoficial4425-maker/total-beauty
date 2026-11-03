import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  DollarSign, 
  User, 
  AlertCircle, 
  ArrowRight, 
  CreditCard, 
  RotateCcw,
  ShieldCheck,
  Check,
  Filter,
  Phone,
  MessageCircle,
  Repeat,
  FileText
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { ClientPackage } from '../types';
import { formatBRL, formatDateBR } from '../utils/formatters';
import { PackageSaleModal } from '../components/modals/PackageSaleModal';
import { PackageDetailModal } from '../components/modals/PackageDetailModal';

export const PacotesPage: React.FC = () => {
  const { clientPackages, professionals, clients } = useData();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'todos' | 'ativos' | 'concluidos' | 'repasses_pendentes'>('ativos');
  const [selectedProfFilter, setSelectedProfFilter] = useState<string>('todos');
  const [packageTypeFilter, setPackageTypeFilter] = useState<'todos' | 'unha' | 'cabelo' | 'outro'>('todos');

  // Modals state
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedPackageForDetail, setSelectedPackageForDetail] = useState<ClientPackage | null>(null);
  const [packageToRenew, setPackageToRenew] = useState<ClientPackage | null>(null);

  // KPIs
  const totalPackagesSold = clientPackages.length;
  const totalRevenue = clientPackages
    .filter(p => p.status !== 'cancelado')
    .reduce((sum, p) => sum + (p.totalPricePaid || 0), 0);

  const activePackagesCount = clientPackages.filter(p => 
    (p.status === 'ativo' || p.status === 'em_andamento') && 
    p.items.some(i => i.remainingQty > 0)
  ).length;

  const totalRemainingCreditsInWallet = clientPackages
    .filter(p => p.status === 'ativo' || p.status === 'em_andamento')
    .reduce((sum, p) => sum + p.items.reduce((acc, i) => acc + (i.remainingQty || 0), 0), 0);

  const totalConsumedValue = clientPackages
    .filter(p => p.status !== 'cancelado')
    .reduce((sum, p) => sum + (p.consumedValue || 0), 0);

  const pendingRepassTotal = clientPackages
    .filter(p => p.status !== 'cancelado' && p.repassStatus !== 'pago')
    .reduce((sum, p) => sum + Math.max(0, (p.repassTotal || 0) - (p.repassPaidAmount || 0)), 0);

  const paidRepassTotal = clientPackages
    .reduce((sum, p) => sum + (p.repassPaidAmount || 0), 0);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return clientPackages.filter(pkg => {
      // 1. Status tab
      if (statusTab === 'ativos') {
        const isAct = (pkg.status === 'ativo' || pkg.status === 'em_andamento') && pkg.items.some(i => i.remainingQty > 0);
        if (!isAct) return false;
      } else if (statusTab === 'concluidos') {
        const isFin = pkg.status === 'concluido' || pkg.status === 'esgotado' || pkg.items.every(i => i.remainingQty === 0);
        if (!isFin) return false;
      } else if (statusTab === 'repasses_pendentes') {
        const hasPending = pkg.status !== 'cancelado' && pkg.repassStatus !== 'pago' && (pkg.repassTotal || 0) > (pkg.repassPaidAmount || 0);
        if (!hasPending) return false;
      }

      // 2. Professional filter
      if (selectedProfFilter !== 'todos') {
        if (pkg.professionalId !== selectedProfFilter) return false;
      }

      // 3. Package Type filter
      if (packageTypeFilter !== 'todos') {
        const pType = pkg.packageType || (
          pkg.packageName?.toLowerCase().includes('cabelo') || pkg.name?.toLowerCase().includes('escova') ? 'cabelo' : 'unha'
        );
        if (pType !== packageTypeFilter) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const clientMatch = pkg.clientName?.toLowerCase().includes(query);
        const nameMatch = (pkg.name || pkg.packageName || '').toLowerCase().includes(query);
        const profMatch = pkg.professionalName?.toLowerCase().includes(query);
        const phoneMatch = pkg.clientPhone?.toLowerCase().includes(query);
        if (!clientMatch && !nameMatch && !profMatch && !phoneMatch) return false;
      }

      return true;
    });
  }, [clientPackages, statusTab, selectedProfFilter, packageTypeFilter, searchQuery]);

  const handleOpenRenew = (pkg: ClientPackage) => {
    setPackageToRenew(pkg);
    setIsSaleModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-tb-brown-dark tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-tb-rose-blush text-tb-rose-primary shadow-2xs">
              <Package className="w-6 h-6" />
            </span>
            Painel de Controle Inteligente de Pacotes
          </h1>
          <p className="text-xs text-tb-gray-neutral mt-1">
            Gestão de créditos pré-pagos, abatimentos proporcionais por serviço, histórico e comissões das profissionais.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setPackageToRenew(null);
              setIsSaleModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold shadow-soft hover:shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Vender Novo Pacote
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1 */}
        <div className="p-4 bg-white rounded-2xl border border-tb-rose-light/50 shadow-soft space-y-1">
          <span className="text-[11px] font-bold text-tb-brown-soft uppercase tracking-wider block">
            Faturamento em Pacotes
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-tb-rose-primary">
              {formatBRL(totalRevenue)}
            </span>
          </div>
          <span className="text-[10px] text-tb-gray-neutral block">
            {totalPackagesSold} pacote(s) • Consumido: {formatBRL(totalConsumedValue)}
          </span>
        </div>

        {/* KPI 2 */}
        <div className="p-4 bg-white rounded-2xl border border-tb-rose-light/50 shadow-soft space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Pacotes Ativos em Carteira
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-emerald-700">
              {activePackagesCount}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">ativos</span>
          </div>
          <span className="text-[10px] text-tb-gray-neutral block">
            Com créditos pendentes de uso
          </span>
        </div>

        {/* KPI 3 */}
        <div className="p-4 bg-white rounded-2xl border border-tb-rose-light/50 shadow-soft space-y-1">
          <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
            Créditos Restantes em Carteira
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-teal-700">
              {totalRemainingCreditsInWallet}
            </span>
            <span className="text-xs text-teal-600 font-semibold">atendimentos</span>
          </div>
          <span className="text-[10px] text-tb-gray-neutral block">
            Disponíveis para as clientes utilizarem
          </span>
        </div>

        {/* KPI 4 */}
        <div className="p-4 bg-white rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-orange-50/30 shadow-soft space-y-1">
          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block flex items-center justify-between">
            Comissões / Repasses
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-amber-800">
              {formatBRL(pendingRepassTotal)}
            </span>
            <span className="text-xs text-amber-700 font-semibold">pendente</span>
          </div>
          <span className="text-[10px] text-amber-700 block">
            Já quitado às profissionais: {formatBRL(paidRepassTotal)}
          </span>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-tb-rose-light/50 shadow-soft space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-tb-ivory rounded-xl border border-tb-rose-light/40">
            <button
              onClick={() => setStatusTab('ativos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusTab === 'ativos'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-tb-brown-soft hover:text-tb-brown-dark'
              }`}
            >
              ● Ativos ({activePackagesCount})
            </button>
            <button
              onClick={() => setStatusTab('concluidos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusTab === 'concluidos'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-tb-brown-soft hover:text-tb-brown-dark'
              }`}
            >
              ✓ Concluídos / Finalizados
            </button>
            <button
              onClick={() => setStatusTab('repasses_pendentes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusTab === 'repasses_pendentes'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-tb-brown-soft hover:text-tb-brown-dark'
              }`}
            >
              ⏳ Repasses Pendentes ({formatBRL(pendingRepassTotal)})
            </button>
            <button
              onClick={() => setStatusTab('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusTab === 'todos'
                  ? 'bg-tb-brown-dark text-white shadow-2xs'
                  : 'text-tb-brown-soft hover:text-tb-brown-dark'
              }`}
            >
              Todos ({totalPackagesSold})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-tb-gray-neutral" />
            <input
              type="text"
              placeholder="Buscar cliente, telefone, profissional..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-tb-rose-light/60 bg-tb-ivory text-xs text-tb-brown-dark placeholder-tb-gray-neutral focus:outline-hidden focus:ring-2 focus:ring-tb-rose-primary/40 focus:border-tb-rose-primary"
            />
          </div>
        </div>

        {/* Detailed Secondary Filters: Profissional & Tipo de Pacote */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-tb-rose-light/30 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-tb-brown-soft">Profissional:</span>
            <select
              value={selectedProfFilter}
              onChange={(e) => setSelectedProfFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-tb-rose-light bg-tb-ivory text-xs font-semibold text-tb-brown-dark"
            >
              <option value="todos">Todas as Profissionais</option>
              {professionals.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-tb-brown-soft">Tipo de Pacote:</span>
            <select
              value={packageTypeFilter}
              onChange={(e) => setPackageTypeFilter(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg border border-tb-rose-light bg-tb-ivory text-xs font-semibold text-tb-brown-dark"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="unha">💅 Manicure & Pedicure (Unhas)</option>
              <option value="cabelo">💇‍♀️ Escova & Cabelo</option>
              <option value="outro">Personalizados / Outros</option>
            </select>
          </div>
        </div>
      </div>

      {/* Package List Grid */}
      {filteredPackages.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-tb-rose-light/50 shadow-soft space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-tb-rose-blush flex items-center justify-center text-3xl mx-auto shadow-inner">
            🎁
          </div>
          <h3 className="text-base font-bold text-tb-brown-dark">
            Nenhum pacote encontrado com os filtros selecionados
          </h3>
          <p className="text-xs text-tb-gray-neutral max-w-md mx-auto">
            Comece cadastrando uma nova venda de pacote para dar créditos automáticos às clientes e centralizar os repasses das profissionais.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setPackageToRenew(null);
                setIsSaleModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-soft hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Vender Pacote Agora
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPackages.map((pkg) => {
            const totalCredits = pkg.items.reduce((acc, i) => acc + (i.totalQty || 0), 0);
            const remainingCredits = pkg.items.reduce((acc, i) => acc + (i.remainingQty || 0), 0);
            const usedCredits = pkg.items.reduce((acc, i) => acc + (i.usedQty || 0), 0);
            const pctUsed = totalCredits > 0 ? (usedCredits / totalCredits) * 100 : 0;
            const isCompleted = remainingCredits === 0 || pkg.status === 'concluido' || pkg.status === 'esgotado';

            const repassTotal = pkg.repassTotal || 0;
            const repassPaid = pkg.repassPaidAmount || 0;
            const repassPending = Math.max(0, repassTotal - repassPaid);

            const consumed = pkg.consumedValue !== undefined ? pkg.consumedValue : (pkg.totalPricePaid - (pkg.financialBalance || 0));
            const balance = pkg.financialBalance !== undefined ? pkg.financialBalance : Math.max(0, pkg.totalPricePaid - consumed);

            // Fetch phone from client if missing on pkg
            const clientPhone = pkg.clientPhone || clients.find(c => c.id === pkg.clientId)?.phone;

            return (
              <div
                key={pkg.id}
                className={`p-5 rounded-3xl border transition-all hover:shadow-md flex flex-col justify-between ${
                  isCompleted
                    ? 'bg-gray-50/80 border-gray-200'
                    : 'bg-white border-tb-rose-light/60 shadow-soft hover:border-tb-rose-primary/50'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Top Bar: Title & Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-tb-rose-light/40 pb-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-lg shrink-0 shadow-2xs">
                        🎁
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-tb-brown-dark leading-snug">
                          {pkg.name || pkg.packageName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-tb-rose-primary">
                            {pkg.clientName}
                          </span>
                          {clientPhone && (
                            <span className="text-[10px] text-tb-gray-neutral flex items-center gap-1 font-medium">
                              <Phone className="w-2.5 h-2.5 text-tb-rose-primary" /> {clientPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                      pkg.status === 'ativo' || pkg.status === 'em_andamento'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isCompleted
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {pkg.status === 'ativo' ? '● Ativo' :
                       pkg.status === 'em_andamento' ? '● Em Andamento' :
                       pkg.status === 'concluido' ? '✓ Concluído' :
                       pkg.status === 'esgotado' ? '✓ Esgotado' :
                       pkg.status === 'cancelado' ? '✕ Cancelado' : '⏳ Expirado'}
                    </span>
                  </div>

                  {/* Credits Balance Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-tb-brown-soft uppercase text-[10px] tracking-wider">
                        Créditos em Carteira:
                      </span>
                      <span className={remainingCredits > 0 ? 'text-emerald-700 font-black' : 'text-gray-400'}>
                        {remainingCredits} de {totalCredits} restantes ({usedCredits} usados)
                      </span>
                    </div>

                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-blue-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${pctUsed}%` }}
                      />
                    </div>

                    {/* Breakdown of items */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pkg.items.map((it, idx) => (
                        <span 
                          key={idx} 
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-tb-ivory text-tb-brown-dark border border-tb-rose-light/50"
                        >
                          {it.serviceName}: <strong className={it.remainingQty > 0 ? 'text-emerald-700' : 'text-gray-400'}>{it.remainingQty}/{it.totalQty}</strong>
                          {it.unitPackagePrice ? <span className="text-tb-gray-neutral ml-1">({formatBRL(it.unitPackagePrice)})</span> : null}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Financial & Balances Breakdown */}
                  <div className="p-3 bg-tb-ivory rounded-2xl border border-tb-rose-light/40 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2 pb-1.5 border-b border-tb-rose-light/30">
                      <div>
                        <span className="text-[10px] text-tb-gray-neutral block">Valor Recebido:</span>
                        <span className="font-black text-tb-brown-dark text-sm">{formatBRL(pkg.totalPricePaid)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-tb-gray-neutral block">Saldo Financeiro:</span>
                        <span className={`font-black text-sm ${balance > 0 ? 'text-emerald-700' : 'text-tb-gray-neutral'}`}>
                          {formatBRL(balance)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-tb-gray-neutral">Valor Consumido:</span>
                      <span className="font-bold text-tb-brown-dark">{formatBRL(consumed)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-tb-gray-neutral">Última Utilização:</span>
                      <span className="font-semibold text-tb-brown-dark">
                        {pkg.lastUsageDate ? formatDateBR(pkg.lastUsageDate) : 'Nenhum uso registrado'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-tb-rose-light/30">
                      <span className="text-amber-800 text-[11px] font-bold">Comissão da Profissional:</span>
                      <div className="text-right">
                        <span className="font-black text-amber-900 block">
                          {formatBRL(repassTotal)} {pkg.commissionPercentage ? `(${pkg.commissionPercentage}%)` : ''}
                        </span>
                        <span className="text-[10px] font-semibold text-amber-700 block">
                          {pkg.repassStatus === 'pago' ? '✓ Quitado' : `Pendente: ${formatBRL(repassPending)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 mt-2 border-t border-tb-rose-light/40 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-tb-gray-neutral">
                    Vendido em {formatDateBR(pkg.purchaseDate)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Botão de Renovação */}
                    <button
                      type="button"
                      onClick={() => handleOpenRenew(pkg)}
                      title="Criar novo pacote para esta cliente iniciando novo ciclo"
                      className="px-2.5 py-1.5 rounded-xl border border-tb-rose-light bg-white hover:bg-tb-rose-blush text-tb-brown-dark transition-colors text-xs font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <Repeat className="w-3.5 h-3.5 text-tb-rose-primary" />
                      Renovar
                    </button>

                    {/* Botão de Extrato e Ações */}
                    <button
                      onClick={() => setSelectedPackageForDetail(pkg)}
                      className="px-3.5 py-1.5 rounded-xl bg-tb-rose-primary text-white hover:bg-tb-rose-dark transition-colors text-xs font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Extrato
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sale Modal */}
      <PackageSaleModal
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false);
          setPackageToRenew(null);
        }}
        initialPackage={packageToRenew}
        onSuccess={(pkg) => {
          setSelectedPackageForDetail(pkg);
          setPackageToRenew(null);
        }}
      />

      {/* Detail / Statement Modal */}
      <PackageDetailModal
        isOpen={!!selectedPackageForDetail}
        onClose={() => setSelectedPackageForDetail(null)}
        packageItem={selectedPackageForDetail}
      />
    </div>
  );
};
