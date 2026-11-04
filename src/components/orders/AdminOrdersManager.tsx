import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, OrderAuthorizationRequest } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatCOP, formatDate } from '../../utils/formatters';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  AlertCircle,
  MessageCircle,
  Phone,
  RefreshCw,
  MapPin,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  XCircle,
  ExternalLink,
  BellRing
} from 'lucide-react';
import { dispatchServiceWorkerNotification } from '../../services/pushNotifications';

export const AdminOrdersManager: React.FC = () => {
  const { user, notify } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [authorizations, setAuthorizations] = useState<OrderAuthorizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Supervisor Authorization modal state
  const [supervisorModal, setSupervisorModal] = useState<{
    order: Order;
    proposedStatus: OrderStatus;
    actionType: 'Modificar' | 'Cancelar' | 'Eliminar lógicamente';
    reason: string;
  } | null>(null);

  // Inline shipment guide editor
  const [editingGuideOrder, setEditingGuideOrder] = useState<{
    orderId: string;
    carrier: string;
    trackingNumber: string;
  } | null>(null);

  const isPrimaryOrFullAdmin =
    user?.role === 'Administrador' ||
    user?.email?.toLowerCase() === 'jeffervr@gmail.com';
  const isSupervisor = !isPrimaryOrFullAdmin && user?.role === 'Supervisor';

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, authReqs] = await Promise.all([
        api.getAdminOrders(),
        api.getOrderAuthorizations().catch(() => [])
      ]);
      setOrders(data);
      setAuthorizations(authReqs || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los pedidos de clientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (order: Order, newStatus: OrderStatus) => {
    // Section 8: Supervisor must request authorization from Primary Admin (jeffervr@gmail.com)
    if (isSupervisor) {
      setSupervisorModal({
        order,
        proposedStatus: newStatus,
        actionType: newStatus === 'Cancelado' ? 'Cancelar' : 'Modificar',
        reason: ''
      });
      return;
    }

    setUpdatingId(order.id);
    try {
      const res = await api.updateOrderStatus(order.id, newStatus);
      if (res?.requiresAuthorization) {
        notify(res.message, 'info');
        await loadOrders();
      } else {
        setOrders(prev => prev.map(o => (o.id === order.id ? res : o)));
        await dispatchServiceWorkerNotification({
          id: `order_status_sw_${order.id}_${newStatus}_${Date.now()}`,
          type: 'ORDER_STATUS',
          title: `📦 Pedido ${order.id}: ${newStatus}`,
          body: `Hola ${order.customerName}, el estado de tu pedido ${order.id} se actualizó a "${newStatus}".`,
          url: `/?tab=my-account&order=${encodeURIComponent(order.id)}`,
          targetAudience: 'specific_customer',
          targetOrderId: order.id,
          orderStatus: newStatus
        });
        notify(
          `Pedido ${order.id} actualizado a "${newStatus}" y notificación Push emitida al Service Worker del cliente.`,
          'success'
        );
      }
    } catch (err: any) {
      notify(err.message || 'Error al actualizar el estado del pedido.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSendOrderPush = async (order: Order) => {
    try {
      const res = await api.sendCustomerPushNotification({
        type: 'ORDER_STATUS',
        title: `📦 Estado de tu Pedido ${order.id}: ${order.status}`,
        body: `Hola ${order.customerName}, tu pedido ${order.id} (${formatCOP(order.totalCOP)}) está en estado "${order.status}"${
          order.trackingNumber ? ` · Guía ${order.carrier || ''}: ${order.trackingNumber}` : ''
        }.`,
        url: `/?tab=my-account&order=${encodeURIComponent(order.id)}`,
        targetAudience: 'specific_customer',
        targetCustomerEmail: order.customerEmail,
        targetCustomerPhone: order.customerPhone,
        targetOrderId: order.id,
        orderStatus: order.status,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier
      });
      await dispatchServiceWorkerNotification(res.event);
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al enviar notificación push al cliente.', 'error');
    }
  };

  const handleSubmitSupervisorRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorModal || !supervisorModal.reason.trim()) {
      notify('Debe ingresar la justificación para el Administrador Principal.', 'error');
      return;
    }
    try {
      const res = await api.requestOrderAuthorization({
        orderId: supervisorModal.order.id,
        actionType: supervisorModal.actionType,
        reason: supervisorModal.reason.trim(),
        proposedChanges: {
          status: supervisorModal.proposedStatus,
          isLogicallyDeleted: supervisorModal.actionType === 'Eliminar lógicamente'
        }
      });
      setSupervisorModal(null);
      notify(res.message, 'info');
      await loadOrders();
    } catch (err: any) {
      notify(err.message || 'Error al enviar solicitud de autorización.', 'error');
    }
  };

  const handleReviewAuth = async (id: string, decision: 'Aprobada' | 'Rechazada') => {
    try {
      const res = await api.reviewOrderAuthorization(
        id,
        decision,
        decision === 'Aprobada'
          ? 'Autorizado expresamente por el Administrador Principal (jeffervr@gmail.com)'
          : 'Rechazado por el Administrador Principal'
      );
      notify(res.message, decision === 'Aprobada' ? 'success' : 'info');
      await loadOrders();
    } catch (err: any) {
      notify(err.message || 'Error al procesar solicitud.', 'error');
    }
  };

  const handleSaveTrackingGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuideOrder) return;
    try {
      const res = await api.updateShipment(editingGuideOrder.orderId, {
        carrier: editingGuideOrder.carrier,
        trackingNumber: editingGuideOrder.trackingNumber,
        status: 'Despachado'
      });
      setEditingGuideOrder(null);
      notify(res.message, 'success');
      await loadOrders();
    } catch (err: any) {
      notify(err.message || 'No se pudo asignar la guía de envío.', 'error');
    }
  };

  const allStatuses: OrderStatus[] = [
    'Pendiente',
    'Confirmado',
    'Pagado',
    'En preparación',
    'Enviado',
    'Entregado',
    'Cancelado'
  ];

  const pendingAuthorizations = authorizations.filter(a => a.status === 'Pendiente');

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.trackingNumber && order.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerPhone && order.customerPhone.includes(searchTerm));
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pendiente':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Pendiente
          </span>
        );
      case 'Confirmado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmado
          </span>
        );
      case 'Pagado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pagado
          </span>
        );
      case 'En preparación':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Package className="w-3.5 h-3.5" />
            En preparación
          </span>
        );
      case 'Enviado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Truck className="w-3.5 h-3.5" />
            Enviado
          </span>
        );
      case 'Entregado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Entregado
          </span>
        );
      case 'Cancelado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-red-600" />
            Gestión de Pedidos, Guías de Envío y Flujo de Autorización
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSupervisor
              ? 'Modo Supervisor: Cualquier modificación o cancelación de pedidos requiere autorización expresa del Administrador Principal (jeffervr@gmail.com).'
              : 'Control de pedidos, asignación de Número de Guía, garantías automáticas y aprobación de solicitudes de Supervisores.'}
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-2 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar Lista
        </button>
      </div>

      {/* Pending Supervisor Authorizations (Section 8) */}
      {pendingAuthorizations.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs uppercase">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Solicitudes de Autorización de Supervisores Pendientes ({pendingAuthorizations.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingAuthorizations.map(req => (
              <div
                key={req.id}
                className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{req.orderId}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                    Acción: {req.actionType} → {req.proposedChanges.status}
                  </span>
                </div>
                <p className="text-slate-700">
                  <strong>Supervisor:</strong> {req.requestedByName} ({req.requestedByEmail})
                </p>
                <p className="text-slate-600">
                  <strong>Motivo:</strong> {req.reason}
                </p>
                {isPrimaryOrFullAdmin ? (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleReviewAuth(req.id, 'Aprobada')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Autorizar Cambio
                    </button>
                    <button
                      onClick={() => handleReviewAuth(req.id, 'Rechazada')}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Rechazar
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-800 font-semibold">
                    En espera de decisión del Administrador Principal (jeffervr@gmail.com)
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por ID, guía, cliente, correo o teléfono..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">Todos los estados ({orders.length})</option>
            {allStatuses.map(st => (
              <option key={st} value={st}>
                {st} ({orders.filter(o => o.status === st).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Cargando pedidos de clientes...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
          <p className="font-bold text-slate-700 text-sm">No se encontraron pedidos con los filtros seleccionados.</p>
          <p className="text-xs text-slate-400">Intenta cambiar el término de búsqueda o el estado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const isExpanded = expandedId === order.id;
            const cleanPhone = (order.customerPhone || '573001234567').replace(/[^0-9]/g, '');
            const fullPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
            const waCustomerLink = `https://wa.me/${fullPhone}?text=${encodeURIComponent(
              `Hola ${order.customerName}, le contactamos de *IPS TECNOLÓGICA* respecto a su pedido *${order.id}* por valor de *${formatCOP(order.totalCOP)}* (Estado: *${order.status}*${order.trackingNumber ? ` · Guía ${order.carrier || ''}: ${order.trackingNumber}` : ''}).`
            )}`;
            const googleMapsLink = order.shippingAddress
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${order.shippingAddress}, ${order.shippingCity || 'Cali'}, Colombia`
                )}`
              : null;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden hover:border-slate-300 transition"
              >
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {order.id}
                      </span>
                      {getStatusBadge(order.status)}
                      {order.trackingNumber && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-mono font-bold">
                          <Truck className="w-3 h-3" />
                          {order.carrier || 'Envío'}: {order.trackingNumber}
                        </span>
                      )}
                      {order.discountCode && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          Cupón {order.discountCode} (-{formatCOP(order.discountAmountCOP || 0)})
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{formatDate(order.date)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                      <span className="font-semibold text-slate-900">{order.customerName}</span>
                      <span>•</span>
                      <span>{order.customerEmail}</span>
                      {order.customerPhone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono text-slate-700">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {order.customerPhone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() =>
                        setEditingGuideOrder({
                          orderId: order.id,
                          carrier: order.carrier || 'Servientrega',
                          trackingNumber: order.trackingNumber || ''
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Asignar Guía
                    </button>

                    {/* Status Select dropdown */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">Estado:</span>
                      <select
                        disabled={updatingId === order.id}
                        value={order.status}
                        onChange={e => handleStatusChange(order, e.target.value as OrderStatus)}
                        className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {allStatuses.map(st => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-right pl-2 pr-2">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Total</span>
                      <span className="text-sm font-extrabold text-red-600">
                        {formatCOP(order.totalCOP)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendOrderPush(order)}
                      title="Enviar notificación Push al cliente mediante Service Worker"
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <BellRing className="w-3.5 h-3.5 text-amber-600" />
                      <span>Push Cliente</span>
                    </button>

                    <a
                      href={waCustomerLink}
                      target="_blank"
                      rel="noreferrer"
                      title="Enviar detalles del pedido por WhatsApp (wa.me)"
                      className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-5 border-t border-slate-200 bg-slate-50/50 space-y-4">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Detalle de Artículos y Garantía:
                    </span>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Ref</th>
                            <th className="py-2.5 px-3">Producto</th>
                            <th className="py-2.5 px-3 text-center">Cantidad</th>
                            <th className="py-2.5 px-3 text-right">Precio Unitario</th>
                            <th className="py-2.5 px-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {order.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                {item.reference}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-800">{item.name}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                {item.quantity}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-600">
                                {formatCOP(item.unitPriceCOP)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {formatCOP(item.subtotalCOP)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                          <tr>
                            <td colSpan={4} className="py-2.5 px-3 text-right text-slate-700">
                              Total Pedido COP:
                            </td>
                            <td className="py-2.5 px-3 text-right text-red-600 text-sm font-black">
                              {formatCOP(order.totalCOP)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {order.shippingAddress && (
                        <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-2">
                          <div>
                            <span className="text-slate-500 font-semibold block mb-1 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              Dirección de Entrega ({order.shippingCity || 'Cali'}):
                            </span>
                            <p className="text-slate-800">{order.shippingAddress}</p>
                          </div>
                          {googleMapsLink && (
                            <a
                              href={googleMapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Google Maps
                            </a>
                          )}
                        </div>
                      )}
                      <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <span className="text-slate-500 font-semibold block mb-1">
                          Aceptación de Políticas Ley 1480 de 2011:
                        </span>
                        <p className="text-slate-800">
                          {order.acceptedPolicyVersion || 'v2.4 (Ley 1480 de 2011)'} ·{' '}
                          {order.notes || 'Sin observaciones adicionales'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Supervisor Request Authorization (Section 8) */}
      {supervisorModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitSupervisorRequest}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center gap-2 text-amber-700 font-extrabold text-sm">
              <ShieldAlert className="w-5 h-5" />
              Autorización del Administrador Principal Requerida
            </div>
            <p className="text-slate-600 leading-relaxed">
              Conforme a la <strong>Sección 8</strong>, el rol de <strong>Supervisor</strong> requiere autorización expresa de <strong>jeffervr@gmail.com</strong> para modificar o cancelar el pedido <strong>{supervisorModal.order.id}</strong> (Nuevo estado propuesto: <strong>{supervisorModal.proposedStatus}</strong>).
            </p>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Motivo / Justificación para el Administrador Principal *
              </label>
              <textarea
                rows={3}
                required
                value={supervisorModal.reason}
                onChange={e => setSupervisorModal({ ...supervisorModal, reason: e.target.value })}
                placeholder="Explique por qué solicita modificar o cancelar este pedido..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSupervisorModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold">
                Enviar Solicitud a jeffervr@gmail.com
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Quick Guide Number Assignment */}
      {editingGuideOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTrackingGuide}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              Asignar Número de Guía · {editingGuideOrder.orderId}
            </h3>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Empresa Transportadora</label>
              <input
                type="text"
                required
                value={editingGuideOrder.carrier}
                onChange={e => setEditingGuideOrder({ ...editingGuideOrder, carrier: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Número de Guía *</label>
              <input
                type="text"
                required
                value={editingGuideOrder.trackingNumber}
                onChange={e =>
                  setEditingGuideOrder({ ...editingGuideOrder, trackingNumber: e.target.value })
                }
                placeholder="Ej: SRV-COL-994821045"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingGuideOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-sky-600 text-white font-bold">
                Guardar Guía y Marcar Despachado
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
