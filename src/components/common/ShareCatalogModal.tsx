import React, { useState, useEffect } from 'react';
import { Product, CompanyProfile } from '../../types';
import { formatCOP, getPublicCatalogUrl, createCatalogWhatsAppShareUrl } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Globe,
  Mail,
  Smartphone,
  ExternalLink,
  Layers,
  X
} from 'lucide-react';

interface ShareCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: CompanyProfile;
  companyName?: string;
  product?: Product | null;
  categories?: string[];
  initialCategory?: string;
}

export const ShareCatalogModal: React.FC<ShareCatalogModalProps> = ({
  isOpen,
  onClose,
  company,
  companyName,
  product = null,
  categories = [],
  initialCategory = 'Todas'
}) => {
  const { notify } = useAuth();
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'Todas');

  useEffect(() => {
    setSelectedCategory(initialCategory || 'Todas');
  }, [initialCategory, isOpen]);

  if (!isOpen) return null;

  const resolvedCompanyName = company?.name || companyName || 'IPS TECNOLÓGICA';

  const shareUrl = product
    ? getPublicCatalogUrl(product.reference)
    : getPublicCatalogUrl(undefined, selectedCategory !== 'Todas' ? selectedCategory : undefined);

  const effectivePrice = product?.activePromotion
    ? product.activePromotion.promotionalPriceCOP
    : product?.priceCOP || 0;

  const shareTitle = product
    ? `${product.name} (${product.reference}) - ${resolvedCompanyName}`
    : selectedCategory !== 'Todas'
    ? `Catálogo ${selectedCategory} - ${resolvedCompanyName}`
    : `Catálogo Oficial ${resolvedCompanyName}`;

  const shareText = product
    ? `¡Hola! 👋 Te comparto este producto del catálogo de ${resolvedCompanyName}: ${product.name} (Ref: ${product.reference}) por ${formatCOP(effectivePrice)}. Visítanos aquí:`
    : selectedCategory !== 'Todas'
    ? `¡Hola! 👋 Te comparto el catálogo de ${resolvedCompanyName} (${selectedCategory}). Encuentra productos tecnológicos, consulta precios y descubre nuestras promociones. Visítanos aquí:`
    : `¡Hola! 👋 Te comparto el catálogo de IPS TECNOLÓGICA. Encuentra productos tecnológicos, consulta precios y descubre nuestras promociones. Visítanos aquí:`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      notify('¡Enlace público copiado correctamente al portapapeles!', 'success');
      setTimeout(() => setCopied(false), 3500);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      notify('¡Enlace público copiado correctamente!', 'success');
      setTimeout(() => setCopied(false), 3500);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `${shareText} ${shareUrl}`,
          url: shareUrl
        });
        notify('Contenido compartido exitosamente.', 'success');
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const whatsappShareUrl = product
    ? createCatalogWhatsAppShareUrl({
        productName: product.name,
        productRef: product.reference,
        priceCOP: effectivePrice,
        normalPriceCOP: product.priceCOP
      })
    : createCatalogWhatsAppShareUrl({
        categoryName: selectedCategory !== 'Todas' ? selectedCategory : undefined
      });

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}&quote=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText
  )}&url=${encodeURIComponent(shareUrl)}`;
  const emailShareUrl = `mailto:?subject=${encodeURIComponent(
    shareTitle
  )}&body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                {product ? 'Compartir Producto' : 'Compartir Catálogo'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Enlace público directo con vista previa para redes sociales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Optional Category Selector when sharing catalog */}
          {!product && categories.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-red-600" />
                <span>Alcance del Catálogo a Compartir:</span>
              </label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="Todas">Catálogo Completo (Todas las categorías)</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    Catálogo por Categoría: {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
              {product
                ? `Producto Individual · Ref: ${product.reference}`
                : selectedCategory !== 'Todas'
                ? `Catálogo por Categoría · ${selectedCategory}`
                : 'Catálogo Público Oficial'}
            </span>
            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
              {shareTitle}
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {shareText} <span className="font-mono text-red-600 break-all">{shareUrl}</span>
            </p>
          </div>

          {/* Public URL & Copy Button */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Enlace Público del Catálogo:
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl overflow-hidden">
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={e => (e.target as HTMLInputElement).select()}
                  className="w-full text-xs font-mono text-slate-800 bg-transparent focus:outline-none truncate"
                />
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Enlace'}</span>
              </button>
            </div>
            {copied && (
              <p className="text-[11px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Enlace copiado al portapapeles. Cualquier cliente puede abrirlo sin iniciar sesión.
              </p>
            )}
          </div>

          {/* Native Device Share Button */}
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-red-400" />
              <span>Compartir mediante Menú Nativo del Dispositivo</span>
            </button>
          )}

          {/* Direct Social & Messaging Channels */}
          <div>
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Compartir en redes sociales:
            </span>
            <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold">
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition shadow-2xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>

              <a
                href={facebookShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition shadow-2xs"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Facebook</span>
              </a>

              <a
                href={twitterShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center gap-2 transition shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>X / Twitter</span>
              </a>

              <a
                href={emailShareUrl}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center justify-center gap-2 transition"
              >
                <Mail className="w-4 h-4 text-red-600" />
                <span>Correo</span>
              </a>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span>Vista previa Open Graph habilitada</span>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 font-bold hover:underline flex items-center gap-1"
            >
              <span>Abrir enlace público</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
