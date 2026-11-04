import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Order,
  OrderStatus,
  TechnicalServiceRequest,
  WarrantyRecord,
  ShipmentRecord,
  WarrantyCategoryType
} from '../../types';
import { api } from '../../services/api';
import { formatCOP, buildWhatsAppOrderLink, formatDate } from '../../utils/formatters';
import {
  ShoppingBag,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  Truck,
  Package,
  AlertCircle,
  MessageCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MapPin,
  FileText,
  Wrench,
  ShieldCheck,
  Plus,
  ExternalLink,
  BellRing
} from 'lucide-react';
import { CustomerPushSubscriptionModal } from '../notifications/CustomerPushSubscriptionModal';
import {
  getLocalPushPrefs,
  saveLocalPushPrefs,
  checkAndDeliverPendingPushEvents,
  LocalPushSubscriptionPrefs
} from '../../services/pushNotifications';
import { PublicSupportBooking } from '../support/PublicSupportBooking';
import { CompanyProfile } from '../../types';

interface ClientPortalProps {
  onGoToCatalog: () => void;
  onGoToSupportBooking?: () => void;
  whatsappCompanyPhone?: string;
  company?: CompanyProfile;
}

const SPARE_PART_SUBCATEGORIES = [
  'Pantallas y displays',
  'Baterías y cargadores',
  'Teclados y touchpads',
  'Memorias RAM',
  'Discos SSD y almacenamiento',
  'Fuentes de poder',
  'Tarjetas madre / mainboard',
  'Ventiladores y disipadores',
  'Conectores, flex y puertos',
  'Cámaras, parlantes y micrófonos',
  'Componentes electrónicos y chips'
];

