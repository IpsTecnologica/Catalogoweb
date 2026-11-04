import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Info,
  ExternalLink,
  X
} from 'lucide-react';
import { AdminNotification, OrderAuthorizationRequest } from '../../types';
import { api } from '../../services/api';

interface AdminNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPrimaryAdmin: boolean;
  onNavigateTab?: (tab: string) => void;
  onNotify: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  onUnreadCountChange?: (count: number) => void;
}

export const AdminNotificationsModal: React.FC<AdminNotificationsModalProps> = ({
  isOpen,
  onClose,
  isPrimaryAdmin,
  onNavigateTab,
  onNotify,
  onUnreadCountChange
}) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [authorizations, setAuthorizations] = useState<OrderAuthorizationRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'authorizations'>('all');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notifRes, authRes] = await Promise.all([
        api.getAdminNotifications(),
        api.getOrderAuthorizations()
      ]);
      setNotifications(notifRes.notifications || []);
      setAuthorizations(authRes || []);
      onUnreadCountChange?.(notifRes.unreadCount || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkRead = async (id: string) => {
    try {
      const res = await api.markNotificationRead(id);
      setNotifications(res.notifications);
      onUnreadCountChange?.(res.unreadCount);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await api.markAllNotificationsRead();
      setNotifications(res.notifications);
      onUnreadCountChange?.(0);
      onNotify('Notificaciones', res.message, 'info');
    } catch {}
  };

  const handleReviewAuthorization = async (id: string, decision: 'Aprobada' | 'Rechazada') => {
    try {
      const res = await api.reviewOrderAuthorization(
        id,
        decision,
        decision === 'Aprobada'
          ? 'Autorizado expresamente por el Administrador Principal (jeffervr@gmail.com)'
          : 'Rechazado por el Administrador Principal (jeffervr@gmail.com)'
      );
      onNotify(`Solicitud ${decision}`, res.message, decision === 'Aprobada' ? 'success' : 'info');
      await loadData();
    } catch (err: any) {
      onNotify('Error', err.message || 'No se pudo procesar la autorización.', 'error');
    }
  };

  const pendingAuths = authorizations.filter(a => a.status === 'Pendiente');
  const displayedNotifs =
    filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center">
              <Bell className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">
                Centro de Notificaciones y Autorizaciones · jeffervr@gmail.com
              </h2>
              <p className="text-xs text-slate-400">
                Alertas operativas en tiempo real, auditoría y solicitudes de Supervisores
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              Marcar todo leído
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Todas ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              filter === 'unread' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            No leídas ({notifications.filter(n => !n.isRead).length})
          </button>
          <button
            onClick={() => setFilter('authorizations')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              filter === 'authorizations'
                ? 'bg-red-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            Autorizaciones de Supervisores ({pendingAuths.length} pendientes)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Pending Supervisor Authorizations Banner */}
          {(filter === 'authorizations' || pendingAuths.length > 0) && (
            <div className="space-y-3">
              {pendingAuths.map(auth => (
                <div
                  key={auth.id}
                  className="p-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-sm space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-extrabold text-[10px]">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      AUTORIZACIÓN REQUERIDA DE SUPERVISOR · PEDIDO {auth.orderId}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(auth.requestedAt).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">
                    {auth.requestedByName} ({auth.requestedByEmail}) solicita{' '}
                    <span className="text-red-700 underline">{auth.actionType}</span> el pedido{' '}
                    {auth.orderId} de {auth.customerName} ($
                    {auth.orderTotalCOP.toLocaleString('es-CO')} COP)
                  </p>
                  <p className="text-slate-700">
                    <strong>Motivo reportado:</strong> {auth.reason}
                  </p>
                  {isPrimaryAdmin ? (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleReviewAuthorization(auth.id, 'Aprobada')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aprobar y Aplicar Cambio
                      </button>
                      <button
                        onClick={() => handleReviewAuthorization(auth.id, 'Rechazada')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rechazar Solicitud
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-800 font-semibold">
                      Esperando aprobación exclusiva del Administrador Principal (jeffervr@gmail.com).
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {filter !== 'authorizations' && (
            <div className="space-y-2.5">
              {loading ? (
                <p className="text-center text-xs text-slate-500 py-8">Cargando notificaciones...</p>
              ) : displayedNotifs.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-8">
                  No hay notificaciones en esta vista.
                </p>
              ) : (
                displayedNotifs.map(n => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 text-xs ${
                      n.isRead
                        ? 'bg-white border-slate-200 opacity-80'
                        : 'bg-slate-50 border-red-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-xl mt-0.5 ${
                          n.severity === 'urgent'
                            ? 'bg-red-100 text-red-700'
                            : n.severity === 'warning'
                            ? 'bg-amber-100 text-amber-700'
                            : n.severity === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {n.severity === 'urgent' || n.severity === 'warning' ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : n.severity === 'success' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Info className="w-4 h-4" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">{n.title}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-mono text-[10px]">
                            {n.eventType}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{n.message}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(n.createdAt).toLocaleString('es-CO')}
                          </span>
                          {n.relatedModule && onNavigateTab && (
                            <button
                              onClick={() => {
                                handleMarkRead(n.id);
                                onNavigateTab(n.relatedModule!);
                                onClose();
                              }}
                              className="text-red-600 hover:underline font-bold inline-flex items-center gap-1"
                            >
                              Ir al módulo <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold shrink-0"
                      >
                        Leído
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
