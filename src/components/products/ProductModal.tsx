import React, { useState, useEffect } from 'react';
import { Product, ProductCondition, ProductShippingType } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatCOP } from '../../utils/formatters';
import { Upload, X, Star, AlertCircle } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit: Product | null;
  onSaved: () => void;
}

const CATEGORY_PRESETS = [
  'Portátiles y Cómputo',
  'Servidores y Redes',
  'Monitores y Pantallas',
  'Móviles y Tablets',
  'Audio y Streaming',
  'Accesorios y Periféricos',
  'Energía y Protección',
  'Almacenamiento',
  'Seguridad y Vigilancia',
  'Componentes y Hardware',
  'Impresión y Digitalización'
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSaved
}) => {
  const { notify } = useAuth();

  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [category, setCategory] = useState(CATEGORY_PRESETS[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [brand, setBrand] = useState('IPS TECNOLÓGICA');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState<ProductCondition>('Nuevo');
  const [shippingType, setShippingType] = useState<ProductShippingType>('Gratis');
  const [minStock, setMinStock] = useState<number | ''>(3);
  const [aestheticGrade, setAestheticGrade] = useState<'Grado A (Excelente)' | 'Grado B (Muy Bueno)' | 'Grado C (Funcional)'>('Grado A (Excelente)');
  const [inspectedComponentsText, setInspectedComponentsText] = useState('Placa base, SSD NVMe, Memoria RAM, Pantalla, Batería');
  const [diagnosticSummary, setDiagnosticSummary] = useState('Certificado por Laboratorio Técnico IPS TECNOLÓGICA.');
  const [remanWarrantyMonths, setRemanWarrantyMonths] = useState<number>(6);
  const [priceCOP, setPriceCOP] = useState<number | ''>(1500000);
  const [costCOP, setCostCOP] = useState<number | ''>(1100000);
  const [stock, setStock] = useState<number | ''>(15);
  const [images, setImages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setReference(productToEdit.reference);
      setShortDescription(productToEdit.shortDescription);
      if (CATEGORY_PRESETS.includes(productToEdit.category)) {
        setCategory(productToEdit.category);
        setCustomCategory('');
      } else {
        setCategory('Otro');
        setCustomCategory(productToEdit.category);
      }
      setBrand(productToEdit.brand || 'IPS TECNOLÓGICA');
      setModel(productToEdit.model || productToEdit.reference);
      setCondition(productToEdit.condition || 'Nuevo');
      setShippingType(productToEdit.shippingType || 'Gratis');
      setMinStock(productToEdit.minStock !== undefined ? productToEdit.minStock : 3);
      if (productToEdit.remanufacturedDetails) {
        setAestheticGrade(productToEdit.remanufacturedDetails.aestheticGrade as any);
        const comp = productToEdit.remanufacturedDetails.inspectedComponents;
        setInspectedComponentsText(Array.isArray(comp) ? comp.join(', ') : String(comp || ''));
        setDiagnosticSummary(productToEdit.remanufacturedDetails.diagnosticSummary || productToEdit.remanufacturedDetails.testsPerformed || '');
        setRemanWarrantyMonths(productToEdit.remanufacturedDetails.warrantyMonths || productToEdit.remanufacturedDetails.durationMonths || 6);
      }
      setPriceCOP(productToEdit.priceCOP);
      setCostCOP(productToEdit.costCOP !== undefined ? productToEdit.costCOP : Math.round(productToEdit.priceCOP * 0.75));
      setStock(productToEdit.stock !== undefined ? productToEdit.stock : 10);
      setImages(productToEdit.images || []);
      setIsActive(productToEdit.isActive);
    } else {
      setName('');
      const genRef = `IPS-EQ-${Math.floor(100 + Math.random() * 900)}`;
      setReference(genRef);
      setModel(genRef);
      setCondition('Nuevo');
      setShippingType('Gratis');
      setMinStock(3);
      setShortDescription('');
      setCategory(CATEGORY_PRESETS[0]);
      setCustomCategory('');
      setBrand('IPS TECNOLÓGICA');
      setPriceCOP(2490000);
      setCostCOP(1850000);
      setStock(15);
      setImages([]);
      setIsActive(true);
    }
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const newUploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          throw new Error(`Formato no válido (${file.name}). Solo se permiten JPG, PNG, WebP o SVG.`);
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`El archivo ${file.name} excede el límite de 10MB`);
        }

        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const uploadRes = await api.uploadImage(file.name, base64Data, false);
        newUploadedUrls.push(uploadRes.url);
      }

      setImages(prev => [...prev, ...newUploadedUrls]);
      notify(`${newUploadedUrls.length} fotografía(s) cargada(s) correctamente`, 'success');
    } catch (err: any) {
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetMainImage = (indexToMakeMain: number) => {
    if (indexToMakeMain === 0) return;
    setImages(prev => {
      const selected = prev[indexToMakeMain];
      const others = prev.filter((_, idx) => idx !== indexToMakeMain);
      return [selected, ...others];
    });
    notify('Fotografía principal actualizada', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalCategory = category === 'Otro' ? customCategory.trim() : category;

    if (!name.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }
    if (!reference.trim()) {
      setError('La referencia o código es obligatoria');
      return;
    }
    if (priceCOP === '' || isNaN(Number(priceCOP)) || Number(priceCOP) <= 0) {
      setError('El precio normal debe ser un valor numérico mayor a $0 COP');
      return;
    }
    if (costCOP !== '' && (isNaN(Number(costCOP)) || Number(costCOP) < 0)) {
      setError('El costo no puede ser negativo');
      return;
    }
    if (stock === '' || isNaN(Number(stock)) || Number(stock) < 0) {
      setError('Las existencias (stock) deben ser 0 o mayor');
      return;
    }
    if (!finalCategory) {
      setError('Seleccione o especifique una categoría');
      return;
    }

    setIsSubmitting(true);
    try {
      const warrantyPolicyId =
        condition === 'Repuesto'
          ? 'pol_garantia_repuesto'
          : condition === 'Remanufacturado'
          ? 'pol_garantia_remanufacturado'
          : 'pol_garantia_nuevo';

      const payload: Partial<Product> = {
        name: name.trim(),
        reference: reference.trim().toUpperCase(),
        model: model.trim() || reference.trim().toUpperCase(),
        condition,
        shippingType,
        warrantyPolicyId,
        shippingPolicyId: 'pol_envio_nacional',
        shortDescription: shortDescription.trim(),
        category: finalCategory,
        brand: brand.trim() || 'IPS TECNOLÓGICA',
        priceCOP: Math.round(Number(priceCOP)),
        costCOP: costCOP === '' ? 0 : Math.round(Number(costCOP)),
        stock: Math.max(0, Math.round(Number(stock))),
        minStock: minStock === '' ? 3 : Math.max(0, Math.round(Number(minStock))),
        remanufacturedDetails:
          condition === 'Remanufacturado'
            ? {
                aestheticGrade,
                inspectedComponents: inspectedComponentsText
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean),
                diagnosticSummary,
                warrantyMonths: remanWarrantyMonths
              }
            : undefined,
        images,
        isActive
      };

      if (productToEdit) {
        await api.updateProduct(productToEdit.id, payload);
        notify('Producto actualizado y publicado en el catálogo.', 'success');
      } else {
        await api.createProduct(payload);
        notify('Producto creado y agregado al inventario.', 'success');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              {productToEdit ? 'Editar Producto Tecnológico' : 'Registrar Nuevo Producto'}
            </h3>
            <p className="text-xs text-slate-400">
              Gestión completa de especificaciones, precios, inventario y fotografías
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Reference */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Referencia o Código *
              </label>
              <input
                type="text"
                required
                value={reference}
                onChange={e => setReference(e.target.value.toUpperCase())}
                placeholder="Ej. IPS-NB-005"
                className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Marca / Fabricante *
              </label>
              <input
                type="text"
                required
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="Ej. Lenovo, Dell, Cisco..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Stock */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Existencias (Unidades) *
              </label>
              <input
                type="number"
                required
                min={0}
                step={1}
                value={stock}
                onChange={e => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="15"
                className="w-full px-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre Comercial del Producto *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Servidor Blade Cloud Dual EPYC 64-Core"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Price COP */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Precio Normal Público (COP) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">$</span>
                <input
                  type="number"
                  required
                  min={1}
                  step={1000}
                  value={priceCOP}
                  onChange={e => setPriceCOP(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="2990000"
                  className="w-full pl-7 pr-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Formato catálogo: {formatCOP(Number(priceCOP) || 0)}
              </span>
            </div>

            {/* Cost COP */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Costo Interno (COP — Privado Admin)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={costCOP}
                  onChange={e => setCostCOP(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="2200000"
                  className="w-full pl-7 pr-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              {Number(priceCOP) > 0 && Number(costCOP) > 0 && (
                <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">
                  Margen estimado: {formatCOP(Number(priceCOP) - Number(costCOP))} ({Math.round(((Number(priceCOP) - Number(costCOP)) / Number(priceCOP)) * 100)}%)
                </span>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoría *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              >
                {CATEGORY_PRESETS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Otro">Otra categoría personalizada...</option>
              </select>
            </div>

            {category === 'Otro' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Especifique Categoría *
                </label>
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="Nombre de categoría"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}
          </div>

          {/* Condition, Model, Shipping Type & Min Stock (Sections 5 & 15) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Condición (Ley 1480) *
              </label>
              <select
                value={condition}
                onChange={e => setCondition(e.target.value as ProductCondition)}
                className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
              >
                <option value="Nuevo">Producto Nuevo</option>
                <option value="Repuesto">Repuesto / Componente</option>
                <option value="Remanufacturado">Remanufacturado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Modelo Técnico
              </label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="Ej: ThinkPad T14 G2"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Modalidad Envío
              </label>
              <select
                value={shippingType}
                onChange={e => setShippingType(e.target.value as ProductShippingType)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="Gratis">Envío Gratis</option>
                <option value="Incluido en el precio">Incluido en el precio</option>
                <option value="Pagado por el cliente">Pagado por el cliente</option>
                <option value="Cotizado según destino">Cotizado según destino</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stock Mínimo Alerta
              </label>
              <input
                type="number"
                min={0}
                value={minStock}
                onChange={e => setMinStock(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {condition === 'Remanufacturado' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="font-extrabold text-amber-950">
                15.3 Certificación de Equipo Remanufacturado / Reacondicionado (Ley 1480 de 2011)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Grado Estético</label>
                  <select
                    value={aestheticGrade}
                    onChange={e => setAestheticGrade(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white"
                  >
                    <option value="Grado A (Excelente)">Grado A (Excelente)</option>
                    <option value="Grado B (Muy Bueno)">Grado B (Muy Bueno)</option>
                    <option value="Grado C (Funcional)">Grado C (Funcional)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Meses de Garantía</label>
                  <input
                    type="number"
                    min={3}
                    max={24}
                    value={remanWarrantyMonths}
                    onChange={e => setRemanWarrantyMonths(Number(e.target.value) || 6)}
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Componentes Revisados o Reemplazados (separados por coma)
                  </label>
                  <input
                    type="text"
                    value={inspectedComponentsText}
                    onChange={e => setInspectedComponentsText(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Short Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción Técnica y Comercial (visible en web y PDF)
            </label>
            <textarea
              rows={3}
              value={shortDescription}
              onChange={e => setShortDescription(e.target.value)}
              placeholder="Especificaciones técnicas clave: CPU, memoria, almacenamiento, puertos y garantía."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Image Upload Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Fotografías del Producto ({images.length})
              </label>
              <span className="text-[11px] text-slate-500">
                Haz clic en ★ para elegir la imagen principal del catálogo y PDF
              </span>
            </div>

            {/* Existing images list */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative group border rounded-lg overflow-hidden h-24 bg-slate-50 flex items-center justify-center transition-all ${
                      idx === 0 ? 'border-red-600 ring-2 ring-red-500/20' : 'border-slate-200'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-contain p-1"
                      referrerPolicy="no-referrer"
                    />
                    {idx === 0 ? (
                      <span className="absolute top-1 left-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-xs">
                        <Star className="w-2.5 h-2.5 fill-white" />
                        Principal
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetMainImage(idx)}
                        className="absolute bottom-1 left-1 bg-slate-900/85 hover:bg-red-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Seleccionar como foto principal"
                      >
                        <Star className="w-2.5 h-2.5" />
                        Hacer Principal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-slate-900/80 hover:bg-red-600 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar imagen"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* File drop area */}
            <label className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-red-50/20">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-700">
                {isUploading ? 'Subiendo archivos...' : 'Subir una o varias fotografías del producto'}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                Formatos permitidos: JPG, PNG, WebP, SVG (Máx. 10MB por foto)
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Active status */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
              />
              <span className="text-xs font-medium text-slate-800">
                Producto activo (publicado en catálogo público y descargas PDF)
              </span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? 'Guardando...' : productToEdit ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
