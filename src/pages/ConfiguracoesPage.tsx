import React, { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { storageService } from '../services/storage';
import { 
  getSavedFirebaseConfig, 
  saveFirebaseConfig, 
  testFirebaseConnection, 
  getFirebaseInstance, 
  syncCollectionToFirestore,
  FirebaseCredentials 
} from '../services/firebase';

interface ConfiguracoesPageProps {
  onOpenChangePassword: () => void;
}

export const ConfiguracoesPage: React.FC<ConfiguracoesPageProps> = ({
  onOpenChangePassword,
}) => {
  const { settings, updateSettings, clients, services, appointments, attendances, payments, expenses, refreshData } = useData();

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

  // Test Firebase Connection
  const handleTestFirebase = async () => {
    if (!fbConfig.apiKey || !fbConfig.projectId) {
      setFbTestStatus({
        loading: false,
        success: false,
        message: 'Preencha pelo menos a API Key e o Project ID do Firebase.',
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
  };

  // Sync all local data to Firestore
  const handleSyncToFirestore = async () => {
    setSyncStatus('Sincronizando com Firestore...');
    try {
      await syncCollectionToFirestore('clients', clients);
      await syncCollectionToFirestore('services', services);
      await syncCollectionToFirestore('appointments', appointments);
      await syncCollectionToFirestore('attendances', attendances);
      await syncCollectionToFirestore('payments', payments);
      await syncCollectionToFirestore('expenses', expenses);
      setSyncStatus('Todos os registros sincronizados com sucesso no Firebase Firestore!');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (err: any) {
      setSyncStatus(`Erro ao sincronizar: ${err?.message || 'Falha de conexão'}`);
    }
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

        {/* SECTION 2: CONEXÃO COM O FIREBASE */}
        <div className="bg-tb-white rounded-3xl p-6 border border-tb-rose-light/50 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-tb-rose-light/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-brand text-xl font-bold text-tb-brown-dark">
                  Banco de Dados Firebase
                </h3>
                <p className="text-xs text-tb-gray-neutral">Firestore & Autenticação em Nuvem</p>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
              isFbActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
            }`}>
              {isFbActive ? 'Firebase Ativo' : 'Armazenamento Local Ativo'}
            </span>
          </div>

          <p className="text-xs text-tb-brown-soft leading-relaxed">
            O sistema salva automaticamente todos os dados com persistência local segura. Para conectar ao seu banco na nuvem Firebase (Firestore), cole suas credenciais do console abaixo:
          </p>

          {fbTestStatus.message && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              fbTestStatus.success 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {fbTestStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />}
              <span>{fbTestStatus.message}</span>
            </div>
          )}

          {syncStatus && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl">
              {syncStatus}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-tb-brown-dark mb-1">API Key</label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={fbConfig.apiKey}
                onChange={e => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-tb-rose-light bg-tb-ivory text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-tb-brown-dark mb-1">Project ID</label>
              <input
                type="text"
                placeholder="total-beauty-xxxxx"
                value={fbConfig.projectId}
                onChange={e => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-tb-rose-light bg-tb-ivory text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-tb-brown-dark mb-1">Auth Domain</label>
              <input
                type="text"
                placeholder="total-beauty.firebaseapp.com"
                value={fbConfig.authDomain}
                onChange={e => setFbConfig({ ...fbConfig, authDomain: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-tb-rose-light bg-tb-ivory text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-tb-brown-dark mb-1">Storage Bucket</label>
              <input
                type="text"
                placeholder="total-beauty.appspot.com"
                value={fbConfig.storageBucket}
                onChange={e => setFbConfig({ ...fbConfig, storageBucket: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-tb-rose-light bg-tb-ivory text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleSyncToFirestore}
              className="px-4 py-2 text-xs font-semibold bg-tb-beige-light hover:bg-tb-beige-champagne text-tb-brown-dark rounded-xl"
            >
              Sincronizar Dados Locais para Nuvem
            </button>
            <button
              type="button"
              onClick={handleTestFirebase}
              disabled={fbTestStatus.loading}
              className="px-5 py-2 text-xs font-semibold bg-tb-rose-primary hover:bg-[#b57f8c] text-white rounded-xl shadow-sm flex items-center gap-1.5"
            >
              {fbTestStatus.loading ? 'Testando...' : 'Salvar & Testar Conexão'}
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
          </div>
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
    </div>
  );
};
