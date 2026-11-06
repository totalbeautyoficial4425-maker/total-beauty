import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  MessageCircle, 
  CheckCircle2, 
  Play, 
  XCircle, 
  Edit, 
  AlertTriangle,
  List,
  CalendarDays,
  CalendarRange,
  Search,
  Gift,
  Cake,
  Receipt,
  Eye,
  SlidersHorizontal,
  Trash2,
  X,
  Lock,
  RotateCcw
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Appointment, AppointmentStatus, Professional, ScheduleBlock } from '../types';
import { formatBRL, formatDateBR, addMinutesToTime, isClientBirthdayToday } from '../utils/formatters';
import { ScheduleBlockModal } from '../components/modals/ScheduleBlockModal';
import { getTodayDate } from '../services/storage';

interface AgendaPageProps {
  onOpenNewAppointment: (initialDate?: string, initialTime?: string, initialClientId?: string, initialProfessionalId?: string) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onOpenWhatsApp: (clientName: string, clientPhone: string, appointment?: any) => void;
  onNavigateToAtendimentos?: () => void;
}

type ViewMode = 'grade_profissionais' | 'dia_lista' | 'semana' | 'mes' | 'lista';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; badgeClass: string; borderClass: string; bgClass: string }> = {
  agendado: { label: 'Agendado', badgeClass: 'bg-emerald-600 text-white', borderClass: 'border-l-emerald-500', bgClass: 'bg-[#00796B]' },
  confirmado: { label: 'Confirmado', badgeClass: 'bg-teal-500 text-white', borderClass: 'border-l-teal-400', bgClass: 'bg-[#00695c]' },
  em_atendimento: { label: 'Em Atendimento', badgeClass: 'bg-amber-400 text-amber-950 animate-pulse', borderClass: 'border-l-amber-500', bgClass: 'bg-[#005c53]' },
  concluido: { label: 'Concluído', badgeClass: 'bg-purple-600 text-white', borderClass: 'border-l-purple-500', bgClass: 'bg-[#4a5568]' },
  cancelado: { label: 'Cancelado', badgeClass: 'bg-rose-600 text-white', borderClass: 'border-l-rose-500', bgClass: 'bg-[#718096]' },
  nao_compareceu: { label: 'Não Compareceu', badgeClass: 'bg-gray-600 text-white', borderClass: 'border-l-gray-400', bgClass: 'bg-[#a0aec0]' },
};

// Professional column colors aligned with the reference design
const PROF_COLORS: Record<string, string> = {
  deborah: '#A855F7',   // Purple
  geovana: '#F97316',   // Orange
  rose: '#E11D48',      // Crimson Red
  leila: '#14B8A6',     // Teal
  elizama: '#16A34A',   // Green
  zama: '#16A34A',      // Green
  talitha: '#84CC16',   // Lime Green
  thais: '#F59E0B',     // Amber
};

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', 
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', 
  '19:00', '19:30', '20:00', '20:30'
];

const SLOT_HEIGHT = 48; // pixels per 30-minute slot

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const START_OF_DAY_MINUTES = 7 * 60; // 07:00 = 420 mins

