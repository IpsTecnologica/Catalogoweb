import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import {
  FileSpreadsheet,
  FolderSync,
  ExternalLink,
  RefreshCw,
  Database,
  Cloud,
  Mail,
  Calendar,
  FileText,
  MapPin,
  History,
  FolderOpen,
  ShieldCheck,
  Layers
} from 'lucide-react';

interface WorkspaceManagerProps {
  onDataSynced: () => void;
}

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({ onDataSynced }) => {
  const { notify, isAdmin } = useAuth();

  const [status, setStatus] = useState<{
    spreadsheetId: string | null;
    spreadsheetUrl: string | null;
    rootFolderUrl: string | null;
    folders?: {
      sheetsDataId?: string | null;
      photosId?: string | null;
      pdfsId?: string | null;
      logosId?: string | null;
      clientDocsId?: string | null;
      serviceOrdersId?: string | null;
      backupsId?: string | null;
      adminReportsId?: string | null;
      warrantiesId?: string | null;
    };
    lastSyncedAt: string | null;
    lastBackupAt?: string | null;
    isConfigured: boolean;
  } | null>(null);

  const [auditLogs, setAuditLogs] = useState<
    Array<{
      date: string;
      user: string;
      action: string;
      detail: string;
      result: string;
    }>
  >([]);

  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [appsScriptInfo, setAppsScriptInfo] = useState<{
    webAppUrl: string;
    enabled: boolean;
    lastSyncedAt: string | null;
    scriptCode: string;
    folders: string[];
  } | null>(null);
  const [webAppUrlInput, setWebAppUrlInput] = useState('');
  const [appsScriptEnabled, setAppsScriptEnabled] = useState(false);
  const [savingAppsScript, setSavingAppsScript] = useState(false);
  const [testingAppsScript, setTestingAppsScript] = useState(false);

  const [, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'workspace' | 'apps-script' | 'audit' | 'catalogs' | 'ecosystem'>('workspace');

  const fetchStatus = async () => {
    try {
      const s = await api.getWorkspaceStatus();
      setStatus(s);
      if (isAdmin) {
        const [logs, cats, gsInfo] = await Promise.all([
          api.getAuditLogs().catch(() => []),
          api.getCatalogs().catch(() => []),
          api.getAppsScriptInfo().catch(() => null)
        ]);
        setAuditLogs(logs);
        setCatalogs(cats);
        if (gsInfo) {
          setAppsScriptInfo(gsInfo);
          setWebAppUrlInput(gsInfo.webAppUrl || '');
          setAppsScriptEnabled(Boolean(gsInfo.enabled));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [isAdmin]);

  const handleInitWorkspace = async () => {
    setInitializing(true);
    try {
      const res = await api.initWorkspace();
      notify(res.message, 'success');
      await fetchStatus();
      onDataSynced();
    } catch (err: any) {
      notify(err.message || 'Error inicializando Google Workspace. Conéctese con Google primero.', 'error');
    } finally {
      setInitializing(false);
    }
  };

  const handleSyncWorkspace = async () => {
    setSyncing(true);
    try {
      const res = await api.syncWorkspace();
      notify(res.message, 'success');
      await fetchStatus();
      onDataSynced();
    } catch (err: any) {
      notify(err.message || 'Error sincronizando con Google Sheets.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const driveSubfolders = [
    {
      code: '01_PRODUCTOS',
      desc: 'Fotografías y fichas de productos nuevos del catálogo.',
      id: status?.folders?.photosId
    },
    {
      code: '02_REPUESTOS',
      desc: 'Imágenes y referencias de repuestos y componentes electrónicos.',
      id: status?.folders?.photosId
    },
    {
      code: '03_REMANUFACTURADOS',
      desc: 'Fotografías y certificados de equipos remanufacturados / reacondicionados.',
      id: status?.folders?.photosId
    },
    {
      code: '04_LOGOS',
      desc: 'Logotipo oficial e identidad corporativa de IPS TECNOLÓGICA.',
      id: status?.folders?.logosId
    },
    {
      code: '05_BANNERS',
      desc: 'Imágenes del banner promocional de 3 espacios del catálogo.',
      id: status?.folders?.logosId
    },
    {
      code: '06_PLANTILLAS',
      desc: 'Plantillas promocionales por temporada (14 plantillas comerciales).',
      id: status?.folders?.pdfsId
    },
    {
      code: '07_DOCUMENTOS',
      desc: 'Catálogos PDF generados en tamaño Carta (3×4) y políticas Ley 1480.',
      id: status?.folders?.pdfsId
    },
    {
      code: '08_CLIENTES',
      desc: 'Cotizaciones, comprobantes y archivos de clientes registrados.',
      id: status?.folders?.clientDocsId
    },
    {
      code: '09_ORDENES_DE_SERVICIO',
      desc: 'Órdenes de servicio técnico en PDF (SRV) y evidencias fotográficas.',
      id: status?.folders?.serviceOrdersId
    },
    {
      code: '10_GARANTIAS',
      desc: 'Certificados y casos de garantía de equipos, repuestos y servicios.',
      id: status?.folders?.warrantiesId
    },
    {
      code: '11_RESPALDOS',
      desc: 'Respaldos automáticos diarios, semanales, manuales y por módulo.',
      id: status?.folders?.backupsId
    }
  ];

  const sheetTabsList = [
    '1. Productos',
    '2. Categorías',
    '3. Clientes',
    '4. Usuarios y roles',
    '5. Pedidos y ventas',
    '6. Promociones',
    '7. Servicios técnicos',
    '8. Citas y agendamientos',
    '9. Historial de cambios',
    '10. Configuración de la empresa',
    '11. Inventario y movimientos',
    '12. Registro de sincronización'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Arquitectura Oficial Google Sheets (12 Hojas) & Google Drive (9 Carpetas)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Carpeta principal <strong>IPS TECNOLÓGICA</strong> con 9 subcarpetas organizadas + Firebase Firestore + Google Calendar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncWorkspace}
            disabled={syncing}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar 12 Hojas'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleInitWorkspace}
              disabled={initializing}
              className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm disabled:opacity-50"
            >
              <FolderSync className="w-4 h-4" />
              <span>{initializing ? 'Organizando Carpetas...' : 'Crear / Verificar Estructura (01 a 09)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('workspace')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'workspace' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Hojas Sheets & 11 Carpetas Drive</span>
        </button>

        <button
          onClick={() => setActiveSubTab('apps-script')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'apps-script' ? 'bg-red-600 text-white' : 'text-red-700 bg-red-50 hover:bg-red-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Puente Gratuito Google Apps Script (Sin Tarjeta)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('catalogs')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'catalogs' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Catálogos PDF ({catalogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'audit' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Historial de Cambios ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ecosystem')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'ecosystem' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Ecosistema Google Gratuito</span>
        </button>
      </div>

      {/* SubTab: Free Google Apps Script Bridge */}
      {activeSubTab === 'apps-script' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                100% Gratuito · Sin Tarjeta de Crédito ni Facturación
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">
                Conector Google Apps Script (Google Sheets + 11 Carpetas Drive + Google Calendar)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Conecta tu cuenta de Google (`jeffervr@gmail.com`) pegando el código gratuito en{' '}
                <code>script.google.com</code> y publicándolo como Aplicación Web.
              </p>
            </div>
            {appsScriptInfo?.scriptCode && (
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([appsScriptInfo.scriptCode], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'IPS_TECNOLOGICA_GoogleAppsScript_Gratuito.gs';
                  a.click();
                  URL.revokeObjectURL(url);
                  notify('Archivo .gs descargado exitosamente.', 'success');
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
              >
                Descargar Script Gratuito (.gs)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  URL de la Aplicación Web de Google Apps Script (<code>https://script.google.com/macros/s/.../exec</code>)
                </label>
                <input
                  type="url"
                  value={webAppUrlInput}
                  onChange={e => setWebAppUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={appsScriptEnabled}
                  onChange={e => setAppsScriptEnabled(e.target.checked)}
                  className="rounded text-red-600"
                />
                <span className="font-bold text-slate-800">
                  Activar sincronización automática con Google Apps Script al guardar cambios
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={savingAppsScript}
                  onClick={async () => {
                    setSavingAppsScript(true);
                    try {
                      await api.saveAppsScriptConfig({
                        webAppUrl: webAppUrlInput.trim(),
                        enabled: appsScriptEnabled
                      });
                      notify('Configuración de Google Apps Script guardada.', 'success');
                      fetchStatus();
                    } catch (err: any) {
                      notify(err.message || 'Error al guardar configuración.', 'error');
                    } finally {
                      setSavingAppsScript(false);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {savingAppsScript ? 'Guardando...' : 'Guardar Configuración'}
                </button>

                <button
                  type="button"
                  disabled={testingAppsScript}
                  onClick={async () => {
                    setTestingAppsScript(true);
                    try {
                      const res = await api.testAppsScriptBridge();
                      notify(res.message, 'success');
                      fetchStatus();
                    } catch (err: any) {
                      notify(err.message || 'Error probando puente Google Apps Script.', 'error');
                    } finally {
                      setTestingAppsScript(false);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {testingAppsScript ? 'Sincronizando...' : 'Probar y Sincronizar Ahora'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Código Oficial para <code>script.google.com</code> (Crea las 11 carpetas y sincroniza hojas):
              </label>
              <textarea
                readOnly
                rows={10}
                value={appsScriptInfo?.scriptCode || 'Cargando script gratuito...'}
                className="w-full p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* SubTab 1: Workspace Sheets & Drive Status */}
      {activeSubTab === 'workspace' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card 1: Google Sheets (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 h-fit">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">01_BASE_DATOS_Y_REPORTES</h3>
                  <span className="text-[11px] text-slate-500">12 Hojas Independientes en Google Sheets</span>
                </div>
              </div>

              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Activo
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cada módulo cuenta con su hoja dedicada, encabezados fijos, ID único y sincronización controlada sin sobrescribir ni duplicar registros:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {sheetTabsList.map(tab => (
                <span
                  key={tab}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-emerald-50/70 text-emerald-800 border border-emerald-200"
                >
                  {tab}
                </span>
              ))}
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 font-mono text-[11px] border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Spreadsheet ID:</span>
                <span className="text-slate-800 font-bold truncate max-w-[200px]">
                  {status?.spreadsheetId || 'Listo para vincular con Google'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Última sincronización:</span>
                <span className="text-slate-800">
                  {status?.lastSyncedAt ? formatDate(status.lastSyncedAt) : 'En tiempo real'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Seguridad de contraseñas:</span>
                <span className="text-emerald-700 font-sans font-bold">Protegidas (No en Sheets)</span>
              </div>
            </div>

            {status?.spreadsheetUrl && (
              <a
                href={status.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Hoja de Cálculo en Google Sheets</span>
              </a>
            )}
          </div>

          {/* Card 2: Google Drive 9 Folders (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Carpeta Principal: IPS TECNOLÓGICA/
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    9 subcarpetas independientes verificadas sin duplicados
                  </span>
                </div>
              </div>

              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Estructura 01 a 09</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {driveSubfolders.map(folder => (
                <div
                  key={folder.code}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2">
                    <FolderOpen className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-mono font-bold text-slate-900 block">
                        {folder.code}
                      </span>
                      <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                        {folder.desc}
                      </p>
                    </div>
                  </div>
                  {folder.id && (
                    <a
                      href={`https://drive.google.com/drive/folders/${folder.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-blue-600 hover:underline shrink-0 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>

            {status?.rootFolderUrl && (
              <a
                href={status.rootFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Carpeta Principal «IPS TECNOLÓGICA» en Google Drive</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* SubTab 2: Catalogs in Drive */}
      {activeSubTab === 'catalogs' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Catálogos PDF Almacenados en 03_CATALOGOS_PDF
            </span>
            <span className="text-xs text-slate-500 font-mono">Total: {catalogs.length}</span>
          </div>

          {catalogs.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No hay catálogos registrados aún. En el <strong>Generador PDF</strong>, haz clic en «Guardar en Google Drive» para archivar ediciones completas en <code>03_CATALOGOS_PDF</code>.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {catalogs.map(cat => (
                <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <h4 className="font-bold text-slate-900">{cat.name}</h4>
                    <span className="text-slate-500 text-[11px]">
                      {cat.productCount} productos catalogados · {formatDate(cat.date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {cat.status}
                    </span>
                    {cat.pdfUrl && (
                      <a
                        href={cat.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Abrir PDF</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: Historial de Cambios Logs */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Historial de Cambios y Auditoría (Hoja 9: «Historial de cambios»)
            </span>
            <span className="text-xs text-slate-500 font-mono">{auditLogs.length} eventos registrados</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Los cambios administrativos se registran automáticamente en la hoja «Historial de cambios».
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">Fecha</th>
                    <th className="px-4 py-2.5">Usuario</th>
                    <th className="px-4 py-2.5">Acción</th>
                    <th className="px-4 py-2.5">Detalle</th>
                    <th className="px-4 py-2.5">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                        {formatDate(log.date)}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{log.user}</td>
                      <td className="px-4 py-2.5 font-mono text-red-600 font-bold text-[11px]">{log.action}</td>
                      <td className="px-4 py-2.5 text-slate-600">{log.detail}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          {log.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SubTab 4: Modular Google Ecosystem */}
      {activeSubTab === 'ecosystem' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase">Firebase Firestore Operativo</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sincronización en tiempo real de productos, sesiones, citas técnicas, promociones, garantías y respaldos en <code className="text-red-600">yarling-artwork-vt8c4</code>.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase">Google Calendar</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Agendamiento automático de servicios técnicos (<code className="text-blue-600">SRV-2026</code>), reprogramación y bloqueo de cruces de horario por técnico.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase">Gemini IA & WhatsApp</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Asistente inteligente conectado al inventario real, promociones vigentes y consulta de órdenes de servicio en tiempo real.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
