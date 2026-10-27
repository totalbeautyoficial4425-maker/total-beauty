import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle, ShieldCheck, Sparkles, KeyRound, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cloudSyncService } from '../services/cloudSync';

export const LoginPage: React.FC = () => {
  const { login, resetAdminPassword, isLockedOut, lockoutRemainingSeconds, resetLockout } = useAuth();
  
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Admin Recovery / Sync Modal State
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryVerification, setRecoveryVerification] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await login(usernameOrEmail.trim(), password.trim(), rememberMe);
      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao realizar login.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    if (!recoveryVerification.trim()) {
      setRecoveryError('Informe o WhatsApp ou e-mail cadastrado do salão.');
      return;
    }

    if (recoveryNewPassword.length < 6) {
      setRecoveryError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsRecovering(true);
    try {
      const res = await resetAdminPassword(recoveryVerification.trim(), recoveryNewPassword.trim());
      if (!res.success) {
        setRecoveryError(res.error || 'Erro ao redefinir a senha.');
      } else {
        setRecoverySuccess('Senha redefinida com sucesso na nuvem! Conectando automaticamente...');
        setTimeout(async () => {
          setIsRecoveryOpen(false);
          await login('admin', recoveryNewPassword.trim(), true);
        }, 1200);
      }
    } catch (err: any) {
      setRecoveryError(err?.message || 'Erro ao conectar com o servidor.');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleForceRefresh = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem('tb_session_v1');
      localStorage.removeItem('tb_session_v2');
      sessionStorage.clear();
      await cloudSyncService.pullFromCloud();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-tb-ivory flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background orbs with Total Beauty colors */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-tb-rose-blush/60 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-tb-beige-champagne/40 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 overflow-hidden relative">
          {/* Top Refresh Button for Mobile / Home Screen PWA */}
          <button
            type="button"
            onClick={handleForceRefresh}
            title="Atualizar conexão e sincronizar"
            className="absolute top-4 right-4 p-2 text-tb-rose-primary/70 hover:text-tb-rose-primary hover:bg-tb-rose-blush/40 rounded-xl transition-all z-20 flex items-center gap-1 text-[11px] font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          {/* Top Brand Hero */}
          <div className="px-8 pt-10 pb-6 text-center bg-gradient-to-b from-tb-rose-blush/30 to-tb-white border-b border-tb-rose-light/30">
            <div className="w-20 h-20 mx-auto rounded-2xl p-1 bg-tb-white shadow-soft border border-tb-rose-light/60 flex items-center justify-center mb-4">
              <img 
                src="/logo.png" 
                alt="Total Beauty Oficial" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <h1 className="font-serif-brand text-3xl font-bold tracking-tight text-tb-brown-dark">
              TOTAL BEAUTY
            </h1>
            <p className="text-xs uppercase tracking-widest text-tb-rose-primary font-semibold mt-1">
              Gestão Inteligente de Beleza
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5" autoComplete="off">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isLockedOut && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Bloqueio temporário ativo ({lockoutRemainingSeconds}s).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetLockout}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg transition-colors"
                >
                  Desbloquear
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1.5">
                Usuário ou E-mail
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={usernameOrEmail}
                  onChange={e => setUsernameOrEmail(e.target.value)}
                  placeholder="Digite seu usuário de acesso"
                  className="w-full text-sm pl-10 pr-4 py-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:outline-none focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary transition-all"
                />
                <User className="w-4 h-4 text-tb-gray-neutral absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-tb-brown-dark mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full text-sm pl-10 pr-11 py-3 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:outline-none focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary transition-all"
                />
                <Lock className="w-4 h-4 text-tb-gray-neutral absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-tb-gray-neutral hover:text-tb-brown-dark transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-tb-brown-soft">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded text-tb-rose-primary focus:ring-tb-rose-primary"
                />
                <span>Manter conectado neste aparelho</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white font-semibold text-sm shadow-soft hover:shadow-premium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Conectando e Verificando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setRecoveryError(null);
                  setRecoverySuccess(null);
                  setIsRecoveryOpen(true);
                }}
                className="text-xs text-tb-rose-primary hover:text-tb-brown-dark font-medium transition-colors hover:underline"
              >
                Problemas com a senha? Sincronizar / Redefinir Senha Admin
              </button>
            </div>
          </form>

          {/* Secure Access Notice */}
          <div className="px-8 py-4 bg-tb-ivory/80 border-t border-tb-rose-light/30 text-center">
            <p className="text-[11px] text-tb-gray-neutral leading-relaxed flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-tb-rose-primary shrink-0" />
              <span>Conexão em tempo real: Celular, Tablet e Computador sincronizados.</span>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-tb-gray-neutral mt-6">
          TOTAL BEAUTY © Todos os direitos reservados. Fuso horário: America/Sao_Paulo.
        </p>
      </div>

      {/* Admin Fast Sync / Recovery Modal */}
      {isRecoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tb-brown-dark/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light w-full max-w-md overflow-hidden relative">
            <button
              type="button"
              onClick={() => setIsRecoveryOpen(false)}
              className="absolute right-4 top-4 p-2 text-tb-gray-neutral hover:text-tb-brown-dark rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="px-6 pt-7 pb-4 bg-tb-ivory border-b border-tb-rose-light/40 text-center">
              <div className="w-12 h-12 rounded-2xl bg-tb-rose-blush text-tb-rose-primary mx-auto flex items-center justify-center mb-2 shadow-inner">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-serif-brand text-2xl font-bold text-tb-brown-dark">
                Sincronizar Senha Admin
              </h3>
              <p className="text-xs text-tb-gray-neutral mt-1">
                Conecte ou redefina a senha do Administrador para que funcione instantaneamente no Celular e no Computador.
              </p>
            </div>

            <form onSubmit={handleRecoverySubmit} className="p-6 space-y-4">
              {recoveryError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{recoveryError}</span>
                </div>
              )}

              {recoverySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{recoverySuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                  Confirmação de Segurança (WhatsApp ou E-mail do Salão)
                </label>
                <input
                  type="text"
                  required
                  value={recoveryVerification}
                  onChange={e => setRecoveryVerification(e.target.value)}
                  placeholder="Ex: (34) 99887-6017 ou e-mail cadastrado"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:outline-none focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
                />
                <p className="text-[11px] text-tb-gray-neutral mt-1">
                  Informe o WhatsApp cadastrado do salão (ex: final 6017) ou o e-mail da Total Beauty para validar que você é a administradora.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-tb-brown-dark mb-1">
                  Nova Senha do Administrador
                </label>
                <input
                  type="password"
                  required
                  value={recoveryNewPassword}
                  onChange={e => setRecoveryNewPassword(e.target.value)}
                  placeholder="Digite sua nova senha desejada (mín. 6 dígitos)"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-tb-rose-light bg-tb-ivory text-tb-brown-dark focus:outline-none focus:ring-2 focus:ring-tb-rose-primary/30 focus:border-tb-rose-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecoveryOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-tb-brown-soft hover:text-tb-brown-dark rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isRecovering || !!recoverySuccess}
                  className="px-5 py-2.5 text-xs font-semibold bg-tb-rose-primary hover:bg-[#b57f8c] text-white rounded-xl shadow-soft hover:shadow-premium transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isRecovering ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sincronizando Nuvem...</span>
                    </>
                  ) : (
                    <span>Salvar e Conectar Agora</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
