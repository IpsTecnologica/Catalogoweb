import React, { useState, useEffect } from 'react';
import {
  Product,
  Promotion,
  PromotionScope,
  PromotionDiscountType,
  PromotionComputedStatus,
  PromotionManualStatus,
  DiscountCode
} from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  formatCOP,
  formatBogotaDateTime,
  toBogotaDateTimeLocalInput,
  fromBogotaDateTimeLocalInput,
  getRemainingCountdown
} from '../../utils/formatters';
import {
  Tag,
  Plus,
  Clock,
  Calendar,
  Percent,
  DollarSign,
  Play,
  Pause,
  XCircle,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Timer,
  BellRing
} from 'lucide-react';
import { dispatchServiceWorkerNotification } from '../../services/pushNotifications';

interface PromotionsManagerProps {
  products: Product[];
  categories: string[];
  onPromotionsChanged: () => void;
}

export const PromotionsManager: React.FC<PromotionsManagerProps> = ({
  products,
  categories,
  onPromotionsChanged
}) => {
  const { notify, canEdit } = useAuth();

  const [promotions, setPromotions] = useState<
    Array<Promotion & { computedStatus: PromotionComputedStatus; targetLabel: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<PromotionScope>('product');
  const [targetProductId, setTargetProductId] = useState<string>(products[0]?.id || '');
  const [targetCategory, setTargetCategory] = useState<string>(categories[0] || 'Portátiles y Cómputo');
  const [discountType, setDiscountType] = useState<PromotionDiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<number | ''>(15);
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Discount Code Generator state (Section 12)
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [newCodeForm, setNewCodeForm] = useState<{
    code: string;
    description: string;
    discountType: 'percentage' | 'fixed_cop';
    discountValue: number;
    maxUses: number;
    minPurchaseCOP: number;
    expirationDate: string;
    allowedCategory: string;
  }>({
    code: '',
    description: 'Cupón promocional IPS TECNOLÓGICA',
    discountType: 'percentage',
    discountValue: 10,
    maxUses: 100,
    minPurchaseCOP: 150000,
    expirationDate: '2027-12-31',
    allowedCategory: 'Todas'
  });

  const loadPromotions = async () => {
    try {
      const [list, codes] = await Promise.all([
        api.getPromotions(),
        api.getDiscountCodes().catch(() => [])
      ]);
      setPromotions(list);
      setDiscountCodes(codes || []);
    } catch (err: any) {
      console.error('Error loading promotions:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCouponCode = () => {
    const prefixes = ['IPS', 'NAVIDAD', 'HALLOWEEN', 'CYBER', 'CALI', 'VIP'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(10 + Math.random() * 89);
    setNewCodeForm(prev => ({ ...prev, code: `${prefix}${suffix}` }));
  };

  const handleCreateDiscountCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeForm.code.trim()) {
      notify('Ingrese o genere un código de descuento.', 'error');
      return;
    }
    try {
      const res = await api.createDiscountCode({
        ...newCodeForm,
        expirationDate: new Date(newCodeForm.expirationDate).toISOString()
      });
      setDiscountCodes(prev => [res.discountCode, ...prev]);
      setNewCodeForm(prev => ({ ...prev, code: '' }));
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'No se pudo crear el código de descuento.', 'error');
    }
  };

  const handleToggleDiscountCode = async (dc: DiscountCode) => {
    try {
      const res = await api.updateDiscountCode(dc.id, { isActive: !dc.isActive });
      setDiscountCodes(prev => prev.map(c => (c.id === dc.id ? res.discountCode : c)));
      notify(res.message, 'info');
    } catch (err: any) {
      notify(err.message || 'Error al actualizar código.', 'error');
    }
  };

  const handleDeleteDiscountCode = async (dc: DiscountCode) => {
    try {
      await api.deleteDiscountCode(dc.id);
      setDiscountCodes(prev => prev.filter(c => c.id !== dc.id));
      notify(`Código ${dc.code} eliminado.`, 'info');
    } catch (err: any) {
      notify(err.message || 'Error al eliminar código.', 'error');
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  // Live 1-second ticker for countdowns and automatic expiration refresh
  useEffect(() => {
    const interval = setInterval(() => {
      const current = Date.now();
      setNowMs(current);

      // Check if any promotion just crossed its startDate or endDate boundary
      setPromotions(prev => {
        let shouldReload = false;
        for (const p of prev) {
          if (p.manualStatus !== 'active') continue;
          const start = new Date(p.startAt || p.startDate || '').getTime();
          const end = new Date(p.endAt || p.endDate || '').getTime();
          if (
            (p.computedStatus === 'Programada' && current >= start) ||
            (p.computedStatus === 'Activa' && current > end)
          ) {
            shouldReload = true;
            break;
          }
        }
        if (shouldReload) {
          loadPromotions();
          onPromotionsChanged();
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onPromotionsChanged]);

  const bogotaNowFormatted = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(new Date(nowMs));

  const handleOpenCreate = () => {
    setEditingPromo(null);
    setName('');
    setDescription('');
    setScope('product');
    setTargetProductId(products[0]?.id || '');
    setTargetCategory(categories[0] || 'Portátiles y Cómputo');
    setDiscountType('percentage');
    setDiscountValue(15);
    const now = new Date();
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    setStartLocal(toBogotaDateTimeLocalInput(now));
    setEndLocal(toBogotaDateTimeLocalInput(inThreeDays));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setName(promo.name);
    setDescription(promo.description || '');
    setScope(promo.scope);
    setTargetProductId(promo.targetProductId || products[0]?.id || '');
    setTargetCategory(promo.targetCategory || categories[0] || '');
    setDiscountType(promo.discountType);
    setDiscountValue(promo.discountValue);
    setStartLocal(toBogotaDateTimeLocalInput(promo.startDate));
    setEndLocal(toBogotaDateTimeLocalInput(promo.endDate));
    setFormError(null);
    setIsModalOpen(true);
  };

  // Quick 1-minute live test promotion generator
  const handleCreateQuickTestPromo = async () => {
    if (products.length === 0) {
      notify('Primero registre al menos un producto en el inventario.', 'error');
      return;
    }
    const targetProd = products[0];
    const start = new Date();
    const end = new Date(start.getTime() + 90 * 1000); // 90 seconds duration for easy live testing

    try {
      await api.createPromotion({
        name: `Oferta Flash Prueba (${targetProd.reference})`,
        description: 'Promoción automática de prueba por 90 segundos. Al finalizar volverá al precio normal.',
        scope: 'product',
        targetProductId: targetProd.id,
        discountType: 'percentage',
        discountValue: 20,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        timezone: 'America/Bogota',
        manualStatus: 'active'
      });
      await loadPromotions();
      onPromotionsChanged();
      await dispatchServiceWorkerNotification({
        title: `🔥 Oferta Flash: ${targetProd.name} (-20%)`,
        body: `Precio especial en IPS TECNOLÓGICA por tiempo limitado.`,
        tag: `promo-test-${Date.now()}`,
        url: `/?product=${encodeURIComponent(targetProd.reference)}`,
        type: 'new_offer'
      });
      notify(
        `¡Promoción de prueba activada en "${targetProd.name}" (-20%) por 90 segundos! Notificación Push enviada a clientes.`,
        'success'
      );
    } catch (err: any) {
      notify(err.message || 'No se pudo crear la promoción de prueba.', 'error');
    }
  };

  const handleSendPromoPush = async (promo: Promotion) => {
    try {
      const targetProd = promo.scope === 'product' ? products.find(p => p.id === promo.targetProductId) : undefined;
      const discountLabel =
        promo.discountType === 'percentage'
          ? `-${promo.discountValue}%`
          : promo.discountType === 'fixed_discount'
          ? `-${formatCOP(promo.discountValue)}`
          : formatCOP(promo.discountValue);
      const title = `🔥 Oferta IPS TECNOLÓGICA: ${promo.name} (${discountLabel})`;
      const body = promo.description || (targetProd ? `Aprovecha en ${targetProd.name} antes de que termine.` : 'Descuento especial por tiempo limitado en nuestro catálogo publicado.');
      const url = targetProd
        ? `/?product=${encodeURIComponent(targetProd.reference)}`
        : promo.scope === 'category' && promo.targetCategory
        ? `/?category=${encodeURIComponent(promo.targetCategory)}`
        : '/?promo=active';

      await api.sendCustomerPushNotification({
        type: 'new_offer',
        title,
        body,
        url,
        tag: `promo-push-${promo.id}-${Date.now()}`,
        targetAudience: 'all_customers',
        promotionId: promo.id,
        productId: promo.targetProductId,
        discountBadge: discountLabel
      });

      await dispatchServiceWorkerNotification({
        title,
        body,
        tag: `promo-push-${promo.id}-${Date.now()}`,
        url,
        type: 'new_offer'
      });

      notify(`Notificación Push de la oferta "${promo.name}" enviada a los clientes suscritos.`, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al enviar notificación push de la oferta.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('El nombre de la promoción es obligatorio.');
      return;
    }
    if (discountValue === '' || Number(discountValue) <= 0) {
      setFormError('Ingrese un descuento o precio promocional mayor a 0.');
      return;
    }

    const startIso = fromBogotaDateTimeLocalInput(startLocal);
    const endIso = fromBogotaDateTimeLocalInput(endLocal);

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setFormError('La fecha y hora final debe ser posterior a la fecha y hora de inicio.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        scope,
        targetProductId: scope === 'product' ? targetProductId : undefined,
        targetCategory: scope === 'category' ? targetCategory : undefined,
        discountType,
        discountValue: Number(discountValue),
        startDate: startIso,
        endDate: endIso,
        timezone: 'America/Bogota'
      };

      if (editingPromo) {
        await api.updatePromotion(editingPromo.id, payload);
        notify('Promoción actualizada exitosamente.', 'success');
      } else {
        await api.createPromotion(payload);
        notify('Promoción programada y registrada exitosamente.', 'success');
      }

      setIsModalOpen(false);
      await loadPromotions();
      onPromotionsChanged();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar la promoción.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (id: string, manualStatus: PromotionManualStatus, label: string) => {
    try {
      await api.updatePromotionStatus(id, manualStatus);
      await loadPromotions();
      onPromotionsChanged();
      notify(`Estado de promoción actualizado a: ${label}`, 'info');
    } catch (err: any) {
      notify(err.message || 'Error al cambiar estado.', 'error');
    }
  };

  const handleDelete = async (id: string, promoName: string) => {
    try {
      await api.deletePromotion(id);
      await loadPromotions();
      onPromotionsChanged();
      notify(`Promoción "${promoName}" eliminada. Precios normales restaurados.`, 'info');
    } catch (err: any) {
      notify(err.message || 'Error al eliminar promoción.', 'error');
    }
  };

  // Preview calculation inside modal
  const selectedModalProduct = products.find(p => p.id === targetProductId);
  const previewNormalPrice =
    scope === 'product' && selectedModalProduct
      ? selectedModalProduct.priceCOP
      : products.find(p => p.category === targetCategory)?.priceCOP || 1000000;

  const previewPromoPrice =
    discountType === 'percentage'
      ? Math.round(previewNormalPrice * (1 - Math.min(99, Math.max(0, Number(discountValue) || 0)) / 100))
      : Number(discountValue) || 0;
  const previewSavings = Math.max(0, previewNormalPrice - previewPromoPrice);

  const filteredPromos = promotions.filter(p => {
    if (statusFilter === 'all') return true;
    return p.computedStatus === statusFilter;
  });

  const renderStatusBadge = (status: PromotionComputedStatus) => {
    switch (status) {
      case 'Activa':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            Activa Ahora
          </span>
        );
      case 'Programada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
            <Clock className="w-3 h-3" />
            Programada
          </span>
        );
      case 'Pausada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Pause className="w-3 h-3" />
            Pausada
          </span>
        );
      case 'Finalizada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
            <CheckCircle2 className="w-3 h-3" />
            Finalizada (Precio Normal Restaurado)
          </span>
        );
      case 'Cancelada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" />
            Cancelada
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-red-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Módulo de Promociones Programadas y Cuentas Regresivas
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Zona Horaria Oficial Configurada: <strong className="text-slate-800">America/Bogota (Hora Colombia: {bogotaNowFormatted})</strong> · Al vencer la fecha final, el backend restaura el precio normal automáticamente.
            </p>
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCreateQuickTestPromo}
                className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Crea una oferta inmediata de 90 segundos para comprobar el retorno automático al precio normal"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Probar Oferta Automática (90 seg)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Promoción</span>
              </button>
            </div>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: `Todas (${promotions.length})` },
              { id: 'Activa', label: `Activas (${promotions.filter(p => p.computedStatus === 'Activa').length})` },
              { id: 'Programada', label: `Programadas (${promotions.filter(p => p.computedStatus === 'Programada').length})` },
              { id: 'Pausada', label: `Pausadas (${promotions.filter(p => p.computedStatus === 'Pausada').length})` },
              { id: 'Finalizada', label: `Finalizadas (${promotions.filter(p => p.computedStatus === 'Finalizada').length})` },
              { id: 'Cancelada', label: `Canceladas (${promotions.filter(p => p.computedStatus === 'Cancelada').length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              loadPromotions();
              onPromotionsChanged();
            }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* Promotions List */}
      {filteredPromos.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <Timer className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No hay promociones en esta vista</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Programa descuentos porcentuales o precios de oferta por producto o categoría con fecha de inicio y fin en hora de Colombia (America/Bogota).
          </p>
          {canEdit && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Primera Promoción</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPromos.map(promo => {
            const endIso = promo.endAt || promo.endDate || '';
            const startIso = promo.startAt || promo.startDate || '';
            const countdown = getRemainingCountdown(endIso, nowMs);
            const startCountdown = getRemainingCountdown(startIso, nowMs);
            const targetProd =
              promo.scope === 'product'
                ? products.find(p => p.id === (promo.targetProductId || promo.targetId))
                : products.find(p => p.category === (promo.targetCategory || promo.targetId));

            const normalPrice = targetProd?.priceCOP || 0;
            const promoPrice =
              promo.discountType === 'percentage'
                ? Math.round(normalPrice * (1 - promo.discountValue / 100))
                : promo.discountValue;
            const savings = Math.max(0, normalPrice - promoPrice);

            return (
              <div
                key={promo.id}
                className={`bg-white rounded-xl border p-5 shadow-2xs flex flex-col justify-between space-y-4 ${
                  promo.computedStatus === 'Activa'
                    ? 'border-red-300 ring-1 ring-red-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
                        {promo.scope === 'product' ? 'Promoción por Producto' : 'Promoción por Categoría'}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                        {promo.name}
                      </h3>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">
                        {promo.targetLabel || promo.targetName}
                      </p>
                    </div>
                    {renderStatusBadge(promo.computedStatus)}
                  </div>

                  {promo.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {promo.description}
                    </p>
                  )}

                  {/* Pricing & Savings Breakdown */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Precio Normal
                      </span>
                      <span className="font-mono font-bold text-slate-500 line-through">
                        {normalPrice > 0 ? formatCOP(normalPrice) : 'Según producto'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-red-600 uppercase font-bold block">
                        Precio Oferta ({promo.discountType === 'percentage' ? `-${promo.discountValue}%` : 'Fijo'})
                      </span>
                      <span className="font-mono font-extrabold text-red-600 text-sm">
                        {promoPrice > 0 ? formatCOP(promoPrice) : `${promo.discountValue}% OFF`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                        Ahorro Cliente
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {savings > 0 ? formatCOP(savings) : `${promo.discountValue}%`}
                      </span>
                    </div>
                  </div>

                  {/* Schedule & Live Countdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block font-medium">Inicio (America/Bogota):</span>
                      <strong className="text-slate-800">{formatBogotaDateTime(startIso)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Finaliza (America/Bogota):</span>
                      <strong className="text-slate-800">{formatBogotaDateTime(endIso)}</strong>
                    </div>
                  </div>

                  {promo.computedStatus === 'Activa' && !countdown.expired && (
                    <div className="px-3.5 py-2.5 rounded-xl bg-red-600 text-white flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Timer className="w-4 h-4 animate-spin" />
                        <span>Cuenta Regresiva para volver a Precio Normal:</span>
                      </div>
                      <span className="font-mono text-sm font-black tracking-wider bg-slate-900/40 px-2.5 py-0.5 rounded">
                        {countdown.formatted}
                      </span>
                    </div>
                  )}

                  {promo.computedStatus === 'Programada' && !startCountdown.expired && (
                    <div className="px-3.5 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 flex items-center justify-between text-xs">
                      <span className="font-semibold">Inicia automáticamente en:</span>
                      <span className="font-mono font-bold">{startCountdown.formatted}</span>
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                {canEdit && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {promo.computedStatus !== 'Finalizada' && promo.manualStatus !== 'active' && (
                        <button
                          onClick={() => handleStatusToggle(promo.id, 'active', 'Activa')}
                          className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>Activar</span>
                        </button>
                      )}

                      {promo.computedStatus === 'Activa' && (
                        <button
                          onClick={() => handleStatusToggle(promo.id, 'paused', 'Pausada')}
                          className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-1"
                        >
                          <Pause className="w-3 h-3" />
                          <span>Pausar</span>
                        </button>
                      )}

                      {promo.manualStatus !== 'cancelled' && promo.computedStatus !== 'Finalizada' && (
                        <button
                          onClick={() => handleStatusToggle(promo.id, 'cancelled', 'Cancelada')}
                          className="px-2.5 py-1 text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Cancelar</span>
                        </button>
                      )}

                      {promo.computedStatus === 'Activa' && (
                        <button
                          onClick={() => handleSendPromoPush(promo)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg flex items-center gap-1"
                          title="Enviar notificación Push inmediata a todos los clientes con el catálogo publicado"
                        >
                          <BellRing className="w-3 h-3" />
                          <span>Push Oferta</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(promo)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Editar promoción"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id, promo.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar promoción"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Promotion Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingPromo ? 'Editar Promoción Programada' : 'Nueva Promoción Programada'}
                </h3>
                <p className="text-xs text-slate-400">
                  Zona horaria: America/Bogota (UTC-5) · Retorno automático al precio normal
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Campaña / Promoción *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej. Especial Tecnológico Fin de Semana -15%"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Scope Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Aplicar Promoción Por *
                  </label>
                  <select
                    value={scope}
                    onChange={e => setScope(e.target.value as PromotionScope)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    <option value="product">Producto Individual</option>
                    <option value="category">Categoría Completa</option>
                  </select>
                </div>

                {scope === 'product' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Seleccionar Producto *
                    </label>
                    <select
                      value={targetProductId}
                      onChange={e => setTargetProductId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.reference} - {p.name} ({formatCOP(p.priceCOP)})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Seleccionar Categoría *
                    </label>
                    <select
                      value={targetCategory}
                      onChange={e => setTargetCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Oferta *
                  </label>
                  <select
                    value={discountType}
                    onChange={e => {
                      const nextType = e.target.value as PromotionDiscountType;
                      setDiscountType(nextType);
                      if (nextType === 'percentage') {
                        setDiscountValue(15);
                      } else if (selectedModalProduct) {
                        setDiscountValue(Math.round(selectedModalProduct.priceCOP * 0.85));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    <option value="percentage">Descuento Porcentual (%)</option>
                    <option value="fixed_price">Precio Promocional Fijo (COP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {discountType === 'percentage'
                      ? 'Porcentaje de Descuento (1% a 99%) *'
                      : 'Nuevo Precio Promocional (COP) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={discountType === 'percentage' ? 99 : undefined}
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Live Price Preview Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Simulación de Precio Público:
                  </span>
                  <span className="text-slate-500 line-through mr-2">
                    Normal: {formatCOP(previewNormalPrice)}
                  </span>
                  <strong className="text-red-600 text-sm font-mono">
                    Oferta: {formatCOP(previewPromoPrice)}
                  </strong>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                  Ahorro: {formatCOP(previewSavings)}
                </span>
              </div>

              {/* Start and End Date/Time in America/Bogota */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha y Hora de Inicio (Colombia) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startLocal}
                    onChange={e => setStartLocal(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha y Hora de Finalización (Colombia) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endLocal}
                    onChange={e => setEndLocal(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas o Condiciones de la Oferta (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ej. Válido hasta agotar existencias o finalizar cuenta regresiva."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : editingPromo ? 'Guardar Cambios' : 'Programar Promoción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECCIÓN 12: GENERADOR DE CÓDIGOS DE DESCUENTO (IPS10, NAVIDAD20, HALLOWEEN15, AMORYAMISTAD, MUJER2027) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-extrabold uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              SECCIÓN 12 · GENERADOR DE CÓDIGOS DE DESCUENTO Y CUPONES
            </span>
            <h2 className="text-lg font-extrabold text-slate-900">
              Generador de Códigos de Descuento (IPS10, NAVIDAD20, HALLOWEEN15, AMORYAMISTAD, MUJER2027)
            </h2>
            <p className="text-xs text-slate-500">
              Crea códigos manuales o aleatorios por porcentaje o valor fijo en COP, con control de usos máximos, compra mínima e historial de redención en el checkout.
            </p>
          </div>
        </div>

        {canEdit && (
          <form
            onSubmit={handleCreateDiscountCode}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs"
          >
            <div>
              <label className="block font-bold text-slate-700 mb-1">Código Cupón *</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newCodeForm.code}
                  onChange={e =>
                    setNewCodeForm({ ...newCodeForm, code: e.target.value.toUpperCase() })
                  }
                  placeholder="Ej: IPS10"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold uppercase bg-white"
                />
                <button
                  type="button"
                  onClick={generateRandomCouponCode}
                  className="px-2.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-[11px] shrink-0"
                  title="Generar código aleatorio"
                >
                  Auto
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipo Descuento</label>
              <select
                value={newCodeForm.discountType}
                onChange={e =>
                  setNewCodeForm({
                    ...newCodeForm,
                    discountType: e.target.value as 'percentage' | 'fixed_cop'
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold"
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed_cop">Valor fijo ($ COP)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Valor ({newCodeForm.discountType === 'percentage' ? '%' : 'COP'})
              </label>
              <input
                type="number"
                min={1}
                value={newCodeForm.discountValue}
                onChange={e =>
                  setNewCodeForm({ ...newCodeForm, discountValue: Number(e.target.value) || 10 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Compra Mínima ($ COP)</label>
              <input
                type="number"
                min={0}
                step={10000}
                value={newCodeForm.minPurchaseCOP}
                onChange={e =>
                  setNewCodeForm({ ...newCodeForm, minPurchaseCOP: Number(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Usos Máximos / Vence</label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="number"
                  min={1}
                  value={newCodeForm.maxUses}
                  onChange={e =>
                    setNewCodeForm({ ...newCodeForm, maxUses: Number(e.target.value) || 50 })
                  }
                  className="w-full px-2 py-2 border border-slate-300 rounded-xl bg-white"
                  title="Límite de usos"
                />
                <input
                  type="date"
                  value={newCodeForm.expirationDate}
                  onChange={e => setNewCodeForm({ ...newCodeForm, expirationDate: e.target.value })}
                  className="w-full px-2 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Crear Código
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[11px]">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Beneficio</th>
                <th className="p-3">Compra Mínima</th>
                <th className="p-3">Usos / Límite</th>
                <th className="p-3">Vencimiento</th>
                <th className="p-3">Estado</th>
                {canEdit && <th className="p-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {discountCodes.map(dc => (
                <tr key={dc.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-amber-300 font-mono font-extrabold text-xs">
                      {dc.code}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1">{dc.description}</div>
                  </td>
                  <td className="p-3 font-extrabold text-emerald-700">
                    {dc.discountType === 'percentage'
                      ? `${dc.discountValue}% Dto.`
                      : `${formatCOP(dc.discountValue)} Dto.`}
                  </td>
                  <td className="p-3 text-slate-700 font-semibold">
                    {formatCOP(dc.minPurchaseCOP)}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900">{dc.usedCount}</span> / {dc.maxUses}
                  </td>
                  <td className="p-3 text-slate-600">
                    {new Date(dc.expirationDate).toLocaleDateString('es-CO')}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        dc.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {dc.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        onClick={() => handleToggleDiscountCode(dc)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
                      >
                        {dc.isActive ? 'Pausar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => handleDeleteDiscountCode(dc)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                        title="Eliminar código"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
