import fs from 'fs';
import path from 'path';
import type {
  SeasonalTemplate,
  PromoBannerItem,
  DiscountCode,
  PolicyDocument,
  ShipmentRecord,
  AdminNotification,
  OrderAuthorizationRequest,
  CashMovement,
  CrmCustomerRecord,
  MarketingCampaign,
  PaymentMethodItem,
  RemoteSupportToolItem,
  WhatsAppQrConfig
} from '../../src/types/index.js';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function ensurePromoBannerSvgAssets(): string[] {
  const banners = [
    {
      filename: 'banner_promo_1.svg',
      bg1: '#0F172A',
      bg2: '#1E293B',
      accent: '#DC2626',
      badge: 'DESTACADO #1 · LÍNEA CORPORATIVA VIP (-15%)',
      title: 'Workstations & Portátiles Core i9 / Ultra 7',
      subtitle: 'Equipos empresariales de alto rendimiento con entrega asegurada en Cali, Bogotá y toda Colombia.'
    },
    {
      filename: 'banner_promo_2.svg',
      bg1: '#7F1D1D',
      bg2: '#DC2626',
      accent: '#FACC15',
      badge: 'DESTACADO #2 · INFRAESTRUCTURA TI (-18%)',
      title: 'Infraestructura de Redes, Servidores y CCTV 4K',
      subtitle: 'Switches PoE+, Routers SD-WAN y Kits de Seguridad IP con soporte técnico especializado.'
    },
    {
      filename: 'banner_promo_3.svg',
      bg1: '#064E3B',
      bg2: '#047857',
      accent: '#34D399',
      badge: 'DESTACADO #3 · LABORATORIO SRV (-20%)',
      title: 'Repuestos Originales, SSD NVMe, RAM DDR5 y Servicio Técnico',
      subtitle: 'Agenda tu mantenimiento o adquiere componentes con respaldo de Ley 1480 de 2011.'
    },
    {
      filename: 'banner_promo_4.svg',
      bg1: '#1E1B4B',
      bg2: '#312E81',
      accent: '#38BDF8',
      badge: 'DESTACADO #4 · MONITORES 4K HDR (-16%)',
      title: 'Monitores Curvos UltraWide 4K y Pantallas Interactivas',
      subtitle: 'Precisión de color sRGB 99% para diseño, arquitectura, trading y salas de juntas.'
    },
    {
      filename: 'banner_promo_5.svg',
      bg1: '#3B0764',
      bg2: '#6B21A8',
      accent: '#F472B6',
      badge: 'DESTACADO #5 · ENERGÍA Y PROTECCIÓN (-14%)',
      title: 'UPS Online Doble Conversión y Protección Eléctrica',
      subtitle: 'Respaldo continuo para servidores, centros de datos, consultorios y estaciones críticas.'
    },
    {
      filename: 'banner_promo_6.svg',
      bg1: '#14532D',
      bg2: '#15803D',
      accent: '#FDE047',
      badge: 'DESTACADO #6 · REMANUFACTURADOS GRADO A+ (-25%)',
      title: 'Portátiles y Estaciones Remanufacturadas Certificadas',
      subtitle: 'Inspeccionados en 25 puntos por el laboratorio IPS TECNOLÓGICA con garantía escrita.'
    }
  ];

  const urls: string[] = [];
  for (const b of banners) {
    const filePath = path.join(UPLOAD_DIR, b.filename);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="440" viewBox="0 0 1200 440">
  <defs>
    <linearGradient id="g_${b.filename}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${b.bg1}" />
      <stop offset="100%" stop-color="${b.bg2}" />
    </linearGradient>
  </defs>
  <rect width="1200" height="440" rx="24" fill="url(#g_${b.filename})" />
  <circle cx="1050" cy="90" r="220" fill="${b.accent}" opacity="0.14" />
  <circle cx="960" cy="360" r="180" fill="#FFFFFF" opacity="0.06" />
  <rect x="60" y="54" width="520" height="36" rx="18" fill="${b.accent}" />
  <text x="320" y="77" font-family="Arial, sans-serif" font-weight="900" font-size="13" fill="#0F172A" text-anchor="middle" letter-spacing="1">${b.badge}</text>
  <text x="60" y="165" font-family="Arial, sans-serif" font-weight="900" font-size="40" fill="#FFFFFF">${b.title}</text>
  <text x="60" y="220" font-family="Arial, sans-serif" font-weight="400" font-size="19" fill="#E2E8F0">${b.subtitle}</text>
  <rect x="60" y="280" width="290" height="54" rx="14" fill="#FFFFFF" />
  <text x="205" y="313" font-family="Arial, sans-serif" font-weight="900" font-size="16" fill="#0F172A" text-anchor="middle">EXPLORAR OFERTA →</text>
  <text x="60" y="395" font-family="monospace" font-weight="700" font-size="14" fill="#CBD5E1">IPS TECNOLÓGICA · GOOGLE DRIVE VERIFIED · ENVÍOS A TODA COLOMBIA</text>
</svg>`;
    try {
      fs.writeFileSync(filePath, svg, 'utf-8');
    } catch {}
    urls.push(`/uploads/${b.filename}`);
  }
  return urls;
}

export function ensureSeasonalTemplateBackgroundSvgs(): Record<string, string> {
  const specs: Array<{ key: string; c1: string; c2: string; accent: string; patternLabel: string }> = [
    { key: 'corporativo', c1: '#0F172A', c2: '#1E293B', accent: '#DC2626', patternLabel: 'IPS TECNOLÓGICA · CATÁLOGO CORPORATIVO' },
    { key: 'catalogo_general', c1: '#111827', c2: '#7F1D1D', accent: '#EF4444', patternLabel: 'IPS TECNOLÓGICA · CATÁLOGO GENERAL PERMANENTE' },
    { key: 'navidad', c1: '#7F1D1D', c2: '#064E3B', accent: '#F59E0B', patternLabel: 'ESPECIAL NAVIDAD · IPS TECNOLÓGICA' },
    { key: 'diciembre', c1: '#0F172A', c2: '#713F12', accent: '#FACC15', patternLabel: 'TEMPORADAS EMPRESARIALES · IPS TECNOLÓGICA' },
    { key: 'temporadas_empresariales', c1: '#0F172A', c2: '#1E3A8A', accent: '#DC2626', patternLabel: 'TEMPORADAS EMPRESARIALES · IPS TECNOLÓGICA' },
    { key: 'ano_nuevo', c1: '#111827', c2: '#78350F', accent: '#FBBF24', patternLabel: 'FELIZ AÑO NUEVO · IPS TECNOLÓGICA' },
    { key: 'halloween', c1: '#18181B', c2: '#7C2D12', accent: '#EA580C', patternLabel: 'OCTUBRE HALLOWEEN TECH · IPS' },
    { key: 'amor_amistad', c1: '#881337', c2: '#BE123C', accent: '#FB7185', patternLabel: 'AMOR Y AMISTAD · IPS TECNOLÓGICA' },
    { key: 'dia_mujer', c1: '#3B0764', c2: '#7E22CE', accent: '#F472B6', patternLabel: 'DÍA DE LA MUJER · IPS TECNOLÓGICA' },
    { key: 'dia_hombre', c1: '#0F172A', c2: '#1E293B', accent: '#0EA5E9', patternLabel: 'DÍA DEL HOMBRE · IPS TECNOLÓGICA' },
    { key: 'dia_madre', c1: '#500724', c2: '#9D174D', accent: '#F472B6', patternLabel: 'DÍA DE LA MADRE · IPS TECNOLÓGICA' },
    { key: 'dia_padre', c1: '#0F172A', c2: '#1E3A8A', accent: '#38BDF8', patternLabel: 'DÍA DEL PADRE · IPS TECNOLÓGICA' },
    { key: 'regreso_clases', c1: '#0C4A6E', c2: '#0284C7', accent: '#FACC15', patternLabel: 'REGRESO A CLASES · IPS TECNOLÓGICA' },
    { key: 'black_friday', c1: '#09090B', c2: '#18181B', accent: '#EAB308', patternLabel: 'BLACK FRIDAY VIP · IPS TECNOLÓGICA' },
    { key: 'cyberlunes', c1: '#0F172A', c2: '#155E75', accent: '#22D3EE', patternLabel: 'CYBER MONDAY ONLINE · IPS TECNOLÓGICA' },
    { key: 'vacaciones', c1: '#064E3B', c2: '#047857', accent: '#FBBF24', patternLabel: 'TEMPORADA DE VACACIONES · IPS' },
    { key: 'aniversario_ips', c1: '#7F1D1D', c2: '#0F172A', accent: '#FACC15', patternLabel: 'ANIVERSARIO IPS TECNOLÓGICA · EDICIÓN ESPECIAL' },
    { key: 'ofertas_especiales', c1: '#7F1D1D', c2: '#991B1B', accent: '#FB923C', patternLabel: 'PROMOCIONES ESPECIALES · IPS' }
  ];
  const map: Record<string, string> = {};
  for (const s of specs) {
    const fileName = `tpl_bg_${s.key}.svg`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="520" viewBox="0 0 1440 520">
  <defs>
    <linearGradient id="bg_${s.key}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${s.c1}" />
      <stop offset="100%" stop-color="${s.c2}" />
    </linearGradient>
  </defs>
  <rect width="1440" height="520" fill="url(#bg_${s.key})" />
  <circle cx="1280" cy="110" r="260" fill="${s.accent}" opacity="0.16" />
  <circle cx="180" cy="430" r="220" fill="${s.accent}" opacity="0.10" />
  <path d="M0 420 Q 360 350 720 420 T 1440 400 L 1440 520 L 0 520 Z" fill="#FFFFFF" opacity="0.04" />
  <text x="1380" y="490" font-family="monospace" font-weight="700" font-size="13" fill="#FFFFFF" opacity="0.28" text-anchor="end">${s.patternLabel}</text>
</svg>`;
    try {
      fs.writeFileSync(filePath, svg, 'utf-8');
    } catch {}
    map[s.key] = `/uploads/${fileName}`;
  }
  return map;
}

