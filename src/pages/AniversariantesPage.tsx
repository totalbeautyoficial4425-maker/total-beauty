import React, { useState, useMemo } from 'react';
import { 
  Cake, 
  Search, 
  Calendar, 
  MessageCircle, 
  CalendarCheck, 
  User, 
  Sparkles, 
  Gift, 
  ChevronRight,
  Filter,
  Heart
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Client } from '../types';
import { 
  isClientBirthdayToday, 
  isClientBirthdayThisMonth, 
  formatBirthdayDayMonth, 
  parseBirthMonthDay,
  formatDateBR 
} from '../utils/formatters';

interface AniversariantesPageProps {
  onOpenWhatsApp: (clientName: string, clientPhone: string, extraData?: any, templateKey?: any) => void;
  onOpenNewAppointmentForClient: (clientId: string) => void;
  onViewClientDetails: (client: Client) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const AniversariantesPage: React.FC<AniversariantesPageProps> = ({
  onOpenWhatsApp,
  onOpenNewAppointmentForClient,
  onViewClientDetails,
}) => {
  const { clients } = useData();

  const [activeTab, setActiveTab] = useState<'hoje' | '7dias' | 'mes' | 'todos'>('hoje');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [searchQuery, setSearchQuery] = useState('');

  // Active clients with birthDate
  const clientsWithBirthday = useMemo(() => {
    return clients.filter(c => !c.isArchived && c.birthDate);
  }, [clients]);

  // Today's birthdays
  const todayBirthdays = useMemo(() => {
    return clientsWithBirthday.filter(c => isClientBirthdayToday(c.birthDate));
  }, [clientsWithBirthday]);

  // Next 7 days birthdays
  const next7DaysBirthdays = useMemo(() => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    return clientsWithBirthday.filter(c => {
      const parsed = parseBirthMonthDay(c.birthDate);
      if (!parsed) return false;

      // Calculate difference in days (ignoring year)
      const thisYear = today.getFullYear();
      let bDate = new Date(thisYear, parsed.month - 1, parsed.day);
      if (bDate < new Date(thisYear, todayMonth - 1, todayDay)) {
        bDate = new Date(thisYear + 1, parsed.month - 1, parsed.day);
      }
      const diffTime = bDate.getTime() - new Date(thisYear, todayMonth - 1, todayDay).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays >= 0 && diffDays <= 7;
    }).sort((a, b) => {
      const pA = parseBirthMonthDay(a.birthDate)!;
      const pB = parseBirthMonthDay(b.birthDate)!;
      return pA.day - pB.day;
    });
  }, [clientsWithBirthday]);

  // Current Month birthdays
  const currentMonthBirthdays = useMemo(() => {
    return clientsWithBirthday
      .filter(c => isClientBirthdayThisMonth(c.birthDate))
      .sort((a, b) => {
        const pA = parseBirthMonthDay(a.birthDate)!;
        const pB = parseBirthMonthDay(b.birthDate)!;
        return pA.day - pB.day;
      });
  }, [clientsWithBirthday]);

