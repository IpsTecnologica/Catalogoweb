import React, { useState, useEffect } from 'react';
import {
  CrmCustomerRecord,
  CrmClassification,
  MarketingCampaign,
  CrmOpportunity,
  Product,
  CompanyProfile
} from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatCOP } from '../../utils/formatters';
import {
  Users,
  Megaphone,
  TrendingUp,
  ShieldCheck,
  MessageCircle,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Send,
  Trash2,
  Edit3,
  Save,
  Award,
  Briefcase,
  Phone,
  Mail,
  Building2,
  MapPin
} from 'lucide-react';

interface CrmMarketingManagerProps {
  products: Product[];
  company?: CompanyProfile;
  companyWhatsapp?: string;
  initialSubTab?: 'crm' | 'opportunities' | 'campaigns' | 'metrics';
}

const CRM_CLASSIFICATIONS: CrmClassification[] = [
  'Nuevo',
  'Prospecto',
  'Frecuente',
  'Empresarial',
  'Mayorista',
  'Inactivo',
  'Cliente potencial',
  'Cliente inactivo'
];

export const CrmMarketingManager: React.FC<CrmMarketingManagerProps> = ({
  products,
  company,
  companyWhatsapp,
  initialSubTab = 'crm'
}) => {
  const effectiveWhatsapp = companyWhatsapp || company?.whatsapp || '+573108947231';
  const { notify, user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'crm' | 'opportunities' | 'campaigns' | 'metrics'>(initialSubTab);
  const [customers, setCustomers] = useState<CrmCustomerRecord[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [topProducts, setTopProducts] = useState<
    Array<{ productId: string; reference: string; name: string; unitsSold: number; revenueCOP: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<string>('Todas');

  // Selected Customer & Follow-up
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomerRecord | null>(null);
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpChannel, setFollowUpChannel] = useState<'WhatsApp' | 'Llamada' | 'Correo' | 'Presencial'>('WhatsApp');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  // Create/Edit Customer Modal
  const [editingCustomer, setEditingCustomer] = useState<Partial<CrmCustomerRecord> | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Create/Edit Opportunity Modal
  const [editingOpportunity, setEditingOpportunity] = useState<Partial<CrmOpportunity> | null>(null);
  const [savingOpportunity, setSavingOpportunity] = useState(false);

  // Create/Edit Campaign Modal
  const [editingCampaign, setEditingCampaign] = useState<Partial<MarketingCampaign> | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);

  const isDemoReadOnly = user?.email?.toLowerCase() === 'demo@ipstecnologica.com' || user?.role === 'Consulta';

  const loadCrmData = async () => {
    setLoading(true);
    try {
      const res = await api.getCrmOverview();
      setCustomers(res.customers || []);
      setOpportunities(res.opportunities || []);
      setCampaigns(res.campaigns || []);
      setTopProducts(res.metrics?.topSellingProducts || []);
      if (selectedCustomer) {
        const updated = (res.customers || []).find(c => c.id === selectedCustomer.id);
        if (updated) setSelectedCustomer(updated);
      }
    } catch (err: any) {
      notify(err.message || 'Error al cargar datos de CRM y Marketing.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCrmData();
  }, []);

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.fullName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.companyName || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q);
    const matchesClass =
      classificationFilter === 'Todas' || c.classification === classificationFilter;
    return matchesSearch && matchesClass;
  });

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer?.fullName || !editingCustomer?.email) {
      notify('El nombre completo y el correo electrónico son obligatorios.', 'error');
      return;
    }
    setSavingCustomer(true);
    try {
      const res = await api.upsertCrmCustomer(editingCustomer);
      notify(res.message, 'success');
      setEditingCustomer(null);
      await loadCrmData();
    } catch (err: any) {
      notify(err.message || 'No se pudo guardar el cliente en CRM.', 'error');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleSaveOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpportunity?.title || !editingOpportunity?.customerName) {
      notify('Complete el título de la oportunidad comercial y el nombre del cliente.', 'error');
      return;
    }
    setSavingOpportunity(true);
    try {
      const res = await api.upsertCrmOpportunity(editingOpportunity);
      notify(res.message, 'success');
      setEditingOpportunity(null);
      await loadCrmData();
    } catch (err: any) {
      notify(err.message || 'No se pudo guardar la oportunidad comercial.', 'error');
    } finally {
      setSavingOpportunity(false);
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    try {
      const res = await api.deleteCrmOpportunity(id);
      notify(res.message, 'info');
      await loadCrmData();
    } catch (err: any) {
      notify(err.message || 'No se pudo eliminar la oportunidad.', 'error');
    }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !followUpNote.trim()) return;
    setSavingFollowUp(true);
    try {
      const res = await api.addCrmFollowUp(selectedCustomer.id, {
        note: followUpNote.trim(),
        channel: followUpChannel,
        nextFollowUpDate: nextFollowUpDate || undefined
      });
      notify(res.message, 'success');
      setFollowUpNote('');
      setNextFollowUpDate('');
      setSelectedCustomer(res.customer);
      await loadCrmData();
    } catch (err: any) {
      notify(err.message || 'No se pudo registrar el seguimiento.', 'error');
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleToggleMarketingConsent = async (customer: CrmCustomerRecord) => {
    try {
      const nextConsent = !customer.marketingConsent;
      const res = await api.upsertCrmCustomer({
        ...customer,
        marketingConsent: nextConsent,
        unsubscribedAt: nextConsent ? undefined : new Date().toISOString()
      });
      notify(
        nextConsent
          ? `Consentimiento Habeas Data activado para ${customer.fullName}.`
          : `Cliente ${customer.fullName} dado de baja de envíos promocionales (Opt-Out Ley 1581).`,
        'info'
      );
      setSelectedCustomer(res.customer);
      await loadCrmData();
    } catch (err: any) {
      notify(err.message || 'No se pudo actualizar el consentimiento.', 'error');
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign?.name || !editingCampaign?.whatsappTemplateText) {
      notify('Complete el nombre de la campaña y la plantilla de mensaje.', 'error');
      return;
    }
    setSavingCampaign(true);
    try {
      const res = await api.upsertMarketingCampaign(editingCampaign);
      notify(res.message, 'success');
      setEditingCampaign(null);
      await loadCrmData();
    } catch (err: any) {
      notify(err.message || 'No se pudo guardar la campaña.', 'error');
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      const res = await api.deleteMarketingCampaign(id);
      notify(res.message, 'info');
      await loadCrmData();
    } catch (err: any) {
      notify(err.message || 'No se pudo eliminar la campaña.', 'error');
    }
  };

  const buildCustomerWhatsAppCampaignUrl = (customer: CrmCustomerRecord, campaign?: MarketingCampaign) => {
    const cleanPhone = (customer.whatsapp || customer.phone || effectiveWhatsapp).replace(/[^0-9]/g, '');
    const rawMsg =
      campaign?.whatsappTemplateText ||
      `Hola {{nombre}}, te saludamos de *IPS TECNOLÓGICA*. Tenemos promociones especiales y soporte técnico certificado disponible para ti.`;
    const personalized = rawMsg.replace(/\{\{nombre\}\}/gi, customer.fullName);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(personalized)}`;
  };

  const getBadgeColor = (cls: CrmClassification) => {
    switch (cls) {
      case 'Empresarial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Mayorista':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Frecuente':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Nuevo':
      case 'Prospecto':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Inactivo':
      case 'Cliente inactivo':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
            <Users className="w-4 h-4" />
            <span>MÓDULO CRM, OPORTUNIDADES Y CAMPAÑAS (LEY 1581 DE 2012)</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            CRM Y CAMPAÑAS COMERCIALES – IPS TECNOLÓGICA
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
            Administra clientes clasificados, historial de compras y servicios, oportunidades comerciales, seguimiento con fecha de próximo contacto y campañas segmentadas respetando el consentimiento de datos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isDemoReadOnly && (
            <>
              <button
                type="button"
                onClick={() =>
                  setEditingCustomer({
                    fullName: '',
                    email: '',
                    phone: '+57 ',
                    whatsapp: '+57 ',
                    city: 'Cali',
                    classification: 'Prospecto',
                    preferredCategory: categories[0] || 'Portátiles',
                    marketingConsent: true,
                    marketingConsentDate: new Date().toISOString().slice(0, 10),
                    internalNotes: ''
                  })
                }
                className="px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Cliente CRM</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setEditingOpportunity({
                    title: '',
                    customerName: selectedCustomer?.fullName || '',
                    customerId: selectedCustomer?.id || '',
                    estimatedValueCOP: 2500000,
                    stage: 'Prospecto',
                    probabilityPercent: 50,
                    expectedCloseDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
                    notes: ''
                  })
                }
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold border border-white/15 flex items-center gap-1.5 cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-emerald-300" />
                <span>Nueva Oportunidad</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setEditingCampaign({
                    name: '',
                    description: '',
                    seasonOrObjective: 'Promoción Mensual',
                    targetClassification: 'Todos',
                    targetCategory: 'Todas',
                    discountCode: 'IPS10',
                    discountPercent: 10,
                    channel: 'Multicanal',
                    startDate: new Date().toISOString().slice(0, 10),
                    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                    status: 'Activa',
                    whatsappTemplateText:
                      'Hola {{nombre}}, en *IPS TECNOLÓGICA* tenemos 10% de descuento con el cupón *IPS10* en equipos y soporte técnico certificado. ¡Consúltanos!'
                  })
                }
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold border border-white/15 flex items-center gap-1.5 cursor-pointer"
              >
                <Megaphone className="w-4 h-4 text-amber-300" />
                <span>Nueva Campaña</span>
              </button>
            </>
          )}
        </div>
      </div>

      {isDemoReadOnly && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Modo Demostración de Solo Lectura Activo:</strong> Estás visualizando únicamente registros ficticios de demostración para proteger la privacidad de los clientes reales de IPS TECNOLÓGICA.
          </span>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('crm')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'crm'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-red-400" />
            <span>Clientes CRM ({customers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('opportunities')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'opportunities'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-4 h-4 text-blue-400" />
            <span>Oportunidades Comerciales ({opportunities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('campaigns')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'campaigns'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span>Campañas ({campaigns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('metrics')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'metrics'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Reportes de Resultados</span>
          </button>
        </div>

        <div className="px-3 text-xs text-slate-600 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            Con consentimiento Ley 1581:{' '}
            <strong className="text-emerald-700">
              {customers.filter(c => c.marketingConsent && !c.unsubscribedAt).length}
            </strong>{' '}
            de {customers.length} clientes
          </span>
        </div>
      </div>

      {/* SUBTAB 1: DIRECTORIO CRM Y SEGUIMIENTO */}
      {activeSubTab === 'crm' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Customer List */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar por cliente, empresa, correo, ciudad o WhatsApp..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>
              <select
                value={classificationFilter}
                onChange={e => setClassificationFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold"
              >
                <option value="Todas">Todas las Clasificaciones</option>
                {CRM_CLASSIFICATIONS.map(cls => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">Cargando clientes del CRM...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No se encontraron clientes con los filtros seleccionados.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredCustomers.map(cust => {
                  const isSelected = selectedCustomer?.id === cust.id;
                  const canReceiveMarketing = cust.marketingConsent && !cust.unsubscribedAt;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => setSelectedCustomer(cust)}
                      className={`p-4 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? 'border-red-600 bg-red-50/20 ring-1 ring-red-600'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-sm font-extrabold text-slate-900">
                              {cust.fullName}
                            </strong>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getBadgeColor(
                                cust.classification
                              )}`}
                            >
                              {cust.classification}
                            </span>
                          </div>
                          {cust.companyName && (
                            <p className="text-xs text-slate-600 font-semibold mt-0.5 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {cust.companyName} {cust.nitOrDoc ? `· NIT/CC: ${cust.nitOrDoc}` : ''}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black font-mono text-slate-900 block">
                            {formatCOP(cust.totalSpentCOP || 0)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {cust.ordersCount} compras · {cust.technicalServicesCount} servicios SRV
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {cust.whatsapp || cust.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {cust.email}
                          </span>
                          {cust.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {cust.city}
                            </span>
                          )}
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            canReceiveMarketing ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {canReceiveMarketing ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Autoriza Promos
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              Baja / Sin Consentimiento
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Customer 360 Detail, Habeas Data & Follow-ups */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 h-fit">
            {!selectedCustomer ? (
              <div className="py-16 text-center space-y-2 text-xs text-slate-500">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">Selecciona un cliente de la lista</p>
                <p>
                  Podrás consultar su ficha 360°, notas internas, consentimiento Habeas Data (Ley 1581), registrar seguimientos y enviarle mensajes preparados por WhatsApp.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-red-600 font-bold">
                      FICHA 360° DEL CLIENTE · {selectedCustomer.id}
                    </span>
                    <h3 className="text-base font-black text-slate-900">{selectedCustomer.fullName}</h3>
                    <p className="text-slate-500">
                      {selectedCustomer.email} · {selectedCustomer.whatsapp || selectedCustomer.phone}
                    </p>
                  </div>

                  {!isDemoReadOnly && (
                    <button
                      type="button"
                      onClick={() => setEditingCustomer({ ...selectedCustomer })}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 block">Compras</span>
                    <strong className="text-sm font-black text-slate-900">
                      {selectedCustomer.ordersCount}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 block">Servicios SRV</span>
                    <strong className="text-sm font-black text-slate-900">
                      {selectedCustomer.technicalServicesCount}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 block">Garantías</span>
                    <strong className="text-sm font-black text-slate-900">
                      {selectedCustomer.warrantiesCount}
                    </strong>
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-amber-900 block">
                    Observaciones Internas Comerciales:
                  </span>
                  <p className="text-slate-700">
                    {selectedCustomer.internalNotes || 'Sin observaciones registradas.'}
                  </p>
                  {selectedCustomer.preferredCategory && (
                    <p className="text-[11px] text-amber-800 font-semibold pt-1">
                      Categoría de interés: {selectedCustomer.preferredCategory}
                    </p>
                  )}
                </div>

                {/* Habeas Data Law 1581 Control */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-slate-900 block">
                      Consentimiento Habeas Data (Ley 1581 de 2012)
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      {selectedCustomer.marketingConsent && !selectedCustomer.unsubscribedAt
                        ? `Autorizado (${selectedCustomer.marketingConsentDate || 'Vigente'})`
                        : 'Cliente solicitó no recibir mensajes promocionales (Opt-Out)'}
                    </span>
                  </div>
                  {!isDemoReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleToggleMarketingConsent(selectedCustomer)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer ${
                        selectedCustomer.marketingConsent && !selectedCustomer.unsubscribedAt
                          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {selectedCustomer.marketingConsent && !selectedCustomer.unsubscribedAt
                        ? 'Dar de Baja (Opt-Out)'
                        : 'Activar Consentimiento'}
                    </button>
                  )}
                </div>

                {/* Direct Prepared WhatsApp Button (only if consented) */}
                {selectedCustomer.marketingConsent && !selectedCustomer.unsubscribedAt ? (
                  <a
                    href={buildCustomerWhatsAppCampaignUrl(selectedCustomer, campaigns[0])}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar Mensaje Preparado por WhatsApp (wa.me)</span>
                  </a>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 text-center font-semibold">
                    Envío promocional bloqueado por respeto a la Ley 1581 (Opt-Out activo).
                  </div>
                )}

                {/* Add Follow-up Form */}
                {!isDemoReadOnly && (
                  <form onSubmit={handleAddFollowUp} className="pt-3 border-t border-slate-200 space-y-2.5">
                    <span className="font-extrabold text-slate-900 block">
                      Registrar Nuevo Seguimiento Comercial
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={followUpChannel}
                        onChange={e => setFollowUpChannel(e.target.value as any)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="WhatsApp">Canal: WhatsApp</option>
                        <option value="Llamada">Canal: Llamada</option>
                        <option value="Correo">Canal: Correo</option>
                        <option value="Presencial">Canal: Presencial</option>
                      </select>
                      <input
                        type="date"
                        value={nextFollowUpDate}
                        onChange={e => setNextFollowUpDate(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg"
                        title="Fecha de próximo contacto"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={followUpNote}
                      onChange={e => setFollowUpNote(e.target.value)}
                      placeholder="Escribe el acuerdo comercial, cotización enviada o recordatorio de mantenimiento..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                    <button
                      type="submit"
                      disabled={savingFollowUp || !followUpNote.trim()}
                      className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {savingFollowUp ? 'Guardando...' : 'Guardar Seguimiento en Historial'}
                    </button>
                  </form>
                )}

                {/* Follow-ups History */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="font-extrabold text-slate-800 block">
                    Historial de Seguimientos ({selectedCustomer.followUps?.length || 0})
                  </span>
                  {(selectedCustomer.followUps || []).length === 0 ? (
                    <p className="text-slate-400">Sin seguimientos registrados aún.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedCustomer.followUps.map(f => (
                        <div key={f.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-bold text-red-600 uppercase">{f.channel}</span>
                            <span>{new Date(f.date).toLocaleDateString('es-CO')}</span>
                          </div>
                          <p className="text-slate-800">{f.note}</p>
                          {f.nextFollowUpDate && (
                            <span className="text-[10px] font-mono text-emerald-700 block">
                              Próximo contacto: {f.nextFollowUpDate}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 1B: OPORTUNIDADES COMERCIALES */}
      {activeSubTab === 'opportunities' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-red-600" />
                <span>Oportunidades Comerciales y Cotizaciones Corporativas ({opportunities.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Seguimiento de negocios potenciales, licitaciones, dotación tecnológica y proyectos TI con valor estimado.
              </p>
            </div>
            {!isDemoReadOnly && (
              <button
                type="button"
                onClick={() =>
                  setEditingOpportunity({
                    title: '',
                    customerName: '',
                    estimatedValueCOP: 3000000,
                    stage: 'Prospecto',
                    probabilityPercent: 50,
                    expectedCloseDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
                    notes: ''
                  })
                }
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Oportunidad</span>
              </button>
            )}
          </div>

          {opportunities.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No hay oportunidades comerciales registradas. Haz clic en «Registrar Oportunidad» para agregar una.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {opportunities.map(opp => (
                <div
                  key={opp.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3 text-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">
                        Etapa: {opp.stage}
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {opp.probabilityPercent}% prob.
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900">{opp.title}</h4>
                    <p className="text-slate-600 font-semibold">Cliente: {opp.customerName}</p>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-500">Valor estimado:</span>
                      <strong className="font-mono text-sm text-red-600">
                        {formatCOP(opp.estimatedValueCOP || 0)}
                      </strong>
                    </div>
                    {opp.notes && <p className="text-slate-600">{opp.notes}</p>}
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Cierre est.: {opp.expectedCloseDate || 'Por definir'}</span>
                    {!isDemoReadOnly && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingOpportunity({ ...opp })}
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOpportunity(opp.id)}
                          className="text-red-600 font-bold hover:underline cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: CAMPAÑAS Y MENSAJES WHATSAPP */}
      {activeSubTab === 'campaigns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map(camp => {
            const matchingClients = customers.filter(
              c =>
                c.marketingConsent &&
                !c.unsubscribedAt &&
                (camp.targetClassification === 'Todos' || c.classification === camp.targetClassification)
            );
            return (
              <div
                key={camp.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold uppercase">
                      {camp.seasonOrObjective}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {camp.channel && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          Canal: {camp.channel}
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {camp.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-slate-900">{camp.name}</h3>
                  {camp.description && (
                    <p className="text-xs text-slate-600">{camp.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Público Objetivo</span>
                      <strong className="text-slate-800">{camp.targetClassification}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Cupón / Descuento</span>
                      <strong className="text-red-600 font-mono">
                        {camp.discountCode || 'N/A'} {camp.discountPercent ? `(-${camp.discountPercent}%)` : ''}
                      </strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-emerald-900 block">
                      Plantilla Preparada para Difusión (wa.me / Portal):
                    </span>
                    <p className="text-slate-800 whitespace-pre-line">{camp.whatsappTemplateText}</p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-700 block">
                      Clientes Autorizados con Consentimiento ({matchingClients.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchingClients.slice(0, 5).map(cl => (
                        <a
                          key={cl.id}
                          href={buildCustomerWhatsAppCampaignUrl(cl, camp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                          title={`Abrir WhatsApp con mensaje preparado para ${cl.fullName}`}
                        >
                          <Send className="w-3 h-3" />
                          <span>{cl.fullName.split(' ')[0]}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Vigencia: {camp.startDate} a {camp.endDate}
                  </span>
                  {!isDemoReadOnly && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingCampaign({ ...camp })}
                        className="text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCampaign(camp.id)}
                        className="text-red-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBTAB 3: ESTADÍSTICAS Y PRODUCTOS MÁS VENDIDOS */}
      {activeSubTab === 'metrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-red-600" />
              <span>Distribución de Clientes por Clasificación</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              {CRM_CLASSIFICATIONS.map(cls => {
                const count = customers.filter(c => c.classification === cls).length;
                const totalRev = customers
                  .filter(c => c.classification === cls)
                  .reduce((sum, c) => sum + (c.totalSpentCOP || 0), 0);
                return (
                  <div
                    key={cls}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-slate-900">{cls}</strong>
                      <span className="text-slate-500 ml-2">({count} clientes)</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{formatCOP(totalRev)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Productos Más Vendidos y Resultados Comerciales</span>
            </h3>
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                Aún no hay suficientes pedidos confirmados para calcular el ranking.
              </p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {topProducts.map((tp, i) => (
                  <div
                    key={tp.productId}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black flex items-center justify-center text-[11px]">
                        {i + 1}
                      </span>
                      <div>
                        <span className="font-mono text-[10px] text-red-600 font-bold block">
                          {tp.reference}
                        </span>
                        <strong className="text-slate-900">{tp.name}</strong>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <strong className="text-slate-900 font-mono block">
                        {formatCOP(tp.revenueCOP)}
                      </strong>
                      <span className="text-[11px] text-slate-500">{tp.unitsSold} unidades</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create / Edit CRM Customer */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-8 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingCustomer.id ? 'Editar Cliente CRM' : 'Registrar Cliente en CRM'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.fullName || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={editingCustomer.email || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Teléfono / WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.phone || ''}
                  onChange={e =>
                    setEditingCustomer({
                      ...editingCustomer,
                      phone: e.target.value,
                      whatsapp: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Clasificación CRM</label>
                <select
                  value={editingCustomer.classification || 'Nuevo'}
                  onChange={e =>
                    setEditingCustomer({
                      ...editingCustomer,
                      classification: e.target.value as CrmClassification
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                >
                  {CRM_CLASSIFICATIONS.map(cls => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Empresa (Opcional)</label>
                <input
                  type="text"
                  value={editingCustomer.companyName || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={editingCustomer.city || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Notas Internas</label>
              <textarea
                rows={2}
                value={editingCustomer.internalNotes || ''}
                onChange={e => setEditingCustomer({ ...editingCustomer, internalNotes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <label className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer">
              <input
                type="checkbox"
                checked={editingCustomer.marketingConsent !== false}
                onChange={e =>
                  setEditingCustomer({ ...editingCustomer, marketingConsent: e.target.checked })
                }
                className="rounded text-emerald-600"
              />
              <span className="text-emerald-950 font-semibold">
                El cliente autoriza recibir ofertas y recordatorios comerciales (Habeas Data — Ley 1581 de 2012)
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingCustomer}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingCustomer ? 'Guardando...' : 'Guardar Cliente'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create / Edit Opportunity */}
      {editingOpportunity && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveOpportunity}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-8 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingOpportunity.id ? 'Editar Oportunidad Comercial' : 'Registrar Oportunidad Comercial'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingOpportunity(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Título del Negocio / Proyecto *</label>
                <input
                  type="text"
                  required
                  value={editingOpportunity.title || ''}
                  onChange={e => setEditingOpportunity({ ...editingOpportunity, title: e.target.value })}
                  placeholder="Ej: Dotación 10 Portátiles ThinkPad + Mantenimiento Anual"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cliente o Empresa *</label>
                  <input
                    type="text"
                    required
                    value={editingOpportunity.customerName || ''}
                    onChange={e => setEditingOpportunity({ ...editingOpportunity, customerName: e.target.value })}
                    placeholder="Nombre del cliente o empresa"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Estimado (COP)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingOpportunity.estimatedValueCOP || 0}
                    onChange={e =>
                      setEditingOpportunity({
                        ...editingOpportunity,
                        estimatedValueCOP: Number(e.target.value)
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Etapa Comercial</label>
                  <select
                    value={editingOpportunity.stage || 'Prospecto'}
                    onChange={e =>
                      setEditingOpportunity({ ...editingOpportunity, stage: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    <option value="Prospecto">Prospecto</option>
                    <option value="Contactado">Contactado</option>
                    <option value="Cotización enviada">Cotización enviada</option>
                    <option value="Negociación">Negociación</option>
                    <option value="Ganada">Ganada</option>
                    <option value="Perdida">Perdida</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Estimada Cierre</label>
                  <input
                    type="date"
                    value={editingOpportunity.expectedCloseDate || ''}
                    onChange={e =>
                      setEditingOpportunity({ ...editingOpportunity, expectedCloseDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas y Requerimientos</label>
                <textarea
                  rows={2}
                  value={editingOpportunity.notes || ''}
                  onChange={e => setEditingOpportunity({ ...editingOpportunity, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingOpportunity(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingOpportunity}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingOpportunity ? 'Guardando...' : 'Guardar Oportunidad'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create / Edit Campaign */}
      {editingCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveCampaign}
            className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-8 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingCampaign.id ? 'Editar Campaña de Marketing' : 'Nueva Campaña de Marketing'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCampaign(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Nombre de la Campaña *</label>
                <input
                  type="text"
                  required
                  value={editingCampaign.name || ''}
                  onChange={e => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Descripción de la Campaña</label>
                <input
                  type="text"
                  value={editingCampaign.description || ''}
                  onChange={e => setEditingCampaign({ ...editingCampaign, description: e.target.value })}
                  placeholder="Resumen comercial de la campaña y beneficios..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Temporada u Objetivo</label>
                <input
                  type="text"
                  value={editingCampaign.seasonOrObjective || ''}
                  onChange={e =>
                    setEditingCampaign({ ...editingCampaign, seasonOrObjective: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Público Objetivo</label>
                <select
                  value={editingCampaign.targetClassification || 'Todos'}
                  onChange={e =>
                    setEditingCampaign({
                      ...editingCampaign,
                      targetClassification: e.target.value as any
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value="Todos">Todos los clientes con consentimiento</option>
                  {CRM_CLASSIFICATIONS.map(cls => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de Inicio</label>
                <input
                  type="date"
                  value={editingCampaign.startDate || ''}
                  onChange={e => setEditingCampaign({ ...editingCampaign, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de Fin</label>
                <input
                  type="date"
                  value={editingCampaign.endDate || ''}
                  onChange={e => setEditingCampaign({ ...editingCampaign, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Código de Descuento</label>
                <input
                  type="text"
                  value={editingCampaign.discountCode || ''}
                  onChange={e =>
                    setEditingCampaign({
                      ...editingCampaign,
                      discountCode: e.target.value.toUpperCase()
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">% de Descuento</label>
                <input
                  type="number"
                  value={editingCampaign.discountPercent || 0}
                  onChange={e =>
                    setEditingCampaign({
                      ...editingCampaign,
                      discountPercent: Number(e.target.value)
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Canal de Difusión</label>
                <select
                  value={editingCampaign.channel || 'Multicanal'}
                  onChange={e => setEditingCampaign({ ...editingCampaign, channel: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Multicanal">Multicanal (Web + Portal + WhatsApp)</option>
                  <option value="WhatsApp">WhatsApp (wa.me)</option>
                  <option value="Portal del Cliente">Portal del Cliente</option>
                  <option value="Catálogo Web">Catálogo Web</option>
                  <option value="Correo">Correo Electrónico</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Estado</label>
                <select
                  value={editingCampaign.status || 'Activa'}
                  onChange={e => setEditingCampaign({ ...editingCampaign, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
                >
                  <option value="Activa">Activa</option>
                  <option value="Programada">Programada</option>
                  <option value="Borrador">Borrador</option>
                  <option value="Finalizada">Finalizada</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mensaje Preparado para WhatsApp / Notificación (usa {'{{nombre}}'} para personalizar) *
              </label>
              <textarea
                rows={3}
                required
                value={editingCampaign.whatsappTemplateText || ''}
                onChange={e =>
                  setEditingCampaign({ ...editingCampaign, whatsappTemplateText: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCampaign(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingCampaign}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingCampaign ? 'Guardando...' : 'Guardar Campaña'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
