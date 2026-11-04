import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Database,
  Download,
  RotateCcw,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Activity,
  Upload
} from 'lucide-react';
import { api } from '../../services/api';
import {
  BackupRecordMeta,
  BackupModuleScope,
  TrashItem,
  ConnectionsOverview
} from '../../types';
import { useAuth } from '../../context/AuthContext';

interface SystemBackupManagerProps {
  onDataRestored?: () => void;
}

const MODULE_SCOPES: Array<{ value: BackupModuleScope; label: string }> = [
  { value: 'completo', label: 'Respaldo Completo (Todos los Módulos y Configuraciones)' },
  { value: 'solo_productos', label: 'Solo Productos' },
  { value: 'solo_clientes', label: 'Solo Clientes' },
  { value: 'solo_usuarios', label: 'Solo Usuarios y Roles' },
  { value: 'solo_fotografias', label: 'Solo Fotografías de Productos' },
  { value: 'solo_catalogos', label: 'Solo Catálogos PDF' },
  { value: 'solo_documentos', label: 'Solo Documentos Corporativos y Garantías' },
  { value: 'solo_citas_ordenes', label: 'Solo Citas y Órdenes de Servicio (SRV)' },
  { value: 'productos_categorias', label: 'Módulo Agrupado: Productos y Categorías' },
  { value: 'clientes_usuarios_roles', label: 'Módulo Agrupado: Clientes, Usuarios y Roles' },
  { value: 'ventas_movimientos', label: 'Módulo Agrupado: Pedidos, Ventas e Inventario' },
  { value: 'promociones', label: 'Módulo Agrupado: Promociones Programadas' },
  { value: 'citas_ordenes_servicio', label: 'Módulo Agrupado: Citas, Órdenes SRV y Garantías' },
  { value: 'configuraciones_archivos', label: 'Módulo Agrupado: Configuración de Empresa y Catálogos' }
];

