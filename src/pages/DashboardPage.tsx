import React, { useState } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  MessageCircle, 
  Clock, 
  Sparkles, 
  PieChart as PieIcon,
  BarChart3,
  CalendarCheck,
  ChevronRight,
  Plus
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { useData } from '../context/DataContext';
import { formatBRL, formatDateBR } from '../utils/formatters';
import { Appointment, NavigationPage } from '../types';

interface DashboardPageProps {
  onNavigate: (page: NavigationPage) => void;
  onOpenNewAppointment: () => void;
  onOpenWhatsApp: (clientName: string, clientPhone: string, appointment?: any) => void;
  onOpenAppointmentDetails: (appointment: Appointment) => void;
}

const CHART_COLORS = ['#C58F9B', '#8A7064', '#E7D9C8', '#E8CDD2', '#493A35', '#A3B18A'];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenNewAppointment,
  onOpenWhatsApp,
  onOpenAppointmentDetails,
}) => {
  const { dashboardMetrics, financialSummary, appointments, clients, services, payments, expenses } = useData();
  const [chartPeriod, setChartPeriod] = useState<'7dias' | 'mes' | 'tudo'>('mes');

  // Prepare chart data dynamically from real data
  // 1. Revenue over time
  const revenueByDayMap = new Map<string, number>();
  payments.forEach(p => {
    if (p.status === 'pago') {
      const dateKey = formatDateBR(p.date);
      revenueByDayMap.set(dateKey, (revenueByDayMap.get(dateKey) || 0) + p.paidAmount);
    }
  });

  const revenueChartData = Array.from(revenueByDayMap.entries()).map(([data, valor]) => ({
    data,
    faturamento: valor,
  })).slice(-7);

  if (revenueChartData.length === 0) {
    revenueChartData.push({ data: 'Hoje', faturamento: dashboardMetrics.todayReceivedRevenue });
  }

  // 2. Services popularity
  const serviceCountMap = new Map<string, number>();
  appointments.forEach(a => {
    if (a.status !== 'cancelado') {
      serviceCountMap.set(a.serviceName, (serviceCountMap.get(a.serviceName) || 0) + 1);
    }
  });
  const topServicesData = Array.from(serviceCountMap.entries())
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  // 3. Payment methods distribution
  const paymentMethodsMap = new Map<string, number>();
  payments.forEach(p => {
    const methodLabel = p.paymentMethod.replace('_', ' ').toUpperCase();
    paymentMethodsMap.set(methodLabel, (paymentMethodsMap.get(methodLabel) || 0) + p.paidAmount);
  });
  const paymentDistributionData = Array.from(paymentMethodsMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  // 4. Revenue vs Expenses comparison
  const comparisonData = [
    {
      categoria: 'Mês Atual',
      Receitas: dashboardMetrics.monthReceivedRevenue,
      Despesas: dashboardMetrics.monthPaidExpenses,
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-tb-rose-blush via-tb-beige-light to-tb-white p-6 sm:p-8 border border-tb-rose-light/50 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-tb-rose-primary block mb-1">
            Painel Executivo
          </span>
          <h2 className="font-serif-brand text-3xl sm:text-4xl font-bold text-tb-brown-dark leading-tight">
            Bem-vinda à Total Beauty
          </h2>
          <p className="text-xs sm:text-sm text-tb-brown-soft mt-1 max-w-xl">
            Acompanhe em tempo real o fluxo de atendimentos, faturamento realizado e agenda da sua equipe hoje.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => onNavigate('agenda')}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl border border-tb-rose-light bg-tb-white hover:bg-tb-ivory text-xs font-semibold text-tb-brown-dark transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4 text-tb-rose-primary" />
            Ver Agenda Completa
          </button>
          <button
            onClick={onOpenNewAppointment}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] text-xs font-semibold text-white shadow-soft transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (10 Indicadores Reais) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Agendamentos Hoje */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft hover:shadow-premium transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Agendamentos Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-tb-brown-dark">
            {dashboardMetrics.todayAppointmentsCount}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            {dashboardMetrics.todayCompletedCount} concluídos hoje
          </p>
        </div>

        {/* Card 2: Atendimentos Concluídos */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft hover:shadow-premium transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Atendimentos Concluídos</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-tb-brown-dark">
            {dashboardMetrics.todayCompletedCount}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1 font-medium">
            Hoje no salão
          </p>
        </div>

        {/* Card 3: Total Clientes */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft hover:shadow-premium transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Total de Clientes</span>
            <div className="w-8 h-8 rounded-lg bg-tb-beige-light text-tb-brown-dark flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-tb-brown-dark">
            {dashboardMetrics.totalActiveClients}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Cadastros ativos
          </p>
        </div>

        {/* Card 4: Faturamento do Dia */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft hover:shadow-premium transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Faturamento Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {formatBRL(dashboardMetrics.todayReceivedRevenue)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Recebido efetivamente
          </p>
        </div>

        {/* Card 5: Faturamento do Mês */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft hover:shadow-premium transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Faturamento Mês</span>
            <div className="w-8 h-8 rounded-lg bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-tb-rose-primary">
            {formatBRL(dashboardMetrics.monthReceivedRevenue)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Bruto: {formatBRL(dashboardMetrics.monthGrossRevenue)}
          </p>
        </div>

        {/* Card 6: Despesas do Mês */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft hover:shadow-premium transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Despesas Mês</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700">
            {formatBRL(dashboardMetrics.monthPaidExpenses)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Custos pagos
          </p>
        </div>

        {/* Card 7: Resultado Líquido */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft hover:shadow-premium transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Resultado do Mês</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${dashboardMetrics.monthNetResult >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatBRL(dashboardMetrics.monthNetResult)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Receitas - Despesas
          </p>
        </div>

        {/* Card 8: Ticket Médio */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft hover:shadow-premium transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Ticket Médio</span>
            <div className="w-8 h-8 rounded-lg bg-tb-beige-champagne/40 text-tb-brown-dark flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-tb-brown-dark">
            {formatBRL(dashboardMetrics.averageTicket)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Por cliente atendida
          </p>
        </div>

        {/* Card 9: Taxa de Ocupação */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft hover:shadow-premium transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Ocupação Agenda</span>
            <div className="w-8 h-8 rounded-lg bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-tb-brown-dark">
            {dashboardMetrics.occupancyRatePercentage}%
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Capacidade diária ocupada
          </p>
        </div>

        {/* Card 10: Valores a Receber */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft hover:shadow-premium transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">A Receber</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {formatBRL(financialSummary.pendingAmount)}
          </div>
          <p className="text-[11px] text-amber-600 mt-1 font-medium">
            Pagamentos pendentes
          </p>
        </div>
      </div>

      {/* Main Grid: Agenda Resumida de Hoje + Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Agenda Resumida de Hoje */}
        <div className="lg:col-span-1 bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                Agenda de Hoje
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                Próximos atendimentos programados
              </p>
            </div>
            <button
              onClick={() => onNavigate('agenda')}
              className="text-xs text-tb-rose-primary hover:text-tb-brown-dark font-medium flex items-center gap-1"
            >
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[460px]">
            {dashboardMetrics.upcomingTodayAppointments.length === 0 ? (
              <div className="p-8 text-center bg-tb-ivory rounded-2xl border border-tb-rose-light/30">
                <Calendar className="w-8 h-8 text-tb-gray-neutral/60 mx-auto mb-2" />
                <p className="text-xs font-semibold text-tb-brown-dark">Nenhum compromisso agendado para hoje.</p>
                <p className="text-[11px] text-tb-gray-neutral mt-1">
                  Clique abaixo para agendar a primeira cliente do dia.
                </p>
                <button
                  onClick={onOpenNewAppointment}
                  className="mt-3 px-4 py-2 text-xs font-medium bg-tb-rose-primary text-white rounded-xl"
                >
                  Agendar Horário
                </button>
              </div>
            ) : (
              dashboardMetrics.upcomingTodayAppointments.map(apt => (
                <div
                  key={apt.id}
                  className="p-3.5 rounded-2xl bg-tb-ivory border border-tb-rose-light/40 hover:border-tb-rose-primary/50 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 py-1 px-1.5 rounded-xl bg-tb-white border border-tb-rose-light text-center shadow-2xs">
                      <span className="text-xs font-bold text-tb-brown-dark block">
                        {apt.startTime}
                      </span>
                      <span className="text-[10px] text-tb-gray-neutral block">
                        {apt.endTime}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-tb-brown-dark group-hover:text-tb-rose-primary transition-colors">
                        {apt.clientName}
                      </p>
                      <p className="text-[11px] text-tb-brown-soft mt-0.5">
                        {apt.serviceName} • com {apt.professionalName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                          apt.status === 'confirmado' ? 'bg-emerald-100 text-emerald-800' :
                          apt.status === 'em_atendimento' ? 'bg-amber-100 text-amber-800' :
                          apt.status === 'concluido' ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {apt.status}
                        </span>
                        <span className="text-[10px] font-semibold text-tb-gray-neutral">
                          {formatBRL(apt.price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenWhatsApp(apt.clientName, apt.clientPhone, {
                        date: apt.date,
                        time: apt.startTime,
                        service: apt.serviceName,
                        professional: apt.professionalName,
                        price: apt.price,
                      })}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                      title="Conversar no WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onOpenAppointmentDetails(apt)}
                      className="p-2 text-tb-brown-soft hover:bg-tb-beige-light rounded-xl transition-colors"
                      title="Ver Detalhes"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: 2 Main Interactive Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: Faturamento no Tempo */}
          <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                  Evolução do Faturamento
                </h3>
                <p className="text-xs text-tb-gray-neutral">
                  Recebimentos efetivos registrados
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-tb-rose-blush text-tb-rose-primary font-semibold">
                Total: {formatBRL(financialSummary.receivedAmount)}
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C58F9B" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#C58F9B" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5EFE7" vertical={false} />
                  <XAxis dataKey="data" stroke="#817A77" fontSize={11} tickLine={false} />
                  <YAxis stroke="#817A77" fontSize={11} tickLine={false} />
                  <Tooltip 
                    formatter={(val: any) => [formatBRL(Number(val)), 'Faturamento']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E8CDD2', backgroundColor: '#FFFFFF' }}
                  />
                  <Area type="monotone" dataKey="faturamento" stroke="#C58F9B" strokeWidth={3} fillOpacity={1} fill="url(#roseGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Serviços Mais Realizados & Formas de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Serviços Mais Realizados */}
            <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft">
              <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark mb-1">
                Serviços Mais Realizados
              </h3>
              <p className="text-xs text-tb-gray-neutral mb-3">Volume de agendamentos</p>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topServicesData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F5EFE7" />
                    <XAxis type="number" stroke="#817A77" fontSize={10} allowDecimals={false} />
                    <YAxis dataKey="nome" type="category" stroke="#817A77" fontSize={10} width={90} tick={{ fill: '#493A35' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E8CDD2' }} />
                    <Bar dataKey="quantidade" fill="#C58F9B" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Formas de Pagamento */}
            <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft">
              <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark mb-1">
                Formas de Pagamento
              </h3>
              <p className="text-xs text-tb-gray-neutral mb-3">Distribuição das receitas</p>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentDistributionData.length > 0 ? paymentDistributionData : [{ name: 'Sem dados', value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {paymentDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [formatBRL(Number(val)), 'Total']} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
