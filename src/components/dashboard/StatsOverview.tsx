import React from 'react';
import { Product } from '../../types';
import { formatCOP } from '../../utils/formatters';
import {
  Package,
  Layers,
  FileText,
  DollarSign,
  TrendingUp,
  Plus,
  ArrowRight
} from 'lucide-react';

interface StatsOverviewProps {
  products: Product[];
  categories: string[];
  onOpenCreate: () => void;
  onGoToStudio: () => void;
  onGoToPublic: () => void;
  canEdit: boolean;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  products,
  categories,
  onOpenCreate,
  onGoToStudio,
  onGoToPublic,
  canEdit
}) => {
  const activeCount = products.filter(p => p.isActive).length;
  const totalValuation = products.reduce((acc, p) => acc + (p.priceCOP || 0), 0);

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Products */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Productos
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
              {products.length}
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              {activeCount} activos
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            En base de datos compartida
          </p>
        </div>

        {/* Card 2: Categories */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Categorías
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
              {categories.length}
            </span>
            <span className="text-xs font-medium text-slate-500">
              segmentos
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Laptops, redes, servidores, audio, etc.
          </p>
        </div>

        {/* Card 3: Pages in PDF (Carta 3x4 = 12 items/page) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Páginas Catálogo (Carta)
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
              {Math.max(1, Math.ceil(activeCount / 12)) + 1}
            </span>
            <span className="text-xs font-medium text-slate-500">
              hojas (con portada)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Exactamente 12 productos por página interior
          </p>
        </div>

        {/* Card 4: Inventory Valuation */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Valor Referencial Catálogo
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-black text-red-600 font-mono tabular-nums block truncate">
              {formatCOP(totalValuation)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Sumatoria de precios oficiales en COP
          </p>
        </div>
      </div>

      {/* Quick Launch Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Estudio de Edición y Publicación de Catálogos
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Genera documentos PDF en formato Carta listos para imprenta o clientes corporativos. Cumple estrictamente con 3 columnas por 4 filas (12 productos por página).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onGoToStudio}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
          >
            <span>Abrir Generador PDF</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {canEdit && (
            <button
              onClick={onOpenCreate}
              className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Producto</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
