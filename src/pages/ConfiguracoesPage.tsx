import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  MessageCircle, 
  Database, 
  ShieldCheck, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  Globe, 
  KeyRound,
  ExternalLink,
  Users,
  Plus,
  Edit,
  Lock,
  Sparkles,
  X,
  Check,
  Trash2,
  HardDrive,
  Cloud,
  ClipboardPaste,
  HelpCircle
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { storageService } from '../services/storage';
import { idbStorage } from '../services/idbStorage';
import { Professional } from '../types';
import { 
  getSavedFirebaseConfig, 
  saveFirebaseConfig, 
  testFirebaseConnection, 
  getFirebaseInstance, 
  parseFirebaseSnippet,
  FirebaseCredentials 
} from '../services/firebase';

interface ConfiguracoesPageProps {
  onOpenChangePassword: () => void;
}

export const ConfiguracoesPage: React.FC<ConfiguracoesPageProps> = ({
  onOpenChangePassword,
}) => {
  const { 
    settings, 
    updateSettings, 
    clients, 
    services, 
    appointments, 
    attendances, 
    payments, 
    expenses, 
    inventory,
    professionals, 
    addProfessional, 
    updateProfessional, 
    refreshData,
    clearAllData
  } = useData();

  // Storage capacity stats (IndexedDB + Browser Quota)
  const [storageStats, setStorageStats] = useState<{
    usageMB: string;
    quotaGB: string;
    percentUsed: number;
    isPersistent: boolean;
  }>({
    usageMB: '0.15',
    quotaGB: '10.0',
    percentUsed: 0.01,
    isPersistent: true,
  });

  useEffect(() => {
    idbStorage.getStorageStats().then((stats) => {
      setStorageStats(stats);
    });
  }, [clients, services, appointments, attendances, payments, expenses, inventory]);

  // Clear data confirmation modal state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  const handleExecuteClearAll = () => {
    clearAllData();
    setShowClearConfirm(false);
    setClearSuccess(true);
    setTimeout(() => setClearSuccess(false), 4000);
  };

  // Professional Form State
  const [isProfFormOpen, setIsProfFormOpen] = useState(false);
  const [editingProfId, setEditingProfId] = useState<string | null>(null);
  const [profName, setProfName] = useState('');
  const [profSpecialty, setProfSpecialty] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profUsername, setProfUsername] = useState('');
  const [profPassword, setProfPassword] = useState('');
  const [profColor, setProfColor] = useState('#C58F9B');
  const [profError, setProfError] = useState<string | null>(null);
  const [profSuccess, setProfSuccess] = useState<string | null>(null);

  // Company Information State
  const [name, setName] = useState(settings.name || 'TOTAL BEAUTY');
  const [tradingName, setTradingName] = useState(settings.tradingName || 'TOTAL BEAUTY — Gestão Inteligente de Beleza');
  const [phone, setPhone] = useState(settings.phone || '');
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp || '');
  const [email, setEmail] = useState(settings.email || '');
  const [address, setAddress] = useState(settings.address || '');

  // WhatsApp Templates
  const [whatsappTemplates, setWhatsappTemplates] = useState(settings.whatsappTemplates);

  // Firebase Config State
  const savedFb = getSavedFirebaseConfig() || {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  };
  const [fbConfig, setFbConfig] = useState<FirebaseCredentials>(savedFb);
  const [fbSnippetInput, setFbSnippetInput] = useState('');
  const [showFbGuide, setShowFbGuide] = useState(false);
  const [fbTestStatus, setFbTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({ loading: false });
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Success Feedback
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Save General Company Info
  const handleSaveCompanyInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...settings,
      name,
      tradingName,
      phone,
      whatsapp,
      email,
      address,
      whatsappTemplates,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Smart parse Firebase code block
  const handleParseFirebaseSnippet = (raw: string) => {
    setFbSnippetInput(raw);
    const extracted = parseFirebaseSnippet(raw);
    if (extracted && (extracted.apiKey || extracted.projectId)) {
      setFbConfig({
        apiKey: extracted.apiKey || fbConfig.apiKey,
        projectId: extracted.projectId || fbConfig.projectId,
        authDomain: extracted.authDomain || fbConfig.authDomain,
        storageBucket: extracted.storageBucket || fbConfig.storageBucket,
        messagingSenderId: extracted.messagingSenderId || fbConfig.messagingSenderId,
        appId: extracted.appId || fbConfig.appId,
      });
      setFbTestStatus({
        loading: false,
        success: true,
        message: 'Credenciais extraídas automaticamente do código colado! Clique em "Salvar & Conectar Firebase" abaixo.',
      });
    }
  };

  // Test Firebase Connection & Auto-Sync
  const handleTestFirebase = async () => {
    if (!fbConfig.apiKey || !fbConfig.projectId) {
      setFbTestStatus({
        loading: false,
        success: false,
        message: 'Preencha pelo menos a API Key e o Project ID do Firebase (ou cole o bloco firebaseConfig acima).',
      });
      return;
    }

    setFbTestStatus({ loading: true });
    saveFirebaseConfig(fbConfig);
    const res = await testFirebaseConnection(fbConfig);
    setFbTestStatus({
      loading: false,
      success: res.success,
      message: res.message,
    });

    if (res.success) {
      const syncRes = await storageService.pushAllToFirestore();
      if (syncRes.success) {
        setSyncStatus(syncRes.message);
        setTimeout(() => setSyncStatus(null), 5000);
      }
    }
  };

  // Sync all local data to Firestore (Upload)
  const handleSyncToFirestore = async () => {
    setSyncStatus('Enviando todos os registros para o Firebase Cloud Firestore...');
    const res = await storageService.pushAllToFirestore();
    setSyncStatus(res.message);
    setTimeout(() => setSyncStatus(null), 5000);
  };

  // Pull all data from Firestore (Download)
  const handlePullFromFirestore = async () => {
    setSyncStatus('Baixando registros da nuvem Firebase Firestore...');
    const res = await storageService.pullAllFromFirestore();
    if (res.success) {
      refreshData();
    }
    setSyncStatus(res.message);
    setTimeout(() => setSyncStatus(null), 5000);
  };

  // Backup Export
  const handleExportBackup = () => {
    const json = storageService.exportFullBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_total_beauty_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Backup Import
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = storageService.importFullBackup(content);
        if (success) {
          alert('Backup importado com sucesso!');
          refreshData();
        } else {
          alert('Erro ao importar backup: formato de arquivo inválido.');
        }
      }
    };
    reader.readAsText(file);
  };

  // Professional Handlers
  const handleOpenAddProf = () => {
    setEditingProfId(null);
    setProfName('');
    setProfSpecialty('');
    setProfPhone('');
    setProfUsername('');
    setProfPassword('');
    setProfColor('#C58F9B');
    setProfError(null);
    setIsProfFormOpen(true);
  };

  const handleOpenEditProf = (p: Professional) => {
    setEditingProfId(p.id);
    setProfName(p.name);
    setProfSpecialty(p.specialty);
    setProfPhone(p.phone);
    setProfUsername(p.username || '');
    setProfPassword('');
    setProfColor(p.color || '#C58F9B');
    setProfError(null);
    setIsProfFormOpen(true);
  };

  const handleSaveProf = (e: React.FormEvent) => {
    e.preventDefault();
    setProfError(null);

    if (!profName.trim()) {
      setProfError('O nome da profissional é obrigatório.');
      return;
    }
    if (!profUsername.trim()) {
      setProfError('O usuário de login é obrigatório.');
      return;
    }

    if (editingProfId) {
      const res = updateProfessional(editingProfId, {
        name: profName.trim(),
        specialty: profSpecialty.trim(),
        phone: profPhone.trim(),
        color: profColor,
        username: profUsername.trim(),
        password: profPassword.trim() || undefined,
      });
      if (!res.success) {
        setProfError(res.error || 'Erro ao atualizar profissional.');
        return;
      }
      setProfSuccess('Profissional atualizada com sucesso!');
    } else {
      if (!profPassword.trim()) {
        setProfError('Informe uma senha inicial para o login.');
        return;
      }
      const res = addProfessional({
        name: profName.trim(),
        specialty: profSpecialty.trim() || 'Especialista',
        phone: profPhone.trim(),
        color: profColor,
        username: profUsername.trim(),
        password: profPassword.trim(),
      });
      if (!res.success) {
        setProfError(res.error || 'Erro ao cadastrar profissional.');
        return;
      }
      setProfSuccess('Nova profissional cadastrada com sucesso!');
    }

    setIsProfFormOpen(false);
    setTimeout(() => setProfSuccess(null), 3000);
  };

  const { isConnected: isFbActive } = getFirebaseInstance();

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header Card */}
      <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft flex items-center justify-between">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-tb-rose-primary block mb-1">
            Painel de Ajustes
          </span>
          <h2 className="font-serif-brand text-3xl font-bold text-tb-brown-dark">
            Configurações da Empresa
          </h2>
          <p className="text-xs text-tb-gray-neutral mt-1">
            Personalize a identidade da Total Beauty, modelos de mensagens, banco de dados Firebase e integrações.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Configurações salvas!
          </div>
        )}
      </div>

      {/* SECTION: EQUIPE & PROFISSIONAIS (LOGIN, SENHA E COMISSÕES) */}
      <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-tb-rose-light/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-2xl font-bold text-tb-brown-dark">
                Equipe & Profissionais
              </h3>
              <p className="text-xs text-tb-gray-neutral">
                Cadastre as profissionais com usuário, senha e comissão individual
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddProf}
            className="px-4 py-2.5 rounded-2xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white text-xs font-semibold shadow-soft hover:shadow-premium transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Cadastrar Nova Profissional
          </button>
        </div>

        {profSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {profSuccess}
          </div>
        )}

        {/* Informative credentials quick-guide */}
        <div className="p-4 rounded-2xl bg-tb-ivory border border-tb-rose-light/50 text-xs">
          <p className="font-semibold text-tb-brown-dark mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-tb-rose-primary" />
            Acesso Individualizado das Profissionais
          </p>
          <p className="text-tb-brown-soft leading-relaxed">
            Cada profissional tem login e senha próprios. Ao acessar, ela vê a <strong>Agenda Geral do Salão</strong> (com os nomes de todas as clientes e quais outras profissionais vão atender) e <strong>estritamente a sua contabilidade particular</strong> (comissões a receber hoje, no mês e extrato próprio).
          </p>
        </div>

        {/* Modal / Form Inline to Add or Edit Professional */}
        {isProfFormOpen && (
          <form onSubmit={handleSaveProf} className="p-5 rounded-2xl bg-tb-ivory/60 border border-tb-rose-light shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-tb-rose-light/40">
              <span className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                {editingProfId ? 'Editar Profissional & Acesso' : 'Cadastrar Nova Profissional'}
              </span>
              <button
                type="button"
                onClick={() => setIsProfFormOpen(false)}
                className="text-tb-gray-neutral hover:text-tb-brown-dark p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {profError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-tb-brown-dark mb-1">Nome Completo *</label>
                <input
                  type="text"
                  placeholder="Ex: Gabriela Souza"
                  required
                  value={profName}
                  onChange={e => setProfName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-tb-brown-dark mb-1">Especialidade Principal *</label>
                <input
                  type="text"
                  placeholder="Ex: Cabelos & Coloração"
                  required
                  value={profSpecialty}
                  onChange={e => setProfSpecialty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-tb-brown-dark mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={profPhone}
                  onChange={e => setProfPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-tb-brown-dark mb-1">Usuário para Login *</label>
                <input
                  type="text"
                  placeholder="Ex: gabriela"
                  required
                  value={profUsername}
                  onChange={e => setProfUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30 font-medium"
                />
                <span className="text-[10px] text-tb-gray-neutral mt-0.5 block">Usado para entrar no sistema</span>
              </div>

              <div>
                <label className="block font-semibold text-tb-brown-dark mb-1">
                  {editingProfId ? 'Nova Senha (opcional)' : 'Senha Inicial *'}
                </label>
                <input
                  type="text"
                  placeholder={editingProfId ? 'Deixe em branco p/ manter' : 'Ex: gabi123'}
                  value={profPassword}
                  onChange={e => setProfPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/30"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsProfFormOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-tb-brown-soft hover:bg-tb-beige-light rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-tb-rose-primary hover:bg-[#b57f8c] text-white rounded-xl shadow-soft"
              >
                Salvar Profissional
              </button>
            </div>
          </form>
        )}

        {/* Professionals Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {professionals.map(p => (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                p.isActive
                  ? 'bg-tb-ivory/40 border-tb-rose-light/50 shadow-soft hover:shadow-premium'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-tb-rose-blush text-tb-rose-primary">
                    {p.specialty}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${p.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                </div>

                <h4 className="font-serif-brand text-lg font-bold text-tb-brown-dark">
                  {p.name}
                </h4>
                <p className="text-[11px] text-tb-brown-soft">
                  {p.phone || 'Sem telefone'}
                </p>

                <div className="mt-2.5 p-2.5 bg-tb-white rounded-xl border border-tb-rose-light/30 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-tb-gray-neutral">Usuário de Login:</span>
                    <span className="font-semibold text-tb-brown-dark bg-tb-ivory px-2 py-0.5 rounded border border-tb-rose-light/30 font-mono text-[11px]">
                      {p.username || p.name.toLowerCase().split(' ')[0]}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-tb-gray-neutral">Regra de Comissão:</span>
                    <span className="font-bold text-tb-rose-primary text-[11px]">
                      Por Serviço Realizado
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-tb-rose-light/30 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => updateProfessional(p.id, { isActive: !p.isActive })}
                  className="text-[11px] text-tb-gray-neutral hover:text-tb-brown-dark transition-colors"
                >
                  {p.isActive ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditProf(p)}
                  className="px-3 py-1.5 text-xs font-semibold bg-tb-beige-light hover:bg-tb-beige-champagne text-tb-brown-dark rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar / Senha
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: DADOS DA EMPRESA */}
        <form onSubmit={handleSaveCompanyInfo} className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-tb-rose-light/30">
            <div className="w-10 h-10 rounded-full bg-tb-rose-blush text-tb-rose-primary flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                Dados da Total Beauty
              </h3>
              <p className="text-xs text-tb-gray-neutral">Informações de contato e cabeçalho</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">Título Oficial</label>
              <input
                type="text"
                value={tradingName}
                onChange={e => setTradingName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">Telefone Fixo / Balcão</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">WhatsApp Comercial</label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">E-mail Comercial</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1">Endereço Completo</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-tb-rose-primary hover:bg-[#b57f8c] text-white rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Salvar Dados da Empresa
            </button>
          </div>
        </form>

        {/* SECTION 2: BANCO DE DADOS FIREBASE & ARMAZENAMENTO DE ALTA CAPACIDADE */}
        <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-tb-rose-light/30 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark flex items-center gap-2">
                  Banco de Dados Firebase & Armazenamento
                  <span className="text-[11px] font-sans font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Nuvem + IndexedDB
                  </span>
                </h3>
                <p className="text-xs text-tb-gray-neutral">Firestore Cloud Database & Cache Local de Alta Capacidade</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                isFbActive ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {isFbActive ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                    Firebase Cloud Conectado
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                    IndexedDB Expandido Ativo
                  </>
                )}
              </span>
            </div>
          </div>

          {/* CARD DE MONITORAMENTO DE CAPACIDADE DE ARMAZENAMENTO */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-tb-ivory p-4 sm:p-5 border border-amber-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold text-tb-brown-dark">
                  Capacidade de Armazenamento Expandida:
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                  ~{storageStats.quotaGB} GB disponíveis no dispositivo
                </span>
              </div>
              <span className="text-[11px] text-tb-brown-soft">
                Utilizado localmente: <strong>{storageStats.usageMB} MB</strong> ({storageStats.percentUsed.toFixed(2)}%)
              </span>
            </div>

            <p className="text-xs text-tb-brown-soft leading-relaxed">
              O sistema utiliza a arquitetura de <strong>Banco de Dados IndexedDB de Alta Capacidade</strong> + <strong>Firebase Cloud Firestore</strong>, superando o limite padrão de 5 MB do navegador. Você pode cadastrar dezenas de milhares de clientes, serviços e atendimentos sem restrição.
            </p>

            {/* Totalizadores de registros em tempo real */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="bg-white/80 p-2 rounded-xl border border-amber-200/60 flex items-center justify-between">
                <span className="text-tb-brown-soft">Clientes:</span>
                <strong className="text-tb-brown-dark font-mono">{clients.length}</strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-200/60 flex items-center justify-between">
                <span className="text-tb-brown-soft">Agendamentos:</span>
                <strong className="text-tb-brown-dark font-mono">{appointments.length}</strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-200/60 flex items-center justify-between">
                <span className="text-tb-brown-soft">Atendimentos:</span>
                <strong className="text-tb-brown-dark font-mono">{attendances.length}</strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-200/60 flex items-center justify-between">
                <span className="text-tb-brown-soft">Serviços:</span>
                <strong className="text-tb-brown-dark font-mono">{services.length}</strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-200/60 flex items-center justify-between">
                <span className="text-tb-brown-soft">Profissionais:</span>
                <strong className="text-tb-brown-dark font-mono">{professionals.length}</strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-200/60 flex items-center justify-between">
                <span className="text-tb-brown-soft">Itens Estoque:</span>
                <strong className="text-tb-brown-dark font-mono">{inventory.length}</strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-200/60 flex items-center justify-between">
                <span className="text-tb-brown-soft">Receitas:</span>
                <strong className="text-tb-brown-dark font-mono">{payments.length}</strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-amber-200/60 flex items-center justify-between">
                <span className="text-tb-brown-soft">Despesas:</span>
                <strong className="text-tb-brown-dark font-mono">{expenses.length}</strong>
              </div>
            </div>
          </div>

          {/* Feedback Status */}
          {fbTestStatus.message && (
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              fbTestStatus.success 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {fbTestStatus.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              )}
              <span className="leading-relaxed">{fbTestStatus.message}</span>
            </div>
          )}

          {syncStatus && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}

          {/* COLAR CÓDIGO RÁPIDO DO FIREBASE (SMART PASTE) */}
          <div className="rounded-2xl bg-tb-ivory/60 p-4 border border-tb-rose-light/50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-tb-brown-dark flex items-center gap-1.5">
                <ClipboardPaste className="w-4 h-4 text-tb-rose-primary" />
                Preenchimento Rápido: Cole o bloco "firebaseConfig" do Console
              </label>
              <button
                type="button"
                onClick={() => setShowFbGuide(!showFbGuide)}
                className="text-[11px] text-tb-rose-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showFbGuide ? 'Ocultar Tutorial' : 'Como pegar essa chave no Firebase?'}
              </button>
            </div>

            <textarea
              rows={2}
              placeholder='Cole aqui o código copiado do Firebase (ex: const firebaseConfig = { apiKey: "AIza...", projectId: "...", ... })'
              value={fbSnippetInput}
              onChange={(e) => handleParseFirebaseSnippet(e.target.value)}
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-tb-rose-light bg-white text-tb-brown-dark placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-tb-rose-primary"
            />
            <p className="text-[11px] text-tb-gray-neutral">
              Ao colar, os campos de API Key, Project ID, Auth Domain e Storage Bucket abaixo são preenchidos automaticamente.
            </p>
          </div>

          {/* TUTORIAL PASSO A PASSO (EXPANDÍVEL) */}
          {showFbGuide && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-2 text-tb-brown-dark animate-fade-in">
              <h4 className="font-bold flex items-center gap-1.5 text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Passo a Passo para Conectar seu Firebase Gratuito (1 Minuto):
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-tb-brown-soft leading-relaxed pl-1">
                <li>
                  Acesse <strong><a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-800 underline">console.firebase.google.com</a></strong> com sua conta Google e clique em <strong>Adicionar projeto</strong> (ex: "Total Beauty").
                </li>
                <li>
                  No menu lateral esquerdo, clique em <strong>Criação &gt; Firestore Database</strong> e clique em <strong>Criar banco de dados</strong> (escolha o local São Paulo <code>southamerica-east1</code> ou padrão).
                </li>
                <li>
                  Na aba <strong>Regras (Rules)</strong> do Firestore, altere para <code>allow read, write: if true;</code> e clique em <strong>Publicar</strong> para liberar o acesso ao sistema do salão.
                </li>
                <li>
                  Clique na engrenagem ⚙️ (Configurações do Projeto) &gt; role até o final em "Seus aplicativos" &gt; adicione uma Web App <code>&lt;/&gt;</code> &gt; copie o bloco <code>firebaseConfig</code> e cole no campo acima!
                </li>
              </ol>
            </div>
          )}

          {/* CAMPOS INDIVIDUAIS DE CREDENCIAIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-tb-brown-dark mb-1">API Key</label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={fbConfig.apiKey}
                onChange={e => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-tb-brown-dark mb-1">Project ID</label>
              <input
                type="text"
                placeholder="total-beauty-xxxxx"
                value={fbConfig.projectId}
                onChange={e => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-tb-brown-dark mb-1">Auth Domain</label>
              <input
                type="text"
                placeholder="total-beauty.firebaseapp.com"
                value={fbConfig.authDomain}
                onChange={e => setFbConfig({ ...fbConfig, authDomain: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-tb-brown-dark mb-1">Storage Bucket</label>
              <input
                type="text"
                placeholder="total-beauty.firebasestorage.app"
                value={fbConfig.storageBucket}
                onChange={e => setFbConfig({ ...fbConfig, storageBucket: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-tb-brown-dark mb-1">Messaging Sender ID</label>
              <input
                type="text"
                placeholder="123456789012"
                value={fbConfig.messagingSenderId}
                onChange={e => setFbConfig({ ...fbConfig, messagingSenderId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-tb-brown-dark mb-1">App ID</label>
              <input
                type="text"
                placeholder="1:123456789012:web:abcdef..."
                value={fbConfig.appId}
                onChange={e => setFbConfig({ ...fbConfig, appId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-tb-rose-light bg-tb-ivory text-xs font-mono"
              />
            </div>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handlePullFromFirestore}
              className="px-4 py-2.5 text-xs font-semibold bg-tb-ivory hover:bg-tb-beige-light border border-tb-rose-light text-tb-brown-dark rounded-xl flex items-center gap-1.5 transition-colors"
              title="Baixar todos os registros salvos na nuvem Firebase para este dispositivo"
            >
              <Download className="w-4 h-4 text-tb-rose-primary" />
              Baixar Dados da Nuvem
            </button>
            <button
              type="button"
              onClick={handleSyncToFirestore}
              className="px-4 py-2.5 text-xs font-semibold bg-tb-beige-light hover:bg-tb-beige-champagne text-tb-brown-dark rounded-xl flex items-center gap-1.5 transition-colors"
              title="Enviar todos os clientes, agendamentos, estoque e financeiro para o Firebase"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              Enviar Tudo para Nuvem
            </button>
            <button
              type="button"
              onClick={handleTestFirebase}
              disabled={fbTestStatus.loading}
              className="px-5 py-2.5 text-xs font-semibold bg-tb-rose-primary hover:bg-[#b57f8c] text-white rounded-xl shadow-soft flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {fbTestStatus.loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Conectando ao Firebase...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Salvar & Conectar Firebase
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: MODELOS DE MENSAGENS WHATSAPP */}
      <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-tb-rose-light/30">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
              Modelos Padrão do WhatsApp
            </h3>
            <p className="text-xs text-tb-gray-neutral">
              Tags suportadas: <code className="bg-tb-ivory px-1 rounded text-tb-rose-primary font-bold">[NOME]</code>, <code className="bg-tb-ivory px-1 rounded text-tb-rose-primary font-bold">[DATA]</code>, <code className="bg-tb-ivory px-1 rounded text-tb-rose-primary font-bold">[HORÁRIO]</code>, <code className="bg-tb-ivory px-1 rounded text-tb-rose-primary font-bold">[SERVIÇO]</code>, <code className="bg-tb-ivory px-1 rounded text-tb-rose-primary font-bold">[PROFISSIONAL]</code>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Confirmação de Agendamento
            </label>
            <textarea
              rows={3}
              value={whatsappTemplates.confirmacao}
              onChange={e => setWhatsappTemplates({ ...whatsappTemplates, confirmacao: e.target.value })}
              className="w-full text-xs p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Lembrete do Horário
            </label>
            <textarea
              rows={3}
              value={whatsappTemplates.lembrete}
              onChange={e => setWhatsappTemplates({ ...whatsappTemplates, lembrete: e.target.value })}
              className="w-full text-xs p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Agradecimento Pós-Visita
            </label>
            <textarea
              rows={3}
              value={whatsappTemplates.agradecimento}
              onChange={e => setWhatsappTemplates({ ...whatsappTemplates, agradecimento: e.target.value })}
              className="w-full text-xs p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
              Convite de Retorno
            </label>
            <textarea
              rows={3}
              value={whatsappTemplates.retorno}
              onChange={e => setWhatsappTemplates({ ...whatsappTemplates, retorno: e.target.value })}
              className="w-full text-xs p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-tb-brown-dark mb-1 flex items-center gap-1.5">
              <span>🎂 Felicitação de Aniversário (Parabéns via WhatsApp)</span>
              <span className="text-[10px] text-pink-600 font-bold bg-pink-100 px-2 py-0.5 rounded-full">Novo</span>
            </label>
            <textarea
              rows={3}
              value={whatsappTemplates.aniversario || ''}
              onChange={e => setWhatsappTemplates({ ...whatsappTemplates, aniversario: e.target.value })}
              className="w-full text-xs p-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:ring-2 focus:ring-tb-rose-primary/20"
              placeholder="Ex: Parabéns, [NOME]! Toda a equipe da Total Beauty deseja a você um feliz aniversário..."
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSaveCompanyInfo}
            className="px-5 py-2 text-xs font-semibold bg-tb-rose-primary hover:bg-[#b57f8c] text-white rounded-xl shadow-sm"
          >
            Salvar Modelos de WhatsApp
          </button>
        </div>
      </div>

      {/* SECTION 4: SEGURANÇA, BACKUP & VERCEL DEPLOY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup & Dados */}
        <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-tb-rose-light/30">
            <div className="w-10 h-10 rounded-full bg-tb-beige-light text-tb-brown-dark flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                Backup Completo de Dados
              </h3>
              <p className="text-xs text-tb-gray-neutral">Exportação e restauração segura</p>
            </div>
          </div>

          <p className="text-xs text-tb-brown-soft leading-relaxed">
            Exporte todos os cadastros, agendamentos, atendimentos e transações financeiras em formato JSON seguro para arquivamento ou migração.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleExportBackup}
              className="px-4 py-2.5 text-xs font-semibold bg-tb-beige-light hover:bg-tb-beige-champagne text-tb-brown-dark rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-tb-rose-primary" />
              Baixar Arquivo de Backup (JSON)
            </button>

            <label className="px-4 py-2.5 text-xs font-semibold bg-tb-ivory hover:bg-tb-beige-light text-tb-brown-dark border border-tb-rose-light rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors">
              <Upload className="w-4 h-4 text-tb-brown-soft" />
              Restaurar Backup
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>

            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl flex items-center gap-1.5 transition-colors"
              title="Excluir todos os registros e deixar o sistema pronto para dados reais"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              Limpar / Zerar Dados
            </button>
          </div>

          {clearSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Todos os dados foram excluídos com sucesso! O sistema está zerado e pronto para dados reais.
            </div>
          )}
        </div>

        {/* Segurança de Acesso & Vercel */}
        <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-tb-rose-light/30">
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                Hospedagem Vercel & Segurança
              </h3>
              <p className="text-xs text-tb-gray-neutral">Publicação e controle de acesso</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-tb-brown-dark">
            <div className="p-3 bg-tb-ivory rounded-2xl border border-tb-rose-light/40 flex items-center justify-between">
              <div>
                <p className="font-bold">Credenciais da Administradora</p>
                <p className="text-[11px] text-tb-gray-neutral mt-0.5">Altere sua senha de acesso a qualquer momento</p>
              </div>
              <button
                onClick={onOpenChangePassword}
                className="px-3 py-1.5 bg-tb-rose-blush text-tb-rose-primary font-semibold rounded-xl hover:bg-tb-rose-light transition-colors"
              >
                Alterar Senha
              </button>
            </div>

            <div className="p-3 bg-tb-ivory rounded-2xl border border-tb-rose-light/40">
              <p className="font-bold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-tb-rose-primary" />
                Hospedagem na Vercel
              </p>
              <p className="text-[11px] text-tb-gray-neutral mt-1">
                A aplicação está 100% pronta com <code className="bg-tb-white px-1 py-0.5 rounded border border-tb-rose-light">vercel.json</code> otimizado. Você pode executar o deploy diretamente com um clique ou comando Vercel CLI.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL: ZERAR DADOS DO SISTEMA */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 w-full max-w-md overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="font-serif-brand text-2xl font-bold text-tb-brown-dark">
                Zerar Todos os Dados?
              </h3>
              <p className="text-xs text-tb-brown-soft leading-relaxed">
                Esta ação apagará <strong>todos os clientes, serviços, profissionais de demonstração, agendamentos e transações financeiras</strong>, deixando o sistema totalmente limpo para você inserir os dados reais da Total Beauty.
              </p>
              <p className="text-[11px] text-tb-gray-neutral bg-tb-ivory p-3 rounded-xl border border-tb-rose-light/40">
                A sua conta de administradora (<strong>admin</strong>) será mantida com segurança.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-tb-rose-light bg-tb-white text-tb-brown-dark text-xs font-semibold hover:bg-tb-ivory transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClearAll}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-soft transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Sim, Zerar Dados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