const tplBgMap = ensureSeasonalTemplateBackgroundSvgs();
const nowIso = new Date().toISOString();

export const INITIAL_SEASONAL_TEMPLATES: SeasonalTemplate[] = [
  {
    id: 'tpl_corporativa',
    name: 'Catálogo corporativo',
    seasonKey: 'corporativo',
    primaryColor: '#DC2626',
    secondaryColor: '#0F172A',
    accentColor: '#475569',
    backgroundColor: '#F8FAFC',
    headerTextColor: '#FFFFFF',
    bannerTitle: 'IPS TECNOLÓGICA · Catálogo Corporativo de Hardware y Soluciones TI',
    bannerSubtitle: 'Equipos nuevos, repuestos certificados, equipos remanufacturados y laboratorio técnico especializado.',
    decorativeBadge: 'CATÁLOGO CORPORATIVO',
    promoBlockText: 'Garantía directa y envíos asegurados a Cali, Valle del Cauca y toda Colombia.',
    buttonStyle: 'rounded-xl',
    fontFamily: 'Inter, system-ui, sans-serif',
    isActiveWeb: true,
    isActivePdf: true,
    isDefaultCorporate: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    updatedBy: 'jeffervr@gmail.com'
  },
  {
    id: 'tpl_catalogo_general',
    name: 'Catálogo general permanente',
    seasonKey: 'catalogo_general',
    primaryColor: '#B91C1C',
    secondaryColor: '#111827',
    accentColor: '#334155',
    backgroundColor: '#FFFFFF',
    headerTextColor: '#FFFFFF',
    bannerTitle: 'IPS TECNOLÓGICA · Catálogo General Permanente de Productos y Servicios',
    bannerSubtitle: 'Portafolio completo de computadores, servidores, monitores, redes, cámaras, repuestos y equipos remanufacturados.',
    decorativeBadge: 'CATÁLOGO GENERAL PERMANENTE',
    promoBlockText: 'Precios oficiales en Pesos Colombianos (COP) con garantía escrita Ley 1480 de 2011.',
    buttonStyle: 'rounded-xl',
    fontFamily: 'Inter, system-ui, sans-serif',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso,
    updatedBy: 'jeffervr@gmail.com'
  },
  {
    id: 'tpl_navidad',
    name: 'Navidad',
    seasonKey: 'navidad',
    primaryColor: '#B91C1C',
    secondaryColor: '#064E3B',
    accentColor: '#D97706',
    backgroundColor: '#FEF2F2',
    headerTextColor: '#FFFFFF',
    bannerTitle: '🎄 Especial Navidad IPS TECNOLÓGICA · Regala Innovación y Rendimiento',
    bannerSubtitle: 'Portátiles, tablets, monitores y kits tecnológicos con garantía oficial y despacho prioritario.',
    decorativeBadge: '🎄 ESPECIAL NAVIDAD',
    promoBlockText: 'Usa el código NAVIDAD20 en tus compras navideñas y recibe envío prioritario.',
    buttonStyle: 'rounded-full',
    fontFamily: 'Inter, system-ui, sans-serif',
    startAt: '2026-11-25T00:00:00.000Z',
    endAt: '2026-12-25T23:59:59.000Z',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_ano_nuevo',
    name: 'Año Nuevo',
    seasonKey: 'ano_nuevo',
    primaryColor: '#D97706',
    secondaryColor: '#111827',
    accentColor: '#FBBF24',
    backgroundColor: '#FFFBEB',
    headerTextColor: '#FFFFFF',
    bannerTitle: '🎆 Feliz Año Nuevo · Empieza el Año con Tecnología de Punta',
    bannerSubtitle: 'Renueva tus herramientas de trabajo, estudio y empresa con el catálogo oficial IPS TECNOLÓGICA.',
    decorativeBadge: '🎆 AÑO NUEVO TECH',
    promoBlockText: 'Proyectos de infraestructura, cómputo y soporte técnico para el nuevo año.',
    buttonStyle: 'rounded-xl',
    fontFamily: 'Inter, system-ui, sans-serif',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_halloween',
    name: 'Halloween',
    seasonKey: 'halloween',
    primaryColor: '#EA580C',
    secondaryColor: '#18181B',
    accentColor: '#9333EA',
    backgroundColor: '#FFF7ED',
    headerTextColor: '#FFFFFF',
    bannerTitle: '🎃 Octubre Tecnológico Halloween · Precios de Espanto en IPS TECNOLÓGICA',
    bannerSubtitle: 'Descuentos especiales en portátiles, monitores gamer, periféricos y actualización de SSD/RAM.',
    decorativeBadge: '🎃 HALLOWEEN TECH',
    promoBlockText: 'Usa el cupón HALLOWEEN15 para obtener 15% adicional en productos seleccionados.',
    buttonStyle: 'rounded-xl',
    fontFamily: 'Inter, system-ui, sans-serif',
    startAt: '2026-10-01T00:00:00.000Z',
    endAt: '2026-11-02T23:59:59.000Z',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_amor_amistad',
    name: 'Amor y Amistad',
    seasonKey: 'amor_amistad',
    primaryColor: '#E11D48',
    secondaryColor: '#881337',
    accentColor: '#F43F5E',
    backgroundColor: '#FFF1F2',
    headerTextColor: '#FFFFFF',
    bannerTitle: '❤️ Amor y Amistad · Conecta con Quienes Más Quieres',
    bannerSubtitle: 'Smartphones 5G, audífonos ANC, tablets y accesorios ideales para sorprender en septiembre.',
    decorativeBadge: '❤️ AMOR Y AMISTAD',
    promoBlockText: 'Código activo: AMORYAMISTAD con bono de descuento directo.',
    buttonStyle: 'rounded-full',
    fontFamily: 'Inter, system-ui, sans-serif',
    startAt: '2026-09-01T00:00:00.000Z',
    endAt: '2026-09-30T23:59:59.000Z',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_dia_madre',
    name: 'Día de la Madre',
    seasonKey: 'dia_madre',
    primaryColor: '#DB2777',
    secondaryColor: '#500724',
    accentColor: '#F472B6',
    backgroundColor: '#FDF2F8',
    headerTextColor: '#FFFFFF',
    bannerTitle: '🌸 Especial Día de la Madre · Tecnología con Cariño y Respaldo',
    bannerSubtitle: 'Smartphones de alta gama, tablets, portátiles ligeros y audio inalámbrico con garantía total.',
    decorativeBadge: '🌸 DÍA DE LA MADRE',
    promoBlockText: 'Envío asegurado y asesoría personalizada por WhatsApp para elegir el regalo ideal.',
    buttonStyle: 'rounded-full',
    fontFamily: 'Inter, system-ui, sans-serif',
    startAt: '2026-05-01T00:00:00.000Z',
    endAt: '2026-05-31T23:59:59.000Z',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_dia_padre',
    name: 'Día del Padre',
    seasonKey: 'dia_padre',
    primaryColor: '#1D4ED8',
    secondaryColor: '#0F172A',
    accentColor: '#0284C7',
    backgroundColor: '#EFF6FF',
    headerTextColor: '#FFFFFF',
    bannerTitle: '👔 Especial Día del Padre · Potencia, Productividad y Precisión',
    bannerSubtitle: 'Workstations, monitores curvos UltraWide, audio profesional y kits de seguridad inteligente.',
    decorativeBadge: '👔 DÍA DEL PADRE',
    promoBlockText: 'Descuentos especiales en monitores 4K, portátiles corporativos y periféricos Pro.',
    buttonStyle: 'rounded-xl',
    fontFamily: 'Inter, system-ui, sans-serif',
    startAt: '2026-06-01T00:00:00.000Z',
    endAt: '2026-06-30T23:59:59.000Z',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_dia_mujer',
    name: 'Día de la Mujer',
    seasonKey: 'dia_mujer',
    primaryColor: '#9333EA',
    secondaryColor: '#3B0764',
    accentColor: '#EC4899',
    backgroundColor: '#FAF5FF',
    headerTextColor: '#FFFFFF',
    bannerTitle: '💜 Especial Día Internacional de la Mujer · Liderazgo e Innovación',
    bannerSubtitle: 'Ultrabooks ultraligeros, tablets de diseño digital y herramientas para mujeres líderes y creadoras.',
    decorativeBadge: '💜 DÍA DE LA MUJER',
    promoBlockText: 'Usa el código MUJER2027 para descuento exclusivo en toda la línea portátil.',
    buttonStyle: 'rounded-full',
    fontFamily: 'Inter, system-ui, sans-serif',
    startAt: '2026-03-01T00:00:00.000Z',
    endAt: '2026-03-15T23:59:59.000Z',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_dia_hombre',
    name: 'Día del Hombre',
    seasonKey: 'dia_hombre',
    primaryColor: '#0284C7',
    secondaryColor: '#0F172A',
    accentColor: '#38BDF8',
    backgroundColor: '#F0F9FF',
    headerTextColor: '#FFFFFF',
    bannerTitle: '⚡ Especial Día del Hombre · Alto Desempeño e Ingeniería',
    bannerSubtitle: 'Estaciones de trabajo, almacenamiento NVMe Gen4, audio profesional y herramientas tecnológicas.',
    decorativeBadge: '⚡ DÍA DEL HOMBRE',
    promoBlockText: 'Precios especiales de temporada en hardware de alto rendimiento.',
    buttonStyle: 'rounded-xl',
    fontFamily: 'Inter, system-ui, sans-serif',
    startAt: '2026-03-16T00:00:00.000Z',
    endAt: '2026-03-25T23:59:59.000Z',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_regreso_clases',
    name: 'Regreso a clases',
    seasonKey: 'regreso_clases',
    primaryColor: '#0284C7',
    secondaryColor: '#0C4A6E',
    accentColor: '#F59E0B',
    backgroundColor: '#F0F9FF',
    headerTextColor: '#FFFFFF',
    bannerTitle: '🎒 Temporada Escolar y Universitaria · Regreso a Clases con IPS TECNOLÓGICA',
    bannerSubtitle: 'Portátiles estudiantiles, tablets gráficas, unidades SSD, memorias RAM y mantenimiento preventivo.',
    decorativeBadge: '🎒 REGRESO A CLASES',
    promoBlockText: 'Combos educativos con alistamiento de software y garantía académica.',
    buttonStyle: 'rounded-xl',
    fontFamily: 'Inter, system-ui, sans-serif',
    startAt: '2026-01-10T00:00:00.000Z',
    endAt: '2026-02-28T23:59:59.000Z',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_vacaciones',
    name: 'Temporada de vacaciones',
    seasonKey: 'vacaciones',
    primaryColor: '#059669',
    secondaryColor: '#064E3B',
    accentColor: '#F59E0B',
    backgroundColor: '#ECFDF5',
    headerTextColor: '#FFFFFF',
    bannerTitle: '☀️ Temporada de Vacaciones · Movilidad, Audio y Entretenimiento',
    bannerSubtitle: 'Audífonos ANC, smartphones 5G, tablets y mantenimiento preventivo para tus equipos.',
    decorativeBadge: '☀️ ESPECIAL VACACIONES',
    promoBlockText: 'Prepara tus equipos y disfruta la temporada con respaldo técnico garantizado.',
    buttonStyle: 'rounded-full',
    fontFamily: 'Inter, system-ui, sans-serif',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_black_friday',
    name: 'Black Friday',
    seasonKey: 'black_friday',
    primaryColor: '#DC2626',
    secondaryColor: '#09090B',
    accentColor: '#EAB308',
    backgroundColor: '#F4F4F5',
    headerTextColor: '#FACC15',
    bannerTitle: '⚡ BLACK FRIDAY IPS TECNOLÓGICA · Descuentos Récord en Hardware',
    bannerSubtitle: 'Las mejores ofertas del año en cómputo, servidores, monitores, repuestos y equipos remanufacturados.',
    decorativeBadge: '⚡ BLACK FRIDAY VIP',
    promoBlockText: 'Unidades limitadas con descuento directo y garantía oficial IPS TECNOLÓGICA.',
    buttonStyle: 'rounded-lg',
    fontFamily: 'Inter, system-ui, sans-serif',
    startAt: '2026-11-20T00:00:00.000Z',
    endAt: '2026-11-29T23:59:59.000Z',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_cyberlunes',
    name: 'Cyber Monday',
    seasonKey: 'cyberlunes',
    primaryColor: '#06B6D4',
    secondaryColor: '#0F172A',
    accentColor: '#3B82F6',
    backgroundColor: '#ECFEFF',
    headerTextColor: '#FFFFFF',
    bannerTitle: '🌐 CYBER MONDAY IPS TECNOLÓGICA · Compras Online con Despacho Rápido',
    bannerSubtitle: 'Ofertas exclusivas en nuestro catálogo digital con confirmación inmediata por WhatsApp.',
    decorativeBadge: '🌐 CYBER MONDAY ONLINE',
    promoBlockText: 'Precios especiales para pedidos realizados desde el portal web y la App PWA.',
    buttonStyle: 'rounded-xl',
    fontFamily: 'Inter, system-ui, sans-serif',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_aniversario_ips',
    name: 'Aniversario IPS TECNOLÓGICA',
    seasonKey: 'aniversario_ips',
    primaryColor: '#DC2626',
    secondaryColor: '#0F172A',
    accentColor: '#EAB308',
    backgroundColor: '#FEF2F2',
    headerTextColor: '#FFFFFF',
    bannerTitle: '🏆 Aniversario IPS TECNOLÓGICA · Celebramos con Precios y Beneficios Especiales',
    bannerSubtitle: 'Gracias por confiar en nuestro equipo técnico y comercial. Descuentos conmemorativos en todo el catálogo.',
    decorativeBadge: '🏆 ANIVERSARIO IPS TECNOLÓGICA',
    promoBlockText: 'Beneficios especiales en compras de equipos, repuestos y planes de mantenimiento.',
    buttonStyle: 'rounded-xl',
    fontFamily: 'Inter, system-ui, sans-serif',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_ofertas_especiales',
    name: 'Promociones especiales',
    seasonKey: 'ofertas_especiales',
    primaryColor: '#E11D48',
    secondaryColor: '#1E293B',
    accentColor: '#F97316',
    backgroundColor: '#FFF1F2',
    headerTextColor: '#FFFFFF',
    bannerTitle: '🔥 Promociones Especiales y Liquidación de Temporada · IPS TECNOLÓGICA',
    bannerSubtitle: 'Precios de oportunidad en referencias seleccionadas, repuestos y equipos reacondicionados Grado A+.',
    decorativeBadge: '🔥 PROMOCIONES ESPECIALES',
    promoBlockText: 'Aprovecha precios rebajados con cuenta regresiva en tiempo real.',
    buttonStyle: 'rounded-xl',
    fontFamily: 'Inter, system-ui, sans-serif',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  },
  {
    id: 'tpl_diciembre',
    name: 'Temporadas empresariales',
    seasonKey: 'temporadas_empresariales',
    primaryColor: '#CA8A04',
    secondaryColor: '#0F172A',
    accentColor: '#DC2626',
    backgroundColor: '#FEFCE8',
    headerTextColor: '#FFFFFF',
    bannerTitle: '✨ Temporadas Empresariales · Renovación y Dotación Tecnológica Corporativa',
    bannerSubtitle: 'Optimiza tu presupuesto TI con servidores, redes, estaciones de trabajo y contratos de mantenimiento.',
    decorativeBadge: '✨ TEMPORADAS EMPRESARIALES',
    promoBlockText: 'Cotizaciones formales y planes corporativos para empresas e instituciones.',
    buttonStyle: 'rounded-xl',
    fontFamily: 'Inter, system-ui, sans-serif',
    startAt: '2026-12-01T00:00:00.000Z',
    endAt: '2026-12-31T23:59:59.000Z',
    isActiveWeb: false,
    isActivePdf: false,
    createdAt: nowIso,
    updatedAt: nowIso
  }
].map(tpl => ({
  ...tpl,
  backgroundImageUrl: (tpl as any).backgroundImageUrl || tplBgMap[tpl.seasonKey] || tplBgMap.corporativo,
  bannerImageUrl: (tpl as any).bannerImageUrl || tplBgMap[tpl.seasonKey] || tplBgMap.corporativo,
  isActiveHome: tpl.isActiveWeb
}));

