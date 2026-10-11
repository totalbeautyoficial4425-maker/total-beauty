import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  Plus, 
  User as UserIcon, 
  LogOut, 
  KeyRound, 
  Settings as SettingsIcon,
  ChevronDown,
  Calendar,
  X
} from 'lucide-react';
import { NavigationPage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface HeaderProps {
  currentPage: NavigationPage;
  onOpenMobileMenu: () => void;
  onNavigate: (page: NavigationPage) => void;
  onOpenNewAppointment: () => void;
  onOpenChangePassword: () => void;
}

const PAGE_TITLES: Record<NavigationPage, string> = {
  dashboard: 'Dashboard Geral',
  agenda: 'Agenda Inteligente',
  clientes: 'Gestão de Clientes',
  servicos: 'Catálogo de Serviços',
  atendimentos: 'Atendimentos & Execução',
  financeiro: 'Fluxo Financeiro',
  relatorios: 'Relatórios Gerenciais',
  configuracoes: 'Configurações da Empresa',
  'minha-producao': 'Minha Produção & Comissões',
};

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onOpenMobileMenu,
  onNavigate,
  onOpenNewAppointment,
  onOpenChangePassword,
}) => {
  const { currentUser, logout } = useAuth();
  const { clients, services, appointments } = useData();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formatted date string in Brazilian Portuguese
  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  // Search results
  const filteredClients = searchQuery.trim()
    ? clients.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
      ).slice(0, 4)
    : [];

  const filteredServices = searchQuery.trim()
    ? services.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 3)
    : [];

  return (
    <header className="h-20 bg-tb-white border-b border-tb-rose-light/40 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
      {/* Left side: Hamburger + Page Title & Date */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 text-tb-brown-soft hover:text-tb-brown-dark rounded-xl hover:bg-tb-beige-light lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h1 className="font-serif-brand text-2xl font-bold text-tb-brown-dark leading-tight">
            {currentUser?.role === 'profissional' && currentPage === 'dashboard'
              ? 'Meu Painel'
              : PAGE_TITLES[currentPage] || 'Total Beauty'}
          </h1>
          <p className="text-xs text-tb-gray-neutral capitalize flex items-center gap-1.5 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-tb-rose-primary" />
            {todayFormatted}
          </p>
        </div>
      </div>

      {/* Right side: Search, Actions, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Global Search Bar */}
        <div ref={searchRef} className="relative hidden md:block">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar cliente ou serviço..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              className="w-56 lg:w-72 pl-9 pr-4 py-2 text-xs rounded-xl bg-tb-ivory border border-tb-rose-light/60 text-tb-brown-dark placeholder:text-tb-gray-neutral/70 focus:outline-none focus:ring-2 focus:ring-tb-rose-primary/20 focus:border-tb-rose-primary transition-all"
            />
            <Search className="w-4 h-4 text-tb-gray-neutral absolute left-3 top-2.5" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-tb-gray-neutral hover:text-tb-brown-dark"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick search dropdown results */}
          {searchOpen && searchQuery.trim() && (
            <div className="absolute left-0 right-0 mt-2 bg-tb-white rounded-2xl shadow-premium border border-tb-rose-light/50 p-2 z-50 animate-fade-in">
              {filteredClients.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] font-semibold text-tb-gray-neutral uppercase tracking-wider px-2 py-1">
                    Clientes
                  </div>
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onNavigate('clientes');
                        setSearchOpen(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-tb-beige-light text-xs text-tb-brown-dark flex justify-between items-center"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-[11px] text-tb-gray-neutral">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}

              {filteredServices.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-tb-gray-neutral uppercase tracking-wider px-2 py-1">
                    Serviços
                  </div>
                  {filteredServices.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onNavigate('servicos');
                        setSearchOpen(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-tb-beige-light text-xs text-tb-brown-dark flex justify-between items-center"
                    >
                      <span>{s.name}</span>
                      <span className="text-tb-rose-primary font-medium">R$ {s.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}

              {filteredClients.length === 0 && filteredServices.length === 0 && (
                <div className="p-3 text-center text-xs text-tb-gray-neutral">
                  Nenhum resultado encontrado para "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick New Appointment Button */}
        <button
          onClick={onOpenNewAppointment}
          className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] text-tb-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-premium transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Novo Agendamento</span>
          <span className="sm:hidden">Agendar</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2.5 rounded-xl text-tb-brown-soft hover:text-tb-brown-dark hover:bg-tb-beige-light relative transition-colors"
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            <span className="w-2 h-2 rounded-full bg-tb-rose-primary absolute top-2 right-2 ring-2 ring-tb-white" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-tb-white rounded-2xl shadow-premium border border-tb-rose-light/50 p-4 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-tb-rose-light/30">
                <span className="text-xs font-semibold text-tb-brown-dark">Lembretes do Sistema</span>
                <span className="text-[10px] text-tb-rose-primary font-medium">Hoje</span>
              </div>
              <div className="py-3 space-y-2 text-xs text-tb-brown-soft">
                <div className="p-2 rounded-lg bg-tb-ivory border border-tb-rose-light/30">
                  <p className="font-medium text-tb-brown-dark">Próximos atendimentos</p>
                  <p className="text-[11px] text-tb-gray-neutral mt-0.5">
                    Você tem clientes agendadas para o período da tarde.
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-tb-ivory border border-tb-rose-light/30">
                  <p className="font-medium text-tb-brown-dark">Backup e Sincronização</p>
                  <p className="text-[11px] text-tb-gray-neutral mt-0.5">
                    Dados salvos com segurança localmente e prontos para sincronizar no Firebase.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Account Menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl hover:bg-tb-beige-light transition-colors border border-transparent hover:border-tb-rose-light/40"
          >
            <div className="w-8 h-8 rounded-full bg-tb-rose-blush border border-tb-rose-light flex items-center justify-center text-tb-rose-primary font-bold text-xs">
              {currentUser?.name?.substring(0, 2).toUpperCase() || 'TB'}
            </div>
            <div className="hidden lg:block text-left">
              <span className="text-xs font-semibold text-tb-brown-dark block leading-tight">
                {currentUser?.name || 'Administradora'}
              </span>
              <span className="text-[10px] text-tb-gray-neutral capitalize block">
                {currentUser?.role || 'Admin'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-tb-gray-neutral hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-tb-white rounded-2xl shadow-premium border border-tb-rose-light/50 py-2 z-50 animate-fade-in">
              <div className="px-4 py-2 border-b border-tb-rose-light/30">
                <p className="text-xs font-semibold text-tb-brown-dark">{currentUser?.name}</p>
                <p className="text-[11px] text-tb-gray-neutral truncate">{currentUser?.email}</p>
              </div>

              <div className="py-1">
                {currentUser?.role === 'profissional' ? (
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onNavigate('minha-producao');
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-tb-brown-soft hover:bg-tb-beige-light hover:text-tb-brown-dark flex items-center gap-2.5 font-medium"
                  >
                    <SettingsIcon className="w-4 h-4 text-tb-rose-primary" />
                    Minha Produção & Comissões
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onNavigate('configuracoes');
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-tb-brown-soft hover:bg-tb-beige-light hover:text-tb-brown-dark flex items-center gap-2.5"
                  >
                    <SettingsIcon className="w-4 h-4 text-tb-gray-neutral" />
                    Configurações do Salão
                  </button>
                )}

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onOpenChangePassword();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-tb-brown-soft hover:bg-tb-beige-light hover:text-tb-brown-dark flex items-center gap-2.5"
                >
                  <KeyRound className="w-4 h-4 text-tb-gray-neutral" />
                  Alterar Minha Senha
                </button>
              </div>

              <div className="pt-1 border-t border-tb-rose-light/30">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Encerrar Sessão (Sair)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
