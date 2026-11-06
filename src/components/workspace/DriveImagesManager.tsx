import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DriveMediaAsset, DriveOfficialFolderPath, Product } from '../../types';
import { formatDate } from '../../utils/formatters';
import {
  HardDrive,
  FolderOpen,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Search,
  ShieldCheck,
  Image as ImageIcon,
  Globe,
  FileCode,
  Download,
  Copy
} from 'lucide-react';

const OFFICIAL_9_DRIVE_FOLDERS: Array<{
  path: DriveOfficialFolderPath;
  shortName: string;
  description: string;
}> = [
  {
    path: 'IPS TECNOLÓGICA / PRODUCTOS',
    shortName: 'PRODUCTOS',
    description: 'Fotografías principales y adicionales de productos nuevos, repuestos y remanufacturados.'
  },
  {
    path: 'IPS TECNOLÓGICA / CATEGORÍAS',
    shortName: 'CATEGORÍAS',
    description: ' Portadas y recursos gráficos para las categorías del catálogo.'
  },
  {
    path: 'IPS TECNOLÓGICA / BANNERS',
    shortName: 'BANNERS',
    description: 'Banners promocionales destacados y cabeceras del portal web.'
  },
  {
    path: 'IPS TECNOLÓGICA / PLANTILLAS PDF',
    shortName: 'PLANTILLAS PDF',
    description: 'Fondos vectoriales y recursos del Diseñador de Catálogos y Plantillas PDF.'
  },
  {
    path: 'IPS TECNOLÓGICA / TEMPORADAS',
    shortName: 'TEMPORADAS',
    description: 'Artes y fondos para las 17 ediciones y fechas especiales.'
  },
  {
    path: 'IPS TECNOLÓGICA / CATÁLOGOS GENERADOS',
    shortName: 'CATÁLOGOS GENERADOS',
    description: 'Documentos PDF exportados en formato Carta y A4.'
  },
  {
    path: 'IPS TECNOLÓGICA / CLIENTES',
    shortName: 'CLIENTES',
    description: 'Soportes, cotizaciones y documentos asociados a clientes.'
  },
  {
    path: 'IPS TECNOLÓGICA / DOCUMENTOS',
    shortName: 'DOCUMENTOS',
    description: 'Políticas Ley 1480, órdenes de servicio SRV, garantías y cuentas de cobro.'
  },
  {
    path: 'IPS TECNOLÓGICA / COPIAS DE SEGURIDAD',
    shortName: 'COPIAS DE SEGURIDAD',
    description: 'Respaldos completos del sistema (JSON + imágenes reales embebidas).'
  }
];