export function buildInitialPromoBanners(): PromoBannerItem[] {
  const [b1, b2, b3, b4, b5, b6] = ensurePromoBannerSvgAssets();
  return [
    {
      id: 'banner_1',
      slot: 1,
      order: 1,
      title: 'Workstations & Portátiles Core i9 / Ultra 7',
      description: 'Potencia extrema para ingeniería, diseño 3D y empresas con garantía directa IPS TECNOLÓGICA.',
      badgeText: 'DESTACADO #1 · VIP',
      imageUrl: b1,
      normalPriceCOP: 6890000,
      promotionalPriceCOP: 5856500,
      discountPercentage: 15,
      ctaText: 'Ver Portátiles y Cómputo',
      linkType: 'category',
      linkTarget: 'Portátiles y Cómputo',
      startAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      endAt: new Date(Date.now() + 86400000 * 90).toISOString(),
      isActive: true,
      updatedAt: nowIso,
      updatedBy: 'jeffervr@gmail.com'
    },
    {
      id: 'banner_2',
      slot: 2,
      order: 2,
      title: 'Servidores, Redes SD-WAN y Seguridad IP 4K',
      description: 'Infraestructura crítica Cisco, Dell PowerEdge, Fortinet y CCTV IA con instalación certificada.',
      badgeText: 'DESTACADO #2 · REDES TI',
      imageUrl: b2,
      normalPriceCOP: 9450000,
      promotionalPriceCOP: 7749000,
      discountPercentage: 18,
      ctaText: 'Explorar Servidores y Redes',
      linkType: 'category',
      linkTarget: 'Servidores y Redes',
      startAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      endAt: new Date(Date.now() + 86400000 * 90).toISOString(),
      isActive: true,
      updatedAt: nowIso,
      updatedBy: 'jeffervr@gmail.com'
    },
    {
      id: 'banner_3',
      slot: 3,
      order: 3,
      title: 'Repuestos Originales SSD NVMe, RAM DDR5 y Laboratorio SRV',
      description: 'Componentes certificados (SSD, RAM, Baterías, Pantallas) e instalación por especialistas.',
      badgeText: 'DESTACADO #3 · COMPONENTES',
      imageUrl: b3,
      normalPriceCOP: 650000,
      promotionalPriceCOP: 520000,
      discountPercentage: 20,
      ctaText: 'Ver Componentes y Hardware',
      linkType: 'category',
      linkTarget: 'Componentes y Hardware',
      startAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      endAt: new Date(Date.now() + 86400000 * 90).toISOString(),
      isActive: true,
      updatedAt: nowIso,
      updatedBy: 'jeffervr@gmail.com'
    },
    {
      id: 'banner_4',
      slot: 4,
      order: 4,
      title: 'Monitores Curvos UltraWide 4K HDR Pro',
      description: 'Pantallas profesionales con calibración de color de fábrica y conectividad USB-C / Thunderbolt.',
      badgeText: 'DESTACADO #4 · MONITORES',
      imageUrl: b4,
      normalPriceCOP: 2890000,
      promotionalPriceCOP: 2427600,
      discountPercentage: 16,
      ctaText: 'Ver Monitores y Pantallas',
      linkType: 'category',
      linkTarget: 'Monitores y Pantallas',
      startAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      endAt: new Date(Date.now() + 86400000 * 60).toISOString(),
      isActive: true,
      updatedAt: nowIso,
      updatedBy: 'jeffervr@gmail.com'
    },
    {
      id: 'banner_5',
      slot: 5,
      order: 5,
      title: 'UPS Online Doble Conversión y Respaldo Eléctrico',
      description: 'Protección energética pura para servidores, equipos médicos y estaciones de trabajo.',
      badgeText: 'DESTACADO #5 · ENERGÍA',
      imageUrl: b5,
      normalPriceCOP: 3400000,
      promotionalPriceCOP: 2924000,
      discountPercentage: 14,
      ctaText: 'Ver Energía y Protección',
      linkType: 'category',
      linkTarget: 'Energía y Protección',
      startAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      endAt: new Date(Date.now() + 86400000 * 75).toISOString(),
      isActive: true,
      updatedAt: nowIso,
      updatedBy: 'jeffervr@gmail.com'
    },
    {
      id: 'banner_6',
      slot: 6,
      order: 6,
      title: 'Equipos Remanufacturados Grado A+ Certificados',
      description: 'Portátiles y estaciones corporativas reacondicionadas en laboratorio con garantía Ley 1480.',
      badgeText: 'DESTACADO #6 · GRADO A+',
      imageUrl: b6,
      normalPriceCOP: 2400000,
      promotionalPriceCOP: 1800000,
      discountPercentage: 25,
      ctaText: 'Ver Portátiles Remanufacturados',
      linkType: 'category',
      linkTarget: 'Portátiles y Cómputo',
      startAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      endAt: new Date(Date.now() + 86400000 * 45).toISOString(),
      isActive: true,
      updatedAt: nowIso,
      updatedBy: 'jeffervr@gmail.com'
    }
  ];
}

