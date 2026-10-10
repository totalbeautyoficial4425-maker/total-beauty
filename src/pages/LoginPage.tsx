import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, isLockedOut, lockoutRemainingSeconds } = useAuth();
  
  const [usernameOrEmail, setUsernameOrEmail] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = login(usernameOrEmail, password, rememberMe);
      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao realizar login.');
      }
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-tb-ivory flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background orbs with Total Beauty colors */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-tb-rose-blush/60 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-tb-beige-champagne/40 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-tb-white rounded-3xl shadow-premium border border-tb-rose-light/50 overflow-hidden">
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
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isLockedOut && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Sistema temporariamente bloqueado por segurança. Tente novamente em {lockoutRemainingSeconds}s.
                </span>
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
                  value={usernameOrEmail}
                  onChange={e => setUsernameOrEmail(e.target.value)}
                  placeholder="admin ou seu e-mail"
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
                <span>Lembrar meu acesso</span>
              </label>
              <span className="text-tb-gray-neutral text-[11px]">
                Ambiente Seguro
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading || isLockedOut}
              className="w-full py-3.5 px-4 rounded-xl bg-tb-rose-primary hover:bg-[#b57f8c] text-white font-semibold text-sm shadow-soft hover:shadow-premium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span>Acessando...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Initial Demo Credentials Notice */}
          <div className="px-8 py-4 bg-tb-ivory/80 border-t border-tb-rose-light/30 text-center">
            <p className="text-[11px] text-tb-gray-neutral leading-relaxed">
              <span className="font-semibold text-tb-brown-soft">Acesso Inicial Solicitado:</span><br />
              Usuário: <code className="bg-tb-beige-light px-1.5 py-0.5 rounded text-tb-brown-dark font-semibold">admin</code> • Senha: <code className="bg-tb-beige-light px-1.5 py-0.5 rounded text-tb-brown-dark font-semibold">admin123</code>
              <br />
              <span className="text-[10px] text-tb-rose-primary font-medium mt-1 inline-block">
                * No primeiro acesso, será solicitada a criação da sua senha definitiva.
              </span>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-tb-gray-neutral mt-6">
          TOTAL BEAUTY © Todos os direitos reservados. Fuso horário: America/Sao_Paulo.
        </p>
      </div>
    </div>
  );
};
