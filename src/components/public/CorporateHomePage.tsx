import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Cpu, Wrench, Monitor, Truck, CreditCard, Phone, Mail,
  MapPin, Clock, CheckCircle2, ArrowRight, Sparkles, Calendar, Users,
  Award, HelpCircle, ChevronDown, ChevronUp, ExternalLink, Headphones,
  HardDrive, Wifi, Lock, RefreshCw, MessageSquare, Building2, Star,
  FileText, Zap, Package, Globe, Check, Send, AlertCircle, Layers
} from 'lucide-react';
import { Product, CompanyProfile, PromotionalPoster, LandingPageCmsConfig, AppConfig } from '../../types';
import { api } from '../../services/api';
import { resolveProductImageUrl, getProductFallbackSvg } from '../../utils/imageResolver';
import { PublicSupportBooking } from '../support/PublicSupportBooking';

interface CorporateHomePageProps {
  products: Product[];
  categories?: any[];
  company: CompanyProfile;
  appConfig?: AppConfig | null;
  onGoToCatalog?: () => void;
  onOpenCatalog?: () => void;
  onGoToClientPortal?: () => void;
  onOpenClientPortal?: () => void;
  onOpenSupportBooking?: () => void;
  onOpenStudio?: () => void;
  onSelectProduct?: (product: Product) => void;
}