export const INITIAL_DISCOUNT_CODES: DiscountCode[] = [
  {
    id: 'dc_ips10',
    code: 'IPS10',
    description: '10% de descuento corporativo de bienvenida en catálogo general',
    discountType: 'percentage',
    discountValue: 10,
    expirationDate: '2027-12-31T23:59:59.000Z',
    maxUses: 500,
    usedCount: 2,
    minPurchaseCOP: 200000,
    allowedCategory: 'Todas',
    isActive: true,
    usageHistory: [
      {
        id: 'use_1',
        orderId: 'PED-2026-001',
        customerEmail: 'cliente@ejemplo.com',
        customerName: 'Carlos Mendoza',
        discountAppliedCOP: 450000,
        orderSubtotalCOP: 9900000,
        usedAt: new Date(Date.now() - 86400000 * 3).toISOString()
      }
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: 'jeffervr@gmail.com'
  },
  {
    id: 'dc_navidad20',
    code: 'NAVIDAD20',
    description: '20% de descuento especial temporada de Navidad',
    discountType: 'percentage',
    discountValue: 20,
    expirationDate: '2027-12-26T23:59:59.000Z',
    maxUses: 200,
    usedCount: 0,
    minPurchaseCOP: 500000,
    allowedCategory: 'Todas',
    isActive: true,
    usageHistory: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: 'jeffervr@gmail.com'
  },
  {
    id: 'dc_halloween15',
    code: 'HALLOWEEN15',
    description: '15% de descuento en periféricos, monitores y portátiles por Halloween',
    discountType: 'percentage',
    discountValue: 15,
    expirationDate: '2027-11-05T23:59:59.000Z',
    maxUses: 150,
    usedCount: 0,
    minPurchaseCOP: 300000,
    allowedCategory: 'Todas',
    isActive: true,
    usageHistory: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: 'jeffervr@gmail.com'
  },
  {
    id: 'dc_amoryamistad',
    code: 'AMORYAMISTAD',
    description: 'Bono de $120.000 COP de descuento en Amor y Amistad',
    discountType: 'fixed_cop',
    discountValue: 120000,
    expirationDate: '2027-09-30T23:59:59.000Z',
    maxUses: 100,
    usedCount: 0,
    minPurchaseCOP: 800000,
    allowedCategory: 'Todas',
    isActive: true,
    usageHistory: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: 'jeffervr@gmail.com'
  },
  {
    id: 'dc_mujer2027',
    code: 'MUJER2027',
    description: '12% de descuento conmemorativo Día de la Mujer',
    discountType: 'percentage',
    discountValue: 12,
    expirationDate: '2027-03-31T23:59:59.000Z',
    maxUses: 250,
    usedCount: 0,
    minPurchaseCOP: 250000,
    allowedCategory: 'Todas',
    isActive: true,
    usageHistory: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: 'jeffervr@gmail.com'
  }
];

export const INITIAL_POLICIES: PolicyDocument[] = [
  {
    id: 'pol_garantia_nuevo',
    code: 'POL-GAR-NUEVOS-2026',
    category: 'garantia_nuevo',
    title: 'Política de Garantía para Productos Nuevos',
    version: 'v2.4 (Ley 1480 de 2011)',
    summary:
      'Respaldo integral por defectos de fabricación en computadores, servidores, monitores, redes y dispositivos nuevos comercializados por IPS TECNOLÓGICA.',
    legalFramework:
      'Estatuto del Consumidor de Colombia — Ley 1480 de 2011 (Artículos 7 al 17) y Decreto 735 de 2013. Diferenciación expresa entre Garantía Legal obligatoria, Garantía directa del Fabricante (OEM) y Garantía suplementaria de IPS TECNOLÓGICA.',
    durationMonths: 12,
    startCondition: 'Inicia a partir de la fecha de entrega efectiva del producto al cliente (registrada en la factura o guía de entrega).',
    coverageDetails: [
      'Garantía Legal y de Fabricante de 12 a 36 meses según la línea del equipo (Portátiles, Workstations, Servidores, Monitores, Redes).',
      'Reparación totalmente gratuita de los defectos de fábrica, incluyendo repuestos originales y mano de obra calificada.',
      'En caso de repetirse la falla tras la primera intervención técnica, el consumidor podrá elegir entre una nueva reparación, la devolución total o parcial del precio pagado o el cambio del bien por otro de la misma especie (Ley 1480 de 2011).',
      'Verificación de trazabilidad mediante número de serie único registrado en la base de datos de IPS TECNOLÓGICA.'
    ],
    exclusions: [
      'Daños físicos ocasionados por golpes, caídas, presión excesiva sobre pantallas, derrames de líquidos o humedad.',
      'Daños eléctricos derivados de fluctuaciones de voltaje, descargas atmosféricas o conexión a redes sin polo a tierra ni UPS.',
      'Violación, alteración o retiro de los sellos de seguridad de fábrica o de IPS TECNOLÓGICA.',
      'Intervención, destape o manipulación por personal técnico ajeno al laboratorio autorizado de IPS TECNOLÓGICA o del fabricante.',
      'Desgaste natural de consumibles (tintas, tóner, almohadillas) o desconfiguración de software y virus informáticos.'
    ],
    requirements: [
      'Presentar o indicar número de factura de compra, pedido o cédula/NIT del comprador titular (la falta de factura física no impide reclamar si consta en el registro de IPS TECNOLÓGICA conforme a la Ley 1480).',
      'Entregar el equipo con su número de serie legible y accesorios originales relacionados con la falla.',
      'Realizar copia de seguridad previa de su información personal.'
    ],
    claimProcedure: [
      '1. Radicar la solicitud en el Portal de Clientes, en sede física o por WhatsApp oficial indicando serial y descripción del fallo.',
      '2. Recepción del equipo y emisión de constancia de ingreso a garantía con número de caso GAR-2026-XXXX.',
      '3. Diagnóstico técnico en laboratorio dentro de los primeros 5 días hábiles.',
      '4. Reparación técnica, reemplazo de unidad o nota crédito conforme a los términos de ley.'
    ],
    estimatedAttentionTime: 'Diagnóstico en 3 a 5 días hábiles. Solución definitiva máximo en 15 a 30 días hábiles conforme al Decreto 735 de 2013.',
    isActive: true,
    updatedAt: nowIso,
    updatedBy: 'jeffervr@gmail.com'
  },
  {
    id: 'pol_garantia_repuesto',
    code: 'POL-GAR-REPUESTOS-2026',
    category: 'garantia_repuesto',
    title: 'Política de Garantía para Repuestos y Componentes',
    version: 'v2.4 (Ley 1480 de 2011)',
    summary:
      'Condiciones técnicas de cobertura para memorias RAM, unidades SSD/HDD, pantallas, baterías, cargadores, fuentes, teclados y tarjetas electrónicas.',
    legalFramework:
      'Ley 1480 de 2011 — Garantía sobre partes, piezas, insumos y componentes electrónicos comercializados o instalados en laboratorio.',
    durationMonths: 6,
    startCondition: 'Inicia desde la fecha de facturación del repuesto o desde la entrega de la Orden de Servicio Técnico (SRV) cuando es instalado por IPS TECNOLÓGICA.',
    coverageDetails: [
      'Cobertura directa por fallos electrónicos internos de fábrica del componente.',
      'Trazabilidad vinculada a la factura de compra, al cliente y a la orden de instalación SRV cuando aplica.',
      'Cambio mano a mano del componente defectuoso tras validación en banco de pruebas.'
    ],
    exclusions: [
      'Daño por descarga electrostática (ESD), cortocircuito, pines doblados o quemaduras en pistas PCB por mala manipulación.',
      'Pantallas o displays con cristales fisurados, líneas por presión mecánica, humedad o flex rasgado durante instalación externa.',
      'Baterías infladas por uso de cargadores genéricos no certificados o exposición a altas temperaturas.',
      'Incompatibilidad de referencia cuando el cliente adquirió el repuesto sin diagnóstico previo de nuestro laboratorio.'
    ],
    requirements: [
      'Conservar los sellos holográficos de garantía de IPS TECNOLÓGICA intactos sobre el repuesto.',
      'Para tarjetas electrónicas, pantallas y componentes internos se recomienda o exige instalación por técnico calificado.'
    ],
    claimProcedure: [
      '1. Presentar el componente con su empaque antiestático y número de serie/orden SRV.',
      '2. Verificación física de sellos, pines y ausencia de daño térmico o mecánico.',
      '3. Prueba en banco de diagnóstico (24 a 72 horas hábiles) y reemplazo por unidad equivalente.'
    ],
    estimatedAttentionTime: '2 a 5 días hábiles para validación en banco de pruebas.',
    sparePartRules: [
      {
        componentType: 'Memorias RAM (DDR4 / DDR5 / ECC)',
        durationMonths: 12,
        requiresTechInstallation: false,
        coverage: 'Fallo de celdas de memoria o errores en MemTest86 sin daño físico.',
        exclusions: 'Contactos dorados quemados, PCB partido o overclocking fuera de perfil XMP/EXPO.'
      },
      {
        componentType: 'Discos SSD NVMe / SATA y HDD',
        durationMonths: 12,
        requiresTechInstallation: false,
        coverage: 'Fallo de controladora o sectores defectuosos dentro del límite de TBW del fabricante.',
        exclusions: 'Conector SATA/M.2 roto, daño por cortocircuito o recuperación de información.'
      },
      {
        componentType: 'Pantallas y Displays (Portátil / Monitor)',
        durationMonths: 3,
        requiresTechInstallation: true,
        coverage: 'Fallo de retroiluminación o píxeles muertos según norma ISO (>5 subpíxeles).',
        exclusions: 'Cristal roto, manchas negras por presión, líneas por golpe o conector flex rasgado.'
      },
      {
        componentType: 'Baterías Originales y Homologadas',
        durationMonths: 6,
        requiresTechInstallation: false,
        coverage: 'Fallo prematuro de celdas internas antes del ciclo nominal.',
        exclusions: 'Batería inflada por sobrecarga térmica, humedad o uso de cargador genérico.'
      },
      {
        componentType: 'Teclados y Touchpads',
        durationMonths: 3,
        requiresTechInstallation: true,
        coverage: 'Fallo de membrana electrónica o pistas internas de fábrica.',
        exclusions: 'Derrame de líquidos, teclas arrancadas o cinta flex rasgada.'
      },
      {
        componentType: 'Cargadores y Adaptadores AC',
        durationMonths: 6,
        requiresTechInstallation: false,
        coverage: 'Ausencia de voltaje nominal regulado por defecto interno.',
        exclusions: 'Cables cortados, punta fracturada o daño por descarga eléctrica.'
      },
      {
        componentType: 'Fuentes de Poder (ATX / Server)',
        durationMonths: 6,
        requiresTechInstallation: true,
        coverage: 'Fallo en rieles de +12V/+5V o protecciones internas OVP/OCP.',
        exclusions: 'Sobretensión externa sin UPS/regulador o apertura del sello de fábrica.'
      },
      {
        componentType: 'Tarjetas Madre / Mainboards',
        durationMonths: 3,
        requiresTechInstallation: true,
        coverage: 'Defectos de circuito electrónico verificados en banco de laboratorio.',
        exclusions: 'Pines de socket doblados, humedad, cortocircuito o BIOS corrupta por terceros.'
      },
      {
        componentType: 'Ventiladores, Coolers y Disipadores',
        durationMonths: 3,
        requiresTechInstallation: true,
        coverage: 'Fallo de motor brushless o rodamiento de fábrica.',
        exclusions: 'Aspas partidas, obstrucción por polvo extremo o cables arrancados.'
      },
      {
        componentType: 'Conectores, Flex, Bisagras y Puertos',
        durationMonths: 3,
        requiresTechInstallation: true,
        coverage: 'Continuidad eléctrica y ajuste mecánico al momento de instalación en sede.',
        exclusions: 'Ruptura por fuerza excesiva, tirones o manipulación externa.'
      },
      {
        componentType: 'Cámaras, Parlantes, Sensores y Accesorios',
        durationMonths: 3,
        requiresTechInstallation: false,
        coverage: 'Defectos de operación electrónica de fábrica.',
        exclusions: 'Golpes, humedad, membranas perforadas o sulfatación.'
      }
    ],
    isActive: true,
    updatedAt: nowIso,
    updatedBy: 'jeffervr@gmail.com'
  },
  {
    id: 'pol_garantia_remanufacturado',
    code: 'POL-GAR-REMANUF-2026',
    category: 'garantia_remanufacturado',
    title: 'Política de Garantía para Productos Remanufacturados o Reacondicionados',
    version: 'v2.4 (Ley 1480 de 2011 · Art. 15)',
    summary:
      'Transparencia total y garantía certificada para equipos reacondicionados o remanufacturados inspeccionados por el laboratorio de IPS TECNOLÓGICA.',
    legalFramework:
      'Ley 1480 de 2011, Artículo 15 — Bienes usados, imperfectos, remanufacturados o reacondicionados: se informa de manera clara, veraz y visible su condición antes de la compra. Nunca se presentan como productos nuevos.',
    durationMonths: 6,
    startCondition: 'Inicia a partir de la entrega del equipo reacondicionado con su Certificado de Inspección de Laboratorio IPS TECNOLÓGICA.',
    coverageDetails: [
      'Cada equipo remanufacturado se entrega con ficha técnica que detalla: Grado Estético (Grado A+ o Grado A), componentes revisados, piezas nuevas reemplazadas (ej. SSD o pasta térmica) y pruebas de estrés superadas.',
      'Garantía de funcionamiento de hardware de 6 a 12 meses según se especifique en la ficha del producto.',
      'Soporte directo en el laboratorio propio de IPS TECNOLÓGICA.'
    ],
    exclusions: [
      'Detalles estéticos leves en carcasa previamente informados y aceptados según el grado estético del equipo.',
      'Autonomía de batería inferior a la de un equipo 100% nuevo (se garantiza un mínimo operativo certificado de carga).',
      'Daños físicos posteriores a la entrega, humedad, golpes o manipulación por terceros.'
    ],
    requirements: [
      'Aceptación expresa de la condición de Producto Remanufacturado / Reacondicionado al momento de la compra.',
      'Conservar los sellos de garantía del laboratorio IPS TECNOLÓGICA.'
    ],
    claimProcedure: [
      '1. Registrar la solicitud con el número de serie y orden de compra.',
      '2. Ingreso prioritario al laboratorio de IPS TECNOLÓGICA para revisión de los módulos cubiertos.',
      '3. Reparación de componente o cambio por otro equipo reacondicionado de igual o superior especificación.'
    ],
    estimatedAttentionTime: '3 a 8 días hábiles en laboratorio propio.',
    isActive: true,
    updatedAt: nowIso,
    updatedBy: 'jeffervr@gmail.com'
  },
  {
    id: 'pol_garantia_servicio',
    code: 'POL-GAR-SRV-2026',
    category: 'garantia_servicio',
    title: 'Política de Garantía para Servicios Técnicos (Órdenes SRV)',
    version: 'v2.4 (Ley 1480 de 2011)',
    summary:
      'Garantía sobre servicios de mantenimiento preventivo/correctivo, reparaciones, instalación de hardware/software, redes y servicio a domicilio.',
    legalFramework:
      'Ley 1480 de 2011 y Decreto 735 de 2013 — Garantía legal en la prestación de servicios que suponen la entrega de un bien para reparación o mantenimiento.',
    durationMonths: 3,
    startCondition: 'Inicia desde la fecha de cierre y entrega del equipo registrada en la Orden de Servicio Técnico (SRV).',
    coverageDetails: [
      '90 días (3 meses) de garantía sobre la mano de obra y el procedimiento técnico específico ejecutado en la orden SRV.',
      '30 días de estabilidad en instalaciones de sistemas operativos, controladores y configuración lógica.',
      'Vinculación directa con el número de orden SRV, técnico responsable asignado e historial fotográfico del antes y después.'
    ],
    exclusions: [
      'Fallas en piezas o módulos del equipo distintos a los intervenidos en la orden de servicio.',
      'Infección posterior por malware/ransomware, descarga de programas no autorizados o desconfiguración causada por el usuario.',
      'Equipos ingresados por humedad/sulfatación severa cuando el cliente fue advertido del riesgo de falla progresiva en placa.',
      'Equipos no reclamados después de 90 días calendario tras la notificación de finalización (abandono legal).'
    ],
    requirements: [
      'Indicar el número de Orden de Servicio Técnico (ej. SRV-2026-0001).',
      'No haber roto el sello de garantía colocado por el técnico de IPS TECNOLÓGICA al cerrar el equipo.'
    ],
    claimProcedure: [
      '1. Contactar a soporte técnico o ingresar a "Agenda tu Servicio Técnico" indicando el número de orden SRV.',
      '2. Asignación prioritaria sin costo de revisión con el técnico especialista.',
      '3. Corrección inmediata del ajuste técnico cubierto por la garantía.'
    ],
    estimatedAttentionTime: 'Atención prioritaria en 24 a 72 horas hábiles.',
    isActive: true,
    updatedAt: nowIso,
    updatedBy: 'jeffervr@gmail.com'
  },
  {
    id: 'pol_envio_nacional',
    code: 'POL-ENVIOS-COL-2026',
    category: 'politica_envio',
    title: 'Políticas de Envío, Despacho y Transporte de Mercancía',
    version: 'v2.4 (Cali · Valle del Cauca · Colombia)',
    summary:
      'Condiciones de alistamiento, aseguramiento, tiempos de entrega, transportadoras aliadas y seguimiento con número de guía para Cali, Valle del Cauca y toda Colombia.',
    legalFramework:
      'Estatuto del Consumidor Ley 1480 de 2011 (Ventas a distancia y comercio electrónico) y normativa de transporte de carga asegurada en Colombia.',
    durationMonths: 0,
    startCondition: 'Aplica desde la confirmación y validación del pago del pedido.',
    coverageDetails: [
      'Todos los despachos viajan con seguro por el 100% del valor declarado de la factura.',
      'Modalidades disponibles por producto: Envío Gratis, Envío Pagado por el cliente, Envío Incluido en el precio o Envío Cotizado según destino.',
      'Asignación manual o automática de Número de Guía y enlace de rastreo visible en el Portal de Clientes y enviado por WhatsApp.'
    ],
    exclusions: [
      'Retrasos por causas de fuerza mayor en vías nacionales, cierres viales o condiciones climáticas extremas ajenas a IPS TECNOLÓGICA.',
      'Direcciones incompletas o erróneas suministradas por el comprador sin notificación oportuna.'
    ],
    requirements: [
      'Verificar el estado físico de la caja y la cinta de seguridad de IPS TECNOLÓGICA en presencia del transportador al recibir.',
      'En caso de avería visible en el empaque, dejar constancia escrita en la guía de la transportadora y reportar dentro de las 24 horas siguientes.'
    ],
    claimProcedure: [
      '1. Reportar cualquier novedad de entrega o retraso indicando el número de pedido (PED-2026-XXX) y Número de Guía.',
      '2. IPS TECNOLÓGICA gestiona directamente la novedad ante la transportadora aliada y protege la compra del cliente.'
    ],
    estimatedAttentionTime: 'Despacho en 24 horas hábiles. Entrega de 1 a 3 días hábiles según ciudad.',
    shippingZones: [
      {
        zone: 'Envíos dentro de Cali y Área Metropolitana',
        carriers: ['Mensajería Express IPS TECNOLÓGICA', 'Servientrega', 'Coordinadora'],
        estimatedTime: 'Mismo día o 24 horas hábiles',
        baseCostCOP: 15000,
        freeShippingMinCOP: 1500000,
        conditions: 'Entrega directa asegurada en domicilio u oficina.'
      },
      {
        zone: 'Envíos en el Valle del Cauca (Palmira, Yumbo, Jamundí, Buga, Tuluá, Buenaventura, Cartago)',
        carriers: ['Servientrega', 'Interrapidísimo', 'Coordinadora', 'Envía'],
        estimatedTime: '24 a 48 horas hábiles',
        baseCostCOP: 22000,
        freeShippingMinCOP: 2000000,
        conditions: 'Despacho asegurado con guía de seguimiento en línea.'
      },
      {
        zone: 'Otras ciudades principales de Colombia (Bogotá, Medellín, Barranquilla, Bucaramanga, Pereira, Eje Cafetero, Costa y resto del país)',
        carriers: ['Servientrega', 'Coordinadora', 'Interrapidísimo', 'TCC', 'Envía'],
        estimatedTime: '24 a 72 horas hábiles (ciudades principales) / 3 a 5 días (municipios especiales)',
        baseCostCOP: 32000,
        freeShippingMinCOP: 2500000,
        conditions: 'Empaque reforzado de alta protección y póliza de mercancía por el 100% del valor.'
      }
    ],
    isActive: true,
    updatedAt: nowIso,
    updatedBy: 'jeffervr@gmail.com'
  }
];

export const INITIAL_SHIPMENTS: ShipmentRecord[] = [
  {
    id: 'env_1',
    orderId: 'PED-2026-001',
    clientName: 'Carlos Mendoza',
    clientEmail: 'cliente@ejemplo.com',
    clientPhone: '+57 300 123 4567',
    address: 'Calle 100 # 19-61, Oficina 502',
    city: 'Bogotá D.C.',
    department: 'Cundinamarca',
    carrier: 'Coordinadora Mercantil',
    trackingNumber: 'GUIA-COORD-78945120',
    trackingUrl: 'https://www.coordinadora.com/portafolio-de-servicios/servicios-en-linea/rastrear-guias/',
    shippingType: 'Gratis',
    shippingCostCOP: 0,
    dispatchDate: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    estimatedDeliveryDate: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    status: 'Entregado',
    notes: 'Recibido en recepción corporativa con sello de conformidad.',
    history: [
      {
        date: new Date(Date.now() - 86400000 * 3).toISOString(),
        status: 'Despachado',
        actor: 'jeffervr@gmail.com',
        note: 'Despacho alistado con guía GUIA-COORD-78945120'
      },
      {
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        status: 'Entregado',
        actor: 'jeffervr@gmail.com',
        note: 'Entrega confirmada al cliente Carlos Mendoza'
      }
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedBy: 'jeffervr@gmail.com'
  },
  {
    id: 'env_2',
    orderId: 'PED-2026-002',
    clientName: 'Carlos Mendoza',
    clientEmail: 'cliente@ejemplo.com',
    clientPhone: '+57 300 123 4567',
    address: 'Calle 100 # 19-61, Oficina 502',
    city: 'Bogotá D.C.',
    department: 'Cundinamarca',
    carrier: 'Servientrega',
    trackingNumber: 'SER-2026-9941023',
    trackingUrl: 'https://www.servientrega.com/',
    shippingType: 'Gratis',
    shippingCostCOP: 0,
    dispatchDate: new Date().toISOString().slice(0, 10),
    estimatedDeliveryDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    status: 'Preparando pedido',
    notes: 'Empaque de seguridad para monitor curvo 34" y audífonos estudio.',
    history: [
      {
        date: new Date(Date.now() - 3600000 * 4).toISOString(),
        status: 'Preparando pedido',
        actor: 'jeffervr@gmail.com',
        note: 'Pedido en alistamiento en bodega principal'
      }
    ],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'jeffervr@gmail.com'
  }
];

export const INITIAL_ADMIN_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'notif_init_1',
    targetAdminEmail: 'jeffervr@gmail.com',
    eventType: 'RESPALDO_EXITOSO',
    title: 'Sistema 100% Gratuito y Persistente Activo',
    message:
      'Almacenamiento permanente en servidor + Google Sheets + Google Drive + Google Calendar + enlaces wa.me y Gemini gratuito verificados.',
    severity: 'success',
    relatedModule: 'system-backups',
    isRead: false,
    createdAt: nowIso
  },
  {
    id: 'notif_init_2',
    targetAdminEmail: 'jeffervr@gmail.com',
    eventType: 'ENVIO_PENDIENTE',
    title: 'Envío en alistamiento: Pedido PED-2026-002',
    message: 'El pedido PED-2026-002 de Carlos Mendoza se encuentra en estado "Preparando pedido" con guía SER-2026-9941023.',
    severity: 'info',
    relatedEntityId: 'PED-2026-002',
    relatedModule: 'warranties-shipping',
    isRead: false,
    createdAt: nowIso
  }
];

