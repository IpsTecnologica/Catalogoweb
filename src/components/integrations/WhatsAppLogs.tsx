import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { WhatsAppCommunicationEventItem, WhatsAppCommunicationLogsResponse } from '../../types';

interface WhatsAppLogsProps {
  refreshTrigger?: number;
}

export const WhatsAppLogs: React.FC<WhatsAppLogsProps> = ({ refreshTrigger = 0 }) => {
  const [data, setData] = useState<WhatsAppCommunicationLogsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received' | 'error'>('all');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getWhatsAppCommunicationLogs({
        page,
        pageSize,
        filter
      });
      setData(response);
    } catch (err: any) {
      setError(err?.message || 'Error al consultar los eventos de comunicación de WhatsApp.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshTrigger]);

  const handleFilterChange = (nextFilter: 'all' | 'sent' | 'received' | 'error') => {
    setFilter(nextFilter);
    setPage(1);
  };

  const renderEventBadge = (item: WhatsAppCommunicationEventItem) => {
    if (item.type === 'ENVIADO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>ENVIADO</span>
        </span>
      );
    }
    if (item.type === 'RECIBIDO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">
          <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>RECIBIDO</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-red-50 text-red-800 border border-red-200 text-[11px] font-bold">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
        <span>ERROR</span>
      </span>
    );
  };

  const totalPages = data?.pagination.totalPages || 1;
  const currentPage = data?.pagination.page || 1;
  const totalItems = data?.pagination.totalItems || 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600 shrink-0" />
            <h3 className="text-base font-bold text-slate-900">
              Historial de Eventos de Comunicación WhatsApp (Últimos 20 Eventos)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Registro paginado en tiempo real de mensajes enviados, mensajes recibidos y errores de la integración con Meta WhatsApp Cloud API y Chatbot Gemini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            aria-label="Eventos por página"
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
          >
            <option value={5}>5 por página</option>
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
          </select>

          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Todos ({data?.counts.all ?? 0})
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('sent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === 'sent'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            Enviados ({data?.counts.sent ?? 0})
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('received')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === 'received'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-800'
            }`}
          >
            Recibidos ({data?.counts.received ?? 0})
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('error')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 hover:bg-red-100 text-red-800'
            }`}
          >
            Errores ({data?.counts.errors ?? 0})
          </button>
        </div>

        <span className="text-[11px] font-semibold text-slate-500">
          Mostrando {data?.items.length || 0} de {totalItems} eventos (Tope: últimos 20)
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Event List Table / Responsive Cards */}
      {loading && !data ? (
        <div className="py-10 text-center text-xs text-slate-500">
          Cargando últimos 20 eventos de comunicación de WhatsApp...
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
          No se encontraron eventos de comunicación para el filtro seleccionado.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                <th className="py-2.5 px-3">Tipo / Estado</th>
                <th className="py-2.5 px-3">Contacto / Origen</th>
                <th className="py-2.5 px-3">Mensaje o Detalle del Evento</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition align-top">
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      {renderEventBadge(item)}
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        {item.status === 'Fallido' ? (
                          <XCircle className="w-3 h-3 text-red-500" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        )}
                        {item.directionLabel}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{item.contactName}</div>
                    <div className="text-[11px] font-mono text-slate-600 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{item.phone}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{item.channel}</span>
                  </td>

                  <td className="py-3 px-3 max-w-md">
                    <p className="text-slate-800 font-medium whitespace-pre-line line-clamp-3">
                      {item.summary}
                    </p>
                    {item.detail && (
                      <span className="text-[11px] font-mono text-slate-500 block mt-1">
                        {item.detail}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                    <div className="flex items-center gap-1 font-medium text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(item.timestamp).toLocaleString('es-CO')}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="text-slate-600 font-medium">
            Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNum => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setPage(pageNum)}
                className={`w-8 h-8 rounded-lg font-bold transition cursor-pointer ${
                  pageNum === currentPage
                    ? 'bg-red-600 text-white'
                    : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
