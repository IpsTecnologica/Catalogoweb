import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getStoredToken } from '../services/api';
import { googleSignIn, googleLogout, initGoogleAuth, setCachedAccessToken } from '../services/googleAuth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isTecnico: boolean;
  isCaja: boolean;
  isEditor: boolean;
  isConsulta: boolean;
  isCliente: boolean;
  canEdit: boolean;
  isStaff: boolean;
  loginWithGoogle: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  register: (userData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    acceptTerms: boolean;
    allowMarketing?: boolean;
  }) => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTHORIZED_ADMIN_EMAILS = [
  'jeffervr@gmail.com',
  'soporteipstecnologica@gmail.com',
  'soportejeffervr@gmail.com',
  'marinaguacheta123@gmail.com'
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    let mounted = true;

    // 1. Always verify persistent backend session token first so page reloads (F5) immediately restore user
    const restoreBackendSession = async () => {
      const storedToken = getStoredToken();
      if (storedToken) {
        try {
          const { user: restoredUser } = await api.getMe();
          if (mounted && restoredUser) {
            setUser(restoredUser);
            setLoading(false);
            return true;
          }
        } catch {
          // ignore
        }
      }
      return false;
    };

    restoreBackendSession().then(restored => {
      const unsubscribe = initGoogleAuth(
        async (_firebaseUser, token) => {
          setCachedAccessToken(token);
          try {
            const sessionRes = await api.loginWithGoogleToken(token);
            if (mounted && sessionRes.user) {
              setUser(sessionRes.user);
            }
          } catch {
            // fallback
          }
          if (mounted) setLoading(false);
        },
        async () => {
          if (!restored) {
            const token = getStoredToken();
            if (token) {
              try {
                const { user: meUser } = await api.getMe();
                if (mounted) setUser(meUser);
              } catch {
                if (mounted) setUser(null);
              }
            } else {
              if (mounted) setUser(null);
            }
          }
          if (mounted) setLoading(false);
        }
      );

      return () => unsubscribe();
    });

    return () => {
      mounted = false;
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      const { user: gUser, accessToken } = await googleSignIn();
      setCachedAccessToken(accessToken);

      // Exchange Google OAuth access token for a persistent backend session token
      const sessionRes = await api.loginWithGoogleToken(accessToken);
      if (sessionRes.user) {
        setUser(sessionRes.user);
        notify(`¡Bienvenido/a, ${sessionRes.user.name}! Conectado con Google (${sessionRes.user.role}).`, 'success');
      } else {
        const emailLower = (gUser.email || '').toLowerCase().trim();
        const isWhitelisted = AUTHORIZED_ADMIN_EMAILS.includes(emailLower);
        const fallbackUser: User = {
          id: gUser.uid,
          name: gUser.displayName || gUser.email || 'Usuario Google',
          email: gUser.email || '',
          role: isWhitelisted ? 'Administrador' : 'Cliente',
          createdAt: new Date().toISOString()
        };
        setUser(fallbackUser);
        notify(`¡Bienvenido/a, ${fallbackUser.name}! (${fallbackUser.role})`, 'success');
      }

      // Non-destructively sync with Google Sheets & Drive if admin
      try {
        await api.initWorkspace();
      } catch (wsErr) {
        console.warn('Workspace sync notice:', wsErr);
      }
    } catch (err: any) {
      console.error('Login with Google failed', err);
      notify(err.message || 'Error al iniciar sesión con Google', 'error');
      throw err;
    }
  };

  const login = async (email: string, pass: string) => {
    const data = await api.login(email, pass);
    setUser(data.user);
    notify(`¡Sesión iniciada como ${data.user.role}!`, 'success');
  };

  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    acceptTerms: boolean;
    allowMarketing?: boolean;
  }) => {
    const data = await api.register(userData);
    setUser(data.user);
    notify(data.message || `¡Registro exitoso! Bienvenido/a, ${data.user.name}.`, 'success');
  };

  const updateProfile = async (data: { name?: string; phone?: string }) => {
    const res = await api.updateProfile(data);
    setUser(res.user);
    notify('Perfil actualizado exitosamente', 'success');
  };

  const logout = async () => {
    try {
      await googleLogout();
    } catch {}
    await api.logout();
    setUser(null);
    notify('Sesión cerrada correctamente.', 'info');
  };

  const isAdmin = user?.role === 'Administrador' || user?.role === 'Supervisor';
  const isSupervisor = user?.role === 'Supervisor';
  const isTecnico = user?.role === 'Técnico';
  const isCaja = user?.role === 'Caja';
  const isEditor = user?.role === 'Editor';
  const isConsulta = user?.role === 'Consulta';
  const isCliente = user?.role === 'Cliente';
  const canEdit = isAdmin || isEditor;
  const isStaff = isAdmin || isTecnico || isCaja || isEditor || isConsulta;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isSupervisor,
        isTecnico,
        isCaja,
        isEditor,
        isConsulta,
        isCliente,
        canEdit,
        isStaff,
        loginWithGoogle,
        login,
        register,
        updateProfile,
        logout,
        notify,
        notification
      }}
    >
      {children}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all transform translate-y-0 bg-slate-900 text-white border border-slate-800">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              notification.type === 'success'
                ? 'bg-emerald-500'
                : notification.type === 'error'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}
          />
          <span className="text-slate-100">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