export const INITIAL_CASH_MOVEMENTS: CashMovement[] = [
  {
    id: 'cash_1',
    type: 'INGRESO_VENTA',
    referenceId: 'PED-2026-001',
    concept: 'Pago pedido corporativo PED-2026-001 (Workstation Pro 16")',
    amountCOP: 9450000,
    paymentMethod: 'Transferencia Bancolombia',
    recordedBy: 'caja@ipstecnologica.com.co',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'cash_2',
    type: 'INGRESO_SERVICIO',
    referenceId: 'SRV-2026-0001',
    concept: 'Abono mantenimiento preventivo SRV-2026-0001',
    amountCOP: 165000,
    paymentMethod: 'Nequi / PSE',
    recordedBy: 'caja@ipstecnologica.com.co',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

export const INITIAL_ORDER_AUTHORIZATIONS: OrderAuthorizationRequest[] = [];

export const INITIAL_CRM_CUSTOMERS: CrmCustomerRecord[] = [
  {
    id: 'crm_1',
    fullName: 'Carlos Andrés Mendoza',
    name: 'Carlos Andrés Mendoza',
    email: 'cliente@ejemplo.com',
    phone: '+57 315 489 2011',
    documentId: '1.032.458.910',
    companyName: 'Inversiones y Arquitectura del Valle S.A.S.',
    city: 'Cali, Valle del Cauca',
    address: 'Avenida 6N # 28N-45, Oficina 502',
    clientType: 'Empresa / Corporativo',
    classification: 'Empresarial',
    status: 'Activo',
    lastPurchaseDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    nextFollowUpDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
    totalPurchasesCOP: 14850000,
    ordersCount: 3,
    servicesCount: 2,
    warrantiesCount: 0,
    internalNotes: 'Cliente corporativo prioritario. Adquiere estaciones de trabajo para renderizado 3D y contratos de mantenimiento preventivo trimestral.',
    followUps: [
      {
        id: 'fup_1',
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        actor: 'jeffervr@gmail.com',
        channel: 'WhatsApp',
        summary: 'Confirmación de recepción de Workstation Pro 16" y programación de revisión preventiva.',
        nextFollowUpDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10)
      }
    ],
    marketingConsent: true,
    optedOut: false,
    consentAccepted: true,
    consentDate: '2026-01-15T14:20:00.000Z',
    optOutCommercial: false,
    createdAt: '2026-01-15T14:20:00.000Z',
    updatedAt: nowIso,
    updatedBy: 'jeffervr@gmail.com'
  },
  {
    id: 'crm_2',
    fullName: 'Dra. Laura Victoria Gómez',
    name: 'Dra. Laura Victoria Gómez',
    email: 'laura.gomez@clinicavalle.co',
    phone: '+57 318 720 4419',
    documentId: '66.842.190',
    companyName: 'Centro Médico Especializado del Sur',
    city: 'Cali, Valle del Cauca',
    address: 'Calle 5B # 38-14, Consultorio 304',
    clientType: 'Empresa / Corporativo',
    classification: 'Frecuente',
    status: 'Activo',
    lastPurchaseDate: new Date(Date.now() - 86400000 * 12).toISOString(),
    nextFollowUpDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
    totalPurchasesCOP: 8290000,
    ordersCount: 2,
    servicesCount: 3,
    warrantiesCount: 0,
    internalNotes: 'Requiere UPS Online y soporte técnico a domicilio para equipos de imagenología y recepción.',
    followUps: [
      {
        id: 'fup_2',
        date: new Date(Date.now() - 86400000 * 5).toISOString(),
        actor: 'jeffervr@gmail.com',
        channel: 'Llamada',
        summary: 'Seguimiento post-servicio de red cableada estructurada. Interesada en cotización de 3 portátiles.',
        nextFollowUpDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10)
      }
    ],
    marketingConsent: true,
    optedOut: false,
    consentAccepted: true,
    consentDate: '2026-02-10T10:00:00.000Z',
    optOutCommercial: false,
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: nowIso,
    updatedBy: 'jeffervr@gmail.com'
  },
  {
    id: 'crm_3',
    fullName: 'Distribuidora Tecnológica Andina Ltda.',
    name: 'Distribuidora Tecnológica Andina Ltda.',
    email: 'compras@tecnoandina.com.co',
    phone: '+57 310 554 8921',
    documentId: '900.812.341-5',
    companyName: 'Distribuidora Tecnológica Andina Ltda.',
    city: 'Bogotá D.C.',
    address: 'Carrera 15 # 78-40, Local 108',
    clientType: 'Empresa / Corporativo',
    classification: 'Mayorista',
    status: 'En seguimiento',
    lastPurchaseDate: new Date(Date.now() - 86400000 * 8).toISOString(),
    nextFollowUpDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    totalPurchasesCOP: 32400000,
    ordersCount: 5,
    servicesCount: 1,
    warrantiesCount: 1,
    internalNotes: 'Compra lotes de unidades SSD NVMe, memorias RAM DDR5 y monitores corporativos.',
    followUps: [
      {
        id: 'fup_3',
        date: new Date(Date.now() - 86400000 * 3).toISOString(),
        actor: 'jeffervr@gmail.com',
        channel: 'Correo',
        summary: 'Envío de catálogo PDF mayorista actualizado con descuentos por volumen.',
        nextFollowUpDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10)
      }
    ],
    marketingConsent: true,
    optedOut: false,
    consentAccepted: true,
    consentDate: '2026-01-05T09:15:00.000Z',
    optOutCommercial: false,
    createdAt: '2026-01-05T09:15:00.000Z',
    updatedAt: nowIso,
    updatedBy: 'jeffervr@gmail.com'
  },
  {
    id: 'crm_4',
    fullName: 'Andrés Felipe Restrepo',
    name: 'Andrés Felipe Restrepo',
    email: 'andres.restrepo@correo.co',
    phone: '+57 320 911 3340',
    documentId: '1.144.092.311',
    city: 'Medellín, Antioquia',
    address: 'Carrera 43A # 14-50, El Poblado',
    clientType: 'Persona Natural',
    classification: 'Nuevo',
    status: 'Prospecto',
    nextFollowUpDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    totalPurchasesCOP: 0,
    ordersCount: 0,
    servicesCount: 1,
    warrantiesCount: 0,
    internalNotes: 'Solicitó diagnóstico remoto y cotización de portátil empresarial Core Ultra 7.',
    followUps: [],
    marketingConsent: true,
    optedOut: false,
    consentAccepted: true,
    consentDate: nowIso,
    optOutCommercial: false,
    createdAt: nowIso,
    updatedAt: nowIso,
    updatedBy: 'jeffervr@gmail.com'
  }
];