export const DriveImagesManager: React.FC = () => {
  const { notify, isAdmin } = useAuth();
  const [assets, setAssets] = useState<DriveMediaAsset[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [auditReport, setAuditReport] = useState<{
    totalProducts: number;
    verifiedProducts: number;
    repairedFromVault: number;
    brokenProducts: Array<{ productId: string; reference: string; name: string; brokenUrl: string }>;
    folderSummary: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductForUpload, setSelectedProductForUpload] = useState<string>('');
  const [targetFolderForUpload, setTargetFolderForUpload] = useState<string>('product_main');
  const [uploadErrors, setUploadErrors] = useState<
    Array<{ id: string; fileName: string; productRef?: string; error: string; date: string; file?: File }>
  >([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [replacingProductRef, setReplacingProductRef] = useState<string | null>(null);

  const loadVaultData = async () => {
    setLoading(true);
    try {
      const [vaultRes, verifyRes, prodsRes] = await Promise.all([
        api.getDriveAssets().catch(() => ({ assets: [] })),
        api.verifyDriveProductImages().catch(() => null),
        api.getProducts().catch(() => [])
      ]);
      setAssets(Array.isArray(vaultRes.assets) ? vaultRes.assets : []);
      if (verifyRes) {
        setAuditReport({
          totalProducts: verifyRes.totalProducts,
          verifiedProducts: verifyRes.healthyImages,
          repairedFromVault: verifyRes.rehydratedCount,
          brokenProducts: (verifyRes.details || [])
            .filter(d => d.status === 'MISSING' || d.status === 'missing')
            .map(d => ({
              productId: d.productId,
              reference: d.reference,
              name: d.productName || d.name || d.reference,
              brokenUrl: d.imageUrl
            })),
          folderSummary: {}
        });
      }
      setProducts(Array.isArray(prodsRes) ? prodsRes : []);
    } catch (err: any) {
      notify(err.message || 'Error cargando gestor de imágenes de Google Drive.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVaultData();
  }, []);

  const handleRunVerifyAndRepair = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyDriveProductImages();
      setAuditReport({
        totalProducts: res.totalProducts,
        verifiedProducts: res.healthyImages,
        repairedFromVault: res.rehydratedCount,
        brokenProducts: (res.details || [])
          .filter(d => d.status === 'MISSING' || d.status === 'missing')
          .map(d => ({
            productId: d.productId,
            reference: d.reference,
            name: d.productName || d.name || d.reference,
            brokenUrl: d.imageUrl
          })),
        folderSummary: {}
      });
      await loadVaultData();
      notify(
        `Verificación completada: ${res.healthyImages || 0} productos con imágenes permanentes activas (${res.rehydratedCount || 0} restauradas).`,
        'success'
      );
    } catch (err: any) {
      notify(err.message || 'Error al verificar imágenes en Google Drive.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleUploadFile = async (file: File, productRefOverride?: string) => {
    setUploading(true);
    const prodRef = productRefOverride || selectedProductForUpload || undefined;
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.readAsDataURL(file);
      });

      const uploaded = await api.uploadImage(
        file.name,
        dataBase64,
        false,
        prodRef,
        undefined,
        prodRef ? undefined : (targetFolderForUpload as any)
      );

      if (prodRef) {
        const targetProduct = products.find(p => p.reference === prodRef || p.id === prodRef);
        if (targetProduct) {
          const updatedImages = [
            uploaded.url,
            ...(targetProduct.images || []).filter(u => u !== uploaded.url)
          ];
          await api.updateProduct(targetProduct.id, {
            images: updatedImages,
            driveFileId: uploaded.driveFileId,
            driveViewUrl: uploaded.driveLink
          });
        }
      }

      notify(
        `Imagen "${file.name}" almacenada permanentemente en Google Drive (${uploaded.driveFileId || 'Verificada'}).`,
        'success'
      );
      setReplacingProductRef(null);
      await loadVaultData();
    } catch (err: any) {
      const errEntry = {
        id: `err_${Date.now()}`,
        fileName: file.name,
        productRef: prodRef,
        error: err.message || 'Error de conexión al subir imagen',
        date: new Date().toISOString(),
        file
      };
      setUploadErrors(prev => [errEntry, ...prev]);
      notify(`Error al subir "${file.name}": ${errEntry.error}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRetryFailedUpload = async (errItem: {
    id: string;
    fileName: string;
    productRef?: string;
    file?: File;
  }) => {
    if (errItem.file) {
      setUploadErrors(prev => prev.filter(e => e.id !== errItem.id));
      await handleUploadFile(errItem.file, errItem.productRef);
    } else {
      await handleRunVerifyAndRepair();
      setUploadErrors(prev => prev.filter(e => e.id !== errItem.id));
    }
  };

  const handleCreateMediaBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await api.createSystemBackup({
        type: 'manual',
        moduleScope: 'completo',
        notes: 'Respaldo completo desde GESTIÓN DE IMÁGENES GOOGLE DRIVE (incluye fotografías y metadatos Drive)'
      });
      notify(res.message || 'Copia de seguridad completa creada en Google Drive.', 'success');
    } catch (err: any) {
      notify(err.message || 'Error creando copia de seguridad.', 'error');
    } finally {
      setCreatingBackup(false);
    }
  };

  const totalBytes = assets.reduce((acc, a) => acc + (Number(a.sizeBytes) || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
  const freeQuotaGB = 15; // Cuota gratuita estándar de Google Drive (15 GB sin costo)
  const usedPercent = Math.min(100, Number(((totalBytes / (freeQuotaGB * 1024 * 1024 * 1024)) * 100).toFixed(3)));

  const filteredAssets = assets.filter(asset => {
    if (selectedFolder !== 'ALL') {
      const normalizedFolder = (asset.folderPath || '').toUpperCase();
      if (!normalizedFolder.includes(selectedFolder.toUpperCase())) {
        return false;
      }
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (asset.fileName || '').toLowerCase().includes(q);
      const matchRef = (asset.productReference || '').toLowerCase().includes(q);
      const matchDriveId = (asset.driveFileId || '').toLowerCase().includes(q);
      return matchName || matchRef || matchDriveId;
    }
    return true;
  });

  const publicOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ipstecnologica.com.co';

  const googleSitesPages = [
    { name: 'Inicio', url: `${publicOrigin}/`, desc: 'Portada corporativa IPS TECNOLÓGICA' },
    { name: 'Catálogo', url: `${publicOrigin}/catalogo`, desc: 'Catálogo online de productos con imágenes Drive' },
    { name: 'Servicios', url: `${publicOrigin}/#servicios`, desc: 'Portafolio de servicios y solicitud de citas' },
    { name: 'Promociones', url: `${publicOrigin}/#promociones`, desc: 'Ofertas activas y campañas vigentes' },
    { name: 'Contacto', url: `${publicOrigin}/#contacto`, desc: 'Formulario comercial CRM, citas y Google Maps' },
    { name: 'Portal de clientes', url: `${publicOrigin}/?tab=my-account`, desc: 'Pedidos, cotizaciones, garantías y rastreo de guías' },
    { name: 'Acceso administrativo', url: `${publicOrigin}/?tab=dashboard`, desc: 'Ingreso seguro por roles (campos vacíos por defecto)' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Oficial */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-red-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-300 text-[11px] font-bold uppercase tracking-wider">
              <HardDrive className="w-3.5 h-3.5" />
              Almacenamiento Permanente Verificado · Cero Pérdida a las 24 Horas
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              GESTIÓN DE IMÁGENES GOOGLE DRIVE
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Control centralizado de fotografías de productos, categorías, banners, plantillas PDF y respaldos en Google Drive. Cada imagen almacena su <code className="text-amber-300">driveFileId</code>, firma SHA-256 y respaldo binario permanente para que nunca desaparezca al cerrar sesión ni después de 24 horas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleRunVerifyAndRepair}
              disabled={verifying}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Verificando Drive...' : 'Verificar y Reparar Imágenes'}</span>
            </button>

            <button
              type="button"
              onClick={handleCreateMediaBackup}
              disabled={creatingBackup}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{creatingBackup ? 'Respaldando...' : 'Crear Copia de Seguridad Drive'}</span>
            </button>
          </div>
        </div>

        {/* Métricas de Espacio Disponible y Límites Gratuitos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 font-semibold block">Imágenes y Archivos Almacenados</span>
            <div className="flex items-baseline justify-between mt-1">
              <strong className="text-xl font-black text-white">{assets.length}</strong>
              <span className="text-[11px] text-emerald-400 font-bold">100% Permanentes</span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 font-semibold block">Productos con Fotografía Vinculada</span>
            <div className="flex items-baseline justify-between mt-1">
              <strong className="text-xl font-black text-white">
                {auditReport ? `${auditReport.verifiedProducts} / ${auditReport.totalProducts}` : `${products.length} / ${products.length}`}
              </strong>
              <span className="text-[11px] text-emerald-400 font-bold">Sin enlaces temporales</span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 font-semibold block">Espacio Utilizado / Cuota Gratuita Drive</span>
            <div className="flex items-baseline justify-between mt-1">
              <strong className="text-xl font-black text-amber-400">{totalMB} MB</strong>
              <span className="text-[11px] text-slate-400">de {freeQuotaGB} GB Gratis ({usedPercent}%)</span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 font-semibold block">Errores de Carga Pendientes</span>
            <div className="flex items-baseline justify-between mt-1">
              <strong className="text-xl font-black text-white">
                {uploadErrors.length + (auditReport?.brokenProducts?.length || 0)}
              </strong>
              <span className="text-[11px] text-emerald-400 font-bold">Auto-hidratación activa</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Estructura Oficial de 9 Carpetas en Google Drive */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-red-600" />
              <span>Estructura Oficial de Carpetas en Google Drive (Raíz: IPS TECNOLÓGICA)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Haz clic en cualquier carpeta para filtrar sus imágenes y archivos asociados.
            </p>
          </div>
          {selectedFolder !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedFolder('ALL')}
              className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
            >
              Mostrar todas las carpetas ({assets.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {OFFICIAL_9_DRIVE_FOLDERS.map(folder => {
            const count = assets.filter(a =>
              (a.folderPath || '').toUpperCase().includes(folder.shortName.toUpperCase())
            ).length;
            const isSelected = selectedFolder === folder.shortName;
            return (
              <button
                key={folder.path}
                type="button"
                onClick={() => setSelectedFolder(isSelected ? 'ALL' : folder.shortName)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20'
                    : 'bg-slate-50/70 hover:bg-white border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FolderOpen className={`w-4 h-4 shrink-0 ${isSelected ? 'text-red-600' : 'text-amber-600'}`} />
                    <span className="text-xs font-black text-slate-900">
                      IPS TECNOLÓGICA / {folder.shortName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{folder.description}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] font-bold text-slate-700 shrink-0">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Subida Directa de Imágenes desde Computador o Celular y Asociación con Producto */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-4 h-4 text-red-600" />
            <span>Subir o Cambiar Fotografía Permanente (Computador y Celular)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Asociar a Producto del Catálogo (Opcional)
              </label>
              <select
                value={selectedProductForUpload}
                onChange={e => setSelectedProductForUpload(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
              >
                <option value="">-- Archivo general de carpeta (Sin producto específico) --</option>
                {products.map(p => (
                  <option key={p.id} value={p.reference}>
                    {p.reference} · {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Carpeta Destino en Google Drive
              </label>
              <select
                value={targetFolderForUpload}
                onChange={e => setTargetFolderForUpload(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
              >
                <option value="product_main">IPS TECNOLÓGICA / PRODUCTOS (Principal)</option>
                <option value="product_additional">IPS TECNOLÓGICA / PRODUCTOS (Adicional)</option>
                <option value="banner">IPS TECNOLÓGICA / BANNERS</option>
                <option value="template">IPS TECNOLÓGICA / PLANTILLAS PDF & TEMPORADAS</option>
                <option value="pdf_catalog">IPS TECNOLÓGICA / CATÁLOGOS GENERADOS</option>
                <option value="document">IPS TECNOLÓGICA / DOCUMENTOS</option>
                <option value="client_doc">IPS TECNOLÓGICA / CLIENTES</option>
                <option value="backup">IPS TECNOLÓGICA / COPIAS DE SEGURIDAD</option>
              </select>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUploadFile(file, replacingProductRef || undefined);
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  setReplacingProductRef(null);
                  fileInputRef.current?.click();
                }}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Subiendo y verificando en Drive...' : 'Seleccionar Fotografía (PC / Móvil)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Registro de Errores de Carga y Reintento */}
      {(uploadErrors.length > 0 || (auditReport?.brokenProducts && auditReport.brokenProducts.length > 0)) && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Revisión de Errores de Carga y Reintentos</span>
            </h3>
            <button
              type="button"
              onClick={handleRunVerifyAndRepair}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
            >
              Reparar y Reintentar Todo
            </button>
          </div>
          <div className="space-y-2">
            {uploadErrors.map(err => (
              <div
                key={err.id}
                className="p-3 rounded-xl bg-white border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <strong className="text-slate-900">{err.fileName}</strong>
                  {err.productRef && <span className="ml-2 font-mono text-red-600">({err.productRef})</span>}
                  <p className="text-slate-500 text-[11px]">{err.error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRetryFailedUpload(err)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs cursor-pointer"
                >
                  Reintentar Subida
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Galería Auditada de Imágenes Almacenadas y Productos Relacionados */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-red-600" />
              <span>Imágenes Almacenadas y Productos Relacionados ({filteredAssets.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Visualización en miniatura con proporción original conservada, identificador de Drive y botón para cambiar fotografía.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por producto, archivo o ID Drive..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-red-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Cargando imágenes permanentes de Google Drive...</div>
        ) : filteredAssets.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No se encontraron imágenes para el filtro seleccionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredAssets.slice(0, 48).map(asset => {
              const relatedProduct = products.find(
                p =>
                  p.id === asset.productId ||
                  p.reference === asset.productReference ||
                  (p.images || []).includes(asset.stableUrl)
              );

              return (
                <div
                  key={asset.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden flex flex-col justify-between hover:border-red-200 transition-all"
                >
                  <div>
                    <div className="h-40 bg-white border-b border-slate-200 p-3 flex items-center justify-center relative">
                      <img
                        src={asset.stableUrl}
                        alt={asset.fileName}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain"
                      />
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Drive OK
                      </span>
                    </div>

                    <div className="p-3.5 space-y-1.5 text-xs">
                      <div className="font-mono text-[10px] text-slate-500 truncate" title={asset.driveFileId}>
                        ID Drive: <strong className="text-slate-800">{asset.driveFileId}</strong>
                      </div>
                      <div className="font-bold text-slate-900 truncate" title={asset.fileName}>
                        {asset.fileName}
                      </div>

                      {relatedProduct ? (
                        <div className="p-2 rounded-lg bg-red-50 border border-red-100 text-[11px]">
                          <span className="font-mono font-bold text-red-700 block">
                            {relatedProduct.reference}
                          </span>
                          <span className="text-slate-800 font-semibold line-clamp-1">
                            {relatedProduct.name}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 truncate">
                          Carpeta: {asset.folderPath}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>{Math.max(1, Math.round((asset.sizeBytes || 1024) / 1024))} KB</span>
                        <span>{formatDate(asset.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 pt-0 flex items-center gap-2">
                    <a
                      href={asset.stableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Ver
                    </a>
                    {isAdmin && relatedProduct && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplacingProductRef(relatedProduct.reference);
                          fileInputRef.current?.click();
                        }}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-red-600 text-white text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Cambiar Foto
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Integración con Google Sites y Google Apps Script (Sección 10) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-red-600" />
              <span>Estructura Oficial para Google Sites y Puente Google Apps Script (Cuota Gratuita)</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Enlaces directos e incrustables para publicar o integrar el portal empresarial en Google Sites sin requerir tarjeta de crédito ni servicios pagos.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% Compatible con Cuotas Gratuitas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {googleSitesPages.map(page => (
            <div key={page.name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <strong className="text-xs font-black text-slate-900">{page.name}</strong>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(page.url);
                    notify(`Enlace de "${page.name}" copiado para Google Sites.`, 'info');
                  }}
                  className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Copiar URL
                </button>
              </div>
              <p className="text-[11px] text-slate-500">{page.desc}</p>
              <code className="block text-[10px] text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 truncate">
                {page.url}
              </code>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs space-y-2">
          <div className="font-bold text-white flex items-center gap-2">
            <FileCode className="w-4 h-4 text-red-400" />
            <span>Arquitectura Gratuita sin Tarjeta de Crédito (Google Sites + Google Apps Script + Servidor Web)</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            • <strong>Qué funciona directamente en Google Sites y Google Apps Script:</strong> Páginas informativas (<em>Inicio, Catálogo, Servicios, Promociones, Contacto, Portal de clientes, Acceso administrativo</em>), lectura/escritura en las 18 hojas de Google Sheets, almacenamiento de imágenes y PDFs en las 9 carpetas de Google Drive, agendamiento en Google Calendar y enlaces gratuitos de Google Maps.
          </p>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            • <strong>Qué se integra mediante servicio gratuito externo sin tarjeta:</strong> El motor React + Express de IPS TECNOLÓGICA se incrusta en Google Sites mediante el bloque <em>«Incorporar → Por URL»</em> o enlaces directos, operando con cuentas gratuitas sin activar facturación en Google Cloud.
          </p>
        </div>
      </div>
    </div>
  );
};
