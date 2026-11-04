import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { formatCOP, formatDate, getRemainingCountdown } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ShareCatalogModal } from '../common/ShareCatalogModal';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Layers,
  Image as ImageIcon,
  Share2,
  Tag,
  Timer,
  Package
} from 'lucide-react';

interface ProductListProps {
  products: Product[];
  categories: string[];
  companyName?: string;
  onOpenCreate: () => void;
  onOpenEdit: (p: Product) => void;
  onDeleteProduct: (id: string, name: string) => void;
  onToggleStatus: (p: Product) => void;
  onOpenImportExport: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  categories,
  companyName = 'IPS TECNOLÓGICA',
  onOpenCreate,
  onOpenEdit,
  onDeleteProduct,
  onToggleStatus,
  onOpenImportExport
}) => {
  const { canEdit } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'promo'>('all');
  const [sortOrder, setSortOrder] = useState<'name' | 'price-asc' | 'price-desc' | 'newest'>('newest');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [shareProduct, setShareProduct] = useState<Product | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter products
  const filtered = products.filter(p => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.reference.toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);

    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.isActive) ||
      (statusFilter === 'inactive' && !p.isActive) ||
      (statusFilter === 'promo' && !!p.activePromotion);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort products
  const sorted = [...filtered].sort((a, b) => {
    const priceA = a.activePromotion ? a.activePromotion.promotionalPriceCOP : a.priceCOP;
    const priceB = b.activePromotion ? b.activePromotion.promotionalPriceCOP : b.priceCOP;
    if (sortOrder === 'price-asc') return priceA - priceB;
    if (sortOrder === 'price-desc') return priceB - priceA;
    if (sortOrder === 'name') return a.name.localeCompare(b.name);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const productToDelete = products.find(p => p.id === deleteConfirmId);

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Inventario de Equipos Tecnológicos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Administración de catálogo corporativo para {companyName} ({products.length} productos registrados)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenImportExport}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              <span>Importar / Exportar</span>
            </button>

            {canEdit && (
              <button
                onClick={onOpenCreate}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Producto</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, código REF, marca, características..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="Todas">Todas las Categorías ({products.length})</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="all">Estado: Todos</option>
              <option value="active">Solo Activos</option>
              <option value="inactive">Solo Inactivos</option>
              <option value="promo">En Promoción Activa</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="sm:col-span-2">
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="newest">Más recientes</option>
              <option value="price-asc">Precio: Menor a Mayor</option>
              <option value="price-desc">Precio: Mayor a Menor</option>
              <option value="name">Alfabético (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No se encontraron productos</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Ajuste los filtros de búsqueda o registre un nuevo producto tecnológico en el inventario.
          </p>
          {canEdit && (
            <button
              onClick={onOpenCreate}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Primer Producto</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(product => {
            const hasImage = product.images && product.images.length > 0;
            const promo = product.activePromotion;
            const countdown = promo ? getRemainingCountdown(promo.endAt) : null;

            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl border p-4 flex flex-col justify-between transition-colors shadow-2xs ${
                  promo && !countdown?.expired
                    ? 'border-red-300 ring-1 ring-red-500/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Photo area */}
                  <div className="relative w-full h-44 bg-slate-100 rounded-lg overflow-hidden mb-3 border border-slate-100 flex items-center justify-center">
                    {hasImage ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-contain p-2 bg-white"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <ImageIcon className="w-8 h-8 mb-1 stroke-1" />
                        <span className="text-[11px] font-medium">Sin fotografía cargada</span>
                      </div>
                    )}

                    {/* Reference badge */}
                    <div className="absolute top-2 left-2 bg-slate-900/90 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                      {product.reference}
                    </div>

                    {/* Promo badge */}
                    {promo && !countdown?.expired && (
                      <div className="absolute bottom-2 left-2 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                        <Tag className="w-3 h-3" />
                        <span>-{promo.savingsPercentage}% OFERTA</span>
                      </div>
                    )}

                    {/* Image count badge */}
                    {product.images && product.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-slate-900/75 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                        {product.images.length} fotos
                      </div>
                    )}

                    {/* Status pill button */}
                    <button
                      type="button"
                      onClick={() => canEdit && onToggleStatus(product)}
                      disabled={!canEdit}
                      title={canEdit ? 'Clic para activar/desactivar sin perder historial' : undefined}
                      className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm transition-colors ${
                        product.isActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${product.isActive ? 'bg-emerald-600' : 'bg-slate-500'}`} />
                      <span>{product.isActive ? 'Activo' : 'Inactivo'}</span>
                    </button>
                  </div>

                  {/* Clean unboxed metadata with separators */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-slate-700">{product.category}</span>
                    {product.brand && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-600">{product.brand}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <Package className="w-3 h-3" />
                      Stock: <strong>{product.stock ?? 10}</strong>
                    </span>
                  </div>

                  {/* Product Title */}
                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mb-1.5">
                    {product.name}
                  </h3>

                  {/* Short Description */}
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                    {product.shortDescription || 'Sin descripción técnica registrada.'}
                  </p>

                  {/* Active Promotion Countdown Banner */}
                  {promo && countdown && !countdown.expired && (
                    <div className="mb-3 p-2 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-red-700 font-semibold truncate">
                        <Timer className="w-3.5 h-3.5 shrink-0 text-red-600" />
                        <span className="truncate">{promo.name}</span>
                      </div>
                      <span className="font-mono font-bold text-red-700 shrink-0 ml-2">
                        {countdown.formatted}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Bar: Price & Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
                  <div>
                    {promo && !countdown?.expired ? (
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 line-through font-mono">
                            {formatCOP(product.priceCOP)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Ahorra {formatCOP(promo.savingsCOP)}
                          </span>
                        </div>
                        <span className="text-base font-extrabold text-red-600 font-mono tabular-nums block">
                          {formatCOP(promo.promotionalPriceCOP)}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                          Precio Normal
                        </span>
                        <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                          {formatCOP(product.priceCOP)}
                        </span>
                      </div>
                    )}
                    {canEdit && product.costCOP !== undefined && product.costCOP > 0 && (
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Costo: {formatCOP(product.costCOP)} · Act: {formatDate(product.updatedAt || product.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShareProduct(product)}
                      className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Compartir enlace de este producto"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => onOpenEdit(product)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar producto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(product.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Single Product Modal */}
      {shareProduct && (
        <ShareCatalogModal
          isOpen={!!shareProduct}
          onClose={() => setShareProduct(null)}
          companyName={companyName}
          product={shareProduct}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ¿Confirmar eliminación de producto?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Está a punto de eliminar de forma permanente el equipo:{' '}
              <strong className="text-slate-900">{productToDelete.name}</strong> (Ref:{' '}
              <span className="font-mono text-red-600">{productToDelete.reference}</span>). Esta acción quedará registrada en auditoría.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteProduct(productToDelete.id, productToDelete.name);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Sí, Eliminar Producto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