export const ClientPortal: React.FC<ClientPortalProps> = ({
  onGoToCatalog,
  onGoToSupportBooking,
  whatsappCompanyPhone = '+573108947231',
  company
}) => {
  const { user, updateProfile, notify } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [supportTickets, setSupportTickets] = useState<TechnicalServiceRequest[]>([]);
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [promoBanners, setPromoBanners] = useState<any[]>([]);
  const [portalNotifications, setPortalNotifications] = useState<
    Array<{
      id: string;
      title: string;
      body: string;
      createdAt: string;
      validUntil?: string;
      discountCode?: string;
      read: boolean;
    }>
  >(() => {
    try {
      const saved = localStorage.getItem('ips_client_portal_notifs_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'NOTIF-PROMO-1',
        title: 'Promoción Empresarial ThinkPad & Workstations',
        body: 'Aprovecha hasta 12% de descuento en equipos corporativos certificados y mantenimiento preventivo incluido.',
        createdAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10),
        discountCode: 'IPS10',
        read: false
      },
      {
        id: 'NOTIF-PROMO-2',
        title: 'Campaña de Mantenimiento Preventivo y Diagnóstico',
        body: 'Agenda tu servicio técnico en sede o a domicilio desde tu portal con prioridad empresarial.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        validUntil: new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10),
        read: false
      }
    ];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'orders' | 'shipments' | 'support' | 'book-service' | 'warranties' | 'promotions'
  >('orders');

  // Profile edit states
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Warranty Claim Form State (Ley 1480 de 2011)
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimProductName, setClaimProductName] = useState('');
  const [claimCategory, setClaimCategory] = useState<WarrantyCategoryType>('Producto Nuevo');
  const [claimSubCategory, setClaimSubCategory] = useState(SPARE_PART_SUBCATEGORIES[0]);
  const [claimOrderId, setClaimOrderId] = useState('');
  const [claimSerialNumber, setClaimSerialNumber] = useState('');
  const [claimReason, setClaimReason] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Service Worker Push Notification state
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [pushPrefs, setPushPrefs] = useState<LocalPushSubscriptionPrefs>(getLocalPushPrefs());

  const toggleReadNotification = (id: string) => {
    setPortalNotifications(prev => {
      const next = prev.map(n => (n.id === id ? { ...n, read: !n.read } : n));
      try {
        localStorage.setItem('ips_client_portal_notifs_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const markAllPortalNotificationsRead = () => {
    setPortalNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      try {
        localStorage.setItem('ips_client_portal_notifs_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    loadClientData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      checkAndDeliverPendingPushEvents({
        userEmail: user?.email,
        onInAppToast: ev => {
          notify(`${ev.title}: ${ev.body}`, 'info');
          setPortalNotifications(prev => {
            if (prev.some(item => item.id === ev.id)) return prev;
            const added = [
              {
                id: ev.id,
                title: ev.title,
                body: ev.body,
                createdAt: ev.createdAt || new Date().toISOString(),
                validUntil: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
                read: false
              },
              ...prev
            ];
            try {
              localStorage.setItem('ips_client_portal_notifs_v1', JSON.stringify(added));
            } catch {}
            return added;
          });
          loadClientData();
        }
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [user?.email]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user]);

  const loadClientData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersData, supportData, warrantiesData, shipmentsData, bannersData] = await Promise.all([
        api.getMyOrders().catch(() => []),
        api.getMySupportTickets().catch(() => ({ tickets: [], appointments: [] })),
        api.getMyWarranties().catch(() => []),
        api.getMyShipments().catch(() => []),
        api.getPromoBanners().catch(() => [])
      ]);
      setOrders(ordersData);
      setSupportTickets(supportData.tickets || []);
      setWarranties(warrantiesData);
      setShipments(shipmentsData);
      setPromoBanners((bannersData || []).filter((b: any) => b.isActive));
      if (ordersData.length > 0 && !expandedOrderId) {
        setExpandedOrderId(ordersData[0].id);
      }
      if (ordersData.length > 0 || user?.email) {
        const currentPrefs = getLocalPushPrefs();
        const syncedPrefs = saveLocalPushPrefs({
          customerEmail: user?.email || currentPrefs.customerEmail,
          customerName: user?.name || currentPrefs.customerName,
          customerPhone: user?.phone || currentPrefs.customerPhone,
          trackedOrderIds: Array.from(
            new Set([...currentPrefs.trackedOrderIds, ...ordersData.map(o => o.id)])
          )
        });
        setPushPrefs(syncedPrefs);
      }
    } catch (err: any) {
      setError(err.message || 'No fue posible cargar la información de tu cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ name, phone });
      setEditingProfile(false);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmitWarrantyClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimProductName.trim() || !claimReason.trim()) {
      notify('Completa el nombre del producto/servicio y el motivo de la solicitud.', 'error');
      return;
    }
    setSubmittingClaim(true);
    try {
      const createdRes = await api.submitWarrantyClaim({
        productOrServiceName: claimProductName.trim(),
        warrantyCategory: claimCategory,
        componentSubCategory: claimCategory === 'Repuesto' ? claimSubCategory : undefined,
        orderId: claimOrderId.trim() || undefined,
        serialNumber: claimSerialNumber.trim() || undefined,
        claimReason: claimReason.trim(),
        reportedFailure: claimReason.trim()
      });
      const created = createdRes.warranty || (createdRes as unknown as WarrantyRecord);
      setWarranties(prev => [created, ...prev]);
      setShowClaimModal(false);
      setClaimProductName('');
      setClaimOrderId('');
      setClaimSerialNumber('');
      setClaimReason('');
      notify(`Solicitud de garantía ${created.id} radicada con estado «Solicitud recibida».`, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al radicar la solicitud de garantía.', 'error');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pendiente':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Pendiente
          </span>
        );
      case 'Confirmado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmado
          </span>
        );
      case 'Pagado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pagado
          </span>
        );
      case 'En preparación':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Package className="w-3.5 h-3.5" />
            En preparación
          </span>
        );
      case 'Enviado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Truck className="w-3.5 h-3.5" />
            En camino / Enviado
          </span>
        );
      case 'Entregado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Entregado
          </span>
        );
      case 'Cancelado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-red-950 rounded-2xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-red-300 text-xs font-bold uppercase tracking-wider">
            <span>Portal Privado de Cliente — IPS TECNOLÓGICA</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Hola, {user?.name || 'Cliente'}
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Consulta únicamente tus compras, seguimiento de envíos con Número de Guía, órdenes de servicio técnico (<code className="text-white">SRV</code>) y garantías certificadas bajo la Ley 1480 de 2011.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onGoToCatalog}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            Catálogo
          </button>
          <button
            onClick={() => setActiveTab('book-service')}
            className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-red-600" />
            AGENDA TU SERVICIO TÉCNICO
          </button>
          <button
            onClick={() => setPushModalOpen(true)}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs border transition flex items-center gap-1.5 cursor-pointer ${
              pushPrefs.enabled
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/50'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-400/50'
            }`}
          >
            <BellRing className="w-4 h-4 text-amber-300" />
            <span>{pushPrefs.enabled ? 'Push Activo' : 'Activar Push Pedidos'}</span>
          </button>
          <button
            onClick={loadClientData}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Client Profile Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <User className="w-5 h-5 text-red-600" />
                Mis Datos de Cliente
              </h3>
              {!editingProfile && (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
                >
                  Editar
                </button>
              )}
            </div>

            {editingProfile ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre o Empresa
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono / Celular
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition"
                  >
                    {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Nombre / Titular</span>
                    <strong className="text-slate-900">{user?.name}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Correo Electrónico</span>
                    <span className="text-slate-900">{user?.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Teléfono de Contacto</span>
                    <span className="text-slate-900">{user?.phone || 'No registrado'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Miembro desde</span>
                    <span className="text-slate-900">
                      {user?.createdAt ? formatDate(user.createdAt) : '2026'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Direct Support Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              ¿Necesitas Asesoría Inmediata?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Nuestro equipo comercial y técnico de IPS TECNOLÓGICA está disponible para cotizaciones, envíos, garantías y soporte.
            </p>
            <a
              href={`https://wa.me/${whatsappCompanyPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                `Hola IPS TECNOLÓGICA, soy ${user?.name || 'Cliente'} (${user?.email}). Deseo consultar sobre mis pedidos, envíos y servicios técnicos.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Chatear con un Asesor
            </a>
          </div>
        </div>

        {/* Right Columns: Tabs for Orders, Shipments, Support Tickets, Warranties */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Pills */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Mis Compras ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('shipments')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'shipments'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-4 h-4" />
              Envíos y Guías ({shipments.length})
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'support'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Wrench className="w-4 h-4" />
              Mis Citas y Órdenes SRV ({supportTickets.length})
            </button>
            <button
              onClick={() => setActiveTab('book-service')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'book-service'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              AGENDA TU SERVICIO TÉCNICO
            </button>
            <button
              onClick={() => setActiveTab('warranties')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'warranties'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Mis Garantías ({warranties.length})
            </button>
            <button
              onClick={() => setActiveTab('promotions')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'promotions'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BellRing className="w-4 h-4 text-amber-500" />
              Promociones y Notificaciones ({portalNotifications.filter(n => !n.read).length})
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-red-600" />
                    Historial de Pedidos y Cotizaciones
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consulta exclusiva de pedidos asociados a {user?.email} ({orders.length} encontrados)
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500">Cargando tus pedidos...</div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                  <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">Aún no tienes pedidos registrados con este correo.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => {
                    const isExpanded = expandedOrderId === order.id;
                    const waOrderLink = buildWhatsAppOrderLink(
                      whatsappCompanyPhone,
                      order.id,
                      order.totalCOP,
                      order.items.map(i => `${i.quantity}x ${i.name}`)
                    );

                    return (
                      <div
                        key={order.id}
                        className="border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-all bg-white"
                      >
                        <div
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="p-4 sm:p-5 cursor-pointer bg-slate-50/50 hover:bg-slate-50 flex flex-wrap items-center justify-between gap-4 transition"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                                {order.id}
                              </span>
                              {getStatusBadge(order.status)}
                              {order.guideNumber && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  <Truck className="w-3 h-3" />
                                  Guía: {order.guideNumber}
                                </span>
                              )}
                              {order.discountCode && (
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                  Cupón {order.discountCode} (-{formatCOP(order.discountCOP || 0)})
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatDate(order.date)}</span>
                              <span>•</span>
                              <span>{order.items.reduce((acc, i) => acc + i.quantity, 0)} artículos</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-[11px] text-slate-500 block uppercase font-medium">Total</span>
                              <span className="text-base font-extrabold text-red-600">
                                {formatCOP(order.totalCOP)}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-5 border-t border-slate-200 space-y-4 bg-white">
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="py-2.5 px-3">Ref</th>
                                    <th className="py-2.5 px-3">Producto</th>
                                    <th className="py-2.5 px-3 text-center">Cant</th>
                                    <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {order.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{item.reference}</td>
                                      <td className="py-2.5 px-3 font-medium text-slate-800">{item.name}</td>
                                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{item.quantity}</td>
                                      <td className="py-2.5 px-3 text-right text-slate-600">{formatCOP(item.unitPriceCOP)}</td>
                                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCOP(item.subtotalCOP)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {(order.shippingAddress || order.notes || order.guideNumber) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                                {order.shippingAddress && (
                                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <span className="text-slate-500 font-semibold block mb-1 flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                      Dirección de Entrega:
                                    </span>
                                    <p className="text-slate-800">{order.shippingAddress}</p>
                                  </div>
                                )}
                                {order.guideNumber && (
                                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                                    <span className="text-blue-700 font-semibold block mb-1 flex items-center gap-1.5">
                                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                                      Transportadora y Número de Guía:
                                    </span>
                                    <p className="text-slate-900 font-mono font-bold">
                                      {order.carrierName || 'Transportadora Nacional'} · Guía {order.guideNumber}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                              <span className="text-xs text-slate-500">¿Preguntas sobre este pedido?</span>
                              <a
                                href={waOrderLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                              >
                                <MessageCircle className="w-4 h-4" />
                                Consultar pedido {order.id} por WhatsApp
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SHIPMENTS & GUIDE NUMBERS */}
          {activeTab === 'shipments' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Seguimiento de Envíos y Números de Guía
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rastreo de despachos en Cali, Valle del Cauca y envíos nacionales con transportadora certificada.
                </p>
              </div>

              {shipments.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Truck className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">
                    Cuando tus pedidos sean despachados verás aquí la transportadora, el Número de Guía y el enlace de rastreo.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {shipments.map(sh => (
                    <div key={sh.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                            Pedido {sh.orderId}
                          </span>
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                            Guía: {sh.guideNumber}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          {sh.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-600">
                        <div>
                          <span className="text-slate-400 block">Transportadora</span>
                          <strong className="text-slate-900">{sh.carrier}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Destino</span>
                          <strong className="text-slate-900">
                            {sh.city}, {sh.department} ({sh.shippingType})
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Entrega Estimada</span>
                          <strong className="text-slate-900">{sh.estimatedDeliveryDate || 'En tránsito'}</strong>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                        <span className="text-slate-500">{sh.address}</span>
                        {sh.trackingUrl && (
                          <a
                            href={sh.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Rastrear Guía</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TECHNICAL SUPPORT TICKETS & APPOINTMENTS */}
          {activeTab === 'support' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-red-600" />
                    Mis Órdenes de Servicio Técnico y Citas Programadas
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Seguimiento en tiempo real de tus equipos en laboratorio o visitas a domicilio.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('book-service')}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  + AGENDA TU SERVICIO TÉCNICO
                </button>
              </div>

              {supportTickets.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <Wrench className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">
                    No tienes órdenes de servicio técnico asociadas a tu cuenta ({user?.email}).
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {supportTickets.map(ticket => (
                    <div key={ticket.id} className="p-4 rounded-xl border border-slate-200 space-y-3 bg-slate-50/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-red-600">{ticket.ticketNumber}</span>
                          <span className="text-xs font-bold text-slate-900">• {ticket.serviceType}</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-700">Estado: {ticket.status}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400 block">Equipo</span>
                          <strong className="text-slate-800">
                            {ticket.equipmentBrand} {ticket.equipmentModel}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Cita Programada</span>
                          <strong className="text-slate-800">
                            {ticket.appointmentDate || 'Por definir'} {ticket.appointmentTime || ''} ({ticket.modality})
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Técnico / Costo Total</span>
                          <strong className="text-slate-800">
                            {ticket.assignedTechnicianName || 'Asignado'} • {formatCOP(ticket.totalCostCOP || 0)}
                          </strong>
                        </div>
                      </div>

                      {ticket.diagnosis && (
                        <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                          <strong className="text-slate-800 block mb-0.5">Diagnóstico Técnico:</strong>
                          <p className="text-slate-600">{ticket.diagnosis}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3B: INTEGRATED TECHNICAL SERVICE BOOKING (AGENDA TU SERVICIO TÉCNICO) */}
          {activeTab === 'book-service' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 sm:p-4">
              <PublicSupportBooking
                company={
                  company || {
                    name: 'IPS TECNOLÓGICA',
                    slogan: 'Innovación, Equipamiento y Soluciones Tecnológicas de Alta Gama',
                    logoUrl: '/uploads/ips_official_logo.svg',
                    description: '',
                    phone: '+57 (601) 745-8920',
                    whatsapp: whatsappCompanyPhone,
                    email: 'contacto@ipstecnologica.com.co',
                    address: 'Carrera 15 # 85-30, Oficina 402',
                    city: 'Bogotá D.C., Colombia',
                    website: 'https://ipstecnologica.com.co',
                    social: {},
                    colors: {
                      primary: '#DC2626',
                      secondary: '#111827',
                      accent: '#475569',
                      background: '#FFFFFF'
                    },
                    commercialTerms: ''
                  }
                }
                onBackToCatalog={() => {
                  loadClientData();
                  setActiveTab('support');
                }}
              />
            </div>
          )}

          {/* TAB 4: WARRANTIES & LEY 1480 CLAIM SUBMISSION */}
          {activeTab === 'warranties' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Mis Certificados y Trámites de Garantía (Ley 1480 de 2011)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Garantías activas de tus compras, repuestos, remanufacturados y servicios técnicos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClaimModal(true)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Radicar Solicitud de Garantía</span>
                </button>
              </div>

              {warranties.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">
                    Tus garantías de equipos entregados y solicitudes radicadas aparecerán aquí automáticamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {warranties.map(w => (
                    <div key={w.id} className="p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {w.id}
                          </span>
                          <strong className="text-sm text-slate-900">{w.productOrServiceName}</strong>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                          Estado: {w.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-slate-500">
                        <span>Categoría: <strong>{w.warrantyCategory || w.type}</strong></span>
                        {w.componentSubCategory && (
                          <span>Subcategoría: <strong>{w.componentSubCategory}</strong></span>
                        )}
                        <span>
                          Vigencia: {w.startDate} a {w.endDate} ({w.warrantyMonths} meses)
                        </span>
                      </div>

                      {w.claimReason && (
                        <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <strong>Motivo reportado:</strong> {w.claimReason}
                        </p>
                      )}
                      {w.technicalDiagnosis && (
                        <p className="text-blue-900 bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                          <strong>Diagnóstico Laboratorio:</strong> {w.technicalDiagnosis}
                        </p>
                      )}
                      {w.notes && <p className="text-slate-600">{w.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CUSTOMER PROMOTIONS & NOTIFICATIONS MODULE */}
          {activeTab === 'promotions' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <BellRing className="w-5 h-5 text-red-600" />
                    Mis Notificaciones de Promociones, Campañas y Novedades
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configura tu consentimiento promocional (Ley 1581), consulta promociones vigentes y revisa tus avisos leídos y no leídos.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = saveLocalPushPrefs({
                        ...pushPrefs,
                        enabled: !pushPrefs.enabled,
                        notifyNewOffers: !pushPrefs.enabled
                      });
                      setPushPrefs(next);
                      notify(
                        next.enabled
                          ? 'Notificaciones de promociones activadas en tu cuenta.'
                          : 'Notificaciones de promociones desactivadas.',
                        'info'
                      );
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      pushPrefs.enabled
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {pushPrefs.enabled
                      ? '✓ Notificaciones de Promociones Activas'
                      : 'Activar Notificaciones de Promociones'}
                  </button>
                  <button
                    type="button"
                    onClick={markAllPortalNotificationsRead}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Marcar todas como leídas
                  </button>
                </div>
              </div>

              {/* Read / Unread Notifications List */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Bandeja de Notificaciones ({portalNotifications.filter(n => !n.read).length} no leídas de {portalNotifications.length})
                </h4>
                {portalNotifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      notif.read
                        ? 'bg-slate-50/70 border-slate-200 text-slate-600'
                        : 'bg-red-50/30 border-red-200 text-slate-900 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            notif.read
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {notif.read ? 'Leída' : 'Nueva / No leída'}
                        </span>
                        <strong className="text-sm text-slate-900">{notif.title}</strong>
                      </div>
                      <p className="text-slate-600">{notif.body}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                        {notif.validUntil && <span>📅 Vigencia hasta: <strong>{notif.validUntil}</strong></span>}
                        {notif.discountCode && (
                          <span className="font-mono font-bold text-red-600">
                            Cupón: {notif.discountCode}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleReadNotification(notif.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                      >
                        {notif.read ? 'Marcar no leída' : 'Marcar leída'}
                      </button>
                      <button
                        type="button"
                        onClick={onGoToCatalog}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
                      >
                        Ver en Catálogo
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Active Promotional Campaigns / Banners */}
              {promoBanners.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Campañas y Promociones Vigentes ({promoBanners.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {promoBanners.map((b: any) => (
                      <div
                        key={b.id}
                        className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/40 flex flex-col justify-between"
                      >
                        <div>
                          {b.imageUrl && (
                            <img
                              src={b.imageUrl}
                              alt={b.title}
                              className="w-full h-32 object-cover bg-slate-900"
                            />
                          )}
                          <div className="p-3.5 space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <strong className="text-slate-900">{b.title}</strong>
                              {b.discountPercent ? (
                                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px]">
                                  -{b.discountPercent}% DTO
                                </span>
                              ) : null}
                            </div>
                            <p className="text-slate-600 line-clamp-2">{b.description}</p>
                          </div>
                        </div>
                        <div className="px-3.5 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">
                            Vigencia: {b.endAt ? String(b.endAt).slice(0, 10) : 'Activa'}
                          </span>
                          <button
                            type="button"
                            onClick={onGoToCatalog}
                            className="font-bold text-red-600 hover:underline cursor-pointer"
                          >
                            Aprovechar Oferta →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Radicar Solicitud de Garantía (Ley 1480) */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Radicar Solicitud de Garantía (Ley 1480 de 2011)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClaimModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitWarrantyClaim} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Producto, Repuesto o Servicio Técnico *
                </label>
                <input
                  type="text"
                  required
                  value={claimProductName}
                  onChange={e => setClaimProductName(e.target.value)}
                  placeholder="Ej: Portátil ThinkPad T14 / SSD NVMe 1TB / Orden SRV-2026-0001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Garantía *</label>
                  <select
                    value={claimCategory}
                    onChange={e => setClaimCategory(e.target.value as WarrantyCategoryType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Producto Nuevo">Producto Nuevo</option>
                    <option value="Repuesto">Repuesto / Componente</option>
                    <option value="Remanufacturado">Equipo Remanufacturado</option>
                    <option value="Servicio Técnico">Servicio Técnico</option>
                  </select>
                </div>

                {claimCategory === 'Repuesto' ? (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subcategoría de Componente</label>
                    <select
                      value={claimSubCategory}
                      onChange={e => setClaimSubCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {SPARE_PART_SUBCATEGORIES.map(sub => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">N.º de Pedido / Factura / Orden</label>
                    <input
                      type="text"
                      value={claimOrderId}
                      onChange={e => setClaimOrderId(e.target.value)}
                      placeholder="Ej: ORD-2026-101"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Serial del Equipo o Pieza (Opcional)</label>
                <input
                  type="text"
                  value={claimSerialNumber}
                  onChange={e => setClaimSerialNumber(e.target.value)}
                  placeholder="Ej: SN-98451203"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descripción detallada de la falla técnica *
                </label>
                <textarea
                  rows={3}
                  required
                  value={claimReason}
                  onChange={e => setClaimReason(e.target.value)}
                  placeholder="Describe el síntoma o falla presentada para el diagnóstico de nuestro laboratorio..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {submittingClaim ? 'Radicando...' : 'Radicar Garantía'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CustomerPushSubscriptionModal
        isOpen={pushModalOpen}
        onClose={() => setPushModalOpen(false)}
        catalogPublished={true}
        activeProductsCount={15}
        activePromoCount={2}
        onPrefsChanged={updated => setPushPrefs(updated)}
        onSelectOfferEvent={ev => {
          setPushModalOpen(false);
          if (ev.targetOrderId) {
            setActiveTab('orders');
            setExpandedOrderId(ev.targetOrderId);
          } else {
            onGoToCatalog();
          }
        }}
      />
    </div>
  );
};

