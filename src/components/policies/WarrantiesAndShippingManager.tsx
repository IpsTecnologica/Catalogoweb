import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Truck,
  FileText,
  Search,
  Plus,
  Save,
  Download,
  ExternalLink,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Package,
  MapPin,
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  PolicyDocument,
  WarrantyRecord,
  WarrantyCaseStatus,
  ShipmentRecord,
  ShipmentStatus,
  CompanyProfile
} from '../../types';
import { api } from '../../services/api';

interface WarrantiesAndShippingManagerProps {
  company: CompanyProfile;
  canEditPolicies: boolean;
  onNotify: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

const WARRANTY_STATES: WarrantyCaseStatus[] = [
  'Vigente',
  'Solicitud recibida',
  'En revisión',
  'En diagnóstico',
  'En trámite con proveedor',
  'Aprobada',
  'Rechazada con justificación',
  'Reparada',
  'Reemplazada',
  'Finalizada'
];

const SHIPMENT_STATES: ShipmentStatus[] = [
  'Pendiente de despacho',
  'Preparando pedido',
  'Despachado',
  'En tránsito',
  'En reparto',
  'Entregado',
  'Novedad',
  'Devuelto'
];

export const WarrantiesAndShippingManager: React.FC<WarrantiesAndShippingManagerProps> = ({
  company,
  canEditPolicies,
  onNotify
}) => {
  const [activeTab, setActiveTab] = useState<'policies' | 'warranties' | 'shipments'>('policies');
  const [policies, setPolicies] = useState<PolicyDocument[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyDocument | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<PolicyDocument | null>(null);

  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [warrantySearch, setWarrantySearch] = useState('');
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRecord | null>(null);
  const [showNewWarrantyModal, setShowNewWarrantyModal] = useState(false);
  const [newWarrantyForm, setNewWarrantyForm] = useState<Partial<WarrantyRecord>>({
    warrantyType: 'Producto Nuevo',
    monthsCoverage: 12,
    status: 'Vigente'
  });

  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRecord | null>(null);
  const [showNewShipmentModal, setShowNewShipmentModal] = useState(false);
  const [carrierUrls, setCarrierUrls] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('ips_carrier_tracking_urls_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      Servientrega: 'https://www.servientrega.com/wps/portal/rastreo-envio',
      'Inter Rapidísimo': 'https://www.interrapidisimo.com/sigue-tu-envio/',
      Coordinadora: 'https://www.coordinadora.com/portafolio-de-servicios/servicios-en-linea/rastrear-guias/',
      Envía: 'https://envia.co/',
      TCC: 'https://tcc.com.co/courier/mensajeria/rastrear-envio/',
      Deprisa: 'https://www.deprisa.com/Tracking/'
    };
  });
  const [newShipmentForm, setNewShipmentForm] = useState<Partial<ShipmentRecord>>({
    orderId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    city: 'Cali',
    department: 'Valle del Cauca',
    address: '',
    carrier: 'Servientrega',
    trackingNumber: '',
    trackingUrl: 'https://www.servientrega.com/wps/portal/rastreo-envio',
    dispatchDate: new Date().toISOString().slice(0, 10),
    shippingType: 'Envío Nacional Asegurado',
    status: 'Despachado',
    notes: ''
  });

  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pols, wars, ships] = await Promise.all([
        api.getPolicies(),
        api.getWarranties(),
        api.getShipments()
      ]);
      setPolicies(pols || []);
      if (pols?.length > 0 && !selectedPolicy) {
        setSelectedPolicy(pols[0]);
      }
      setWarranties(wars || []);
      setShipments(ships || []);
    } catch (err: any) {
      onNotify('Error', err.message || 'No se pudo cargar el módulo de garantías y envíos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const downloadPolicyPdf = (policy: PolicyDocument) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name || 'IPS TECNOLÓGICA', 14, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIT: ${company.nit} · ${company.address || 'Cali / Bogotá, Colombia'} · WhatsApp: ${company.phone}`, 14, 21);
    doc.text(`DOCUMENTO OFICIAL: ${policy.code} · Versión ${policy.version} (${policy.legalFramework})`, 14, 27);

    y = 44;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(policy.title, pageW - 28);
    doc.text(titleLines, 14, y);
    y += titleLines.length * 6 + 4;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(policy.summary, pageW - 28);
    doc.text(summaryLines, 14, y);
    y += summaryLines.length * 5 + 5;

    const addSection = (heading: string, items: string[]) => {
      if (!items || items.length === 0) return;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(220, 38, 38);
      doc.text(heading, 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      for (const item of items) {
        const lines = doc.splitTextToSize(`• ${item}`, pageW - 30);
        if (y + lines.length * 4.5 > 278) {
          doc.addPage();
          y = 20;
        }
        doc.text(lines, 16, y);
        y += lines.length * 4.5 + 1.5;
      }
      y += 3;
    };

    addSection(
      `COBERTURA (${policy.coveragePeriod || `${policy.durationMonths} meses`})`,
      policy.coveredItems || policy.coverageDetails || []
    );
    addSection('CAUSALES DE EXCLUSIÓN / PÉRDIDA DE GARANTÍA', policy.excludedCauses || policy.exclusions || []);
    addSection('REQUISITOS PARA SOLICITAR LA GARANTÍA', policy.claimRequirements || policy.requirements || []);
    addSection('PROCESO DE REVISIÓN, DIAGNÓSTICO Y TIEMPOS DE RESPUESTA', [
      ...(policy.StepByStepProcess || policy.claimProcedure || []),
      `Tiempo de respuesta legal y diagnóstico: ${policy.responseTimes || policy.estimatedAttentionTime}`,
      `Soluciones aplicables: ${(policy.possibleSolutions || ['Reparación técnica', 'Reposición de bien', 'Devolución según Ley 1480']).join(', ')}`
    ]);

    doc.save(`${policy.code}_${policy.version.replace(/\s+/g, '_')}.pdf`);
    onNotify('PDF Descargado', `Se descargó "${policy.title}" en formato PDF oficial.`, 'success');
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    try {
      const res = await api.updatePolicy(editingPolicy.id, editingPolicy);
      const refreshed = await api.getPolicies();
      setPolicies(refreshed);
      setSelectedPolicy(res.policy);
      setEditingPolicy(null);
      onNotify('Política Publicada', res.message, 'success');
    } catch (err: any) {
      onNotify('Error', err.message || 'No se pudo actualizar la política.', 'error');
    }
  };

  const handleCreateWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createWarranty(newWarrantyForm);
      setWarranties(prev => [created, ...prev]);
      setShowNewWarrantyModal(false);
      onNotify('Garantía Registrada', `Se creó el registro de garantía ${created.warrantyCode}.`, 'success');
    } catch (err: any) {
      onNotify('Error', err.message || 'Error al crear garantía.', 'error');
    }
  };

  const handleUpdateWarrantyCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty) return;
    try {
      const res = await api.updateWarranty(selectedWarranty.id, selectedWarranty);
      setWarranties(prev => prev.map(w => (w.id === res.warranty.id ? res.warranty : w)));
      setSelectedWarranty(null);
      onNotify('Caso de Garantía Actualizado', res.message, 'success');
    } catch (err: any) {
      onNotify('Validación Ley 1480', err.message || 'No se pudo actualizar la garantía.', 'error');
    }
  };

  const handleUpdateShipmentRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;
    try {
      const res = await api.updateShipment(selectedShipment.orderId, selectedShipment);
      const refreshed = await api.getShipments();
      setShipments(refreshed);
      setSelectedShipment(null);
      onNotify('Envío y Guía Actualizados', res.message, 'success');
    } catch (err: any) {
      onNotify('Error', err.message || 'No se pudo actualizar el envío.', 'error');
    }
  };

  const handleCreateShipmentRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createShipment({
        ...newShipmentForm,
        guideNumber: newShipmentForm.trackingNumber
      });
      setShipments(prev => [res.shipment, ...prev]);
      setShowNewShipmentModal(false);
      setNewShipmentForm({
        orderId: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        city: 'Cali',
        department: 'Valle del Cauca',
        address: '',
        carrier: 'Servientrega',
        trackingNumber: '',
        trackingUrl: carrierUrls['Servientrega'] || 'https://www.servientrega.com/wps/portal/rastreo-envio',
        dispatchDate: new Date().toISOString().slice(0, 10),
        shippingType: 'Envío Nacional Asegurado',
        status: 'Despachado',
        notes: ''
      });
      onNotify('Envío Registrado', res.message, 'success');
    } catch (err: any) {
      onNotify('Error', err.message || 'No se pudo registrar el envío.', 'error');
    }
  };

  const buildWhatsAppLink = (phone: string, text: string) => {
    const cleanPhone = String(phone || company.phone || '573001234567').replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };

  const filteredWarranties = warranties.filter(w => {
    const q = warrantySearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (w.warrantyCode || w.id).toLowerCase().includes(q) ||
      (w.serialNumber || '').toLowerCase().includes(q) ||
      (w.productName || w.productOrServiceName || '').toLowerCase().includes(q) ||
      (w.productReference || '').toLowerCase().includes(q) ||
      w.clientName.toLowerCase().includes(q) ||
      w.clientEmail.toLowerCase().includes(q)
    );
  });

  const filteredShipments = shipments.filter(s => {
    const q = shipmentSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      s.orderId.toLowerCase().includes(q) ||
      s.trackingNumber.toLowerCase().includes(q) ||
      s.clientName.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.carrier.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white shadow-xl border border-slate-700/60 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            SECCIÓN 15 · ESTATUTO DEL CONSUMIDOR (LEY 1480 DE 2011 — COLOMBIA)
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Políticas de Garantías, Repuestos, Remanufacturados y Seguimiento de Envíos
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-3xl">
            Gestión integral de políticas legales, casos de garantía en 10 estados, repuestos por categoría y seguimiento de envíos con Número de Guía para Cali, Valle del Cauca y toda Colombia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowNewShipmentModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg transition cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            Registrar Envío / Guía
          </button>
          <button
            onClick={() => setShowNewWarrantyModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Registrar Garantía
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <button
          onClick={() => setActiveTab('policies')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
            activeTab === 'policies' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          15.1–15.6 Políticas Oficiales ({policies.length})
        </button>
        <button
          onClick={() => setActiveTab('warranties')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
            activeTab === 'warranties' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          15.5 Seguimiento de Garantías ({warranties.length})
        </button>
        <button
          onClick={() => setActiveTab('shipments')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
            activeTab === 'shipments' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4 text-sky-400" />
          15.7 Gestión de Envíos y Números de Guía ({shipments.length})
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <p className="text-slate-500 font-medium">Cargando políticas, garantías y envíos...</p>
        </div>
      ) : activeTab === 'policies' ? (
        /* TAB 1: 5 OFFICIAL POLICIES (LEY 1480 DE 2011) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-2.5">
            {policies.map(pol => (
              <button
                key={pol.id}
                onClick={() => setSelectedPolicy(pol)}
                className={`w-full text-left p-4 rounded-2xl border transition ${
                  selectedPolicy?.id === pol.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold opacity-80 mb-1">
                  <span>{pol.code}</span>
                  <span>{pol.version}</span>
                </div>
                <h3 className="font-extrabold text-sm">{pol.title}</h3>
                <p
                  className={`text-xs mt-1 line-clamp-2 ${
                    selectedPolicy?.id === pol.id ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {pol.coveragePeriod}
                </p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8">
            {selectedPolicy && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                      {selectedPolicy.code} · {selectedPolicy.version} · {selectedPolicy.legalFramework}
                    </span>
                    <h2 className="text-xl font-black text-slate-900 mt-1">{selectedPolicy.title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Plazo general: <strong className="text-slate-800">{selectedPolicy.coveragePeriod}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadPolicyPdf(selectedPolicy)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar PDF
                    </button>
                    {canEditPolicies && (
                      <button
                        onClick={() => setEditingPolicy({ ...selectedPolicy })}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition"
                      >
                        Editar Política
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  {selectedPolicy.summary}
                </p>

                {/* Spare Parts Sub-Table (15.2) */}
                {selectedPolicy.sparePartsSubCategories && selectedPolicy.sparePartsSubCategories.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                      15.2 Cobertura Específica por Categoría de Repuesto / Componente
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-bold">
                          <tr>
                            <th className="p-2.5">Componente / Repuesto</th>
                            <th className="p-2.5">Plazo</th>
                            <th className="p-2.5">Condición de Instalación y Garantía</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {selectedPolicy.sparePartsSubCategories.map((sp, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-900">{sp.category}</td>
                              <td className="p-2.5 font-semibold text-emerald-700">{sp.warrantyMonths} meses</td>
                              <td className="p-2.5 text-slate-600">{sp.conditions}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Shipping Zones Table (15.6) */}
                {selectedPolicy.shippingZones && selectedPolicy.shippingZones.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                      15.6 Cobertura Geográfica, Tiempos y Modalidades de Envío
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {selectedPolicy.shippingZones.map((z, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 space-y-1 text-xs">
                          <div className="font-extrabold text-sky-950 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-sky-600" />
                            {z.zoneName}
                          </div>
                          <p className="text-sky-900 font-semibold">Entrega: {z.estimatedTime}</p>
                          <p className="text-slate-600">{z.costRule}</p>
                          <p className="text-[11px] text-slate-500">
                            Transportadoras: {z.carriers.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                    <h4 className="font-extrabold text-emerald-950 uppercase">¿Qué cubre la garantía?</h4>
                    <ul className="space-y-1.5 text-slate-700">
                      {(selectedPolicy.coveredItems || selectedPolicy.coverageDetails || []).map((it, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-red-50/60 border border-red-200 space-y-2">
                    <h4 className="font-extrabold text-red-950 uppercase">Causales de Exclusión / Pérdida</h4>
                    <ul className="space-y-1.5 text-slate-700">
                      {(selectedPolicy.excludedCauses || selectedPolicy.exclusions || []).map((it, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-slate-900 uppercase">Requisitos para Radicar Solicitud</h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      {(selectedPolicy.claimRequirements || selectedPolicy.requirements || []).map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-slate-900 uppercase">Procedimiento y Tiempos de Respuesta</h4>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700">
                      {(selectedPolicy.StepByStepProcess || selectedPolicy.claimProcedure || []).map((st, i) => (
                        <li key={i}>{st}</li>
                      ))}
                    </ol>
                    <p className="pt-2 text-[11px] font-bold text-slate-800">
                      Tiempo de respuesta: {selectedPolicy.responseTimes || selectedPolicy.estimatedAttentionTime}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'warranties' ? (
        /* TAB 2: WARRANTY TRACKING (10 STATES) */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código GAR, serial, referencia, producto o cliente..."
                value={warrantySearch}
                onChange={e => setWarrantySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div className="text-xs text-slate-500">
              Mostrando <strong>{filteredWarranties.length}</strong> registros de garantía
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-white uppercase text-[11px]">
                  <tr>
                    <th className="p-3.5">Código / Pedido</th>
                    <th className="p-3.5">Producto / Serial</th>
                    <th className="p-3.5">Tipo / Vigencia</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Estado (10 Estados)</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredWarranties.map(war => (
                    <tr key={war.id} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900">{war.warrantyCode || war.id}</div>
                        <div className="text-[11px] text-slate-500">
                          {war.orderId ? `Pedido: ${war.orderId}` : war.serviceTicketNumber ? `SRV: ${war.serviceTicketNumber}` : 'Registro directo'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{war.productName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Ref: {war.productReference} · SN: {war.serialNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[11px]">
                          {war.warrantyType || 'Producto Nuevo'}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {war.monthsCoverage} meses · Vence {war.endDate.slice(0, 10)}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{war.clientName}</div>
                        <div className="text-[11px] text-slate-500">{war.clientEmail}</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            war.status === 'Vigente' || war.status === 'Aprobada' || war.status === 'Reparada' || war.status === 'Reemplazada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : war.status === 'Rechazada con justificación'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {war.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedWarranty({ ...war })}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px]"
                        >
                          Gestionar Caso
                        </button>
                        <a
                          href={buildWhatsAppLink(
                            war.clientPhone || '',
                            `Hola ${war.clientName}, te escribimos de *IPS TECNOLÓGICA* sobre tu garantía *${war.warrantyCode || war.id}* (${war.productName} - Serial ${war.serialNumber || 'N/A'}). Estado actual: *${war.status}*.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          wa.me
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 3: SHIPMENTS & TRACKING NUMBERS (8 STATES) */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por pedido (ORD-...), Número de Guía, transportadora, ciudad o cliente..."
                value={shipmentSearch}
                onChange={e => setShipmentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500">
                Total envíos registrados: <strong>{filteredShipments.length}</strong>
              </div>
              <button
                type="button"
                onClick={() => setShowNewShipmentModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Envío / Guía
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-white uppercase text-[11px]">
                  <tr>
                    <th className="p-3.5">Pedido / Cliente</th>
                    <th className="p-3.5">Destino (Ciudad / Dirección)</th>
                    <th className="p-3.5">Transportadora / Guía / Despacho</th>
                    <th className="p-3.5">Enlace Oficial de Rastreo</th>
                    <th className="p-3.5">Estado del Envío</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredShipments.map(ship => (
                    <tr key={ship.id} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900">{ship.orderId}</div>
                        <div className="text-[11px] text-slate-600">{ship.clientName}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">
                          {ship.city} ({ship.department})
                        </div>
                        <div className="text-[11px] text-slate-500">{ship.address}</div>
                        {ship.address && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              `${ship.address}, ${ship.city}, Colombia`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 hover:underline mt-0.5"
                          >
                            <MapPin className="w-3 h-3" />
                            Ver dirección en Google Maps
                          </a>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{ship.carrier}</div>
                        <div className="font-mono text-[11px] text-blue-700 font-bold">
                          Guía: {ship.trackingNumber || ship.guideNumber}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Despacho: {ship.dispatchDate || ship.shippedAt?.slice(0, 10) || 'Registrado'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {ship.trackingUrl ? (
                          <a
                            href={ship.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Consultar mi envío
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">Sin enlace</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            ship.status === 'Entregado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ship.status === 'Novedad' || ship.status === 'Devuelto'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {ship.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedShipment({ ...ship })}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer"
                        >
                          Editar Guía / Estado
                        </button>
                        <a
                          href={buildWhatsAppLink(
                            ship.clientPhone,
                            `Hola ${ship.clientName}, te informamos desde *IPS TECNOLÓGICA* que el envío de tu pedido *${ship.orderId}* se encuentra en estado *${ship.status}*.\n📦 Transportadora: *${ship.carrier}*\n🔢 Número de Guía: *${ship.trackingNumber}*\n🔗 Consultar envío: ${ship.trackingUrl || ''}\n📍 Destino: ${ship.address}, ${ship.city}`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Enviar Guía
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Policy */}
      {editingPolicy && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSavePolicy}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-8 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Editar Política Oficial: {editingPolicy.code}
              </h3>
              <button type="button" onClick={() => setEditingPolicy(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Título</label>
                <input
                  type="text"
                  value={editingPolicy.title}
                  onChange={e => setEditingPolicy({ ...editingPolicy, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Versión</label>
                <input
                  type="text"
                  value={editingPolicy.version}
                  onChange={e => setEditingPolicy({ ...editingPolicy, version: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Plazo de Cobertura</label>
                <input
                  type="text"
                  value={editingPolicy.coveragePeriod}
                  onChange={e => setEditingPolicy({ ...editingPolicy, coveragePeriod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Resumen Ejecutivo</label>
                <textarea
                  rows={3}
                  value={editingPolicy.summary}
                  onChange={e => setEditingPolicy({ ...editingPolicy, summary: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Tiempos de Respuesta Legal</label>
                <input
                  type="text"
                  value={editingPolicy.responseTimes}
                  onChange={e => setEditingPolicy({ ...editingPolicy, responseTimes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingPolicy(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold">
                Guardar y Publicar Política
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Manage Warranty Case (10 States) */}
      {selectedWarranty && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleUpdateWarrantyCase}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-8 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-700">
                  CASO DE GARANTÍA {selectedWarranty.warrantyCode || selectedWarranty.id}
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {selectedWarranty.productName} ({selectedWarranty.productReference})
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedWarranty(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Estado del Caso (10 Estados)</label>
                <select
                  value={selectedWarranty.status}
                  onChange={e =>
                    setSelectedWarranty({
                      ...selectedWarranty,
                      status: e.target.value as WarrantyCaseStatus
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                >
                  {WARRANTY_STATES.map(st => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Serial Verificado</label>
                <input
                  type="text"
                  value={selectedWarranty.serialNumber || ''}
                  onChange={e => setSelectedWarranty({ ...selectedWarranty, serialNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Técnico Responsable</label>
                <input
                  type="text"
                  value={selectedWarranty.assignedTechnicianName || ''}
                  onChange={e =>
                    setSelectedWarranty({ ...selectedWarranty, assignedTechnicianName: e.target.value })
                  }
                  placeholder="Ej: Ing. Andrés Felipe Rojas"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Orden SRV Vinculada (Opcional)</label>
                <input
                  type="text"
                  value={selectedWarranty.serviceTicketNumber || ''}
                  onChange={e =>
                    setSelectedWarranty({ ...selectedWarranty, serviceTicketNumber: e.target.value })
                  }
                  placeholder="Ej: SRV-2026-0001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Falla Reportada por el Cliente</label>
                <textarea
                  rows={2}
                  value={selectedWarranty.reportedFailure || ''}
                  onChange={e => setSelectedWarranty({ ...selectedWarranty, reportedFailure: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Diagnóstico Técnico de Laboratorio</label>
                <textarea
                  rows={2}
                  value={selectedWarranty.technicalDiagnosis || ''}
                  onChange={e =>
                    setSelectedWarranty({ ...selectedWarranty, technicalDiagnosis: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {selectedWarranty.status === 'Rechazada con justificación' && (
                <div className="sm:col-span-2 bg-red-50 p-3 rounded-xl border border-red-200">
                  <label className="block font-extrabold text-red-900 mb-1">
                    Justificación Técnica de Rechazo (Obligatoria por Ley 1480 de 2011) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={selectedWarranty.rejectionJustification || ''}
                    onChange={e =>
                      setSelectedWarranty({ ...selectedWarranty, rejectionJustification: e.target.value })
                    }
                    placeholder="Detalle la causal técnica comprobada (ej: humedad interna, golpe físico, sello violado)..."
                    className="w-full px-3 py-2 border border-red-300 rounded-xl bg-white"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Solución Aplicada / Decisión Final</label>
                <input
                  type="text"
                  value={selectedWarranty.appliedSolution || ''}
                  onChange={e => setSelectedWarranty({ ...selectedWarranty, appliedSolution: e.target.value })}
                  placeholder="Ej: Reparación sin costo / Cambio por unidad nueva / Nota crédito"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedWarranty(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold">
                Guardar Estado de Garantía
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Warranty */}
      {showNewWarrantyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateWarranty}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-3 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-base font-extrabold text-slate-900">Registrar Nueva Garantía</h3>
              <button type="button" onClick={() => setShowNewWarrantyModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Producto / Servicio *</label>
                <input
                  type="text"
                  required
                  value={newWarrantyForm.productName || ''}
                  onChange={e => setNewWarrantyForm({ ...newWarrantyForm, productName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Referencia</label>
                <input
                  type="text"
                  value={newWarrantyForm.productReference || ''}
                  onChange={e => setNewWarrantyForm({ ...newWarrantyForm, productReference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Serie (S/N)</label>
                <input
                  type="text"
                  value={newWarrantyForm.serialNumber || ''}
                  onChange={e => setNewWarrantyForm({ ...newWarrantyForm, serialNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Cliente *</label>
                <input
                  type="text"
                  required
                  value={newWarrantyForm.clientName || ''}
                  onChange={e => setNewWarrantyForm({ ...newWarrantyForm, clientName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Correo del Cliente *</label>
                <input
                  type="email"
                  required
                  value={newWarrantyForm.clientEmail || ''}
                  onChange={e => setNewWarrantyForm({ ...newWarrantyForm, clientEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">WhatsApp Cliente</label>
                <input
                  type="text"
                  value={newWarrantyForm.clientPhone || ''}
                  onChange={e => setNewWarrantyForm({ ...newWarrantyForm, clientPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Meses de Cobertura</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={newWarrantyForm.monthsCoverage || 12}
                  onChange={e =>
                    setNewWarrantyForm({ ...newWarrantyForm, monthsCoverage: Number(e.target.value) || 12 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowNewWarrantyModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold">
                Crear Garantía
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Shipment & Tracking Number */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleUpdateShipmentRecord}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold text-sky-700">PEDIDO {selectedShipment.orderId}</span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Gestión de Envío y Número de Guía
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedShipment(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Empresa Transportadora *</label>
                <input
                  type="text"
                  required
                  list="carrier-options-list"
                  value={selectedShipment.carrier}
                  onChange={e => {
                    const nextCarrier = e.target.value;
                    const defaultUrl = carrierUrls[nextCarrier];
                    setSelectedShipment({
                      ...selectedShipment,
                      carrier: nextCarrier,
                      trackingUrl: defaultUrl || selectedShipment.trackingUrl
                    });
                  }}
                  placeholder="Servientrega / Coordinadora / Inter Rapidísimo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                />
                <datalist id="carrier-options-list">
                  {Object.keys(carrierUrls).map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Guía *</label>
                <input
                  type="text"
                  required
                  value={selectedShipment.trackingNumber}
                  onChange={e =>
                    setSelectedShipment({
                      ...selectedShipment,
                      trackingNumber: e.target.value,
                      guideNumber: e.target.value
                    })
                  }
                  placeholder="Ej: SRV-COL-994821045"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-blue-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de Despacho *</label>
                <input
                  type="date"
                  value={
                    selectedShipment.dispatchDate ||
                    (selectedShipment.shippedAt ? selectedShipment.shippedAt.slice(0, 10) : '')
                  }
                  onChange={e =>
                    setSelectedShipment({ ...selectedShipment, dispatchDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Estado del Envío</label>
                <select
                  value={selectedShipment.status}
                  onChange={e =>
                    setSelectedShipment({
                      ...selectedShipment,
                      status: e.target.value as ShipmentStatus
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                >
                  {SHIPMENT_STATES.map(st => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cliente</label>
                <input
                  type="text"
                  value={selectedShipment.clientName}
                  onChange={e => setSelectedShipment({ ...selectedShipment, clientName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ciudad / Departamento</label>
                <input
                  type="text"
                  value={selectedShipment.city}
                  onChange={e => setSelectedShipment({ ...selectedShipment, city: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Enlace de Rastreo Oficial (URL que abrirá el botón «Consultar mi envío») *
                </label>
                <input
                  type="url"
                  required
                  value={selectedShipment.trackingUrl || ''}
                  onChange={e => {
                    const nextUrl = e.target.value;
                    setSelectedShipment({ ...selectedShipment, trackingUrl: nextUrl });
                    if (selectedShipment.carrier && nextUrl.startsWith('http')) {
                      const updatedMap = { ...carrierUrls, [selectedShipment.carrier]: nextUrl };
                      setCarrierUrls(updatedMap);
                      try {
                        localStorage.setItem('ips_carrier_tracking_urls_v1', JSON.stringify(updatedMap));
                      } catch {}
                    }
                  }}
                  placeholder="https://www.servientrega.com/wps/portal/rastreo-envio"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-blue-700"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Observaciones de Despacho / Entrega</label>
                <textarea
                  rows={2}
                  value={selectedShipment.notes || ''}
                  onChange={e => setSelectedShipment({ ...selectedShipment, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedShipment(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-sky-600 text-white font-bold">
                Guardar Guía y Estado
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create New Shipment & Tracking Guide */}
      {showNewShipmentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateShipmentRecord}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold text-sky-700">NUEVO DESPACHO</span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Registrar Envío y Número de Guía Oficial
                </h3>
              </div>
              <button type="button" onClick={() => setShowNewShipmentModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Pedido *</label>
                <input
                  type="text"
                  required
                  value={newShipmentForm.orderId || ''}
                  onChange={e => setNewShipmentForm({ ...newShipmentForm, orderId: e.target.value })}
                  placeholder="Ej: ORD-2026-105"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de Despacho *</label>
                <input
                  type="date"
                  required
                  value={newShipmentForm.dispatchDate || ''}
                  onChange={e => setNewShipmentForm({ ...newShipmentForm, dispatchDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Empresa Transportadora *</label>
                <input
                  type="text"
                  required
                  list="carrier-options-list"
                  value={newShipmentForm.carrier || ''}
                  onChange={e => {
                    const nextCarrier = e.target.value;
                    setNewShipmentForm({
                      ...newShipmentForm,
                      carrier: nextCarrier,
                      trackingUrl: carrierUrls[nextCarrier] || newShipmentForm.trackingUrl
                    });
                  }}
                  placeholder="Servientrega / Inter Rapidísimo / Coordinadora"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Guía *</label>
                <input
                  type="text"
                  required
                  value={newShipmentForm.trackingNumber || ''}
                  onChange={e => setNewShipmentForm({ ...newShipmentForm, trackingNumber: e.target.value })}
                  placeholder="Ej: 2058941236"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-blue-700"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Enlace de Rastreo Oficial Configurable (para el botón «Consultar mi envío») *
                </label>
                <input
                  type="url"
                  required
                  value={newShipmentForm.trackingUrl || ''}
                  onChange={e => setNewShipmentForm({ ...newShipmentForm, trackingUrl: e.target.value })}
                  placeholder="https://www.servientrega.com/wps/portal/rastreo-envio"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-blue-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Cliente *</label>
                <input
                  type="text"
                  required
                  value={newShipmentForm.clientName || ''}
                  onChange={e => setNewShipmentForm({ ...newShipmentForm, clientName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Correo del Cliente (Portal)</label>
                <input
                  type="email"
                  value={newShipmentForm.clientEmail || ''}
                  onChange={e => setNewShipmentForm({ ...newShipmentForm, clientEmail: e.target.value })}
                  placeholder="cliente@correo.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  value={newShipmentForm.clientPhone || ''}
                  onChange={e => setNewShipmentForm({ ...newShipmentForm, clientPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Estado del Envío</label>
                <select
                  value={newShipmentForm.status || 'Despachado'}
                  onChange={e =>
                    setNewShipmentForm({
                      ...newShipmentForm,
                      status: e.target.value as ShipmentStatus
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                >
                  {SHIPMENT_STATES.map(st => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={newShipmentForm.city || ''}
                  onChange={e => setNewShipmentForm({ ...newShipmentForm, city: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección de Entrega</label>
                <input
                  type="text"
                  value={newShipmentForm.address || ''}
                  onChange={e => setNewShipmentForm({ ...newShipmentForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={newShipmentForm.notes || ''}
                  onChange={e => setNewShipmentForm({ ...newShipmentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowNewShipmentModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-sky-600 text-white font-bold">
                Registrar Envío y Guía
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
