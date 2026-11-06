import React, { useState, useEffect } from 'react';
import { Product, CompanyProfile, CatalogOptions, SeasonalTemplate } from '../../types';
import { formatCOP } from '../../utils/formatters';
import {
  generateCatalogPDF,
  verifyAndPreloadCatalogImages,
  PRODUCTS_PER_PAGE,
  calculateCatalogPages,
  PreloadedCatalogAssets
} from '../../utils/pdfGenerator';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ShareCatalogModal } from '../common/ShareCatalogModal';
import {
  Download,
  Share2,
  Eye,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TestTube2,
  Sliders,
  ExternalLink,
  AlertTriangle,
  Tag
} from 'lucide-react';

interface CatalogStudioProps {
  products: Product[];
  company: CompanyProfile;
  categories: string[];
  onReloadProducts: () => void;
  onRequestClientLogin?: () => void;
}

export const CatalogStudio: React.FC<CatalogStudioProps> = ({
  products,
  company,
  categories,
  onReloadProducts,
  onRequestClientLogin
}) => {
  const { user, notify, canEdit } = useAuth();
  const [seasonalTemplates, setSeasonalTemplates] = useState<SeasonalTemplate[]>([]);

  // Generator Options (Section 11 & 12: 4/6/8/12 products, Carta/A4, Vertical/Horizontal, Index, BackCover)
  const [options, setOptions] = useState<CatalogOptions>({
    title: 'PORTAFOLIO OFICIAL DE TECNOLOGÍA',
    subtitle: 'Hardware Corporativo, Cómputo Profesional y Soluciones TI',
    includeCover: true,
    includeIndex: false,
    includeBackCover: true,
    template: 'corporativo',
    categoryFilter: 'Todas',
    selectionMode: 'all',
    selectedProductIds: [],
    productsPerPage: 12,
    paperFormat: 'letter',
    orientation: 'portrait',
    onlyActive: true,
    includePrice: true,
    includeReference: true,
    includeDescription: true,
    includeTermsFooter: true,
    marginMm: 10,
    validityText: 'Ofertas y precios válidos según vigencia publicada en Colombia (America/Bogota) o hasta agotar existencias.'
  });

  useEffect(() => {
    api
      .getTemplates()
      .then(res => {
        setSeasonalTemplates(res.templates || []);
        if (res.activePdfTemplate) {
          setOptions(prev => ({
            ...prev,
            seasonalTemplate: res.activePdfTemplate,
            title: res.activePdfTemplate.bannerTitle?.toUpperCase() || prev.title,
            subtitle: res.activePdfTemplate.bannerSubtitle || prev.subtitle
          }));
        }
      })
      .catch(() => {});
  }, []);

  const [activePreviewPage, setActivePreviewPage] = useState<number>(1);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [testingBatchLoading, setTestingBatchLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Image verification state before generating PDF
  const [failedImagesWarning, setFailedImagesWarning] = useState<{
    failedList: { id: string; name: string; reference: string; reason: string }[];
    preloaded: PreloadedCatalogAssets;
    mode: 'download' | 'share-pdf';
  } | null>(null);

  // Photo Repair Tool Modal State
  const [photoRepairModalOpen, setPhotoRepairModalOpen] = useState(false);
  const [isRepairingPhotos, setIsRepairingPhotos] = useState(false);
  const [photoVerificationReport, setPhotoVerificationReport] = useState<{
    total: number;
    verified: number;
    repaired: number;
    failed: number;
    details: any[];
  } | null>(null);

  const handleOpenPhotoRepairTool = async (autoRepair = true) => {
    setPhotoRepairModalOpen(true);
    setIsRepairingPhotos(true);
    try {
      const report: any = await api.verifyDriveProductImages();
      const total = report.totalProducts ?? report.total ?? products.length;
      const verified = report.healthyImages ?? report.verified ?? total;
      const repaired = report.rehydratedCount ?? report.repaired ?? 0;
      const failed = report.missingOrBrokenCount ?? report.failed ?? 0;
      setPhotoVerificationReport({
        total,
        verified,
        repaired,
        failed,
        details: report.details || []
      });
      if (autoRepair) {
        onReloadProducts();
        notify(`Verificación completada: ${verified} fotografías activas (${repaired} reparadas automáticamente en bóveda).`, 'success');
      }
    } catch (err: any) {
      notify(err.message || 'Error al verificar fotografías en la bóveda.', 'error');
    } finally {
      setIsRepairingPhotos(false);
    }
  };

  const handleReplaceSingleProductPhoto = async (productId: string, file: File) => {
    setIsRepairingPhotos(true);
    try {
      const uploaded: any = await (api as any).uploadImageFile(file);
      if (uploaded && uploaded.url) {
        const target = products.find(p => p.id === productId);
        if (target) {
          await api.updateProduct(productId, {
            ...target,
            imageUrl: uploaded.url,
            imageDriveId: uploaded.driveId || uploaded.driveFileId || '',
            images: [uploaded.url, ...(target.images || []).slice(1)]
          });
        }
        onReloadProducts();
        await handleOpenPhotoRepairTool(false);
        notify('Fotografía reemplazada y respaldada permanentemente.', 'success');
      }
    } catch (e: any) {
      notify(e.message || 'No se pudo actualizar la fotografía.', 'error');
    } finally {
      setIsRepairingPhotos(false);
    }
  };

  // Filter products according to current settings (All, Category, or Custom Selection)
  const filteredProducts = products.filter(p => {
    if (options.onlyActive && !p.isActive) return false;
    if (options.selectionMode === 'custom') {
      return (options.selectedProductIds || []).includes(p.id);
    }
    if (
      options.selectionMode === 'category' &&
      options.categoryFilter &&
      options.categoryFilter !== 'Todas' &&
      p.category !== options.categoryFilter
    ) {
      return false;
    }
    if (
      (!options.selectionMode || options.selectionMode === 'all') &&
      options.categoryFilter &&
      options.categoryFilter !== 'Todas' &&
      p.category !== options.categoryFilter
    ) {
      return false;
    }
    return true;
  });

  const activeProductsPerPage = options.productsPerPage || PRODUCTS_PER_PAGE;

  // Calculate pages
  const { interiorPages, totalPages } = calculateCatalogPages(
    filteredProducts.length,
    options.includeCover,
    activeProductsPerPage,
    Boolean(options.includeIndex),
    Boolean(options.includeBackCover)
  );

  // Execute PDF compilation after image verification
  const compileAndDeliverPDF = async (preloaded: PreloadedCatalogAssets, mode: 'download' | 'share-pdf') => {
    setIsGeneratingPDF(true);
    try {
      const doc = await generateCatalogPDF(filteredProducts, company, options, preloaded);
      const filename = `CATALOGO_IPS_TECNOLOGICA_${options.template.toUpperCase()}_${new Date().toISOString().split('T')[0]}.pdf`;

      if (mode === 'share-pdf' && navigator.share) {
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            title: `${options.title} - ${company.name}`,
            text: `Catálogo oficial de productos de ${company.name}`,
            files: [pdfFile]
          });
          notify('Archivo PDF compartido exitosamente.', 'success');
          return;
        }
      }

      doc.save(filename);
      const fmtLabel = options.paperFormat === 'a4' ? 'A4' : 'Carta';
      notify(`¡Catálogo PDF (${totalPages} páginas ${fmtLabel}, ${activeProductsPerPage} prods/pág) descargado con éxito!`, 'success');
    } catch (err: any) {
      console.error('PDF generation error', err);
      notify('Error al compilar el catálogo PDF.', 'error');
    } finally {
      setIsGeneratingPDF(false);
      setFailedImagesWarning(null);
    }
  };

  // Pre-verify all images before generating PDF (Requirement 4 & Section 3 Client Registration Requirement)
  const handleStartPDFGeneration = async (mode: 'download' | 'share-pdf' = 'download') => {
    if (!user) {
      notify('Inicia sesión o regístrate gratuitamente como cliente para descargar tu catálogo personalizado en PDF.', 'info');
      if (onRequestClientLogin) onRequestClientLogin();
      return;
    }

    if (filteredProducts.length === 0) {
      notify('No hay productos para generar el catálogo con los filtros actuales.', 'error');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      // First ensure backend vault has hydrated all product images
      await api.verifyDriveProductImages().catch(() => {});
      const preloaded = await verifyAndPreloadCatalogImages(filteredProducts, company);
      if (preloaded.failedProducts.length > 0) {
        setIsGeneratingPDF(false);
        setFailedImagesWarning({
          failedList: preloaded.failedProducts,
          preloaded,
          mode
        });
        return;
      }

      await compileAndDeliverPDF(preloaded, mode);
    } catch (err: any) {
      console.error('Error verifying images:', err);
      notify('Error al verificar las fotografías del catálogo.', 'error');
      setIsGeneratingPDF(false);
    }
  };

  // Handle Save to Google Drive
  const handleSaveToDrive = async () => {
    if (!user) {
      notify('Inicia sesión para guardar el catálogo en Google Drive.', 'info');
      if (onRequestClientLogin) onRequestClientLogin();
      return;
    }
    if (filteredProducts.length === 0) {
      notify('No hay productos para generar el catálogo.', 'error');
      return;
    }

    setIsSavingToDrive(true);
    try {
      await api.verifyDriveProductImages().catch(() => {});
      const preloaded = await verifyAndPreloadCatalogImages(filteredProducts, company);
      const doc = await generateCatalogPDF(filteredProducts, company, options, preloaded);
      const pdfBase64 = doc.output('datauristring');
      const res = await api.saveCatalogToDrive(options.title, filteredProducts.length, pdfBase64);
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Error guardando en Google Drive.', 'error');
    } finally {
      setIsSavingToDrive(false);
    }
  };

  // Run Mandatory Test Suite for 1, 12, 13, 24, 25, 100 products
  const handleRunTestPreset = async (count: number) => {
    if (!canEdit) {
      notify('Inicie sesión como Administrador o Editor para generar lotes de prueba.', 'info');
      return;
    }

    setTestingBatchLoading(true);
    try {
      await api.generateTestBatch(count);
      onReloadProducts();
      setActivePreviewPage(1);
      notify(`Prueba de ${count} productos cargada con fotografías verificadas: cada página interior tiene hasta 12 productos (3x4).`, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al generar lote de prueba.', 'error');
    } finally {
      setTestingBatchLoading(false);
    }
  };

  // Slice products for the current active preview page
  const isCoverActive = options.includeCover && activePreviewPage === 1;
  const preProductPagesCount = (options.includeCover ? 1 : 0) + (options.includeIndex ? 1 : 0);
  const interiorPageIndex = Math.max(0, activePreviewPage - preProductPagesCount - 1);
  const currentInteriorProducts =
    !isCoverActive && interiorPageIndex >= 0
      ? filteredProducts.slice(
          interiorPageIndex * activeProductsPerPage,
          (interiorPageIndex + 1) * activeProductsPerPage
        )
      : [];

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase">
                DISEÑADOR DE CATÁLOGOS Y PLANTILLAS PDF
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              17 ediciones para fechas especiales · 4, 6, 8 o 12 productos por página · Formato Carta o A4 · Vertical u Horizontal · Fotografías permanentes en Google Drive
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenPhotoRepairTool(true)}
              className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              title="Herramienta de verificación y reparación permanente de fotografías"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Reparar / Verificar Fotos ({products.length})</span>
            </button>

            <button
              onClick={() => setShareModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              title="Compartir enlace del catálogo público"
            >
              <Share2 className="w-4 h-4 text-red-600" />
              <span>Compartir Catálogo</span>
            </button>

            <button
              onClick={handleSaveToDrive}
              disabled={isSavingToDrive || filteredProducts.length === 0}
              className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
              title="Guardar en carpeta de Google Drive y registrar en Google Sheets"
            >
              <ExternalLink className="w-4 h-4 text-emerald-600" />
              <span>{isSavingToDrive ? 'Guardando en Drive...' : 'Guardar en Google Drive'}</span>
            </button>

            <button
              onClick={() => handleStartPDFGeneration('download')}
              disabled={isGeneratingPDF || filteredProducts.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPDF ? 'Verificando Fotos y Compilando...' : 'Descargar Catálogo PDF (Carta)'}</span>
            </button>
          </div>
        </div>

        {/* Mandatory Tests Toolbar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-red-50/40 p-3 rounded-lg border border-red-100">
          <div className="flex items-center gap-2">
            <TestTube2 className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Laboratorio de Pruebas de Paginación Obligatorias:
              </span>
              <span className="text-[11px] text-slate-600">
                Verifica la distribución exacta de 12 productos (3×4) por página carta con imágenes reales sin pérdida ni recortes.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[1, 12, 13, 24, 25, 100].map(cnt => (
              <button
                key={cnt}
                disabled={testingBatchLoading}
                onClick={() => handleRunTestPreset(cnt)}
                className="px-2.5 py-1 text-xs font-bold rounded bg-white hover:bg-red-600 hover:text-white border border-red-200 text-slate-800 transition-colors shadow-2xs disabled:opacity-50"
                title={`Probar paginación con exactamente ${cnt} productos`}
              >
                {cnt} Prods
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Photo Repair Tool Modal */}
      {photoRepairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">Herramienta de Reparación y Bóveda Permanente de Fotografías</h3>
                <p className="text-xs text-slate-300">
                  Verifica, repara y revincula automáticamente todas las fotografías de productos con respaldo en servidor y Google Drive.
                </p>
              </div>
              <button
                onClick={() => setPhotoRepairModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
              {photoVerificationReport ? (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-800">
                    Total Productos: {photoVerificationReport.total}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 font-bold text-emerald-800">
                    Verificadas OK: {photoVerificationReport.verified}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 font-bold text-blue-800">
                    Auto-Reparadas en Bóveda: {photoVerificationReport.repaired}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 font-bold text-red-800">
                    Con error: {photoVerificationReport.failed}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-600">Analizando fotografías del catálogo...</span>
              )}

              <button
                onClick={() => handleOpenPhotoRepairTool(true)}
                disabled={isRepairingPhotos}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {isRepairingPhotos ? 'Reparando y Sincronizando...' : 'Reparar y Sincronizar Todas Ahora'}
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2.5">
              {products.map(prod => {
                const detail = photoVerificationReport?.details?.find((d: any) => d.productId === prod.id);
                const imgSrc = (prod.images && prod.images[0]) || prod.imageUrl || '';
                return (
                  <div key={prod.id} className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={imgSrc}
                        alt={prod.name}
                        className="w-12 h-12 rounded-lg object-contain border border-slate-200 bg-slate-50 p-1 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-red-600">{prod.reference || prod.sku}</span>
                          <span className="text-xs font-bold text-slate-900">{prod.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono truncate max-w-md">
                          URL: {imgSrc || 'Sin ruta'} · Drive ID: {prod.imageDriveId || detail?.driveId || 'Local Vault'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {detail?.status === 'repaired' ? 'Reparada OK' : 'Activa en Bóveda'}
                      </span>
                      {canEdit && (
                        <label className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg cursor-pointer">
                          Cambiar Foto
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) handleReplaceSingleProductPhoto(prod.id, f);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal if any product image failed to load before PDF generation */}
      {failedImagesWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-amber-300 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-700">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Aviso de Verificación de Fotografías ({failedImagesWarning.failedList.length})
                </h3>
                <p className="text-xs text-slate-600">
                  Se detectaron productos sin fotografía o con imagen inaccesible antes de exportar el PDF:
                </p>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto bg-amber-50/60 border border-amber-200 rounded-lg p-3 space-y-1.5 text-xs">
              {failedImagesWarning.failedList.map(item => (
                <div key={item.id} className="flex items-center justify-between text-slate-700">
                  <span className="font-medium truncate">
                    <strong className="font-mono text-red-600">{item.reference}</strong> · {item.name}
                  </span>
                  <span className="text-[11px] text-amber-800 shrink-0 ml-2">{item.reason}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                onClick={() => setFailedImagesWarning(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const mode = failedImagesWarning.mode;
                  setFailedImagesWarning(null);
                  await handleOpenPhotoRepairTool(true);
                  await handleStartPDFGeneration(mode);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                Auto-Reparar Fotografías y Descargar PDF
              </button>
              <button
                onClick={() => compileAndDeliverPDF(failedImagesWarning.preloaded, failedImagesWarning.mode)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
              >
                Generar PDF Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Studio Workspace: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* 1. Visual Template Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span>1. Plantilla Visual Profesional</span>
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => setOptions({ ...options, template: 'corporativo' })}
                className={`p-3 rounded-lg text-left border transition-all ${
                  options.template === 'corporativo'
                    ? 'border-red-600 bg-red-50/30 ring-1 ring-red-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Tecnológico Corporativo</span>
                  {options.template === 'corporativo' && (
                    <CheckCircle2 className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Banda superior en rojo brillante #DC2626, logo oficial de IPS TECNOLÓGICA y tarjetas con ficha técnica.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOptions({ ...options, template: 'minimalista' })}
                className={`p-3 rounded-lg text-left border transition-all ${
                  options.template === 'minimalista'
                    ? 'border-red-600 bg-red-50/30 ring-1 ring-red-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Minimalista Clean</span>
                  {options.template === 'minimalista' && (
                    <CheckCircle2 className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Fondo blanco inmaculado, divisores sutiles de precisión, insignias rojas y diseño editorial despejado.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOptions({ ...options, template: 'darkpro' })}
                className={`p-3 rounded-lg text-left border transition-all ${
                  options.template === 'darkpro'
                    ? 'border-red-600 bg-red-50/30 ring-1 ring-red-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Dark Pro Gamer / Enterprise</span>
                  {options.template === 'darkpro' && (
                    <CheckCircle2 className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Encabezado grafito oscuro #111827 con detalles de alto contraste en rojo y tarjetas de acento técnico.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Content & Structure Settings */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-red-600" />
              <span>2. Opciones de Contenido</span>
            </h3>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título del Catálogo
              </label>
              <input
                type="text"
                value={options.title}
                onChange={e => setOptions({ ...options, title: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtítulo / Línea Descriptiva
              </label>
              <input
                type="text"
                value={options.subtitle}
                onChange={e => setOptions({ ...options, subtitle: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Validity Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nota de Vigencia de Ofertas (Portada PDF)
              </label>
              <input
                type="text"
                value={options.validityText || ''}
                onChange={e => setOptions({ ...options, validityText: e.target.value })}
                placeholder="Ej. Ofertas válidas hasta fin de mes..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Scope / Selection Mode (Catálogo completo, por categoría o selección personalizada) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alcance del Catálogo PDF
              </label>
              <select
                value={options.selectionMode || 'all'}
                onChange={e => {
                  const nextMode = e.target.value as 'all' | 'category' | 'custom';
                  setOptions({
                    ...options,
                    selectionMode: nextMode,
                    categoryFilter: nextMode === 'all' ? 'Todas' : options.categoryFilter,
                    selectedProductIds:
                      nextMode === 'custom' && (!options.selectedProductIds || options.selectedProductIds.length === 0)
                        ? products.map(p => p.id)
                        : options.selectedProductIds
                  });
                  setActivePreviewPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-semibold"
              >
                <option value="all">Catálogo Completo ({products.length} productos)</option>
                <option value="category">Catálogo por Categorías</option>
                <option value="custom">Selección Personalizada de Productos</option>
              </select>
            </div>

            {/* Category Filter */}
            {options.selectionMode !== 'custom' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Filtrar por Categoría
                </label>
                <select
                  value={options.categoryFilter}
                  onChange={e => {
                    setOptions({
                      ...options,
                      categoryFilter: e.target.value,
                      selectionMode: e.target.value === 'Todas' ? 'all' : 'category'
                    });
                    setActivePreviewPage(1);
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                >
                  <option value="Todas">Todas las categorías ({products.length} productos)</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Product Checklist */}
            {options.selectionMode === 'custom' && (
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span>Seleccionados: {(options.selectedProductIds || []).length}</span>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={() => setOptions({ ...options, selectedProductIds: products.map(p => p.id) })}
                      className="text-red-600 hover:underline cursor-pointer"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setOptions({ ...options, selectedProductIds: [] })}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {products.map(prod => {
                    const checked = (options.selectedProductIds || []).includes(prod.id);
                    return (
                      <label
                        key={prod.id}
                        className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer hover:bg-white p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const current = options.selectedProductIds || [];
                            const next = e.target.checked
                              ? [...current, prod.id]
                              : current.filter(id => id !== prod.id);
                            setOptions({ ...options, selectedProductIds: next });
                            setActivePreviewPage(1);
                          }}
                          className="w-3.5 h-3.5 text-red-600 rounded"
                        />
                        <span className="font-mono text-red-600 font-bold">{prod.reference}</span>
                        <span className="truncate">{prod.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 17 Seasonal Templates Selector for PDF */}
            {seasonalTemplates.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plantilla de Fecha Especial ({seasonalTemplates.length} Ediciones Oficiales)
                </label>
                <select
                  value={options.seasonalTemplate?.id || ''}
                  onChange={e => {
                    const tpl = seasonalTemplates.find(t => t.id === e.target.value);
                    setOptions({
                      ...options,
                      seasonalTemplate: tpl,
                      title: tpl?.bannerTitle?.toUpperCase() || options.title,
                      subtitle: tpl?.bannerSubtitle || options.subtitle
                    });
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-semibold"
                >
                  <option value="">Estilo Clásico del Estudio</option>
                  {seasonalTemplates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.decorativeBadge})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* PDF Layout Configuration: Products per Page, Format & Orientation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Productos / Pág.
                </label>
                <select
                  value={options.productsPerPage || 12}
                  onChange={e => {
                    setOptions({
                      ...options,
                      productsPerPage: Number(e.target.value) as 4 | 6 | 8 | 12
                    });
                    setActivePreviewPage(1);
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value={4}>4 productos</option>
                  <option value={6}>6 productos</option>
                  <option value={8}>8 productos</option>
                  <option value={12}>12 productos</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Formato Papel
                </label>
                <select
                  value={options.paperFormat || 'letter'}
                  onChange={e =>
                    setOptions({
                      ...options,
                      paperFormat: e.target.value as 'letter' | 'a4'
                    })
                  }
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value="letter">Formato Carta</option>
                  <option value="a4">Formato A4</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Orientación
                </label>
                <select
                  value={options.orientation || 'portrait'}
                  onChange={e =>
                    setOptions({
                      ...options,
                      orientation: e.target.value as 'portrait' | 'landscape'
                    })
                  }
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value="portrait">Vertical</option>
                  <option value="landscape">Horizontal</option>
                </select>
              </div>
            </div>

            {/* Configurable Page Margins (8mm to 16mm) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Márgenes de Página (Sin desborde ni superposición)
              </label>
              <select
                value={options.marginMm || 10}
                onChange={e => setOptions({ ...options, marginMm: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-mono"
              >
                <option value={8}>8 mm (Área máxima de tarjetas)</option>
                <option value={10}>10 mm (Estándar corporativo recomendado)</option>
                <option value={12}>12 mm (Margen editorial amplio)</option>
                <option value={15}>15 mm (Margen para encuadernación / impresión)</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={options.includeCover}
                  onChange={e => {
                    setOptions({ ...options, includeCover: e.target.checked });
                    setActivePreviewPage(1);
                  }}
                  className="w-3.5 h-3.5 text-red-600 rounded border-slate-300 focus:ring-red-500"
                />
                <span className="font-medium">Incluir Portada Corporativa con Logo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(options.includeIndex)}
                  onChange={e => {
                    setOptions({ ...options, includeIndex: e.target.checked });
                    setActivePreviewPage(1);
                  }}
                  className="w-3.5 h-3.5 text-red-600 rounded border-slate-300 focus:ring-red-500"
                />
                <span className="font-medium">Incluir Índice Opcional de Categorías y Productos</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(options.includeBackCover)}
                  onChange={e => {
                    setOptions({ ...options, includeBackCover: e.target.checked });
                    setActivePreviewPage(1);
                  }}
                  className="w-3.5 h-3.5 text-red-600 rounded border-slate-300 focus:ring-red-500"
                />
                <span className="font-medium">Incluir Página Final de Contacto Comercial</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={options.onlyActive}
                  onChange={e => {
                    setOptions({ ...options, onlyActive: e.target.checked });
                    setActivePreviewPage(1);
                  }}
                  className="w-3.5 h-3.5 text-red-600 rounded border-slate-300 focus:ring-red-500"
                />
                <span>Solo incluir productos publicados (activos)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={options.includeTermsFooter}
                  onChange={e => setOptions({ ...options, includeTermsFooter: e.target.checked })}
                  className="w-3.5 h-3.5 text-red-600 rounded border-slate-300 focus:ring-red-500"
                />
                <span>Incluir cláusula tributaria y vigencia en pie de página</span>
              </label>
            </div>
          </div>

          {/* 3. Page Metrics Summary Card */}
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-bold tracking-wider uppercase text-red-400">
              Métricas de Paginación ({options.paperFormat === 'a4' ? 'Formato A4' : 'Formato Carta'} ·{' '}
              {options.orientation === 'landscape' ? 'Horizontal' : 'Vertical'})
            </span>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 block text-[11px]">Productos Incluidos</span>
                <span className="text-base font-bold text-white font-mono">{filteredProducts.length}</span>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 block text-[11px]">Total Páginas</span>
                <span className="text-base font-bold text-red-400 font-mono">
                  {totalPages} {totalPages === 1 ? 'Página' : 'Páginas'}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-300 space-y-1 pt-1">
              <p>• {options.includeCover ? '1 Portada Corporativa con Logo' : 'Sin portada'}</p>
              {options.includeIndex && <p>• 1 Página de Índice por Categorías</p>}
              <p>• {interiorPages} Páginas de Productos ({activeProductsPerPage} productos por página)</p>
              {options.includeBackCover && <p>• 1 Página Final de Contacto Comercial</p>}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Letter Sheet Preview (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Paginator Controller */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-red-600" />
              <span className="text-xs font-bold text-slate-900">
                Vista Previa de Hoja Carta: Página {activePreviewPage} de {totalPages}
              </span>
              <span className="text-[11px] text-slate-400">
                {isCoverActive ? '(Portada Oficial)' : `(Página Interior con ${currentInteriorProducts.length} productos)`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={activePreviewPage <= 1}
                onClick={() => setActivePreviewPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                {activePreviewPage} / {totalPages}
              </span>

              <button
                disabled={activePreviewPage >= totalPages}
                onClick={() => setActivePreviewPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Letter Format Simulated Canvas */}
          <div className="bg-slate-200/80 p-4 sm:p-6 rounded-xl flex justify-center overflow-x-auto shadow-inner">
            <div
              className="bg-white shadow-xl rounded-sm w-full max-w-[760px] aspect-[8.5/11] p-6 sm:p-8 flex flex-col justify-between border border-slate-300 relative select-none"
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
              }}
            >
              {/* If Cover Page is active */}
              {isCoverActive ? (
                <div className="h-full flex flex-col justify-between">
                  <div>
                    <div className="h-2.5 bg-red-600 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-6" />

                    <div className="bg-slate-900 text-white p-6 rounded-lg mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        {company.logoUrl ? (
                          <img
                            src={company.logoUrl}
                            alt={company.name}
                            className="w-12 h-12 rounded bg-white p-1 object-contain shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-red-600 rounded text-white font-extrabold flex items-center justify-center text-sm">
                            IPS
                          </div>
                        )}
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-white">
                            {company.name || 'IPS TECNOLÓGICA'}
                          </h2>
                          <p className="text-[11px] text-slate-300">
                            {company.slogan}
                          </p>
                          {company.nit && (
                            <p className="text-[10px] text-red-400 font-mono">
                              NIT: {company.nit}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="h-0.5 bg-red-600/80 w-full mb-2" />
                      <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                        CATÁLOGO OFICIAL Y LISTA DE PRECIOS · COLOMBIA
                      </span>
                    </div>

                    {/* Hero Title Box */}
                    <div className="border border-slate-200 bg-slate-50 p-6 rounded-lg border-l-4 border-l-red-600">
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                        {options.title}
                      </h1>
                      <p className="text-xs font-semibold text-slate-600 mt-2">
                        {options.subtitle}
                      </p>
                      <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                        {company.description}
                      </p>

                      {options.validityText && (
                        <div className="mt-4 p-2.5 rounded bg-red-50 border border-red-200 text-[10px] text-red-700 font-semibold">
                          VIGENCIA: {options.validityText}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 mt-5">
                        <div className="bg-white p-3 rounded border border-slate-200 text-center">
                          <span className="text-base font-black text-red-600 font-mono block">
                            {filteredProducts.length}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">Equipos Catalogados</span>
                        </div>
                        <div className="bg-white p-3 rounded border border-slate-200 text-center">
                          <span className="text-sm font-bold text-slate-900 block">GARANTÍA</span>
                          <span className="text-[10px] text-slate-500 font-medium">Directa 12-36 Meses</span>
                        </div>
                        <div className="bg-white p-3 rounded border border-slate-200 text-center">
                          <span className="text-sm font-bold text-slate-900 block">COLOMBIA</span>
                          <span className="text-[10px] text-slate-500 font-medium">Despachos Asegurados</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cover Footer */}
                  <div className="bg-slate-900 text-white p-5 rounded-lg text-xs space-y-2 mt-6">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                      CANALES DE ATENCIÓN Y ASESORÍA DIRECTA:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                      <div>
                        <p>PBX: {company.phone}</p>
                        <p>WhatsApp: {company.whatsapp}</p>
                        <p>Email: {company.email}</p>
                      </div>
                      <div>
                        <p>Ciudad: {company.city}</p>
                        <p>Dirección: {company.address}</p>
                        <p>Web: {company.website}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Interior Page (3 cols x 4 rows = 12 products) */
                <div className="h-full flex flex-col justify-between">
                  {/* Interior Header */}
                  <div>
                    <div
                      className={`h-1 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-3 ${
                        options.template === 'darkpro' ? 'bg-slate-900' : 'bg-red-600'
                      }`}
                    />

                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                      <div className="flex items-center gap-2">
                        {company.logoUrl && (
                          <img
                            src={company.logoUrl}
                            alt={company.name}
                            className="w-6 h-6 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs tracking-tight text-slate-900">
                              {company.name}
                            </span>
                            <span className="text-[10px] text-red-600 font-bold">· CATÁLOGO</span>
                          </div>
                          <span className="text-[9px] text-slate-400 block">
                            {company.slogan}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-800 block">
                          {options.title}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          WhatsApp: {company.whatsapp} · PBX: {company.phone}
                        </span>
                      </div>
                    </div>

                    {/* Configurable Grid (4, 6, 8, or 12 products per page) */}
                    <div
                      className={`grid gap-2.5 ${
                        activeProductsPerPage === 4 || activeProductsPerPage === 6 || activeProductsPerPage === 8
                          ? 'grid-cols-2'
                          : 'grid-cols-3'
                      }`}
                    >
                      {currentInteriorProducts.map(p => {
                        const hasImg = p.images && p.images.length > 0;
                        const promo = p.activePromotion;
                        return (
                          <div
                            key={p.id}
                            className={`border rounded p-2 flex flex-col justify-between ${
                              promo
                                ? 'bg-red-50/20 border-red-300'
                                : options.template === 'darkpro'
                                ? 'bg-slate-50 border-slate-300'
                                : 'bg-white border-slate-200'
                            }`}
                            style={{ height: activeProductsPerPage <= 6 ? '148px' : '112px' }}
                          >
                            <div>
                              {/* Photo / Thumbnail */}
                              <div className="w-full h-11 bg-white rounded flex items-center justify-center overflow-hidden mb-1 relative border border-slate-100">
                                {hasImg ? (
                                  <img
                                    src={p.images[0]}
                                    alt={p.name}
                                    className="w-full h-full object-contain p-0.5"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-[8px] font-mono text-slate-400 font-bold">
                                    IPS TECH
                                  </span>
                                )}
                                <span className="absolute top-0.5 left-0.5 bg-slate-900 text-white font-mono text-[6.5px] px-1 rounded">
                                  {p.reference}
                                </span>
                                {promo && (
                                  <span className="absolute top-0.5 right-0.5 bg-red-600 text-white font-bold text-[6.5px] px-1 rounded flex items-center gap-0.5">
                                    <Tag className="w-2 h-2" />-{promo.savingsPercentage}%
                                  </span>
                                )}
                              </div>

                              {/* Title */}
                              <h4 className="text-[9px] font-bold text-slate-900 leading-tight line-clamp-1">
                                {p.name}
                              </h4>

                              {/* Short Description */}
                              <p className="text-[7px] text-slate-500 line-clamp-2 leading-tight mt-0.5">
                                {p.shortDescription}
                              </p>
                            </div>

                            {/* Price Badge */}
                            <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                              {promo ? (
                                <div className="flex items-baseline gap-1">
                                  <span className="text-[7px] text-slate-400 line-through font-mono">
                                    {formatCOP(p.priceCOP)}
                                  </span>
                                  <span className="text-[8.5px] font-extrabold text-red-600 font-mono tabular-nums">
                                    {formatCOP(promo.promotionalPriceCOP)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[8.5px] font-extrabold text-slate-900 font-mono tabular-nums">
                                  {formatCOP(p.priceCOP)}
                                </span>
                              )}
                              <span className="text-[6.5px] text-slate-500 font-normal">
                                {promo
                                  ? 'Oferta'
                                  : company.taxConfig?.ivaEnabled && company.taxConfig?.showIvaLabelInCatalog
                                  ? company.taxConfig.priceLabelText
                                  : 'Precio COP'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interior Footer (Strictly tax-compliant) */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-500">
                    <div>
                      <span>{company.name} · PBX: {company.phone} · {company.email}</span>
                      <p className="text-[7px] text-slate-400">
                        {company.taxConfig?.ivaEnabled && company.taxConfig?.showIvaLabelInCatalog
                          ? company.taxConfig.invoiceFooterText
                          : company.taxConfig?.invoiceFooterText ||
                            'Precios en pesos colombianos (COP). Persona natural no responsable de IVA. Garantía legal oficial.'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-800 text-[9px] block">
                        Página {activePreviewPage} de {totalPages}
                      </span>
                      <span className="text-red-600">{company.website}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share Catalog Modal */}
      <ShareCatalogModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        company={company}
        companyName={company.name}
        categories={categories}
        initialCategory={options.categoryFilter}
      />
    </div>
  );
};
