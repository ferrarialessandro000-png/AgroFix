import * as React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error as any;
      let errorMessage = "Si è verificato un errore imprevisto.";
      let isPermissionError = false;

      try {
        if (error?.message) {
          const parsed = JSON.parse(error.message);
          if (parsed.error && (parsed.error.includes('insufficient permissions') || parsed.error.includes('Missing or insufficient permissions'))) {
            errorMessage = "Accesso Negato (403): Non hai i permessi per visualizzare o modificare questi dati.";
            isPermissionError = true;
          }
        }
      } catch (e) {
        // Not a JSON error message
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-200">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {isPermissionError ? "Errore di Accesso" : "Ops! Qualcosa è andato storto"}
            </h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCcw size={18} />
              Ricarica Applicazione
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