export const INITIAL_MARKETING_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'mkt_1',
    name: 'Renovación Corporativa Workstations & Servidores 2026',
    objective: 'Impulsar la actualización de estaciones de trabajo y servidores en empresas y clientes frecuentes con cupón IPS10.',
    targetSegment: 'Empresarial',
    discountCode: 'IPS10',
    messageTemplate: 'Hola {{nombre}}, en IPS TECNOLÓGICA tenemos disponible nuestra nueva línea de Workstations Core i9/Ultra 7 y Servidores con 10% de descuento usando el código IPS10 y garantía oficial en Colombia.',
    whatsappPreparedText: 'Hola IPS TECNOLÓGICA, recibí la campaña de Renovación Corporativa y deseo cotizar equipos con el código IPS10.',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000 * 60).toISOString().slice(0, 10),
    campaignDate: new Date().toISOString().slice(0, 10),
    status: 'Activa',
    sentCount: 3,
    clicksCount: 18,
    eligibleRecipientsCount: 3,
    clicksOrResponsesCount: 18,
    conversionsCount: 5,
    revenueGeneratedCOP: 24650000,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: 'jeffervr@gmail.com'
  },
  {
    id: 'mkt_2',
    name: 'Mantenimiento Preventivo + Actualización SSD NVMe / RAM',
    objective: 'Reactivar clientes para servicio técnico preventivo en sede o a domicilio con descuento en repuestos originales.',
    targetSegment: 'Frecuente',
    discountCode: 'NAVIDAD20',
    messageTemplate: 'Hola {{nombre}}, optimiza la velocidad de tus computadores en el Laboratorio Certificado de IPS TECNOLÓGICA. Agenda tu mantenimiento preventivo o actualiza a SSD NVMe con respaldo Ley 1480.',
    whatsappPreparedText: 'Hola IPS TECNOLÓGICA, quiero agendar un mantenimiento preventivo y cotizar actualización de SSD/RAM.',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000 * 60).toISOString().slice(0, 10),
    campaignDate: new Date().toISOString().slice(0, 10),
    status: 'Activa',
    sentCount: 4,
    clicksCount: 12,
    eligibleRecipientsCount: 4,
    clicksOrResponsesCount: 12,
    conversionsCount: 4,
    revenueGeneratedCOP: 3850000,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: 'jeffervr@gmail.com'
  }
];

