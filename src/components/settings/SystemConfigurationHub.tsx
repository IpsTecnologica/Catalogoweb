import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  FileSpreadsheet,
  FolderKanban,
  Database,
  Bot,
  MessageCircle,
  Calendar,
  Mail,
  HardDrive,
  ShieldCheck,
  Smartphone,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Power,
  Save,
  Edit3,
  ExternalLink,
  KeyRound,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { WhatsAppBusinessIntegration } from '../integrations/WhatsAppBusinessIntegration';
import { SystemBackupManager } from '../backup/SystemBackupManager';
import { WorkspaceManager } from '../workspace/WorkspaceManager';
import { AppManager } from '../admin/AppManager';
import { CompanySettings } from '../company/CompanySettings';
import { CompanyProfile, GeminiIntegrationView, SystemIntegrationTestRecord } from '../../types';

interface SystemConfigurationHubProps {
  company: CompanyProfile;
  onCompanyUpdated: (updated: CompanyProfile) => void;
  onDataChanged: () => void;
}

type ConfigSectionKey =
  | 'general'
  | 'sheets'
  | 'drive'
  | 'firebase'
  | 'gemini'
  | 'whatsapp'
  | 'calendar'
  | 'email'
  | 'backups'
  | 'security'
  | 'pwa_apk'
  | 'publishing';

