import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { AppReleaseConfig, CompanyProfile } from '../../types';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { getPublicCatalogUrl, createCatalogWhatsAppShareUrl } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  Smartphone,
  Download,
  QrCode,
  Share2,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Monitor,
  CheckCircle2,
  Info,
  Sparkles
} from 'lucide-react';

interface InstallAppSectionProps {
  company: CompanyProfile;
  appConfig: AppReleaseConfig | null;
}

export const InstallAppSection: React.FC<InstallAppSectionProps> = ({ company, appConfig }) => {
  const { notify } = useAuth();
  const { isInstalled, isIOS, promptInstall } = usePWAInstall();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [showManualModal, setShowManualModal] = useState(false);

  const publicUrl = getPublicCatalogUrl();

  useEffect(() => {
    if (isIOS) {
      setActiveGuideTab('ios');
    }
  }, [isIOS]);

  useEffect(() => {
    QRCode.toDataURL(publicUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR generation error:', err));
  }, [publicUrl]);

  const handleInstallClick = async () => {
    const res = await promptInstall();
    if (res === 'accepted') {
      notify('¡Aplicación de IPS TECNOLÓGICA instalada correctamente en tu dispositivo!', 'success');
    } else if (res === 'manual-instructions') {
      setShowManualModal(true);
    }
  };

  const handleCopyInstallUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      notify('Enlace de instalación copiado al portapapeles.', 'success');
      setTimeout(() => setCopied(false), 3500);
    } catch {
      const input = document.createElement('input');
      input.value = publicUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      notify('Enlace de instalación copiado.', 'success');
      setTimeout(() => setCopied(false), 3500);
    }
  };

  const whatsappShareUrl = createCatalogWhatsAppShareUrl();
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`;

  // Strict verification: Only show APK download button if a real, verified APK file exists
  const hasVerifiedApk = Boolean(appConfig?.apkAvailable && appConfig?.apkDownloadUrl);

  return (
    <section
      id="descarga-nuestra-app"
      className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden"
    >
      {/* Top corporate red bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-red-700" />

      {/* Update notice banner if enabled by admin */}
      {appConfig?.showUpdateBanner && (
        <div className="mb-6 p-3.5 rounded-xl bg-red-600/20 border border-red-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-red-400 shrink-0" />
            <div className="text-xs">
              <strong className="text-white font-bold">
                Nueva versión disponible (v{appConfig.versionName}):
              </strong>{' '}
              <span className="text-slate-200">{appConfig.releaseNotes}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-600 text-white shrink-0 self-start sm:self-auto">
            Build #{appConfig.versionCode}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: App Info, Buttons & Guide (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-red-400 mb-2">
              <Smartphone className="w-4 h-4" />
              <span>APLICACIÓN MÓVIL Y ESCRITORIO · {appConfig?.packageId || 'co.ipstecnologica.catalogo'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              DESCARGA NUESTRA APP
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed max-w-2xl">
              Lleva el catálogo oficial de <strong className="text-white">{company.name || 'IPS TECNOLÓGICA'}</strong> en tu celular o computador. Consulta productos por categoría, precios en tiempo real, promociones con cuenta regresiva y comunícate por WhatsApp con un solo toque.
            </p>
          </div>

          {/* Primary Action Buttons: INSTALAR APP (PWA) + Verified DESCARGAR APK ANDROID */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {isInstalled ? (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Aplicación instalada en este dispositivo</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-5 py-3 text-xs sm:text-sm font-extrabold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-600/25 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>INSTALAR APP</span>
              </button>
            )}

            {/* Strictly render DESCARGAR APK ANDROID only when a real, verified APK is published */}
            {hasVerifiedApk && appConfig?.apkDownloadUrl && (
              <a
                href={appConfig.apkDownloadUrl}
                download={appConfig.apkFileName || 'ips-tecnologica.apk'}
                className="px-5 py-3 text-xs sm:text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Download className="w-4 h-4" />
                <span>
                  DESCARGAR APK ANDROID (v{appConfig.versionName}
                  {appConfig.apkFileSizeMB ? ` · ${appConfig.apkFileSizeMB} MB` : ''})
                </span>
              </a>
            )}
          </div>

          {/* Step-by-step installation instructions tabs */}
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-700 pb-2.5">
              <span className="text-xs font-bold text-slate-200">
                Instrucciones rápidas de instalación:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('android')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    activeGuideTab === 'android'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700/70 text-slate-300 hover:text-white'
                  }`}
                >
                  Android
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('ios')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    activeGuideTab === 'ios'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700/70 text-slate-300 hover:text-white'
                  }`}
                >
                  iPhone / iPad
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('desktop')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    activeGuideTab === 'desktop'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700/70 text-slate-300 hover:text-white'
                  }`}
                >
                  Computador
                </button>
              </div>
            </div>

            {activeGuideTab === 'android' && (
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4">
                <li>
                  Toca el botón rojo <strong className="text-white">INSTALAR APP</strong> arriba o abre el menú de Chrome (<strong>⋮</strong>) y selecciona <strong className="text-white">«Instalar aplicación»</strong> o <strong className="text-white">«Agregar a la pantalla principal»</strong>.
                </li>
                {hasVerifiedApk ? (
                  <li>
                    Si prefieres instalar el paquete nativo Android, toca <strong className="text-emerald-400">DESCARGAR APK ANDROID</strong>, abre el archivo descargado y confirma la instalación.
                  </li>
                ) : (
                  <li>
                    La aplicación creará su icono oficial <strong className="text-white">IPS Tech</strong> en tu pantalla de inicio en segundos, sin ocupar espacio extra.
                  </li>
                )}
              </ol>
            )}

            {activeGuideTab === 'ios' && (
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4">
                <li>
                  Abre este catálogo desde el navegador <strong className="text-white">Safari</strong> en tu iPhone o iPad.
                </li>
                <li>
                  Toca el botón <strong className="text-white">Compartir</strong> (icono de cuadro con flecha hacia arriba en la barra inferior).
                </li>
                <li>
                  Desliza hacia abajo y selecciona <strong className="text-white">«Agregar a pantalla de inicio»</strong>, luego toca <strong className="text-white">Agregar</strong>.
                </li>
              </ol>
            )}

            {activeGuideTab === 'desktop' && (
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4">
                <li>
                  En Google Chrome o Microsoft Edge, haz clic en el botón <strong className="text-white">INSTALAR APP</strong> o en el icono de instalación situado al lado derecho de la barra de direcciones.
                </li>
                <li>
                  Confirma haciendo clic en <strong className="text-white">Instalar</strong> para abrir el catálogo de IPS TECNOLÓGICA en su propia ventana independiente.
                </li>
              </ol>
            )}
          </div>

          {/* Share Installation Link Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5 text-red-400" />
              <span>Compartir enlace de la App:</span>
            </span>

            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            <a
              href={facebookShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Facebook</span>
            </a>

            <button
              type="button"
              onClick={handleCopyInstallUrl}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Enlace Copiado' : 'Copiar Enlace'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Scannable QR Code Card (4 cols) */}
        <div className="lg:col-span-4 flex justify-center">
          <div className="bg-white text-slate-900 rounded-2xl p-5 shadow-xl border border-slate-200 max-w-xs w-full text-center space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              <QrCode className="w-4 h-4 text-red-600" />
              <span>Escanea para Instalar</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-center mx-auto w-48 h-48">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Código QR Catálogo IPS TECNOLÓGICA"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-xs text-slate-400 font-mono">Generando QR...</div>
              )}
            </div>

            <p className="text-[11px] text-slate-600 leading-snug">
              Apunta con la cámara de tu celular para abrir e instalar la aplicación oficial de <strong>IPS TECNOLÓGICA</strong>.
            </p>

            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download="QR_APP_IPS_TECNOLOGICA.png"
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-red-400" />
                <span>Descargar Código QR</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Modal with step-by-step instructions when native prompt is not immediately available */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Cómo Instalar la App IPS TECNOLÓGICA
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Acceso directo oficial en tu pantalla de inicio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900 block flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-red-600" />
                  <span>En Android (Chrome):</span>
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  Toca el icono de menú <strong>(⋮)</strong> en la esquina superior derecha del navegador y elige <strong>«Instalar aplicación»</strong> o <strong>«Agregar a la pantalla principal»</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900 block flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-red-600" />
                  <span>En iPhone / iPad (Safari):</span>
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  Toca el botón <strong>Compartir</strong> en la barra inferior de Safari y selecciona <strong>«Agregar a pantalla de inicio»</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900 block flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-red-600" />
                  <span>En Computador (Chrome / Edge):</span>
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  Haz clic en el icono de instalación situado en el extremo derecho de la barra de direcciones URL y confirma en <strong>Instalar</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowManualModal(false)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