export const INITIAL_PAYMENT_METHODS: PaymentMethodItem[] = [
  {
    id: 'pm_efectivo',
    name: 'Efectivo en Sede / Contraentrega Autorizada',
    category: 'Efectivo',
    description: 'Pago directo en pesos colombianos (COP) en nuestra sede principal o recaudo autorizado.',
    instructions: 'Recibe factura electrónica oficial DIAN inmediatamente al registrar tu pago.',
    enabled: true,
    displayOrder: 1,
    order: 1
  },
  {
    id: 'pm_transferencia',
    name: 'Transferencia Bancaria (Bancolombia / Davivienda / Banco de Bogotá)',
    category: 'Transferencia',
    description: 'Transferencia interbancaria o empresarial ACH / PSE sin recargo adicional.',
    instructions: 'Solicita el certificado bancario corporativo a nombre de IPS TECNOLÓGICA con tu asesor.',
    enabled: true,
    displayOrder: 2,
    order: 2
  },
  {
    id: 'pm_nequi',
    name: 'Nequi Comercial Oficial',
    category: 'Billetera Digital',
    description: 'Transferencia inmediata desde tu billetera Nequi con confirmación en línea.',
    instructions: 'Envía el comprobante por WhatsApp indicando tu número de pedido o servicio SRV.',
    enabled: true,
    displayOrder: 3,
    order: 3
  },
  {
    id: 'pm_daviplata',
    name: 'Daviplata Oficial',
    category: 'Billetera Digital',
    description: 'Pago rápido y seguro mediante billetera digital Daviplata.',
    instructions: 'Confirma el número autorizado con tu asesor comercial antes de transferir.',
    enabled: true,
    displayOrder: 4,
    order: 4
  },
  {
    id: 'pm_tarjetas',
    name: 'Tarjetas Débito y Crédito (Visa, Mastercard, American Express)',
    category: 'Tarjetas',
    description: 'Recibimos todas las franquicias nacionales e internacionales por datáfono o pasarela segura.',
    instructions: 'Disponible para compras en sede y mediante enlace de pago verificado.',
    enabled: true,
    displayOrder: 5,
    order: 5
  },
  {
    id: 'pm_qr',
    name: 'Código QR Interoperable (Bancolombia / Redeban / Bre-B)',
    category: 'QR',
    description: 'Escanea desde cualquier app bancaria colombiana sin costo de transacción.',
    instructions: 'Solicita el QR oficial de caja para tu pedido o cita de soporte.',
    enabled: true,
    displayOrder: 6,
    order: 6
  },
  {
    id: 'pm_enlace',
    name: 'Enlaces de Pago Seguros (PSE / Wompi / Bold)',
    category: 'Enlace de Pago',
    description: 'Paga desde cualquier ciudad de Colombia mediante link de pago personalizado.',
    instructions: 'Tu asesor genera el link único vinculado al código de tu pedido.',
    enabled: true,
    displayOrder: 7,
    order: 7
  }
];

export const INITIAL_REMOTE_SUPPORT_TOOLS: RemoteSupportToolItem[] = [
  {
    id: 'rst_anydesk_win',
    programName: 'AnyDesk Oficial (Soporte Remoto IPS TECNOLÓGICA)',
    operatingSystem: 'Windows',
    description: 'Herramienta oficial de asistencia remota de baja latencia para diagnóstico, instalación de software y soporte técnico autorizado.',
    version: '8.0.10 (Oficial)',
    officialDownloadUrl: 'https://anydesk.com/es/downloads/windows',
    instructions: [
      '1. Descargar el programa desde el enlace oficial del fabricante.',
      '2. Abrirlo sin necesidad de configuración compleja.',
      '3. Compartir el ID o código de conexión con el técnico de IPS TECNOLÓGICA por un canal seguro.',
      '4. Autorizar la conexión en pantalla cuando el técnico lo solicite.',
      '5. Finalizar la sesión cuando termine el soporte técnico.'
    ],
    requirements: 'Windows 10 / Windows 11 (64-bit o 32-bit) y conexión estable a Internet.',
    updatedAt: nowIso.slice(0, 10),
    enabled: true
  },
  {
    id: 'rst_rustdesk_multi',
    programName: 'RustDesk Open Source Oficial (Windows / macOS / Linux)',
    operatingSystem: 'macOS',
    description: 'Alternativa de código abierto cifrada de extremo a extremo para soporte técnico remoto multiplataforma.',
    version: '1.3.1 (Oficial)',
    officialDownloadUrl: 'https://rustdesk.com/es/',
    instructions: [
      '1. Descargar el programa desde el enlace oficial.',
      '2. Abrirlo en tu computador.',
      '3. Compartir el ID temporal con el ingeniero asignado de IPS TECNOLÓGICA.',
      '4. Autorizar explícitamente la sesión.',
      '5. Cerrar la aplicación al concluir el servicio.'
    ],
    requirements: 'Windows, macOS 11+ o Linux Ubuntu/Debian.',
    updatedAt: nowIso.slice(0, 10),
    enabled: true
  },
  {
    id: 'rst_teamviewer_qs',
    programName: 'TeamViewer QuickSupport Oficial',
    operatingSystem: 'Windows',
    description: 'Módulo ejecutable rápido de asistencia remota corporativa sin instalación permanente.',
    version: '15.58 (Oficial)',
    officialDownloadUrl: 'https://www.teamviewer.com/es-co/descarga/windows/',
    instructions: [
      '1. Descargar TeamViewer QuickSupport desde la página oficial.',
      '2. Ejecutar el módulo de cliente.',
      '3. Indicar el ID de sesión al técnico autorizado de IPS TECNOLÓGICA.',
      '4. Aceptar la solicitud de control remoto en pantalla.',
      '5. Finalizar la conexión al terminar la revisión.'
    ],
    requirements: 'Windows 10/11 o macOS con acceso a Internet.',
    updatedAt: nowIso.slice(0, 10),
    enabled: true
  }
];

