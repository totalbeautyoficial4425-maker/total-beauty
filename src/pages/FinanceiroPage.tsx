import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Download, 
  Filter, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  Trash2
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { PaymentTransaction, Expense, PaymentMethod, ExpenseCategory } from '../types';
import { formatBRL, formatDateBR, downloadCSV } from '../utils/formatters';

interface FinanceiroPageProps {
  onOpenNewExpense: () => void;
  onEditExpense: (expense: Expense) => void;
}

export const FinanceiroPage: React.FC<FinanceiroPageProps> = ({
  onOpenNewExpense,
  onEditExpense,
}) => {
  const { payments, expenses, financialSummary, deleteExpense, settings } = useData();

  const [activeTab, setActiveTab] = useState<'receitas' | 'despesas' | 'extrato'>('receitas');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('todos');

  // Filter Payments
  const filteredPayments = useMemo(() => {
    const finStartDate = settings?.financialStartDate || '2026-10-22';
    return payments.filter(p => {
      if (p.date && p.date < finStartDate) return false;
      if (filterStatus !== 'todos' && p.status !== filterStatus) return false;
      if (filterPaymentMethod !== 'todos' && p.paymentMethod !== filterPaymentMethod) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.description.toLowerCase().includes(q) ||
          (p.clientName && p.clientName.toLowerCase().includes(q)) ||
          (p.serviceName && p.serviceName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [payments, filterStatus, filterPaymentMethod, searchQuery, settings]);

  // Filter Expenses
  const filteredExpenses = useMemo(() => {
    const finStartDate = settings?.financialStartDate || '2026-10-22';
    return expenses.filter(e => {
      const dt = e.paymentDate || e.competenceDate || e.dueDate;
      if (dt && dt < finStartDate) return false;
      if (filterStatus !== 'todos' && e.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.notes && e.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [expenses, filterStatus, searchQuery]);

  // Consolidated Statement (Extrato)
  const consolidatedStatement = useMemo(() => {
    const list: {
      id: string;
      date: string;
      description: string;
      category: string;
      type: 'receita' | 'despesa';
      amount: number;
      status: string;
      paymentMethod?: string;
    }[] = [];

    payments.forEach(p => {
      list.push({
        id: p.id,
        date: p.date,
        description: p.description,
        category: p.serviceName || 'Serviço',
        type: 'receita',
        amount: p.paidAmount,
        status: p.status,
        paymentMethod: p.paymentMethod,
      });
    });

    expenses.forEach(e => {
      list.push({
        id: e.id,
        date: e.paymentDate || e.dueDate,
        description: e.description,
        category: e.category,
        type: 'despesa',
        amount: e.amount,
        status: e.status,
        paymentMethod: e.paymentMethod,
      });
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, expenses]);

  // Export Financial CSV
  const handleExportCSV = () => {
    if (activeTab === 'receitas') {
      const headers = ['ID', 'Data', 'Cliente', 'Serviço', 'Valor Bruto (R$)', 'Desconto (R$)', 'Valor Líquido (R$)', 'Valor Recebido (R$)', 'Pendente (R$)', 'Forma Pagamento', 'Status'];
      const rows = filteredPayments.map(p => [
        p.id, formatDateBR(p.date), p.clientName || '', p.serviceName || '',
        p.grossValue.toFixed(2), p.discount.toFixed(2), p.netValue.toFixed(2),
        p.paidAmount.toFixed(2), p.pendingAmount.toFixed(2), p.paymentMethod, p.status
      ]);
      downloadCSV(`receitas_total_beauty_${new Date().toISOString().split('T')[0]}`, headers, rows);
    } else if (activeTab === 'despesas') {
      const headers = ['ID', 'Descrição', 'Categoria', 'Valor (R$)', 'Competência', 'Vencimento', 'Data Pagamento', 'Status', 'Forma Saída', 'Notas'];
      const rows = filteredExpenses.map(e => [
        e.id, e.description, e.category, e.amount.toFixed(2),
        formatDateBR(e.competenceDate), formatDateBR(e.dueDate),
        e.paymentDate ? formatDateBR(e.paymentDate) : '', e.status,
        e.paymentMethod || '', e.notes || ''
      ]);
      downloadCSV(`despesas_total_beauty_${new Date().toISOString().split('T')[0]}`, headers, rows);
    } else {
      const headers = ['Tipo', 'Data', 'Descrição', 'Categoria', 'Valor (R$)', 'Forma', 'Status'];
      const rows = consolidatedStatement.map(item => [
        item.type.toUpperCase(), formatDateBR(item.date), item.description,
        item.category, item.amount.toFixed(2), item.paymentMethod || '', item.status
      ]);
      downloadCSV(`extrato_financeiro_total_beauty_${new Date().toISOString().split('T')[0]}`, headers, rows);
    }
  };

  const handleDeleteExpense = (id: string, desc: string) => {
    if (window.confirm(`Deseja realmente excluir a despesa "${desc}"?`)) {
      deleteExpense(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header Card */}
      <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-tb-rose-primary block mb-1">
            Gestão Financeira Consolidada
          </span>
          <h2 className="font-serif-brand text-3xl font-bold text-tb-brown-dark">
            Fluxo de Caixa & Despesas
          </h2>
          <p className="text-xs text-tb-gray-neutral mt-1">
            Controle de faturamento, recebimentos efetivos, cobranças pendentes e saídas.
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
            onClick={onOpenNewExpense}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-premium transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* Financial Indicators Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Faturamento Bruto */}
        <div className="p-4 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <span className="text-[11px] font-medium text-tb-brown-soft block">Faturamento Bruto</span>
          <div className="text-xl font-bold text-tb-brown-dark mt-1">
            {formatBRL(financialSummary.grossRevenue)}
          </div>
          <p className="text-[10px] text-tb-gray-neutral mt-0.5">
            Descontos: {formatBRL(financialSummary.discountsGiven)}
          </p>
        </div>

        {/* Recebido Efetivo */}
        <div className="p-4 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <span className="text-[11px] font-medium text-emerald-800 block">Efetivamente Recebido</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {formatBRL(financialSummary.receivedAmount)}
          </div>
          <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">
            Entradas no caixa
          </p>
        </div>

        {/* A Receber / Pendente */}
        <div className="p-4 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <span className="text-[11px] font-medium text-amber-800 block">Valores a Receber</span>
          <div className="text-xl font-bold text-amber-700 mt-1">
            {formatBRL(financialSummary.pendingAmount)}
          </div>
          <p className="text-[10px] text-amber-600 mt-0.5">
            Pendentes / A receber
          </p>
        </div>

        {/* Despesas Pagas */}
        <div className="p-4 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <span className="text-[11px] font-medium text-rose-800 block">Despesas Pagas</span>
          <div className="text-xl font-bold text-rose-700 mt-1">
            {formatBRL(financialSummary.paidExpenses)}
          </div>
          <p className="text-[10px] text-rose-600 mt-0.5">
            A pagar: {formatBRL(financialSummary.pendingExpenses)}
          </p>
        </div>

        {/* Resultado Líquido */}
        <div className="p-4 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-tb-rose-primary block">Resultado Líquido</span>
          <div className={`text-xl font-bold mt-1 ${financialSummary.periodNetResult >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatBRL(financialSummary.periodNetResult)}
          </div>
          <p className="text-[10px] text-tb-gray-neutral mt-0.5">
            Recebido - Despesas Pagas
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-tb-ivory p-1.5 rounded-2xl border border-tb-rose-light/50 w-full sm:w-fit">
        {[
          { id: 'receitas', label: `Receitas dos Atendimentos (${payments.length})` },
          { id: 'despesas', label: `Despesas do Salão (${expenses.length})` },
          { id: 'extrato', label: 'Extrato Consolidado' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-tb-white text-tb-brown-dark shadow-sm border border-tb-rose-light/50'
                : 'text-tb-brown-soft hover:text-tb-brown-dark'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-tb-white rounded-2xl p-4 border border-tb-rose-light/40 shadow-soft flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-tb-gray-neutral absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Pesquisar registros..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
          />
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
        >
          <option value="todos">Todos os Status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
          <option value="parcial">Parcial</option>
        </select>

        {activeTab === 'receitas' && (
          <select
            value={filterPaymentMethod}
            onChange={e => setFilterPaymentMethod(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
          >
            <option value="todos">Todas as Formas</option>
            <option value="pix">PIX</option>
            <option value="cartao_credito">Cartão de Crédito</option>
            <option value="cartao_debito">Cartão de Débito</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="transferencia">Transferência</option>
          </select>
        )}
      </div>

      {/* TAB CONTENT: RECEITAS */}
      {activeTab === 'receitas' && (
        <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tb-ivory border-b border-tb-rose-light/40 text-tb-brown-soft font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Cliente / Serviço</th>
                  <th className="px-6 py-4">Valor Bruto</th>
                  <th className="px-6 py-4">Desconto</th>
                  <th className="px-6 py-4">Recebido Efetivo</th>
                  <th className="px-6 py-4">Forma</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-tb-gray-neutral">
                      Nenhuma receita encontrada para os filtros.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(p => (
                    <tr key={p.id} className="hover:bg-tb-ivory/50">
                      <td className="px-6 py-3.5 whitespace-nowrap">{formatDateBR(p.date)}</td>
                      <td className="px-6 py-3.5 font-bold">
                        {p.clientName || 'Cliente Balcão'}
                        <span className="block text-[11px] font-normal text-tb-gray-neutral">{p.serviceName}</span>
                      </td>
                      <td className="px-6 py-3.5">{formatBRL(p.grossValue)}</td>
                      <td className="px-6 py-3.5 text-tb-gray-neutral">{formatBRL(p.discount)}</td>
                      <td className="px-6 py-3.5 font-bold text-emerald-700">{formatBRL(p.paidAmount)}</td>
                      <td className="px-6 py-3.5 uppercase font-medium text-tb-brown-soft">
                        {p.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'pago' ? 'bg-emerald-100 text-emerald-800' :
                          p.status === 'parcial' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DESPESAS */}
      {activeTab === 'despesas' && (
        <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tb-ivory border-b border-tb-rose-light/40 text-tb-brown-soft font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Pagamento</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-tb-gray-neutral">
                      Nenhuma despesa cadastrada nos critérios informados.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-tb-ivory/50">
                      <td className="px-6 py-3.5 whitespace-nowrap">{formatDateBR(e.dueDate)}</td>
                      <td className="px-6 py-3.5 font-bold">
                        {e.description}
                        {e.notes && <span className="block text-[11px] font-normal text-tb-gray-neutral">{e.notes}</span>}
                      </td>
                      <td className="px-6 py-3.5 capitalize">{e.category}</td>
                      <td className="px-6 py-3.5 font-bold text-rose-700">{formatBRL(e.amount)}</td>
                      <td className="px-6 py-3.5">
                        {e.paymentDate ? formatDateBR(e.paymentDate) : 'Pendente'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          e.status === 'pago' ? 'bg-emerald-100 text-emerald-800' :
                          e.status === 'pendente' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onEditExpense(e)}
                            className="p-1.5 text-tb-brown-soft hover:bg-tb-beige-light rounded-lg"
                            title="Editar"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(e.id, e.description)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* TAB CONTENT: EXTRATO CONSOLIDADO */}
      {activeTab === 'extrato' && (
        <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tb-ivory border-b border-tb-rose-light/40 text-tb-brown-soft font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Categoria / Serviço</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
                {consolidatedStatement.map(item => (
                  <tr key={item.id} className="hover:bg-tb-ivory/50">
                    <td className="px-6 py-3.5 whitespace-nowrap">{formatDateBR(item.date)}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.type === 'receita' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.type === 'receita' ? '+ RECEITA' : '- DESPESA'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-bold">{item.description}</td>
                    <td className="px-6 py-3.5 capitalize">{item.category}</td>
                    <td className={`px-6 py-3.5 font-bold text-right ${
                      item.type === 'receita' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {item.type === 'receita' ? `+ ${formatBRL(item.amount)}` : `- ${formatBRL(item.amount)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
