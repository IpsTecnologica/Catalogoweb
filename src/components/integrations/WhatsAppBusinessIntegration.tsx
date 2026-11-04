import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Power,
  Send,
  Lock,
  Copy,
  Trash2,
  Edit3,
  Save,
  Server,
  MessageCircle,
  Bot,
  QrCode,
  ExternalLink,
  Download
} from 'lucide-react';
import { api } from '../../services/api';
import { WhatsAppBusinessIntegrationView, WhatsAppQrConfig } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { setConfiguredPublicUrl } from '../../utils/formatters';
import { WhatsAppLogs } from './WhatsAppLogs';

interface WhatsAppBusinessIntegrationProps {
  onConfigUpdated?: () => void;
}

export const WhatsAppBusinessIntegration: React.FC<WhatsAppBusinessIntegrationProps> = ({
  onConfigUpdated
}) => {
  const { isAdmin, notify } = useAuth();

  const [integration, setIntegration] = useState<WhatsAppBusinessIntegrationView | null>(null);
  const [qrConfig, setQrConfig] = useState<WhatsAppQrConfig | null>(null);
  const [savingQrConfig, setSavingQrConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(true);

  // Public configuration fields (editable normal text)
  const [publicAppUrl, setPublicAppUrl] = useState('');
  const [vitePublicAppUrl, setVitePublicAppUrl] = useState('');

  // Write-only secret fields (always empty after load/save so secrets are never exposed)
  const [whatsappAccessToken, setWhatsappAccessToken] = useState('');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState('');
  const [whatsappAppSecret, setWhatsappAppSecret] = useState('');

  // Action states
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResultBanner, setConnectionResultBanner] = useState<{
    ok: boolean;
    title: string;
    detail: string;
  } | null>(null);

  // Authorized test message dispatch state
  const [testRecipientPhone, setTestRecipientPhone] = useState('+57 310 894 7231');
  const [testMessageText, setTestMessageText] = useState(
    'Hola, ¿qué portátiles empresariales tienen disponibles hoy en IPS TECNOLÓGICA?'
  );
  const [includeGeminiInTest, setIncludeGeminiInTest] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{
    sent: boolean;
    message: string;
    messageId?: string;
    dispatchedText?: string;
    error?: string;
  } | null>(null);

  const loadIntegration = async () => {
    setLoading(true);
    try {
      const [data, qrData] = await Promise.all([
        api.getWhatsAppBusinessIntegration(),
        api.getWhatsAppQrConfig().catch(() => null)
      ]);
      setIntegration(data);
      if (qrData) setQrConfig(qrData);
      setPublicAppUrl(data.publicAppUrl || '');
      setVitePublicAppUrl(data.vitePublicAppUrl || '');
      // Never populate secret inputs from server response
      setWhatsappAccessToken('');
      setWhatsappPhoneNumberId('');
      setWhatsappPhoneNumberId('');
      setWhatsappVerifyToken('');
      setWhatsappAppSecret('');
    } catch (err: any) {
      notify(err.message || 'Error al cargar la integración de WhatsApp Business.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQrConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrConfig) return;
    setSavingQrConfig(true);
    try {
      const res = await api.updateWhatsAppQrConfig(qrConfig);
      setQrConfig(res.config);
      if (onConfigUpdated) onConfigUpdated();
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al guardar configuración QR de WhatsApp.', 'error');
    } finally {
      setSavingQrConfig(false);
    }
  };

  useEffect(() => {
    loadIntegration();
  }, []);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center space-y-2">
        <Lock className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Acceso Restringido a Administradores</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Solo los administradores autorizados de IPS TECNOLÓGICA pueden consultar o modificar la configuración de secretos de WhatsApp Business.
        </p>
      </div>
    );
  }

  const handleSaveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setConnectionResultBanner(null);
    try {
      const res = await api.updateWhatsAppBusinessIntegration({
        publicAppUrl: publicAppUrl.trim(),
        vitePublicAppUrl: vitePublicAppUrl.trim(),
        whatsappAccessToken: whatsappAccessToken.trim() || undefined,
        whatsappPhoneNumberId: whatsappPhoneNumberId.trim() || undefined,
        whatsappVerifyToken: whatsappVerifyToken.trim() || undefined,
        whatsappAppSecret: whatsappAppSecret.trim() || undefined
      });
      setIntegration(res.integration);
      if (res.integration.publicAppUrl) {
        setConfiguredPublicUrl(res.integration.publicAppUrl);
      }
      // Clear secret inputs immediately after saving so they never remain visible in the DOM
      setWhatsappAccessToken('');
      setWhatsappPhoneNumberId('');
      setWhatsappVerifyToken('');
      setWhatsappAppSecret('');
      if (onConfigUpdated) onConfigUpdated();
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al guardar la configuración.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleIntegration = async () => {
    if (!integration) return;
    setToggling(true);
    try {
      const nextState = !integration.integrationEnabled;
      const res = await api.toggleWhatsAppBusinessIntegration(nextState);
      setIntegration(res.integration);
      notify(res.message, nextState ? 'success' : 'info');
    } catch (err: any) {
      notify(err.message || 'Error al cambiar el estado de la integración.', 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResultBanner(null);
    try {
      const res = await api.testWhatsAppBusinessConnection();
      setIntegration(res.view);
      setConnectionResultBanner({
        ok: res.connected,
        title: res.connected
          ? `Conexión Exitosa con Meta Graph API (${res.status})`
          : `Fallo en Prueba de Conexión Real (${res.status})`,
        detail: res.message
      });
      notify(res.message, res.connected ? 'success' : 'error');
    } catch (err: any) {
      notify(err.message || 'Error al probar conexión con Meta.', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipientPhone.trim()) {
      notify('Ingrese un número de teléfono destinatario.', 'error');
      return;
    }
    setSendingTest(true);
    setTestSendResult(null);
    try {
      const res = await api.testWhatsAppBusinessSend({
        recipientPhone: testRecipientPhone.trim(),
        messageText: testMessageText.trim(),
        includeGeminiPreview: includeGeminiInTest
      });
      setIntegration(res.integration);
      setTestSendResult({
        sent: res.sent,
        message: res.message,
        messageId: res.messageId,
        dispatchedText: res.dispatchedText,
        error: res.error
      });
      notify(res.message, res.sent ? 'success' : 'error');
    } catch (err: any) {
      notify(err.message || 'Error al ejecutar prueba de envío.', 'error');
    } finally {
      setSendingTest(false);
    }
  };

  const handleClearErrors = async () => {
    try {
      const res = await api.clearWhatsAppBusinessErrors();
      setIntegration(res.integration);
      notify(res.message, 'info');
    } catch (err: any) {
      notify(err.message || 'Error al limpiar el registro.', 'error');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    notify(`${label} copiado al portapapeles.`, 'success');
  };

  const renderSecretStatusText = (
    configured: boolean,
    source?: 'vault_aes256gcm' | 'process_env' | 'none',
    maskedSuffix?: string | null
  ) => {
    if (!configured) {
      return (
        <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          No configurado
        </span>
      );
    }
    return (
      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Configurado ({source === 'vault_aes256gcm' ? 'Bóveda Cifrada AES-256-GCM' : 'Entorno del Servidor'}
        {maskedSuffix ? ` · ${maskedSuffix}` : ''})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Top Header */}
      <div className="bg-slate-900 text-white rounded-xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>CONFIGURACIÓN → INTEGRACIONES → WHATSAPP BUSINESS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-emerald-400 shrink-0" />
              <span>Integración Oficial WhatsApp Business Cloud API & Secretos</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl">
              Administre las URLs públicas y los tokens secretos de Meta WhatsApp Cloud API sin editar manualmente el archivo <code className="font-mono text-emerald-300">.env</code>. Los tokens se cifran en el servidor con AES-256-GCM y jamás se exponen al navegador, Google Sheets ni Firestore.
            </p>
          </div>

          {/* Primary Administrative Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={toggling || loading || !integration}
              onClick={handleToggleIntegration}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                integration?.integrationEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>
                {toggling
                  ? 'Actualizando...'
                  : integration?.integrationEnabled
                  ? 'Integración Activa (Desactivar)'
                  : 'Integración Inactiva (Activar)'}
              </span>
            </button>

            <button
              type="button"
              disabled={testingConnection || loading}
              onClick={handleTestConnection}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
              <span>{testingConnection ? 'Probando en Meta...' : 'Probar Conexión Real'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Modo Lectura' : 'Editar Configuración'}</span>
            </button>
          </div>
        </div>

        {/* Status Bar inside Header */}
        {integration && (
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Estado de Conexión
              </span>
              <span
                className={`text-sm font-extrabold mt-0.5 block ${
                  integration.connectionStatus === 'Conectado'
                    ? 'text-emerald-400'
                    : integration.connectionStatus === 'Error de conexión'
                    ? 'text-red-400'
                    : 'text-amber-400'
                }`}
              >
                {integration.connectionStatus}
              </span>
              {integration.verifiedDisplayNumber && (
                <span className="text-[11px] text-slate-300 block mt-0.5">
                  {integration.verifiedDisplayNumber} ({integration.verifiedPhoneName})
                </span>
              )}
            </div>

            <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                ¿Integración Configurada?
              </span>
              <span
                className={`text-sm font-extrabold mt-0.5 block ${
                  integration.isConfigured ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {integration.isConfigured ? 'Sí — Secretos Configurados' : 'Incompleta — Faltan Tokens'}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Estado general: {integration.integrationEnabled ? 'Habilitada' : 'Deshabilitada'}
              </span>
            </div>

            <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Última Actualización
              </span>
              <span className="text-xs font-bold text-white mt-0.5 block">
                {new Date(integration.updatedAt).toLocaleString('es-CO')}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Por: {integration.updatedBy}
              </span>
            </div>

            <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Última Prueba con Meta API
              </span>
              <span className="text-xs font-bold text-white mt-0.5 block">
                {integration.lastConnectionTestAt
                  ? new Date(integration.lastConnectionTestAt).toLocaleString('es-CO')
                  : 'Sin ejecutar aún'}
              </span>
              <span className="text-[11px] text-slate-400 truncate block mt-0.5" title={integration.lastConnectionMessage}>
                {integration.lastConnectionMessage}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Real Connection Result Banner */}
      {connectionResultBanner && (
        <div
          className={`rounded-xl p-4 border flex items-start gap-3 ${
            connectionResultBanner.ok
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {connectionResultBanner.ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 text-xs">
            <h4 className="font-extrabold text-sm">{connectionResultBanner.title}</h4>
            <p>{connectionResultBanner.detail}</p>
          </div>
        </div>
      )}

      {/* Free WhatsApp Direct Link (wa.me), Official QR Code & 6 Prepared Templates Section */}
      {qrConfig && (
        <div className="bg-emerald-950 text-white rounded-xl border border-emerald-800 p-5 sm:p-6 shadow-md space-y-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-emerald-800/80 pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                <QrCode className="w-4 h-4" />
                <span>MODO GRATUITO RECOMENDADO — SIN TARJETA NI API PAGA DE META</span>
              </div>
              <h3 className="text-lg font-black text-white">
                CONFIGURACIÓN DE WHATSAPP BUSINESS MEDIANTE ENLACE DIRECTO (wa.me) Y CÓDIGO QR
              </h3>
              <p className="text-xs text-emerald-200 max-w-3xl leading-relaxed">
                <strong>Aviso técnico honesto:</strong> Este código QR abre una conversación directa (<code className="font-mono">https://wa.me/57...</code>) con el número configurado y precarga automáticamente cualquiera de las 6 plantillas comerciales o de soporte. Para vincular sesiones de WhatsApp Web en otros equipos, utiliza la aplicación oficial de WhatsApp en tu teléfono (<em>Dispositivos vinculados</em>).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`https://wa.me/${(qrConfig.whatsappNumber || '').replace(/\D/g, '')}?text=${encodeURIComponent(qrConfig.defaultWelcomeMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Probar Chat Directo wa.me</span>
              </a>
            </div>
          </div>

          <form onSubmit={handleSaveQrConfig} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* QR Code Visual Card */}
            <div className="lg:col-span-4 bg-white text-slate-900 rounded-xl p-4 flex flex-col items-center text-center space-y-3 border border-emerald-300">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                Código QR Oficial de Contacto Directo
              </span>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  `https://wa.me/${(qrConfig.whatsappNumber || '').replace(/\D/g, '')}?text=${encodeURIComponent(qrConfig.defaultWelcomeMessage)}`
                )}`}
                alt="Código QR WhatsApp IPS TECNOLÓGICA"
                className="w-44 h-44 rounded-lg border border-slate-200 p-2 bg-white"
              />
              <div className="text-xs font-mono font-bold text-slate-800">
                {qrConfig.whatsappNumber}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&format=png&data=${encodeURIComponent(
                    `https://wa.me/${(qrConfig.whatsappNumber || '').replace(/\D/g, '')}?text=${encodeURIComponent(qrConfig.defaultWelcomeMessage)}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download="QR_WhatsApp_IPS_TECNOLOGICA.png"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar QR PNG</span>
                </a>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `https://wa.me/${(qrConfig.whatsappNumber || '').replace(/\D/g, '')}?text=${encodeURIComponent(qrConfig.defaultWelcomeMessage)}`,
                      'Enlace directo wa.me'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Enlace</span>
                </button>
              </div>
            </div>

            {/* Direct Number & 6 Templates Configuration */}
            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-200 mb-1">
                    Número Principal de WhatsApp Business (Formato Internacional)
                  </label>
                  <input
                    type="text"
                    value={qrConfig.whatsappNumber}
                    onChange={e => setQrConfig({ ...qrConfig, whatsappNumber: e.target.value })}
                    placeholder="+57 310 894 7231"
                    className="w-full px-3 py-2 rounded-lg bg-emerald-900/70 border border-emerald-700 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-200 mb-1">
                    Mensaje de Bienvenida Predeterminado al Escanear el QR
                  </label>
                  <input
                    type="text"
                    value={qrConfig.defaultWelcomeMessage}
                    onChange={e => setQrConfig({ ...qrConfig, defaultWelcomeMessage: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-emerald-900/70 border border-emerald-700 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                    1. Plantilla: Atención al Cliente y Productos
                  </label>
                  <input
                    type="text"
                    value={qrConfig.customerServiceMessage}
                    onChange={e =>
                      setQrConfig({
                        ...qrConfig,
                        customerServiceMessage: e.target.value
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                    2. Plantilla: Solicitud de Pedidos y Compras
                  </label>
                  <input
                    type="text"
                    value={qrConfig.ordersMessage}
                    onChange={e =>
                      setQrConfig({
                        ...qrConfig,
                        ordersMessage: e.target.value
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                    3. Plantilla: Agendamiento de Citas y Soporte Técnico (SRV)
                  </label>
                  <input
                    type="text"
                    value={qrConfig.appointmentsMessage}
                    onChange={e =>
                      setQrConfig({
                        ...qrConfig,
                        appointmentsMessage: e.target.value
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                    4. Plantilla: Garantías y Soporte Postventa (Ley 1480)
                  </label>
                  <input
                    type="text"
                    value={qrConfig.warrantiesMessage}
                    onChange={e =>
                      setQrConfig({
                        ...qrConfig,
                        warrantiesMessage: e.target.value
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-700 text-white text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                    5. Plantilla: Consulta de Envíos y Números de Guía
                  </label>
                  <input
                    type="text"
                    value={qrConfig.shipmentsMessage}
                    onChange={e =>
                      setQrConfig({
                        ...qrConfig,
                        shipmentsMessage: e.target.value
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-700 text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qrConfig.geminiFreeEnabled}
                    onChange={e =>
                      setQrConfig({ ...qrConfig, geminiFreeEnabled: e.target.checked })
                    }
                    className="rounded border-emerald-600"
                  />
                  <span>Habilitar asistente orientativo con cuota gratuita de Gemini AI</span>
                </label>

                <button
                  type="submit"
                  disabled={savingQrConfig}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingQrConfig ? 'Guardando QR...' : 'Guardar Configuración QR y Plantillas wa.me'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Form: Public URLs + Encrypted Backend Secrets */}
      <form onSubmit={handleSaveConfiguration} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 1. Public Configuration */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Globe className="w-5 h-5 text-blue-600" />
              <h3>1. Configuración Pública (Direcciones del Portal)</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Estas direcciones son públicas y se utilizan para generar enlaces del catálogo, tarjetas Open Graph y la dirección del Webhook de WhatsApp. No se tratan como contraseñas.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                PUBLIC_APP_URL (Dirección pública del portal en el servidor)
              </label>
              <input
                type="url"
                disabled={!isEditing}
                value={publicAppUrl}
                onChange={e => setPublicAppUrl(e.target.value)}
                placeholder="https://ais-pre-ouzmtvpcklhtkaxl7txrq4-235668912498.us-west2.run.app"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Se actualiza dinámicamente de inmediato en el backend (<code className="font-mono">/api/config</code>, enlaces de compartir y etiquetas Open Graph).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                VITE_PUBLIC_APP_URL (Dirección pública de compilación del frontend)
              </label>
              <input
                type="url"
                disabled={!isEditing}
                value={vitePublicAppUrl}
                onChange={e => setVitePublicAppUrl(e.target.value)}
                placeholder="https://ais-pre-ouzmtvpcklhtkaxl7txrq4-235668912498.us-west2.run.app"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100"
              />
              <div className="mt-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p>
                  <strong>Nota técnica de compilación:</strong> En Vite, <code className="font-mono">VITE_PUBLIC_APP_URL</code> se incrusta de forma estática al ejecutar <code className="font-mono">npm run build</code> (valor compilado actual: <code className="font-mono text-slate-800">{integration?.compiledVitePublicAppUrl}</code>).
                </p>
                <p>
                  Además, el portal sincroniza en tiempo de ejecución <code className="font-mono">PUBLIC_APP_URL</code> desde <code className="font-mono">/api/config</code> para que los enlaces compartidos usen siempre la dirección pública actualizada sin necesidad de recompilar.
                </p>
              </div>
            </div>

            {integration && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  URL Oficial del Webhook para Meta Developers (Callback URL)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={integration.webhookUrl}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50 text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(integration.webhookUrl, 'URL del Webhook')}
                    className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 2. Secret Credentials (Backend Only) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <KeyRound className="w-5 h-5 text-red-600" />
              <h3>2. Tokens y Secretos de WhatsApp (Solo Backend)</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Por seguridad obligatoria, los valores secretos existentes <strong>nunca se devuelven ni se muestran</strong>. Deje un campo en blanco para conservar el secreto actual o escriba un nuevo valor para actualizarlo.
            </p>
          </div>

          <div className="space-y-4">
            {/* WHATSAPP_ACCESS_TOKEN */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="text-xs font-bold text-slate-800">
                  WHATSAPP_ACCESS_TOKEN (Token de acceso de Meta)
                </label>
                {integration &&
                  renderSecretStatusText(
                    integration.secretsStatus.accessTokenConfigured,
                    integration.secretsStatus.accessTokenSource
                  )}
              </div>
              <input
                type="password"
                autoComplete="new-password"
                disabled={!isEditing}
                value={whatsappAccessToken}
                onChange={e => setWhatsappAccessToken(e.target.value)}
                placeholder={
                  integration?.secretsStatus.accessTokenConfigured
                    ? '•••••••••••••••••••••••••••••••• (Configurado — escriba solo para reemplazar)'
                    : 'Pegue aquí el token permanente o temporal EAAG... de Meta'
                }
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100"
              />
            </div>

            {/* WHATSAPP_PHONE_NUMBER_ID */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="text-xs font-bold text-slate-800">
                  WHATSAPP_PHONE_NUMBER_ID (Identificador del número de WhatsApp)
                </label>
                {integration &&
                  renderSecretStatusText(
                    integration.secretsStatus.phoneNumberIdConfigured,
                    integration.secretsStatus.phoneNumberIdSource,
                    integration.secretsStatus.phoneNumberIdMasked
                  )}
              </div>
              <input
                type="password"
                autoComplete="new-password"
                disabled={!isEditing}
                value={whatsappPhoneNumberId}
                onChange={e => setWhatsappPhoneNumberId(e.target.value)}
                placeholder={
                  integration?.secretsStatus.phoneNumberIdConfigured
                    ? `Configurado (${integration.secretsStatus.phoneNumberIdMasked}) — escriba solo para reemplazar`
                    : 'Ej: 105928475920194'
                }
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100"
              />
            </div>

            {/* WHATSAPP_VERIFY_TOKEN */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="text-xs font-bold text-slate-800">
                  WHATSAPP_VERIFY_TOKEN (Token de verificación del webhook)
                </label>
                {integration &&
                  renderSecretStatusText(
                    integration.secretsStatus.verifyTokenConfigured,
                    integration.secretsStatus.verifyTokenSource
                  )}
              </div>
              <input
                type="password"
                autoComplete="new-password"
                disabled={!isEditing}
                value={whatsappVerifyToken}
                onChange={e => setWhatsappVerifyToken(e.target.value)}
                placeholder={
                  integration?.secretsStatus.verifyTokenConfigured
                    ? '•••••••••••••••••••• (Configurado — escriba solo para reemplazar)'
                    : 'Defina su token secreto para verificar el Webhook en Meta'
                }
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100"
              />
            </div>

            {/* WHATSAPP_APP_SECRET */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="text-xs font-bold text-slate-800">
                  WHATSAPP_APP_SECRET (Secreto de Aplicación Meta para firma X-Hub-Signature-256)
                </label>
                {integration &&
                  renderSecretStatusText(
                    integration.secretsStatus.appSecretConfigured,
                    integration.secretsStatus.appSecretSource
                  )}
              </div>
              <input
                type="password"
                autoComplete="new-password"
                disabled={!isEditing}
                value={whatsappAppSecret}
                onChange={e => setWhatsappAppSecret(e.target.value)}
                placeholder={
                  integration?.secretsStatus.appSecretConfigured
                    ? '•••••••••••••••••••• (Firma HMAC-SHA256 activa — escriba para reemplazar)'
                    : 'Opcional recomendado: App Secret de Meta para validar firmas de webhook'
                }
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100"
              />
            </div>

            {isEditing && (
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Cifrando y Guardando...' : 'Guardar Configuración en Bóveda del Servidor'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Section 3: Authorized Real Message Test + Gemini Chatbot Connection */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-600" />
            <span>3. Prueba de Envío Autorizada por WhatsApp Cloud API + Chatbot Gemini</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ejecuta un despacho real hacia <code className="font-mono">https://graph.facebook.com/v21.0/&#123;PHONE_NUMBER_ID&#125;/messages</code> utilizando los secretos guardados en el servidor. No simula envíos exitosos.
          </p>
        </div>

        <form onSubmit={handleTestSend} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Número Destinatario Autorizado (Formato Internacional)
            </label>
            <input
              type="text"
              value={testRecipientPhone}
              onChange={e => setTestRecipientPhone(e.target.value)}
              placeholder="+57 310 894 7231"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mensaje de Prueba o Consulta para el Chatbot Gemini
            </label>
            <input
              type="text"
              value={testMessageText}
              onChange={e => setTestMessageText(e.target.value)}
              placeholder="Escribe el texto o consulta de inventario..."
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={sendingTest}
              className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{sendingTest ? 'Enviando a Meta API...' : 'Enviar Prueba Real'}</span>
            </button>
          </div>

          <div className="md:col-span-12">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeGeminiInTest}
                onChange={e => setIncludeGeminiInTest(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Bot className="w-4 h-4 text-emerald-600" />
              <span>
                Procesar primero la consulta con el Chatbot Gemini conectado al inventario real y enviar la respuesta generada por WhatsApp Cloud API
              </span>
            </label>
          </div>
        </form>

        {testSendResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              testSendResult.sent
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            <div className="font-extrabold flex items-center gap-1.5">
              {testSendResult.sent ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <span>{testSendResult.message}</span>
            </div>
            {testSendResult.dispatchedText && (
              <div className="bg-white/80 p-3 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-line">
                <strong className="block text-[10px] uppercase text-slate-500 mb-1">
                  Contenido procesado por Gemini / enviado a Meta Cloud API:
                </strong>
                {testSendResult.dispatchedText}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 4: Error Logs & Security Architecture Note */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Error Logs */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                4. Registro de Errores de WhatsApp Cloud API y Webhook ({integration?.errorLogs.length || 0})
              </h3>
              <p className="text-xs text-slate-500">
                Auditoría real de intentos fallidos de conexión, envíos rechazados por Meta o firmas de webhook inválidas.
              </p>
            </div>
            {integration && integration.errorLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearErrors}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar Registro</span>
              </button>
            )}
          </div>

          {!integration || integration.errorLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No hay errores registrados recientemente en la integración de WhatsApp Business.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs">
              {integration.errorLogs.map(err => (
                <div key={err.id} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-red-700">
                      [{err.operation}]{err.statusCode ? ` · HTTP ${err.statusCode}` : ''}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(err.timestamp).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <p className="text-slate-800 font-medium">{err.errorMessage}</p>
                  {err.detail && <p className="text-[11px] text-slate-500 font-mono">{err.detail}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Server Vault & Cloud Run Persistence Guidance */}
        <div className="lg:col-span-5 bg-slate-900 text-slate-200 rounded-xl p-5 sm:p-6 border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Server className="w-5 h-5" />
            <h3>5. Seguridad de Secretos y Alojamiento</h3>
          </div>
          <p className="text-slate-300 leading-relaxed">
            <strong>Cifrado Activo:</strong>{' '}
            {integration?.storageMechanism.encryptionAlgorithm || 'AES-256-GCM en servidor'}.
          </p>
          <ul className="space-y-1.5 text-slate-300 list-disc pl-4">
            <li>
              <strong>Aislamiento Total:</strong> Los tokens <code className="font-mono text-emerald-300">WHATSAPP_ACCESS_TOKEN</code>, <code className="font-mono text-emerald-300">WHATSAPP_VERIFY_TOKEN</code> y <code className="font-mono text-emerald-300">WHATSAPP_APP_SECRET</code> <strong>nunca</strong> se guardan en Google Sheets, Firestore, <code className="font-mono">localStorage</code>, <code className="font-mono">sessionStorage</code> ni en el código JavaScript del frontend.
            </li>
            <li>
              <strong>Protección de Lectura:</strong> Una vez guardados, ningún endpoint devuelve el valor en texto plano.
            </li>
            <li>
              <strong>Nota sobre Alojamiento Cloud Run / Contenedores Efímeros:</strong>{' '}
              {integration?.storageMechanism.cloudRunPersistenceNote}
            </li>
          </ul>
        </div>
      </div>

      {/* Section 6: Paginated Last 20 Communication Events (Sent/Received Messages & Errors) */}
      <WhatsAppLogs
        refreshTrigger={
          (integration?.errorLogs.length || 0) +
          (testSendResult ? 1 : 0) +
          (connectionResultBanner ? 1 : 0)
        }
      />
    </div>
  );
};
