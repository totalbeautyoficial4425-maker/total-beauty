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
  Plus,
  Cake,
  Gift,
  Package,
  AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  formatBRL, 
  formatDateBR, 
  isClientBirthdayToday, 
  isClientBirthdayThisMonth, 
  formatBirthdayDayMonth,
  parseBirthMonthDay
} from '../utils/formatters';
import { Appointment, NavigationPage } from '../types';

interface DashboardPageProps {
  onNavigate: (page: NavigationPage) => void;
  onOpenNewAppointment: () => void;
  onOpenWhatsApp: (clientName: string, clientPhone: string, appointment?: any, templateKey?: any) => void;
  onOpenAppointmentDetails: (appointment: Appointment) => void;
}

const CHART_COLORS = ['#C58F9B', '#8A7064', '#E7D9C8', '#E8CDD2', '#493A35', '#A3B18A'];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenNewAppointment,
  onOpenWhatsApp,
  onOpenAppointmentDetails,
}) => {
  const { currentUser } = useAuth();
  const { 
    dashboardMetrics, 
    financialSummary, 
    appointments, 
    clients, 
    services, 
    payments, 
    expenses,
    professionals,
    getProfessionalMetrics,
    lowStockCount,
    outOfStockCount
  } = useData();

  // Filter clients by birthdays
  const birthdayClientsToday = clients.filter(c => isClientBirthdayToday(c.birthDate));
  const birthdayClientsThisMonth = clients.filter(c => isClientBirthdayThisMonth(c.birthDate));
  const upcomingMonthBirthdays = birthdayClientsThisMonth
    .map(c => {
      const parsed = parseBirthMonthDay(c.birthDate);
      return { client: c, day: parsed?.day || 0 };
    })
    .sort((a, b) => a.day - b.day);

  // If logged in as professional, render individual private dashboard
  if (currentUser?.role === 'profissional') {
    const prof = professionals.find(p => 
      p.id === currentUser.professionalId || 
      p.userId === currentUser.id || 
      p.name.toLowerCase() === currentUser.name.toLowerCase()
    );
    const profId = prof?.id || currentUser.professionalId || '';
    const myMetrics = getProfessionalMetrics(profId);
    const today = new Date().toISOString().split('T')[0];
    const allTodayAppointments = appointments
      .filter(a => a.date === today && !['cancelado', 'nao_compareceu'].includes(a.status))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <div className="space-y-8 animate-fade-in pb-12">
        {/* Welcome Banner for Professional */}
        <div className="rounded-3xl bg-gradient-to-r from-tb-rose-blush via-tb-beige-light to-tb-white p-6 sm:p-8 border border-tb-rose-light/50 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-widest text-tb-rose-primary">
                Painel da Profissional
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-tb-rose-primary text-white">
                {prof?.specialty || 'Especialista'}
              </span>
            </div>
            <h2 className="font-serif-brand text-3xl sm:text-4xl font-bold text-tb-brown-dark leading-tight">
              Olá, {currentUser.name}!
            </h2>
            <p className="text-xs sm:text-sm text-tb-brown-soft mt-1 max-w-xl">
              Aqui está a sua contabilidade particular, comissões do dia e a agenda de atendimentos do salão.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => onNavigate('agenda')}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl border border-tb-rose-light bg-tb-white hover:bg-tb-ivory text-xs font-semibold text-tb-brown-dark transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4 text-tb-rose-primary" />
              Agenda Geral do Salão
            </button>
            <button
              onClick={() => onNavigate('minha-producao')}
              className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] text-xs font-semibold text-white shadow-soft transition-all flex items-center justify-center gap-2"
            >
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
              Minha Produção Completa
            </button>
          </div>
        </div>

        {/* Banner Aniversariantes de Hoje para a Profissional */}
        {birthdayClientsToday.length > 0 && (
          <div className="rounded-3xl bg-gradient-to-r from-pink-500/10 via-rose-50 to-amber-50/60 p-5 sm:p-6 border border-pink-200/80 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 text-white flex items-center justify-center shadow-sm">
                  <Cake className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif-brand text-base sm:text-lg font-bold text-tb-brown-dark">
                      🎂 Aniversariantes do Dia ({birthdayClientsToday.length})
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                      Felicitações
                    </span>
                  </div>
                  <p className="text-xs text-tb-brown-soft">
                    Envie os parabéns para as clientes da Total Beauty e torne o dia delas especial!
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {birthdayClientsToday.map(c => (
                <div key={c.id} className="bg-white/95 rounded-2xl p-3 border border-pink-100 shadow-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-tb-brown-dark truncate">{c.name}</p>
                    <p className="text-[11px] text-tb-gray-neutral">{c.phone}</p>
                  </div>
                  <button
                    onClick={() => onOpenWhatsApp(c.name, c.phone, { isBirthday: true }, 'aniversario')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-sm transition-all shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Parabenizar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4 Cards de Métricas Particulares da Profissional (Pagamento Diário) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Comissão a Pagar Hoje */}
          <div className="p-5 rounded-2xl bg-tb-white border-2 border-emerald-300 shadow-soft hover:shadow-premium transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Comissão a Pagar Hoje</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-700">
              {formatBRL(myMetrics.todayCommissions)}
            </div>
            <p className="text-[11px] text-emerald-800 mt-1 font-medium">
              ✓ Liberado para pagamento diário
            </p>
          </div>

          {/* Card 2: Valor Bruto Produzido Hoje */}
          <div className="p-5 rounded-2xl bg-tb-white border border-tb-rose-light/60 shadow-soft hover:shadow-premium transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-tb-brown-soft">Produção Bruta Hoje</span>
              <div className="w-9 h-9 rounded-xl bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-tb-brown-dark">
              {formatBRL(myMetrics.todayGross)}
            </div>
            <p className="text-[11px] text-tb-gray-neutral mt-1">
              Base líquida cliente: {formatBRL(myMetrics.todayNet)}
            </p>
          </div>

          {/* Card 3: Minha Produção no Mês */}
          <div className="p-5 rounded-2xl bg-tb-white border border-tb-rose-light/60 shadow-soft hover:shadow-premium transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-tb-brown-soft">Minha Comissão no Mês</span>
              <div className="w-9 h-9 rounded-xl bg-tb-beige-light text-tb-brown-dark flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-tb-brown-dark">
              {formatBRL(myMetrics.monthCommissions)}
            </div>
            <p className="text-[11px] text-tb-gray-neutral mt-1">
              Bruto mês: {formatBRL(myMetrics.monthGross)}
            </p>
          </div>

          {/* Card 4: Meus Atendimentos Hoje */}
          <div className="p-5 rounded-2xl bg-tb-white border border-tb-rose-light/60 shadow-soft hover:shadow-premium transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-tb-brown-soft">Meus Atendimentos Hoje</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-900">
              {myMetrics.todayCompletedCount} / {myMetrics.todayAppointments.length}
            </div>
            <p className="text-[11px] text-tb-gray-neutral mt-1">
              {myMetrics.todayCompletedCount} concluídos hoje
            </p>
          </div>
        </div>

        {/* Grid de 2 Colunas: Meus Atendimentos vs Agenda Geral do Salão */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna 1: Meus Atendimentos Hoje */}
          <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-tb-rose-light/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                    Meus Agendamentos de Hoje
                  </h3>
                  <p className="text-[11px] text-tb-gray-neutral">
                    Clientes sob sua responsabilidade hoje
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-tb-rose-blush text-tb-rose-primary">
                {myMetrics.todayAppointments.length} cliente(s)
              </span>
            </div>

            <div className="space-y-2.5">
              {myMetrics.todayAppointments.length === 0 ? (
                <div className="p-8 text-center bg-tb-ivory/50 rounded-2xl border border-tb-rose-light/30 text-xs text-tb-gray-neutral">
                  Você não tem clientes agendadas para hoje.
                </div>
              ) : (
                myMetrics.todayAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-2xl bg-tb-ivory border border-tb-rose-light/40 flex items-center justify-between gap-3 hover:shadow-soft transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center px-2.5 py-1 bg-tb-white rounded-xl border border-tb-rose-light/40">
                        <span className="text-xs font-bold text-tb-brown-dark block">{apt.startTime}</span>
                        <span className="text-[10px] text-tb-gray-neutral block">{apt.endTime}</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-tb-brown-dark flex items-center gap-2">
                          <span>{apt.clientName}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            apt.status === 'concluido' ? 'bg-purple-100 text-purple-700' :
                            apt.status === 'em_atendimento' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                            apt.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {apt.status === 'em_atendimento' ? 'Em atendimento' :
                             apt.status === 'concluido' ? 'Concluído' :
                             apt.status === 'confirmado' ? 'Confirmado' : 'Agendado'}
                          </span>
                        </div>
                        <span className="text-[11px] text-tb-brown-soft block mt-0.5">
                          {apt.serviceName} • {formatBRL(apt.price)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenWhatsApp(apt.clientName, apt.clientPhone, apt)}
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        title="Conversar no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Coluna 2: Agenda Geral do Salão (Hoje) */}
          <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-tb-rose-light/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-tb-beige-light text-tb-brown-dark flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                    Agenda Geral do Salão (Hoje)
                  </h3>
                  <p className="text-[11px] text-tb-gray-neutral">
                    Movimento de clientes e quem vai atender
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('agenda')}
                className="text-xs text-tb-rose-primary hover:underline font-semibold flex items-center gap-1"
              >
                Ver tudo <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {allTodayAppointments.length === 0 ? (
                <div className="p-8 text-center bg-tb-ivory/50 rounded-2xl border border-tb-rose-light/30 text-xs text-tb-gray-neutral">
                  Nenhum agendamento registrado no salão para hoje.
                </div>
              ) : (
                allTodayAppointments.map(apt => {
                  const isMine = apt.professionalId === profId;
                  return (
                    <div
                      key={apt.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isMine
                          ? 'bg-tb-rose-blush/40 border-tb-rose-light/80'
                          : 'bg-tb-ivory border-tb-rose-light/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-tb-brown-dark w-12 text-center bg-tb-white py-1 rounded-lg border border-tb-rose-light/30">
                          {apt.startTime}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-tb-brown-dark flex items-center gap-2">
                            <span>{apt.clientName}</span>
                            <span className="text-[10px] text-tb-gray-neutral font-normal">
                              ({apt.serviceName})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isMine 
                                ? 'bg-tb-rose-primary text-white' 
                                : 'bg-tb-beige-champagne text-tb-brown-dark'
                            }`}>
                              Atende: {apt.professionalName} {isMine ? '★ (Você)' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        apt.status === 'concluido' ? 'bg-purple-100 text-purple-700' :
                        apt.status === 'em_atendimento' ? 'bg-amber-100 text-amber-700' :
                        apt.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {apt.status === 'em_atendimento' ? 'Em atendimento' :
                         apt.status === 'concluido' ? 'Concluído' :
                         apt.status === 'confirmado' ? 'Confirmado' : 'Agendado'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Tabela de Comissões e Repasses Transparentes da Profissional */}
        <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
          <div className="p-5 bg-tb-ivory border-b border-tb-rose-light/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase font-bold tracking-widest text-tb-rose-primary">
                  Transparência de Repasse
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Cálculo Aberto
                </span>
              </div>
              <h3 className="font-serif-brand text-lg sm:text-xl font-bold text-tb-brown-dark">
                Seus Atendimentos Recentes & Repasses Líquidos
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                Fórmula transparente: Valor Bruto − Desconto = Base × Sua Comissão % = Seu Repasse
              </p>
            </div>

            <button
              onClick={() => onNavigate('minha-producao')}
              className="text-xs text-tb-rose-primary hover:underline font-semibold flex items-center gap-1"
            >
              Extrato completo <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tb-ivory/60 text-tb-brown-soft font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Serviço</th>
                  <th className="px-4 py-3 text-right">Valor Bruto</th>
                  <th className="px-4 py-3 text-right">Desconto</th>
                  <th className="px-4 py-3 text-right">Valor Final (Base)</th>
                  <th className="px-4 py-3 text-center">% Repasse</th>
                  <th className="px-4 py-3 text-right">Sua Comissão</th>
                  <th className="px-4 py-3 text-center">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
                {myMetrics.myTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-tb-gray-neutral">
                      Nenhum atendimento liquidado registrado até o momento.
                    </td>
                  </tr>
                ) : (
                  myMetrics.myTransactions.slice(0, 6).map(tx => {
                    const gross = tx.grossValue || tx.netValue;
                    const disc = tx.discount || 0;
                    const discPct = tx.discountPercentage || (gross > 0 && disc > 0 ? Math.round((disc / gross) * 100) : 0);

                    return (
                      <tr key={tx.id} className="hover:bg-tb-ivory/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-medium">{formatDateBR(tx.date)}</td>
                        <td className="px-4 py-3 font-bold">{tx.clientName || 'Cliente'}</td>
                        <td className="px-4 py-3 text-tb-brown-soft max-w-[160px] truncate">{tx.serviceName || tx.description}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatBRL(gross)}</td>
                        <td className="px-4 py-3 text-right text-rose-700 font-medium">
                          {disc > 0 ? (
                            <span>-{formatBRL(disc)} <span className="text-[10px] text-rose-600 font-normal">({discPct}%)</span></span>
                          ) : (
                            <span className="text-tb-gray-neutral/60">R$ 0,00</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">{formatBRL(tx.netValue)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tb-beige-light text-tb-brown-dark">
                            {tx.commissionPercentage || 50}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                          +{formatBRL(tx.commissionAmount || 0)}
                        </td>
                        <td className="px-4 py-3 text-center">
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

        {/* Rodapé: Atalho para Minha Produção */}
        <div className="rounded-3xl bg-tb-white border border-tb-rose-light/60 p-6 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                Extrato Detalhado de Comissões & Serviços
              </h4>
              <p className="text-xs text-tb-brown-soft">
                Consulte o percentual de comissão de cada atendimento, filtre por data e exporte seu recibo.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('minha-producao')}
            className="px-5 py-2.5 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs font-semibold shadow-soft transition-all shrink-0 flex items-center gap-2"
          >
            Abrir Minha Produção Completa
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const [chartPeriod, setChartPeriod] = useState<'7dias' | 'mes' | 'tudo'>('mes');
  const today = new Date().toISOString().split('T')[0];

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

      {/* Banner Comemorativo: Aniversariantes de Hoje */}
      {birthdayClientsToday.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-pink-50 via-rose-50/80 to-amber-50/60 p-6 border-2 border-pink-200/90 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 text-white flex items-center justify-center shadow-md animate-pulse shrink-0">
                <Cake className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                    🎂 Aniversariantes de Hoje ({birthdayClientsToday.length})
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pink-500 text-white shadow-sm">
                    Hoje é dia de festa!
                  </span>
                </div>
                <p className="text-xs text-tb-brown-soft mt-0.5">
                  Parabenize via WhatsApp com 1 clique usando a mensagem personalizada do salão.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('aniversariantes')}
              className="text-xs text-tb-rose-primary hover:underline font-semibold flex items-center gap-1 shrink-0"
            >
              Ver todos aniversariantes <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {birthdayClientsToday.map(c => (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-4 border border-pink-200/80 shadow-sm flex items-center justify-between gap-3 hover:border-pink-300 transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🎉</span>
                    <p className="text-sm font-bold text-tb-brown-dark truncate">{c.name}</p>
                  </div>
                  <p className="text-xs text-tb-gray-neutral mt-0.5">{c.phone}</p>
                </div>
                <button
                  onClick={() => onOpenWhatsApp(c.name, c.phone, { isBirthday: true }, 'aniversario')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-all shrink-0"
                  title="Enviar parabéns pelo WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  Parabenizar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banner Alerta de Reposição de Estoque do Salão */}
      {(lowStockCount + outOfStockCount > 0) && (
        <div className="rounded-3xl bg-gradient-to-r from-amber-50 via-orange-50/70 to-rose-50/50 p-5 sm:p-6 border-2 border-amber-300/80 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                  Alerta de Estoque: Reposição Necessária
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-sm">
                  {lowStockCount + outOfStockCount} {lowStockCount + outOfStockCount === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-xs text-tb-brown-soft mt-0.5">
                {outOfStockCount > 0 ? `${outOfStockCount} esgotado(s) e ` : ''}
                {lowStockCount} produto(s) atingiram a quantidade mínima (tintas, descolorantes, progressivas, etc.).
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('estoque')}
            className="px-4 py-2.5 rounded-xl bg-tb-brown-dark hover:bg-tb-brown-primary text-white text-xs font-semibold flex items-center gap-2 shadow-soft hover:shadow transition-all shrink-0"
          >
            <Package className="w-4 h-4 text-amber-400" />
            Gerenciar Estoque & Compras
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

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

        {/* Card: Comissões a Pagar Hoje (Pagamento Diário) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border-2 border-emerald-300/80 shadow-soft hover:shadow-premium transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Comissões a Pagar Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">
            {formatBRL(dashboardMetrics.todayCommissionsToPay)}
          </div>
          <p className="text-[11px] text-emerald-800 mt-1 font-medium">
            Pagamento diário das profissionais
          </p>
        </div>

        {/* Card: Salão Líquido Hoje */}
        <div className="p-4 sm:p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft hover:shadow-premium transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-tb-brown-soft">Salão Líquido Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-tb-brown-dark">
            {formatBRL(dashboardMetrics.todaySalonNet)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Faturamento − Comissões
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

      {/* Módulo Especial: Fechamento Diário de Profissionais (Pagamento de Hoje) */}
      <div className="bg-tb-white rounded-3xl border-2 border-emerald-300/90 shadow-premium overflow-hidden">
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-50 via-tb-ivory to-tb-white border-b border-emerald-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
              <DollarSign className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-brand text-xl sm:text-2xl font-bold text-tb-brown-dark">
                  Fechamento Diário de Profissionais
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                  Pagamento de Hoje ({formatDateBR(today)})
                </span>
              </div>
              <p className="text-xs text-tb-brown-soft mt-0.5">
                Cálculo instantâneo atualizado em tempo real assim que cada comanda é recebida.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-emerald-300 shadow-xs">
            <span className="text-xs text-tb-brown-soft font-semibold">Total a Repassar Hoje:</span>
            <span className="text-2xl font-extrabold text-emerald-700">
              {formatBRL(dashboardMetrics.todayCommissionsToPay)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-tb-ivory/80 text-tb-brown-soft font-semibold uppercase tracking-wider border-b border-tb-rose-light/40">
              <tr>
                <th className="px-5 py-3.5">Profissional</th>
                <th className="px-5 py-3.5 text-center">Atendimentos Hoje</th>
                <th className="px-5 py-3.5 text-right">Produção Bruta Hoje</th>
                <th className="px-5 py-3.5 text-right">Descontos</th>
                <th className="px-5 py-3.5 text-right">Base Líquida</th>
                <th className="px-5 py-3.5 text-center">% Repasse</th>
                <th className="px-5 py-3.5 text-right">Comissão a Pagar Hoje</th>
                <th className="px-5 py-3.5 text-right">Retenção Salão</th>
                <th className="px-5 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
              {professionals.filter(p => p.isActive).map(prof => {
                const metrics = getProfessionalMetrics(prof.id);
                const hasProduction = metrics.todayGross > 0 || metrics.todayCommissions > 0;
                const salonRetained = Math.max(0, metrics.todayNet - metrics.todayCommissions);
                const avgPercent = prof.commissionPercentage || 50;

                return (
                  <tr key={prof.id} className={`hover:bg-tb-ivory/60 transition-colors ${hasProduction ? 'bg-emerald-50/25' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs"
                          style={{ backgroundColor: prof.color || '#C58F9B' }}
                        >
                          {prof.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-tb-brown-dark text-xs">{prof.name}</p>
                          <p className="text-[10px] text-tb-gray-neutral">{prof.specialty}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        metrics.todayCompletedCount > 0 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {metrics.todayCompletedCount} concluído(s)
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right font-semibold text-tb-brown-dark">
                      {formatBRL(metrics.todayGross)}
                    </td>

                    <td className="px-5 py-3.5 text-right text-rose-700 font-medium">
                      {metrics.todayGross - metrics.todayNet > 0 ? (
                        `-${formatBRL(metrics.todayGross - metrics.todayNet)}`
                      ) : (
                        <span className="text-tb-gray-neutral/60">R$ 0,00</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right font-medium text-tb-brown-dark">
                      {formatBRL(metrics.todayNet)}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tb-beige-light text-tb-brown-dark">
                        {avgPercent}%
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <span className={`text-sm font-extrabold px-3 py-1 rounded-xl ${
                        metrics.todayCommissions > 0 
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs' 
                          : 'text-gray-400'
                      }`}>
                        {formatBRL(metrics.todayCommissions)}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right font-medium text-tb-brown-soft">
                      {formatBRL(salonRetained)}
                    </td>

                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {metrics.todayCommissions > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Pronto para Pagamento Diário
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                          Sem produção hoje
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-tb-ivory border-t-2 border-emerald-200 text-tb-brown-dark font-bold">
              <tr>
                <td className="px-5 py-3.5">TOTAL GERAL DO DIA</td>
                <td className="px-5 py-3.5 text-center">
                  {dashboardMetrics.todayCompletedCount} atendimentos
                </td>
                <td className="px-5 py-3.5 text-right">
                  {formatBRL(dashboardMetrics.todayGrossRevenue)}
                </td>
                <td className="px-5 py-3.5 text-right text-rose-700">
                  -{formatBRL(Math.max(0, dashboardMetrics.todayGrossRevenue - dashboardMetrics.todayReceivedRevenue))}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {formatBRL(dashboardMetrics.todayReceivedRevenue)}
                </td>
                <td className="px-5 py-3.5 text-center">—</td>
                <td className="px-5 py-3.5 text-right text-emerald-800 text-base font-extrabold">
                  {formatBRL(dashboardMetrics.todayCommissionsToPay)}
                </td>
                <td className="px-5 py-3.5 text-right text-tb-brown-dark">
                  {formatBRL(dashboardMetrics.todaySalonNet)}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="text-[10px] text-emerald-800 uppercase font-extrabold tracking-wider bg-emerald-100 px-2 py-1 rounded-lg">
                    Fechamento Diário
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Main Grid: Agenda Resumida de Hoje + Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Agenda Resumida de Hoje + Aniversariantes do Mês */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card: Agenda Resumida de Hoje */}
          <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft flex flex-col">
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

          {/* Card: Aniversariantes do Mês */}
          <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-tb-rose-light/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                  <Cake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                    Aniversariantes do Mês
                  </h3>
                  <p className="text-[11px] text-tb-gray-neutral">
                    {birthdayClientsThisMonth.length} clientes comemorando este mês
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('aniversariantes')}
                className="text-xs text-tb-rose-primary hover:underline font-semibold flex items-center gap-1"
              >
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {birthdayClientsThisMonth.length === 0 ? (
                <div className="p-6 text-center bg-tb-ivory/50 rounded-2xl border border-tb-rose-light/30 text-xs text-tb-gray-neutral">
                  Nenhum cliente cadastrado faz aniversário neste mês.
                </div>
              ) : (
                upcomingMonthBirthdays.map(({ client: c, day }) => {
                  const isToday = isClientBirthdayToday(c.birthDate);
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                        isToday
                          ? 'bg-pink-50/70 border-pink-300 shadow-2xs'
                          : 'bg-tb-ivory/70 border-tb-rose-light/40 hover:bg-tb-ivory'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`text-xs font-bold w-14 text-center py-1 rounded-lg border shrink-0 ${
                          isToday
                            ? 'bg-pink-500 text-white border-pink-500 font-extrabold animate-pulse'
                            : 'bg-tb-white text-tb-brown-dark border-tb-rose-light/40'
                        }`}>
                          Dia {day}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-tb-brown-dark truncate flex items-center gap-1.5">
                            <span className="truncate">{c.name}</span>
                            {isToday && (
                              <span className="text-[9px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                                Hoje!
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-tb-gray-neutral truncate">{c.phone}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => onOpenWhatsApp(c.name, c.phone, { isBirthday: true }, 'aniversario')}
                        className={`p-2 rounded-xl transition-all shrink-0 ${
                          isToday
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xs'
                            : 'bg-tb-white hover:bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}
                        title="Enviar parabéns pelo WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
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

      {/* Tabela de Transparência Financeira: Serviços, Descontos e Repasses a Profissionais */}
      <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
        <div className="p-6 bg-tb-ivory border-b border-tb-rose-light/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-tb-rose-primary">
                Auditoria & Gestão de Repasses
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Transparência Salão & Profissionais
              </span>
            </div>
            <h3 className="font-serif-brand text-2xl font-bold text-tb-brown-dark">
              Demonstrativo de Serviços, Descontos e Repasses
            </h3>
            <p className="text-xs text-tb-gray-neutral mt-0.5">
              Fórmula de conferência: Valor Bruto − Desconto = Base de Cálculo → Repasse Líquido da Profissional (% e R$) e Retenção do Salão
            </p>
          </div>

          <button
            onClick={() => onNavigate('financeiro')}
            className="px-4 py-2.5 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs font-semibold shadow-soft transition-all flex items-center gap-2 shrink-0"
          >
            <DollarSign className="w-4 h-4" />
            Abrir Financeiro Completo
          </button>
        </div>

        {/* 5 Cards de Resumo da Regra */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-6 bg-tb-white border-b border-tb-rose-light/30">
          <div className="p-3.5 rounded-2xl bg-tb-ivory border border-tb-rose-light/40">
            <span className="text-[11px] font-semibold text-tb-brown-soft block">Faturamento Bruto</span>
            <span className="text-lg font-bold text-tb-brown-dark block mt-0.5">
              {formatBRL(payments.reduce((acc, p) => acc + (p.grossValue || p.netValue), 0))}
            </span>
            <span className="text-[10px] text-tb-gray-neutral">Sem descontos</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/60">
            <span className="text-[11px] font-semibold text-rose-700 block">Descontos Totais</span>
            <span className="text-lg font-bold text-rose-800 block mt-0.5">
              -{formatBRL(payments.reduce((acc, p) => acc + (p.discount || 0), 0))}
            </span>
            <span className="text-[10px] text-rose-600">Concedidos a clientes</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-tb-beige-light/50 border border-tb-rose-light/40">
            <span className="text-[11px] font-semibold text-tb-brown-soft block">Base Líquida</span>
            <span className="text-lg font-bold text-tb-brown-dark block mt-0.5">
              {formatBRL(payments.reduce((acc, p) => acc + p.netValue, 0))}
            </span>
            <span className="text-[10px] text-tb-gray-neutral">Bruto − Descontos</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60">
            <span className="text-[11px] font-semibold text-emerald-700 block">Repasses Profissionais</span>
            <span className="text-lg font-bold text-emerald-800 block mt-0.5">
              {formatBRL(payments.reduce((acc, p) => acc + (p.commissionAmount || 0), 0))}
            </span>
            <span className="text-[10px] text-emerald-600">Comissões individuais</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-tb-rose-blush/60 border border-tb-rose-light/70 col-span-2 lg:col-span-1">
            <span className="text-[11px] font-semibold text-tb-rose-primary block">Retenção Salão</span>
            <span className="text-lg font-bold text-tb-brown-dark block mt-0.5">
              {formatBRL(payments.reduce((acc, p) => acc + Math.max(0, p.netValue - (p.commissionAmount || 0)), 0))}
            </span>
            <span className="text-[10px] text-tb-brown-soft">Margem operacional</span>
          </div>
        </div>

        {/* Formula Callout */}
        <div className="px-6 py-3 bg-tb-rose-blush/20 border-b border-tb-rose-light/30 flex items-center gap-2 text-xs text-tb-brown-dark">
          <Sparkles className="w-4 h-4 text-tb-rose-primary shrink-0" />
          <span>
            <strong>Regra de Negócio:</strong> A comissão de cada profissional incide sobre o valor após os descontos. Exemplo: Serviço de R$ 200 − 10% desc (R$ 20) = R$ 180 base. Com 40% de comissão = R$ 72 para a profissional e R$ 108 de retenção do salão.
          </span>
        </div>

        {/* Table of Latest Service Transactions with Full Breakdown */}
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-tb-ivory text-tb-brown-soft font-semibold uppercase tracking-wider sticky top-0 z-10 border-b border-tb-rose-light/40">
              <tr>
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Profissional</th>
                <th className="px-5 py-3.5">Serviço</th>
                <th className="px-5 py-3.5 text-right">Valor Bruto</th>
                <th className="px-5 py-3.5 text-right">Desconto</th>
                <th className="px-5 py-3.5 text-right">Valor Final (Base)</th>
                <th className="px-5 py-3.5 text-center">% Repasse</th>
                <th className="px-5 py-3.5 text-right">Repasse Prof.</th>
                <th className="px-5 py-3.5 text-right">Salão</th>
                <th className="px-5 py-3.5 text-center">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-tb-gray-neutral">
                    Nenhum pagamento registrado até o momento.
                  </td>
                </tr>
              ) : (
                payments.slice(0, 15).map(p => {
                  const gross = p.grossValue || p.netValue;
                  const disc = p.discount || 0;
                  const discPct = p.discountPercentage || (gross > 0 && disc > 0 ? Math.round((disc / gross) * 100) : 0);
                  const salonAmount = Math.max(0, p.netValue - (p.commissionAmount || 0));

                  return (
                    <tr key={p.id} className="hover:bg-tb-ivory/50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap font-medium">{formatDateBR(p.date)}</td>
                      <td className="px-5 py-3 font-bold">{p.clientName || 'Cliente'}</td>
                      <td className="px-5 py-3">
                        <span className="font-semibold text-tb-rose-primary bg-tb-rose-blush px-2 py-0.5 rounded-full text-[11px]">
                          {p.professionalName || 'Profissional'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-tb-brown-soft max-w-[160px] truncate">{p.serviceName || p.description}</td>
                      <td className="px-5 py-3 text-right font-medium">{formatBRL(gross)}</td>
                      <td className="px-5 py-3 text-right text-rose-700 font-medium">
                        {disc > 0 ? (
                          <span>-{formatBRL(disc)} <span className="text-[10px] text-rose-600 font-normal">({discPct}%)</span></span>
                        ) : (
                          <span className="text-tb-gray-neutral/60">R$ 0,00</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-bold">{formatBRL(p.netValue)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tb-beige-light text-tb-brown-dark">
                          {p.commissionPercentage || 50}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                        +{formatBRL(p.commissionAmount || 0)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-tb-brown-soft whitespace-nowrap">
                        {formatBRL(salonAmount)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'pago' ? 'bg-emerald-100 text-emerald-800' :
                          p.status === 'parcial' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {p.status === 'pago' ? 'Quitado' : p.status === 'parcial' ? 'Parcial' : 'Pendente'}
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
