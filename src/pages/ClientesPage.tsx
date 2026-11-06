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
  Cake,
  Trash2,
  AlertTriangle,
  Copy,
  PhoneOff,
  CheckSquare,
  Square,
  ShieldAlert,
  ArrowRight,
  Info
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

type MainTab = 'todas' | 'duplicidades' | 'sem_numero';
type FilterType = 'todas' | 'recorrentes' | 'novas' | 'inativas' | 'aniversariantes_hoje' | 'aniversariantes_mes' | 'arquivadas';
type DupFilterType = 'todos' | 'exatos' | 'telefone' | 'nome';

interface DuplicateGroup {
  id: string;
  type: 'exact' | 'phone' | 'name';
  badgeLabel: string;
  key: string;
  title: string;
  subtitle: string;
  clients: Client[];
}

// Normalize helpers for duplicate detection
const cleanPhone = (phone?: string) => (phone || '').replace(/\D/g, '');

const normalizeName = (name?: string) => {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const isClientWithoutPhone = (client: Client): boolean => {
  const digits = cleanPhone(client.phone);
  return !digits || digits.length < 8 || /^0+$/.test(digits);
};

export const ClientesPage: React.FC<ClientesPageProps> = ({
  onOpenNewClient,
  onEditClient,
  onViewClientDetails,
  onOpenWhatsApp,
  onNewAppointmentForClient,
}) => {
  const { clients, clientPackages, appointments, attendances, deleteClient, deleteMultipleClients } = useData();
  
  // Navigation & Sub-views
  const [activeTab, setActiveTab] = useState<MainTab>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('todas');
  const [dupFilterType, setDupFilterType] = useState<DupFilterType>('todos');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const DUP_GROUPS_PER_PAGE = 15;

  // Batch Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete Modals State
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<Client[] | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // DUPLICATE & NO-PHONE COMPUTATION
  // -------------------------------------------------------------
  const { 
    noPhoneClients, 
    duplicateGroups, 
    duplicateClientIdsMap, 
    totalUniqueDuplicatesCount 
  } = useMemo(() => {
    const noPhone: Client[] = [];
    const phoneMap = new Map<string, Client[]>();
    const nameMap = new Map<string, Client[]>();
    const dupMap = new Map<string, string>(); // clientId -> reason
    const groups: DuplicateGroup[] = [];

    // Separate active clients for analysis
    clients.forEach(c => {
      if (c.isArchived) return;

      const digits = cleanPhone(c.phone);
      if (isClientWithoutPhone(c)) {
        noPhone.push(c);
      } else {
        if (!phoneMap.has(digits)) phoneMap.set(digits, []);
        phoneMap.get(digits)!.push(c);
      }

      const normName = normalizeName(c.name);
      if (normName.length >= 3) {
        if (!nameMap.has(normName)) nameMap.set(normName, []);
        nameMap.get(normName)!.push(c);
      }
    });

    // 1. Phone duplicates
    phoneMap.forEach((list, phone) => {
      if (list.length > 1) {
        const allSameName = list.every(c => normalizeName(c.name) === normalizeName(list[0].name));
        const groupType: 'exact' | 'phone' = allSameName ? 'exact' : 'phone';
        const label = allSameName ? 'Duplicidade Exata (Nome e Tel)' : 'Mesmo Telefone';

        list.forEach(c => {
          dupMap.set(c.id, label);
        });

        groups.push({
          id: `phone_${phone}`,
          type: groupType,
          badgeLabel: label,
          key: phone,
          title: allSameName ? list[0].name : maskPhoneBR(list[0].phone),
          subtitle: `${list.length} cadastros com este número (${maskPhoneBR(list[0].phone)})`,
          clients: list,
        });
      }
    });

    // 2. Name duplicates (excluding already captured groups if all members overlap)
    nameMap.forEach((list, normName) => {
      if (list.length > 1) {
        // Check if all are already grouped in an exact group
        const allAlreadyCaptured = list.every(c => dupMap.has(c.id));
        if (!allAlreadyCaptured) {
          list.forEach(c => {
            if (!dupMap.has(c.id)) {
              dupMap.set(c.id, 'Mesmo Nome Completo');
            }
          });

          groups.push({
            id: `name_${normName}`,
            type: 'name',
            badgeLabel: 'Mesmo Nome Completo',
            key: normName,
            title: list[0].name,
            subtitle: `${list.length} cadastros com o mesmo nome completo`,
            clients: list,
          });
        }
      }
    });

    return {
      noPhoneClients: noPhone,
      duplicateGroups: groups,
      duplicateClientIdsMap: dupMap,
      totalUniqueDuplicatesCount: dupMap.size,
    };
  }, [clients]);

  // -------------------------------------------------------------
  // TAB 1: ALL CLIENTS FILTERING
  // -------------------------------------------------------------
  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qDigits = cleanPhone(q);

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

      // Search query (Nome, Telefone, Email, Notas/Código)
      if (q) {
        const nameMatch = c.name.toLowerCase().includes(q);
        const phoneMatch = c.phone.includes(q) || (qDigits.length > 0 && cleanPhone(c.phone).includes(qDigits));
        const emailMatch = c.email ? c.email.toLowerCase().includes(q) : false;
        const notesMatch = c.notes ? c.notes.toLowerCase().includes(q) : false;
        return nameMatch || phoneMatch || emailMatch || notesMatch;
      }

      return true;
    });
  }, [clients, filterType, searchQuery]);

  // -------------------------------------------------------------
  // TAB 2: DUPLICATES FILTERING
  // -------------------------------------------------------------
  const filteredDuplicateGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qDigits = cleanPhone(q);

    return duplicateGroups.filter(grp => {
      // Sub-filter by duplicate type
      if (dupFilterType === 'exatos' && grp.type !== 'exact') return false;
      if (dupFilterType === 'telefone' && grp.type !== 'phone' && grp.type !== 'exact') return false;
      if (dupFilterType === 'nome' && grp.type !== 'name') return false;

      // Search query
      if (q) {
        const matchTitle = grp.title.toLowerCase().includes(q);
        const matchSub = grp.subtitle.toLowerCase().includes(q);
        const matchAnyClient = grp.clients.some(c => {
          const nameMatch = c.name.toLowerCase().includes(q);
          const phoneMatch = c.phone.includes(q) || (qDigits.length > 0 && cleanPhone(c.phone).includes(qDigits));
          const emailMatch = c.email ? c.email.toLowerCase().includes(q) : false;
          const notesMatch = c.notes ? c.notes.toLowerCase().includes(q) : false;
          return nameMatch || phoneMatch || emailMatch || notesMatch;
        });
        return matchTitle || matchSub || matchAnyClient;
      }

      return true;
    });
  }, [duplicateGroups, dupFilterType, searchQuery]);

  // -------------------------------------------------------------
  // TAB 3: NO-PHONE CLIENTS FILTERING
  // -------------------------------------------------------------
  const filteredNoPhoneClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return noPhoneClients.filter(c => {
      if (q) {
        const nameMatch = c.name.toLowerCase().includes(q);
        const emailMatch = c.email ? c.email.toLowerCase().includes(q) : false;
        const notesMatch = c.notes ? c.notes.toLowerCase().includes(q) : false;
        return nameMatch || emailMatch || notesMatch;
      }
      return true;
    });
  }, [noPhoneClients, searchQuery]);

  // -------------------------------------------------------------
  // PAGINATION CALCULATIONS
  // -------------------------------------------------------------
  const totalPagesAll = Math.max(1, Math.ceil(filteredClients.length / ITEMS_PER_PAGE));
  const safePageAll = Math.min(currentPage, totalPagesAll);
  const paginatedAllClients = useMemo(() => {
    const start = (safePageAll - 1) * ITEMS_PER_PAGE;
    return filteredClients.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredClients, safePageAll]);

  const totalPagesDup = Math.max(1, Math.ceil(filteredDuplicateGroups.length / DUP_GROUPS_PER_PAGE));
  const safePageDup = Math.min(currentPage, totalPagesDup);
  const paginatedDupGroups = useMemo(() => {
    const start = (safePageDup - 1) * DUP_GROUPS_PER_PAGE;
    return filteredDuplicateGroups.slice(start, start + DUP_GROUPS_PER_PAGE);
  }, [filteredDuplicateGroups, safePageDup]);

  const totalPagesNoPhone = Math.max(1, Math.ceil(filteredNoPhoneClients.length / ITEMS_PER_PAGE));
  const safePageNoPhone = Math.min(currentPage, totalPagesNoPhone);
  const paginatedNoPhoneClients = useMemo(() => {
    const start = (safePageNoPhone - 1) * ITEMS_PER_PAGE;
    return filteredNoPhoneClients.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredNoPhoneClients, safePageNoPhone]);

  // -------------------------------------------------------------
  // SELECTION HELPERS
  // -------------------------------------------------------------
  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCurrentNoPhonePage = () => {
    const next = new Set(selectedIds);
    paginatedNoPhoneClients.forEach(c => next.add(c.id));
    setSelectedIds(next);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // -------------------------------------------------------------
  // EXCLUSÃO (DELETE) HANDLERS
  // -------------------------------------------------------------
  const handleConfirmSingleDelete = () => {
    if (!clientToDelete) return;
    const clientName = clientToDelete.name;
    const res = deleteClient(clientToDelete.id);
    if (res.success) {
      showToast(`Cliente "${clientName}" excluída com sucesso.`);
    }
    setClientToDelete(null);
  };

  const handleConfirmBatchDelete = () => {
    if (!batchToDelete || batchToDelete.length === 0) return;
    const ids = batchToDelete.map(c => c.id);
    const res = deleteMultipleClients(ids);
    if (res.success) {
      showToast(`${res.count} clientes excluídas com sucesso.`);
    }
    setSelectedIds(new Set());
    setBatchToDelete(null);
  };

  // Helper: Manter mais completo no grupo de duplicados
  const handleResolveGroupKeepBest = (group: DuplicateGroup) => {
    if (group.clients.length < 2) return;

    // Sort to find the best candidate to keep
    const sorted = [...group.clients].sort((a, b) => {
      // 1. More visits
      if (b.totalVisits !== a.totalVisits) return b.totalVisits - a.totalVisits;
      // 2. More spent
      if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent;
      // 3. Has email
      if (b.email && !a.email) return 1;
      if (!b.email && a.email) return -1;
      // 4. Has longer notes
      const lenB = (b.notes || '').length;
      const lenA = (a.notes || '').length;
      if (lenB !== lenA) return lenB - lenA;
      // 5. Oldest created
      return a.createdAt.localeCompare(b.createdAt);
    });

    const toKeep = sorted[0];
    const toDelete = sorted.slice(1);

    setBatchToDelete(toDelete);
  };

  // -------------------------------------------------------------
  // EXPORT CSV
  // -------------------------------------------------------------
  const handleExportCSV = () => {
    const headers = [
      'ID', 'Nome Completo', 'Telefone', 'WhatsApp', 'E-mail', 
      'Data de Nascimento', 'Cidade', 'Total Visitas', 'Total Gasto (R$)', 
      'Última Visita', 'Data Cadastro', 'Status', 'Observações'
    ];

    let listToExport: Client[] = [];
    let fileSuffix = 'ativas';

    if (activeTab === 'todas') {
      listToExport = filteredClients;
      fileSuffix = filterType;
    } else if (activeTab === 'duplicidades') {
      const allDups = filteredDuplicateGroups.flatMap(g => g.clients);
      // Deduplicate in export list
      const seen = new Set<string>();
      listToExport = allDups.filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      fileSuffix = 'duplicadas';
    } else if (activeTab === 'sem_numero') {
      listToExport = filteredNoPhoneClients;
      fileSuffix = 'sem_numero';
    }

    const rows = listToExport.map(c => [
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
      c.isArchived ? 'Arquivada' : 'Ativa',
      c.notes || ''
    ]);

    downloadCSV(`clientes_total_beauty_${fileSuffix}_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-tb-brown-dark text-white px-5 py-3 rounded-2xl shadow-premium border border-tb-rose-light/30 flex items-center gap-2.5 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

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
            {clients.filter(c => !c.isArchived).length} clientes ativas cadastradas • Higienização e controle da base.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl border border-tb-rose-light bg-tb-ivory hover:bg-tb-beige-light text-xs font-semibold text-tb-brown-dark transition-colors flex items-center justify-center gap-2 shadow-2xs"
            title="Exportar registros filtrados em planilha CSV"
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

      {/* Main View Switcher Tabs (Abas Principais) */}
      <div className="bg-tb-white rounded-2xl p-2 border border-tb-rose-light/40 shadow-soft flex flex-wrap gap-2">
        <button
          onClick={() => {
            setActiveTab('todas');
            setCurrentPage(1);
            setSearchQuery('');
          }}
          className={`flex-1 min-w-[180px] px-4 py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 ${
            activeTab === 'todas'
              ? 'bg-tb-rose-primary text-white shadow-soft'
              : 'bg-tb-ivory/60 text-tb-brown-soft hover:bg-tb-beige-light hover:text-tb-brown-dark'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Todas as Clientes</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
            activeTab === 'todas' 
              ? 'bg-white/25 text-white' 
              : 'bg-tb-rose-blush text-tb-brown-dark'
          }`}>
            {clients.filter(c => !c.isArchived).length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('duplicidades');
            setCurrentPage(1);
            setSearchQuery('');
          }}
          className={`flex-1 min-w-[180px] px-4 py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 ${
            activeTab === 'duplicidades'
              ? 'bg-amber-600 text-white shadow-soft'
              : 'bg-tb-ivory/60 text-tb-brown-soft hover:bg-amber-50 hover:text-amber-900'
          }`}
        >
          <Copy className="w-4 h-4" />
          <span>Cadastros Duplicados</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
            activeTab === 'duplicidades' 
              ? 'bg-white/25 text-white' 
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}>
            {totalUniqueDuplicatesCount} clientes ({duplicateGroups.length} grupos)
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('sem_numero');
            setCurrentPage(1);
            setSearchQuery('');
          }}
          className={`flex-1 min-w-[180px] px-4 py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 ${
            activeTab === 'sem_numero'
              ? 'bg-rose-700 text-white shadow-soft'
              : 'bg-tb-ivory/60 text-tb-brown-soft hover:bg-rose-50 hover:text-rose-900'
          }`}
        >
          <PhoneOff className="w-4 h-4" />
          <span>Sem Telefone / Número</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
            activeTab === 'sem_numero' 
              ? 'bg-white/25 text-white' 
              : 'bg-rose-100 text-rose-800 border border-rose-200'
          }`}>
            {noPhoneClients.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: TODAS AS CLIENTES                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'todas' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-tb-white rounded-2xl p-4 border border-tb-rose-light/40 shadow-soft flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-tb-gray-neutral absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Pesquisar por nome, celular com DDD, código ou e-mail..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
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
                  onClick={() => {
                    setFilterType(flt.id as any);
                    setCurrentPage(1);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                    filterType === flt.id
                      ? 'bg-tb-rose-primary text-white shadow-sm'
                      : 'bg-tb-ivory text-tb-brown-soft hover:bg-tb-beige-light'
                  }`}
                >
                  {flt.label}
                </button>
              ))}

              {/* Quick links to Duplicidades e Sem Número */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('duplicidades');
                  setCurrentPage(1);
                }}
                className="text-xs px-3 py-1.5 rounded-xl font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1"
                title="Ver cadastros duplicados"
              >
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Duplicadas ({totalUniqueDuplicatesCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('sem_numero');
                  setCurrentPage(1);
                }}
                className="text-xs px-3 py-1.5 rounded-xl font-medium bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1"
                title="Ver clientes sem telefone"
              >
                <PhoneOff className="w-3 h-3 text-rose-600" />
                <span>Sem Número ({noPhoneClients.length})</span>
              </button>
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
                    paginatedAllClients.map(client => {
                      const isDup = duplicateClientIdsMap.has(client.id);
                      const isNoPhone = isClientWithoutPhone(client);

                      return (
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

                                  {/* Duplicate warning badge */}
                                  {isDup && (
                                    <span 
                                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1"
                                      title={duplicateClientIdsMap.get(client.id)}
                                    >
                                      <Copy className="w-2.5 h-2.5 text-amber-700" />
                                      Duplicada
                                    </span>
                                  )}

                                  {/* Missing phone badge */}
                                  {isNoPhone && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                      <PhoneOff className="w-2.5 h-2.5 text-rose-700" />
                                      Sem Tel
                                    </span>
                                  )}

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
                                  {(clientPackages || [])
                                    .filter(p => p.clientId === client.id && p.status === 'ativo' && p.items.some(i => i.remainingQty > 0))
                                    .map(pkg => (
                                      <span 
                                        key={pkg.id} 
                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 shrink-0 border border-emerald-300"
                                        title={`Pacote ${pkg.packageName}: ${pkg.items.map(i => `${i.remainingQty}/${i.totalQty} ${i.serviceName}`).join(', ')}`}
                                      >
                                        🎁 {pkg.packageName}: {pkg.items.map(i => `${i.remainingQty} ${i.serviceName}`).join(' + ')}
                                      </span>
                                    ))}
                                </div>
                                <p className="text-[11px] text-tb-gray-neutral">
                                  {client.email || (client.notes ? `Nota: ${client.notes}` : 'Sem e-mail cadastrado')}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-tb-brown-soft">
                            {isNoPhone ? (
                              <span className="text-rose-600 font-semibold italic flex items-center gap-1">
                                <PhoneOff className="w-3.5 h-3.5" />
                                Não informado
                              </span>
                            ) : (
                              maskPhoneBR(client.phone)
                            )}
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
                              {!isNoPhone && (
                                isClientBirthdayToday(client.birthDate) ? (
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
                                )
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
                              
                              {/* EXCLUIR CLIENTE ACTION */}
                              <button
                                onClick={() => setClientToDelete(client)}
                                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Excluir Cliente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredClients.length > ITEMS_PER_PAGE && (
              <div className="px-6 py-4 bg-tb-ivory border-t border-tb-rose-light/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-tb-brown-soft">
                  Exibindo <strong>{(safePageAll - 1) * ITEMS_PER_PAGE + 1}</strong> a{' '}
                  <strong>{Math.min(safePageAll * ITEMS_PER_PAGE, filteredClients.length)}</strong> de{' '}
                  <strong>{filteredClients.length}</strong> clientes
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePageAll <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-tb-rose-light bg-tb-white hover:bg-tb-beige-light text-tb-brown-dark font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1.5 font-semibold text-tb-brown-dark">
                    Página {safePageAll} de {totalPagesAll}
                  </span>
                  <button
                    type="button"
                    disabled={safePageAll >= totalPagesAll}
                    onClick={() => setCurrentPage(p => Math.min(totalPagesAll, p + 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-tb-rose-light bg-tb-white hover:bg-tb-beige-light text-tb-brown-dark font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CLIENTES EM DUPLICIDADE                                           */}
      {/* ========================================================================= */}
      {activeTab === 'duplicidades' && (
        <div className="space-y-4">
          {/* Header Info Banner */}
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                <Copy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-amber-950 text-sm">
                  {totalUniqueDuplicatesCount} clientes em duplicidade encontradas ({duplicateGroups.length} grupos)
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Os cadastros abaixo possuem o mesmo número de telefone ou o mesmo nome completo. Compare os registros e exclua as duplicatas desnecessárias.
                </p>
              </div>
            </div>
          </div>

          {/* Search & Sub-filters */}
          <div className="bg-tb-white rounded-2xl p-4 border border-tb-rose-light/40 shadow-soft flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-tb-gray-neutral absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Pesquisar grupos por nome, telefone ou código Avec..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'todos', label: 'Todos os Grupos' },
                { id: 'exatos', label: 'Nome e Telefone Iguais' },
                { id: 'telefone', label: 'Mesmo Telefone' },
                { id: 'nome', label: 'Mesmo Nome' },
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => {
                    setDupFilterType(sub.id as any);
                    setCurrentPage(1);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                    dupFilterType === sub.id
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-tb-ivory text-tb-brown-soft hover:bg-tb-beige-light'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>

          {/* Groups List */}
          {filteredDuplicateGroups.length === 0 ? (
            <div className="bg-tb-white rounded-3xl p-12 border border-tb-rose-light/40 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-tb-brown-dark text-base">Nenhuma duplicidade encontrada!</h4>
              <p className="text-xs text-tb-gray-neutral">
                Sua base de clientes está higienizada para os filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedDupGroups.map(grp => (
                <div 
                  key={grp.id}
                  className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden"
                >
                  {/* Group Header */}
                  <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                        {grp.badgeLabel}
                      </span>
                      <div>
                        <h4 className="font-bold text-tb-brown-dark text-sm sm:text-base">
                          {grp.title}
                        </h4>
                        <p className="text-[11px] text-tb-gray-neutral">
                          {grp.subtitle}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleResolveGroupKeepBest(grp)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
                      title="Mantém o cadastro com mais visitas/dados e prepara os outros para exclusão"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Manter Mais Completo e Excluir Outros
                    </button>
                  </div>

                  {/* Group Clients List */}
                  <div className="divide-y divide-tb-rose-light/20">
                    {grp.clients.map(client => {
                      const hasVisits = client.totalVisits > 0;

                      return (
                        <div 
                          key={client.id}
                          className="px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-tb-ivory/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-[260px]">
                            <div className="w-9 h-9 rounded-xl bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center font-bold text-xs border border-tb-rose-light shrink-0">
                              {client.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-tb-brown-dark text-xs sm:text-sm">
                                  {client.name}
                                </span>
                                {hasVisits && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    {client.totalVisits} atendimento(s)
                                  </span>
                                )}
                                {client.notes && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-tb-beige-light text-tb-brown-soft border border-tb-rose-light/40">
                                    {client.notes}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-tb-gray-neutral mt-0.5">
                                ID: <code className="text-[10px] bg-tb-ivory px-1 rounded">{client.id}</code> • Cadastrada em: {formatDateBR(client.createdAt)}
                                {client.email && ` • ${client.email}`}
                              </p>
                            </div>
                          </div>

                          {/* Quick client indicators */}
                          <div className="flex items-center gap-6 text-xs text-tb-brown-soft">
                            <div>
                              <span className="text-tb-gray-neutral block text-[10px] uppercase font-semibold">Telefone</span>
                              <span className="font-medium">{maskPhoneBR(client.phone) || 'Sem número'}</span>
                            </div>
                            <div>
                              <span className="text-tb-gray-neutral block text-[10px] uppercase font-semibold">Total Gasto</span>
                              <span className="font-bold text-tb-rose-primary">{formatBRL(client.totalSpent)}</span>
                            </div>
                            <div>
                              <span className="text-tb-gray-neutral block text-[10px] uppercase font-semibold">Última Visita</span>
                              <span>{formatDateBR(client.lastVisit)}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            <button
                              onClick={() => onViewClientDetails(client)}
                              className="px-3 py-1.5 rounded-xl border border-tb-rose-light text-tb-brown-soft hover:bg-tb-beige-light text-xs font-medium transition-colors flex items-center gap-1"
                              title="Visualizar ficha completa"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver Ficha
                            </button>
                            <button
                              onClick={() => onEditClient(client)}
                              className="p-1.5 rounded-xl border border-tb-rose-light text-tb-brown-soft hover:bg-tb-beige-light text-xs transition-colors"
                              title="Editar dados"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setClientToDelete(client)}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-colors flex items-center gap-1"
                              title="Excluir este cadastro duplicado"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              Excluir Este
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredDuplicateGroups.length > DUP_GROUPS_PER_PAGE && (
                <div className="px-6 py-4 bg-tb-white rounded-2xl border border-tb-rose-light/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-tb-brown-soft">
                    Exibindo grupos <strong>{(safePageDup - 1) * DUP_GROUPS_PER_PAGE + 1}</strong> a{' '}
                    <strong>{Math.min(safePageDup * DUP_GROUPS_PER_PAGE, filteredDuplicateGroups.length)}</strong> de{' '}
                    <strong>{filteredDuplicateGroups.length}</strong> grupos
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={safePageDup <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="px-3.5 py-1.5 rounded-xl border border-tb-rose-light bg-tb-white hover:bg-tb-beige-light text-tb-brown-dark font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="px-3 py-1.5 font-semibold text-tb-brown-dark">
                      Página {safePageDup} de {totalPagesDup}
                    </span>
                    <button
                      type="button"
                      disabled={safePageDup >= totalPagesDup}
                      onClick={() => setCurrentPage(p => Math.min(totalPagesDup, p + 1))}
                      className="px-3.5 py-1.5 rounded-xl border border-tb-rose-light bg-tb-white hover:bg-tb-beige-light text-tb-brown-dark font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CLIENTES SEM NÚMERO / TELEFONE                                    */}
      {/* ========================================================================= */}
      {activeTab === 'sem_numero' && (
        <div className="space-y-4">
          {/* Header Info Banner */}
          <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-800 shrink-0">
                <PhoneOff className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-rose-950 text-sm">
                  {noPhoneClients.length} clientes sem número de telefone válido
                </h4>
                <p className="text-xs text-rose-800 mt-0.5">
                  Estes cadastros não possuem telefone ou estão com números incompletos. Você pode adicionar o telefone correto ou excluir cadastros obsoletos individualmente ou em lote.
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar & Batch Actions */}
          <div className="bg-tb-white rounded-2xl p-4 border border-tb-rose-light/40 shadow-soft flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-tb-gray-neutral absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Pesquisar por nome, código Avec ou e-mail..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* Batch Selection Action Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedIds.size > 0 ? (
                <>
                  <span className="text-xs font-semibold text-tb-brown-dark bg-rose-100 text-rose-800 px-3 py-1.5 rounded-xl border border-rose-200">
                    {selectedIds.size} selecionada(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const selectedClients = noPhoneClients.filter(c => selectedIds.has(c.id));
                      setBatchToDelete(selectedClients);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-soft transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir Selecionadas ({selectedIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="px-3 py-2 rounded-xl border border-tb-rose-light text-tb-brown-soft hover:bg-tb-beige-light text-xs font-medium transition-colors"
                  >
                    Desmarcar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={selectAllCurrentNoPhonePage}
                  className="px-3.5 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory hover:bg-tb-beige-light text-tb-brown-dark text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-tb-rose-primary" />
                  Selecionar Todos da Página
                </button>
              )}
            </div>
          </div>

          {/* Table of No-Phone Clients */}
          <div className="bg-tb-white rounded-3xl border border-tb-rose-light/50 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-tb-ivory border-b border-tb-rose-light/40 text-tb-brown-soft font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-4 w-10 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const allPageSelected = paginatedNoPhoneClients.every(c => selectedIds.has(c.id));
                          if (allPageSelected) {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              paginatedNoPhoneClients.forEach(c => next.delete(c.id));
                              return next;
                            });
                          } else {
                            selectAllCurrentNoPhonePage();
                          }
                        }}
                        className="text-tb-brown-soft hover:text-tb-brown-dark"
                      >
                        {paginatedNoPhoneClients.length > 0 && paginatedNoPhoneClients.every(c => selectedIds.has(c.id)) ? (
                          <CheckSquare className="w-4 h-4 text-tb-rose-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-tb-gray-neutral" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Origem / Notas</th>
                    <th className="px-6 py-4">Data Cadastro</th>
                    <th className="px-6 py-4">Visitas</th>
                    <th className="px-6 py-4">Total Gasto</th>
                    <th className="px-6 py-4 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
                  {filteredNoPhoneClients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-tb-gray-neutral">
                        Nenhuma cliente sem número encontrada.
                      </td>
                    </tr>
                  ) : (
                    paginatedNoPhoneClients.map(client => {
                      const isSelected = selectedIds.has(client.id);

                      return (
                        <tr 
                          key={client.id}
                          className={`hover:bg-tb-ivory/50 transition-colors ${
                            isSelected ? 'bg-rose-50/60' : ''
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => toggleSelectId(client.id)}
                              className="text-tb-brown-soft"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-rose-600" />
                              ) : (
                                <Square className="w-4 h-4 text-tb-gray-neutral" />
                              )}
                            </button>
                          </td>

                          {/* Client Name */}
                          <td className="px-6 py-4 cursor-pointer" onClick={() => onViewClientDetails(client)}>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs border border-rose-200 shrink-0">
                                {client.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-tb-brown-dark block">
                                  {client.name}
                                </span>
                                <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                                  <PhoneOff className="w-3 h-3" />
                                  Telefone não cadastrado
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Notes / Origem */}
                          <td className="px-6 py-4 text-tb-gray-neutral">
                            {client.notes || (client.email ? `Email: ${client.email}` : '—')}
                          </td>

                          {/* Created At */}
                          <td className="px-6 py-4 whitespace-nowrap text-tb-brown-soft">
                            {formatDateBR(client.createdAt)}
                          </td>

                          {/* Visits */}
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
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onEditClient(client)}
                                className="px-2.5 py-1.5 rounded-xl bg-tb-ivory hover:bg-tb-beige-light border border-tb-rose-light text-tb-brown-dark text-[11px] font-semibold transition-colors flex items-center gap-1"
                                title="Cadastrar telefone para esta cliente"
                              >
                                <Edit className="w-3.5 h-3.5 text-tb-rose-primary" />
                                <span>Adicionar Tel</span>
                              </button>
                              <button
                                onClick={() => onViewClientDetails(client)}
                                className="p-2 text-tb-brown-soft hover:bg-tb-beige-light rounded-xl transition-colors"
                                title="Visualizar Ficha"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setClientToDelete(client)}
                                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Excluir cadastro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredNoPhoneClients.length > ITEMS_PER_PAGE && (
              <div className="px-6 py-4 bg-tb-ivory border-t border-tb-rose-light/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-tb-brown-soft">
                  Exibindo <strong>{(safePageNoPhone - 1) * ITEMS_PER_PAGE + 1}</strong> a{' '}
                  <strong>{Math.min(safePageNoPhone * ITEMS_PER_PAGE, filteredNoPhoneClients.length)}</strong> de{' '}
                  <strong>{filteredNoPhoneClients.length}</strong> clientes
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePageNoPhone <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-tb-rose-light bg-tb-white hover:bg-tb-beige-light text-tb-brown-dark font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1.5 font-semibold text-tb-brown-dark">
                    Página {safePageNoPhone} de {totalPagesNoPhone}
                  </span>
                  <button
                    type="button"
                    disabled={safePageNoPhone >= totalPagesNoPhone}
                    onClick={() => setCurrentPage(p => Math.min(totalPagesNoPhone, p + 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-tb-rose-light bg-tb-white hover:bg-tb-beige-light text-tb-brown-dark font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAR EXCLUSÃO INDIVIDUAL DE CLIENTE                          */}
      {/* ========================================================================= */}
      {clientToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-tb-brown-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                  Excluir Cliente?
                </h3>
                <p className="text-xs text-tb-gray-neutral">Ação permanente no sistema</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-tb-ivory border border-tb-rose-light/40 space-y-2 text-xs text-tb-brown-dark">
              <div className="flex justify-between">
                <span className="text-tb-gray-neutral">Nome:</span>
                <span className="font-bold text-tb-brown-dark">{clientToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tb-gray-neutral">Telefone:</span>
                <span className="font-medium text-tb-brown-dark">
                  {isClientWithoutPhone(clientToDelete) ? 'Sem telefone' : maskPhoneBR(clientToDelete.phone)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-tb-gray-neutral">Total de Visitas:</span>
                <span className="font-semibold text-tb-brown-dark">{clientToDelete.totalVisits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tb-gray-neutral">Total Gasto:</span>
                <span className="font-bold text-tb-rose-primary">{formatBRL(clientToDelete.totalSpent)}</span>
              </div>
              {clientToDelete.notes && (
                <div className="flex justify-between">
                  <span className="text-tb-gray-neutral">Notas:</span>
                  <span className="text-tb-brown-soft italic">{clientToDelete.notes}</span>
                </div>
              )}
            </div>

            {/* Warning if client has historical records */}
            {(() => {
              const apts = appointments.filter(a => a.clientId === clientToDelete.id);
              const atds = attendances.filter(a => a.clientId === clientToDelete.id);
              if (apts.length > 0 || atds.length > 0) {
                return (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <p>
                      Atenção: Esta cliente possui <strong>{apts.length} agendamento(s)</strong> e <strong>{atds.length} atendimento(s)</strong> registrados no histórico.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            <p className="text-xs text-tb-gray-neutral">
              Tem certeza que deseja excluir definitivamente o cadastro de <strong>{clientToDelete.name}</strong>?
            </p>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-tb-brown-soft hover:bg-tb-beige-light rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-soft transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAR EXCLUSÃO EM LOTE (BATCH DELETE)                         */}
      {/* ========================================================================= */}
      {batchToDelete && batchToDelete.length > 0 && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-tb-brown-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                  Excluir {batchToDelete.length} Clientes?
                </h3>
                <p className="text-xs text-tb-gray-neutral">Exclusão permanente em lote</p>
              </div>
            </div>

            <p className="text-xs text-tb-brown-soft leading-relaxed">
              Você está prestes a excluir definitivamente os <strong>{batchToDelete.length} cadastros selecionados</strong>. Esta ação não poderá ser desfeita.
            </p>

            <div className="max-h-48 overflow-y-auto rounded-2xl border border-tb-rose-light/40 bg-tb-ivory p-3 divide-y divide-tb-rose-light/30 text-xs">
              {batchToDelete.map(c => (
                <div key={c.id} className="py-1.5 flex justify-between items-center text-tb-brown-dark">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-[11px] text-tb-gray-neutral">
                    {c.phone ? maskPhoneBR(c.phone) : 'Sem tel'} • {c.totalVisits} visitas
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBatchToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-tb-brown-soft hover:bg-tb-beige-light rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-soft transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Excluir {batchToDelete.length} Clientes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