  // Filtered list based on active tab and search
  const displayedClients = useMemo(() => {
    let list: Client[] = [];

    if (activeTab === 'hoje') {
      list = todayBirthdays;
    } else if (activeTab === '7dias') {
      list = next7DaysBirthdays;
    } else if (activeTab === 'mes') {
      list = currentMonthBirthdays;
    } else {
      // By selected month
      list = clientsWithBirthday.filter(c => {
        const parsed = parseBirthMonthDay(c.birthDate);
        return parsed && parsed.month === selectedMonth;
      }).sort((a, b) => {
        const pA = parseBirthMonthDay(a.birthDate)!;
        const pB = parseBirthMonthDay(b.birthDate)!;
        return pA.day - pB.day;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }

    return list;
  }, [activeTab, todayBirthdays, next7DaysBirthdays, currentMonthBirthdays, clientsWithBirthday, selectedMonth, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-pink-500/10 via-tb-rose-blush to-tb-ivory rounded-3xl p-6 sm:p-8 border border-pink-200 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold tracking-widest text-pink-600">
              Relacionamento & Fidelização
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500 text-white shadow-2xs">
              Módulo Aniversariantes
            </span>
          </div>
          <h2 className="font-serif-brand text-3xl font-bold text-tb-brown-dark">
            Aniversários das Clientes Total Beauty
          </h2>
          <p className="text-xs sm:text-sm text-tb-brown-soft mt-1 max-w-xl">
            Lembre-se das datas especiais, envie felicitações personalizadas via WhatsApp e fidelize suas clientes com carinho e atenção.
          </p>
        </div>

        {/* Quick Highlights */}
        <div className="flex items-center gap-3">
          <div className="bg-white/90 px-4 py-3 rounded-2xl border border-pink-100 shadow-soft text-center min-w-[110px]">
            <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">Hoje</span>
            <span className="text-2xl font-bold text-tb-brown-dark">{todayBirthdays.length}</span>
            <span className="text-[10px] text-tb-gray-neutral block">aniversariante(s)</span>
          </div>

          <div className="bg-white/90 px-4 py-3 rounded-2xl border border-pink-100 shadow-soft text-center min-w-[110px]">
            <span className="text-[10px] font-bold text-tb-rose-primary uppercase tracking-wider block">Próx. 7 Dias</span>
            <span className="text-2xl font-bold text-tb-brown-dark">{next7DaysBirthdays.length}</span>
            <span className="text-[10px] text-tb-gray-neutral block">na semana</span>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="bg-tb-white rounded-2xl p-4 border border-tb-rose-light/50 shadow-soft flex flex-wrap items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'hoje', label: `🎂 Hoje (${todayBirthdays.length})` },
            { id: '7dias', label: `📅 Próximos 7 Dias (${next7DaysBirthdays.length})` },
            { id: 'mes', label: `🗓️ Este Mês (${currentMonthBirthdays.length})` },
            { id: 'todos', label: '🔍 Consultar por Mês' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-pink-500 text-white shadow-soft'
                  : 'bg-tb-ivory text-tb-brown-soft hover:bg-tb-beige-light hover:text-tb-brown-dark'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Month Selector if 'todos' is active */}
        {activeTab === 'todos' && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-tb-brown-dark">Mês:</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="text-xs px-3 py-1.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-tb-gray-neutral absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar por nome ou celular..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
          />
        </div>
      </div>

      {/* Birthday Cards Grid */}
      <div className="space-y-4">
        {displayedClients.length === 0 ? (
          <div className="p-12 text-center bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft space-y-2">
            <Cake className="w-10 h-10 text-pink-300 mx-auto" />
            <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
              Nenhuma aniversariante para este período
            </h3>
            <p className="text-xs text-tb-gray-neutral max-w-md mx-auto">
              {activeTab === 'hoje' 
                ? 'Hoje nenhuma cliente cadastrada com data de nascimento comemora aniversário.' 
                : 'Não foram encontradas clientes aniversariantes com os filtros selecionados.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedClients.map(client => {
              const isToday = isClientBirthdayToday(client.birthDate);
              const bDayFormatted = formatBirthdayDayMonth(client.birthDate);

              return (
                <div
                  key={client.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                    isToday
                      ? 'bg-gradient-to-br from-pink-500/15 via-tb-white to-pink-50 border-pink-300 shadow-premium'
                      : 'bg-tb-white border-tb-rose-light/60 shadow-soft hover:shadow-premium'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-serif-brand font-bold text-lg shadow-xs ${
                        isToday 
                          ? 'bg-gradient-to-br from-pink-500 to-rose-400 text-white' 
                          : 'bg-tb-rose-blush text-tb-rose-primary border border-tb-rose-light'
                      }`}>
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif-brand text-base font-bold text-tb-brown-dark">
                            {client.name}
                          </h4>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-pink-500 text-white animate-pulse">
                              Hoje!
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-tb-brown-soft flex items-center gap-1.5 mt-0.5">
                          <Cake className="w-3.5 h-3.5 text-pink-500" />
                          <span>Aniversário: <strong>{bDayFormatted}</strong></span>
                        </p>
                        <p className="text-[11px] text-tb-gray-neutral mt-0.5">
                          {client.phone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-tb-rose-light/40 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onViewClientDetails(client)}
                      className="text-[11px] font-semibold text-tb-brown-soft hover:text-tb-brown-dark flex items-center gap-1"
                    >
                      <User className="w-3.5 h-3.5" />
                      Ficha
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenNewAppointmentForClient(client.id)}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-tb-ivory hover:bg-tb-beige-light text-tb-brown-dark border border-tb-rose-light rounded-xl flex items-center gap-1 transition-all"
                        title="Agendar horário de aniversário"
                      >
                        <CalendarCheck className="w-3.5 h-3.5 text-tb-rose-primary" />
                        Agendar
                      </button>

                      <button
                        onClick={() => onOpenWhatsApp(client.name, client.phone, { isBirthday: true }, 'aniversario')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all ${
                          isToday
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                        title="Enviar mensagem carinhosa de parabéns no WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Parabenizar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
