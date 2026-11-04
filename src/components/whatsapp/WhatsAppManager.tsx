import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Send,
  Bot,
  UserCheck,
  Settings,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  PhoneCall
} from 'lucide-react';
import { api } from '../../services/api';
import { WhatsAppConversation, WhatsAppConfig, CompanyProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { WhatsAppBusinessIntegration } from '../integrations/WhatsAppBusinessIntegration';

interface WhatsAppManagerProps {
  company: CompanyProfile;
}

export const WhatsAppManager: React.FC<WhatsAppManagerProps> = ({ company }) => {
  const { user, isAdmin, notify } = useAuth();

  const [config, setConfig] = useState<(WhatsAppConfig & { geminiApiReady?: boolean }) | null>(null);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'inbox' | 'simulator' | 'settings' | 'cloud-integration'>('inbox');
  const [loading, setLoading] = useState(true);

  // Advisor reply input
  const [advisorText, setAdvisorText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Customer simulator input
  const [simPhone, setSimPhone] = useState('+57 315 800 4422');
  const [simName, setSimName] = useState('Cliente WhatsApp');
  const [simMessage, setSimMessage] = useState('');
  const [simulating, setSimulating] = useState(false);

  // Settings form
  const [businessPhone, setBusinessPhone] = useState('');
  const [chatbotActive, setChatbotActive] = useState(true);
  const [geminiEnabled, setGeminiEnabled] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const loadWhatsAppData = async () => {
    setLoading(true);
    try {
      const [cfgRes, convRes] = await Promise.all([
        api.getWhatsAppConfig(),
        api.getWhatsAppConversations()
      ]);
      setConfig(cfgRes);
      setConversations(convRes);
      if (!selectedConvId && convRes.length > 0) {
        setSelectedConvId(convRes[0].id);
      }
      setBusinessPhone(cfgRes.businessPhone || company.whatsapp);
      setChatbotActive(cfgRes.chatbotActive ?? cfgRes.enabled ?? true);
      setGeminiEnabled(cfgRes.geminiEnabled ?? cfgRes.autoReplyEnabled ?? true);
      setWelcomeMessage(cfgRes.welcomeMessage || '');
      setSystemPrompt(cfgRes.systemPrompt || '');
    } catch (err: any) {
      notify(err.message || 'Error al cargar WhatsApp Inteligente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWhatsAppData();
  }, []);

  const selectedConv = conversations.find(c => c.id === selectedConvId) || conversations[0] || null;

  const handleSendAdvisorReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !advisorText.trim()) return;
    setSendingReply(true);
    try {
      const res = await api.sendWhatsAppAdvisorReply({
        conversationId: selectedConv.id,
        phone: selectedConv.clientPhone,
        text: advisorText.trim(),
        status: 'Atendido por asesor',
        assignedAdvisor: user?.name || 'Asesor IPS'
      });
      setConversations(res.conversations);
      setAdvisorText('');
      notify('Respuesta enviada por el asesor humano.', 'success');
    } catch (err: any) {
      notify(err.message || 'Error al enviar respuesta.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleChangeConvStatus = async (status: WhatsAppConversation['status']) => {
    if (!selectedConv) return;
    try {
      const res = await api.sendWhatsAppAdvisorReply({
        conversationId: selectedConv.id,
        status,
        assignedAdvisor: user?.name || 'Asesor IPS'
      });
      setConversations(res.conversations);
      notify(`Estado de conversación cambiado a: ${status}`, 'info');
    } catch (err: any) {
      notify(err.message || 'Error cambiando estado.', 'error');
    }
  };

  const handleSimulateIncomingMessage = async (customText?: string) => {
    const textToSend = (customText ?? simMessage).trim();
    if (!textToSend || !simPhone.trim()) return;
    setSimulating(true);
    try {
      const res = await api.sendWhatsAppMessage({
        phone: simPhone.trim(),
        clientName: simName.trim() || 'Cliente WhatsApp',
        text: textToSend
      });
      if (!customText) setSimMessage('');
      const refreshed = await api.getWhatsAppConversations();
      setConversations(refreshed);
      setSelectedConvId(res.conversation.id);
      notify('Respuesta de WhatsApp Inteligente generada con datos reales del inventario.', 'success');
    } catch (err: any) {
      notify(err.message || 'Error en simulador de WhatsApp.', 'error');
    } finally {
      setSimulating(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await api.updateWhatsAppConfig({
        businessPhone,
        chatbotActive,
        geminiEnabled,
        welcomeMessage,
        systemPrompt
      });
      setConfig(prev => ({ ...prev, ...res.config }));
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al guardar configuración.', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Sparkles className="w-4 h-4" />
            Conectado con Inventario Real, Precios, Promociones y Soporte SRV
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-emerald-400" />
            WHATSAPP INTELIGENTE — IPS TECNOLÓGICA
          </h2>
          <p className="text-xs text-slate-300">
            Atención automatizada con IA Gemini y traspaso a asesor humano en tiempo real. Nunca inventa productos ni precios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              activeTab === 'inbox'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Conversaciones ({conversations.length})
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            Probar Asistente Gemini
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('cloud-integration')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                  activeTab === 'cloud-integration'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Settings className="w-4 h-4" />
                Integraciones → WhatsApp Business (Secretos)
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                  activeTab === 'settings'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Settings className="w-4 h-4" />
                Configuración IA
              </button>
            </>
          )}
          <button
            onClick={loadWhatsAppData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Actualizar conversaciones"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TAB 1: INBOX & CONVERSATIONS */}
      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Conversation List */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Bandeja de Clientes</h3>
              <span className="text-xs font-semibold text-emerald-700">
                {config?.chatbotActive ? '🤖 Chatbot Activo' : '👤 Solo Asesor'}
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-slate-500 py-8 text-center">Cargando conversaciones...</p>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No hay conversaciones registradas.</p>
            ) : (
              <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                {conversations.map(conv => {
                  const active = selectedConv?.id === conv.id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`cursor-pointer p-3 rounded-xl border transition-all space-y-1 ${
                        active
                          ? 'border-emerald-600 bg-emerald-50/40'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-slate-900">{conv.clientName}</strong>
                        <span className="text-[11px] font-semibold text-emerald-700">{conv.status}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{conv.clientPhone}</p>
                      <p className="text-xs text-slate-600 truncate">{conv.lastMessage}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Active Chat Window */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[620px]">
            {!selectedConv ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-500 p-8">
                Selecciona una conversación para ver el historial y responder.
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-t-xl">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {selectedConv.clientName}
                      <span className="text-xs font-normal text-slate-500">({selectedConv.clientPhone})</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Estado: <strong>{selectedConv.status}</strong>
                      {selectedConv.assignedAdvisor ? ` • Asesor: ${selectedConv.assignedAdvisor}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleChangeConvStatus('Bot activo')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                        selectedConv.status === 'Bot activo'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      🤖 Bot Gemini
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeConvStatus('Atendido por asesor')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                        selectedConv.status === 'Atendido por asesor'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      👤 Tomar como Asesor
                    </button>
                    <a
                      href={`https://wa.me/${(selectedConv.clientPhone || selectedConv.phone || '').replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      Abrir WhatsApp
                    </a>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-100/70">
                  {selectedConv.messages.map(msg => {
                    const isClient = msg.sender === 'client';
                    const isGemini = msg.sender === 'gemini';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[82%] ${
                          isClient ? 'mr-auto items-start' : 'ml-auto items-end'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 px-1">
                          {isClient
                            ? `${selectedConv.clientName}`
                            : isGemini
                            ? '🤖 Asistente IA Gemini (IPS TECNOLÓGICA)'
                            : '👤 Asesor Humano IPS'}
                        </span>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-xs whitespace-pre-line shadow-xs ${
                            isClient
                              ? 'bg-white text-slate-800 border border-slate-200'
                              : isGemini
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-900 text-white'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Advisor Reply Box */}
                <form onSubmit={handleSendAdvisorReply} className="p-3 border-t border-slate-200 bg-white rounded-b-xl flex gap-2">
                  <input
                    type="text"
                    value={advisorText}
                    onChange={e => setAdvisorText(e.target.value)}
                    placeholder="Escribe una respuesta como asesor humano para este cliente..."
                    className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Responder
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE GEMINI WHATSAPP SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6 max-w-4xl">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-600" />
              Simulador de Consultas Reales de Clientes por WhatsApp
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Envía cualquier pregunta como si fueras un cliente. Gemini consultará en tiempo real los productos, precios, existencias, promociones vigentes y órdenes de servicio técnico (`SRV-2026-XXXX`).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número WhatsApp del Cliente
              </label>
              <input
                type="text"
                value={simPhone}
                onChange={e => setSimPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre del Cliente
              </label>
              <input
                type="text"
                value={simName}
                onChange={e => setSimName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Quick Preset Prompts */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600 block">
              Preguntas rápidas de prueba (clic para consultar a Gemini):
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                'Hola, ¿qué portátiles empresariales tienen disponibles y a qué precio?',
                '¿Tienen promociones activas o descuentos hoy?',
                'Quiero consultar el estado de mi orden de servicio SRV-2026-1001',
                'Necesito agendar un mantenimiento preventivo de computadores a domicilio',
                '¿Cuál es la dirección de IPS TECNOLÓGICA y qué garantía tienen los equipos?'
              ].map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={simulating}
                  onClick={() => handleSimulateIncomingMessage(q)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-colors"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={simMessage}
              onChange={e => setSimMessage(e.target.value)}
              placeholder="Escribe cualquier consulta de productos, precios o soporte técnico..."
              className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
            />
            <button
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateIncomingMessage()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              {simulating ? 'Consultando IA...' : 'Enviar a WhatsApp IA'}
            </button>
          </div>

          {selectedConv && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Última respuesta generada para {selectedConv.clientName}:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('inbox')}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  Ver conversación completa →
                </button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {selectedConv.messages.slice(-4).map(m => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-lg text-xs whitespace-pre-line ${
                      m.sender === 'client'
                        ? 'bg-white border border-slate-200 text-slate-800'
                        : 'bg-emerald-700 text-white'
                    }`}
                  >
                    <strong className="block mb-1 text-[10px] uppercase opacity-80">
                      {m.sender === 'client' ? 'Cliente:' : 'Respuesta Oficial Gemini IA:'}
                    </strong>
                    {m.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === 'settings' && isAdmin && (
        <form onSubmit={handleSaveConfig} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 max-w-3xl">
          <h3 className="text-base font-bold text-slate-900">
            Configuración de WhatsApp Business y Asistente Gemini
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número Oficial de WhatsApp Business
              </label>
              <input
                type="text"
                value={businessPhone}
                onChange={e => setBusinessPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex flex-col justify-center gap-2 pt-4">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={chatbotActive}
                  onChange={e => setChatbotActive(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Activar respuestas automáticas del Chatbot en WhatsApp
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={geminiEnabled}
                  onChange={e => setGeminiEnabled(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Habilitar motor de IA Gemini conectado al inventario real
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mensaje de Bienvenida
            </label>
            <textarea
              rows={2}
              value={welcomeMessage}
              onChange={e => setWelcomeMessage(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instrucciones del Sistema para Gemini (System Prompt)
            </label>
            <textarea
              rows={4}
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {savingConfig ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: INTEGRACIONES -> WHATSAPP BUSINESS (SECRETOS Y CLOUD API) */}
      {activeTab === 'cloud-integration' && isAdmin && (
        <WhatsAppBusinessIntegration onConfigUpdated={loadWhatsAppData} />
      )}
    </div>
  );
};