export const SystemBackupManager: React.FC<SystemBackupManagerProps> = ({ onDataRestored }) => {
  const { notify } = useAuth();

  const [connections, setConnections] = useState<ConnectionsOverview | null>(null);
  const [backups, setBackups] = useState<BackupRecordMeta[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'conexiones' | 'respaldos' | 'papelera' | 'drive-persistencia'>('respaldos');

  // Create backup form
  const [selectedScope, setSelectedScope] = useState<BackupModuleScope>('completo');
  const [selectedBackupType, setSelectedBackupType] = useState<'manual' | 'automatico_diario' | 'automatico_semanal' | 'por_modulo'>('manual');
  const [backupNotes, setBackupNotes] = useState('');
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [retryingSync, setRetryingSync] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmRestoreTarget, setConfirmRestoreTarget] = useState<BackupRecordMeta | null>(null);
  const [restoreModuleScope, setRestoreModuleScope] = useState<BackupModuleScope>('completo');
  const [confirmExternalPayload, setConfirmExternalPayload] = useState<{ fileName: string; data: any } | null>(null);

  // Google Drive Permanent Image Storage & 15-Step Persistence Test state
  const [driveVerification, setDriveVerification] = useState<any | null>(null);
  const [persistenceTestResult, setPersistenceTestResult] = useState<any | null>(null);
  const [runningDriveAction, setRunningDriveAction] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [connRes, backupsRes, trashRes, driveVerRes] = await Promise.all([
        api.getConnectionsStatus(),
        api.getBackups(),
        api.getTrashItems(),
        api.verifyDriveProductImages().catch(() => null)
      ]);
      setConnections(connRes);
      setBackups(backupsRes);
      setTrashItems(trashRes);
      if (driveVerRes) setDriveVerification(driveVerRes);
    } catch (err: any) {
      notify(err.message || 'Error al cargar estado de respaldos y conexiones.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleRunDriveVerify = async () => {
    setRunningDriveAction(true);
    try {
      const res = await api.verifyDriveProductImages();
      setDriveVerification(res);
      notify(res.message || 'Verificación de imágenes permanentes completada.', 'success');
    } catch (err: any) {
      notify(err.message || 'Error al verificar imágenes en Drive Vault.', 'error');
    } finally {
      setRunningDriveAction(false);
    }
  };

  const handleRunDriveRelink = async () => {
    setRunningDriveAction(true);
    try {
      const res = await api.relinkDriveProductImages();
      await loadAll();
      if (onDataRestored) onDataRestored();
      notify(res.message || 'Revinculación automática completada.', 'success');
    } catch (err: any) {
      notify(err.message || 'Error al revincular fotografías.', 'error');
    } finally {
      setRunningDriveAction(false);
    }
  };

  const handleRun15StepTest = async () => {
    setRunningDriveAction(true);
    try {
      const res = await api.runDrivePersistenceTest();
      setPersistenceTestResult(res);
      await loadAll();
      notify(res.summary || 'Prueba obligatoria de 15 pasos completada.', 'success');
    } catch (err: any) {
      notify(err.message || 'Error al ejecutar prueba de 15 pasos.', 'error');
    } finally {
      setRunningDriveAction(false);
    }
  };

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingBackup(true);
    try {
      const effectiveType =
        selectedScope !== 'completo' && selectedBackupType === 'manual'
          ? 'por_modulo'
          : selectedBackupType;
      const res = await api.createSystemBackup({
        type: effectiveType,
        moduleScope: selectedScope,
        notes: backupNotes.trim() || `Respaldo ${effectiveType} (${selectedScope})`
      });
      setBackupNotes('');
      await loadAll();
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al generar respaldo.', 'error');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = (backup: BackupRecordMeta) => {
    setRestoreModuleScope(backup.moduleScope || 'completo');
    setConfirmRestoreTarget(backup);
  };

  const executeConfirmedRestore = async () => {
    if (!confirmRestoreTarget) return;
    const backup = confirmRestoreTarget;
    setConfirmRestoreTarget(null);
    setRestoringId(backup.id);
    try {
      const res = await api.restoreSystemBackup(backup.id, true, restoreModuleScope);
      await loadAll();
      if (onDataRestored) onDataRestored();
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al restaurar copia de seguridad.', 'error');
    } finally {
      setRestoringId(null);
    }
  };

  const handleRestoreTrash = async (item: TrashItem) => {
    try {
      const res = await api.restoreTrashItem(item.id);
      await loadAll();
      if (onDataRestored) onDataRestored();
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al recuperar elemento.', 'error');
    }
  };

  const handleRetrySync = async () => {
    setRetryingSync(true);
    try {
      const res = await api.retrySyncQueue();
      await loadAll();
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al sincronizar cola.', 'error');
    } finally {
      setRetryingSync(false);
    }
  };

  const handleImportExternalBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setConfirmExternalPayload({ fileName: file.name, data: parsed });
      } catch (err: any) {
        notify(err.message || 'Archivo JSON de respaldo inválido.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeExternalRestore = async () => {
    if (!confirmExternalPayload) return;
    const payload = confirmExternalPayload;
    setConfirmExternalPayload(null);
    try {
      const res = await api.restoreBackup(payload.data);
      await loadAll();
      if (onDataRestored) onDataRestored();
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al restaurar archivo externo.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            Protección Total Contra Pérdida de Información y Archivos Binarios Reales
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold">
            RESPALDOS, IMÁGENES PERMANENTES Y RECUPERACIÓN
          </h2>
          <p className="text-xs text-slate-300">
            Respaldos completos con archivos embebidos (fotos, banners, logos, fondos, PDF), restauración granular por módulo y bóveda permanente Google Drive.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('respaldos')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'respaldos'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Copias de Seguridad ({backups.length})
          </button>
          <button
            onClick={() => setActiveTab('drive-persistencia')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'drive-persistencia'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Imágenes Drive & Prueba 15 Pasos
          </button>
          <button
            onClick={() => setActiveTab('conexiones')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'conexiones'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            ESTADO DE CONEXIONES
          </button>
          <button
            onClick={() => setActiveTab('papelera')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'papelera'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Papelera ({trashItems.length})
          </button>
          <button
            onClick={loadAll}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title="Refrescar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Connection Summary Bar */}
      {connections && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              Última sincronización:{' '}
              <span className="font-normal text-slate-600">
                {connections.lastSyncAt ? new Date(connections.lastSyncAt).toLocaleString('es-CO') : 'Activa'}
              </span>
            </span>
            <span className="font-bold text-slate-800">
              Último respaldo:{' '}
              <span className="font-normal text-slate-600">
                {connections.lastBackupAt ? new Date(connections.lastBackupAt).toLocaleString('es-CO') : 'Hoy'}
              </span>
            </span>
            <span className="font-bold text-slate-800">
              Operaciones pendientes en cola:{' '}
              <span className={(connections.pendingSyncCount ?? connections.pendingOperationsCount ?? 0) > 0 ? 'text-amber-600 font-extrabold' : 'text-emerald-600'}>
                {connections.pendingSyncCount ?? connections.pendingOperationsCount ?? 0}
              </span>
            </span>
          </div>

          <button
            type="button"
            disabled={retryingSync}
            onClick={handleRetrySync}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retryingSync ? 'animate-spin' : ''}`} />
            {retryingSync ? 'Sincronizando...' : 'Sincronizar Cola Ahora'}
          </button>
        </div>
      )}

      {confirmRestoreTarget && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <h4 className="text-sm font-bold text-amber-900">
              ¿Confirmas restaurar la copia de seguridad «{confirmRestoreTarget.fileName}»?
            </h4>
            <p className="text-xs text-amber-800">
              El sistema creará automáticamente un respaldo preventivo del estado actual antes de aplicar la restauración e hidratará todos los archivos e imágenes embebidas.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <label className="text-xs font-extrabold text-amber-950">
                Alcance de Restauración Granular:
              </label>
              <select
                value={restoreModuleScope}
                onChange={e => setRestoreModuleScope(e.target.value as BackupModuleScope)}
                className="px-3 py-1.5 rounded-lg border border-amber-400 bg-white text-xs font-bold text-slate-900"
              >
                {MODULE_SCOPES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmRestoreTarget(null)}
              className="px-3.5 py-2 rounded-lg border border-amber-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={executeConfirmedRestore}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
            >
              Confirmar Restauración ({restoreModuleScope})
            </button>
          </div>
        </div>
      )}

      {confirmExternalPayload && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-900">
              ¿Restaurar archivo externo «{confirmExternalPayload.fileName}»?
            </h4>
            <p className="text-xs text-amber-800">
              Se creará un respaldo preventivo automático antes de aplicar los cambios del archivo JSON.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmExternalPayload(null)}
              className="px-3.5 py-2 rounded-lg border border-amber-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={executeExternalRestore}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              Confirmar Restauración Externa
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: COPIAS DE SEGURIDAD */}
      {activeTab === 'respaldos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Backup Panel */}
          <form onSubmit={handleCreateBackup} className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 h-fit">
            <h3 className="text-base font-bold text-slate-900">Crear Copia de Seguridad Ahora</h3>
            <p className="text-xs text-slate-500">
              Genera un respaldo inmediato en el servidor, Firebase y en la carpeta <code className="font-mono text-slate-700">07_RESPALDOS_AUTOMATICOS</code> de Google Drive.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Respaldo
              </label>
              <select
                value={selectedBackupType}
                onChange={e => setSelectedBackupType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
              >
                <option value="manual">Respaldo Manual</option>
                <option value="automatico_diario">Respaldo Diario Automático</option>
                <option value="automatico_semanal">Respaldo Semanal Completo</option>
                <option value="por_modulo">Respaldo por Módulo Específico</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alcance del Respaldo
              </label>
              <select
                value={selectedScope}
                onChange={e => setSelectedScope(e.target.value as BackupModuleScope)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
              >
                {MODULE_SCOPES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nota o Motivo (Opcional)
              </label>
              <input
                type="text"
                value={backupNotes}
                onChange={e => setBackupNotes(e.target.value)}
                placeholder="Ej: Antes de actualizar lista de precios..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={creatingBackup}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              {creatingBackup ? 'Generando Respaldo...' : 'Crear Copia de Seguridad Ahora'}
            </button>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="block text-xs font-bold text-slate-700">Restaurar desde archivo JSON externo:</span>
              <label className="cursor-pointer w-full py-2 px-3 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-2">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Subir y Restaurar JSON</span>
                <input type="file" accept=".json" onChange={handleImportExternalBackup} className="hidden" />
              </label>
            </div>
          </form>

          {/* Backups History Table */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Historial de Copias de Seguridad Disponibles
              </h3>
              <a
                href="/api/backup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Snapshot Completo Actual
              </a>
            </div>

            {loading ? (
              <p className="text-xs text-slate-500 py-8 text-center">Cargando respaldos...</p>
            ) : backups.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No hay copias de seguridad registradas.</p>
            ) : (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {backups.map(b => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900">{b.fileName}</strong>
                        <span className="text-[11px] font-semibold text-blue-700">
                          • {b.type.replace(/_/g, ' ').toUpperCase()} ({b.moduleScope})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{b.notes}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span>📅 {new Date(b.createdAt).toLocaleString('es-CO')}</span>
                        <span>👤 {b.createdBy}</span>
                        <span>📦 {(b.sizeBytes / 1024).toFixed(1)} KB</span>
                        <span>
                          📊 {(b.counts || b.recordCounts)?.products ?? 0} prod • {(b.counts || b.recordCounts)?.users ?? 0} usu • {(b.counts || b.recordCounts)?.orders ?? 0} ped • {(b.counts || b.recordCounts)?.technicalServices ?? 0} SRV
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`/api/backups/${encodeURIComponent(b.id)}/download`}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Descargar
                      </a>
                      <button
                        type="button"
                        disabled={restoringId === b.id}
                        onClick={() => handleRestoreBackup(b)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {restoringId === b.id ? 'Restaurando...' : 'Restaurar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ESTADO DE CONEXIONES & COLA DE SINCRONIZACIÓN */}
      {activeTab === 'conexiones' && connections && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.services.map((srv, idx) => {
              const isConnected = srv.status === 'Conectado';
              const isError = srv.status === 'Error de sincronización';
              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">{srv.service}</h4>
                    <span
                      className={`text-xs font-bold flex items-center gap-1 ${
                        isConnected
                          ? 'text-emerald-600'
                          : isError
                          ? 'text-red-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {isConnected ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      {srv.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{srv.detail}</p>
                  {srv.lastSyncAt && (
                    <p className="text-[11px] text-slate-400">
                      Última actividad: {new Date(srv.lastSyncAt).toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Registro de Sincronización Reciente (Hoja 12 — Registro de sincronización)
            </h3>
            {(connections.syncQueue || connections.pendingOperations || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No hay operaciones registradas en la cola.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs max-h-80 overflow-y-auto">
                {(connections.syncQueue || connections.pendingOperations || []).map(op => (
                  <div key={op.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div>
                      <strong className="text-slate-900">{op.entity}</strong> — {op.action}
                      <span className="text-slate-400 ml-2">
                        ({new Date(op.createdAt).toLocaleString('es-CO')})
                      </span>
                    </div>
                    <span
                      className={`font-bold ${
                        op.status === 'sincronizado'
                          ? 'text-emerald-600'
                          : op.status === 'pendiente'
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {op.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PAPELERA DE RECUPERACIÓN */}
      {activeTab === 'papelera' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Papelera de Recuperación (Productos, Usuarios, Promociones y Órdenes Eliminadas)
            </h3>
            <p className="text-xs text-slate-500">
              Cualquier elemento eliminado se conserva aquí de forma segura para que puedas restaurarlo sin perder su historial ni sus fotografías.
            </p>
          </div>

          {trashItems.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              La Papelera está vacía. Ningún registro ha sido eliminado recientemente.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {trashItems.map(item => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase text-red-600">
                        [{item.entityType}]
                      </span>
                      <strong className="text-sm text-slate-900">{item.entityName}</strong>
                    </div>
                    <p className="text-xs text-slate-500">
                      Eliminado por {item.deletedBy} el {new Date(item.deletedAt).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestoreTrash(item)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Recuperar Elemento
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ALMACENAMIENTO PERMANENTE DE IMÁGENES EN GOOGLE DRIVE & PRUEBA DE 15 PASOS */}
      {activeTab === 'drive-persistencia' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  1. Bóveda Permanente de Imágenes (Google Drive + Servidor + Google Sheets)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Garantiza que las fotografías de productos nunca desaparezcan después de 24 horas ni tras reiniciar el servidor. Hidrata automáticamente <code className="font-mono">/public/uploads/</code> y mantiene historial de fotos reemplazadas (<code className="font-mono">archived_previous</code>).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={runningDriveAction}
                  onClick={handleRunDriveVerify}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${runningDriveAction ? 'animate-spin' : ''}`} />
                  <span>Verificar Existencia Real</span>
                </button>
                <button
                  type="button"
                  disabled={runningDriveAction}
                  onClick={handleRunDriveRelink}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revincular e Hidratar Fotos</span>
                </button>
                <button
                  type="button"
                  disabled={runningDriveAction}
                  onClick={handleRun15StepTest}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ejecutar Prueba Obligatoria (15 Pasos)</span>
                </button>
              </div>
            </div>

            {driveVerification && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                    Productos con Imagen Verificada
                  </span>
                  <strong className="text-lg font-black text-emerald-900">
                    {driveVerification.verifiedCount ?? 0} / {driveVerification.totalProducts ?? 0}
                  </strong>
                  <span className="text-[11px] text-emerald-700 block mt-0.5">
                    Hidratados automáticamente: {driveVerification.rehydratedCount ?? 0}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Activos en Bóveda Permanente
                  </span>
                  <strong className="text-lg font-black text-slate-900">
                    {driveVerification.vaultStats?.totalAssets ?? 0} archivos
                  </strong>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Activos vigentes: {driveVerification.vaultStats?.activeAssets ?? 0} • Históricos: {driveVerification.vaultStats?.archivedAssets ?? 0}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-blue-700 block">
                    12 Carpetas Oficiales en Google Drive (IPS_TECNOLOGICA_SISTEMA)
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(driveVerification.officialDriveFolders || []).map((folder: string) => (
                      <span
                        key={folder}
                        className="px-2 py-0.5 rounded bg-white border border-blue-200 text-[10px] font-mono text-blue-900"
                      >
                        {folder.replace('IPS_TECNOLOGICA_SISTEMA/', '')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {persistenceTestResult && (
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                      CERTIFICACIÓN DE PERSISTENCIA PERMANENTE (15 PASOS)
                    </span>
                    <h4 className="text-sm font-black">{persistenceTestResult.summary}</h4>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-extrabold">
                    {persistenceTestResult.passedSteps} / {persistenceTestResult.totalSteps} PASOS SUPERADOS
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {(persistenceTestResult.steps || []).map((st: any) => (
                    <div
                      key={st.step}
                      className="p-2.5 rounded-lg bg-slate-800/90 border border-slate-700 flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block">
                          Paso {st.step}: {st.title}
                        </strong>
                        <span className="text-[11px] text-slate-300">{st.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