export const INITIAL_WHATSAPP_QR_CONFIG: WhatsAppQrConfig = {
  whatsappNumber: '+57 310 894 7231',
  phoneNumber: '+57 310 894 7231',
  welcomeMessage: 'Hola IPS TECNOLÓGICA, visité su sitio web oficial y deseo recibir asesoría comercial.',
  defaultWelcomeMessage: 'Hola IPS TECNOLÓGICA, visité su sitio web oficial y deseo recibir asesoría comercial.',
  customerServiceMessage: 'Hola IPS TECNOLÓGICA, necesito atención al cliente sobre un producto o servicio tecnológico.',
  ordersMessage: 'Hola IPS TECNOLÓGICA, deseo realizar o consultar el estado de un pedido del catálogo online.',
  appointmentsMessage: 'Hola IPS TECNOLÓGICA, quiero agendar o confirmar una cita de servicio técnico especializado.',
  warrantiesMessage: 'Hola IPS TECNOLÓGICA, deseo realizar una consulta de garantía conforme a la Ley 1480 de 2011.',
  shipmentsMessage: 'Hola IPS TECNOLÓGICA, deseo consultar la guía y el seguimiento de mi envío nacional.',
  directWaMeUrl: 'https://wa.me/573108947231?text=Hola%20IPS%20TECNOL%C3%93GICA%2C%20visit%C3%A9%20su%20sitio%20web%20oficial%20y%20deseo%20recibir%20asesor%C3%ADa%20comercial.',
  qrEnabled: true,
  geminiFreeEnabled: true,
  updatedAt: nowIso,
  updatedBy: 'jeffervr@gmail.com'
};

/**
 * Generates the 100% Free Google Apps Script (.gs) code that connects
 * Google Drive (12 official folders), Google Sheets (all system tabs), and Google Calendar
 * without requiring any credit card or Google Cloud billing.
 */
export function generateFreeGoogleAppsScriptCode(primaryAdminEmail = 'jeffervr@gmail.com'): string {
  return `/**
 * ============================================================================
 * IPS TECNOLÓGICA CATALOG STUDIO — PUENTE GRATUITO GOOGLE APPS SCRIPT (v3.0)
 * ============================================================================
 * 100% GRATUITO · SIN TARJETA DE CRÉDITO · SIN FACTURACIÓN DE GOOGLE CLOUD
 * Administrador Principal: ${primaryAdminEmail}
 *
 * INSTRUCCIONES DE INSTALACIÓN (3 MINUTOS):
 * 1. Abre https://script.google.com con la cuenta ${primaryAdminEmail}
 * 2. Haz clic en "Nuevo proyecto" y pega este código completo.
 * 3. Haz clic en "Implementar" -> "Nueva implementación" -> Tipo: "Aplicación web".
 * 4. Ejecutar como: "Yo (${primaryAdminEmail})" | Quién tiene acceso: "Cualquier persona".
 * 5. Copia la URL de la aplicación web (termina en /exec) y pégala en el portal:
 *    Configuración -> Google Sheets & Drive -> URL de Google Apps Script.
 */

const ROOT_FOLDER_NAME = 'IPS TECNOLÓGICA';
const SPREADSHEET_NAME = 'IPS_TECNOLOGICA_BASE_DATOS_OFICIAL';

const DRIVE_SUBFOLDERS = [
  'Productos',
  'Banners',
  'Logos',
  'Plantillas',
  'Catálogos PDF',
  'Documentos',
  'Clientes',
  'Órdenes de servicio',
  'Garantías',
  'Respaldos'
];

const PRODUCT_SUBFOLDERS = [
  'Fotografías principales',
  'Fotografías adicionales'
];

const SHEET_TABS = [
  'Productos',
  'Archivos_Drive',
  'Categorías',
  'Repuestos y Remanufacturados',
  'Clientes',
  'CRM y Seguimientos',
  'Campañas Marketing',
  'Usuarios y Roles',
  'Pedidos y Ventas',
  'Movimientos de Caja',
  'Promociones y Códigos',
  'Plantillas y Banners',
  'Servicios Técnicos SRV',
  'Citas y Calendario',
  'Garantías y Políticas',
  'Envíos y Guías',
  'Medios de Pago y Soporte Remoto',
  'Historial de Auditoría',
  'Configuración Empresa'
];

function ensureDriveAndSheetsStructure() {
  const props = PropertiesService.getScriptProperties();
  let rootFolderId = props.getProperty('ROOT_FOLDER_ID');
  let rootFolder;

  if (rootFolderId) {
    try { rootFolder = DriveApp.getFolderById(rootFolderId); } catch (e) { rootFolder = null; }
  }
  if (!rootFolder) {
    const iter = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
    rootFolder = iter.hasNext() ? iter.next() : DriveApp.createFolder(ROOT_FOLDER_NAME);
    props.setProperty('ROOT_FOLDER_ID', rootFolder.getId());
  }

  const foldersMap = {};
  DRIVE_SUBFOLDERS.forEach(function(name) {
    const subIter = rootFolder.getFoldersByName(name);
    const sub = subIter.hasNext() ? subIter.next() : rootFolder.createFolder(name);
    foldersMap[name] = { id: sub.getId(), url: sub.getUrl() };
    if (name === 'Productos') {
      PRODUCT_SUBFOLDERS.forEach(function(pSubName) {
        const pIter = sub.getFoldersByName(pSubName);
        const pSub = pIter.hasNext() ? pIter.next() : sub.createFolder(pSubName);
        foldersMap['Productos / ' + pSubName] = { id: pSub.getId(), url: pSub.getUrl() };
      });
    }
  });

  let ssId = props.getProperty('SPREADSHEET_ID');
  let ss;
  if (ssId) {
    try { ss = SpreadsheetApp.openById(ssId); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(SPREADSHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(rootFolder);
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }

  SHEET_TABS.forEach(function(tabName) {
    if (!ss.getSheetByName(tabName)) {
      ss.insertSheet(tabName);
    }
  });

  return {
    rootFolderId: rootFolder.getId(),
    rootFolderUrl: rootFolder.getUrl(),
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    folders: foldersMap
  };
}

function doGet(e) {
  const info = ensureDriveAndSheetsStructure();
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    service: 'IPS TECNOLÓGICA Free Apps Script Bridge v3.0',
    admin: '${primaryAdminEmail}',
    workspace: info,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const info = ensureDriveAndSheetsStructure();
    const payload = JSON.parse(e.postData.contents || '{}');
    const action = payload.action || 'SYNC_SNAPSHOT';

    if (action === 'UPLOAD_FILE' && payload.base64Data) {
      const targetFolderKey = payload.folderKey || 'Productos / Fotografías principales';
      const folderMeta = info.folders[targetFolderKey] || info.folders['Productos'];
      const folder = folderMeta ? DriveApp.getFolderById(folderMeta.id) : DriveApp.getFolderById(info.rootFolderId);
      const bytes = Utilities.base64Decode(payload.base64Data);
      const blob = Utilities.newBlob(bytes, payload.mimeType || 'image/jpeg', payload.fileName || ('IMG_' + Date.now() + '.jpg'));
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const fileId = file.getId();
      const ss = SpreadsheetApp.openById(info.spreadsheetId);
      const driveSheet = ss.getSheetByName('Archivos_Drive');
      if (driveSheet) {
        driveSheet.appendRow([
          fileId,
          payload.fileName || file.getName(),
          payload.mimeType || 'image/jpeg',
          payload.sizeBytes || bytes.length,
          targetFolderKey,
          payload.productId || '',
          payload.productReference || '',
          'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200',
          new Date().toISOString()
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        driveFileId: fileId,
        driveViewUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200',
        webViewLink: file.getUrl(),
        workspace: info
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'CREATE_CALENDAR_EVENT' && payload.appointment) {
      const appt = payload.appointment;
      const cal = CalendarApp.getDefaultCalendar();
      const start = new Date(appt.date + 'T' + (appt.time || '09:00') + ':00');
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const ev = cal.createEvent(
        '[' + (appt.ticketNumber || 'SRV') + '] ' + appt.serviceType + ' - ' + appt.clientName,
        start,
        end,
        {
          description: 'Cliente: ' + appt.clientName + ' (' + appt.clientPhone + ')\\nProblema: ' + (appt.notes || ''),
          location: appt.address || 'Sede IPS TECNOLÓGICA'
        }
      );
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        eventId: ev.getId(),
        workspace: info
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SAVE_BACKUP' && payload.backupData) {
      const folderMeta = info.folders['Respaldos'];
      const folder = folderMeta ? DriveApp.getFolderById(folderMeta.id) : DriveApp.getFolderById(info.rootFolderId);
      const file = folder.createFile(
        payload.fileName || ('IPS_RESPALDO_' + new Date().toISOString() + '.json'),
        JSON.stringify(payload.backupData, null, 2),
        MimeType.PLAIN_TEXT
      );
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        driveFileId: file.getId(),
        driveUrl: file.getUrl(),
        workspace: info
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      action: action,
      workspace: info,
      syncedAt: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: String(err)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
}