export const CorporateHomePage: React.FC<CorporateHomePageProps> = ({
  products,
  company,
  onGoToCatalog,
  onOpenCatalog,
  onGoToClientPortal,
  onOpenClientPortal,
  onOpenSupportBooking,
  onOpenStudio
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [posters, setPosters] = useState<PromotionalPoster[]>([]);
  const [cms, setCms] = useState<LandingPageCmsConfig | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Contact inquiry form state
  const [contactForm, setContactForm] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    subject: 'Cotización Corporativa / Equipos',
    message: ''
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactResult, setContactResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleCatalogClick = () => {
    if (onOpenCatalog) onOpenCatalog();
    else if (onGoToCatalog) onGoToCatalog();
  };

  const handleClientPortalClick = () => {
    if (onOpenClientPortal) onOpenClientPortal();
    else if (onGoToClientPortal) onGoToClientPortal();
  };

  const handleSupportBookingClick = () => {
    if (onOpenSupportBooking) {
      onOpenSupportBooking();
    } else {
      const el = document.getElementById('agendar-cita');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else setShowBookingModal(true);
    }
  };

  useEffect(() => {
    api.getPromotionalPosters().then(data => {
      if (Array.isArray(data)) {
        setPosters(data.filter(p => p.active !== false));
      }
    }).catch(() => {});

    api.getLandingPageCms().then(data => {
      if (data && data.heroTitle) {
        setCms(data);
      }
    }).catch(() => {});
  }, []);

  const featuredProducts = products.filter(p => p.featured || p.stock > 0).slice(0, 8);

  const rawPhone = (cms?.contactPhone || company.phone || '573000000000').replace(/\D/g, '');
  const cleanPhone = rawPhone.startsWith('57') ? rawPhone : `57${rawPhone}`;

  const getWhatsAppLink = (customMessage: string) => {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customMessage)}`;
  };

  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    cms?.contactAddress || company.address || 'Bogotá, Colombia'
  )}`;

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phone.trim() || !contactForm.message.trim()) {
      setContactResult({ ok: false, msg: 'Por favor completa tu nombre, teléfono y mensaje.' });
      return;
    }
    setContactSubmitting(true);
    setContactResult(null);
    try {
      const res = await api.submitContactInquiry({
        fullName: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone,
        companyName: contactForm.companyName,
        subject: contactForm.subject,
        message: contactForm.message
      });
      if (res && res.success) {
        setContactResult({
          ok: true,
          msg: res.message || '¡Mensaje recibido y registrado en nuestro CRM! Un asesor corporativo se comunicará contigo muy pronto.'
        });
        setContactForm({
          name: '',
          companyName: '',
          email: '',
          phone: '',
          subject: 'Cotización Corporativa / Equipos',
          message: ''
        });
      } else {
        setContactResult({ ok: false, msg: (res as any)?.error || 'No se pudo enviar el mensaje. Intenta nuevamente.' });
      }
    } catch (err: any) {
      setContactResult({ ok: false, msg: err?.message || 'Error de conexión al enviar el formulario.' });
    } finally {
      setContactSubmitting(false);
    }
  };

  const servicesList = cms?.services && cms.services.length > 0 ? cms.services : [
    {
      id: 'srv-1',
      title: 'Mantenimiento Preventivo y Correctivo',
      description: 'Limpieza profunda ultrasónica, cambio de pasta térmica de alto rendimiento, optimización de sistema operativo y reparación electrónica de placas.',
      tag: 'Laboratorio Certificado',
      icon: 'Wrench',
      whatsappText: 'Hola IPS TECNOLÓGICA, deseo cotizar un Mantenimiento Preventivo / Correctivo para mi equipo.'
    },
    {
      id: 'srv-2',
      title: 'Soporte Técnico Remoto Inmediato',
      description: 'Asistencia en tiempo real mediante AnyDesk o RustDesk para configuración de impresoras, eliminación de virus, correo corporativo y errores de sistema.',
      tag: 'Atención en 15 min',
      icon: 'Wifi',
      whatsappText: 'Hola IPS TECNOLÓGICA, necesito Soporte Técnico Remoto inmediato.'
    },
    {
      id: 'srv-3',
      title: 'Servicio Técnico a Domicilio y Empresas',
      description: 'Visitas técnicas programadas en tu oficina u hogar para diagnóstico de redes, cableado estructurado, servidores y estaciones de trabajo.',
      tag: 'Cobertura Urbana',
      icon: 'Truck',
      whatsappText: 'Hola IPS TECNOLÓGICA, deseo agendar una Visita Técnica a Domicilio / Empresarial.'
    },
    {
      id: 'srv-4',
      title: 'Venta de Computadores, Portátiles y Servidores',
      description: 'Equipos corporativos, estaciones gráficas, portátiles empresariales y partes originales con factura legal y garantía directa.',
      tag: 'Hardware Original',
      icon: 'Monitor',
      whatsappText: 'Hola IPS TECNOLÓGICA, quiero asesoría para compra de computadores o repuestos.'
    },
    {
      id: 'srv-5',
      title: 'Licenciamiento y Software Original',
      description: 'Instalación y activación legal de Microsoft Windows, Office 365, Antivirus Corporativo, suites de diseño e ingeniería y copias de seguridad.',
      tag: '100% Legal',
      icon: 'Lock',
      whatsappText: 'Hola IPS TECNOLÓGICA, deseo cotizar licencias de software original.'
    },
    {
      id: 'srv-6',
      title: 'Actualización de Alto Rendimiento (Upgrades)',
      description: 'Multiplicamos la velocidad de tu equipo actual con unidades SSD NVMe de última generación, ampliación de memoria RAM DDR4/DDR5 y tarjetas gráficas.',
      tag: 'Hasta 10x más rápido',
      icon: 'Cpu',
      whatsappText: 'Hola IPS TECNOLÓGICA, quiero actualizar mi computador con SSD o memoria RAM.'
    },
    {
      id: 'srv-7',
      title: 'Recuperación de Datos y Backups en la Nube',
      description: 'Rescate de información en discos duros dañados, unidades sólidas o memorias USB, y configuración de respaldos automáticos empresariales.',
      tag: 'Seguridad Crítica',
      icon: 'HardDrive',
      whatsappText: 'Hola IPS TECNOLÓGICA, necesito ayuda con recuperación de datos o copias de seguridad.'
    },
    {
      id: 'srv-8',
      title: 'Redes Empresariales, Wi-Fi y Videovigilancia',
      description: 'Diseño e implementación de redes empresariales seguras, firewalls, puntos de acceso Wi-Fi de alta densidad y cámaras de seguridad IP.',
      tag: 'Infraestructura TI',
      icon: 'Globe',
      whatsappText: 'Hola IPS TECNOLÓGICA, requiero asesoría en redes empresariales o videovigilancia.'
    },
    {
      id: 'srv-9',
      title: 'Pólizas de Soporte TI y Outsourcing Corporativo',
      description: 'Planes mensuales de mantenimiento y mesa de ayuda para PyMEs y empresas, garantizando continuidad operativa y respuesta prioritaria.',
      tag: 'Continuidad de Negocio',
      icon: 'Building2',
      whatsappText: 'Hola IPS TECNOLÓGICA, me interesa conocer los planes de soporte corporativo para empresas.'
    }
  ];

  const howWeWorkSteps = cms?.howWeWork && cms.howWeWork.length > 0 ? cms.howWeWork : [
    { step: '01', title: 'Recibimos', description: 'Registramos tu solicitud o equipo con código único de seguimiento e inventario fotográfico.' },
    { step: '02', title: 'Diagnosticamos', description: 'Evaluamos técnicamente el estado de hardware, software o infraestructura con herramientas de precisión.' },
    { step: '03', title: 'Proponemos', description: 'Presentamos un presupuesto transparente con opciones claras antes de ejecutar cualquier intervención.' },
    { step: '04', title: 'Solucionamos', description: 'Realizamos la reparación, mantenimiento o implementación bajo estrictos controles de calidad.' },
    { step: '05', title: 'Acompañamos', description: 'Entregamos garantía por escrito, factura legal y seguimiento posventa en tu Portal de Clientes.' }
  ];

  const benefitsList = cms?.benefits && cms.benefits.length > 0 ? cms.benefits : [
    { title: 'Trazabilidad en Línea 24/7', description: 'Consulta el estado real de tus órdenes de servicio (SRV), garantías y pedidos desde nuestro Portal de Clientes.' },
    { title: 'Repuestos y Licencias 100% Originales', description: 'Trabajamos exclusivamente con distribuidores autorizados y componentes certificados de fábrica.' },
    { title: 'Laboratorio Especializado y Seguro', description: 'Protocolos antiestáticos, custodia segura de tu información y confidencialidad empresarial garantizada.' },
    { title: 'Atención Omnicanal y Cumplimiento', description: 'Tiempos de respuesta definidos, facturación electrónica DIAN y envíos asegurados a toda Colombia.' }
  ];

  const testimonialsList = cms?.testimonials && cms.testimonials.length > 0 ? cms.testimonials : [
    {
      id: 'test-1',
      clientName: 'Carlos Andrés Mejía',
      company: 'Grupo Logístico Andino S.A.S.',
      role: 'Director de Operaciones',
      comment: 'IPS TECNOLÓGICA renovó toda nuestra flota de portátiles corporativos y mantiene nuestras redes operativas sin interrupciones. Su portal de seguimiento nos da control total.',
      rating: 5
    },
    {
      id: 'test-2',
      clientName: 'Dra. Juliana Restrepo',
      company: 'Clínica Especializada del Norte',
      role: 'Gerente Administrativa',
      comment: 'El servicio técnico preventivo y el soporte remoto son impecables. Cuando tenemos una urgencia médica administrativa, nos atienden en minutos.',
      rating: 5
    },
    {
      id: 'test-3',
      clientName: 'Ing. Mauricio Vargas',
      company: 'Constructora & Diseño Vial',
      role: 'Líder de Proyectos BIM',
      comment: 'Adquirimos estaciones de trabajo de alto rendimiento para renderizado 3D. Excelente asesoría técnica, precios competitivos y respaldo real de garantía.',
      rating: 5
    }
  ];

  const faqsList = cms?.faqs && cms.faqs.length > 0 ? cms.faqs : [
    {
      id: 'faq-1',
      question: '¿Cómo puedo consultar el estado de mi equipo en servicio técnico?',
      answer: 'Al ingresar tu equipo o solicitar una cita recibes un número único de orden (ej. SRV-102548). Puedes consultarlo en cualquier momento ingresando al Portal de Clientes con tu correo o documento.'
    },
    {
      id: 'faq-2',
      question: '¿Realizan envíos de computadores y repuestos a todo el país?',
      answer: 'Sí. Realizamos despachos asegurados a todos los municipios y ciudades de Colombia a través de transportadoras aliadas (Servientrega, Interrapidisimo, Coordinadora, Envía) con número de guía rastreable.'
    },
    {
      id: 'faq-3',
      question: '¿Qué garantía tienen los equipos y las reparaciones?',
      answer: 'Todos nuestros equipos nuevos cuentan con garantía directa de 6 a 12 meses según fabricante, y nuestros servicios técnicos cuentan con garantía escrita de 90 días conforme al Estatuto del Consumidor (Ley 1480 de 2011).'
    },
    {
      id: 'faq-4',
      question: '¿Cómo funciona el soporte técnico remoto?',
      answer: 'Agendas tu solicitud o nos contactas por WhatsApp, un especialista valida tu caso y se conecta de forma segura mediante AnyDesk o RustDesk bajo tu supervisión constante.'
    },
    {
      id: 'faq-5',
      question: '¿Emiten factura electrónica para empresas?',
      answer: 'Sí, emitimos facturación electrónica autorizada por la DIAN para personas naturales, empresas y entidades educativas.'
    }
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-0 bg-slate-50 text-slate-900">
      {/* SUB-NAVEGACIÓN CORPORATIVA STICKY (Estilo Solpetic / Empresarial) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-bold text-slate-700 whitespace-nowrap">
            <button onClick={() => scrollToSection('inicio')} className="px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer">
              Inicio
            </button>
            <button onClick={() => scrollToSection('nosotros')} className="px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer">
              Nosotros
            </button>
            <button onClick={() => scrollToSection('servicios')} className="px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer">
              Servicios
            </button>
            <button onClick={() => scrollToSection('soluciones')} className="px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer">
              Soluciones
            </button>
            <button onClick={handleCatalogClick} className="px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer">
              Catálogo
            </button>
            <button onClick={() => scrollToSection('promociones')} className="px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer">
              Promociones
            </button>
            <button onClick={() => scrollToSection('agendar-cita')} className="px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer">
              Soporte
            </button>
            <button onClick={() => scrollToSection('contacto')} className="px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer">
              Contacto
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => scrollToSection('agendar-cita')}
              className="px-3.5 py-1.5 bg-red-700 hover:bg-red-600 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              Agendar Soporte
            </button>
            <button
              onClick={handleClientPortalClick}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-red-400" />
              Portal de Clientes
            </button>
          </div>
        </div>
      </div>

      {/* 1. HERO PRINCIPAL EMPRESARIAL */}
      <section id="inicio" className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 text-white border-b border-red-900/30">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-22 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-red-400" />
              {cms?.heroBadge || 'Ingeniería, Suministros TI y Servicio Técnico Especializado'}
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]">
              {cms?.heroTitle || (
                <>
                  Soluciones Tecnológicas <span className="text-red-500">Integrales</span> para tu Empresa y Hogar
                </>
              )}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              {cms?.heroSubtitle ||
                `${company.name || 'IPS TECNOLÓGICA'}: aliados estratégicos en venta de computadores, servidores, licenciamiento original, redes empresariales y laboratorio de servicio técnico certificado con seguimiento en línea y envíos a toda Colombia.`}
            </p>

            <div className="flex flex-wrap gap-3.5 pt-2">
              <button
                onClick={handleCatalogClick}
                className="px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                {cms?.heroPrimaryCta || 'Ver Catálogo de Productos'} <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => scrollToSection('agendar-cita')}
                className="px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-red-600" />
                {cms?.heroSecondaryCta || 'Agendar Servicio Técnico'}
              </button>

              <button
                onClick={handleClientPortalClick}
                className="px-5 py-3.5 bg-slate-800/90 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-600 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-red-400" /> Portal de Clientes
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
              <div>
                <p className="text-2xl font-black text-white">100%</p>
                <p className="text-xs text-slate-400">Repuestos y Equipos Originales</p>
              </div>
              <div>
                <p className="text-2xl font-black text-red-400">24/7</p>
                <p className="text-xs text-slate-400">Consulta de Órdenes en Línea</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">Nacional</p>
                <p className="text-xs text-slate-400">Envíos Asegurados en Colombia</p>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-400">Ley 1480</p>
                <p className="text-xs text-slate-400">Garantía Directa Respaldada</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-5">
              {cms?.heroImageUrl ? (
                <div className="rounded-xl overflow-hidden border border-slate-700 h-44 bg-slate-950">
                  <img
                    src={resolveProductImageUrl({ imageUrl: cms.heroImageUrl })}
                    alt={company.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = getProductFallbackSvg(company.name, 'Tecnología');
                    }}
                  />
                </div>
              ) : null}

              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-red-600 flex items-center justify-center font-black text-lg text-white shadow-md">
                    IPS
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-base">Centro de Atención Empresarial</h2>
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Ingenieros y Asesores en Línea
                    </p>
                  </div>
                </div>
                <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md font-mono">
                  NIT: {company.nit || '900.000.000-1'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => scrollToSection('agendar-cita')}
                  className="p-3.5 rounded-xl bg-slate-800/70 hover:bg-red-950/60 border border-slate-700 hover:border-red-500/50 transition-all group text-left cursor-pointer"
                >
                  <Wrench className="w-5 h-5 text-red-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-sm text-white">Agendar Laboratorio</p>
                  <p className="text-xs text-slate-400">Revisión y diagnóstico</p>
                </button>

                <a
                  href={getWhatsAppLink('Hola IPS TECNOLÓGICA, necesito soporte técnico remoto inmediato.')}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 rounded-xl bg-slate-800/70 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500/50 transition-all group text-left"
                >
                  <Headphones className="w-5 h-5 text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-sm text-white">Soporte Remoto</p>
                  <p className="text-xs text-slate-400">Asistencia inmediata</p>
                </a>

                <button
                  onClick={handleCatalogClick}
                  className="p-3.5 rounded-xl bg-slate-800/70 hover:bg-blue-950/60 border border-slate-700 hover:border-blue-500/50 transition-all group text-left cursor-pointer"
                >
                  <Monitor className="w-5 h-5 text-blue-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-sm text-white">Tienda & Catálogo</p>
                  <p className="text-xs text-slate-400">{products.length} productos activos</p>
                </button>

                <button
                  onClick={handleClientPortalClick}
                  className="p-3.5 rounded-xl bg-slate-800/70 hover:bg-amber-950/60 border border-slate-700 hover:border-amber-500/50 transition-all group text-left cursor-pointer"
                >
                  <ShieldCheck className="w-5 h-5 text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-sm text-white">Estado de Orden / Garantía</p>
                  <p className="text-xs text-slate-400">Seguimiento en tiempo real</p>
                </button>
              </div>

              <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="truncate">{cms?.contactAddress || company.address || 'Sede Principal - Atención Nacional Colombia'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{cms?.businessHours || 'Lunes a Viernes 8:00 AM - 6:00 PM | Sábados 8:00 AM - 2:00 PM'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROMOCIONES Y CAMPAÑAS VIGENTES */}
      <section id="promociones" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-red-600">Ofertas y Temporadas</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Promociones Destacadas</h2>
          </div>
          <button
            onClick={handleCatalogClick}
            className="text-sm font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
          >
            Ver todas las ofertas en el catálogo <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {posters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posters.slice(0, 3).map(poster => (
              <div key={poster.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                {poster.imageUrl && (
                  <div className="h-48 bg-slate-100 overflow-hidden relative">
                    <img
                      src={resolveProductImageUrl({ imageUrl: poster.imageUrl, imageDriveId: poster.imageDriveId })}
                      alt={poster.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = getProductFallbackSvg(poster.title, 'Promoción');
                      }}
                    />
                    <span className="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow">
                      Promoción Activa
                    </span>
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{poster.title}</h3>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{poster.subtitle || poster.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={handleCatalogClick}
                      className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Ver productos aplicables
                    </button>
                    <a
                      href={getWhatsAppLink(`Hola IPS TECNOLÓGICA, me interesa la promoción: ${poster.title}`)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
                    >
                      Solicitar Oferta
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-1 bg-white/20 rounded-full text-xs font-bold uppercase">Mantenimiento Preventivo</span>
                <h3 className="text-xl font-black">Combo Optimización Total SSD + Mantenimiento</h3>
                <p className="text-sm text-red-100">Revive tu portátil o PC corporativo: limpieza interna, pasta térmica profesional e instalación de disco sólido.</p>
              </div>
              <a
                href={getWhatsAppLink('Hola IPS TECNOLÓGICA, me interesa el Combo Optimización Total SSD + Mantenimiento.')}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center justify-center gap-2 bg-white text-red-700 font-bold text-xs py-2.5 px-4 rounded-xl hover:bg-red-50 transition-colors"
              >
                Cotizar Promoción <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold uppercase">Empresas y PyMEs</span>
                <h3 className="text-xl font-black">Diagnóstico Inicial para Flotas de Computadores</h3>
                <p className="text-sm text-slate-300">Evaluamos el estado de los equipos de tu oficina y entregamos informe técnico de actualización y seguridad.</p>
              </div>
              <button
                onClick={() => scrollToSection('agendar-cita')}
                className="mt-5 inline-flex items-center justify-center gap-2 bg-emerald-500 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                Agendar Visita Empresarial <Calendar className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase">Catálogo Online</span>
                <h3 className="text-xl font-black text-slate-900">Precios Especiales para Mayoristas y Clientes Registrados</h3>
                <p className="text-sm text-slate-600">Regístrate en el Portal de Clientes para recibir notificaciones de descuentos y seguimiento de tus compras.</p>
              </div>
              <button
                onClick={handleClientPortalClick}
                className="mt-5 inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-bold text-xs py-2.5 px-4 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Ingresar al Portal de Clientes <Users className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. QUIÉNES SOMOS / PRESENTACIÓN CORPORATIVA */}
      <section id="nosotros" className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-bold uppercase tracking-widest text-red-600">Quiénes Somos</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
                {cms?.aboutTitle || `${company.name || 'IPS TECNOLÓGICA'}: Respaldo, Ingeniería y Confianza Tecnológica`}
              </h2>
              <p className="text-slate-600 leading-relaxed text-base">
                {cms?.aboutDescription ||
                  'Somos una organización colombiana especializada en soluciones integrales de tecnología informática, comercialización de hardware, licenciamiento de software, soporte técnico certificado y consultoría en infraestructura TI para hogares, profesionales independientes, PyMEs e instituciones.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-red-600" /> Nuestra Misión
                  </h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {cms?.aboutMission ||
                      'Garantizar la continuidad tecnológica de nuestros clientes mediante productos originales, diagnósticos transparentes y servicio técnico de excelencia.'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                    <ShieldCheck className="w-4 h-4 text-red-600" /> Nuestra Visión
                  </h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {cms?.aboutVision ||
                      'Consolidarnos como el centro tecnológico y catálogo digital líder en trazabilidad, calidad de servicio posventa y atención empresarial en Colombia.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {benefitsList.map((benefit, idx) => (
                <div key={idx} className="bg-slate-900 text-white p-6 rounded-2xl space-y-2 shadow-lg border border-slate-800">
                  <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-sm">
                    0{idx + 1}
                  </div>
                  <h4 className="font-bold text-base">{benefit.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. PORTAFOLIO DE SERVICIOS EMPRESARIALES Y TÉCNICOS */}
      <section id="servicios" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-red-600">Soluciones Integrales TI</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Portafolio de Servicios Tecnológicos</h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Desde soporte remoto inmediato hasta mantenimiento electrónico en laboratorio y suministro de infraestructura para empresas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicesList.map((srv, idx) => (
            <div
              key={srv.id || idx}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-xl hover:border-red-200 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {srv.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{srv.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{srv.description}</p>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => scrollToSection('agendar-cita')}
                  className="text-xs font-bold text-slate-700 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" /> Agendar cita
                </button>
                <a
                  href={getWhatsAppLink(srv.whatsappText || `Hola IPS TECNOLÓGICA, deseo información sobre ${srv.title}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  Solicitar Servicio <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CÓMO TRABAJAMOS (METODOLOGÍA DE 5 ETAPAS) */}
      <section id="soluciones" className="bg-slate-900 text-white py-16 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-red-400">Proceso Certificado</span>
            <h2 className="text-3xl sm:text-4xl font-black">¿Cómo Trabajamos en IPS TECNOLÓGICA?</h2>
            <p className="text-slate-300 text-sm sm:text-base">
              Metodología estructurada en 5 etapas para garantizar diagnósticos precisos, costos transparentes y entregas a tiempo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {howWeWorkSteps.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between hover:border-red-500/50 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-red-500">{item.step}</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-bold text-slate-400">
                  Etapa {idx + 1} de 5
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. AGENDA TU SERVICIO TÉCNICO (SIN SELECCIÓN DE TÉCNICO POR EL CLIENTE) */}
      <section id="agendar-cita" className="bg-gradient-to-b from-slate-100 to-white py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border border-red-200 text-red-700 text-xs font-bold uppercase">
                <Wifi className="w-3.5 h-3.5" /> Atención Presencial, a Domicilio y Remota
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
                AGENDA TU SERVICIO TÉCNICO
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Solicita tu servicio de manera fácil y segura. Nuestro equipo revisará tu solicitud y confirmará la disponibilidad asignando al especialista idóneo según la marca y falla de tu equipo.
              </p>

              <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">¿Por qué agendar en línea?</h3>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Código Único de Orden y Ticket</h4>
                    <p className="text-xs text-slate-600">Recibes confirmación inmediata en pantalla con tu código de seguimiento para consultar avances en el Portal de Clientes.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Asignación Inteligente de Especialista</h4>
                    <p className="text-xs text-slate-600">Nuestra coordinación técnica asigna internamente al ingeniero certificado en la especialidad requerida.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Registro Fotográfico Previo</h4>
                    <p className="text-xs text-slate-600">Puedes adjuntar fotografías del equipo o del error en pantalla para agilizar el diagnóstico.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href="https://anydesk.com/es/downloads"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all"
                >
                  Descargar AnyDesk <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://rustdesk.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 font-bold rounded-xl text-xs border border-slate-300 flex items-center gap-2 transition-all"
                >
                  Descargar RustDesk <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-7">
              <PublicSupportBooking />
            </div>
          </div>
        </div>
      </section>

      {/* 7. PRODUCTOS DESTACADOS DEL CATÁLOGO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-red-600">Suministros y Hardware</span>
            <h2 className="text-3xl font-black text-slate-900">Equipos y Productos Destacados</h2>
          </div>
          <button
            onClick={handleCatalogClick}
            className="px-5 py-2.5 bg-slate-900 hover:bg-red-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer"
          >
            Explorar Catálogo Completo ({products.length}) <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map(product => (
            <div
              key={product.id}
              onClick={handleCatalogClick}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="h-48 bg-slate-50 p-4 flex items-center justify-center relative overflow-hidden border-b border-slate-100">
                  <img
                    src={resolveProductImageUrl(product)}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      e.currentTarget.src = getProductFallbackSvg(product.name, product.category);
                    }}
                  />
                  <span className="absolute top-2.5 left-2.5 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {product.category}
                  </span>
                </div>
                <div className="p-4 space-y-1.5">
                  <p className="text-[11px] font-mono text-slate-400">SKU: {product.sku}</p>
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2 group-hover:text-red-600 transition-colors">
                    {product.name}
                  </h3>
                </div>
              </div>
              <div className="p-4 pt-0 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Precio COP</span>
                  <span className="text-base font-black text-red-600">
                    ${Number(product.price || 0).toLocaleString('es-CO')}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 group-hover:bg-red-600 group-hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                  Ver Detalle
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. CLIENTES Y TESTIMONIOS */}
      <section className="bg-slate-900 text-white py-16 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-red-400">Confianza Comprobada</span>
            <h2 className="text-3xl font-black">Lo que Dicen Nuestros Clientes</h2>
            <p className="text-slate-300 text-sm">
              Empresas, instituciones y profesionales que confían el soporte y suministro de su plataforma tecnológica a {company.name || 'IPS TECNOLÓGICA'}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonialsList.map((t, idx) => (
              <div key={t.id || idx} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: t.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-200 italic leading-relaxed">"{t.comment}"</p>
                </div>
                <div className="pt-4 border-t border-slate-800/80">
                  <p className="font-bold text-sm text-white">{t.clientName}</p>
                  <p className="text-xs text-red-400 font-semibold">{t.role} · {t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. MEDIOS DE PAGO, ENVÍOS NACIONALES Y GARANTÍAS */}
      <section className="bg-white border-b border-slate-200 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Múltiples Medios de Pago</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Aceptamos transferencias bancarias (Bancolombia, Davivienda, Nequi, Daviplata), pagos PSE, tarjetas de crédito/débito y facturación electrónica corporativa.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Envíos y Cobertura Nacional</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Despachamos pedidos con embalaje de seguridad industrial y póliza de transporte a Bogotá, Medellín, Cali, Barranquilla, Bucaramanga y más de 1.100 municipios.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Garantía y Posventa Real</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Respaldo directo bajo la Ley 1480 de 2011. Registra y consulta tus garantías y órdenes de servicio en línea desde nuestro Portal de Clientes sin trámites engorrosos.
            </p>
          </div>
        </div>
      </section>

      {/* 10. PREGUNTAS FRECUENTES (FAQ) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-red-600">Centro de Ayuda</span>
          <h2 className="text-3xl font-black text-slate-900">Preguntas Frecuentes</h2>
        </div>

        <div className="space-y-3">
          {faqsList.map((faq, idx) => (
            <div key={faq.id || idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full px-6 py-4 text-left flex items-center justify-between font-bold text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span className="text-sm sm:text-base">{faq.question}</span>
                {activeFaq === idx ? (
                  <ChevronUp className="w-5 h-5 text-red-600 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                )}
              </button>
              {activeFaq === idx && (
                <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 11. CONTACTO EMPRESARIAL CON FORMULARIO CONECTADO AL CRM */}
      <section id="contacto" className="bg-white border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-red-600">Atención Corporativa y Comercial</span>
                <h2 className="text-3xl font-black text-slate-900 mt-1">Contáctanos Ahora</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Envíanos tu requerimiento de cotización, soporte empresarial o licenciamiento. Tu solicitud queda registrada directamente en nuestro sistema CRM para atención prioritaria.
                </p>
              </div>

              <div className="space-y-4 text-sm text-slate-700">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <Phone className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Línea Directa & WhatsApp</p>
                    <p className="text-slate-600">{cms?.contactPhone || company.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <Mail className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Correo Electrónico Corporativo</p>
                    <p className="text-slate-600">{cms?.contactEmail || company.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Ubicación y Laboratorio</p>
                    <p className="text-slate-600">{cms?.contactAddress || company.address}</p>
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline mt-1"
                    >
                      Ver ubicación en Google Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <form onSubmit={handleContactSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
                <h3 className="text-xl font-black text-slate-900">Formulario de Solicitud y Cotización</h3>
                <p className="text-xs text-slate-500">
                  Completa tus datos y un especialista comercial o de soporte te responderá a la brevedad.
                </p>

                {contactResult && (
                  <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    contactResult.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    {contactResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{contactResult.msg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre completo *</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Ej. Juan Pérez"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-red-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Empresa / Entidad (Opcional)</label>
                    <input
                      type="text"
                      value={contactForm.companyName}
                      onChange={e => setContactForm({ ...contactForm, companyName: e.target.value })}
                      placeholder="Ej. Inversiones ABC S.A.S."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={contactForm.phone}
                      onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                      placeholder="Ej. 300 123 4567"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-red-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Correo electrónico</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="correo@empresa.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de requerimiento</label>
                  <select
                    value={contactForm.subject}
                    onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-red-600"
                  >
                    <option value="Cotización Corporativa / Equipos">Cotización Corporativa / Equipos</option>
                    <option value="Póliza de Mantenimiento y Soporte TI">Póliza de Mantenimiento y Soporte TI</option>
                    <option value="Licenciamiento de Software Original">Licenciamiento de Software Original</option>
                    <option value="Redes, Servidores y Cableado">Redes, Servidores y Cableado</option>
                    <option value="Consulta de Garantía o Posventa">Consulta de Garantía o Posventa</option>
                    <option value="Otro Requerimiento">Otro Requerimiento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Detalle de tu solicitud *</label>
                  <textarea
                    rows={4}
                    required
                    value={contactForm.message}
                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Cuéntanos qué equipos, repuestos o servicio técnico necesitas..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={contactSubmitting}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {contactSubmitting ? 'Registrando solicitud...' : 'Enviar Solicitud Corporativa'}
                  </button>

                  <a
                    href={getWhatsAppLink(`Hola IPS TECNOLÓGICA, deseo realizar una consulta comercial.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <MessageSquare className="w-4 h-4" /> O escríbenos directamente por WhatsApp
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 12. PIE DE PÁGINA CORPORATIVO */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white font-black flex items-center justify-center text-lg">
                IPS
              </div>
              <div>
                <h3 className="font-black text-white text-base">{company.name || 'IPS TECNOLÓGICA'}</h3>
                <p className="text-xs text-slate-500">NIT: {company.nit || '900.000.000-1'}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Soluciones integrales en tecnología informática, comercialización de computadores, repuestos originales, redes y servicio técnico especializado.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Accesos Rápidos</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={handleCatalogClick} className="hover:text-white transition-colors cursor-pointer">
                  Catálogo de Productos Online
                </button>
              </li>
              <li>
                <button onClick={handleClientPortalClick} className="hover:text-white transition-colors cursor-pointer">
                  Portal de Clientes (Órdenes y Garantías)
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('agendar-cita')} className="hover:text-white transition-colors cursor-pointer">
                  Agendar Servicio Técnico
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('servicios')} className="hover:text-white transition-colors cursor-pointer">
                  Servicios Corporativos TI
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Contacto Directo</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-500 shrink-0" />
                <span>{cms?.contactPhone || company.phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-500 shrink-0" />
                <span>{cms?.contactEmail || company.email}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{cms?.contactAddress || company.address}</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Ubicación y Atención</h4>
            <p className="text-xs text-slate-400">
              {cms?.businessHours || 'Lunes a Viernes: 8:00 AM - 6:00 PM | Sábados: 8:00 AM - 2:00 PM'}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <a
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold border border-slate-800 transition-colors"
              >
                <MapPin className="w-4 h-4 text-red-500" /> Abrir en Google Maps
              </a>
              <a
                href={getWhatsAppLink('Hola IPS TECNOLÓGICA, necesito asesoría comercial o técnica.')}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                <MessageSquare className="w-4 h-4" /> Hablar por WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900 py-5 text-center text-xs text-slate-500 px-4">
          © {new Date().getFullYear()} {company.name || 'IPS TECNOLÓGICA'}. Todos los derechos reservados. Cumplimiento Ley 1581 de 2012 (Habeas Data) y Ley 1480 de 2011.
        </div>
      </footer>
    </div>
  );
};
