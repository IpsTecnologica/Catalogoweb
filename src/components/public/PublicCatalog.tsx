import React, { useState, useEffect } from 'react';
import {
  Product,
  CompanyProfile,
  AppReleaseConfig,
  PromoBannerItem,
  SeasonalTemplate,
  PolicyDocument,
  ProductCondition,
  CustomerPushEvent
} from '../../types';
import {
  formatCOP,
  createWhatsAppLink,
  getRemainingCountdown,
  formatBogotaDateTime,
  getPublicCatalogUrl
} from '../../utils/formatters';
import { generateCatalogPDF, verifyAndPreloadCatalogImages } from '../../utils/pdfGenerator';
import { ShareCatalogModal } from '../common/ShareCatalogModal';
import { InstallAppSection } from '../pwa/InstallAppSection';
import { CustomerPushSubscriptionModal } from '../notifications/CustomerPushSubscriptionModal';
import {
  getLocalPushPrefs,
  checkAndDeliverPendingPushEvents,
  trackCustomerOrderForPush,
  LocalPushSubscriptionPrefs
} from '../../services/pushNotifications';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';
import {
  Search,
  MessageCircle,
  Download,
  Share2,
  ShieldCheck,
  Truck,
  Headphones,
  Image as ImageIcon,
  Tag,
  Timer,
  Eye,
  X,
  AlertCircle,
  Smartphone,
  Sparkles,
  FileText,
  MapPin,
  Ticket,
  CheckCircle2,
  ShoppingBag,
  Cpu,
  RefreshCw,
  ArrowRight,
  BellRing
} from 'lucide-react';

interface PublicCatalogProps {
  products: Product[];
  company: CompanyProfile;
  categories: string[];
  appConfig?: AppReleaseConfig | null;
  onRequestClientLogin?: () => void;
}

