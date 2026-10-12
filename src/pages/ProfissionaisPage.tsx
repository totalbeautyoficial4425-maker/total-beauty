import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CalendarCheck, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  ShieldCheck, 
  KeyRound, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Phone,
  Sparkles,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Professional } from '../types';
import { formatBRL, formatDateBR } from '../utils/formatters';

export const ProfissionaisPage: React.FC = () => {
  const { 
    professionals, 
    addProfessional, 
    updateProfessional, 
    deleteProfessional, 
    getProfessionalMetrics 
  } = useData();

  // Selected professional for individual dossier & commissions view
  const [selectedProfId, setSelectedProfId] = useState<string>(() => {
    return professionals[0]?.id || '';
  });

  // Keep selected ID valid if list changes
  const activeProf = professionals.find(p => p.id === selectedProfId) || professionals[0];

  // Filters for individual transactions
  const [periodFilter, setPeriodFilter] = useState<'hoje' | 'mes' | 'todos'>('mes');
  const [transactionSearch, setTransactionSearch] = useState('');

  // Category filter for team list
  const [profCategoryFilter, setProfCategoryFilter] = useState<'todas' | 'manicure' | 'cabelo' | 'estetica' | 'lash' | 'maquiagem'>('todas');

  const filteredProfessionals = useMemo(() => {
    return professionals.filter(p => {
      if (profCategoryFilter === 'todas') return true;
      const spec = (p.specialty || '').toLowerCase();
      if (profCategoryFilter === 'manicure') return spec.includes('manicure') || spec.includes('unha') || spec.includes('pés');
      if (profCategoryFilter === 'cabelo') return spec.includes('cabel') || spec.includes('cabeleireira');
      if (profCategoryFilter === 'estetica') return spec.includes('estet') || spec.includes('depil');
      if (profCategoryFilter === 'lash') return spec.includes('lash') || spec.includes('cílio');
      if (profCategoryFilter === 'maquiagem') return spec.includes('maquia');
      return true;
    });
  }, [professionals, profCategoryFilter]);

  // Modal: Add / Edit Professional
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState(50);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [color, setColor] = useState('#C58F9B');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [copiedProfId, setCopiedProfId] = useState<string | null>(null);

  // Copy access credentials for WhatsApp
  const handleCopyAccess = (p: Professional) => {
    const profUsername = p.username || p.name.toLowerCase().replace(/\s+/g, '');
    const message = `✨ *Acesso ao Sistema Total Beauty* ✨\n\nOlá, ${p.name}! Aqui estão suas credenciais para acessar o sistema:\n\n🌐 *Link de Acesso:* https://total-beauty-black.vercel.app\n👤 *Usuário:* ${profUsername}\n🔑 *Senha padrão:* ${profUsername}123\n\nNo seu painel exclusivo você tem acesso aos agendamentos, serviços disponíveis e controle particular de comissões do dia e do mês!\nQualquer dúvida, fale com a administração.`;
    navigator.clipboard.writeText(message);
    setCopiedProfId(p.id);
    setTimeout(() => setCopiedProfId(null), 3000);
  };

  // Modal: Delete Confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [profToDelete, setProfToDelete] = useState<Professional | null>(null);

  // Calculate metrics for selected professional
  const selectedMetrics = activeProf ? getProfessionalMetrics(activeProf.id) : null;

  // Filtered transactions for selected professional
  const filteredTransactions = useMemo(() => {
    if (!selectedMetrics) return [];
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    return selectedMetrics.myTransactions.filter(t => {
      // Period filter
      if (periodFilter === 'hoje' && t.date !== today) return false;
      if (periodFilter === 'mes' && !t.date.startsWith(currentMonth)) return false;

      // Search filter
      if (transactionSearch.trim()) {
        const q = transactionSearch.toLowerCase();
        const clientMatch = t.clientName?.toLowerCase().includes(q) || false;
        const serviceMatch = t.serviceName?.toLowerCase().includes(q) || false;
        return clientMatch || serviceMatch;
      }
      return true;
    });
  }, [selectedMetrics, periodFilter, transactionSearch]);

  // Overall salon commissions summary
  const salonTeamTotals = useMemo(() => {
    let todayTotal = 0;
    let monthTotal = 0;
    let pendingTotal = 0;

    professionals.forEach(p => {
      const m = getProfessionalMetrics(p.id);
      todayTotal += m.todayCommissions;
      monthTotal += m.monthCommissions;
      pendingTotal += m.pendingCommissions;
    });

    return { todayTotal, monthTotal, pendingTotal };
  }, [professionals, getProfessionalMetrics]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setName('');
    setSpecialty('');
    setPhone('');
    setCommissionPercentage(50);
    setUsername('');
    setPassword('');
    setColor('#C58F9B');
    setShowPassword(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (p: Professional) => {
    setModalMode('edit');
    setEditingId(p.id);
    setName(p.name);
    setSpecialty(p.specialty);
    setPhone(p.phone);
    setCommissionPercentage(p.commissionPercentage ?? 50);
    setUsername(p.username || '');
    setPassword('');
    setColor(p.color || '#C58F9B');
    setShowPassword(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (p: Professional) => {
    setProfToDelete(p);
    setIsDeleteModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Informe o nome da profissional.');
      return;
    }
    if (!username.trim()) {
      setFormError('Informe o usuário de login.');
      return;
    }

    if (modalMode === 'add') {
      if (!password.trim()) {
        setFormError('Defina uma senha inicial para o login.');
        return;
      }

      const res = addProfessional({
        name: name.trim(),
        specialty: specialty.trim() || 'Especialista',
        phone: phone.trim(),
        color,
        commissionPercentage,
        username: username.trim().toLowerCase().replace(/\s+/g, ''),
        password: password.trim(),
      });

      if (!res.success) {
        setFormError(res.error || 'Erro ao cadastrar profissional.');
        return;
      }

      setFormSuccess('Profissional cadastrada com sucesso!');
      if (res.professional) {
        setSelectedProfId(res.professional.id);
      }
    } else if (modalMode === 'edit' && editingId) {
      const res = updateProfessional(editingId, {
        name: name.trim(),
        specialty: specialty.trim(),
        phone: phone.trim(),
        color,
        commissionPercentage,
        username: username.trim().toLowerCase().replace(/\s+/g, ''),
        password: password.trim() || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Erro ao atualizar dados.');
        return;
      }

      setFormSuccess('Profissional atualizada com sucesso!');
    }

    setIsModalOpen(false);
    setTimeout(() => setFormSuccess(null), 3000);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!profToDelete) return;
    const res = deleteProfessional(profToDelete.id);
    if (res.success) {
      setIsDeleteModalOpen(false);
      setProfToDelete(null);
      setFormSuccess('Profissional excluída com sucesso.');
      // Switch selected to another professional if available
      const remaining = professionals.filter(p => p.id !== profToDelete.id);
      if (remaining.length > 0) {
        setSelectedProfId(remaining[0].id);
      }
      setTimeout(() => setFormSuccess(null), 3000);
    } else {
      alert(res.error || 'Erro ao excluir profissional.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!activeProf || filteredTransactions.length === 0) {
      alert('Nenhuma transação encontrada no período para exportar.');
      return;
    }

    const headers = ['Data', 'Cliente', 'Servico', 'Valor Procedimento (R$)', '% Comissao', 'Comissao a Pagar (R$)', 'Status'];
    const rows = filteredTransactions.map(t => [
      formatDateBR(t.date),
      `"${t.clientName || 'Cliente'}"`,
      `"${t.serviceName || t.description || 'Procedimento'}"`,
      t.netValue.toFixed(2),
      `${t.commissionPercentage || 50}%`,
      (t.commissionAmount || 0).toFixed(2),
      t.status.toUpperCase(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `comissoes_${activeProf.name.replace(/\s+/g, '_')}_${periodFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header Card */}
      <div className="bg-tb-white rounded-3xl p-6 sm:p-8 border border-tb-rose-light/50 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold tracking-widest text-tb-rose-primary">
              Módulo Administrativo
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Controle de Equipe
            </span>
          </div>
          <h2 className="font-serif-brand text-3xl sm:text-4xl font-bold text-tb-brown-dark leading-tight">
            Gestão da Equipe & Comissões
          </h2>
          <p className="text-xs sm:text-sm text-tb-brown-soft mt-1 max-w-2xl leading-relaxed">
            Cadastre as profissionais com login e senha de acesso, configure os percentuais de lucro e acompanhe a contabilidade e comissões individuais em tempo real.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-3 rounded-2xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-premium transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Cadastrar Profissional
        </button>
      </div>

      {/* Success Notification Alert */}
      {formSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Global Salon Team Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-tb-brown-soft">Profissionais Ativas</span>
            <div className="w-9 h-9 rounded-xl bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-tb-brown-dark">
            {professionals.filter(p => p.isActive).length} <span className="text-sm font-normal text-tb-gray-neutral">de {professionals.length}</span>
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Profissionais cadastradas com acesso
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-tb-brown-soft">Comissões a Pagar Hoje</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-800">
            {formatBRL(salonTeamTotals.todayTotal)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Total liberado hoje para a equipe
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-tb-brown-soft">Comissões no Mês (Salão)</span>
            <div className="w-9 h-9 rounded-xl bg-tb-beige-light text-tb-brown-dark flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-tb-brown-dark">
            {formatBRL(salonTeamTotals.monthTotal)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Acumulado de repasses do mês
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-tb-white border border-tb-rose-light/50 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-tb-brown-soft">Comissões Pendentes</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-800">
            {formatBRL(salonTeamTotals.pendingTotal)}
          </div>
          <p className="text-[11px] text-tb-gray-neutral mt-1">
            Aguardando quitação pelo cliente
          </p>
        </div>
      </div>

      {/* Main Container: Left Team Selector & Right Individual Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List of Professionals (4 cols) */}
        <div className="lg:col-span-4 bg-tb-white rounded-3xl p-5 border border-tb-rose-light/50 shadow-soft space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-tb-rose-light/30">
            <div>
              <h3 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                Profissionais
              </h3>
              <p className="text-[11px] text-tb-gray-neutral">
                Clique para ver a comissão individual
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-tb-rose-blush text-tb-rose-primary">
              {filteredProfessionals.length} de {professionals.length}
            </span>
          </div>

          {/* Team Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {[
              { id: 'todas', label: 'Todas' },
              { id: 'manicure', label: 'Manicures' },
              { id: 'cabelo', label: 'Cabeleireiras' },
              { id: 'estetica', label: 'Esteticista' },
              { id: 'lash', label: 'Lash' },
              { id: 'maquiagem', label: 'Maquiagem' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setProfCategoryFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  profCategoryFilter === tab.id
                    ? 'bg-tb-rose-primary text-white shadow-2xs'
                    : 'bg-tb-ivory text-tb-brown-soft hover:bg-tb-beige-light border border-tb-rose-light/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredProfessionals.length === 0 ? (
              <div className="p-6 text-center text-xs text-tb-gray-neutral border border-dashed border-tb-rose-light/70 rounded-2xl bg-tb-ivory/50">
                <Users className="w-8 h-8 text-tb-rose-light mx-auto mb-2" />
                <p className="font-semibold text-tb-brown-dark">Nenhuma profissional nessa categoria</p>
                <p className="text-[11px] mt-1">Selecione "Todas" ou cadastre uma nova profissional.</p>
              </div>
            ) : (
              filteredProfessionals.map(p => {
              const isSelected = p.id === activeProf?.id;
              const pMetrics = getProfessionalMetrics(p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProfId(p.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-tb-rose-blush/40 border-tb-rose-primary shadow-soft'
                      : 'bg-tb-ivory/50 border-tb-rose-light/40 hover:bg-tb-ivory hover:border-tb-rose-light'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-2xs"
                        style={{ backgroundColor: p.color || '#C58F9B' }}
                      >
                        {p.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-serif-brand text-base font-bold text-tb-brown-dark leading-tight">
                          {p.name}
                        </h4>
                        <span className="text-[10px] text-tb-brown-soft block mt-0.5">
                          {p.specialty}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-tb-brown-soft block">
                        Comissão
                      </span>
                      <span className="text-[10px] text-tb-rose-primary font-bold block">
                        Por Serviço
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-tb-rose-light/30 flex items-center justify-between text-[11px]">
                    <span className="text-tb-gray-neutral">
                      Login: <code className="font-semibold text-tb-brown-dark bg-white px-1.5 py-0.5 rounded border border-tb-rose-light/30">@{p.username || p.name.toLowerCase().split(' ')[0]}</code>
                    </span>
                    <span className="font-semibold text-emerald-800">
                      Mês: {formatBRL(pMetrics.monthCommissions)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>

        {/* Right Column: Individual Professional Dossier & Commission Statement (8 cols) */}
        {activeProf ? (
          <div className="lg:col-span-8 bg-tb-white rounded-3xl p-6 sm:p-7 border border-tb-rose-light/50 shadow-soft space-y-6">
            {/* Header of Selected Professional */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-tb-rose-light/40">
              <div className="flex items-center gap-3.5">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-soft"
                  style={{ backgroundColor: activeProf.color || '#C58F9B' }}
                >
                  {activeProf.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif-brand text-2xl font-bold text-tb-brown-dark">
                      {activeProf.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-tb-rose-blush text-tb-rose-primary uppercase">
                      {activeProf.specialty}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-tb-gray-neutral mt-1">
                    <span>Telefone: <strong className="text-tb-brown-dark">{activeProf.phone || 'Não informado'}</strong></span>
                    <span>•</span>
                    <span>Usuário: <code className="font-mono text-tb-brown-dark font-bold bg-tb-ivory px-1.5 py-0.5 rounded border border-tb-rose-light/40">@{activeProf.username || activeProf.name.toLowerCase().split(' ')[0]}</code></span>
                    <span>•</span>
                    <span>Comissão: <strong className="text-tb-rose-primary">Personalizada por Serviço</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for this professional: Edit & Delete */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditModal(activeProf)}
                  className="px-3.5 py-2 text-xs font-semibold bg-tb-beige-light hover:bg-tb-beige-champagne text-tb-brown-dark rounded-xl transition-colors flex items-center gap-1.5"
                  title="Editar dados da profissional e senha"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar / Senha
                </button>

                <button
                  onClick={() => handleOpenDeleteModal(activeProf)}
                  className="p-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
                  title="Excluir profissional"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cartão de Acesso e Credenciais da Profissional (Login & Senha) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-tb-rose-blush/40 via-tb-ivory to-tb-white border border-tb-rose-light/70 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-tb-rose-primary shrink-0" />
                  <span className="text-xs font-bold text-tb-brown-dark">
                    Acesso Exclusivo da Profissional ao Sistema
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Acesso Ativo
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tb-brown-soft">
                  <span>
                    Usuário: <code className="font-mono font-bold text-tb-brown-dark bg-white px-2 py-0.5 rounded border border-tb-rose-light/50">@{activeProf.username || activeProf.name.toLowerCase().replace(/\s+/g, '')}</code>
                  </span>
                  <span>
                    Senha padrão: <code className="font-mono font-bold text-tb-brown-dark bg-white px-2 py-0.5 rounded border border-tb-rose-light/50">{activeProf.username || activeProf.name.toLowerCase().replace(/\s+/g, '')}123</code>
                  </span>
                  <span className="text-[11px] text-tb-gray-neutral">
                    (Liberado apenas: <strong>Meu Painel</strong>, <strong>Agendamentos</strong> e <strong>Serviços</strong>)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => handleCopyAccess(activeProf)}
                  className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                    copiedProfId === activeProf.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white hover:bg-tb-beige-light border border-tb-rose-light text-tb-brown-dark'
                  }`}
                  title="Copiar dados de login para enviar à profissional pelo WhatsApp"
                >
                  {copiedProfId === activeProf.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copiado p/ WhatsApp!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-tb-rose-primary" />
                      <span>Copiar Acesso (WhatsApp)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditModal(activeProf)}
                  className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Redefinir Senha</span>
                </button>
              </div>
            </div>

            {/* Individual Metrics Cards of this Professional */}
            {selectedMetrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-tb-ivory border border-tb-rose-light/50">
                  <span className="text-[11px] font-semibold text-tb-brown-soft block">Comissão Hoje</span>
                  <span className="text-xl font-bold text-tb-rose-primary mt-1 block">
                    {formatBRL(selectedMetrics.todayCommissions)}
                  </span>
                  <span className="text-[10px] text-tb-gray-neutral block mt-0.5">
                    {selectedMetrics.todayCompletedCount} atendimento(s) pagos hoje
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-tb-ivory border border-tb-rose-light/50">
                  <span className="text-[11px] font-semibold text-tb-brown-soft block">Comissão no Mês</span>
                  <span className="text-xl font-bold text-tb-brown-dark mt-1 block">
                    {formatBRL(selectedMetrics.monthCommissions)}
                  </span>
                  <span className="text-[10px] text-tb-gray-neutral block mt-0.5">
                    {selectedMetrics.monthCompletedCount} atendimento(s) pagos no mês
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-tb-ivory border border-tb-rose-light/50">
                  <span className="text-[11px] font-semibold text-tb-brown-soft block">Comissão Pendente</span>
                  <span className="text-xl font-bold text-amber-800 mt-1 block">
                    {formatBRL(selectedMetrics.pendingCommissions)}
                  </span>
                  <span className="text-[10px] text-tb-gray-neutral block mt-0.5">
                    Aguardando quitação
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-tb-ivory border border-tb-rose-light/50">
                  <span className="text-[11px] font-semibold text-tb-brown-soft block">Agendados Hoje</span>
                  <span className="text-xl font-bold text-tb-brown-dark mt-1 block">
                    {selectedMetrics.todayAppointments.length}
                  </span>
                  <span className="text-[10px] text-tb-gray-neutral block mt-0.5">
                    Clientes na agenda
                  </span>
                </div>
              </div>
            )}

            {/* Filter Controls for Transactions Statement */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                {/* Period buttons */}
                <div className="flex bg-tb-ivory p-1 rounded-xl border border-tb-rose-light/50">
                  {[
                    { id: 'hoje', label: 'Hoje' },
                    { id: 'mes', label: 'Este Mês' },
                    { id: 'todos', label: 'Histórico Completo' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPeriodFilter(p.id as any)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        periodFilter === p.id
                          ? 'bg-tb-rose-primary text-white shadow-2xs'
                          : 'text-tb-brown-soft hover:text-tb-brown-dark'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleExportCSV}
                  className="px-3 py-2 text-xs font-semibold bg-tb-white border border-tb-rose-light hover:bg-tb-ivory text-tb-brown-dark rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Exportar planilha CSV"
                >
                  <Download className="w-3.5 h-3.5 text-tb-rose-primary" />
                  <span className="hidden sm:inline">Exportar CSV</span>
                </button>
              </div>

              {/* Search input inside statement */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-tb-gray-neutral absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar cliente ou serviço..."
                  value={transactionSearch}
                  onChange={e => setTransactionSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/20"
                />
              </div>
            </div>

            {/* Detailed Table of Services & Commissions */}
            <div className="rounded-2xl border border-tb-rose-light/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-tb-ivory border-b border-tb-rose-light/40 text-tb-brown-soft font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Procedimento</th>
                      <th className="px-4 py-3">Valor Cobrado</th>
                      <th className="px-4 py-3">% Comissão</th>
                      <th className="px-4 py-3 text-right">Comissão a Pagar</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tb-rose-light/20 text-tb-brown-dark">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-tb-gray-neutral">
                          Nenhum procedimento ou comissão registrada para <strong>{activeProf.name}</strong> no período selecionado.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map(tx => {
                        const commPerc = tx.commissionPercentage || activeProf.commissionPercentage || 50;
                        const commVal = tx.commissionAmount || ((tx.paidAmount * commPerc) / 100);

                        return (
                          <tr key={tx.id} className="hover:bg-tb-ivory/50 transition-colors">
                            <td className="px-4 py-3 font-medium whitespace-nowrap">
                              {formatDateBR(tx.date)}
                            </td>
                            <td className="px-4 py-3 font-bold">
                              {tx.clientName || 'Cliente'}
                            </td>
                            <td className="px-4 py-3 text-tb-brown-soft">
                              {tx.serviceName || tx.description || 'Procedimento'}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {formatBRL(tx.netValue)}
                            </td>
                            <td className="px-4 py-3 font-semibold text-tb-rose-primary">
                              {commPerc}%
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-800 whitespace-nowrap">
                              {formatBRL(commVal)}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                tx.status === 'pago' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {tx.status === 'pago' ? 'Pago' : 'Pendente'}
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
        ) : (
          <div className="lg:col-span-8 p-12 text-center text-xs text-tb-gray-neutral bg-tb-white rounded-3xl border border-tb-rose-light/50 flex flex-col items-center justify-center">
            <Users className="w-12 h-12 text-tb-rose-light mb-3" />
            <h4 className="font-serif-brand text-xl font-bold text-tb-brown-dark mb-1">Nenhuma Profissional Cadastrada</h4>
            <p className="max-w-md text-tb-brown-soft mb-4">Cadastre as profissionais da Total Beauty com usuário e senha para que elas possam acessar a agenda do salão e acompanhar suas comissões particulares.</p>
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-2xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs font-semibold shadow-soft flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Cadastrar Primeira Profissional
            </button>
          </div>
        )}
      </div>

      {/* MODAL: CADASTRAR OU EDITAR PROFISSIONAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-tb-ivory border-b border-tb-rose-light/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                    {modalMode === 'add' ? 'Cadastrar Nova Profissional' : 'Editar Dados da Profissional'}
                  </h3>
                  <p className="text-xs text-tb-gray-neutral">
                    {modalMode === 'add' ? 'Crie a conta de acesso e configure as comissões' : 'Atualize cadastro, comissões ou senha'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-tb-gray-neutral hover:text-tb-brown-dark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-tb-brown-dark mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Gabriela Souza"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark text-xs sm:text-sm focus:ring-2 focus:ring-tb-rose-primary/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-tb-brown-dark mb-1">Especialidade Principal *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Cabelos & Mechas"
                      value={specialty}
                      onChange={e => setSpecialty(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark text-xs sm:text-sm focus:ring-2 focus:ring-tb-rose-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-tb-brown-dark mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark text-xs sm:text-sm focus:ring-2 focus:ring-tb-rose-primary/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block font-semibold text-tb-brown-dark mb-1">Cor Identificadora na Agenda</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-tb-rose-light p-1 bg-tb-ivory cursor-pointer"
                      />
                      <span className="text-xs text-tb-brown-soft font-mono uppercase">{color}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-tb-ivory border border-tb-rose-light/50 text-[11px] text-tb-brown-soft">
                    <strong className="text-tb-brown-dark block mb-0.5">Comissão por Serviço:</strong>
                    Calculada automaticamente de acordo com o percentual configurado em cada serviço do catálogo.
                  </div>
                </div>

                {/* Login Credentials Box */}
                <div className="p-4 rounded-2xl bg-tb-rose-blush/30 border border-tb-rose-light/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-tb-rose-primary" />
                    <span className="font-bold text-tb-brown-dark text-xs">Credenciais de Acesso (Login & Senha)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-tb-brown-dark mb-1">Usuário de Login *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: gabriela"
                        value={username}
                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-white text-tb-brown-dark font-medium focus:ring-2 focus:ring-tb-rose-primary/20 text-xs sm:text-sm"
                      />
                      <span className="text-[10px] text-tb-gray-neutral mt-0.5 block">Apenas letras e números</span>
                    </div>

                    <div>
                      <label className="block font-semibold text-tb-brown-dark mb-1">
                        {modalMode === 'add' ? 'Senha Inicial *' : 'Nova Senha (opcional)'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={modalMode === 'add' ? 'Ex: gabi123' : 'Deixe em branco p/ manter'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full pl-3 pr-8 py-2 rounded-xl border border-tb-rose-light bg-white text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/20 text-xs sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2.5 text-tb-gray-neutral hover:text-tb-brown-dark"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-tb-brown-soft leading-relaxed pt-1 border-t border-tb-rose-light/40">
                    A profissional terá acesso restrito exclusivamente aos módulos: <strong>Meu Painel</strong> (comissões diárias particulares), <strong>Agendamentos</strong> e <strong>Serviços Disponíveis</strong>. Áreas financeiras gerais e configurações permanecem 100% protegidas para a administração.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-tb-rose-light/40 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-tb-brown-soft hover:bg-tb-beige-light rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold bg-tb-rose-primary hover:bg-[#b57f8c] text-white rounded-xl shadow-soft transition-all"
                >
                  {modalMode === 'add' ? 'Concluir Cadastro' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE PROFISSIONAL */}
      {isDeleteModalOpen && profToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                  Excluir Profissional?
                </h3>
                <p className="text-xs text-tb-gray-neutral">Ação permanente no sistema</p>
              </div>
            </div>

            <p className="text-xs text-tb-brown-soft leading-relaxed">
              Você tem certeza que deseja excluir <strong>{profToDelete.name}</strong>? O usuário de login dela (<code>@{profToDelete.username}</code>) será revogado. O histórico financeiro anterior permanecerá preservado.
            </p>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-tb-brown-soft hover:bg-tb-beige-light rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-soft"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
