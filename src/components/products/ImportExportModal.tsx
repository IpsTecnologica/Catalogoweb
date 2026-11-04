import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Product } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onImportComplete: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  products,
  onImportComplete
}) => {
  const { notify } = useAuth();
  const [importing, setImporting] = useState(false);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Export current products to Excel
  const handleExportExcel = () => {
    const exportData = products.map(p => ({
      Referencia: p.reference,
      Nombre: p.name,
      Descripcion: p.shortDescription,
      Categoria: p.category,
      PrecioCOP: p.priceCOP,
      Activo: p.isActive ? 'SI' : 'NO',
      FechaCreacion: p.createdAt
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos_IPS');

    XLSX.writeFile(workbook, `IPS_TECNOLOGICA_PRODUCTOS_${new Date().toISOString().split('T')[0]}.xlsx`);
    notify('Productos exportados a Excel exitosamente.', 'success');
  };

  // 2. Export current products to CSV
  const handleExportCSV = () => {
    const exportData = products.map(p => ({
      Referencia: p.reference,
      Nombre: p.name,
      Descripcion: p.shortDescription,
      Categoria: p.category,
      PrecioCOP: p.priceCOP,
      Activo: p.isActive ? 'SI' : 'NO'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IPS_TECNOLOGICA_PRODUCTOS_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Productos exportados a CSV exitosamente.', 'success');
  };

  // 3. Download sample Excel template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        Referencia: 'IPS-SAMPLE-001',
        Nombre: 'Servidor Blade Enterprise Dual Intel',
        Descripcion: 'Dual Xeon 32 Cores, 64GB DDR5 ECC, 2x 960GB SSD SAS Enterprise',
        Categoria: 'Servidores y Redes',
        PrecioCOP: 18500000,
        Activo: 'SI'
      },
      {
        Referencia: 'IPS-SAMPLE-002',
        Nombre: 'Portátil Corporativo Ultraliviano 14"',
        Descripcion: 'Core Ultra 7, 16GB RAM, 512GB SSD, Pantalla 2.8K OLED',
        Categoria: 'Portátiles y Cómputo',
        PrecioCOP: 4890000,
        Activo: 'SI'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'PLANTILLA_IMPORTACION_IPS_TECNOLOGICA.xlsx');
  };

  // 4. Handle file drop/upload for import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();

    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          throw new Error('El archivo no contiene filas de datos para importar.');
        }

        // Map column names flexibly
        const formatted = rawJson.map((row, idx) => {
          const ref = row.Referencia || row.referencia || row.Codigo || row.codigo || `IPS-IMP-${idx + 1}`;
          const name = row.Nombre || row.nombre || row.Producto || row.producto;
          const desc = row.Descripcion || row.descripcion || row.Detalle || '';
          const cat = row.Categoria || row.categoria || 'General';
          const price = Number(row.PrecioCOP || row.preciocop || row.Precio || row.precio || 0);
          const activeVal = String(row.Activo || row.activo || 'SI').toUpperCase();
          const isActive = activeVal === 'SI' || activeVal === 'TRUE' || activeVal === '1';

          return {
            reference: String(ref).trim(),
            name: String(name || '').trim(),
            shortDescription: String(desc).trim(),
            category: String(cat).trim(),
            priceCOP: isNaN(price) ? 0 : price,
            isActive
          };
        }).filter(item => item.name.length > 0);

        if (formatted.length === 0) {
          throw new Error('No se encontraron productos válidos. Verifique que las columnas contengan "Nombre" y "Referencia".');
        }

        setParsedItems(formatted);
      } catch (err: any) {
        setError(err.message || 'Error al procesar el archivo Excel/CSV.');
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (parsedItems.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await api.bulkImport(parsedItems);
      notify(res.message, 'success');
      onImportComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar los productos en la base de datos.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-base font-bold text-white">
                Importación y Exportación de Productos
              </h3>
              <p className="text-xs text-slate-400">
                Formatos compatibles: Microsoft Excel (.xlsx) y CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Export Current Database */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              1. Exportar Catálogo Actual ({products.length} productos)
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              Descarga todos los productos registrados con sus referencias, descripciones, precios en COP y estado.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Exportar a Excel (.xlsx)</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Exportar a CSV (.csv)</span>
              </button>
            </div>
          </div>

          {/* Section 2: Import from File */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Importar Productos en Lote
              </h4>
              <button
                onClick={handleDownloadTemplate}
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Descargar plantilla de ejemplo</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Carga tu archivo de inventario. La primera fila debe incluir los encabezados: Referencia, Nombre, Descripcion, Categoria, PrecioCOP, Activo.
            </p>

            <label className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white hover:bg-red-50/20">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-700">
                Selecciona o arrastra archivo Excel o CSV
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                Archivos .xlsx, .xls o .csv
              </span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Preview Parsed Items */}
            {parsedItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {parsedItems.length} productos listos para importar
                  </span>
                  <button
                    onClick={() => setParsedItems([])}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Descartar
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded text-[11px] bg-white divide-y divide-slate-100">
                  {parsedItems.slice(0, 10).map((item, i) => (
                    <div key={i} className="px-3 py-1.5 flex items-center justify-between">
                      <div className="truncate mr-2">
                        <span className="font-mono font-bold text-red-600 mr-2">{item.reference}</span>
                        <span className="text-slate-800 font-medium">{item.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900 shrink-0">
                        ${item.priceCOP.toLocaleString('es-CO')} COP
                      </span>
                    </div>
                  ))}
                  {parsedItems.length > 10 && (
                    <div className="px-3 py-1 text-slate-500 text-center bg-slate-50 font-medium">
                      ... y {parsedItems.length - 10} productos más
                    </div>
                  )}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleConfirmImport}
                    disabled={importing}
                    className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    {importing ? 'Importando...' : `Confirmar e Importar ${parsedItems.length} Productos`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
