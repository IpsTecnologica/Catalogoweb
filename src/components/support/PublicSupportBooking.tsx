import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Calendar,
  Clock,
  MapPin,
  Upload,
  CheckCircle2,
  Search,
  AlertCircle,
  ShieldCheck,
  MessageCircle,
  Laptop,
  ArrowLeft
} from 'lucide-react';
import { api } from '../../services/api';
import {
  TechnicalServiceRequest,
  TechnicalServiceModality,
  TechnicalServicePriority,
  CompanyProfile
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatCOP } from '../../utils/formatters';

interface PublicSupportBookingProps {
  company: CompanyProfile;
  onBackToCatalog?: () => void;
}

export const PublicSupportBooking: React.FC<PublicSupportBookingProps> = ({ company, onBackToCatalog }) => {
  const { user, notify } = useAuth();

  const [serviceTypes, setServiceTypes] = useState<string[]>([
    'Mantenimiento preventivo de computadores',
    'Mantenimiento correctivo de computadores',
    'Reparación de portátiles',
    'Reparación de impresoras',
    'Instalación de cámaras de seguridad',
    'Mantenimiento de cámaras de seguridad',
    'Configuración de redes e internet',
    'Instalación de programas y sistemas operativos',
    'Servicio técnico a domicilio',
    'Diagnóstico técnico especializado'
  ]);
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; available: boolean }>>([]);

  // Form fields
  const [clientName, setClientName] = useState(user?.name || '');
  const [clientPhone, setClientPhone] = useState(user?.phone || '');
  const [clientEmail, setClientEmail] = useState(user?.email || '');
  const [companyName, setCompanyName] = useState('');
  const [serviceType, setServiceType] = useState('Mantenimiento preventivo de computadores');
  const [equipmentType, setEquipmentType] = useState('Portátil / Laptop');
  const [equipmentBrand, setEquipmentBrand] = useState('');
  const [equipmentModel, setEquipmentModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [observations, setObservations] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [modality, setModality] = useState<TechnicalServiceModality>('En sede');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(company.city || 'Bogotá D.C.');
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [priority, setPriority] = useState<TechnicalServicePriority>('Media');

  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<TechnicalServiceRequest | null>(null);

  // Quick status lookup
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<TechnicalServiceRequest | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    if (user) {
      setClientName(prev => prev || user.name);
      setClientEmail(prev => prev || user.email);
      setClientPhone(prev => prev || user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    api
      .getSupportCatalog()
      .then(data => {
        if (data.serviceTypes?.length) setServiceTypes(data.serviceTypes);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!appointmentDate) return;
    api
      .getSupportAvailability(appointmentDate)
      .then(res => {
        setAvailableSlots(res.slots || []);
        const firstAvailable = (res.slots || []).find(s => s.available);
        if (firstAvailable && !res.slots.some(s => s.time === appointmentTime && s.available)) {
          setAppointmentTime(firstAvailable.time);
        }
      })
      .catch(() => {});
  }, [appointmentDate]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = String(reader.result);
          const res = await api.uploadImage(file.name, base64, false, 'SOPORTE', 'Soporte', 'service_order');
          setPhotos(prev => [...prev, res.url]);
          notify('Fotografía o archivo del equipo adjuntado correctamente.', 'success');
        } catch (err: any) {
          notify(err.message || 'Error al subir fotografía.', 'error');
        } finally {
          setUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim() || !problemDescription.trim()) {
      notify('Complete su nombre, teléfono/WhatsApp y la descripción de la falla.', 'error');
      return;
    }
    if (modality === 'Servicio a domicilio' && !address.trim()) {
      notify('Para servicio a domicilio por favor indique la dirección exacta.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createSupportTicket({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim(),
        companyName: companyName.trim() || undefined,
        serviceType,
        equipmentType,
        equipmentBrand: equipmentBrand.trim() || 'Por verificar',
        equipmentModel: equipmentModel.trim() || 'Estándar',
        serialNumber: serialNumber.trim() || undefined,
        problemDescription: problemDescription.trim(),
        observations: observations.trim() || undefined,
        photos,
        modality,
        address: modality === 'Servicio a domicilio' ? address.trim() : company.address,
        city: city.trim() || 'Bogotá D.C.',
        appointmentDate,
        appointmentTime,
        priority
      });

      setCreatedTicket(res.ticket);
      notify(res.message || `Solicitud ${res.ticket.ticketNumber} registrada en estado Pendiente de asignación.`, 'success');
    } catch (err: any) {
      notify(err.message || 'No se pudo agendar el servicio técnico.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupCode.trim()) return;
    setLookingUp(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const ticket = await api.lookupSupportTicket(lookupCode.trim().toUpperCase());
      setLookupResult(ticket);
    } catch (err: any) {
      setLookupError(err.message || 'No se encontró una orden con ese código.');
    } finally {
      setLookingUp(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          {onBackToCatalog && (
            <button
              onClick={onBackToCatalog}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white mb-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
          )}
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400">
            <Wrench className="w-4 h-4" />
            Centro Especializado de Ingeniería & Soporte — {company.name}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            AGENDA TU SERVICIO TÉCNICO
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Solicita tu servicio de manera fácil y segura. Nuestro equipo revisará tu solicitud y confirmará la disponibilidad.
          </p>
        </div>

        {/* Quick Order Lookup Box */}
        <form onSubmit={handleLookup} className="w-full md:w-80 bg-slate-800/90 p-4 rounded-xl border border-slate-700 space-y-2.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Consultar Seguimiento (SRV)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={lookupCode}
              onChange={e => setLookupCode(e.target.value)}
              placeholder="Ej: SRV-2026-1001"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={lookingUp}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              {lookingUp ? '...' : 'Ver'}
            </button>
          </div>
          {lookupError && <p className="text-xs text-red-400">{lookupError}</p>}
        </form>
      </div>

      {/* Lookup Result Modal/Banner */}
      {lookupResult && (
        <div className="bg-white rounded-xl border-2 border-blue-600 p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Solicitud Localizada:
              </span>
              <span className="text-base font-extrabold text-slate-900">{lookupResult.ticketNumber}</span>
              <span className="text-xs font-semibold text-emerald-700">
                • Estado: {lookupResult.status}
              </span>
            </div>
            <button
              onClick={() => setLookupResult(null)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Cerrar consulta ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-700 pt-2 border-t border-slate-100">
            <div>
              <span className="text-slate-400 block">Servicio / Equipo</span>
              <strong className="text-slate-900">{lookupResult.serviceType}</strong>
              <p>{lookupResult.equipmentBrand} {lookupResult.equipmentModel}</p>
            </div>
            <div>
              <span className="text-slate-400 block">Fecha y Hora Preferida</span>
              <strong className="text-slate-900">{lookupResult.appointmentDate || 'Por asignar'} {lookupResult.appointmentTime || ''}</strong>
              <p>{lookupResult.modality}</p>
            </div>
            <div>
              <span className="text-slate-400 block">Estado de Asignación</span>
              <strong className="text-slate-900">{lookupResult.assignedTechnicianName || 'Pendiente de asignación por Administración'}</strong>
              <p>Prioridad: {lookupResult.priority}</p>
            </div>
            <div>
              <span className="text-slate-400 block">Diagnóstico & Costo</span>
              <strong className="text-slate-900">{formatCOP(lookupResult.totalCostCOP || 0)}</strong>
              <p className="truncate">{lookupResult.diagnosis || 'En evaluación técnica'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Screen after Creating Ticket */}
      {createdTicket ? (
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-lg max-w-3xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Solicitud Recibida — Número Único de Seguimiento
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900">{createdTicket.ticketNumber}</h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              Hemos registrado tu solicitud de soporte técnico. Nuestro equipo administrativo revisará la disponibilidad y asignará el ingeniero especialista correspondiente.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Cliente</span>
              <strong className="text-slate-900">{createdTicket.clientName}</strong>
              <p className="text-xs text-slate-600">{createdTicket.clientPhone} • {createdTicket.clientEmail}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Servicio Solicitado</span>
              <strong className="text-slate-900">{createdTicket.serviceType}</strong>
              <p className="text-xs text-slate-600">{createdTicket.equipmentType} — {createdTicket.equipmentBrand} {createdTicket.equipmentModel}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Fecha y Hora Preferida</span>
              <strong className="text-slate-900">{createdTicket.appointmentDate} a las {createdTicket.appointmentTime}</strong>
              <p className="text-xs text-slate-600">Modalidad: {createdTicket.modality}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Estado de la Solicitud</span>
              <strong className="text-emerald-700">{createdTicket.status || 'Pendiente de asignación'}</strong>
              <p className="text-xs text-slate-600">Asignación interna por coordinación técnica IPS</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={`https://wa.me/${(company.whatsapp || company.phone || '+573001234567').replace(/\D/g, '')}?text=${encodeURIComponent(
                `Hola *IPS TECNOLÓGICA*, acabo de radicar la solicitud de servicio técnico *${createdTicket.ticketNumber}* (${createdTicket.serviceType}) para mi equipo ${createdTicket.equipmentBrand} ${createdTicket.equipmentModel}.\n📅 Fecha preferida: ${createdTicket.appointmentDate} a las ${createdTicket.appointmentTime}\n📍 Modalidad: ${createdTicket.modality} (${createdTicket.address || company.address})`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar Comprobante por WhatsApp (wa.me)
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${createdTicket.address || company.address}, ${createdTicket.city || company.city || 'Cali'}, Colombia`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Ver Ubicación en Google Maps
            </a>
            <button
              onClick={() => setCreatedTicket(null)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Solicitar Otro Servicio
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Service Catalog Cards */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Laptop className="w-5 h-5 text-red-600" />
                Servicios Disponibles
              </h3>
              <p className="text-xs text-slate-500">
                Selecciona el tipo de servicio que necesitas para tu solicitud:
              </p>
              <div className="space-y-1.5">
                {serviceTypes.map(type => {
                  const active = serviceType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setServiceType(type)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                        active
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>{type}</span>
                      {active && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-xl p-5 space-y-3 border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                Garantía y Asignación Profesional IPS
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Cada solicitud genera un número único de seguimiento <strong className="text-white">SRV-2026</strong>. Nuestro coordinador técnico asignará al especialista certificado según el tipo de equipo y confirmará tu horario.
              </p>
              <div className="text-xs text-slate-400 pt-2 border-t border-slate-800 space-y-1">
                <p>📍 Sede Principal: {company.address}</p>
                <p>🕒 Lunes a Viernes: 8:00 AM - 6:00 PM | Sábados: 8:00 AM - 2:00 PM</p>
              </div>
            </div>
          </div>

          {/* Right 2 Columns: Booking Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Formulario de Solicitud de Servicio Técnico
              </h2>
              <p className="text-xs text-slate-500">
                Solicita tu servicio de manera fácil y segura. Nuestro equipo revisará tu solicitud y confirmará la disponibilidad.
              </p>
            </div>

            {/* 1. Datos del Cliente */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Datos del Cliente
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Ej: Carlos Andrés Gómez"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    placeholder="Ej: +57 300 123 4567"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="cliente@correo.com"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Empresa (Opcional)
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Nombre de la empresa o NIT"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Información del Equipo y Falla */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Equipo, Marca, Modelo y Descripción del Problema
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Servicio *
                  </label>
                  <select
                    value={serviceType}
                    onChange={e => setServiceType(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
                  >
                    {serviceTypes.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Equipo *
                  </label>
                  <select
                    value={equipmentType}
                    onChange={e => setEquipmentType(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Portátil / Laptop">Portátil / Laptop</option>
                    <option value="Computador de Escritorio / Workstation">Computador de Escritorio / Workstation</option>
                    <option value="Servidor / NAS / Rack">Servidor / NAS / Rack</option>
                    <option value="Impresora / Multifuncional">Impresora / Multifuncional</option>
                    <option value="Sistema CCTV / Cámaras IP">Sistema CCTV / Cámaras IP</option>
                    <option value="Red WiFi / Cableado Estructurado">Red WiFi / Cableado Estructurado</option>
                    <option value="Monitor / Periférico">Monitor / Periférico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marca del Equipo
                  </label>
                  <input
                    type="text"
                    value={equipmentBrand}
                    onChange={e => setEquipmentBrand(e.target.value)}
                    placeholder="Ej: ASUS, Lenovo, Dell, HP, Hikvision"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Modelo y Serial (Opcional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={equipmentModel}
                      onChange={e => setEquipmentModel(e.target.value)}
                      placeholder="Modelo (Ej: ThinkPad T14)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={e => setSerialNumber(e.target.value)}
                      placeholder="Serial (S/N)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción del Problema *
                </label>
                <textarea
                  rows={3}
                  required
                  value={problemDescription}
                  onChange={e => setProblemDescription(e.target.value)}
                  placeholder="Describe qué falla presenta el equipo, síntomas, códigos de error o qué requerimiento técnico necesitas..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones Adicionales (Opcional)
                </label>
                <input
                  type="text"
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  placeholder="Accesorios incluidos (cargador, maletín), horarios de recepción, indicaciones de acceso..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Photo Attachment */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>{uploadingPhoto ? 'Subiendo archivo...' : 'Adjuntar fotografías o archivos del equipo'}</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
                {photos.length > 0 && (
                  <div className="flex items-center gap-2">
                    {photos.map((url, idx) => (
                      <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                        <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Modalidad, Fecha y Hora Preferida */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                3. Modalidad (Presencial o Remoto), Fecha y Hora Preferida
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['En sede', 'Servicio a domicilio', 'Soporte remoto'] as TechnicalServiceModality[]).map(mod => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setModality(mod)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      modality === mod
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    {mod === 'En sede' ? 'Presencial en sede' : mod}
                  </button>
                ))}
              </div>

              {modality === 'Servicio a domicilio' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dirección Exacta para Visita Técnica *
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Calle / Carrera / Número / Oficina o Apartamento"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-red-600" />
                    Fecha Preferida *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={appointmentDate}
                    onChange={e => setAppointmentDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prioridad del Requerimiento
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as TechnicalServicePriority)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="Baja">Baja — Revisión programada</option>
                    <option value="Media">Media — Uso normal</option>
                    <option value="Alta">Alta — Equipo de trabajo principal</option>
                    <option value="Urgente">Urgente — Parada crítica de operación</option>
                  </select>
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-red-600" />
                  Hora Preferida ({appointmentDate})
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                  {availableSlots.map(slot => {
                    const selected = appointmentTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setAppointmentTime(slot.time)}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                          !slot.available
                            ? 'bg-slate-100 text-slate-400 border-slate-200 line-through cursor-not-allowed'
                            : selected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Tu solicitud quedará en revisión y nuestro coordinador técnico asignará al especialista disponible.</span>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
              >
                {submitting ? 'Enviando Solicitud...' : 'Enviar Solicitud de Servicio Técnico'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
