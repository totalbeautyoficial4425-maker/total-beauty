import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  Sparkles 
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatBRL, formatDateBR, downloadCSV } from '../utils/formatters';
import { getTodayDate } from '../services/storage';

export const RelatoriosPage: React.FC = () => {
  const { clients, appointments, attendances, payments, expenses, professionals, services } = useData();
  const [period, setPeriod] = useState<'mes_atual' | 'ultimos_30' | 'ano' | 'tudo'>('mes_atual');

  const todayStr = getTodayDate();
  const currentMonthPrefix = todayStr.substring(0, 7);
  const currentYearPrefix = todayStr.substring(0, 4);

  // Filter datasets based on selected period
  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      if (period === 'mes_atual') return a.date.startsWith(currentMonthPrefix);
      if (period === 'ano') return a.date.startsWith(currentYearPrefix);
      if (period === 'ultimos_30') {
        const d = new Date(a.date);
        return (Date.now() - d.getTime()) <= 30 * 24 * 3600 * 1000;
      }
      return true;
    });
  }, [appointments, period, currentMonthPrefix, currentYearPrefix]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (period === 'mes_atual') return p.date.startsWith(currentMonthPrefix);
      if (period === 'ano') return p.date.startsWith(currentYearPrefix);
      if (period === 'ultimos_30') {
        const d = new Date(p.date);
        return (Date.now() - d.getTime()) <= 30 * 24 * 3600 * 1000;
      }
      return true;
    });
  }, [payments, period, currentMonthPrefix, currentYearPrefix]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const dt = e.paymentDate || e.dueDate;
      if (period === 'mes_atual') return dt.startsWith(currentMonthPrefix);
      if (period === 'ano') return dt.startsWith(currentYearPrefix);
      if (period === 'ultimos_30') {
        const d = new Date(dt);
        return (Date.now() - d.getTime()) <= 30 * 24 * 3600 * 1000;
      }
      return true;
    });
  }, [expenses, period, currentMonthPrefix, currentYearPrefix]);

  // Calculated metrics
  const totalReceived = filteredPayments.filter(p => p.status === 'pago').reduce((acc, p) => acc + p.paidAmount, 0);
  const totalPending = filteredPayments.reduce((acc, p) => acc + p.pendingAmount, 0);
  const totalPaidExpenses = filteredExpenses.filter(e => e.status === 'pago').reduce((acc, e) => acc + e.amount, 0);
  const netResult = totalReceived - totalPaidExpenses;

  const completedAptsCount = filteredAppointments.filter(a => a.status === 'concluido').length;
  const canceledAptsCount = filteredAppointments.filter(a => a.status === 'cancelado').length;
  const noShowAptsCount = filteredAppointments.filter(a => a.status === 'nao_compareceu').length;

  const avgTicket = completedAptsCount > 0 ? totalReceived / completedAptsCount : 0;

  // Services Ranking
  const servicesRankMap = new Map<string, { count: number; totalRevenue: number }>();
  filteredAppointments.forEach(a => {
    const current = servicesRankMap.get(a.serviceName) || { count: 0, totalRevenue: 0 };
    servicesRankMap.set(a.serviceName, {
      count: current.count + 1,
      totalRevenue: current.totalRevenue + a.price,
    });
  });

  const servicesRanking = Array.from(servicesRankMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Export full management report to CSV
  const handleExportReportCSV = () => {
    const headers = ['Métrica', 'Valor'];
    const rows = [
      ['Período do Relatório', period.toUpperCase()],
      ['Faturamento Recebido Efetivo', formatBRL(totalReceived)],
      ['Valores Pendentes a Receber', formatBRL(totalPending)],
      ['Despesas Pagas no Período', formatBRL(totalPaidExpenses)],
      ['Resultado Financeiro Líquido', formatBRL(netResult)],
      ['Atendimentos Concluídos', completedAptsCount],
      ['Agendamentos Cancelados', canceledAptsCount],
      ['Não Compareceram (No-show)', noShowAptsCount],
      ['Ticket Médio', formatBRL(avgTicket)],
    ];

    downloadCSV(`relatorio_gerencial_total_beauty_${todayStr}`, headers, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header Card */}
      <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-tb-rose-primary block mb-1">
            Inteligência & Relatórios
          </span>
          <h2 className="font-serif-brand text-3xl font-bold text-tb-brown-dark">
            Relatórios Gerenciais
          </h2>
          <p className="text-xs text-tb-gray-neutral mt-1">
            Visão aprofundada de receitas, cancelamentos, serviços mais rentáveis e rentabilidade.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Period selector */}
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as any)}
            className="text-xs px-3.5 py-2.5 rounded-2xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium"
          >
            <option value="mes_atual">Mês Atual</option>
            <option value="ultimos_30">Últimos 30 Dias</option>
            <option value="ano">Ano Vigente</option>
            <option value="tudo">Todo o Histórico</option>
          </select>

          <button
            onClick={handleExportReportCSV}
            className="px-4 py-2.5 rounded-2xl border border-tb-rose-light bg-tb-ivory hover:bg-tb-beige-light text-xs font-semibold text-tb-brown-dark transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-tb-rose-primary" />
            CSV
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-2xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs font-semibold shadow-soft transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <span className="text-xs font-medium text-tb-brown-soft block">Receitas Recebidas</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {formatBRL(totalReceived)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">Efetivamente liquidado</p>
        </div>

        <div className="p-5 rounded-3xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <span className="text-xs font-medium text-tb-brown-soft block">Despesas Pagas</span>
          <div className="text-2xl font-bold text-rose-700 mt-1">
            {formatBRL(totalPaidExpenses)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">Custos operacionais</p>
        </div>

        <div className="p-5 rounded-3xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <span className="text-xs font-medium text-tb-brown-soft block">Resultado Financeiro</span>
          <div className={`text-2xl font-bold mt-1 ${netResult >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatBRL(netResult)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">Lucro líquido do período</p>
        </div>

        <div className="p-5 rounded-3xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <span className="text-xs font-medium text-tb-brown-soft block">Ticket Médio</span>
          <div className="text-2xl font-bold text-tb-brown-dark mt-1">
            {formatBRL(avgTicket)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">Média por atendimento pago</p>
        </div>
      </div>

      {/* Operational Efficiency (Agendamentos e Taxas) */}
      <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-4">
        <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
          Desempenho da Agenda no Período
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-900 block">Atendimentos Concluídos</span>
              <span className="text-2xl font-bold text-emerald-800">{completedAptsCount}</span>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-600 opacity-60" />
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-rose-900 block">Agendamentos Cancelados</span>
              <span className="text-2xl font-bold text-rose-800">{canceledAptsCount}</span>
            </div>
            <XCircle className="w-8 h-8 text-rose-600 opacity-60" />
          </div>

          <div className="p-4 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-800 block">Não Compareceram (No-show)</span>
              <span className="text-2xl font-bold text-gray-800">{noShowAptsCount}</span>
            </div>
            <Clock className="w-8 h-8 text-gray-500 opacity-60" />
          </div>
        </div>
      </div>

      {/* Top Services Ranking Table */}
      <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
        <div className="p-5 bg-tb-ivory border-b border-tb-rose-light/40">
          <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
            Ranking de Procedimentos Mais Realizados & Faturamento
          </h3>
          <p className="text-xs text-tb-gray-neutral">
            Classificado pela receita total gerada no período
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-tb-ivory/60 text-tb-brown-soft font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Procedimento / Serviço</th>
                <th className="px-6 py-4">Quantidade Realizada</th>
                <th className="px-6 py-4">Faturamento Total Gerado</th>
                <th className="px-6 py-4">Preço Médio Praticado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
              {servicesRanking.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-tb-gray-neutral">
                    Nenhum serviço realizado registrado no período selecionado.
                  </td>
                </tr>
              ) : (
                servicesRanking.map((srv, idx) => (
                  <tr key={srv.name} className="hover:bg-tb-ivory/40">
                    <td className="px-6 py-4 font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-tb-rose-blush text-tb-rose-primary text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {srv.name}
                    </td>
                    <td className="px-6 py-4">{srv.count} sessões</td>
                    <td className="px-6 py-4 font-bold text-tb-rose-primary">{formatBRL(srv.totalRevenue)}</td>
                    <td className="px-6 py-4 text-tb-gray-neutral">
                      {formatBRL(srv.count > 0 ? srv.totalRevenue / srv.count : 0)}
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