export const SystemConfigurationHub: React.FC<SystemConfigurationHubProps> = ({
  company,
  onCompanyUpdated,
  onDataChanged
}) => {
  const { isAdmin, notify } = useAuth();
  const [activeSection, setActiveSection] = useState<ConfigSectionKey>('gemini');
  const [hubData, setHubData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testingModule, setTestingModule] = useState<string | null>(null);

  // Gemini AI encrypted vault form states
  const [geminiView, setGeminiView] = useState<GeminiIntegrationView | null>(null);
  const [geminiEditing, setGeminiEditing] = useState(true);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3-flash-preview');
  const [geminiInstructions, setGeminiInstructions] = useState('');
  const [savingGemini, setSavingGemini] = useState(false);

  // Calendar & Email & Publishing form states
  const [calendarId, setCalendarId] = useState('primary');
  const [calendarTimezone, setCalendarTimezone] = useState('America/Bogota');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [senderEmail, setSenderEmail] = useState(company.email);
  const [senderName, setSenderName] = useState(company.name);
  const [smtpPassword, setSmtpPassword] = useState('');
  const [publicAppUrlInput, setPublicAppUrlInput] = useState('');
  const [vitePublicAppUrlInput, setVitePublicAppUrlInput] = useState('');
  const [customDomainInput, setCustomDomainInput] = useState(company.website);

  const loadHub = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemConfigurationHub();
      setHubData(data);
      if (data.gemini) {
        setGeminiView(data.gemini);
        setGeminiModel(data.gemini.model || 'gemini-3-flash-preview');
        setGeminiInstructions(data.gemini.systemInstructions || '');
        setGeminiApiKeyInput('');
      }
      if (data.googleCalendar) {
        setCalendarId(data.googleCalendar.calendarId || 'primary');
        setCalendarTimezone(data.googleCalendar.timezone || 'America/Bogota');
      }
      if (data.emailConfig) {
        setSmtpHost(data.emailConfig.smtpHost || 'smtp.gmail.com');
        setSmtpPort(data.emailConfig.smtpPort || '587');
        setSenderEmail(data.emailConfig.senderEmail || company.email);
        setSenderName(data.emailConfig.senderName || company.name);
      }
      if (data.domainAndPublishing) {
        setPublicAppUrlInput(data.domainAndPublishing.publicAppUrl || '');
        setVitePublicAppUrlInput(data.domainAndPublishing.vitePublicAppUrl || '');
        setCustomDomainInput(data.domainAndPublishing.customDomain || company.website);
      }
    } catch (err: any) {
      notify(err?.message || 'Error al cargar Configuración del Sistema.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHub();
  }, []);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
        <p className="text-sm font-bold text-slate-900">
          Acceso exclusivo para el Administrador Principal (jeffervr@gmail.com) y administradores autorizados.
        </p>
      </div>
    );
  }

  const handleSaveGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGemini(true);
    try {
      const res = await api.updateGeminiIntegration({
        geminiApiKey: geminiApiKeyInput.trim() || undefined,
        model: geminiModel,
        systemInstructions: geminiInstructions,
        enabled: geminiView?.enabled ?? true
      });
      setGeminiView(res.gemini);
      setGeminiApiKeyInput('');
      notify(res.message, 'success');
      await loadHub();
    } catch (err: any) {
      notify(err?.message || 'Error al guardar configuración de Gemini AI.', 'error');
    } finally {
      setSavingGemini(false);
    }
  };

  const handleToggleGemini = async () => {
    if (!geminiView) return;
    try {
      const next = !geminiView.enabled;
      const res = await api.updateGeminiIntegration({ enabled: next });
      setGeminiView(res.gemini);
      notify(next ? 'Gemini AI activado.' : 'Gemini AI desactivado.', next ? 'success' : 'info');
      await loadHub();
    } catch (err: any) {
      notify(err?.message || 'Error al cambiar estado de Gemini AI.', 'error');
    }
  };

  const handleTestModule = async (moduleKey: string) => {
    setTestingModule(moduleKey);
    try {
      if (moduleKey === 'gemini') {
        const res = await api.testGeminiIntegration();
        setGeminiView(res.view);
        notify(res.message, res.connected ? 'success' : 'error');
      } else {
        const res = await api.testSystemConfigurationModule(moduleKey);
        notify(res.message, res.connected ? 'success' : 'error');
      }
      await loadHub();
    } catch (err: any) {
      notify(err?.message || 'Error al ejecutar prueba de conexión.', 'error');
    } finally {
      setTestingModule(null);
    }
  };

  const handleSaveModuleSettings = async (
    moduleKey: string,
    settings: Record<string, string>,
    enabled = true
  ) => {
    try {
      const res = await api.updateSystemConfigurationModule(moduleKey, { enabled, settings });
      notify(res.message, 'success');
      await loadHub();
      onDataChanged();
    } catch (err: any) {
      notify(err?.message || 'Error al guardar configuración del módulo.', 'error');
    }
  };

  const menuSections: Array<{
    key: ConfigSectionKey;
    number: number;
    label: string;
    icon: React.ElementType;
    status: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
  }> = [
    { key: 'general', number: 1, label: 'Configuración general', icon: Building2, status: 'Conectado' },
    {
      key: 'sheets',
      number: 2,
      label: 'Google Sheets (16 Hojas)',
      icon: FileSpreadsheet,
      status: hubData?.googleSheets?.connected ? 'Conectado' : 'Sin configurar'
    },
    {
      key: 'drive',
      number: 3,
      label: 'Google Drive (10 Carpetas)',
      icon: FolderKanban,
      status: hubData?.googleDrive?.connected ? 'Conectado' : 'Sin configurar'
    },
    {
      key: 'firebase',
      number: 4,
      label: 'Firebase Firestore',
      icon: Database,
      status: hubData?.firestore?.connected ? 'Conectado' : 'Error de conexión'
    },
    {
      key: 'gemini',
      number: 5,
      label: 'Gemini AI (Chatbot)',
      icon: Bot,
      status: geminiView?.connectionStatus || 'Sin configurar'
    },
    {
      key: 'whatsapp',
      number: 6,
      label: 'WhatsApp Business',
      icon: MessageCircle,
      status: hubData?.whatsapp?.connectionStatus || 'Sin configurar'
    },
    {
      key: 'calendar',
      number: 7,
      label: 'Google Calendar',
      icon: Calendar,
      status: hubData?.googleCalendar?.lastStatus || 'Sin configurar'
    },
    {
      key: 'email',
      number: 8,
      label: 'Configuración de correo',
      icon: Mail,
      status: hubData?.emailConfig?.lastStatus || 'Sin configurar'
    },
    { key: 'backups', number: 9, label: 'Respaldos', icon: HardDrive, status: 'Conectado' },
    { key: 'security', number: 10, label: 'Seguridad', icon: ShieldCheck, status: 'Conectado' },
    { key: 'pwa_apk', number: 11, label: 'Aplicación PWA y APK', icon: Smartphone, status: 'Conectado' },
    { key: 'publishing', number: 12, label: 'Publicación y dominio', icon: Globe, status: 'Conectado' }
  ];

  const renderStatusDot = (status: string) => {
    const color =
      status === 'Conectado'
        ? 'bg-emerald-500'
        : status === 'Error de conexión'
        ? 'bg-red-500'
        : 'bg-amber-500';
    return <span className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} title={status} />;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <Settings className="w-4 h-4" />
              <span>CENTRO MAESTRO — CONFIGURACIÓN DEL SISTEMA (12 MÓDULOS)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold">
              Administración Integral de Integraciones, Secretos y Despliegue
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl">
              Administrador Principal: <strong className="text-emerald-400">jeffervr@gmail.com</strong> (Protegido en servidor). Configure y pruebe todas las conexiones externas desde el portal sin editar código fuente ni exponer claves en el navegador.
            </p>
          </div>
          <button
            type="button"
            onClick={loadHub}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 flex items-center gap-2 self-start cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar Estado Global</span>
          </button>
        </div>
      </div>

      {/* 12-Service Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {menuSections.map(sec => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.key;
          return (
            <button
              key={sec.key}
              type="button"
              onClick={() => setActiveSection(sec.key)}
              className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-400' : 'text-red-600'}`} />
                <div className="truncate">
                  <span className="text-[10px] font-mono opacity-70 block">Módulo #{sec.number}</span>
                  <span className="text-xs font-bold truncate block">{sec.label}</span>
                </div>
              </div>
              {renderStatusDot(sec.status)}
            </button>
          );
        })}
      </div>

      {/* Active Section Panel */}
      {activeSection === 'general' && (
        <CompanySettings company={company} onCompanyUpdated={onCompanyUpdated} />
      )}

      {(activeSection === 'sheets' || activeSection === 'drive') && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {activeSection === 'sheets'
                  ? '2. Google Sheets — 16 Hojas Oficiales Sincronizadas'
                  : '3. Google Drive — 10 Carpetas Corporativas bajo IPS TECNOLÓGICA/'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeSection === 'sheets'
                  ? 'Hojas: Productos, Categorías, Clientes, Usuarios, Roles, Inventario, Pedidos, Ventas, Promociones, Servicios técnicos, Citas, Técnicos, Garantías, Historial de cambios, Configuración, Sincronización.'
                  : 'Carpetas: 01_BASE_DATOS_Y_REPORTES a 10_DOCUMENTOS_CONTABLES.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTestModule(activeSection)}
              disabled={testingModule === activeSection}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${testingModule === activeSection ? 'animate-spin' : ''}`} />
              <span>Probar Conexión OAuth Google</span>
            </button>
          </div>
          <WorkspaceManager onDataSynced={onDataChanged} />
        </div>
      )}

      {activeSection === 'firebase' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-red-600" />
                <span>4. Firebase Firestore — Base de Datos Principal en Tiempo Real</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Almacena de forma permanente productos, categorías, clientes, pedidos, promociones, órdenes de servicio SRV, garantías y auditoría.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTestModule('firebase')}
              disabled={testingModule === 'firebase'}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${testingModule === 'firebase' ? 'animate-spin' : ''}`} />
              <span>Probar Conexión Real Firestore</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Estado Actual</span>
              <span className="text-sm font-extrabold text-emerald-700 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {hubData?.firestore?.connected ? 'Conectado y Sincronizado' : 'Verificando'}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Project ID</span>
              <span className="text-xs font-mono font-bold text-slate-800 mt-1 block">
                {hubData?.firestore?.projectId || 'yarling-artwork-vt8c4'}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Database ID</span>
              <span className="text-xs font-mono font-bold text-slate-800 mt-1 block break-all">
                {hubData?.firestore?.databaseId || 'ai-studio-remixipstecnolgi-a3cecd67-1548-4f1b-bc5c-c52f0a6aa02e'}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'gemini' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-600" />
                <span>5. Configuración de Gemini AI (Bóveda Cifrada del Servidor)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Guarde su <code className="font-mono">GEMINI_API_KEY</code> en la bóveda cifrada AES-256-GCM del backend, elija el modelo generativo y pruebe la conexión real sin exponer la clave en el navegador.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleGemini}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  geminiView?.enabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{geminiView?.enabled ? 'Gemini Activo (Desactivar)' : 'Gemini Inactivo (Activar)'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestModule('gemini')}
                disabled={testingModule === 'gemini'}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${testingModule === 'gemini' ? 'animate-spin' : ''}`} />
                <span>Probar Conexión Real Gemini</span>
              </button>

              <button
                type="button"
                onClick={() => setGeminiEditing(!geminiEditing)}
                className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{geminiEditing ? 'Modo Lectura' : 'Editar'}</span>
              </button>
            </div>
          </div>

          {geminiView && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Estado de Conexión</span>
                <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                  {geminiView.connectionStatus}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">{geminiView.lastTestMessage}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">GEMINI_API_KEY</span>
                <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                  {geminiView.apiKeyConfigured
                    ? `Configurada (${geminiView.apiKeyMasked || '••••••••'})`
                    : 'No configurada'}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Origen: {geminiView.apiKeySource === 'vault_aes256gcm' ? 'Bóveda Cifrada AES-256-GCM' : geminiView.apiKeySource === 'process_env' ? 'Entorno del Servidor' : 'Pendiente'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Última Modificación</span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                  {new Date(geminiView.updatedAt).toLocaleString('es-CO')}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Por: {geminiView.updatedBy}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveGemini} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  GEMINI_API_KEY (Cifrada en Servidor — Solo Escritura)
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled={!geminiEditing}
                  value={geminiApiKeyInput}
                  onChange={e => setGeminiApiKeyInput(e.target.value)}
                  placeholder={
                    geminiView?.apiKeyConfigured
                      ? `Configurada (${geminiView.apiKeyMasked}) — escriba solo para reemplazar`
                      : 'Pegue aquí su clave AIzaSy... de Google AI Studio'
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Modelo Disponible de Gemini AI
                </label>
                <select
                  disabled={!geminiEditing}
                  value={geminiModel}
                  onChange={e => setGeminiModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                >
                  <option value="gemini-3-flash-preview">gemini-3-flash-preview (Recomendado - Baja Latencia)</option>
                  <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Razonamiento Avanzado)</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Instrucciones Base del Chatbot (Conectado en tiempo real al catálogo y órdenes SRV)
              </label>
              <textarea
                rows={3}
                disabled={!geminiEditing}
                value={geminiInstructions}
                onChange={e => setGeminiInstructions(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            {geminiEditing && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingGemini}
                  className="min-h-[42px] px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingGemini ? 'Guardando...' : 'Guardar Configuración Gemini AI'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {activeSection === 'whatsapp' && (
        <WhatsAppBusinessIntegration onConfigUpdated={onDataChanged} />
      )}

      {activeSection === 'calendar' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>7. Google Calendar — Agenda Automática de Soporte Técnico</span>
              </h3>
              <p className="text-xs text-slate-500">
                Sincroniza automáticamente las citas de servicio técnico (SRV) con el calendario del técnico asignado y la agenda general.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTestModule('calendar')}
              disabled={testingModule === 'calendar'}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${testingModule === 'calendar' ? 'animate-spin' : ''}`} />
              <span>Probar Conexión Google Calendar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ID de Calendario Principal</label>
              <input
                type="text"
                value={calendarId}
                onChange={e => setCalendarId(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Zona Horaria Oficial</label>
              <input
                type="text"
                value={calendarTimezone}
                onChange={e => setCalendarTimezone(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                handleSaveModuleSettings('calendar', {
                  calendarId,
                  timezone: calendarTimezone
                })
              }
              className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración de Google Calendar</span>
            </button>
          </div>
        </div>
      )}

      {activeSection === 'email' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-red-600" />
                <span>8. Configuración de Correo Corporativo y Notificaciones</span>
              </h3>
              <p className="text-xs text-slate-500">
                Configuración para notificaciones de órdenes de servicio, recuperación de contraseñas y confirmaciones de pedidos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTestModule('email')}
              disabled={testingModule === 'email'}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${testingModule === 'email' ? 'animate-spin' : ''}`} />
              <span>Probar Configuración de Correo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Servidor SMTP</label>
              <input
                type="text"
                value={smtpHost}
                onChange={e => setSmtpHost(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Puerto SMTP</label>
              <input
                type="text"
                value={smtpPort}
                onChange={e => setSmtpPort(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Correo Remitente Oficial</label>
              <input
                type="email"
                value={senderEmail}
                onChange={e => setSenderEmail(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contraseña / App Password (Cifrada)</label>
              <input
                type="password"
                value={smtpPassword}
                onChange={e => setSmtpPassword(e.target.value)}
                placeholder="•••••••••••• (Opcional — solo escritura)"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                handleSaveModuleSettings('email', {
                  smtpHost,
                  smtpPort,
                  senderEmail,
                  senderName,
                  ...(smtpPassword ? { smtpPassword } : {})
                })
              }
              className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración de Correo</span>
            </button>
          </div>
        </div>
      )}

      {activeSection === 'backups' && (
        <SystemBackupManager onDataRestored={onDataChanged} />
      )}

      {activeSection === 'security' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>10. Políticas de Seguridad Informática y Control de Acceso (RBAC)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="font-extrabold text-emerald-950">Protección del Administrador Principal</div>
              <p className="text-emerald-800">
                El correo <code className="font-mono font-bold">jeffervr@gmail.com</code> cuenta con blindaje en el servidor: ningún otro usuario puede quitarle el rol de Administrador ni desactivar su cuenta.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-extrabold text-slate-900">Bóveda de Secretos AES-256-GCM</div>
              <p className="text-slate-600">
                Los tokens de WhatsApp Business y Gemini AI se cifran en <code className="font-mono">server_data/.secrets/</code> con permisos 0600 y jamás se envían al frontend, Google Sheets ni Firestore.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'pwa_apk' && (
        <AppManager onConfigUpdated={onDataChanged} />
      )}

      {activeSection === 'publishing' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <span>12. Publicación Online, Dominio y Google Cloud Run</span>
              </h3>
              <p className="text-xs text-slate-500">
                Configuración de direcciones públicas para enlaces compartidos, Open Graph, código QR, PWA y APK.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTestModule('domain')}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Verificar URL Pública</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">PUBLIC_APP_URL (Servidor)</label>
              <input
                type="url"
                value={publicAppUrlInput}
                onChange={e => setPublicAppUrlInput(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">VITE_PUBLIC_APP_URL (Frontend)</label>
              <input
                type="url"
                value={vitePublicAppUrlInput}
                onChange={e => setVitePublicAppUrlInput(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Dominio Corporativo</label>
              <input
                type="url"
                value={customDomainInput}
                onChange={e => setCustomDomainInput(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                handleSaveModuleSettings('domain', {
                  publicAppUrl: publicAppUrlInput,
                  vitePublicAppUrl: vitePublicAppUrlInput,
                  customDomain: customDomainInput
                })
              }
              className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Direcciones de Publicación</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Test History Table across all 12 Modules */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-600" />
          <span>Registro de Pruebas de Conexión Realizadas ({hubData?.testHistory?.length || 0})</span>
        </h3>
        {!hubData?.testHistory || hubData.testHistory.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            Aún no se han registrado pruebas manuales en esta sesión. Use el botón "Probar Conexión" en cualquier módulo.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto text-xs">
            {hubData.testHistory.map((item: SystemIntegrationTestRecord) => (
              <div key={item.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">{item.moduleName}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.success
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-slate-600">{item.message}</p>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(item.timestamp).toLocaleString('es-CO')} · {item.actor}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
