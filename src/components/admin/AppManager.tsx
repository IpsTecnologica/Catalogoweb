import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { AppReleaseConfig } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getPublicCatalogUrl, formatBogotaDateTime } from '../../utils/formatters';
import {
  Smartphone,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Download,
  Save,
  Terminal,
  ShieldCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface AppManagerProps {
  onConfigUpdated?: () => void;
}

export const AppManager: React.FC<AppManagerProps> = ({ onConfigUpdated }) => {
  const { notify, isAdmin } = useAuth();

  const [config, setConfig] = useState<AppReleaseConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingApk, setUploadingApk] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Form fields
  const [versionName, setVersionName] = useState('1.0.0');
  const [versionCode, setVersionCode] = useState(1);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [externalApkUrl, setExternalApkUrl] = useState('');

  const publicUrl = getPublicCatalogUrl();

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.getAppConfig();
      setConfig(data);
      setVersionName(data.versionName || '1.0.0');
      setVersionCode(data.versionCode || 1);
      setReleaseNotes(data.releaseNotes || '');
      setShowUpdateBanner(Boolean(data.showUpdateBanner));
      setExternalApkUrl(
        data.apkDownloadUrl && data.apkDownloadUrl.startsWith('http') ? data.apkDownloadUrl : ''
      );
    } catch (err: any) {
      notify(err.message || 'Error cargando configuración de la App.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    QRCode.toDataURL(publicUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#111827', light: '#FFFFFF' }
    })
      .then(url => setQrDataUrl(url))
      .catch(() => {});
  }, [publicUrl]);

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const updates: Partial<AppReleaseConfig> = {
        versionName: versionName.trim() || '1.0.0',
        versionCode: Math.max(1, Number(versionCode) || 1),
        releaseNotes: releaseNotes.trim(),
        showUpdateBanner
      };

      if (externalApkUrl.trim()) {
        if (!/^https?:\/\/.+\.apk(\?.*)?$/i.test(externalApkUrl.trim())) {
          notify('El enlace externo de APK debe ser una URL válida terminada en .apk', 'error');
          setSaving(false);
          return;
        }
        updates.apkDownloadUrl = externalApkUrl.trim();
        updates.apkAvailable = true;
      } else if (config?.apkDownloadUrl?.startsWith('http')) {
        updates.apkDownloadUrl = null;
        updates.apkAvailable = false;
      }

      const res = await api.updateAppConfig(updates);
      setConfig(res.appConfig);
      notify(res.message || 'Configuración de la App actualizada correctamente.', 'success');
      if (onConfigUpdated) onConfigUpdated();
    } catch (err: any) {
      notify(err.message || 'Error guardando configuración de la App.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.apk')) {
      notify('Formato inválido. Solo se permiten archivos de instalación Android (.apk).', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 45 * 1024 * 1024) {
      notify('El archivo APK supera el límite de carga directa (45 MB).', 'error');
      e.target.value = '';
      return;
    }

    setUploadingApk(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo APK'));
        reader.readAsDataURL(file);
      });

      const res = await api.uploadApk(
        file.name,
        base64,
        versionName.trim() || '1.0.0',
        Math.max(1, Number(versionCode) || 1),
        releaseNotes.trim()
      );
      setConfig(res.appConfig);
      notify(res.message, 'success');
      if (onConfigUpdated) onConfigUpdated();
    } catch (err: any) {
      notify(err.message || 'Error subiendo archivo APK.', 'error');
    } finally {
      setUploadingApk(false);
      e.target.value = '';
    }
  };

  const handleRemoveApk = async () => {
    setUploadingApk(true);
    try {
      const res = await api.removeApk();
      setConfig(res.appConfig);
      setExternalApkUrl('');
      notify(res.message || 'APK despublicado correctamente.', 'info');
      if (onConfigUpdated) onConfigUpdated();
    } catch (err: any) {
      notify(err.message || 'Error al retirar APK.', 'error');
    } finally {
      setUploadingApk(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
        Cargando módulo de Gestión de la App...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Gestión de la App Instalable (PWA y APK Android)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ID del paquete: <code className="font-mono text-red-600 font-bold">co.ipstecnologica.catalogo</code> · Nombre corto: <strong>IPS Tech</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
              config?.apkAvailable
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {config?.apkAvailable ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>APK Android Publicado (v{config.versionName})</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>PWA Activa · APK Pendiente de Subir</span>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Version & APK Upload Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* APK Package Upload Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  1. Publicación de Archivo APK Android (.apk)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  El botón público «DESCARGAR APK ANDROID» solo se muestra cuando existe un archivo APK real y verificado.
                </p>
              </div>
            </div>

            {config?.apkAvailable && config?.apkDownloadUrl ? (
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Archivo APK Verificado y Activo</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-mono break-all">
                    {config.apkFileName || config.apkDownloadUrl}
                    {config.apkFileSizeMB ? ` (${config.apkFileSizeMB} MB)` : ''}
                  </p>
                  {config.apkUpdatedAt && (
                    <p className="text-[10px] text-emerald-700">
                      Publicado: {formatBogotaDateTime(config.apkUpdatedAt)} por {config.updatedBy}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={config.apkDownloadUrl}
                    download={config.apkFileName || 'ips-tecnologica.apk'}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Probar Descarga</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleRemoveApk}
                    disabled={uploadingApk}
                    className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 transition cursor-pointer"
                    title="Retirar APK y ocultar botón público"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
                <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block">Sin archivo APK cargado actualmente</strong>
                  <span>
                    Por seguridad, el botón «DESCARGAR APK ANDROID» permanece oculto en el catálogo público hasta que subas un archivo <code>.apk</code> real o configures un enlace verificado. La instalación directa como App Web (PWA) está activa y disponible para todos los clientes.
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <label className="w-full py-3 px-4 border-2 border-dashed border-slate-300 hover:border-red-500 rounded-xl bg-slate-50 hover:bg-red-50/30 transition flex items-center justify-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                {uploadingApk ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                    <span>Subiendo y verificando paquete APK...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-red-600" />
                    <span>Subir Archivo .APK Compilado desde tu Equipo</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".apk,application/vnd.android.package-archive"
                  onChange={handleApkFileUpload}
                  disabled={uploadingApk}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Version & Release Notes Form */}
          <form
            onSubmit={handleSaveMetadata}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900">
              2. Versión Publicada y Aviso de Actualización
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Versión Pública (versionName)
                </label>
                <input
                  type="text"
                  value={versionName}
                  onChange={e => setVersionName(e.target.value)}
                  placeholder="Ej. 1.0.0"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código de Compilación (versionCode)
                </label>
                <input
                  type="number"
                  min={1}
                  value={versionCode}
                  onChange={e => setVersionCode(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enlace Externo de Descarga APK (Opcional, si está alojado en servidor externo .apk)
              </label>
              <input
                type="url"
                value={externalApkUrl}
                onChange={e => setExternalApkUrl(e.target.value)}
                placeholder="https://.../ips-tecnologica.apk"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Notas de la Versión / Novedades para los Clientes
              </label>
              <textarea
                rows={3}
                value={releaseNotes}
                onChange={e => setReleaseNotes(e.target.value)}
                placeholder="Describe las mejoras de esta versión..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={showUpdateBanner}
                onChange={e => setShowUpdateBanner(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
              />
              <span className="text-xs font-semibold text-slate-800">
                Mostrar aviso «Nueva versión disponible» en la sección pública de descarga
              </span>
            </label>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : 'Guardar Configuración de la App'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: QR Code & Capacitor Build Guide (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Official QR Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <QrCode className="w-4 h-4 text-red-600" />
              <span>Código QR Oficial de Instalación</span>
            </div>

            <div className="w-48 h-48 mx-auto bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-center">
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR Instalación IPS TECNOLÓGICA" className="w-full h-full object-contain" />
              )}
            </div>

            <p className="text-xs text-slate-600">
              Imprime este código QR en mostradores, facturas o catálogos físicos para que tus clientes instalen la App de <strong>IPS TECNOLÓGICA</strong> escaneando con su cámara.
            </p>

            <div className="flex items-center gap-2">
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download="QR_OFICIAL_IPS_TECNOLOGICA.png"
                  className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-red-400" />
                  <span>Descargar QR (PNG)</span>
                </a>
              )}
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1"
              >
                <span>Abrir Web</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Capacitor / Android Studio Quick Build Instructions */}
          <div className="bg-slate-900 text-white rounded-xl p-6 space-y-3 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
              <Terminal className="w-4 h-4" />
              <span>Compilación Android Studio (Capacitor)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              El proyecto incluye <code>capacitor.config.json</code> y <code>ANDROID_APK_GUIDE.md</code> preconfigurados con el paquete <code className="text-white font-mono">co.ipstecnologica.catalogo</code>.
            </p>
            <div className="bg-slate-950 p-3 rounded-lg font-mono text-[11px] text-slate-300 space-y-1 overflow-x-auto border border-slate-800">
              <div>npm run build</div>
              <div>npx cap add android</div>
              <div>npx cap sync android</div>
              <div>npx cap open android</div>
            </div>
            <p className="text-[11px] text-slate-400">
              En Android Studio selecciona <strong>Build → Build Bundle(s) / APK(s) → Build APK(s)</strong> y sube el archivo <code>.apk</code> resultante en el panel izquierdo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
