import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, Mail, AlertCircle, ArrowLeft, Eye, EyeOff, Sparkles } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface AdminLoginScreenProps {
  onBackToPublic: () => void;
  destinationTabTitle?: string;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  onBackToPublic,
  destinationTabTitle = 'Panel Administrativo'
}) => {
  const { loginWithGoogle, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Credenciales no válidas.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await login('demo@ipstecnologica.com', 'Demo2026*');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar modo DEMO.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <BrandLogo size="sm" />
            <span className="text-[10px] font-mono uppercase bg-red-600/30 text-red-400 border border-red-500/40 px-2 py-0.5 rounded font-bold">
              Zona Protegida
            </span>
          </div>

          <h2 className="text-lg font-bold text-white tracking-tight">
            Acceso al Sistema IPS TECNOLÓGICA
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Autenticación requerida para acceder a: <strong className="text-white">{destinationTabTitle}</strong>
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Shield className="w-4 h-4 text-red-600" />
              <span>Control de Acceso por Roles (RBAC)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Ingresa con tus credenciales autorizadas o explora en modo DEMO de solo consulta.
            </p>
          </div>

          {/* Primary Action: Official Google Sign-In Button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-slate-400 rounded-xl text-slate-800 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-3 disabled:opacity-50 hover:shadow-md cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{loading ? 'Verificando con Google...' : 'Continuar con Google'}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-2.5 text-[10px] text-slate-400 uppercase font-semibold shrink-0">
              o acceso con correo y contraseña
            </span>
          </div>

          {/* Clean Password Form with empty default inputs */}
          <form onSubmit={handleManualSignIn} className="space-y-3" autoComplete="off">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Ingresa tu correo corporativo"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full pl-9 pr-9 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 p-0.5"
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Validando...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Read-Only Demo User Button */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Usuario DEMO (Solo Consulta)
              </span>
              <p className="text-[10px] text-amber-800/80">
                Visualiza el sistema sin permisos de edición ni acceso a datos reales.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition shrink-0 cursor-pointer"
            >
              Ingresar DEMO
            </button>
          </div>

          {/* Return to public portal button */}
          <div className="pt-2 border-t border-slate-100 flex justify-center">
            <button
              type="button"
              onClick={onBackToPublic}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors py-1 px-3 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al Portal Público</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
