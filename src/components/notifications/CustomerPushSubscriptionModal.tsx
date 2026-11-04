import React, { useState, useEffect } from 'react';
import { CustomerPushEvent } from '../../types';
import { api } from '../../services/api';
import {
  getLocalPushPrefs,
  saveLocalPushPrefs,
  enableCustomerServiceWorkerPush,
  dispatchServiceWorkerNotification,
  getBrowserNotificationPermission,
  isServiceWorkerPushSupported,
  LocalPushSubscriptionPrefs
} from '../../services/pushNotifications';
import { useAuth } from '../../context/AuthContext';
import { formatBogotaDateTime } from '../../utils/formatters';
import {
  Bell,
  BellRing,
  CheckCircle2,
  Tag,
  Package,
  Truck,
  Sparkles,
  X,
  Plus,
  Trash2,
  Send,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface CustomerPushSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogPublished: boolean;
  activeProductsCount: number;
  activePromoCount: number;
  onSelectOfferEvent?: (event: CustomerPushEvent) => void;
  onPrefsChanged?: (prefs: LocalPushSubscriptionPrefs) => void;
}

export const CustomerPushSubscriptionModal: React.FC<CustomerPushSubscriptionModalProps> = ({
  isOpen,
  onClose,
  catalogPublished,
  activeProductsCount,
  activePromoCount,
  onSelectOfferEvent,
  onPrefsChanged
}) => {
  const { user, notify } = useAuth();
  const [prefs, setPrefs] = useState<LocalPushSubscriptionPrefs>(getLocalPushPrefs());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    getBrowserNotificationPermission()
  );
  const [events, setEvents] = useState<CustomerPushEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newOrderIdInput, setNewOrderIdInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const loaded = getLocalPushPrefs();
    const effectiveEmail = user?.email || loaded.customerEmail || '';
    if (effectiveEmail && effectiveEmail !== loaded.customerEmail) {
      const synced = saveLocalPushPrefs({
        customerEmail: effectiveEmail,
        customerName: user?.name || loaded.customerName,
        customerPhone: user?.phone || loaded.customerPhone
      });
      setPrefs(synced);
      setEmailInput(synced.customerEmail);
    } else {
      setPrefs(loaded);
      setEmailInput(loaded.customerEmail);
    }
    setPermission(getBrowserNotificationPermission());
    loadFeed(effectiveEmail, loaded.trackedOrderIds, loaded.subscribedToOffers, loaded.subscribedToOrders);
  }, [isOpen, user]);

  const loadFeed = async (
    email: string,
    orderIds: string[],
    includeOffers: boolean,
    includeOrders: boolean
  ) => {
    setLoadingEvents(true);
    try {
      const res = await api.getCustomerPushEvents({
        email: email || undefined,
        orderIds,
        includeOffers,
        includeOrders
      });
      setEvents(res.events || []);
    } catch {
      // ignore
    } finally {
      setLoadingEvents(false);
    }
  };

  if (!isOpen) return null;

  const handleEnablePush = async () => {
    setSaving(true);
    try {
      const res = await enableCustomerServiceWorkerPush({
        customerEmail: emailInput.trim() || user?.email || prefs.customerEmail,
        customerName: user?.name || prefs.customerName,
        customerPhone: user?.phone || prefs.customerPhone,
        subscribedToOffers: prefs.subscribedToOffers,
        subscribedToOrders: prefs.subscribedToOrders,
        trackedOrderIds: prefs.trackedOrderIds
      });

      // Even if iframe restricts native OS prompt, allow in-app + Service Worker message subscription
      const finalEnabled = res.granted || res.permission !== 'denied';
      const updated = saveLocalPushPrefs({
        ...res.prefs,
        enabled: finalEnabled,
        customerEmail: emailInput.trim() || user?.email || res.prefs.customerEmail
      });
      setPrefs(updated);
      setPermission(getBrowserNotificationPermission());
      if (onPrefsChanged) onPrefsChanged(updated);

      if (res.granted && catalogPublished) {
        await dispatchServiceWorkerNotification({
          id: `welcome_push_${Date.now()}`,
          type: 'NEW_OFFER',
          title: '🔔 Notificaciones Push Activas — IPS TECNOLÓGICA',
          body: 'Recibirás avisos inmediatos cuando se publiquen nuevas ofertas o cambie el estado de tus pedidos.',
          url: '/?promo=active'
        });
      }

      notify(res.message, res.granted ? 'success' : 'info');
      await loadFeed(
        updated.customerEmail,
        updated.trackedOrderIds,
        updated.subscribedToOffers,
        updated.subscribedToOrders
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaster = async () => {
    if (!prefs.enabled) {
      await handleEnablePush();
      return;
    }
    const updated = saveLocalPushPrefs({ enabled: false });
    setPrefs(updated);
    if (onPrefsChanged) onPrefsChanged(updated);
    try {
      await api.saveCustomerPushSubscription({
        deviceId: updated.deviceId,
        customerEmail: updated.customerEmail || undefined,
        subscribedToOffers: updated.subscribedToOffers,
        subscribedToOrders: updated.subscribedToOrders,
        trackedOrderIds: updated.trackedOrderIds,
        active: false
      });
    } catch {
      // ignore
    }
    notify('Notificaciones push del Service Worker desactivadas en este dispositivo.', 'info');
  };

  const handleUpdatePreference = async (
    patch: Partial<Pick<LocalPushSubscriptionPrefs, 'subscribedToOffers' | 'subscribedToOrders' | 'customerEmail' | 'trackedOrderIds'>>
  ) => {
    const updated = saveLocalPushPrefs(patch);
    setPrefs(updated);
    if (onPrefsChanged) onPrefsChanged(updated);

    try {
      await api.saveCustomerPushSubscription({
        deviceId: updated.deviceId,
        customerEmail: updated.customerEmail || undefined,
        customerName: updated.customerName || undefined,
        customerPhone: updated.customerPhone || undefined,
        subscribedToOffers: updated.subscribedToOffers,
        subscribedToOrders: updated.subscribedToOrders,
        trackedOrderIds: updated.trackedOrderIds,
        active: updated.enabled
      });
    } catch {
      // ignore
    }

    await loadFeed(
      updated.customerEmail,
      updated.trackedOrderIds,
      updated.subscribedToOffers,
      updated.subscribedToOrders
    );
  };

  const handleAddOrderId = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newOrderIdInput.trim().toUpperCase();
    if (!clean) return;
    const nextList = Array.from(new Set([clean, ...prefs.trackedOrderIds]));
    setNewOrderIdInput('');
    await handleUpdatePreference({
      trackedOrderIds: nextList,
      customerEmail: emailInput.trim()
    });
    notify(`Pedido ${clean} vinculado a tus alertas Push del Service Worker.`, 'success');
  };

  const handleRemoveOrderId = async (idToRemove: string) => {
    const nextList = prefs.trackedOrderIds.filter(id => id !== idToRemove);
    await handleUpdatePreference({ trackedOrderIds: nextList });
  };

  const handleTestOfferPush = async () => {
    if (!catalogPublished) {
      notify('El catálogo debe estar publicado para emitir notificaciones push.', 'error');
      return;
    }
    const testEvent: CustomerPushEvent = {
      id: `test_offer_${Date.now()}`,
      type: 'NEW_OFFER',
      title: '🔥 ¡Nueva Oferta Flash en IPS TECNOLÓGICA!',
      body: 'Portátil Workstation Pro y Monitores Curvos con hasta 20% OFF + Cupón IPS10 disponible en el catálogo publicado.',
      tag: `test_offer_${Date.now()}`,
      url: '/?promo=active',
      targetAudience: 'all_customers',
      discountBadge: '20% OFF',
      catalogPublished: true,
      createdAt: new Date().toISOString(),
      createdBy: 'Prueba Service Worker'
    };

    const shownSw = await dispatchServiceWorkerNotification(testEvent);
    setEvents(prev => [testEvent, ...prev]);
    notify(
      shownSw
        ? 'Notificación Push de Nueva Oferta enviada a través de la API del Service Worker (sw.js).'
        : 'Alerta de Nueva Oferta registrada: ' + testEvent.title,
      'success'
    );
  };

  const handleTestOrderPush = async () => {
    if (!catalogPublished) {
      notify('El catálogo debe estar publicado para emitir notificaciones push.', 'error');
      return;
    }
    const orderId = prefs.trackedOrderIds[0] || 'PED-2026-002';
    const testEvent: CustomerPushEvent = {
      id: `test_order_${Date.now()}`,
      type: 'ORDER_STATUS',
      title: `📦 Actualización de tu Pedido ${orderId}: Enviado`,
      body: `Tu pedido ${orderId} ha sido despachado por Servientrega (Guía N° 2094851029). Haz clic para ver el seguimiento en línea.`,
      tag: `test_order_${Date.now()}`,
      url: `/?tab=my-account&order=${encodeURIComponent(orderId)}`,
      targetAudience: 'specific_customer',
      targetOrderId: orderId,
      orderStatus: 'Enviado',
      trackingNumber: '2094851029',
      carrier: 'Servientrega',
      catalogPublished: true,
      createdAt: new Date().toISOString(),
      createdBy: 'Prueba Service Worker'
    };

    const shownSw = await dispatchServiceWorkerNotification(testEvent);
    setEvents(prev => [testEvent, ...prev]);
    notify(
      shownSw
        ? `Notificación Push del Pedido ${orderId} enviada mediante la API del Service Worker (sw.js).`
        : `Alerta de Pedido ${orderId}: ${testEvent.body}`,
      'success'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Notificaciones Push — Service Worker API
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    catalogPublished
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {catalogPublished ? 'Catálogo Publicado' : 'Catálogo No Publicado'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Avisos instantáneos de nuevas ofertas y cambios en el estado de tus pedidos ({activeProductsCount} productos activos · {activePromoCount} en oferta)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status & Activation Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              prefs.enabled
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {prefs.enabled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Bell className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                  {prefs.enabled
                    ? 'Suscripción Push Activa en este Dispositivo'
                    : 'Notificaciones Push Desactivadas'}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {isServiceWorkerPushSupported()
                  ? `Service Worker (/sw.js) registrado · Permiso del navegador: ${
                      permission === 'granted'
                        ? 'Concedido (Notificaciones nativas del sistema)'
                        : permission === 'denied'
                        ? 'Restringido por navegador (Avisos en pantalla activos)'
                        : 'Pendiente de autorizar'
                    }`
                  : 'Modo compatible con alertas en tiempo real del catálogo.'}
              </p>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={handleToggleMaster}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 shrink-0 cursor-pointer shadow-xs ${
                prefs.enabled
                  ? 'bg-white hover:bg-red-50 text-red-600 border border-red-200'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <BellRing className="w-4 h-4" />
              <span>
                {saving
                  ? 'Activando...'
                  : prefs.enabled
                  ? 'Pausar Notificaciones'
                  : 'Activar Notificaciones Push'}
              </span>
            </button>
          </div>

          {/* 2 Core Notification Channels: New Offers & Order Status Changes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Channel 1: New Offers & Coupons */}
            <label className="p-4 rounded-2xl border border-slate-200 hover:border-red-300 bg-white flex items-start gap-3 cursor-pointer transition shadow-2xs">
              <input
                type="checkbox"
                checked={prefs.subscribedToOffers}
                onChange={e =>
                  handleUpdatePreference({ subscribedToOffers: e.target.checked })
                }
                className="mt-1 w-4 h-4 accent-red-600 rounded"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                  <Tag className="w-3.5 h-3.5 text-red-600" />
                  <span>Nuevas Ofertas y Cupones</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Recibe una notificación push cuando el administrador publique nuevas promociones, descuentos relámpago o códigos como <code className="font-bold text-slate-700">IPS10</code>.
                </p>
              </div>
            </label>

            {/* Channel 2: Order Status & Shipping Guide */}
            <label className="p-4 rounded-2xl border border-slate-200 hover:border-red-300 bg-white flex items-start gap-3 cursor-pointer transition shadow-2xs">
              <input
                type="checkbox"
                checked={prefs.subscribedToOrders}
                onChange={e =>
                  handleUpdatePreference({ subscribedToOrders: e.target.checked })
                }
                className="mt-1 w-4 h-4 accent-red-600 rounded"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Estado de mis Pedidos y Guías</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Recibe avisos inmediatos cuando tu pedido cambie a <strong>Confirmado</strong>, <strong>En preparación</strong>, <strong>Enviado</strong> (con Número de Guía) o <strong>Entregado</strong>.
                </p>
              </div>
            </label>
          </div>

          {/* Order Tracking & Customer Email Association */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-red-600" />
                Pedidos y Correo Vinculados para Alertas de Estado
              </span>
              <span className="text-[11px] text-slate-500">
                Privacidad protegida por cliente
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tu Correo de Cliente (opcional)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="cliente@ejemplo.com"
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdatePreference({ customerEmail: emailInput.trim() });
                      notify('Correo actualizado para notificaciones de tus pedidos.', 'success');
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddOrderId}>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Vincular Número de Pedido (ej. PED-2026-002)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newOrderIdInput}
                    onChange={e => setNewOrderIdInput(e.target.value.toUpperCase())}
                    placeholder="PED-2026-002"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir
                  </button>
                </div>
              </form>
            </div>

            {prefs.trackedOrderIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-500">
                  Pedidos monitoreados por el Service Worker:
                </span>
                {prefs.trackedOrderIds.map(ordId => (
                  <span
                    key={ordId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-mono font-bold text-slate-800 shadow-2xs"
                  >
                    {ordId}
                    <button
                      type="button"
                      onClick={() => handleRemoveOrderId(ordId)}
                      className="text-slate-400 hover:text-red-600 cursor-pointer"
                      title="Dejar de monitorear este pedido"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Live Service Worker Push Verification Buttons */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Probar Notificación Push en Vivo (API del Service Worker)
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                sw.js · showNotification()
              </span>
            </div>
            <p className="text-[11px] text-amber-900">
              Verifica al instante cómo recibe tu dispositivo un aviso de nueva oferta o un cambio en el estado de tu pedido cuando el catálogo está publicado:
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleTestOfferPush}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Probar Push: Nueva Oferta
              </button>
              <button
                type="button"
                onClick={handleTestOrderPush}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-emerald-400" />
                Probar Push: Cambio Estado Pedido
              </button>
            </div>
          </div>

          {/* Recent Push Notifications Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-red-600" />
                Últimas Alertas Push Emitidas por el Catálogo ({events.length})
              </h4>
              <button
                type="button"
                onClick={() =>
                  loadFeed(
                    prefs.customerEmail,
                    prefs.trackedOrderIds,
                    prefs.subscribedToOffers,
                    prefs.subscribedToOrders
                  )
                }
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>

            {events.length === 0 ? (
              <div className="p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                No hay notificaciones recientes para los filtros seleccionados.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {events.map(ev => {
                  const isOrder =
                    ev.type === 'ORDER_STATUS' || ev.type === 'SHIPMENT_UPDATE';
                  return (
                    <div
                      key={ev.id}
                      onClick={() => {
                        if (onSelectOfferEvent) {
                          onSelectOfferEvent(ev);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer ${
                        isOrder
                          ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
                          : 'bg-white border-slate-200 hover:border-red-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              isOrder
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {isOrder ? 'Estado de Pedido' : 'Oferta Catálogo'}
                          </span>
                          {ev.discountBadge && (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                              {ev.discountBadge}
                            </span>
                          )}
                          {ev.targetOrderId && (
                            <span className="font-mono text-[11px] font-bold text-slate-800">
                              {ev.targetOrderId}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {formatBogotaDateTime(ev.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs font-extrabold text-slate-900">{ev.title}</p>
                        <p className="text-xs text-slate-600">{ev.body}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>API nativa Service Worker · 100% gratuita y sin rastreadores externos</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
