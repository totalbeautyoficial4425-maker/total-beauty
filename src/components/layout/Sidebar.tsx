import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Sparkles, 
  Clock, 
  DollarSign, 
  BarChart3, 
  Settings, 
  X,
  Database,
  CheckCircle2,
  UserCheck,
  Package,
  Gift,
  KeyRound
} from 'lucide-react';
import { NavigationPage } from '../../types';
import { getFirebaseInstance } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenChangePassword?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  onOpenChangePassword,
}) => {
  const { currentUser } = useAuth();
  const { lowStockCount, outOfStockCount } = useData();
  const { isConnected: isFirebaseConnected } = getFirebaseInstance();

  const isProfessional = currentUser?.role === 'profissional';

  const menuItems: { id: NavigationPage; label: string; icon: React.FC<{ className?: string }> }[] = isProfessional
    ? [
        { id: 'dashboard', label: 'Meu Painel', icon: LayoutDashboard },
        { id: 'agenda', label: 'Agendamentos', icon: CalendarDays },
        { id: 'atendimentos', label: 'Meus Atendimentos', icon: Clock },
        { id: 'servicos', label: 'Serviços Disponíveis', icon: Sparkles },
        { id: 'aniversariantes', label: 'Aniversariantes', icon: Gift },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'agenda', label: 'Agenda', icon: CalendarDays },
        { id: 'clientes', label: 'Clientes', icon: Users },
        { id: 'aniversariantes', label: 'Aniversariantes', icon: Gift },
        { id: 'servicos', label: 'Serviços', icon: Sparkles },
        { id: 'profissionais', label: 'Profissionais', icon: UserCheck },
        { id: 'atendimentos', label: 'Atendimentos', icon: Clock },
        { id: 'estoque', label: 'Estoque do Salão', icon: Package },
        { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
        { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
        { id: 'configuracoes', label: 'Configurações', icon: Settings },
      ];

  const handleItemClick = (page: NavigationPage) => {
    onNavigate(page);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-tb-brown-dark/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-tb-white border-r border-tb-rose-light/50 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-tb-rose-light/40 bg-tb-ivory/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-soft flex items-center justify-center bg-tb-rose-blush border border-tb-rose-light">
              <img 
                src="/logo.png" 
                alt="Total Beauty Logo" 
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  // Fallback to floral icon if image fails
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div>
              <span className="font-serif-brand text-xl font-bold tracking-wide text-tb-brown-dark block leading-tight">
                TOTAL BEAUTY
              </span>
              <span className="text-[10px] tracking-wider uppercase text-tb-brown-soft block font-medium">
                Gestão Inteligente
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-tb-gray-neutral hover:text-tb-brown-dark lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-tb-rose-blush text-tb-brown-dark shadow-sm border border-tb-rose-light font-semibold'
                    : 'text-tb-brown-soft hover:bg-tb-beige-light hover:text-tb-brown-dark'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-tb-rose-primary' : 'text-tb-gray-neutral'
                  }`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'estoque' && (lowStockCount > 0 || outOfStockCount > 0) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200/80 animate-pulse">
                    {lowStockCount + outOfStockCount} repor
                  </span>
                )}
                {isActive && (
                  <span className="w-1.5 h-4 rounded-full bg-tb-rose-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Admin Password Change Quick Access */}
        {currentUser?.role === 'admin' && onOpenChangePassword && (
          <div className="px-3 mb-2">
            <button
              onClick={() => {
                onOpenChangePassword();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-tb-rose-blush/60 to-tb-beige-light border border-tb-rose-light/70 text-xs font-bold text-tb-brown-dark hover:shadow-soft transition-all"
              title="Trocar a senha de administrador por segurança"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-tb-rose-primary" />
                <span>Trocar Senha Admin</span>
              </div>
              <span className="text-[10px] bg-tb-rose-primary text-white px-2 py-0.5 rounded-md">
                Segurança
              </span>
            </button>
          </div>
        )}

        {/* Database Connection & Status Footer */}
        <div className="p-4 mx-3 mb-4 rounded-2xl bg-tb-ivory border border-tb-rose-light/50">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${isFirebaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-tb-rose-primary'}`} />
            <span className="text-xs font-semibold text-tb-brown-dark">
              {isFirebaseConnected ? 'Firebase Conectado' : 'Armazenamento Seguro'}
            </span>
          </div>
          <p className="text-[11px] text-tb-gray-neutral leading-relaxed">
            {isFirebaseConnected 
              ? 'Sincronização em tempo real ativa no Google Firestore.'
              : 'Persistência local ativa. Pronto para conectar ao Firebase & Vercel.'}
          </p>
        </div>
      </aside>
    </>
  );
};