export const AgendaPage: React.FC<AgendaPageProps> = ({
  onOpenNewAppointment,
  onEditAppointment,
  onOpenWhatsApp,
  onNavigateToAtendimentos,
}) => {
  const { currentUser } = useAuth();
  const { 
    appointments, 
    professionals, 
    clients,
    attendances,
    scheduleBlocks,
    updateAppointmentStatus, 
    cancelAppointment, 
    deleteAppointment,
    deleteScheduleBlock,
    startAttendance,
    revertAttendance 
  } = useData();

  const isProfessional = currentUser?.role === 'profissional';
  const myProfId = professionals.find(p => 
    p.id === currentUser?.professionalId || 
    p.userId === currentUser?.id || 
    p.name.toLowerCase() === currentUser?.name.toLowerCase()
  )?.id;

  // Active professionals only (Thálita is excluded)
  const activeProfessionals = useMemo(() => {
    return professionals.filter(p => p.isActive && p.id !== 'prof_thalita');
  }, [professionals]);

  const [viewMode, setViewMode] = useState<ViewMode>('grade_profissionais');
  const [selectedDate, setSelectedDate] = useState(() => getTodayDate());

  // Filters
  const [selectedProfessional, setSelectedProfessional] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Column count adjustment: 3, 5, 8, 10, 12, or 'all'
  const [columnsVisibleCount, setColumnsVisibleCount] = useState<number | 'all'>('all');

  // Cancel Modal Prompt State
  const [cancelingAppointmentId, setCancelingAppointmentId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Delete Modal Prompt State (With Mandatory Justification)
  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Selected appointment popover tooltip
  const [popoverAppointment, setPopoverAppointment] = useState<Appointment | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);

  // Schedule Block Modal & Detail States
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockModalInitial, setBlockModalInitial] = useState<{
    date?: string;
    time?: string;
    professionalId?: string;
  }>({});
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null);
  const [isManageBlocksModalOpen, setIsManageBlocksModalOpen] = useState(false);
  const [manageBlocksSearch, setManageBlocksSearch] = useState('');
  const [manageBlocksProfFilter, setManageBlocksProfFilter] = useState('todos');
  const [manageBlocksTab, setManageBlocksTab] = useState<'todos' | 'futuros'>('futuros');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredManageBlocks = useMemo(() => {
    const today = getTodayDate();
    const q = manageBlocksSearch.trim().toLowerCase();

    return scheduleBlocks
      .filter(b => {
        if (manageBlocksTab === 'futuros' && b.date < today) return false;
        if (manageBlocksProfFilter !== 'todos' && b.professionalId !== manageBlocksProfFilter) return false;
        if (q) {
          const matchReason = b.reason.toLowerCase().includes(q);
          const matchProf = b.professionalName.toLowerCase().includes(q);
          const matchNotes = b.notes ? b.notes.toLowerCase().includes(q) : false;
          return matchReason || matchProf || matchNotes;
        }
        return true;
      })
      .sort((a, b) => {
        const cmpDate = a.date.localeCompare(b.date);
        if (cmpDate !== 0) return cmpDate;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [scheduleBlocks, manageBlocksSearch, manageBlocksProfFilter, manageBlocksTab]);

  // Open Comandas Count
  const openComandasCount = useMemo(() => {
    return attendances.filter(a => !a.finishedAt || a.paymentStatus !== 'pago').length;
  }, [attendances]);

  const addDaysToDateStr = (dateStr: string, days: number): string => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d + days);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Navigate date
  const handlePrevDate = () => {
    setSelectedDate(prev => addDaysToDateStr(prev, -1));
  };

  const handleNextDate = () => {
    setSelectedDate(prev => addDaysToDateStr(prev, 1));
  };

  const handleToday = () => {
    setSelectedDate(getTodayDate());
  };

  // Filtered professionals to display in columns
  const displayedProfessionals = useMemo(() => {
    let list = activeProfessionals;
    if (selectedProfessional !== 'todos') {
      list = list.filter(p => p.id === selectedProfessional);
    }
    if (columnsVisibleCount !== 'all' && typeof columnsVisibleCount === 'number') {
      list = list.slice(0, columnsVisibleCount);
    }
    return list;
  }, [activeProfessionals, selectedProfessional, columnsVisibleCount]);

  // Appointments for the selected date
  const dayAppointments = useMemo(() => {
    return appointments.filter(apt => {
      if (apt.deletedAt) return false;
      if (apt.date !== selectedDate) return false;
      if (selectedStatus !== 'todos' && apt.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          apt.clientName.toLowerCase().includes(q) ||
          apt.serviceName.toLowerCase().includes(q) ||
          apt.clientPhone.includes(q) ||
          apt.professionalName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [appointments, selectedDate, selectedStatus, searchQuery]);

  // Check if client has birthday today
  const clientBirthdaysMap = useMemo(() => {
    const map = new Map<string, boolean>();
    clients.forEach(c => {
      if (c.birthDate && isClientBirthdayToday(c.birthDate)) {
        map.set(c.id, true);
        map.set(c.name.toLowerCase(), true);
      }
    });
    return map;
  }, [clients]);

  // Click handler on empty slot
  const handleEmptySlotClick = (profId: string, time: string) => {
    onOpenNewAppointment(selectedDate, time, undefined, profId);
  };

  // Card click handler to toggle popover
  const handleAppointmentClick = (e: React.MouseEvent, apt: Appointment) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setPopoverAppointment(apt);
  };

  // Close popover when clicking anywhere else
  useEffect(() => {
    const handleClickOutside = () => {
      setPopoverAppointment(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleConfirmCancel = () => {
    if (cancelingAppointmentId) {
      cancelAppointment(cancelingAppointmentId, cancelReason.trim() || 'Cancelado');
      setCancelingAppointmentId(null);
      setCancelReason('');
      setPopoverAppointment(null);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingAppointment) return;
    if (!deleteReason.trim()) {
      setDeleteError('Por favor, informe a justificativa da exclusão do agendamento.');
      return;
    }
    const res = deleteAppointment(deletingAppointment.id, deleteReason.trim());
    if (res.success) {
      setDeletingAppointment(null);
      setDeleteReason('');
      setDeleteError(null);
      setPopoverAppointment(null);
    } else {
      setDeleteError(res.error || 'Erro ao excluir agendamento.');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12 font-sans">
      {/* Top Controls Bar Aligned with Reference Design */}
      <div className="bg-tb-white rounded-3xl p-4 sm:p-5 border border-tb-rose-light/50 shadow-soft flex flex-wrap items-center justify-between gap-3">
        {/* Left: Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-4 py-2 rounded-xl border border-tb-rose-light bg-tb-white hover:bg-tb-ivory text-xs font-bold text-tb-brown-dark shadow-xs transition-colors"
          >
            Hoje
          </button>

          <div className="flex items-center bg-tb-ivory px-2 py-1 rounded-xl border border-tb-rose-light/70">
            <button
              onClick={handlePrevDate}
              className="p-1 rounded-lg text-tb-gray-neutral hover:text-tb-brown-dark hover:bg-tb-beige-light transition-colors"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-xs px-2 py-0.5 rounded-lg border-0 bg-transparent text-tb-brown-dark font-bold focus:ring-0"
            />
            <button
              onClick={handleNextDate}
              className="p-1 rounded-lg text-tb-gray-neutral hover:text-tb-brown-dark hover:bg-tb-beige-light transition-colors"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs font-bold text-tb-brown-dark hidden md:inline ml-2">
            {formatDateBR(selectedDate)}
          </span>
        </div>

        {/* Center: Open Comandas Counter Badge & Column Adjuster */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Badge: Comandas Abertas */}
          <button
            onClick={onNavigateToAtendimentos}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-500/20 transition-all shadow-2xs"
            title="Ver comandas e atendimentos abertos"
          >
            <span>Comandas Abertas</span>
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-extrabold shadow-xs">
              {openComandasCount}
            </span>
          </button>

          {/* Adjust Columns Buttons: 3, 5, 8, 10, 12, Todas */}
          <div className="hidden lg:flex items-center gap-1 bg-tb-ivory p-1 rounded-xl border border-tb-rose-light/60">
            <span className="text-[11px] font-semibold text-tb-brown-soft px-2">
              Ajustar colunas:
            </span>
            {[3, 5, 8, 10, 12].map(num => (
              <button
                key={num}
                onClick={() => setColumnsVisibleCount(num)}
                className={`w-6 h-6 rounded-lg text-[11px] font-bold transition-all ${
                  columnsVisibleCount === num
                    ? 'bg-tb-rose-primary text-white shadow-xs'
                    : 'text-tb-brown-dark hover:bg-tb-beige-light'
                }`}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setColumnsVisibleCount('all')}
              className={`px-2 h-6 rounded-lg text-[11px] font-bold transition-all ${
                columnsVisibleCount === 'all'
                  ? 'bg-tb-rose-primary text-white shadow-xs'
                  : 'text-tb-brown-dark hover:bg-tb-beige-light'
              }`}
            >
              Todas
            </button>
          </div>
        </div>

        {/* Right: Search & New Appointment Button */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-tb-gray-neutral absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar agendamento..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium placeholder:text-tb-gray-neutral"
            />
          </div>

          <button
            onClick={() => {
              setBlockModalInitial({
                date: selectedDate,
                professionalId: selectedProfessional !== 'todos' ? selectedProfessional : (myProfId || '')
              });
              setIsBlockModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-soft hover:shadow-premium transition-all flex items-center justify-center gap-1.5 shrink-0"
            title="Bloquear intervalo na agenda de uma profissional"
          >
            <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
            Bloquear Horário
          </button>

          <button
            onClick={() => setIsManageBlocksModalOpen(true)}
            className="px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0"
            title="Ver e excluir bloqueios de horário cadastrados"
          >
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span>Bloqueios</span>
            {scheduleBlocks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-950 font-extrabold">
                {scheduleBlocks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onOpenNewAppointment(selectedDate)}
            className="px-4 py-2 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs font-bold shadow-soft hover:shadow-premium transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Secondary Bar: Status Filters & Professional Selector */}
      <div className="bg-tb-white rounded-2xl px-4 py-2.5 border border-tb-rose-light/40 shadow-soft flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick status filter pills */}
          <span className="font-semibold text-tb-brown-soft">Status:</span>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'agendado', label: 'Agendados' },
            { id: 'confirmado', label: 'Confirmados' },
            { id: 'em_atendimento', label: 'Em Atendimento' },
            { id: 'concluido', label: 'Concluídos' },
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedStatus === st.id
                  ? 'bg-tb-brown-dark text-white shadow-2xs'
                  : 'bg-tb-ivory text-tb-brown-soft hover:bg-tb-beige-light'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Filter by specific professional */}
          <select
            value={selectedProfessional}
            onChange={e => setSelectedProfessional(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark font-medium"
          >
            <option value="todos">Todas as Profissionais ({activeProfessionals.length})</option>
            {activeProfessionals.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.id === myProfId ? '(Você)' : ''}
              </option>
            ))}
          </select>

          <span className="text-xs font-bold text-tb-brown-dark">
            {dayAppointments.length} agendamento(s) hoje
          </span>
        </div>
      </div>

      {/* MAIN AGENDA: HORIZONTAL PROFESSIONAL COLUMNS GRID (REFERÊNCIA OBRIGATÓRIA) */}
      <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
        <div className="overflow-x-auto relative max-h-[820px] overflow-y-auto">
          {/* Grid Table Container */}
          <div 
            className="min-w-full"
            style={{ 
              display: 'grid',
              gridTemplateColumns: `80px repeat(${displayedProfessionals.length}, minmax(180px, 1fr))`,
            }}
          >
            {/* Header: Leftmost Time cell */}
            <div className="sticky top-0 left-0 z-40 bg-tb-ivory p-3 border-b-2 border-r border-tb-rose-light text-center font-bold text-xs text-tb-brown-soft uppercase tracking-wider">
              Horário
            </div>

            {/* Header: Columns for each Professional (Reference Style with Colored Banner and Avatar) */}
            {displayedProfessionals.map(prof => {
              const profColorKey = prof.name.toLowerCase().replace(/[^a-z]/g, '');
              const headerColor = PROF_COLORS[profColorKey] || prof.color || '#C58F9B';

              return (
                <div
                  key={prof.id}
                  className="sticky top-0 z-30 p-2.5 text-center border-b-2 border-r border-tb-rose-light/60 transition-all select-none"
                  style={{ backgroundColor: headerColor }}
                >
                  <div className="flex flex-col items-center justify-center gap-1 text-white">
                    {/* Circle avatar */}
                    <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center font-bold text-xs shadow-inner">
                      {prof.name.substring(0, 1).toUpperCase()}
                    </div>
                    {/* Name */}
                    <span className="font-bold text-sm tracking-wide text-white drop-shadow-xs capitalize">
                      {prof.name}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Time Rows and Grid Cells */}
            {TIME_SLOTS.map(timeSlot => {
              return (
                <React.Fragment key={timeSlot}>
                  {/* Left Column: Time label */}
                  <div 
                    className="sticky left-0 z-20 bg-tb-white px-2 py-3 text-center border-b border-r border-tb-rose-light/40 text-xs font-bold text-tb-brown-soft h-[48px] flex items-center justify-center select-none shadow-2xs"
                  >
                    {timeSlot}
                  </div>

                  {/* Cell for each professional in this time slot */}
                  {displayedProfessionals.map(prof => {
                    return (
                      <div
                        key={`${prof.id}-${timeSlot}`}
                        onClick={() => handleEmptySlotClick(prof.id, timeSlot)}
                        className="border-b border-r border-tb-rose-light/25 hover:bg-tb-rose-blush/20 transition-colors h-[48px] relative group cursor-pointer"
                        title={`Livre — Clique para agendar com ${prof.name} às ${timeSlot}`}
                      >
                        {/* Hover hint */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <span className="text-[10px] font-semibold text-tb-rose-primary bg-white/90 px-2 py-0.5 rounded-md shadow-2xs">
                            + {timeSlot}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>

          {/* OVERLAY APPOINTMENT CARDS (POSITIONED PRECISELY BY TIME & DURATION) */}
          <div 
            className="absolute top-[58px] left-[80px] right-0 bottom-0 pointer-events-none"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${displayedProfessionals.length}, minmax(180px, 1fr))`,
            }}
          >
            {displayedProfessionals.map(prof => {
              // Appointments for this professional
              const profAppointments = dayAppointments.filter(a => a.professionalId === prof.id);
              // Schedule blocks for this professional
              const profBlocks = scheduleBlocks.filter(b => b.date === selectedDate && b.professionalId === prof.id);

              return (
                <div key={prof.id} className="relative h-full pointer-events-none border-r border-transparent">
                  {profAppointments.map(apt => {
                    const startMins = timeToMinutes(apt.startTime);
                    const dur = Math.max(25, apt.durationMinutes);
                    const topPixels = Math.max(0, ((startMins - START_OF_DAY_MINUTES) / 30) * SLOT_HEIGHT);
                    const heightPixels = Math.max(40, (dur / 30) * SLOT_HEIGHT - 3);

                    const statusMeta = STATUS_CONFIG[apt.status] || STATUS_CONFIG.agendado;
                    const isClientBirthday = clientBirthdaysMap.get(apt.clientId) || clientBirthdaysMap.get(apt.clientName.toLowerCase());

                    return (
                      <div
                        key={apt.id}
                        onClick={(e) => handleAppointmentClick(e, apt)}
                        style={{
                          top: `${topPixels}px`,
                          height: `${heightPixels}px`,
                        }}
                        className={`absolute left-1 right-1 rounded-xl p-2.5 text-white shadow-soft hover:shadow-premium transition-all pointer-events-auto cursor-pointer border-l-4 ${statusMeta.borderClass} ${statusMeta.bgClass} flex flex-col justify-between overflow-hidden group select-none`}
                      >
                        {/* Card Top: Time & Client Name */}
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-extrabold text-white/90 tracking-tight">
                              {apt.startTime} {apt.clientName}
                            </span>

                            {/* Fit-in badge if forced/fit-in */}
                            {apt.isFitIn && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-300 text-amber-950 uppercase tracking-tighter shrink-0">
                                ENCAIXE
                              </span>
                            )}
                          </div>

                          {/* Service name */}
                          <p className="text-[10px] font-medium text-white/80 truncate mt-0.5">
                            {apt.serviceName}
                          </p>
                        </div>

                        {/* Card Bottom / Badges */}
                        <div className="flex items-center justify-between gap-1 pt-1">
                          {/* Birthday Badge if client has birthday today */}
                          {isClientBirthday ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-pink-500 text-white flex items-center gap-1 shadow-xs animate-pulse">
                              <Gift className="w-2.5 h-2.5" />
                              Aniversário!
                            </span>
                          ) : (
                            <span className="text-[9px] text-white/70">
                              {apt.durationMinutes}m
                            </span>
                          )}

                          {(!isProfessional || apt.professionalId === myProfId) ? (
                            <span className="text-[9px] font-bold text-white/90">
                              {formatBRL(apt.price)}
                            </span>
                          ) : (
                            <span className="text-[9px] text-white/70 flex items-center gap-0.5 font-medium" title="Acesso somente leitura à agenda">
                              <Eye className="w-2.5 h-2.5" />
                              Agenda
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Schedule Blocks (Bloqueios de Horário com Justificativa) */}
                  {profBlocks.map(block => {
                    const startMins = timeToMinutes(block.startTime);
                    const dur = Math.max(25, block.durationMinutes);
                    const topPixels = Math.max(0, ((startMins - START_OF_DAY_MINUTES) / 30) * SLOT_HEIGHT);
                    const heightPixels = Math.max(38, (dur / 30) * SLOT_HEIGHT - 3);

                    return (
                      <div
                        key={block.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBlock(block);
                        }}
                        style={{
                          top: `${topPixels}px`,
                          height: `${heightPixels}px`,
                        }}
                        className="absolute left-1 right-1 rounded-xl p-2.5 text-white shadow-md pointer-events-auto cursor-pointer border-l-4 border-l-amber-500 bg-gradient-to-r from-[#2c1d18] via-[#3d271f] to-[#241712] backdrop-blur-xs flex flex-col justify-between overflow-hidden group select-none transition-all hover:ring-2 hover:ring-amber-400 z-10"
                        title={`Horário Bloqueado: ${block.reason} (${block.startTime} às ${block.endTime})`}
                      >
                        {/* Diagonal stripes texture overlay */}
                        <div 
                          className="absolute inset-0 opacity-25 pointer-events-none"
                          style={{
                            backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 8px, transparent 8px, transparent 16px)'
                          }}
                        />

                        <div className="relative z-10">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-extrabold text-amber-300 tracking-tight flex items-center gap-1">
                              <Lock className="w-3 h-3 stroke-[2.5] text-amber-400 shrink-0" />
                              {block.startTime} - {block.endTime}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-400 text-amber-950 uppercase tracking-tighter">
                                BLOQUEIO
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Deseja realmente excluir o bloqueio "${block.reason}" de ${block.professionalName} (${block.startTime} às ${block.endTime})? O horário será liberado imediatamente.`)) {
                                    deleteScheduleBlock(block.id);
                                    showToast('Bloqueio de horário excluído.');
                                  }
                                }}
                                className="p-1 rounded bg-rose-950/80 hover:bg-rose-600 text-white transition-colors"
                                title="Excluir este bloqueio"
                              >
                                <Trash2 className="w-3 h-3 text-rose-200" />
                              </button>
                            </div>
                          </div>

                          <p className="text-[11px] font-bold text-white truncate mt-1">
                            {block.reason}
                          </p>
                        </div>

                        <div className="relative z-10 flex items-center justify-between text-[9px] text-amber-200/80 pt-1 border-t border-white/10">
                          <span>{block.durationMinutes} min</span>
                          <span className="underline group-hover:text-amber-100 font-bold">Ver detalhes</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* POPOVER TOOLTIP (MATCHING THE SPEECH BUBBLE IN THE REFERENCE IMAGE) */}
      {popoverAppointment && popoverPosition && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 300, Math.max(20, popoverPosition.x - 140))}px`,
            top: `${Math.min(window.innerHeight - 340, Math.max(70, popoverPosition.y - 10))}px`,
          }}
          className="z-50 bg-white rounded-2xl shadow-premium border border-tb-rose-light/80 p-4 w-72 animate-fade-in space-y-3"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-tb-rose-light/40 pb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-tb-rose-primary block">
                {isProfessional && popoverAppointment.professionalId !== myProfId
                  ? 'Agenda Compartilhada (Leitura)'
                  : 'Detalhes do Atendimento'}
              </span>
              <h4 className="font-serif-brand text-base font-bold text-tb-brown-dark leading-tight mt-0.5">
                {popoverAppointment.clientName}
              </h4>
            </div>
            <button
              onClick={() => setPopoverAppointment(null)}
              className="p-1 text-tb-gray-neutral hover:text-tb-brown-dark rounded-md"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Details Content */}
          <div className="space-y-1.5 text-xs text-tb-brown-dark">
            <p>
              <span className="font-bold text-tb-brown-soft">Serviço:</span> {popoverAppointment.serviceName}
            </p>
            <p className="flex items-center gap-1.5">
              <span className="font-bold text-tb-brown-soft">Status:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CONFIG[popoverAppointment.status]?.badgeClass}`}>
                {STATUS_CONFIG[popoverAppointment.status]?.label}
              </span>
            </p>
            <p>
              <span className="font-bold text-tb-brown-soft">Horário:</span> {popoverAppointment.startTime} às {popoverAppointment.endTime} ({popoverAppointment.durationMinutes} min)
            </p>
            <p>
              <span className="font-bold text-tb-brown-soft">Profissional:</span> {popoverAppointment.professionalName}
            </p>
            {(!isProfessional || popoverAppointment.professionalId === myProfId) && (
              <p>
                <span className="font-bold text-tb-brown-soft">Valor:</span> {formatBRL(popoverAppointment.price)}
              </p>
            )}
            {popoverAppointment.isFitIn && (
              <p className="text-amber-800 font-bold bg-amber-50 p-1 rounded-md text-[11px]">
                ★ Agendamento Forçado / Encaixe
                {popoverAppointment.fitInReason ? `: ${popoverAppointment.fitInReason}` : ''}
              </p>
            )}
            {popoverAppointment.notes && (
              <p className="text-[11px] text-tb-gray-neutral italic bg-tb-ivory p-2 rounded-lg">
                Obs: {popoverAppointment.notes}
              </p>
            )}
          </div>

          {/* Actions inside Popover */}
          {isProfessional && popoverAppointment.professionalId !== myProfId ? (
            <div className="pt-2 border-t border-tb-rose-light/40 flex items-center justify-between text-xs">
              <span className="text-[11px] text-tb-brown-soft flex items-center gap-1 italic">
                <Eye className="w-3.5 h-3.5 text-tb-rose-primary" />
                Somente leitura
              </span>

              {/* WhatsApp communication */}
              <button
                onClick={() => {
                  onOpenWhatsApp(popoverAppointment.clientName, popoverAppointment.clientPhone, popoverAppointment);
                  setPopoverAppointment(null);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1 font-semibold text-[11px]"
                title="Conversar no WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-tb-rose-light/40 flex flex-wrap items-center gap-1.5">
              {/* Start attendance button */}
              {['agendado', 'confirmado'].includes(popoverAppointment.status) && (
                <button
                  onClick={() => {
                    startAttendance(popoverAppointment.id);
                    setPopoverAppointment(null);
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                  title="Iniciar atendimento"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Iniciar
                </button>
              )}

              {/* Desfazer início / Reverter atendimento se iniciado por engano */}
              {popoverAppointment.status === 'em_atendimento' && (
                <button
                  onClick={() => {
                    if (window.confirm(`Deseja desfazer o início do atendimento de "${popoverAppointment.clientName}" e voltar para "Agendado"? O horário e agendamento permanecerão intactos na agenda.`)) {
                      const atd = attendances.find(a => a.appointmentId === popoverAppointment.id && !a.finishedAt);
                      if (atd) {
                        revertAttendance(atd.id);
                      } else {
                        updateAppointmentStatus(popoverAppointment.id, 'agendado');
                      }
                      setPopoverAppointment(null);
                    }
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                  title="Desfazer início de atendimento errôneo e voltar para agendado"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Desfazer Início
                </button>
              )}

              {/* Confirm attendance */}
              {popoverAppointment.status === 'agendado' && (
                <button
                  onClick={() => {
                    updateAppointmentStatus(popoverAppointment.id, 'confirmado');
                    setPopoverAppointment(null);
                  }}
                  className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  title="Confirmar presença"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}

              {/* WhatsApp */}
              <button
                onClick={() => {
                  onOpenWhatsApp(popoverAppointment.clientName, popoverAppointment.clientPhone, popoverAppointment);
                  setPopoverAppointment(null);
                }}
                className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                title="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </button>

              {/* Edit */}
              <button
                onClick={() => {
                  onEditAppointment(popoverAppointment);
                  setPopoverAppointment(null);
                }}
                className="p-1.5 rounded-xl bg-tb-ivory text-tb-brown-dark hover:bg-tb-beige-light transition-colors"
                title="Editar"
              >
                <Edit className="w-4 h-4" />
              </button>

              {/* Cancel */}
              {!['cancelado', 'concluido'].includes(popoverAppointment.status) && (
                <button
                  onClick={() => {
                    setCancelingAppointmentId(popoverAppointment.id);
                    setPopoverAppointment(null);
                  }}
                  className="p-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                  title="Cancelar agendamento"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}

              {/* Excluir (com justificativa) */}
              <button
                onClick={() => {
                  setDeletingAppointment(popoverAppointment);
                  setDeleteReason('');
                  setDeleteError(null);
                  setPopoverAppointment(null);
                }}
                className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors"
                title="Excluir agendamento da grade (com justificativa)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelingAppointmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light w-full max-w-md space-y-4 shadow-premium">
            <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
              Cancelar Agendamento
            </h3>
            <p className="text-xs text-tb-gray-neutral">
              Informe a justificativa do cancelamento para registro no histórico da cliente:
            </p>
            <input
              type="text"
              placeholder="Ex: Cliente solicitou reagendamento, imprevisto..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelingAppointmentId(null)}
                className="px-4 py-2 text-xs font-semibold text-tb-brown-soft"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-5 py-2 text-xs font-bold bg-amber-600 text-white rounded-xl shadow-sm hover:bg-amber-700"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exclude Confirmation Modal with Mandatory Justification */}
      {deletingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-tb-white rounded-3xl p-6 border border-rose-200 w-full max-w-lg space-y-4 shadow-premium">
            <div className="flex items-center justify-between pb-3 border-b border-tb-rose-light/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-700">
                  <Trash2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                    Excluir Agendamento
                  </h3>
                  <p className="text-[11px] text-tb-brown-soft">
                    Remoção da grade de horários da profissional
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDeletingAppointment(null);
                  setDeleteReason('');
                  setDeleteError(null);
                }}
                className="p-1.5 rounded-xl text-tb-gray-neutral hover:bg-tb-ivory hover:text-tb-brown-dark transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Appointment Details */}
            <div className="bg-tb-ivory/80 rounded-2xl p-4 border border-tb-rose-light/50 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-tb-brown-soft font-medium">Cliente:</span>
                <span className="font-bold text-tb-brown-dark">{deletingAppointment.clientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tb-brown-soft font-medium">Profissional:</span>
                <span className="font-semibold text-tb-brown-dark">{deletingAppointment.professionalName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tb-brown-soft font-medium">Serviço:</span>
                <span className="font-semibold text-tb-brown-dark">{deletingAppointment.serviceName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tb-brown-soft font-medium">Data e Horário:</span>
                <span className="font-bold text-tb-rose-primary">
                  {formatDateBR(deletingAppointment.date)} às {deletingAppointment.startTime} ({deletingAppointment.durationMinutes} min)
                </span>
              </div>
            </div>

            {/* Justification Field (Mandatory) */}
            <div>
              <label className="block text-xs font-bold text-tb-brown-dark mb-1">
                Justificativa da Exclusão <span className="text-rose-600">*</span>
              </label>
              <p className="text-[11px] text-tb-gray-neutral mb-2">
                Informe obrigatoriamente a razão pela qual este agendamento está sendo excluído:
              </p>
              <textarea
                rows={3}
                placeholder="Ex: Agendamento de exemplo usado para treinamento / Cliente cancelou e liberou o horário / Lançamento duplicado..."
                value={deleteReason}
                onChange={e => {
                  setDeleteReason(e.target.value);
                  if (deleteError) setDeleteError(null);
                }}
                className="w-full text-xs p-3 rounded-xl border border-rose-300 bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-rose-400 focus:outline-none resize-none"
              />

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  'Agendamento de teste / exemplo',
                  'Cliente desistiu e liberou o horário',
                  'Lançamento duplicado por engano',
                  'Horário / serviço lançado incorretamente',
                ].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDeleteReason(preset)}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-tb-ivory hover:bg-rose-50 text-tb-brown-soft hover:text-rose-700 border border-tb-rose-light/50 transition-colors font-medium"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              {deleteError && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  {deleteError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-tb-rose-light/30">
              <button
                type="button"
                onClick={() => {
                  setDeletingAppointment(null);
                  setDeleteReason('');
                  setDeleteError(null);
                }}
                className="px-4 py-2.5 text-xs font-semibold text-tb-brown-soft hover:text-tb-brown-dark rounded-xl"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-soft hover:shadow-premium transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Block Creation Modal */}
      <ScheduleBlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        initialDate={blockModalInitial.date || selectedDate}
        initialTime={blockModalInitial.time}
        initialProfessionalId={blockModalInitial.professionalId}
      />

      {/* Schedule Block Details & Unblock Modal */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-tb-white rounded-3xl p-6 border border-amber-300 w-full max-w-md space-y-4 shadow-premium">
            <div className="flex items-center justify-between pb-3 border-b border-tb-rose-light/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700">
                  <Lock className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                    Bloqueio de Agenda
                  </h3>
                  <p className="text-[11px] text-tb-brown-soft">
                    Detalhes do período indisponibilizado
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBlock(null)}
                className="p-1.5 rounded-xl text-tb-gray-neutral hover:bg-tb-ivory hover:text-tb-brown-dark transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Block Information */}
            <div className="bg-tb-ivory/80 rounded-2xl p-4 border border-tb-rose-light/50 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-tb-brown-soft font-medium">Profissional:</span>
                <span className="font-bold text-tb-brown-dark">{selectedBlock.professionalName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tb-brown-soft font-medium">Data:</span>
                <span className="font-semibold text-tb-brown-dark">{formatDateBR(selectedBlock.date)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tb-brown-soft font-medium">Horário:</span>
                <span className="font-bold text-amber-700">
                  {selectedBlock.startTime} às {selectedBlock.endTime} ({selectedBlock.durationMinutes} min)
                </span>
              </div>
              <div className="pt-2 border-t border-tb-rose-light/30">
                <span className="text-tb-brown-soft font-medium block mb-1">Justificativa:</span>
                <p className="font-bold text-tb-brown-dark bg-white p-2.5 rounded-xl border border-amber-200">
                  {selectedBlock.reason}
                </p>
              </div>
              {selectedBlock.notes && (
                <div className="pt-1">
                  <span className="text-tb-brown-soft font-medium block mb-0.5">Observações:</span>
                  <p className="italic text-tb-brown-soft bg-white/70 p-2 rounded-xl text-[11px]">
                    {selectedBlock.notes}
                  </p>
                </div>
              )}
              {selectedBlock.createdBy && (
                <div className="text-[10px] text-tb-gray-neutral pt-1">
                  Registrado por: {selectedBlock.createdBy}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-tb-rose-light/30">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Deseja realmente desbloquear o horário de ${selectedBlock.professionalName} (${selectedBlock.startTime} às ${selectedBlock.endTime})?`)) {
                    deleteScheduleBlock(selectedBlock.id);
                    setSelectedBlock(null);
                    showToast('Bloqueio excluído e horário liberado!');
                  }
                }}
                className="px-4 py-2.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-all flex items-center gap-1.5"
                title="Remover bloqueio e liberar horário na agenda"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                Desbloquear Horário
              </button>

              <button
                type="button"
                onClick={() => setSelectedBlock(null)}
                className="px-5 py-2.5 text-xs font-bold bg-tb-brown-dark hover:bg-black text-white rounded-xl shadow-soft transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gerenciador de Bloqueios */}
      {isManageBlocksModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-tb-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-premium border border-tb-rose-light/50 space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-tb-rose-light/30">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-300 flex items-center justify-center text-amber-800">
                  <Lock className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-tb-brown-dark">
                    Gerenciador de Bloqueios da Agenda
                  </h3>
                  <p className="text-xs text-tb-brown-soft">
                    Visualize, pesquise e exclua bloqueios para liberar horários
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManageBlocksModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-tb-ivory text-tb-brown-soft transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="space-y-2.5 bg-tb-ivory p-3 rounded-2xl border border-tb-rose-light/40">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-tb-gray-neutral absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={manageBlocksSearch}
                    onChange={(e) => setManageBlocksSearch(e.target.value)}
                    placeholder="Pesquisar por motivo, profissional, obs..."
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-tb-rose-light bg-white text-tb-brown-dark font-medium placeholder:text-tb-gray-neutral"
                  />
                </div>

                <select
                  value={manageBlocksProfFilter}
                  onChange={(e) => setManageBlocksProfFilter(e.target.value)}
                  className="text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-white text-tb-brown-dark font-semibold"
                >
                  <option value="todos">Todas as profissionais</option>
                  {activeProfessionals.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Tabs: Futuros vs Todos */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-tb-rose-light/60">
                  <button
                    type="button"
                    onClick={() => setManageBlocksTab('futuros')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      manageBlocksTab === 'futuros'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-tb-brown-soft hover:text-tb-brown-dark'
                    }`}
                  >
                    A partir de hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setManageBlocksTab('todos')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      manageBlocksTab === 'todos'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-tb-brown-soft hover:text-tb-brown-dark'
                    }`}
                  >
                    Histórico completo
                  </button>
                </div>

                <span className="text-[11px] font-semibold text-tb-brown-soft">
                  {filteredManageBlocks.length} {filteredManageBlocks.length === 1 ? 'bloqueio' : 'bloqueios'}
                </span>
              </div>
            </div>

            {/* Blocks List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] max-h-[420px]">
              {filteredManageBlocks.length === 0 ? (
                <div className="text-center py-12 px-4 bg-tb-ivory/50 rounded-2xl border border-dashed border-tb-rose-light flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-2">
                    <Lock className="w-5 h-5 opacity-60" />
                  </div>
                  <p className="text-xs font-bold text-tb-brown-dark">
                    Nenhum bloqueio encontrado
                  </p>
                  <p className="text-[11px] text-tb-brown-soft mt-0.5">
                    {manageBlocksSearch || manageBlocksProfFilter !== 'todos'
                      ? 'Nenhum bloqueio corresponde aos filtros aplicados.'
                      : 'Não há horários bloqueados cadastrados no momento.'}
                  </p>
                  {(manageBlocksSearch || manageBlocksProfFilter !== 'todos') && (
                    <button
                      type="button"
                      onClick={() => {
                        setManageBlocksSearch('');
                        setManageBlocksProfFilter('todos');
                      }}
                      className="mt-3 px-3 py-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                filteredManageBlocks.map(block => (
                  <div
                    key={block.id}
                    className="p-3.5 bg-white rounded-2xl border border-tb-rose-light/50 hover:border-amber-300 shadow-2xs hover:shadow-soft transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold text-[11px]">
                          {formatDateBR(block.date)}
                        </span>
                        <span className="font-bold text-amber-800 text-xs">
                          {block.startTime} às {block.endTime} ({block.durationMinutes} min)
                        </span>
                        <span className="text-xs font-extrabold text-tb-brown-dark">
                          • {block.professionalName}
                        </span>
                      </div>

                      <div className="text-xs">
                        <span className="font-bold text-tb-brown-dark">Motivo: </span>
                        <span className="text-tb-brown-soft font-medium">{block.reason}</span>
                      </div>

                      {block.notes && (
                        <p className="text-[11px] text-tb-gray-neutral italic">
                          Obs: {block.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(block.date);
                          setIsManageBlocksModalOpen(false);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-tb-brown-soft hover:text-tb-brown-dark bg-tb-ivory hover:bg-tb-beige-light rounded-xl transition-colors"
                        title="Ir para a data deste bloqueio na agenda"
                      >
                        Ver na Agenda
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Deseja realmente excluir o bloqueio de ${block.professionalName} no dia ${formatDateBR(block.date)} (${block.startTime} às ${block.endTime})? O horário será liberado imediatamente.`)) {
                            deleteScheduleBlock(block.id);
                            showToast('Bloqueio excluído com sucesso!');
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5"
                        title="Excluir este bloqueio"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-tb-rose-light/30">
              <button
                type="button"
                onClick={() => {
                  setIsManageBlocksModalOpen(false);
                  setBlockModalInitial({
                    date: selectedDate,
                    professionalId: selectedProfessional !== 'todos' ? selectedProfessional : (myProfId || '')
                  });
                  setIsBlockModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Novo Bloqueio
              </button>

              <button
                type="button"
                onClick={() => setIsManageBlocksModalOpen(false)}
                className="px-5 py-2 text-xs font-bold bg-tb-brown-dark hover:bg-black text-white rounded-xl shadow-soft transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-tb-brown-dark text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-premium border border-tb-rose-light/20 flex items-center gap-2.5 animate-bounce-subtle">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
