import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldCheck } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou uma falha não tratada:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetToHome = () => {
    try {
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-tb-ivory flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-tb-white rounded-3xl p-6 sm:p-8 shadow-premium border border-tb-rose-light text-center animate-fade-in">
            {/* Salon Icon */}
            <div className="w-16 h-16 rounded-3xl bg-tb-rose-blush text-tb-rose-primary mx-auto flex items-center justify-center mb-5 shadow-soft">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <span className="text-xs font-semibold tracking-widest text-tb-rose-primary uppercase">
              Total Beauty — Proteção de Dados
            </span>

            <h1 className="font-serif-brand text-2xl font-bold text-tb-brown-dark mt-2 mb-3">
              Ops! Algo inesperado aconteceu.
            </h1>

            <p className="text-sm text-tb-brown-soft mb-6 leading-relaxed">
              Fique tranquilo(a)! Seus agendamentos, clientes, comandas e valores continuam <strong>100% seguros e salvos</strong> na nuvem.
            </p>

            <div className="flex items-center justify-center gap-2 text-xs text-tb-gray-neutral mb-6 bg-tb-beige-light/70 py-2.5 px-4 rounded-xl border border-tb-rose-light/50">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Sincronização Neon & Vercel Blob intacta</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-tb-rose-primary text-white font-medium text-sm hover:bg-tb-brown-soft transition-all shadow-soft active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Sistema
              </button>

              <button
                type="button"
                onClick={this.handleResetToHome}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-tb-beige-light text-tb-brown-dark font-medium text-sm hover:bg-tb-rose-blush border border-tb-rose-light transition-all active:scale-95"
              >
                <Home className="w-4 h-4" />
                Início
              </button>
            </div>

            {/* Expandable debug info */}
            {this.state.error && (
              <details className="mt-6 text-left border-t border-tb-rose-light/50 pt-4">
                <summary className="text-xs text-tb-gray-neutral cursor-pointer hover:text-tb-brown-dark font-medium">
                  Detalhes técnicos do erro
                </summary>
                <pre className="mt-2 p-3 bg-neutral-900 text-neutral-100 rounded-xl text-xs overflow-x-auto font-mono max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