export const PublicCatalog: React.FC<PublicCatalogProps> = ({
  products,
  company,
  categories,
  appConfig = null,
  onRequestClientLogin
}) => {
  const { user, notify } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedCondition, setSelectedCondition] = useState<'Todas' | ProductCondition>('Todas');
  const [onlyPromotions, setOnlyPromotions] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [productToShare, setProductToShare] = useState<Product | null>(null);
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [deepLinkNotice, setDeepLinkNotice] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // New enterprise modules state: 3-Slot Promo Banners, Active Seasonal Template, Policies, and Quick Order / Coupon Modal
  const [promoBanners, setPromoBanners] = useState<PromoBannerItem[]>([]);
  const [activeWebTemplate, setActiveWebTemplate] = useState<SeasonalTemplate | null>(null);
  const [policies, setPolicies] = useState<PolicyDocument[]>([]);
  const [policiesModalOpen, setPoliciesModalOpen] = useState(false);
  const [activePolicyDocId, setActivePolicyDocId] = useState<string>('pol-new');

  // Quick Order / Discount Code Modal
  const [orderProductModal, setOrderProductModal] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderAddress, setOrderAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountCOP: number;
    finalTotalCOP: number;
    description: string;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [acceptedLey1480Policy, setAcceptedLey1480Policy] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Service Worker Push Notification state (Offers & Order Status when catalog is published)
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [pushPrefs, setPushPrefs] = useState<LocalPushSubscriptionPrefs>(getLocalPushPrefs());
  const [livePushAlert, setLivePushAlert] = useState<CustomerPushEvent | null>(null);

  // Live 1-second tick for promotion countdowns
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load 3 Promo Banners, Seasonal Templates, and Ley 1480 Policies
  useEffect(() => {
    api
      .getPromoBanners()
      .then(list => setPromoBanners((list || []).filter(b => b.isActive).sort((a, b) => a.order - b.order)))
      .catch(() => {});
    api
      .getTemplates()
      .then(res => {
        if (res.activeWebTemplate) setActiveWebTemplate(res.activeWebTemplate);
      })
      .catch(() => {});
    api
      .getPolicies()
      .then(list => setPolicies(list || []))
      .catch(() => {});
  }, []);

  // Only display active products on public portal
  const activeProducts = products.filter(p => p.isActive);
  const isCatalogPublished = activeProducts.length > 0;
  const activePromoCount = activeProducts.filter(
    p => p.activePromotion && !getRemainingCountdown(p.activePromotion.endAt).expired
  ).length;

  // Poll and synchronize Service Worker Push Notifications when the catalog is published
  useEffect(() => {
    if (!isCatalogPublished) return;

    const runPushCheck = () => {
      checkAndDeliverPendingPushEvents({
        userEmail: user?.email,
        onInAppToast: ev => {
          setLivePushAlert(ev);
          notify(`${ev.title}: ${ev.body}`, 'info');
        }
      });
    };

    runPushCheck();
    const interval = setInterval(runPushCheck, 8000);

    const handleSwMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'PUSH_NOTIFICATION_CLICKED' && msg.data) {
        const d = msg.data;
        if (d.relatedProductRef) {
          const prod = activeProducts.find(
            p => p.reference.toLowerCase() === String(d.relatedProductRef).toLowerCase()
          );
          if (prod) {
            setSelectedProductModal(prod);
            setSelectedImageIdx(0);
          }
        } else if (d.relatedCategory) {
          setSelectedCategory(d.relatedCategory);
        } else if (d.type === 'NEW_OFFER' || d.type === 'PROMO_ACTIVATED' || d.type === 'DISCOUNT_CODE') {
          setOnlyPromotions(true);
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      clearInterval(interval);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [isCatalogPublished, user?.email, activeProducts.length]);

  // Support deep linking to an individual published product (?product=REF) or category (?category=NAME)
  useEffect(() => {
    if (products.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const productParam = params.get('product');
    const categoryParam = params.get('category');

    if (categoryParam) {
      const normalizedCat = categoryParam.trim().toLowerCase();
      const matchedCat = categories.find(c => c.toLowerCase() === normalizedCat);
      if (matchedCat) {
        setSelectedCategory(matchedCat);
      }
    }

    if (productParam) {
      const normalized = productParam.trim().toLowerCase();
      const matched = activeProducts.find(
        p => p.reference.toLowerCase() === normalized || p.id.toLowerCase() === normalized
      );
      if (matched) {
        setSelectedProductModal(matched);
        setSelectedImageIdx(0);
        setDeepLinkNotice(null);
      } else {
        setDeepLinkNotice(
          `El producto solicitado (${productParam}) no se encuentra publicado actualmente en el catálogo.`
        );
      }
    }
  }, [products]);

  // Dynamically keep Open Graph & document title in sync with selected product or category
  useEffect(() => {
    const updateMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    if (selectedProductModal) {
      const p = selectedProductModal;
      const effectivePrice = p.activePromotion ? p.activePromotion.promotionalPriceCOP : p.priceCOP;
      const title = `${p.name} (${p.reference}) — ${company.name}`;
      const desc = `${p.shortDescription} · Precio: ${formatCOP(effectivePrice)}`;
      document.title = title;
      updateMeta('og:title', title);
      updateMeta('og:description', desc);
      updateMeta('og:url', getPublicCatalogUrl(p.reference));
    } else if (selectedCategory !== 'Todas') {
      const title = `Catálogo ${selectedCategory} — ${company.name}`;
      const desc = `Explora equipos de ${selectedCategory} en el catálogo oficial de ${company.name}.`;
      document.title = title;
      updateMeta('og:title', title);
      updateMeta('og:description', desc);
      updateMeta('og:url', getPublicCatalogUrl(undefined, selectedCategory));
    } else {
      const title = `${company.name} — Catálogo Oficial de Productos Tecnológicos`;
      document.title = title;
      updateMeta('og:title', title);
      updateMeta('og:description', company.description || company.slogan);
      updateMeta('og:url', getPublicCatalogUrl());
    }
  }, [selectedProductModal, selectedCategory, company]);

  const filtered = activeProducts.filter(p => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.reference.toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.model || '').toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);

    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    const pCondition: ProductCondition = p.condition || 'Nuevo';
    const matchesCondition = selectedCondition === 'Todas' || pCondition === selectedCondition;
    const hasValidPromo = p.activePromotion && !getRemainingCountdown(p.activePromotion.endAt).expired;
    const matchesPromo = !onlyPromotions || hasValidPromo;

    return matchesSearch && matchesCategory && matchesCondition && matchesPromo;
  });

  const handleDownloadPublicPDF = async () => {
    if (!user) {
      notify('Por favor inicia sesión o regístrate gratuitamente como cliente para descargar tu catálogo en PDF.', 'info');
      if (onRequestClientLogin) onRequestClientLogin();
      return;
    }
    setDownloadingPDF(true);
    try {
      const listToExport = selectedCategory !== 'Todas' ? filtered : activeProducts;
      const preloaded = await verifyAndPreloadCatalogImages(listToExport, company);
      const doc = await generateCatalogPDF(
        listToExport,
        company,
        {
          title:
            selectedCategory !== 'Todas'
              ? `CATÁLOGO ${selectedCategory.toUpperCase()}`
              : activeWebTemplate?.bannerTitle?.toUpperCase() || 'CATÁLOGO OFICIAL DE PRODUCTOS',
          subtitle: activeWebTemplate?.bannerSubtitle || 'Portafolio de Soluciones y Equipamiento Tecnológico',
          includeCover: true,
          template: 'corporativo',
          seasonalTemplate: activeWebTemplate || undefined,
          marginMm: 10,
          onlyActive: true,
          includePrice: true,
          includeReference: true,
          includeDescription: true,
          includeTermsFooter: true
        },
        preloaded
      );
      doc.save(`CATALOGO_${company.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadPolicyPDF = (policy: PolicyDocument) => {
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, 216, 26, 'F');
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 26, 216, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('IPS TECNOLÓGICA — POLÍTICA OFICIAL DE GARANTÍAS Y ENVÍOS', 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${policy.legalFramework} | Actualizado: ${new Date(policy.updatedAt).toLocaleDateString('es-CO')}`, 14, 19);

    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const titleLines = doc.splitTextToSize(policy.title, 188);
    doc.text(titleLines, 14, 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const bodyText =
      policy.content ||
      [
        policy.summary,
        '',
        'COBERTURA:',
        ...(policy.coverageDetails || []).map(c => `• ${c}`),
        '',
        'EXCLUSIONES:',
        ...(policy.exclusions || []).map(e => `• ${e}`),
        '',
        'PROCEDIMIENTO DE RECLAMACIÓN:',
        ...(policy.claimProcedure || []).map((p, idx) => `${idx + 1}. ${p}`)
      ].join('\n');
    const contentLines = doc.splitTextToSize(bodyText, 188);
    doc.text(contentLines, 14, 50);

    doc.save(`POLITICA_${policy.category.replace(/\s+/g, '_').toUpperCase()}_IPS_TECNOLOGICA.pdf`);
  };

  const handlePromoBannerClick = (banner: PromoBannerItem) => {
    if (banner.linkType === 'product' && banner.linkTarget) {
      const matched = activeProducts.find(
        p =>
          p.reference.toLowerCase() === banner.linkTarget.toLowerCase() ||
          p.id.toLowerCase() === banner.linkTarget.toLowerCase()
      );
      if (matched) {
        setSelectedProductModal(matched);
        setSelectedImageIdx(0);
        return;
      }
    }
    if (banner.linkType === 'category' && banner.linkTarget) {
      const matchedCat = categories.find(c => c.toLowerCase() === banner.linkTarget.toLowerCase());
      if (matchedCat) {
        setSelectedCategory(matchedCat);
        const gridEl = document.getElementById('catalogo-productos-grid');
        if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    const gridEl = document.getElementById('catalogo-productos-grid');
    if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenQuickOrder = (product: Product) => {
    setOrderProductModal(product);
    setOrderQuantity(1);
    setCouponCodeInput('');
    setAppliedCoupon(null);
    setAcceptedLey1480Policy(false);
  };

  const handleValidateCoupon = async () => {
    if (!orderProductModal || !couponCodeInput.trim()) return;
    setValidatingCoupon(true);
    try {
      const unitPrice = orderProductModal.activePromotion
        ? orderProductModal.activePromotion.promotionalPriceCOP
        : orderProductModal.priceCOP;
      const subtotal = unitPrice * orderQuantity;
      const res = await api.validateDiscountCode(couponCodeInput.trim().toUpperCase(), subtotal);
      if (res.valid) {
        const codeStr = res.discountCode?.code || couponCodeInput.trim().toUpperCase();
        setAppliedCoupon({
          code: codeStr,
          discountCOP: res.discountAmountCOP,
          finalTotalCOP: res.finalSubtotalCOP,
          description: res.discountCode?.description || res.message
        });
        notify(`Cupón ${codeStr} aplicado: Ahorras ${formatCOP(res.discountAmountCOP)}`, 'success');
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      notify(err.message || 'Cupón no válido o vencido.', 'error');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleConfirmQuickOrder = async () => {
    if (!orderProductModal) return;
    if (!acceptedLey1480Policy) {
      notify('Debes aceptar la Política de Garantías y Envíos (Ley 1480 de 2011) para continuar.', 'error');
      return;
    }

    const unitPrice = orderProductModal.activePromotion
      ? orderProductModal.activePromotion.promotionalPriceCOP
      : orderProductModal.priceCOP;
    const subtotal = unitPrice * orderQuantity;
    const discountCOP = appliedCoupon ? appliedCoupon.discountCOP : 0;
    const finalTotalCOP = Math.max(0, subtotal - discountCOP);

    if (user) {
      setSubmittingOrder(true);
      try {
        const created = await api.createOrder({
          items: [
            {
              productId: orderProductModal.id,
              reference: orderProductModal.reference,
              name: orderProductModal.name,
              quantity: orderQuantity,
              unitPriceCOP: unitPrice,
              subtotalCOP: subtotal
            }
          ],
          shippingAddress: orderAddress || 'Cali / Valle del Cauca (Por confirmar)',
          notes: orderNotes,
          discountCode: appliedCoupon?.code,
          acceptedPolicyVersion: 'Ley-1480-2026',
          acceptedPolicyAt: new Date().toISOString()
        });
        const createdOrder = created.order || (created as any);
        const updatedPrefs = await trackCustomerOrderForPush(
          createdOrder.id,
          user.email,
          user.name,
          user.phone
        );
        setPushPrefs(updatedPrefs);
        notify(`Pedido ${createdOrder.id} creado exitosamente por ${formatCOP(createdOrder.totalCOP)}.`, 'success');
        setOrderProductModal(null);
      } catch (err: any) {
        notify(err.message || 'Error al registrar el pedido.', 'error');
      } finally {
        setSubmittingOrder(false);
      }
    } else {
      // Guest user: Open pre-filled free wa.me link with coupon and Ley 1480 confirmation
      const cleanPhone = company.whatsapp.replace(/[^0-9]/g, '');
      const text = [
        `Hola *${company.name}*, deseo realizar el siguiente pedido:`,
        `• Producto: *${orderProductModal.name}* (Ref: ${orderProductModal.reference})`,
        `• Condición: ${orderProductModal.condition || 'Nuevo'} | Garantía: ${orderProductModal.warrantyMonths || 12} meses`,
        `• Cantidad: ${orderQuantity}`,
        `• Subtotal: ${formatCOP(subtotal)}`,
        appliedCoupon ? `• Cupón aplicado (${appliedCoupon.code}): -${formatCOP(discountCOP)}` : null,
        `• *Total a pagar: ${formatCOP(finalTotalCOP)}*`,
        orderAddress ? `• Dirección de envío: ${orderAddress}` : null,
        orderNotes ? `• Notas: ${orderNotes}` : null,
        `✓ Acepto la Política de Garantías y Envíos (Ley 1480 de 2011).`
      ]
        .filter(Boolean)
        .join('\n');

      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      setOrderProductModal(null);
    }
  };

  const scrollToInstallApp = () => {
    const el = document.getElementById('descarga-nuestra-app');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getConditionBadge = (product: Product) => {
    const cond = product.condition || 'Nuevo';
    if (cond === 'Remanufacturado') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold">
          <RefreshCw className="w-2.5 h-2.5" />
          Remanufacturado {product.remanufacturedDetails?.aestheticGrade ? `(${product.remanufacturedDetails.aestheticGrade})` : ''}
        </span>
      );
    }
    if (cond === 'Repuesto') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-extrabold">
          <Cpu className="w-2.5 h-2.5" />
          Repuesto / Componente
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
        Nuevo
      </span>
    );
  };

  const heroPrimaryColor = activeWebTemplate?.primaryColor || company.colors?.primary || '#DC2626';
  const heroSecondaryColor = activeWebTemplate?.secondaryColor || company.colors?.secondary || '#111827';
  const mapsFreeUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${company.name} ${company.address} ${company.city}`
  )}`;

  return (
    <div className="space-y-8">
      {deepLinkNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{deepLinkNotice}</span>
          </div>
          <button
            onClick={() => setDeepLinkNotice(null)}
            className="text-amber-700 hover:text-amber-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Hero Corporate Presentation + Active Seasonal Template Styling */}
      <section
        style={{ backgroundColor: heroSecondaryColor }}
        className="text-white rounded-2xl p-6 sm:p-10 relative overflow-hidden border border-slate-800 shadow-xl"
      >
        {activeWebTemplate?.backgroundImageUrl && (
          <img
            src={activeWebTemplate.backgroundImageUrl}
            alt={activeWebTemplate.name}
            className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
          />
        )}
        <div
          style={{ background: `linear-gradient(90deg, ${heroPrimaryColor}, ${activeWebTemplate?.accentColor || '#EF4444'})` }}
          className="absolute top-0 left-0 right-0 h-2"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                style={{ backgroundColor: heroPrimaryColor }}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider text-white uppercase flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3" />
                <span>{activeWebTemplate?.badgeText || 'CATÁLOGO OFICIAL EN LÍNEA'}</span>
              </span>
              {activeWebTemplate && activeWebTemplate.seasonKey !== 'corporativa_ips' && (
                <span className="text-[11px] font-semibold text-amber-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                  Temporada activa: {activeWebTemplate.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {company.logoUrl && (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white p-1.5 object-contain shrink-0 border border-slate-700"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {activeWebTemplate?.bannerTitle || company.name || 'IPS TECNOLÓGICA'}
                </h1>
                <p className="text-sm sm:text-base text-red-300 font-medium mt-0.5">
                  {activeWebTemplate?.bannerSubtitle || company.slogan}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 mt-4 leading-relaxed max-w-2xl">
              {company.description}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 mt-6">
              <button
                onClick={handleDownloadPublicPDF}
                disabled={downloadingPDF}
                style={{ backgroundColor: heroPrimaryColor }}
                className="px-5 py-2.5 text-xs font-bold text-white hover:opacity-95 rounded-lg transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {downloadingPDF
                    ? 'Generando PDF Proporcional...'
                    : selectedCategory !== 'Todas'
                    ? `Descargar PDF (${selectedCategory})`
                    : 'Descargar Catálogo Completo en PDF'}
                </span>
              </button>

              <button
                onClick={() => {
                  setProductToShare(null);
                  setShareModalOpen(true);
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-100 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5 border border-white/15 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-red-400" />
                <span>COMPARTIR CATÁLOGO</span>
              </button>

              <button
                type="button"
                onClick={() => setPoliciesModalOpen(true)}
                className="px-4 py-2.5 text-xs font-bold text-emerald-300 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5 border border-emerald-400/30 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>GARANTÍAS Y ENVÍOS (LEY 1480)</span>
              </button>

              <button
                type="button"
                onClick={scrollToInstallApp}
                className="px-4 py-2.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5 border border-red-500/40 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-red-400" />
                <span>INSTALAR APP</span>
              </button>

              {isCatalogPublished && (
                <button
                  type="button"
                  onClick={() => setPushModalOpen(true)}
                  className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 border cursor-pointer ${
                    pushPrefs.enabled
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/50'
                      : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-400/50'
                  }`}
                >
                  <BellRing className="w-4 h-4 text-amber-300" />
                  <span>
                    {pushPrefs.enabled
                      ? 'NOTIFICACIONES PUSH ACTIVAS'
                      : 'ACTIVAR NOTIFICACIONES DE OFERTAS Y PEDIDOS'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {activePromoCount > 0 && (
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-4 sm:p-5 max-w-xs shrink-0">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
                <Tag className="w-4 h-4" />
                <span>Ofertas Especiales Activas</span>
              </div>
              <p className="text-2xl font-black text-white font-mono">
                {activePromoCount} {activePromoCount === 1 ? 'Equipo en Oferta' : 'Equipos en Oferta'}
              </p>
              <p className="text-[11px] text-slate-200 mt-1">
                Usa códigos como <code className="text-amber-300 font-bold">IPS10</code> o{' '}
                <code className="text-amber-300 font-bold">NAVIDAD20</code> al cotizar o pedir.
              </p>
              <button
                onClick={() => setOnlyPromotions(!onlyPromotions)}
                style={{ backgroundColor: heroPrimaryColor }}
                className="mt-3 w-full py-2 px-3 text-xs font-bold rounded-lg text-white hover:opacity-95 transition-opacity cursor-pointer"
              >
                {onlyPromotions ? 'Ver Todos los Productos' : 'Ver Solo Promociones'}
              </button>
            </div>
          )}
        </div>

        {/* 3 Value Pillars */}
        <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-200">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <strong className="text-white block font-semibold">Garantía Legal Ley 1480 de 2011</strong>
              <span className="text-[11px] text-slate-300">Nuevos, Repuestos y Remanufacturados certificados</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <strong className="text-white block font-semibold">Envíos Cali, Valle y Toda Colombia</strong>
              <span className="text-[11px] text-slate-300">Seguimiento con Número de Guía en línea</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Headphones className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <strong className="text-white block font-semibold">Asesoría y Laboratorio Técnico</strong>
              <span className="text-[11px] text-slate-300">Atención directa por WhatsApp wa.me sin costo</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Service Worker Push Alert Toast Banner when triggered */}
      {livePushAlert && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 border border-red-500/50 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-red-600/30 text-red-300">
                  Notificación Push · Service Worker
                </span>
                {livePushAlert.targetOrderId && (
                  <span className="text-[11px] font-mono font-bold text-emerald-300">
                    {livePushAlert.targetOrderId}
                  </span>
                )}
              </div>
              <p className="text-xs font-extrabold text-white mt-0.5">{livePushAlert.title}</p>
              <p className="text-xs text-slate-300">{livePushAlert.body}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (livePushAlert.relatedProductRef) {
                  const found = activeProducts.find(
                    p => p.reference.toLowerCase() === livePushAlert.relatedProductRef!.toLowerCase()
                  );
                  if (found) {
                    setSelectedProductModal(found);
                    setSelectedImageIdx(0);
                  }
                } else if (livePushAlert.relatedCategory) {
                  setSelectedCategory(livePushAlert.relatedCategory);
                } else {
                  setOnlyPromotions(true);
                }
                setLivePushAlert(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
            >
              Ver Ahora
            </button>
            <button
              type="button"
              onClick={() => setLivePushAlert(null)}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1.5. Carrusel Promocional de 6 Espacios (Sección 10) */}
      {promoBanners.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-600" />
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                PROMOCIONES Y DESTACADOS DE TEMPORADA ({promoBanners.length} Espacios)
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Haz clic en cualquier promoción para ver el producto o categoría
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promoBanners.slice(0, 6).map(banner => (
              <div
                key={banner.id}
                onClick={() => handlePromoBannerClick(banner)}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-red-400 overflow-hidden shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="relative h-44 bg-slate-900 overflow-hidden">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {banner.badgeText && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                      {banner.badgeText}
                    </span>
                  )}
                  {banner.discountPercent ? (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-sm">
                      -{banner.discountPercent}% DTO
                    </span>
                  ) : null}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-red-600 transition-colors">
                      {banner.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {banner.description}
                    </p>
                    {(banner.originalPriceCOP || banner.promotionalPriceCOP) && (
                      <div className="mt-2 flex items-baseline gap-2">
                        {banner.originalPriceCOP && (
                          <span className="text-xs text-slate-400 line-through font-mono">
                            {formatCOP(banner.originalPriceCOP)}
                          </span>
                        )}
                        {banner.promotionalPriceCOP && (
                          <span className="text-sm font-black text-red-600 font-mono">
                            {formatCOP(banner.promotionalPriceCOP)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Vigente hasta {banner.endDate}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-red-600 group-hover:translate-x-0.5 transition-transform">
                      <span>{banner.ctaText || 'Ver Oferta'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Search, Condition & Category Filters */}
      <section id="catalogo-productos-grid" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, referencia, marca, modelo o categoría..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-2xs"
            />
          </div>

          {/* Condition filter pills (Nuevo / Repuesto / Remanufacturado) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['Todas', 'Nuevo', 'Repuesto', 'Remanufacturado'] as const).map(cond => (
              <button
                key={cond}
                type="button"
                onClick={() => setSelectedCondition(cond)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedCondition === cond
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cond === 'Todas' ? 'Todas las Condiciones' : cond}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Mostrando {filtered.length} de {activeProducts.length} productos
            </span>
            {selectedCategory !== 'Todas' && (
              <button
                type="button"
                onClick={() => {
                  setProductToShare(null);
                  setShareModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Compartir «{selectedCategory}»</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Horizontal Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => {
              setSelectedCategory('Todas');
              setSelectedCondition('Todas');
              setOnlyPromotions(false);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'Todas' && !onlyPromotions
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Todas ({activeProducts.length})
          </button>
          {activePromoCount > 0 && (
            <button
              onClick={() => setOnlyPromotions(!onlyPromotions)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer ${
                onlyPromotions
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Ofertas Activas ({activePromoCount})</span>
            </button>
          )}
          {categories.map(c => {
            const count = activeProducts.filter(p => p.category === c).length;
            if (count === 0) return null;
            return (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === c
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {c} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Products Public Grid */}
      <section>
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No hay productos que coincidan con la búsqueda.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('Todas');
                setSelectedCondition('Todas');
                setOnlyPromotions(false);
              }}
              className="mt-3 text-xs font-bold text-red-600 hover:underline"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(product => {
              const hasImg = product.images && product.images.length > 0;
              const promo = product.activePromotion;
              const countdown = promo ? getRemainingCountdown(promo.endAt) : null;
              const isPromoValid = !!(promo && countdown && !countdown.expired);
              const effectivePrice = isPromoValid ? promo.promotionalPriceCOP : product.priceCOP;
              const waLink = createWhatsAppLink(company.whatsapp, product.name, product.reference, effectivePrice);

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-xl border overflow-hidden flex flex-col justify-between transition-all group ${
                    isPromoValid
                      ? 'border-red-300 ring-1 ring-red-500/15 hover:shadow-lg'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div>
                    {/* Uniform Image Area with object-contain centered */}
                    <div
                      onClick={() => {
                        setSelectedProductModal(product);
                        setSelectedImageIdx(0);
                      }}
                      className="relative w-full h-48 bg-white flex items-center justify-center overflow-hidden border-b border-slate-100 cursor-pointer"
                    >
                      {hasImg ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-slate-400">
                          <ImageIcon className="w-8 h-8 stroke-1 mb-1" />
                          <span className="text-[10px] font-mono">Imagen no disponible</span>
                        </div>
                      )}

                      {/* Reference tag */}
                      <span className="absolute top-2 left-2 bg-slate-900/90 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                        {product.reference}
                      </span>

                      {/* Share single product button */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setProductToShare(product);
                          setShareModalOpen(true);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 hover:bg-red-600 text-slate-700 hover:text-white border border-slate-200 shadow-xs transition-colors cursor-pointer"
                        title="Compartir enlace de este producto"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Promo discount badge */}
                      {isPromoValid && (
                        <div className="absolute bottom-2 left-2 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                          <Tag className="w-3 h-3" />
                          <span>-{promo.savingsPercentage}% OFERTA</span>
                        </div>
                      )}

                      {/* Shipping badge if Gratis */}
                      {product.shippingType === 'Gratis' && (
                        <div className="absolute bottom-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                          <Truck className="w-3 h-3" />
                          <span>Envío Gratis</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      {/* Condition & Category row */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                        {getConditionBadge(product)}
                        <span className="text-[10px] text-slate-500 font-medium">
                          Garantía: {product.warrantyMonths || 12}m
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mb-1 text-[11px]">
                        <span className="font-semibold text-red-600 uppercase tracking-wide truncate">
                          {product.category}
                        </span>
                        <span className="text-slate-500 font-normal shrink-0">
                          {product.brand ? `${product.brand} · ` : ''}Disponible
                        </span>
                      </div>

                      {/* Name */}
                      <h3
                        onClick={() => {
                          setSelectedProductModal(product);
                          setSelectedImageIdx(0);
                        }}
                        className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mb-1.5 hover:text-red-600 cursor-pointer transition-colors"
                      >
                        {product.name}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {product.shortDescription}
                      </p>

                      {/* Remanufactured summary if applicable */}
                      {product.condition === 'Remanufacturado' && product.remanufacturedDetails && (
                        <div className="mt-2 p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-[10px] text-amber-900">
                          <strong>Revisado:</strong> {product.remanufacturedDetails.inspectedComponents}
                        </div>
                      )}

                      {/* Countdown Timer if active promo */}
                      {isPromoValid && countdown && (
                        <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between text-[11px]">
                          <span className="text-red-700 font-semibold flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>Termina en:</span>
                          </span>
                          <span className="font-mono font-extrabold text-red-700">
                            {countdown.formatted}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price & Actions */}
                  <div className="p-4 pt-0">
                    <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between mb-3">
                      <div>
                        {isPromoValid ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400 line-through font-mono">
                                {formatCOP(product.priceCOP)}
                              </span>
                              <span className="text-[11px] font-medium text-emerald-700">
                                Ahorras {formatCOP(promo.savingsCOP)}
                              </span>
                            </div>
                            <span className="text-base font-extrabold text-red-600 font-mono tabular-nums block">
                              {formatCOP(promo.promotionalPriceCOP)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                              {company.taxConfig?.ivaEnabled && company.taxConfig?.showIvaLabelInCatalog
                                ? company.taxConfig.priceLabelText || 'Precio Oficial'
                                : company.taxConfig?.priceLabelText || 'Precio Oficial COP'}
                            </span>
                            <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                              {formatCOP(product.priceCOP)}
                            </span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenQuickOrder(product)}
                        className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Aplicar código de descuento y pedir"
                      >
                        <Ticket className="w-3 h-3" />
                        <span>Usar Cupón</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="col-span-4 py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Consultar WhatsApp</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductModal(product);
                          setSelectedImageIdx(0);
                        }}
                        className="col-span-1 py-2 px-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                        title="Ver ficha completa"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Public Section: DESCARGA NUESTRA APP (PWA + Verified Android APK + QR + Guide) */}
      <InstallAppSection company={company} appConfig={appConfig} />

      {/* Product Detail Modal */}
      {selectedProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-red-600 px-2 py-0.5 rounded">
                  {selectedProductModal.reference}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {selectedProductModal.category} · Disponible
                </span>
              </div>
              <button
                onClick={() => setSelectedProductModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Image Gallery */}
              <div>
                <div className="w-full h-64 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-4 overflow-hidden">
                  {selectedProductModal.images && selectedProductModal.images.length > 0 ? (
                    <img
                      src={selectedProductModal.images[selectedImageIdx] || selectedProductModal.images[0]}
                      alt={selectedProductModal.name}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-slate-300" />
                  )}
                </div>
                {selectedProductModal.images && selectedProductModal.images.length > 1 && (
                  <div className="flex items-center gap-2 mt-3 overflow-x-auto">
                    {selectedProductModal.images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImageIdx(idx)}
                        className={`w-14 h-14 rounded-lg border overflow-hidden p-1 shrink-0 bg-white ${
                          selectedImageIdx === idx ? 'border-red-600 ring-2 ring-red-500/20' : 'border-slate-200'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Details & Pricing */}
              <div className="flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                    {getConditionBadge(selectedProductModal)}
                    <span>
                      Garantía: <strong>{selectedProductModal.warrantyMonths || 12} meses</strong>
                    </span>
                  </div>

                  {selectedProductModal.brand && (
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                      Marca: {selectedProductModal.brand}{' '}
                      {selectedProductModal.model ? `· Modelo: ${selectedProductModal.model}` : ''}
                    </span>
                  )}

                  <h2 className="text-lg font-extrabold text-slate-900 leading-snug mt-1">
                    {selectedProductModal.name}
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">
                    {selectedProductModal.shortDescription}
                  </p>

                  {selectedProductModal.condition === 'Remanufacturado' &&
                    selectedProductModal.remanufacturedDetails && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                        <div className="font-bold">
                          Certificación Remanufacturado ({selectedProductModal.remanufacturedDetails.aestheticGrade})
                        </div>
                        <p className="text-[11px]">
                          <strong>Componentes revisados:</strong>{' '}
                          {selectedProductModal.remanufacturedDetails.inspectedComponents}
                        </p>
                      </div>
                    )}

                  {(() => {
                    const promo = selectedProductModal.activePromotion;
                    const countdown = promo ? getRemainingCountdown(promo.endAt) : null;
                    const isPromoValid = !!(promo && countdown && !countdown.expired);

                    if (isPromoValid && promo && countdown) {
                      return (
                        <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-red-700 flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5" />
                              {promo.name} (-{promo.savingsPercentage}%)
                            </span>
                            <span className="text-xs font-mono font-extrabold text-red-700">
                              {countdown.formatted}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 pt-1">
                            <span className="text-sm text-slate-400 line-through font-mono">
                              {formatCOP(selectedProductModal.priceCOP)}
                            </span>
                            <span className="text-xl font-black text-red-600 font-mono">
                              {formatCOP(promo.promotionalPriceCOP)}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700 font-semibold">
                            Ahorro inmediato: {formatCOP(promo.savingsCOP)} · Válido hasta{' '}
                            {formatBogotaDateTime(promo.endAt)}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                          {company.taxConfig?.ivaEnabled && company.taxConfig?.showIvaLabelInCatalog
                            ? `${company.taxConfig.priceLabelText || 'Precio Oficial'} · Envío: ${selectedProductModal.shippingType || 'Nacional'}`
                            : `${company.taxConfig?.priceLabelText || 'Precio Oficial COP'} · Envío: ${selectedProductModal.shippingType || 'Nacional'}`}
                        </span>
                        <span className="text-xl font-black text-slate-900 font-mono">
                          {formatCOP(selectedProductModal.priceCOP)}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      const prod = selectedProductModal;
                      setSelectedProductModal(null);
                      handleOpenQuickOrder(prod);
                    }}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Pedir / Aplicar Código de Descuento (IPS10)</span>
                  </button>

                  <a
                    href={createWhatsAppLink(
                      company.whatsapp,
                      selectedProductModal.name,
                      selectedProductModal.reference,
                      selectedProductModal.activePromotion
                        ? selectedProductModal.activePromotion.promotionalPriceCOP
                        : selectedProductModal.priceCOP
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Solicitar Cotización Directa por WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setProductToShare(selectedProductModal);
                      setShareModalOpen(true);
                    }}
                    className="w-full py-2 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-red-600" />
                    <span>Compartir Enlace de este Producto</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Order & Coupon Validation Modal (Section 12 & Section 15) */}
      {orderProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold">Pedido Rápido y Cupón de Descuento</h3>
              </div>
              <button
                onClick={() => setOrderProductModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-[10px] font-bold text-red-600 block">
                    {orderProductModal.reference} · {orderProductModal.condition || 'Nuevo'}
                  </span>
                  <strong className="text-slate-900 text-sm">{orderProductModal.name}</strong>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block">Precio Unitario</span>
                  <strong className="text-sm font-mono text-slate-900">
                    {formatCOP(
                      orderProductModal.activePromotion
                        ? orderProductModal.activePromotion.promotionalPriceCOP
                        : orderProductModal.priceCOP
                    )}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, orderProductModal.stock || 50)}
                    value={orderQuantity}
                    onChange={e => {
                      setOrderQuantity(Math.max(1, Number(e.target.value)));
                      setAppliedCoupon(null);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ciudad / Dirección de Entrega</label>
                  <input
                    type="text"
                    value={orderAddress}
                    onChange={e => setOrderAddress(e.target.value)}
                    placeholder="Ej: Cali, Valle del Cauca / Bogotá"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Coupon Input */}
              <div className="p-3.5 rounded-xl bg-red-50/50 border border-red-200 space-y-2">
                <label className="block font-bold text-slate-800">
                  ¿Tienes un Código de Descuento? (Ej: <code className="text-red-600">IPS10</code>,{' '}
                  <code className="text-red-600">NAVIDAD20</code>)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                    placeholder="Ingresa tu cupón..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase bg-white"
                  />
                  <button
                    type="button"
                    disabled={validatingCoupon || !couponCodeInput.trim()}
                    onClick={handleValidateCoupon}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg disabled:opacity-50 cursor-pointer"
                  >
                    {validatingCoupon ? 'Validando...' : 'Aplicar Cupón'}
                  </button>
                </div>
                {appliedCoupon && (
                  <div className="flex items-center justify-between text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                    <span className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Cupón {appliedCoupon.code}: -
                      {formatCOP(appliedCoupon.discountCOP)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAppliedCoupon(null)}
                      className="text-[11px] text-red-600 font-bold hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </div>

              {/* Summary */}
              {(() => {
                const unitPrice = orderProductModal.activePromotion
                  ? orderProductModal.activePromotion.promotionalPriceCOP
                  : orderProductModal.priceCOP;
                const subtotal = unitPrice * orderQuantity;
                const discount = appliedCoupon ? appliedCoupon.discountCOP : 0;
                const finalTotal = Math.max(0, subtotal - discount);
                return (
                  <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Subtotal ({orderQuantity} und.):</span>
                      <span className="font-mono">{formatCOP(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Descuento Cupón ({appliedCoupon?.code}):</span>
                        <span className="font-mono">-{formatCOP(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-700">
                      <span>
                        {company.taxConfig?.ivaEnabled && company.taxConfig?.showIvaLabelInCatalog
                          ? 'Total a Pagar:'
                          : 'Total a Pagar (No responsable de IVA):'}
                      </span>
                      <span className="font-mono text-amber-400">{formatCOP(finalTotal)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Mandatory Ley 1480 Policy Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedLey1480Policy}
                  onChange={e => setAcceptedLey1480Policy(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-[11px] text-slate-700 leading-relaxed">
                  He leído y acepto la{' '}
                  <button
                    type="button"
                    onClick={() => setPoliciesModalOpen(true)}
                    className="text-red-600 font-bold underline"
                  >
                    Política Oficial de Garantías y Envíos (Ley 1480 de 2011 — Estatuto del Consumidor)
                  </button>{' '}
                  de IPS TECNOLÓGICA.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderProductModal(null)}
                  className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={submittingOrder}
                  onClick={handleConfirmQuickOrder}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {user ? (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>{submittingOrder ? 'Registrando...' : 'Confirmar Pedido en Mi Cuenta'}</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      <span>Enviar Pedido con Descuento por WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Ley 1480 Policies Modal (Section 15) */}
      {policiesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-extrabold">
                    Políticas Oficiales de Garantías y Envíos — IPS TECNOLÓGICA
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Cumplimiento de la Ley 1480 de 2011 (Estatuto del Consumidor en Colombia)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPoliciesModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[78vh] overflow-y-auto">
              <div className="md:col-span-4 space-y-2">
                {policies.map(pol => (
                  <button
                    key={pol.id}
                    type="button"
                    onClick={() => setActivePolicyDocId(pol.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      activePolicyDocId === pol.id
                        ? 'bg-red-50 border-red-600 text-red-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[10px] uppercase text-slate-400 font-mono">{pol.category}</div>
                    <div className="mt-0.5 leading-snug">{pol.title}</div>
                  </button>
                ))}
              </div>

              <div className="md:col-span-8">
                {(() => {
                  const activePol = policies.find(p => p.id === activePolicyDocId) || policies[0];
                  if (!activePol) {
                    return <div className="text-xs text-slate-500">Cargando políticas oficiales...</div>;
                  }
                  return (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase text-red-600">
                            {activePol.legalFramework}
                          </span>
                          <h4 className="text-base font-extrabold text-slate-900">{activePol.title}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadPolicyPDF(activePol)}
                          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Descargar PDF</span>
                        </button>
                      </div>
                      <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                        {activePol.content ||
                          [
                            activePol.summary,
                            '',
                            'COBERTURA OFICIAL:',
                            ...(activePol.coverageDetails || []).map(c => `• ${c}`),
                            '',
                            'EXCLUSIONES DE LEY:',
                            ...(activePol.exclusions || []).map(e => `• ${e}`),
                            '',
                            'REQUISITOS Y TRÁMITE:',
                            ...(activePol.claimProcedure || []).map((p, idx) => `${idx + 1}. ${p}`)
                          ].join('\n')}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Catalog, Category, or Individual Product Modal */}
      <ShareCatalogModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setProductToShare(null);
        }}
        company={company}
        companyName={company.name}
        product={productToShare}
        categories={categories}
        initialCategory={selectedCategory}
      />

      {/* Service Worker Push Notifications Modal for New Offers & Order Status Updates */}
      <CustomerPushSubscriptionModal
        isOpen={pushModalOpen}
        onClose={() => setPushModalOpen(false)}
        catalogPublished={isCatalogPublished}
        activeProductsCount={activeProducts.length}
        activePromoCount={activePromoCount}
        onPrefsChanged={updated => setPushPrefs(updated)}
        onSelectOfferEvent={ev => {
          setPushModalOpen(false);
          if (ev.relatedProductRef) {
            const matched = activeProducts.find(
              p => p.reference.toLowerCase() === ev.relatedProductRef!.toLowerCase()
            );
            if (matched) {
              setSelectedProductModal(matched);
              setSelectedImageIdx(0);
              return;
            }
          }
          if (ev.relatedCategory) {
            setSelectedCategory(ev.relatedCategory);
            return;
          }
          if (ev.type === 'NEW_OFFER' || ev.type === 'PROMO_ACTIVATED' || ev.type === 'DISCOUNT_CODE') {
            setOnlyPromotions(true);
          }
        }}
      />

      {/* 5. Company Public Footer, Free Google Maps Link & Commercial Conditions */}
      <footer className="bg-slate-900 text-slate-300 rounded-2xl p-6 sm:p-8 space-y-6 border border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Info & Free Google Maps Link */}
          <div>
            <h4 className="text-white text-sm font-bold tracking-tight mb-2">{company.name}</h4>
            {company.nit && <p className="text-xs text-slate-400 font-mono mb-1">NIT: {company.nit}</p>}
            <p className="text-xs text-slate-400 leading-relaxed">{company.slogan}</p>
            <p className="text-xs text-slate-400 mt-2">
              {company.address}, {company.city}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <a
                href={mapsFreeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-white text-xs font-bold transition"
              >
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>Ver Ubicación en Google Maps</span>
              </a>
              <button
                type="button"
                onClick={() => setPoliciesModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Políticas Ley 1480</span>
              </button>
            </div>
          </div>

          {/* Column 2: Direct Contact */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-2 text-red-400">
              Atención al Cliente
            </h4>
            <ul className="text-xs space-y-1.5 text-slate-300">
              <li>
                PBX: <strong className="text-white">{company.phone}</strong>
              </li>
              <li>
                WhatsApp: <strong className="text-white">{company.whatsapp}</strong>
              </li>
              <li>
                Correo: <strong className="text-white">{company.email}</strong>
              </li>
              <li>
                Web: <strong className="text-white">{company.website}</strong>
              </li>
            </ul>
          </div>

          {/* Column 3: Social Networks */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-2 text-red-400">
              Redes Sociales Oficiales
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <a
                href={company.social.instagram}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-slate-800 hover:bg-red-600 hover:text-white rounded transition-colors"
              >
                Instagram
              </a>
              <a
                href={company.social.facebook}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-slate-800 hover:bg-red-600 hover:text-white rounded transition-colors"
              >
                Facebook
              </a>
              <a
                href={company.social.tiktok}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-slate-800 hover:bg-red-600 hover:text-white rounded transition-colors"
              >
                TikTok
              </a>
              <a
                href={company.social.youtube}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-slate-800 hover:bg-red-600 hover:text-white rounded transition-colors"
              >
                YouTube
              </a>
            </div>
          </div>
        </div>

        {/* Commercial Conditions text */}
        <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed text-center">
          {company.commercialTerms}
        </div>
      </footer>
    </div>
  );
};
