import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Calendar as CalendarIcon,
  FileText,
  Search,
  Plus,
  CheckCircle2,
  Trash2,
  Download,
  UserCheck,
  Clock,
  Upload
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { api } from '../../services/api';
import {
  TechnicalServiceRequest,
  TechnicalServiceStatus,
  SparePartItem,
  CompanyProfile
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatCOP } from '../../utils/formatters';

interface AdminSupportManagerProps {
  company: CompanyProfile;
  initialSubTab?: 'ordenes' | 'calendario' | 'tecnicos' | 'nueva';
}

const ALL_STATUSES: TechnicalServiceStatus[] = [
  'Recibida',
  'Pendiente de asignación',
  'Asignada',
  'Confirmada',
  'En proceso',
  'En diagnóstico',
  'Esperando repuestos',
  'En reparación',
  'Listo para entrega',
  'Finalizada',
  'Cancelada',
  'Pendiente',
  'Confirmado',
  'Finalizado',
  'Cancelado'
];

export const AdminSupportManager: React.FC<AdminSupportManagerProps> = ({
  company,
  initialSubTab = 'ordenes'
}) => {
  const { user, isAdmin, isTecnico, notify } = useAuth();

  const [tickets, setTickets] = useState<TechnicalServiceRequest[]>([]);
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [workloadList, setWorkloadList] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      specialty: string;
      availabilitySummary: string;
      activeTicketsCount: number;
      completedTicketsCount: number;
      occupiedSlots: Array<{
        ticketId: string;
        ticketNumber: string;
        date: string;
        startTime: string;
        endTime: string;
        clientName: string;
        serviceType: string;
        status: TechnicalServiceStatus;
      }>;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  const [activeSubTab, setActiveSubTab] = useState<'ordenes' | 'calendario' | 'tecnicos' | 'nueva'>(initialSubTab);
  const [calendarMode, setCalendarMode] = useState<'diaria' | 'semanal' | 'mensual'>('semanal');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [onlyMine, setOnlyMine] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<TechnicalServiceRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Edit state for selectedTicket
  const [editStatus, setEditStatus] = useState<TechnicalServiceStatus>('Pendiente de asignación');
  const [editTechId, setEditTechId] = useState('');
  const [editTechName, setEditTechName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('10:00');
  const [editDurationMinutes, setEditDurationMinutes] = useState<number>(60);
  const [editRescheduleReason, setEditRescheduleReason] = useState('');
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [editActivities, setEditActivities] = useState('');
  const [editLaborCost, setEditLaborCost] = useState<number>(0);
  const [editSpareParts, setEditSpareParts] = useState<SparePartItem[]>([]);
  const [editWarranty, setEditWarranty] = useState('');
  const [editBeforePhotos, setEditBeforePhotos] = useState<string[]>([]);
  const [editAfterPhotos, setEditAfterPhotos] = useState<string[]>([]);

  // New spare part row
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partPrice, setPartPrice] = useState(0);

  // Quick create modal/tab fields
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newServiceType, setNewServiceType] = useState('Mantenimiento preventivo de computadores');
  const [newEquipmentBrand, setNewEquipmentBrand] = useState('');
  const [newEquipmentModel, setNewEquipmentModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newProblem, setNewProblem] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newTime, setNewTime] = useState('10:00');

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, catalogRes, workloadRes] = await Promise.all([
        api.getSupportTickets(onlyMine),
        api.getSupportCatalog(),
        api.getTechniciansWorkload(selectedDate).catch(() => ({ technicians: [] }))
      ]);
      setTickets(ticketsRes);
      if (catalogRes.technicians) setTechnicians(catalogRes.technicians);
      if (workloadRes?.technicians) setWorkloadList(workloadRes.technicians as any);
      if (selectedTicket) {
        const refreshed = ticketsRes.find(t => t.id === selectedTicket.id);
        if (refreshed) openTicketForEdit(refreshed);
      }
    } catch (err: any) {
      notify(err.message || 'Error al cargar órdenes de servicio técnico.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [onlyMine, selectedDate]);

  const openTicketForEdit = (ticket: TechnicalServiceRequest) => {
    setSelectedTicket(ticket);
    setEditStatus(ticket.status);
    setEditTechId(ticket.assignedTechnicianId || '');
    setEditTechName(ticket.assignedTechnicianName || '');
    setEditDate(ticket.appointmentDate || '');
    setEditTime(ticket.appointmentTime || '09:00');
    setEditEndTime(ticket.appointmentEndTime || '10:00');
    setEditDurationMinutes(ticket.durationMinutes || 60);
    setEditRescheduleReason('');
    setEditDiagnosis(ticket.diagnosis || '');
    setEditActivities(ticket.activitiesPerformed || '');
    setEditLaborCost(ticket.laborCostCOP || 0);
    setEditSpareParts(ticket.spareParts || []);
    setEditWarranty(ticket.serviceWarrantyText || '90 días de garantía sobre mano de obra técnica');
    setEditBeforePhotos(ticket.beforePhotos || []);
    setEditAfterPhotos(ticket.afterPhotos || []);
  };

  const handleAddSparePart = () => {
    if (!partName.trim() || partQty <= 0) return;
    const item: SparePartItem = {
      name: partName.trim(),
      quantity: Number(partQty),
      unitPriceCOP: Number(partPrice),
      subtotalCOP: Number(partQty) * Number(partPrice)
    };
    setEditSpareParts(prev => [...prev, item]);
    setPartName('');
    setPartQty(1);
    setPartPrice(0);
  };

  const handleRemoveSparePart = (idx: number) => {
    setEditSpareParts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUploadEvidencePhoto = async (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicket) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.uploadImage(
          file.name,
          String(reader.result),
          false,
          selectedTicket.ticketNumber,
          'Soporte',
          'service_order'
        );
        if (target === 'before') {
          setEditBeforePhotos(prev => [...prev, res.url]);
        } else {
          setEditAfterPhotos(prev => [...prev, res.url]);
        }
        notify('Fotografía de soporte técnico subida.', 'success');
      } catch (err: any) {
        notify(err.message || 'Error al subir foto.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSaving(true);
    try {
      const partsCostCOP = editSpareParts.reduce((sum, p) => sum + (Number(p.subtotalCOP) || 0), 0);
      const totalCostCOP = Number(editLaborCost || 0) + partsCostCOP;
      const techObj = technicians.find(t => t.id === editTechId);

      const res = await api.updateSupportTicket(selectedTicket.id, {
        status: editStatus,
        assignedTechnicianId: isAdmin ? (editTechId || undefined) : selectedTicket.assignedTechnicianId,
        assignedTechnicianName: isAdmin ? (techObj ? techObj.name : editTechName) : selectedTicket.assignedTechnicianName,
        appointmentDate: editDate || undefined,
        appointmentTime: editTime || undefined,
        appointmentEndTime: editEndTime || undefined,
        durationMinutes: Number(editDurationMinutes || 60),
        rescheduleReason: editRescheduleReason.trim() || undefined,
        diagnosis: editDiagnosis,
        activitiesPerformed: editActivities,
        spareParts: editSpareParts,
        laborCostCOP: Number(editLaborCost || 0),
        partsCostCOP,
        totalCostCOP,
        serviceWarrantyText: editWarranty,
        beforePhotos: editBeforePhotos,
        afterPhotos: editAfterPhotos
      } as any);

      setSelectedTicket(res.ticket);
      await loadData();
      notify(res.message || 'Orden de servicio actualizada y sincronizada.', 'success');
    } catch (err: any) {
      notify(err.message || 'Error al guardar orden de servicio.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim() || !newProblem.trim()) {
      notify('Complete nombre, teléfono y descripción de la falla.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.createSupportTicket({
        clientName: newClientName.trim(),
        clientPhone: newClientPhone.trim(),
        clientEmail: newClientEmail.trim(),
        serviceType: newServiceType,
        equipmentType: 'Computador / Equipo',
        equipmentBrand: newEquipmentBrand.trim() || 'IPS',
        equipmentModel: newEquipmentModel.trim() || 'Estándar',
        serialNumber: newSerial.trim() || undefined,
        problemDescription: newProblem.trim(),
        modality: 'En sede',
        appointmentDate: newDate,
        appointmentTime: newTime,
        priority: 'Media'
      });
      notify(res.message, 'success');
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
      setNewProblem('');
      setActiveSubTab('ordenes');
      await loadData();
      openTicketForEdit(res.ticket);
    } catch (err: any) {
      notify(err.message || 'Error al crear orden.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTicket = async (ticket: TechnicalServiceRequest) => {
    const confirmed = window.confirm(
      `¿Enviar la orden de servicio ${ticket.ticketNumber} (${ticket.clientName}) a la Papelera de recuperación?`
    );
    if (!confirmed) return;
    try {
      await api.deleteSupportTicket(ticket.id);
      if (selectedTicket?.id === ticket.id) setSelectedTicket(null);
      await loadData();
      notify(`Orden ${ticket.ticketNumber} enviada a la Papelera.`, 'info');
    } catch (err: any) {
      notify(err.message || 'Error al eliminar orden.', 'error');
    }
  };

  /**
   * Generates a complete professional Orden de Servicio PDF with jsPDF
   * and uploads a copy to Google Drive 06_ORDENES_DE_SERVICIO
   */
  const handleGenerateServiceOrderPdf = async (ticket: TechnicalServiceRequest) => {
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 36, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(company.name || 'IPS TECNOLÓGICA', 14, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`NIT: ${company.nit || '901.458.920-1'} | ${company.address || 'Bogotá D.C.'}`, 14, 21);
      doc.text(`WhatsApp: ${company.whatsapp} | Tel: ${company.phone} | ${company.email}`, 14, 26);

      // Order Number Badge on right
      doc.setFillColor(220, 38, 38);
      doc.roundedRect(pageWidth - 72, 8, 58, 20, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('ORDEN DE SERVICIO TÉCNICO', pageWidth - 43, 14, { align: 'center' });
      doc.setFontSize(12);
      doc.text(ticket.ticketNumber, pageWidth - 43, 22, { align: 'center' });

      let y = 45;

      // Client & Appointment Info Box
      doc.setTextColor(15, 23, 42);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, y, pageWidth - 28, 30, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('DATOS DEL CLIENTE Y AGENDAMIENTO', 18, y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Cliente: ${ticket.clientName}`, 18, y + 14);
      doc.text(`Teléfono / WhatsApp: ${ticket.clientPhone}`, 18, y + 20);
      doc.text(`Correo: ${ticket.clientEmail || 'N/A'}`, 18, y + 26);

      doc.text(`Estado Actual: ${ticket.status}`, 110, y + 14);
      doc.text(`Cita: ${ticket.appointmentDate || 'N/A'} ${ticket.appointmentTime || ''} (${ticket.modality})`, 110, y + 20);
      doc.text(`Técnico Asignado: ${ticket.assignedTechnicianName || 'Por asignar'}`, 110, y + 26);

      y += 36;

      // Equipment Details Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y, pageWidth - 28, 26, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('INFORMACIÓN DEL EQUIPO Y SERVICIO SOLICITADO', 18, y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Servicio: ${ticket.serviceType}`, 18, y + 14);
      doc.text(`Equipo: ${ticket.equipmentType} | Marca: ${ticket.equipmentBrand} | Modelo: ${ticket.equipmentModel}`, 18, y + 20);
      doc.text(`Serial (S/N): ${ticket.serialNumber || 'N/A'} | Prioridad: ${ticket.priority}`, 130, y + 14);

      y += 32;

      // Problem & Technical Diagnosis
      const drawSection = (title: string, content: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(title, 14, y);
        y += 4;
        const lines = doc.splitTextToSize(content || 'Sin registro.', pageWidth - 34);
        const boxH = Math.max(14, lines.length * 4.5 + 6);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(14, y, pageWidth - 28, boxH, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(lines, 17, y + 6);
        y += boxH + 6;
      };

      drawSection('1. FALLA O PROBLEMA REPORTADO POR EL CLIENTE', ticket.problemDescription);
      drawSection('2. DIAGNÓSTICO TÉCNICO', ticket.diagnosis || 'En revisión por ingeniería.');
      drawSection('3. ACTIVIDADES REALIZADAS', ticket.activitiesPerformed || 'Mantenimiento / Revisión general.');

      // Spare Parts & Cost Breakdown
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('4. REPUESTOS UTILIZADOS Y LIQUIDACIÓN DEL SERVICIO', 14, y);
      y += 4;

      if (ticket.spareParts && ticket.spareParts.length > 0) {
        ticket.spareParts.forEach(sp => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.text(
            `• ${sp.quantity}x ${sp.name} (${formatCOP(sp.unitPriceCOP ?? sp.unitCostCOP ?? 0)} c/u) — Subtotal: ${formatCOP(sp.subtotalCOP ?? 0)}`,
            18,
            y + 4
          );
          y += 5;
        });
        y += 3;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text('• No se facturaron repuestos adicionales.', 18, y + 4);
        y += 8;
      }

      // Cost Summary Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, y, pageWidth - 28, 20, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Mano de Obra: ${formatCOP(ticket.laborCostCOP || 0)}`, 18, y + 8);
      doc.text(`Total Repuestos: ${formatCOP(ticket.partsCostCOP || 0)}`, 85, y + 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(220, 38, 38);
      doc.text(`VALOR TOTAL: ${formatCOP(ticket.totalCostCOP || 0)}`, pageWidth - 18, y + 8, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`Garantía del servicio: ${ticket.serviceWarrantyText || '90 días sobre mano de obra.'}`, 18, y + 16);

      y += 34;

      // Signatures
      doc.setDrawColor(148, 163, 184);
      doc.line(22, y + 12, 88, y + 12);
      doc.line(pageWidth - 88, y + 12, pageWidth - 22, y + 12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('FIRMA DEL TÉCNICO RESPONSABLE', 55, y + 17, { align: 'center' });
      doc.text('FIRMA Y ACEPTACIÓN DEL CLIENTE', pageWidth - 55, y + 17, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(ticket.assignedTechnicianName || 'Ingeniería IPS TECNOLÓGICA', 55, y + 22, { align: 'center' });
      doc.text(ticket.clientName, pageWidth - 55, y + 22, { align: 'center' });

      const pdfFileName = `ORDEN_SERVICIO_${ticket.ticketNumber}.pdf`;
      doc.save(pdfFileName);

      // Save PDF copy to server & Google Drive 06_ORDENES_DE_SERVICIO
      try {
        const dataUri = doc.output('datauristring');
        const uploadRes = await api.uploadImage(
          pdfFileName,
          dataUri,
          false,
          ticket.ticketNumber,
          'OrdenesServicio',
          'service_order'
        );
        await api.updateSupportTicket(ticket.id, { serviceOrderPdfUrl: uploadRes.url });
      } catch {}

      notify(`Orden de Servicio ${ticket.ticketNumber} generada en PDF exitosamente.`, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al generar PDF de Orden de Servicio.', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.ticketNumber.toLowerCase().includes(q) ||
      t.clientName.toLowerCase().includes(q) ||
      t.clientPhone.toLowerCase().includes(q) ||
      t.serviceType.toLowerCase().includes(q) ||
      `${t.equipmentBrand} ${t.equipmentModel}`.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // Filter appointments for calendar view
  const calendarTickets = tickets.filter(t => {
    if (!t.appointmentDate || t.status === 'Cancelado') return false;
    if (calendarMode === 'diaria') {
      return t.appointmentDate === selectedDate;
    }
    if (calendarMode === 'mensual') {
      return t.appointmentDate.slice(0, 7) === selectedDate.slice(0, 7);
    }
    // Semanal: within +/- 6 days of selectedDate
    const selTime = new Date(selectedDate).getTime();
    const tTime = new Date(t.appointmentDate).getTime();
    return Math.abs(tTime - selTime) <= 7 * 86400000;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-red-600" />
            Gestión de Soporte Técnico, Técnicos, Órdenes (SRV) y Agenda
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Asignación exclusiva de técnicos por el Administrador, control de disponibilidad real, bloqueo de cruces de horario, diagnósticos y órdenes PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('ordenes')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'ordenes'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Órdenes de Servicio ({tickets.length})
          </button>
          <button
            onClick={() => setActiveSubTab('tecnicos')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'tecnicos'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Técnicos y Disponibilidad ({workloadList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('calendario')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'calendario'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            Agenda Técnica
          </button>
          <button
            onClick={() => setActiveSubTab('nueva')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'nueva'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 hover:bg-red-100 text-red-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            Nueva Orden
          </button>
        </div>
      </div>

      {/* SUBTAB: TÉCNICOS, CARGA DE TRABAJO Y ASIGNACIÓN EXCLUSIVA */}
      {activeSubTab === 'tecnicos' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-red-600" />
                Panel Exclusivo de Técnicos, Disponibilidad Real y Carga de Trabajo
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdmin
                  ? 'Como Administrador puedes consultar los horarios ocupados de cada ingeniero y asignar órdenes pendientes evitando citas simultáneas.'
                  : 'Vista de supervisión de carga de trabajo y disponibilidad de ingenieros.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Consultar fecha:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workloadList.map(tech => (
              <div
                key={tech.id}
                className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">{tech.name}</h4>
                      <p className="text-[11px] text-red-600 font-semibold">{tech.specialty}</p>
                      <p className="text-[11px] text-slate-500">{tech.email}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {tech.activeTicketsCount} activas
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                    🕒 {tech.availabilitySummary}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Horarios ocupados ({tech.occupiedSlots.length}):
                    </span>
                    {tech.occupiedSlots.length === 0 ? (
                      <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        ✓ Sin citas en conflicto para esta fecha. Disponible para asignación.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {tech.occupiedSlots.map(slot => (
                          <div
                            key={slot.ticketId}
                            className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] flex items-center justify-between gap-2"
                          >
                            <div>
                              <strong className="text-slate-900 font-mono">{slot.ticketNumber}</strong>
                              <span className="text-slate-600 block truncate">{slot.clientName}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-red-600 block">
                                {slot.date} · {slot.startTime} - {slot.endTime}
                              </span>
                              <span className="text-[10px] text-slate-500">{slot.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Finalizadas: <strong>{tech.completedTicketsCount}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm(tech.name);
                      setActiveSubTab('ordenes');
                    }}
                    className="text-red-600 font-bold hover:underline"
                  >
                    Ver órdenes →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pending Unassigned Orders Table for Quick Admin Assignment */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Solicitudes Pendientes de Asignación ({tickets.filter(t => !t.assignedTechnicianId || t.status === 'Pendiente de asignación' || t.status === 'Recibida').length})
            </h4>
            {tickets.filter(t => !t.assignedTechnicianId || t.status === 'Pendiente de asignación' || t.status === 'Recibida').length === 0 ? (
              <p className="text-xs text-slate-500">Todas las solicitudes actuales cuentan con técnico asignado.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tickets
                  .filter(t => !t.assignedTechnicianId || t.status === 'Pendiente de asignación' || t.status === 'Recibida')
                  .map(t => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-red-600">{t.ticketNumber}</span>
                        <strong className="text-slate-900 ml-2">{t.clientName}</strong>
                        <p className="text-slate-600">{t.serviceType} — {t.equipmentBrand} {t.equipmentModel}</p>
                        <p className="text-[11px] text-slate-500">
                          Fecha solicitada: {t.appointmentDate || 'Por definir'} a las {t.appointmentTime || '09:00'} ({t.modality})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          openTicketForEdit(t);
                          setActiveSubTab('ordenes');
                        }}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shrink-0"
                      >
                        Asignar Técnico
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB: NUEVA ORDEN RÁPIDA */}
      {activeSubTab === 'nueva' && (
        <form onSubmit={handleCreateTicket} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 max-w-3xl">
          <h3 className="text-base font-bold text-slate-900">Registrar Nueva Orden de Servicio en Sede o Domicilio</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cliente *</label>
              <input
                type="text"
                required
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono / WhatsApp *</label>
              <input
                type="text"
                required
                value={newClientPhone}
                onChange={e => setNewClientPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="+57 300..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo</label>
              <input
                type="email"
                value={newClientEmail}
                onChange={e => setNewClientEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="cliente@correo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Marca Equipo</label>
              <input
                type="text"
                value={newEquipmentBrand}
                onChange={e => setNewEquipmentBrand(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Lenovo / HP / Dell"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Modelo</label>
              <input
                type="text"
                value={newEquipmentModel}
                onChange={e => setNewEquipmentModel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Modelo"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Serial (S/N)</label>
              <input
                type="text"
                value={newSerial}
                onChange={e => setNewSerial(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Número de serie"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Servicio</label>
              <input
                type="text"
                value={newServiceType}
                onChange={e => setNewServiceType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Cita</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Cita</label>
              <input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción de Falla *</label>
            <textarea
              rows={3}
              required
              value={newProblem}
              onChange={e => setNewProblem(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Falla reportada al recibir el equipo..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setActiveSubTab('ordenes')}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
            >
              {saving ? 'Creando...' : 'Guardar y Generar Orden SRV'}
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB: CALENDARIO TÉCNICO (DIARIA / SEMANAL / MENSUAL) */}
      {activeSubTab === 'calendario' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              {(['diaria', 'semanal', 'mensual'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setCalendarMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${
                    calendarMode === mode
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Vista {mode}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Fecha base:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {calendarTickets.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              No hay citas programadas en el rango seleccionado ({selectedDate}).
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {calendarTickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => {
                    openTicketForEdit(ticket);
                    setActiveSubTab('ordenes');
                  }}
                  className="cursor-pointer rounded-xl border border-slate-200 hover:border-red-500 p-4 space-y-2 transition-all bg-slate-50/60 hover:bg-white shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-red-600">{ticket.ticketNumber}</span>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {ticket.appointmentDate} • {ticket.appointmentTime}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{ticket.serviceType}</h4>
                  <p className="text-xs text-slate-600">
                    Cliente: <strong>{ticket.clientName}</strong> ({ticket.clientPhone})
                  </p>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80">
                    <span className="text-slate-500">Técnico: {ticket.assignedTechnicianName || 'Por asignar'}</span>
                    <span className="font-semibold text-emerald-700">{ticket.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB: ÓRDENES DE SERVICIO Y PANEL DE EDICIÓN */}
      {activeSubTab === 'ordenes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left List */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar por SRV-2026, cliente, teléfono o equipo..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="ALL">Todos los estados ({tickets.length})</option>
                  {ALL_STATUSES.map(st => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                {isTecnico && (
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={onlyMine}
                      onChange={e => setOnlyMine(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Mis órdenes
                  </label>
                )}
              </div>
            </div>

            {loading ? (
              <p className="text-xs text-slate-500 py-8 text-center">Cargando órdenes de servicio...</p>
            ) : filteredTickets.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No se encontraron órdenes de servicio.</p>
            ) : (
              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {filteredTickets.map(ticket => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => openTicketForEdit(ticket)}
                      className={`cursor-pointer p-3.5 rounded-xl border transition-all space-y-1.5 ${
                        isSelected
                          ? 'border-red-600 bg-red-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900">{ticket.ticketNumber}</span>
                        <span className="text-xs font-bold text-blue-700">{ticket.status}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{ticket.serviceType}</p>
                      <p className="text-xs text-slate-600">
                        {ticket.clientName} • {ticket.clientPhone}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>📅 {ticket.appointmentDate || 'Sin fecha'} {ticket.appointmentTime || ''}</span>
                        <span className="font-semibold text-slate-800">{formatCOP(ticket.totalCostCOP || 0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Detail & Editor */}
          <div className="lg:col-span-7">
            {!selectedTicket ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
                Selecciona una orden de servicio de la lista izquierda para gestionar su diagnóstico, técnico asignado, repuestos y generar su PDF oficial.
              </div>
            ) : (
              <form onSubmit={handleSaveTicket} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                      Orden de Servicio Oficial
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900">
                      {selectedTicket.ticketNumber} — {selectedTicket.clientName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Equipo: {selectedTicket.equipmentBrand} {selectedTicket.equipmentModel} | Tel: {selectedTicket.clientPhone}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={generatingPdf}
                      onClick={() => handleGenerateServiceOrderPdf(selectedTicket)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {generatingPdf ? 'Generando PDF...' : 'Descargar Orden PDF'}
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTicket(selectedTicket)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200"
                        title="Enviar a Papelera"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status, Exclusive Admin Technician Assignment & Date/Time with Conflict Prevention */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-red-600" />
                      Asignación Exclusiva de Técnico y Programación Horaria
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isAdmin ? 'Validación activa contra citas simultáneas' : 'Solo el Administrador puede cambiar técnico'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Estado de la Orden</label>
                      <select
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value as TechnicalServiceStatus)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                      >
                        {ALL_STATUSES.map(st => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Técnico Asignado (Exclusivo Administrador)
                      </label>
                      <select
                        value={editTechId}
                        disabled={!isAdmin}
                        onChange={e => {
                          setEditTechId(e.target.value);
                          const found = technicians.find(t => t.id === e.target.value);
                          if (found) setEditTechName(found.name);
                          if (e.target.value && (editStatus === 'Recibida' || editStatus === 'Pendiente de asignación')) {
                            setEditStatus('Asignada');
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white disabled:bg-slate-100"
                      >
                        <option value="">Sin asignar (Pendiente de asignación)</option>
                        {technicians.map(t => {
                          const wl = workloadList.find(w => w.id === t.id);
                          return (
                            <option key={t.id} value={t.id}>
                              {t.name} {wl ? `— ${wl.specialty} (${wl.activeTicketsCount} activas)` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Inicio Cita</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Inicio</label>
                      <input
                        type="time"
                        value={editTime}
                        onChange={e => setEditTime(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Hora Finalización</label>
                      <input
                        type="time"
                        value={editEndTime}
                        onChange={e => setEditEndTime(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nota / Motivo de Asignación, Reprogramación o Cancelación
                      </label>
                      <input
                        type="text"
                        value={editRescheduleReason}
                        onChange={e => setEditRescheduleReason(e.target.value)}
                        placeholder="Ej: Confirmado con el cliente vía telefónica / Reprogramado por disponibilidad"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Duración (min)</label>
                      <input
                        type="number"
                        min={15}
                        step={15}
                        value={editDurationMinutes}
                        onChange={e => setEditDurationMinutes(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>

                  {selectedTicket.scheduleHistory && selectedTicket.scheduleHistory.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1">
                      <span className="font-bold text-slate-700 block">
                        Historial de Asignaciones y Reprogramaciones ({selectedTicket.scheduleHistory.length}):
                      </span>
                      <div className="max-h-24 overflow-y-auto space-y-1">
                        {selectedTicket.scheduleHistory.slice(0, 4).map((h, i) => (
                          <div key={h.id || i} className="text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-200 flex items-center justify-between">
                            <span>
                              <strong>{h.action}</strong>: {h.technicianName || 'Sin técnico'} ({h.newDate || 'S/F'} {h.newTime || ''}) {h.reason ? `— ${h.reason}` : ''}
                            </span>
                            <span className="text-[10px] text-slate-400">{new Date(h.changedAt || h.date).toLocaleDateString('es-CO')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Problem Reported */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-700 block">Falla reportada por el cliente:</span>
                  <p className="text-slate-600">{selectedTicket.problemDescription}</p>
                  {selectedTicket.observations && (
                    <p className="text-slate-500 pt-1 border-t border-slate-200">
                      <strong>Observaciones del cliente:</strong> {selectedTicket.observations}
                    </p>
                  )}
                </div>

                {/* Diagnosis & Activities */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Diagnóstico Técnico
                    </label>
                    <textarea
                      rows={3}
                      value={editDiagnosis}
                      onChange={e => setEditDiagnosis(e.target.value)}
                      placeholder="Resultado de las pruebas de hardware/software..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Actividades Realizadas
                    </label>
                    <textarea
                      rows={3}
                      value={editActivities}
                      onChange={e => setEditActivities(e.target.value)}
                      placeholder="Limpieza ultrasónica, cambio de pasta térmica, configuración..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Spare Parts & Labor Cost */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Repuestos Utilizados y Costos (COP)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] text-slate-500">Descripción del Repuesto</label>
                      <input
                        type="text"
                        value={partName}
                        onChange={e => setPartName(e.target.value)}
                        placeholder="Ej: Unidad SSD NVMe 1TB / Batería Original"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-500">Cant.</label>
                      <input
                        type="number"
                        min={1}
                        value={partQty}
                        onChange={e => setPartQty(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-slate-500">Precio Unit. COP</label>
                      <input
                        type="number"
                        min={0}
                        value={partPrice}
                        onChange={e => setPartPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <button
                        type="button"
                        onClick={handleAddSparePart}
                        className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {editSpareParts.length > 0 && (
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                      {editSpareParts.map((sp, idx) => (
                        <div key={idx} className="px-3 py-2 flex items-center justify-between">
                          <span>
                            <strong>{sp.quantity}x</strong> {sp.name} ({formatCOP(sp.unitPriceCOP ?? sp.unitCostCOP ?? 0)} c/u)
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-900">{formatCOP(sp.subtotalCOP ?? 0)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSparePart(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Costo Mano de Obra (COP)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editLaborCost}
                        onChange={e => setEditLaborCost(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Garantía del Servicio Técnico
                      </label>
                      <input
                        type="text"
                        value={editWarranty}
                        onChange={e => setEditWarranty(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Before / After Photos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-red-600">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Foto Antes del Servicio ({editBeforePhotos.length})</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleUploadEvidencePhoto(e, 'before')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-600">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Foto Después del Servicio ({editAfterPhotos.length})</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleUploadEvidencePhoto(e, 'after')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Save Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-sm font-extrabold text-slate-900">
                    Total Orden:{' '}
                    <span className="text-red-600">
                      {formatCOP(
                        Number(editLaborCost || 0) +
                          editSpareParts.reduce((s, p) => s + (Number(p.subtotalCOP) || 0), 0)
                      )}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {saving ? 'Guardando...' : 'Guardar Cambios en Servidor'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
