import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sparkles,
  CheckCircle2,
  Copy,
  Trash2,
  Plus,
  RotateCcw,
  Eye,
  Globe,
  FileText,
  Calendar,
  Image as ImageIcon,
  Upload,
  Save,
  ArrowUpDown,
  ExternalLink,
  Layers,
  ShieldCheck,
  X
} from 'lucide-react';
import { SeasonalTemplate, PromoBannerItem, Product } from '../../types';
import { api } from '../../services/api';

interface SeasonalTemplatesManagerProps {
  products: Product[];
  onNotify: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  onTemplatesChanged?: (activeWeb: SeasonalTemplate, activePdf: SeasonalTemplate) => void;
  onBannersChanged?: (banners: PromoBannerItem[]) => void;
}

export const SeasonalTemplatesManager: React.FC<SeasonalTemplatesManagerProps> = ({
  products,
  onNotify,
  onTemplatesChanged,
  onBannersChanged
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'templates' | 'banners'>('templates');
  const [templates, setTemplates] = useState<SeasonalTemplate[]>([]);
  const [activeWebId, setActiveWebId] = useState<string>('tpl_corporativa');
  const [activePdfId, setActivePdfId] = useState<string>('tpl_corporativa');
  const [banners, setBanners] = useState<PromoBannerItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Preview & Editor state
  const [previewTemplate, setPreviewTemplate] = useState<SeasonalTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<SeasonalTemplate> | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savingBannerSlot, setSavingBannerSlot] = useState<number | null>(null);

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tplRes, bannersRes] = await Promise.all([api.getTemplates(), api.getPromoBanners()]);
      setTemplates(tplRes.templates || []);
      if (tplRes.activeWebTemplate) setActiveWebId(tplRes.activeWebTemplate.id);
      if (tplRes.activePdfTemplate) setActivePdfId(tplRes.activePdfTemplate.id);
      setBanners(bannersRes || []);
    } catch (err: any) {
      onNotify('Error', err.message || 'No se pudieron cargar las plantillas y banners.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleActivate = async (id: string, target: 'web' | 'pdf' | 'both') => {
    try {
      const res = await api.activateTemplate(id, target);
      const refreshed = await api.getTemplates();
      setTemplates(refreshed.templates);
      setActiveWebId(refreshed.activeWebTemplate.id);
      setActivePdfId(refreshed.activePdfTemplate.id);
      onTemplatesChanged?.(refreshed.activeWebTemplate, refreshed.activePdfTemplate);
      onNotify('Plantilla Activada', res.message, 'success');
    } catch (err: any) {
      onNotify('Error', err.message || 'Error al activar plantilla', 'error');
    }
  };

  const handleRestoreDefault = async () => {
    try {
      const res = await api.restoreDefaultTemplate();
      const refreshed = await api.getTemplates();
      setTemplates(refreshed.templates);
      setActiveWebId(refreshed.activeWebTemplate.id);
      setActivePdfId(refreshed.activePdfTemplate.id);
      onTemplatesChanged?.(refreshed.activeWebTemplate, refreshed.activePdfTemplate);
      onNotify('Diseño Restaurado', res.message, 'success');
    } catch (err: any) {
      onNotify('Error', err.message || 'Error al restaurar diseño predeterminado', 'error');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await api.duplicateTemplate(id);
      const refreshed = await api.getTemplates();
      setTemplates(refreshed.templates);
      onNotify('Plantilla Duplicada', res.message, 'success');
    } catch (err: any) {
      onNotify('Error', err.message || 'No se pudo duplicar la plantilla', 'error');
    }
  };

  const handleDeleteConfirmed = async (id: string) => {
    try {
      const res = await api.deleteTemplate(id);
      setConfirmDeleteId(null);
      const refreshed = await api.getTemplates();
      setTemplates(refreshed.templates);
      setActiveWebId(refreshed.activeWebTemplate.id);
      setActivePdfId(refreshed.activePdfTemplate.id);
      onTemplatesChanged?.(refreshed.activeWebTemplate, refreshed.activePdfTemplate);
      onNotify('Plantilla Eliminada', res.message, 'info');
    } catch (err: any) {
      onNotify('Acción Protegida', err.message || 'No se pudo eliminar la plantilla', 'error');
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editingTemplate.name?.trim()) {
      onNotify('Validación', 'El nombre de la plantilla es obligatorio.', 'error');
      return;
    }

    try {
      if (isCreatingNew) {
        const res = await api.createTemplate(editingTemplate);
        onNotify('Plantilla Creada', res.message, 'success');
      } else if (editingTemplate.id) {
        const res = await api.updateTemplate(editingTemplate.id, editingTemplate);
        onNotify('Plantilla Actualizada', res.message, 'success');
      }
      setEditingTemplate(null);
      setIsCreatingNew(false);
      const refreshed = await api.getTemplates();
      setTemplates(refreshed.templates);
      setActiveWebId(refreshed.activeWebTemplate.id);
      setActivePdfId(refreshed.activePdfTemplate.id);
      onTemplatesChanged?.(refreshed.activeWebTemplate, refreshed.activePdfTemplate);
    } catch (err: any) {
      onNotify('Error', err.message || 'No se pudo guardar la plantilla.', 'error');
    }
  };

  const handleBannerImageUpload = async (slot: number, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result);
        const up = await api.uploadImage(file.name, dataUrl, false, `BANNER_PROMO_${slot}`);
        setBanners(prev =>
          prev.map(b =>
            b.slot === slot ? { ...b, imageUrl: up.url, driveFileId: up.driveFileId } : b
          )
        );
        onNotify('Imagen Cargada', `Imagen subida para Banner Promocional #${slot}. Presiona Guardar para publicar.`, 'info');
      } catch (err: any) {
        onNotify('Error de carga', err.message || 'No se pudo subir la imagen del banner.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBanner = async (banner: PromoBannerItem) => {
    setSavingBannerSlot(banner.slot);
    try {
      const res = await api.updatePromoBanner(banner.slot, banner);
      setBanners(res.banners);
      onBannersChanged?.(res.banners);
      onNotify('Banner Actualizado', res.message, 'success');
    } catch (err: any) {
      onNotify('Error', err.message || 'No se pudo actualizar el banner promocional.', 'error');
    } finally {
      setSavingBannerSlot(null);
    }
  };

  const updateLocalBanner = (slot: number, field: keyof PromoBannerItem, value: any) => {
    setBanners(prev => prev.map(b => (b.slot === slot ? { ...b, [field]: value } : b)));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 rounded-2xl p-6 text-white shadow-xl border border-slate-700/60 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-200 text-xs font-semibold mb-2">
            <Palette className="w-3.5 h-3.5" />
            SECCIONES 3 Y 13 · DISEÑO VISUAL POR TEMPORADA Y BANNERS PROMOCIONALES
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Plantillas de Temporada y Banner Principal de 3 Promociones
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-3xl">
            Cambia la apariencia visual del catálogo online y del generador PDF para cada fecha especial de Colombia sin alterar productos, precios, existencias ni fotografías.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRestoreDefault}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            Restaurar Corporativa IPS
          </button>
          <button
            onClick={() => {
              setIsCreatingNew(true);
              setEditingTemplate({
                name: '',
                seasonKey: 'personalizada',
                primaryColor: '#DC2626',
                secondaryColor: '#0F172A',
                accentColor: '#F59E0B',
                backgroundColor: '#F8FAFC',
                headerTextColor: '#FFFFFF',
                bannerTitle: 'Especial de Temporada · IPS TECNOLÓGICA',
                bannerSubtitle: 'Equipos, repuestos y servicio técnico certificado en Cali y toda Colombia.',
                decorativeBadge: 'EDICIÓN ESPECIAL',
                promoBlockText: 'Envíos asegurados y garantía oficial conforme a la Ley 1480 de 2011.',
                buttonStyle: 'rounded-xl',
                fontFamily: 'Inter, system-ui, sans-serif'
              });
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Nueva Plantilla
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('templates')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
              activeSubTab === 'templates'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            14 Plantillas por Temporada ({templates.length})
          </button>
          <button
            onClick={() => setActiveSubTab('banners')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
              activeSubTab === 'banners'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-red-400" />
            Carrusel Principal de 6 Promociones (Web y Catálogo)
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 px-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            Web activa:{' '}
            <strong className="text-slate-900">
              {templates.find(t => t.id === activeWebId)?.name || 'Corporativa'}
            </strong>{' '}
            · PDF activa:{' '}
            <strong className="text-slate-900">
              {templates.find(t => t.id === activePdfId)?.name || 'Corporativa'}
            </strong>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <p className="text-slate-500 font-medium">Cargando plantillas y banners promocionales...</p>
        </div>
      ) : activeSubTab === 'templates' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map(tpl => {
            const isWeb = tpl.id === activeWebId || tpl.isActiveWeb;
            const isPdf = tpl.id === activePdfId || tpl.isActivePdf;
            return (
              <div
                key={tpl.id}
                className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition flex flex-col justify-between ${
                  isWeb || isPdf ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Color & Header Preview Strip */}
                  <div
                    className="p-4 text-white relative"
                    style={{
                      background: `linear-gradient(135deg, ${tpl.secondaryColor} 0%, ${tpl.primaryColor} 100%)`
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm"
                        style={{ backgroundColor: tpl.accentColor, color: '#0F172A' }}
                      >
                        {tpl.decorativeBadge}
                      </span>
                      <div className="flex items-center gap-1">
                        {isWeb && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
                            <Globe className="w-3 h-3" /> WEB ACTIVA
                          </span>
                        )}
                        {isPdf && (
                          <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold flex items-center gap-1">
                            <FileText className="w-3 h-3" /> PDF ACTIVA
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="font-extrabold text-base leading-snug">{tpl.name}</h3>
                    <p className="text-xs text-white/85 line-clamp-1 mt-0.5">{tpl.bannerTitle}</p>
                  </div>

                  {/* Body Details */}
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-600 line-clamp-2">{tpl.bannerSubtitle}</p>

                    {/* Color Swatches */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span
                          className="w-4 h-4 rounded-full border border-slate-300 inline-block"
                          style={{ backgroundColor: tpl.primaryColor }}
                          title={`Primario: ${tpl.primaryColor}`}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-slate-300 inline-block"
                          style={{ backgroundColor: tpl.secondaryColor }}
                          title={`Secundario: ${tpl.secondaryColor}`}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-slate-300 inline-block"
                          style={{ backgroundColor: tpl.accentColor }}
                          title={`Acento: ${tpl.accentColor}`}
                        />
                      </div>
                      {tpl.startAt && tpl.endAt && (
                        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Calendar className="w-3 h-3" />
                          {tpl.startAt.slice(5, 10)} a {tpl.endAt.slice(5, 10)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleActivate(tpl.id, 'web')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                        isWeb
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      Usar en Web
                    </button>
                    <button
                      onClick={() => handleActivate(tpl.id, 'pdf')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                        isPdf
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Usar en PDF
                    </button>
                    <button
                      onClick={() => handleActivate(tpl.id, 'both')}
                      className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Ambos
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/70">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewTemplate(tpl)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/70 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Vista previa
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingNew(false);
                          setEditingTemplate({ ...tpl });
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        Editar
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDuplicate(tpl.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70"
                        title="Duplicar plantilla"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {!tpl.isDefaultCorporate && tpl.id !== 'tpl_corporativa' && (
                        <button
                          onClick={() => setConfirmDeleteId(tpl.id)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                          title="Eliminar plantilla"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Carrusel Principal de 6 Promociones (Sección 10) */
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Layers className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold text-sm">
                PROMOCIONES Y DESTACADOS DE TEMPORADA — 6 Espacios Promocionales Interactivos
              </p>
              <p>
                Configura las 6 imágenes promocionales del encabezado de la Página Web Corporativa (/) y del Catálogo Online (/catalogo). Incluye fotografía, título, descripción, precio anterior, precio promocional, porcentaje de descuento y vigencia.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map(banner => (
              <div
                key={banner.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Image Preview */}
                  <div className="relative h-44 bg-slate-900 overflow-hidden">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold uppercase">
                          ESPACIO #{banner.slot} · ORDEN {banner.order}
                        </span>
                        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-black/50 px-2.5 py-1 rounded-full cursor-pointer">
                          <input
                            type="checkbox"
                            checked={banner.isActive}
                            onChange={e => updateLocalBanner(banner.slot, 'isActive', e.target.checked)}
                            className="rounded text-emerald-500"
                          />
                          {banner.isActive ? 'Activo' : 'Inactivo'}
                        </label>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-amber-300 uppercase">
                          {banner.badgeText}
                        </span>
                        <h4 className="text-white font-extrabold text-sm line-clamp-1">{banner.title}</h4>
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5 text-red-600" />
                        Subir / Cambiar Imagen
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) handleBannerImageUpload(banner.slot, f);
                          }}
                        />
                      </label>

                      <div className="flex items-center gap-1">
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-500">Orden:</span>
                        <input
                          type="number"
                          min={1}
                          max={6}
                          value={banner.order}
                          onChange={e => updateLocalBanner(banner.slot, 'order', Number(e.target.value) || banner.slot)}
                          className="w-14 px-2 py-1 border border-slate-300 rounded-lg text-center font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Etiqueta superior</label>
                      <input
                        type="text"
                        value={banner.badgeText || ''}
                        onChange={e => updateLocalBanner(banner.slot, 'badgeText', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Título promocional</label>
                      <input
                        type="text"
                        value={banner.title}
                        onChange={e => updateLocalBanner(banner.slot, 'title', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Descripción</label>
                      <textarea
                        rows={2}
                        value={banner.description}
                        onChange={e => updateLocalBanner(banner.slot, 'description', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Precio Ant. (COP)</label>
                        <input
                          type="number"
                          value={banner.originalPriceCOP || ''}
                          onChange={e =>
                            updateLocalBanner(banner.slot, 'originalPriceCOP', Number(e.target.value) || undefined)
                          }
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Precio Promo</label>
                        <input
                          type="number"
                          value={banner.promotionalPriceCOP || ''}
                          onChange={e =>
                            updateLocalBanner(banner.slot, 'promotionalPriceCOP', Number(e.target.value) || undefined)
                          }
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-red-600 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">% Descuento</label>
                        <input
                          type="number"
                          min={0}
                          max={95}
                          value={banner.discountPercent || ''}
                          onChange={e =>
                            updateLocalBanner(banner.slot, 'discountPercent', Number(e.target.value) || undefined)
                          }
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Texto del botón</label>
                        <input
                          type="text"
                          value={banner.ctaText}
                          onChange={e => updateLocalBanner(banner.slot, 'ctaText', e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Tipo de enlace</label>
                        <select
                          value={banner.linkType}
                          onChange={e => updateLocalBanner(banner.slot, 'linkType', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="category">Categoría</option>
                          <option value="product">Producto específico</option>
                          <option value="support">Agendar soporte</option>
                        </select>
                      </div>
                    </div>

                    {banner.linkType === 'category' && (
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Categoría destino</label>
                        <select
                          value={banner.targetCategory || ''}
                          onChange={e => updateLocalBanner(banner.slot, 'targetCategory', e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="">Todas las categorías</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {banner.linkType === 'product' && (
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Producto destino</label>
                        <select
                          value={banner.targetProductId || ''}
                          onChange={e => updateLocalBanner(banner.slot, 'targetProductId', e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="">Seleccionar producto...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.reference} — {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Vigencia desde</label>
                        <input
                          type="date"
                          value={(banner.startAt || '').slice(0, 10)}
                          onChange={e =>
                            updateLocalBanner(
                              banner.slot,
                              'startAt',
                              e.target.value ? new Date(e.target.value).toISOString() : undefined
                            )
                          }
                          className="w-full px-2 py-1 border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Vigencia hasta</label>
                        <input
                          type="date"
                          value={(banner.endAt || '').slice(0, 10)}
                          onChange={e =>
                            updateLocalBanner(
                              banner.slot,
                              'endAt',
                              e.target.value ? new Date(e.target.value).toISOString() : undefined
                            )
                          }
                          className="w-full px-2 py-1 border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => handleSaveBanner(banner)}
                    disabled={savingBannerSlot === banner.slot}
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow inline-flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {savingBannerSlot === banner.slot
                      ? 'Guardando Banner...'
                      : `Guardar Espacio Promocional #${banner.slot}`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Preview Template */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div
              className="p-8 text-white relative"
              style={{
                background: `linear-gradient(135deg, ${previewTemplate.secondaryColor} 0%, ${previewTemplate.primaryColor} 100%)`
              }}
            >
              <button
                onClick={() => setPreviewTemplate(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase mb-3"
                style={{ backgroundColor: previewTemplate.accentColor, color: '#0F172A' }}
              >
                {previewTemplate.decorativeBadge}
              </span>
              <h2 className="text-2xl font-black">{previewTemplate.bannerTitle}</h2>
              <p className="text-sm text-white/90 mt-2">{previewTemplate.bannerSubtitle}</p>
              <div className="mt-4 inline-block px-4 py-2 rounded-xl bg-white/15 border border-white/20 text-xs font-semibold">
                {previewTemplate.promoBlockText}
              </div>
            </div>

            <div className="p-6 space-y-4" style={{ backgroundColor: previewTemplate.backgroundColor }}>
              <p className="text-xs text-slate-600 font-medium">
                Vista previa de tarjeta de producto con la plantilla <strong>{previewTemplate.name}</strong> (los precios, fotos y stock reales permanecen intactos):
              </p>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">REF: IPS-LAP-001</span>
                  <h4 className="font-bold text-slate-900">Portátil Corporativo IPS ProBook</h4>
                  <p className="text-sm font-extrabold mt-1" style={{ color: previewTemplate.primaryColor }}>
                    $3.450.000 COP
                  </p>
                </div>
                <button
                  className="px-4 py-2 text-xs font-bold text-white rounded-xl"
                  style={{ backgroundColor: previewTemplate.primaryColor }}
                >
                  Comprar / WhatsApp
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    handleActivate(previewTemplate.id, 'both');
                    setPreviewTemplate(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
                >
                  Activar en Web y PDF Ahora
                </button>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cerrar Vista Previa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Template */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveTemplate}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">
                {isCreatingNew ? 'Crear Nueva Plantilla de Temporada' : `Editar Plantilla: ${editingTemplate.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre de la Plantilla *</label>
                <input
                  type="text"
                  required
                  value={editingTemplate.name || ''}
                  onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Insignia Decorativa</label>
                <input
                  type="text"
                  value={editingTemplate.decorativeBadge || ''}
                  onChange={e => setEditingTemplate({ ...editingTemplate, decorativeBadge: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Título Principal del Banner</label>
                <input
                  type="text"
                  value={editingTemplate.bannerTitle || ''}
                  onChange={e => setEditingTemplate({ ...editingTemplate, bannerTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Subtítulo / Mensaje de Temporada</label>
                <textarea
                  rows={2}
                  value={editingTemplate.bannerSubtitle || ''}
                  onChange={e => setEditingTemplate({ ...editingTemplate, bannerSubtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Color Primario</label>
                <input
                  type="color"
                  value={editingTemplate.primaryColor || '#DC2626'}
                  onChange={e => setEditingTemplate({ ...editingTemplate, primaryColor: e.target.value })}
                  className="w-full h-10 rounded-xl border border-slate-300 cursor-pointer"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Color Secundario (Fondo Hero)</label>
                <input
                  type="color"
                  value={editingTemplate.secondaryColor || '#0F172A'}
                  onChange={e => setEditingTemplate({ ...editingTemplate, secondaryColor: e.target.value })}
                  className="w-full h-10 rounded-xl border border-slate-300 cursor-pointer"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Color de Acento</label>
                <input
                  type="color"
                  value={editingTemplate.accentColor || '#F59E0B'}
                  onChange={e => setEditingTemplate({ ...editingTemplate, accentColor: e.target.value })}
                  className="w-full h-10 rounded-xl border border-slate-300 cursor-pointer"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Texto Promocional Inferior</label>
                <input
                  type="text"
                  value={editingTemplate.promoBlockText || ''}
                  onChange={e => setEditingTemplate({ ...editingTemplate, promoBlockText: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Programar Fecha Inicio</label>
                <input
                  type="date"
                  value={(editingTemplate.startAt || '').slice(0, 10)}
                  onChange={e =>
                    setEditingTemplate({
                      ...editingTemplate,
                      startAt: e.target.value ? new Date(e.target.value).toISOString() : undefined
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Programar Fecha Fin</label>
                <input
                  type="date"
                  value={(editingTemplate.endAt || '').slice(0, 10)}
                  onChange={e =>
                    setEditingTemplate({
                      ...editingTemplate,
                      endAt: e.target.value ? new Date(e.target.value).toISOString() : undefined
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow"
              >
                Guardar Plantilla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">¿Confirmar eliminación de plantilla?</h3>
            <p className="text-xs text-slate-600">
              Esta acción eliminará la plantilla seleccionada. Los productos, precios e inventario no sufrirán ningún cambio.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteConfirmed(confirmDeleteId)}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                Sí, Eliminar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
