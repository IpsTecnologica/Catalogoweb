import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  saveChunkToFirestore,
  saveAllChunksToFirestore,
  loadAllChunksFromFirestore,
  PortalChunkKey
} from './firestoreService.js';
import type {
  TechnicalServiceRequest,
  TechnicalServiceTicket,
  TechnicalAppointment,
  SupportAppointment,
  WarrantyRecord,
  WarrantyCaseStatus,
  WarrantyCategoryType,
  InventoryMovement,
  BackupRecordMeta,
  BackupRecord,
  BackupType,
  BackupModuleScope,
  BackupModuleType,
  TrashItem,
  SyncOperationRecord,
  PendingSyncOperation,
  ConnectionErrorLog,
  WhatsAppConversation,
  WhatsAppConversationStatus,
  WhatsAppMessage,
  WhatsAppConfig,
  TechnicalServiceType,
  TechnicalServiceModality,
  TechnicalServicePriority,
  ServiceModality,
  TechnicalServiceStatus,
  ClientEntityType,
  SparePartItem,
  SparePartUsed,
  ProductCondition,
  ProductShippingType,
  RemanufacturedDetails,
  SeasonalTemplate,
  PromoBannerItem,
  DiscountCode,
  PolicyDocument,
  PolicyCategoryKey,
  ShipmentRecord,
  ShipmentStatus,
  OrderAuthorizationRequest,
  AdminNotification,
  AdminNotificationEventType,
  CashMovement,
  PublicTechnicianInfo,
  CustomerPushEventType,
  CustomerPushEvent,
  CustomerPushSubscription,
  DriveOfficialFolderPath,
  DriveMediaAsset,
  DrivePersistenceTestStep,
  CrmClassification,
  CrmFollowUpEntry,
  CrmOpportunity,
  CrmCustomerRecord,
  MarketingCampaign,
  PaymentMethodItem,
  RemoteSupportToolItem,
  WhatsAppQrConfig,
  LandingPageCmsConfig
} from '../../src/types/index.js';
import {
  INITIAL_SEASONAL_TEMPLATES,
  ensureSeasonalTemplateBackgroundSvgs,
  buildInitialPromoBanners,
  ensurePromoBannerSvgAssets,
  INITIAL_DISCOUNT_CODES,
  INITIAL_POLICIES,
  INITIAL_SHIPMENTS,
  INITIAL_ADMIN_NOTIFICATIONS,
  INITIAL_CASH_MOVEMENTS,
  INITIAL_ORDER_AUTHORIZATIONS,
  INITIAL_CRM_CUSTOMERS,
  INITIAL_MARKETING_CAMPAIGNS,
  INITIAL_PAYMENT_METHODS,
  INITIAL_REMOTE_SUPPORT_TOOLS,
  INITIAL_WHATSAPP_QR_CONFIG,
  generateFreeGoogleAppsScriptCode
} from './enterpriseModulesSeed.js';
import { driveMediaVault } from './driveMediaVault.js';

export type {
  TechnicalServiceRequest,
  TechnicalServiceTicket,
  TechnicalAppointment,
  SupportAppointment,
  WarrantyRecord,
  WarrantyCaseStatus,
  WarrantyCategoryType,
  InventoryMovement,
  BackupRecordMeta,
  BackupRecord,
  BackupType,
  BackupModuleScope,
  BackupModuleType,
  TrashItem,
  SyncOperationRecord,
  PendingSyncOperation,
  ConnectionErrorLog,
  WhatsAppConversation,
  WhatsAppConversationStatus,
  WhatsAppMessage,
  WhatsAppConfig,
  TechnicalServiceType,
  TechnicalServiceModality,
  TechnicalServicePriority,
  ServiceModality,
  TechnicalServiceStatus,
  ClientEntityType,
  SparePartItem,
  SparePartUsed,
  ProductCondition,
  ProductShippingType,
  RemanufacturedDetails,
  SeasonalTemplate,
  PromoBannerItem,
  DiscountCode,
  PolicyDocument,
  PolicyCategoryKey,
  ShipmentRecord,
  ShipmentStatus,
  OrderAuthorizationRequest,
  AdminNotification,
  AdminNotificationEventType,
  CashMovement,
  PublicTechnicianInfo,
  CustomerPushEventType,
  CustomerPushEvent,
  CustomerPushSubscription,
  DriveOfficialFolderPath,
  DriveMediaAsset,
  DrivePersistenceTestStep,
  CrmClassification,
  CrmFollowUpEntry,
  CrmCustomerRecord,
  MarketingCampaign,
  PaymentMethodItem,
  RemoteSupportToolItem,
  WhatsAppQrConfig
};
export { generateFreeGoogleAppsScriptCode, driveMediaVault };

export const TECHNICAL_SERVICE_CATALOG: string[] = [
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
];

export type UserRole =
  | 'Administrador'
  | 'Supervisor'
  | 'Técnico'
  | 'Caja'
  | 'Editor'
  | 'Consulta'
  | 'Cliente';

export const ALL_VALID_ROLES: UserRole[] = [
  'Administrador',
  'Supervisor',
  'Técnico',
  'Caja',
  'Editor',
  'Consulta',
  'Cliente'
];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  documentId?: string;
  city?: string;
  status: 'Activo' | 'Inactivo';
  isActive: boolean;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type PromotionScope = 'product' | 'category';
export type PromotionDiscountType = 'percentage' | 'fixed_price' | 'porcentaje';
export type PromotionManualStatus = 'active' | 'paused' | 'cancelled';
export type PromotionComputedStatus = 'Programada' | 'Activa' | 'Pausada' | 'Finalizada' | 'Cancelada';

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  scope: PromotionScope;
  targetId?: string;
  targetName?: string;
  targetProductId?: string;
  targetCategory?: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  startAt?: string;
  endAt?: string;
  startDate: string; // ISO UTC timestamp
  endDate: string; // ISO UTC timestamp
  timezone: string; // 'America/Bogota'
  manualStatus: PromotionManualStatus;
  computedStatus?: PromotionComputedStatus;
  lastNotifiedState?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivePromotionInfo {
  promotionId: string;
  name: string;
  description?: string;
  badgeText?: string;
  scope: PromotionScope;
  discountType: PromotionDiscountType;
  discountValue: number;
  normalPriceCOP: number;
  promotionalPriceCOP: number;
  savingsCOP: number;
  savingsPercentage: number;
  discountPercentage: number;
  startAt: string;
  endAt: string;
  startDate: string;
  endDate: string;
  timezone: string;
}

export interface Product {
  id: string;
  name: string;
  reference: string;
  brand?: string;
  model?: string;
  condition?: ProductCondition;
  shortDescription: string;
  category: string;
  priceCOP: number; // Always the original normal price
  costCOP?: number;
  stock?: number;
  minStock?: number;
  serialNumbers?: string[];
  images: string[];
  driveFileIds?: string[];
  warrantyPolicyId?: string;
  shippingPolicyId?: string;
  shippingType?: ProductShippingType;
  remanufacturedDetails?: RemanufacturedDetails;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  activePromotion?: ActivePromotionInfo | null;
}

export interface SocialLinks {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  whatsapp: string;
  website: string;
}

export interface CompanyProfile {
  name: string;
  slogan: string;
  logoUrl: string;
  alternativeLogos?: string[];
  nit?: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  website: string;
  social: SocialLinks;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  typography?: string;
  headerStyle?: string;
  buttonStyle?: string;
  footerText?: string;
  institutionalImages?: string[];
  appsScriptWebAppUrl?: string;
  activeWebTemplateId?: string;
  activePdfTemplateId?: string;
  commercialTerms: string;
  taxConfig?: import('../../src/types/index.js').TaxConfiguration;
}

export type OrderStatus =
  | 'Pendiente'
  | 'Confirmado'
  | 'Pagado'
  | 'En preparación'
  | 'Enviado'
  | 'Entregado'
  | 'Cancelado';

export interface OrderItem {
  productId: string;
  reference: string;
  name: string;
  quantity: number;
  unitPriceCOP: number;
  subtotalCOP: number;
  condition?: ProductCondition;
  warrantyPolicyId?: string;
}

export interface Order {
  id: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  date: string;
  items: OrderItem[];
  subtotalCOP?: number;
  discountCode?: string;
  discountAmountCOP?: number;
  shippingCostCOP?: number;
  totalCOP: number;
  status: OrderStatus;
  notes?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingDepartment?: string;
  acceptedPolicyVersion?: string;
  acceptedPolicyAt?: string;
  shipmentId?: string;
  trackingNumber?: string;
  carrier?: string;
  isLogicallyDeleted?: boolean;
  authorizedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SavedCatalogRecord {
  id: string;
  name: string;
  productCount: number;
  date: string;
  status: string;
  pdfUrl?: string;
  createdBy?: string;
}

export interface AuditLogRecord {
  id: string;
  date: string;
  user: string;
  action: string;
  detail: string;
  result: 'EXITOSO' | 'ERROR';
}

export interface AppReleaseConfig {
  appName: string;
  shortName: string;
  packageId: string;
  versionName: string;
  versionCode: number;
  apkAvailable: boolean;
  apkDownloadUrl: string | null;
  apkFileName: string | null;
  apkFileSizeMB: number | null;
  apkUpdatedAt: string | null;
  releaseNotes: string;
  showUpdateBanner: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface DatabaseSchema {
  products: Product[];
  promotions: Promotion[];
  company: CompanyProfile;
  users: User[];
  orders: Order[];
  catalogs: SavedCatalogRecord[];
  auditLogs: AuditLogRecord[];
  appConfig?: AppReleaseConfig;
  technicalServices?: TechnicalServiceTicket[];
  appointments?: SupportAppointment[];
  warranties?: WarrantyRecord[];
  inventoryMovements?: InventoryMovement[];
  whatsappConversations?: WhatsAppConversation[];
  whatsappConfig?: WhatsAppConfig;
  backups?: BackupRecord[];
  trash?: TrashItem[];
  syncQueue?: PendingSyncOperation[];
  connectionLogs?: ConnectionErrorLog[];
  seasonalTemplates?: SeasonalTemplate[];
  promoBanners?: PromoBannerItem[];
  discountCodes?: DiscountCode[];
  policies?: PolicyDocument[];
  shipments?: ShipmentRecord[];
  orderAuthorizations?: OrderAuthorizationRequest[];
  adminNotifications?: AdminNotification[];
  cashMovements?: CashMovement[];
  customerPushEvents?: CustomerPushEvent[];
  customerPushSubscriptions?: CustomerPushSubscription[];
  crmCustomers?: CrmCustomerRecord[];
  crmOpportunities?: import('../../src/types/index.js').CrmOpportunity[];
  marketingCampaigns?: MarketingCampaign[];
  paymentMethods?: PaymentMethodItem[];
  remoteSupportTools?: RemoteSupportToolItem[];
  whatsappQrConfig?: WhatsAppQrConfig;
  landingPageCms?: import('../../src/types/index.js').LandingPageCmsConfig;
  driveMediaAssets?: DriveMediaAsset[];
  sessions: { token: string; userId: string; expiresAt: number; googleAccessToken?: string }[];
  resetTokens: { email: string; token: string; expiresAt: number }[];
}

/**
 * Foundational Authorized Administrators
 */
export const AUTHORIZED_ADMIN_EMAILS = [
  'jeffervr@gmail.com',
  'soporteipstecnologica@gmail.com',
  'soportejeffervr@gmail.com',
  'marinaguacheta123@gmail.com'
].map(e => e.toLowerCase().trim());

export function isFoundationalAdmin(email: string): boolean {
  if (!email) return false;
  return AUTHORIZED_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

const DATA_DIR = path.resolve(process.cwd(), 'server_data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Generates official high-resolution SVG assets in /public/uploads so that
 * every seeded product and the company logo have real, local, CORS-safe images.
 */
function ensureLocalGraphicAssets(): string {
  const logoFilename = 'ips_official_logo.svg';
  const logoPath = path.join(UPLOAD_DIR, logoFilename);
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="160" viewBox="0 0 480 160">
  <defs>
    <linearGradient id="ipsRed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EF4444" />
      <stop offset="100%" stop-color="#B91C1C" />
    </linearGradient>
    <linearGradient id="ipsDark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
  </defs>
  <rect width="480" height="160" rx="20" fill="url(#ipsDark)" />
  <rect x="16" y="16" width="128" height="128" rx="22" fill="url(#ipsRed)" />
  <path d="M44 52 H116 M44 108 H116" stroke="#FCA5A5" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
  <text x="80" y="96" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="48" fill="#FFFFFF" text-anchor="middle">IPS</text>
  <text x="166" y="76" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" letter-spacing="1">IPS TECNOLÓGICA</text>
  <text x="166" y="106" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="15" fill="#EF4444" letter-spacing="2">HARDWARE &amp; SOLUCIONES TI</text>
  <text x="166" y="130" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="13" fill="#94A3B8">BOGOTÁ D.C. · COLOMBIA</text>
</svg>`;
  try {
    fs.writeFileSync(logoPath, logoSvg, 'utf-8');
  } catch (e) {
    console.warn('Could not write default logo SVG', e);
  }
  return `/uploads/${logoFilename}`;
}

export function generateProductSvgAsset(reference: string, name: string, category: string, brand = 'IPS PRO'): string {
  const safeRef = reference.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const filename = `prod_${safeRef}.svg`;
  const filePath = path.join(UPLOAD_DIR, filename);

  // Choose visual illustration motif by category
  const catLower = category.toLowerCase();
  let deviceArtwork = '';
  if (catLower.includes('portátil') || catLower.includes('cómputo') || catLower.includes('laptop')) {
    deviceArtwork = `
      <rect x="190" y="95" width="220" height="140" rx="10" fill="#0F172A" stroke="#475569" stroke-width="5"/>
      <rect x="202" y="107" width="196" height="116" rx="4" fill="#1E293B"/>
      <circle cx="300" cy="165" r="32" fill="#DC2626" opacity="0.85"/>
      <path d="M285 165 L296 176 L318 154" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M155 235 H445 L425 252 H175 Z" fill="#64748B"/>
      <rect x="275" y="236" width="50" height="5" rx="2" fill="#94A3B8"/>
    `;
  } else if (catLower.includes('servidor') || catLower.includes('redes') || catLower.includes('switch') || catLower.includes('router')) {
    deviceArtwork = `
      <rect x="160" y="105" width="280" height="55" rx="6" fill="#0F172A" stroke="#475569" stroke-width="4"/>
      <circle cx="185" cy="132" r="6" fill="#22C55E"/>
      <circle cx="205" cy="132" r="6" fill="#DC2626"/>
      <rect x="230" y="120" width="185" height="24" rx="3" fill="#1E293B"/>
      <rect x="160" y="175" width="280" height="55" rx="6" fill="#0F172A" stroke="#475569" stroke-width="4"/>
      <circle cx="185" cy="202" r="6" fill="#22C55E"/>
      <circle cx="205" cy="202" r="6" fill="#3B82F6"/>
      <rect x="230" y="190" width="185" height="24" rx="3" fill="#1E293B"/>
    `;
  } else if (catLower.includes('monitor') || catLower.includes('pantalla')) {
    deviceArtwork = `
      <rect x="170" y="85" width="260" height="145" rx="8" fill="#0F172A" stroke="#DC2626" stroke-width="4"/>
      <rect x="182" y="97" width="236" height="121" rx="4" fill="#1E293B"/>
      <text x="300" y="165" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="#F8FAFC" text-anchor="middle">4K UHD IPS</text>
      <rect x="285" y="230" width="30" height="24" fill="#475569"/>
      <rect x="240" y="250" width="120" height="8" rx="4" fill="#334155"/>
    `;
  } else if (catLower.includes('móvil') || catLower.includes('tablet')) {
    deviceArtwork = `
      <rect x="235" y="75" width="130" height="190" rx="16" fill="#0F172A" stroke="#64748B" stroke-width="5"/>
      <rect x="245" y="90" width="110" height="160" rx="8" fill="#1E293B"/>
      <circle cx="300" cy="170" r="26" fill="#DC2626"/>
      <text x="300" y="176" font-family="Arial, sans-serif" font-weight="800" font-size="16" fill="#FFFFFF" text-anchor="middle">5G</text>
    `;
  } else {
    deviceArtwork = `
      <rect x="195" y="90" width="210" height="155" rx="18" fill="#0F172A" stroke="#DC2626" stroke-width="4"/>
      <circle cx="300" cy="168" r="42" fill="#1E293B" stroke="#DC2626" stroke-width="4"/>
      <text x="300" y="175" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="#FFFFFF" text-anchor="middle">IPS</text>
    `;
  }

  const cleanTitle = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 42);
  const cleanCat = category.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').toUpperCase();
  const cleanBrand = (brand || 'IPS TECH').replace(/&/g, '&amp;').toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F8FAFC" />
      <stop offset="100%" stop-color="#E2E8F0" />
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#bgGrad)" />
  <rect x="0" y="0" width="600" height="12" fill="#DC2626" />
  <rect x="24" y="28" width="140" height="32" rx="6" fill="#0F172A" />
  <text x="94" y="49" font-family="monospace" font-weight="700" font-size="15" fill="#FFFFFF" text-anchor="middle">${reference}</text>
  <rect x="440" y="28" width="136" height="32" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5" />
  <text x="508" y="49" font-family="Arial, sans-serif" font-weight="800" font-size="13" fill="#DC2626" text-anchor="middle">${cleanBrand}</text>
  ${deviceArtwork}
  <rect x="24" y="290" width="552" height="86" rx="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2" />
  <text x="300" y="322" font-family="Arial, sans-serif" font-weight="800" font-size="15" fill="#DC2626" text-anchor="middle">${cleanCat}</text>
  <text x="300" y="352" font-family="Arial, sans-serif" font-weight="800" font-size="18" fill="#0F172A" text-anchor="middle">${cleanTitle}</text>
</svg>`;

  try {
    fs.writeFileSync(filePath, svg, 'utf-8');
  } catch (e) {
    console.warn('Error writing product SVG asset', e);
  }
  return `/uploads/${filename}`;
}

// Password hashing helper (scrypt)
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const finalSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, finalSalt, 64).toString('hex');
  return { hash, salt: finalSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const result = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(result, 'hex'));
  } catch {
    return false;
  }
}

const defaultLogoUrl = ensureLocalGraphicAssets();

const DEFAULT_COMPANY: CompanyProfile = {
  name: 'IPS TECNOLÓGICA',
  slogan: 'Innovación, Equipamiento y Soluciones Tecnológicas de Alta Gama',
  logoUrl: defaultLogoUrl,
  nit: '901.458.920-1',
  description:
    'Empresa líder en Colombia dedicada a la distribución, comercialización y asesoría integral de tecnología de vanguardia, hardware profesional, cómputo corporativo y soluciones de conectividad para empresas y profesionales.',
  phone: '+57 (601) 745-8920',
  whatsapp: '+57 310 894 7231',
  email: 'contacto@ipstecnologica.com.co',
  address: 'Carrera 15 # 85-30, Edificio Tecnológico, Oficina 402',
  city: 'Bogotá D.C., Colombia',
  website: 'https://ipstecnologica.com.co',
  social: {
    facebook: 'https://facebook.com/ipstecnologica',
    instagram: 'https://instagram.com/ipstecnologica',
    tiktok: 'https://tiktok.com/@ipstecnologica',
    youtube: 'https://youtube.com/@ipstecnologica',
    whatsapp: 'https://wa.me/573108947231',
    website: 'https://ipstecnologica.com.co'
  },
  colors: {
    primary: '#DC2626',
    secondary: '#111827',
    accent: '#475569',
    background: '#FFFFFF'
  },
  commercialTerms:
    'Precios expresados en Pesos Colombianos (COP). Persona natural no responsable de IVA. Garantía legal de 12 a 36 meses según línea de producto. Precios y disponibilidad sujetos a cambio sin previo aviso. Envíos asegurados a todo el territorio nacional.',
  taxConfig: {
    regime: 'Persona natural - No responsable de IVA',
    ivaEnabled: false,
    ivaRatePercent: 0,
    showIvaLabelInCatalog: false,
    priceLabelText: 'Precio Oficial COP',
    invoiceFooterText: 'Persona natural no responsable de IVA (Art. 437 Estatuto Tributario - DIAN).',
    otherTaxes: [
      {
        id: 'tax_retencion',
        name: 'Retención en la fuente (operaciones especiales)',
        ratePercent: 0,
        active: false,
        description: 'Concepto tributario independiente configurable por operación particular.'
      },
      {
        id: 'tax_ica',
        name: 'ReteICA municipal (operaciones especiales)',
        ratePercent: 0,
        active: false,
        description: 'Concepto tributario municipal independiente.'
      }
    ]
  }
};

const DEFAULT_USERS_DATA: Array<{ name: string; email: string; phone?: string; pass: string; role: UserRole }> = [
  {
    name: 'Jefferson Villada Rios',
    email: 'jeffervr@gmail.com',
    phone: '+57 310 894 7231',
    pass: 'Admin2026*',
    role: 'Administrador'
  },
  {
    name: 'Soporte IPS Tecnológica',
    email: 'soporteipstecnologica@gmail.com',
    phone: '+57 (601) 745-8920',
    pass: 'Admin2026*',
    role: 'Administrador'
  },
  {
    name: 'Soporte Técnico JefferVR',
    email: 'soportejeffervr@gmail.com',
    phone: '+57 310 894 7232',
    pass: 'Admin2026*',
    role: 'Administrador'
  },
  {
    name: 'Marina Guacheta',
    email: 'marinaguacheta123@gmail.com',
    phone: '+57 315 442 8910',
    pass: 'Admin2026*',
    role: 'Administrador'
  },
  {
    name: 'Ing. Andrés Camilo Rojas (Técnico Especialista)',
    email: 'tecnico@ipstecnologica.com.co',
    phone: '+57 311 550 8821',
    pass: 'Tecnico2026*',
    role: 'Técnico'
  },
  {
    name: 'Ing. Diego Fernando Gómez (Técnico Redes y Servidores)',
    email: 'redes@ipstecnologica.com.co',
    phone: '+57 312 640 9912',
    pass: 'Tecnico2026*',
    role: 'Técnico'
  },
  {
    name: 'Laura Sofía Vargas (Supervisor Operativo)',
    email: 'supervisor@ipstecnologica.com.co',
    phone: '+57 314 778 1234',
    pass: 'Supervisor2026*',
    role: 'Supervisor'
  },
  {
    name: 'Diana Marcela Ortiz (Caja y Facturación)',
    email: 'caja@ipstecnologica.com.co',
    phone: '+57 316 889 4567',
    pass: 'Caja2026*',
    role: 'Caja'
  },
  {
    name: 'Carlos Mendoza (Cliente Ejemplo)',
    email: 'cliente@ejemplo.com',
    phone: '+57 300 123 4567',
    pass: 'Cliente2026*',
    role: 'Cliente'
  },
  {
    name: 'Usuario DEMO IPS (Solo Consulta)',
    email: 'demo@ipstecnologica.com',
    phone: '+57 300 000 0000',
    pass: 'Demo2026*',
    role: 'Consulta'
  }
];

const INITIAL_PRODUCTS: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'Portátil Workstation Pro 16" OLED Core i9',
    reference: 'IPS-NB-001',
    brand: 'ASUS ProArt / IPS',
    shortDescription: 'Intel Core i9-14900HX, 32GB DDR5, SSD 1TB NVMe, RTX 4070 8GB, Pantalla 16" 3.2K 120Hz OLED.',
    category: 'Portátiles y Cómputo',
    priceCOP: 9450000,
    costCOP: 7600000,
    stock: 14,
    images: [],
    isActive: true
  },
  {
    name: 'Ultrabook Titan Slim 14" Core Ultra 7',
    reference: 'IPS-NB-002',
    brand: 'Lenovo ThinkPad',
    shortDescription: 'Intel Core Ultra 7 155H, 16GB LPDDR5X, SSD 512GB NVMe Gen4, Chasis magnesio 1.1kg, Batería 18h.',
    category: 'Portátiles y Cómputo',
    priceCOP: 5290000,
    costCOP: 4150000,
    stock: 22,
    images: [],
    isActive: true
  },
  {
    name: 'Servidor Rack Enterprise 1U Dual Xeon',
    reference: 'IPS-SRV-001',
    brand: 'Dell PowerEdge',
    shortDescription: 'Dual Intel Xeon Silver 4410Y, 64GB ECC DDR5, 4x SSD Enterprise 960GB SAS, Fuente Redundante 800W Platinum.',
    category: 'Servidores y Redes',
    priceCOP: 22800000,
    costCOP: 18400000,
    stock: 6,
    images: [],
    isActive: true
  },
  {
    name: 'Switch Gestionable 48 Puertos PoE+ 10G',
    reference: 'IPS-NET-001',
    brand: 'Cisco Catalyst',
    shortDescription: '48 puertos Gigabit PoE+ (370W), 4 puertos SFP+ 10G, Capa L3 Lite, Montaje en rack 19", Enrutamiento estático.',
    category: 'Servidores y Redes',
    priceCOP: 3850000,
    costCOP: 2950000,
    stock: 18,
    images: [],
    isActive: true
  },
  {
    name: 'Router Corporativo SD-WAN Dual WAN Multi-Gigabit',
    reference: 'IPS-NET-002',
    brand: 'Fortinet / Ubiquiti',
    shortDescription: 'Firewall con IPS/IDS integrado, balanceo de carga de 2.5 Gbps, VPN SSL/IPsec para hasta 200 túneles simultáneos.',
    category: 'Servidores y Redes',
    priceCOP: 2490000,
    costCOP: 1890000,
    stock: 25,
    images: [],
    isActive: true
  },
  {
    name: 'Monitor Curvo Profesional 34" WQHD 144Hz',
    reference: 'IPS-MON-001',
    brand: 'LG UltraWide Pro',
    shortDescription: 'Panel IPS UltraWide 3440x1440, 99% sRGB, USB-C con Power Delivery 90W, Hub KVM integrado y altavoces estéreo.',
    category: 'Monitores y Pantallas',
    priceCOP: 3190000,
    costCOP: 2450000,
    stock: 15,
    images: [],
    isActive: true
  },
  {
    name: 'Monitor Gráfico Calibrado 27" 4K UHD HDR',
    reference: 'IPS-MON-002',
    brand: 'BenQ PD DesignVue',
    shortDescription: 'Resolución 3840x2160, 100% Rec.709 y 98% DCI-P3, Delta E < 2 certificado de fábrica, Soporte pivotante ergonómico.',
    category: 'Monitores y Pantallas',
    priceCOP: 2650000,
    costCOP: 2050000,
    stock: 19,
    images: [],
    isActive: true
  },
  {
    name: 'Smartphone Flagship Titanium 512GB 5G',
    reference: 'IPS-MOB-001',
    brand: 'Samsung Enterprise',
    shortDescription: 'Procesador Octa-Core 4nm, Cámara triple 200MP con OIS, Pantalla AMOLED 6.8" 120Hz LTPO, Carga rápida 100W.',
    category: 'Móviles y Tablets',
    priceCOP: 5490000,
    costCOP: 4390000,
    stock: 12,
    images: [],
    isActive: true
  },
  {
    name: 'Tablet Gráfica Corporativa 12.4" con Stylus Pro',
    reference: 'IPS-MOB-002',
    brand: 'Wacom / Samsung',
    shortDescription: 'Pantalla 12.4" 2.8K 120Hz, 12GB RAM, 256GB, Lápiz con 4096 niveles de presión y cero latencia.',
    category: 'Móviles y Tablets',
    priceCOP: 3790000,
    costCOP: 2980000,
    stock: 16,
    images: [],
    isActive: true
  },
  {
    name: 'Audífonos Inalámbricos ANC Master Studio',
    reference: 'IPS-AUD-001',
    brand: 'Sony Pro Audio',
    shortDescription: 'Cancelación Activa de Ruido Inteligente (-42dB), Drivers de berilio 40mm, Códecs LDAC y aptX HD, Autonomía de 45 horas.',
    category: 'Audio y Streaming',
    priceCOP: 1490000,
    costCOP: 1080000,
    stock: 30,
    images: [],
    isActive: true
  },
  {
    name: 'Micrófono de Condensador USB-C / XLR Broadcast',
    reference: 'IPS-AUD-002',
    brand: 'Shure / Rode',
    shortDescription: 'Cápsula cardioide 25mm, Grabación 24-bit/96kHz, Filtro pop metálico integrado, Soporte antivibración y monitoreo directo.',
    category: 'Audio y Streaming',
    priceCOP: 790000,
    costCOP: 560000,
    stock: 28,
    images: [],
    isActive: true
  },
  {
    name: 'Kit de Cámaras de Seguridad IP 4K PoE con NVR 2TB',
    reference: 'IPS-SEC-001',
    brand: 'Hikvision AcuSense',
    model: 'DS-2CD2183G2-IU',
    condition: 'Nuevo',
    shortDescription: '4 cámaras domo metálicas 8MP para exteriores IP67, Visión nocturna en color 30m, Detección de personas y vehículos con IA.',
    category: 'Seguridad y Vigilancia',
    priceCOP: 2950000,
    costCOP: 2250000,
    stock: 10,
    minStock: 3,
    warrantyPolicyId: 'pol_garantia_nuevo',
    shippingPolicyId: 'pol_envio_nacional',
    shippingType: 'Gratis',
    images: [],
    isActive: true
  },
  {
    name: 'Kit Repuesto Memoria RAM 32GB DDR5 + Unidad SSD NVMe 1TB PCIe 4.0',
    reference: 'IPS-REP-001',
    brand: 'Kingston Fury / Samsung Pro',
    model: 'KF556C40-32 + MZ-V9P1T0B',
    condition: 'Repuesto',
    shortDescription: 'Combo de actualización certificada para portátiles y estaciones de trabajo: módulo DDR5 5600MT/s + SSD M.2 NVMe 7450MB/s.',
    category: 'Componentes y Repuestos',
    priceCOP: 980000,
    costCOP: 740000,
    stock: 25,
    minStock: 5,
    serialNumbers: ['SN-RAM-884120', 'SN-SSD-992104'],
    warrantyPolicyId: 'pol_garantia_repuesto',
    shippingPolicyId: 'pol_envio_nacional',
    shippingType: 'Pagado por el cliente',
    images: [],
    isActive: true
  },
  {
    name: 'Portátil Corporativo Lenovo ThinkPad T14 Gen 3 (Remanufacturado Grado A+)',
    reference: 'IPS-REM-001',
    brand: 'Lenovo Certified Refurbished',
    model: 'ThinkPad T14 G3 Core i7',
    condition: 'Remanufacturado',
    shortDescription: 'EQUIPO REMANUFACTURADO CERTIFICADO GRADO A+: Intel Core i7-1265U, 16GB RAM, SSD 512GB Nuevo, Batería >90% verificada en laboratorio IPS TECNOLÓGICA.',
    category: 'Equipos Remanufacturados',
    priceCOP: 2690000,
    costCOP: 1950000,
    stock: 8,
    minStock: 2,
    serialNumbers: ['SN-REM-TP14-0091', 'SN-REM-TP14-0092'],
    warrantyPolicyId: 'pol_garantia_remanufacturado',
    shippingPolicyId: 'pol_envio_nacional',
    shippingType: 'Incluido en el precio',
    remanufacturedDetails: {
      aestheticGrade: 'Grado A+ (Excelente estado estético, sin rayones en pantalla)',
      inspectedComponents: 'Board principal, pantalla IPS FHD, teclado retroiluminado, puertos Thunderbolt 4 y sistema Wi-Fi 6E.',
      replacedComponents: 'Unidad SSD NVMe M.2 de 512GB 100% nueva y compuesto térmico industrial Arctic MX-6.',
      testsPerformed: 'Prueba de estrés de 24 horas (CPU/GPU/RAM), test de ciclos de batería y calibración de color.',
      durationMonths: 6,
      coverage: 'Garantía directa de 6 meses sobre tarjeta madre, procesador, memoria RAM y unidad SSD.',
      exclusions: 'Detalles cosméticos mínimos de uso corporativo previo y daños por golpes o líquidos.'
    },
    images: [],
    isActive: true
  }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'PED-2026-001',
    customerEmail: 'cliente@ejemplo.com',
    customerName: 'Carlos Mendoza',
    customerPhone: '+57 300 123 4567',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    totalCOP: 9450000,
    status: 'Entregado',
    shippingAddress: 'Calle 100 # 19-61, Oficina 502, Bogotá D.C.',
    notes: 'Despacho corporativo con entrega en recepción.',
    items: [
      {
        productId: 'prod_1',
        reference: 'IPS-NB-001',
        name: 'Portátil Workstation Pro 16" OLED Core i9',
        quantity: 1,
        unitPriceCOP: 9450000,
        subtotalCOP: 9450000
      }
    ]
  },
  {
    id: 'PED-2026-002',
    customerEmail: 'cliente@ejemplo.com',
    customerName: 'Carlos Mendoza',
    customerPhone: '+57 300 123 4567',
    date: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    totalCOP: 4680000,
    status: 'En preparación',
    shippingAddress: 'Calle 100 # 19-61, Oficina 502, Bogotá D.C.',
    notes: 'Generar cuenta de cobro / soporte a nombre de la empresa.',
    items: [
      {
        productId: 'prod_6',
        reference: 'IPS-MON-001',
        name: 'Monitor Curvo Profesional 34" WQHD 144Hz',
        quantity: 1,
        unitPriceCOP: 3190000,
        subtotalCOP: 3190000
      },
      {
        productId: 'prod_10',
        reference: 'IPS-AUD-001',
        name: 'Audífonos Inalámbricos ANC Master Studio',
        quantity: 1,
        unitPriceCOP: 1490000,
        subtotalCOP: 1490000
      }
    ]
  }
];

export function isAuthorizedAdmin(email: string): boolean {
  if (!email) return false;
  if (isFoundationalAdmin(email)) return true;
  try {
    return db ? db.isUserAdminByEmail(email) : false;
  } catch {
    return false;
  }
}

const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  businessPhone: '+57 310 894 7231',
  chatbotActive: true,
  botActiveGlobal: true,
  geminiEnabled: true,
  geminiModel: 'gemini-3-flash-preview',
  welcomeMessage:
    '¡Hola! 👋 Bienvenido a *IPS TECNOLÓGICA*. Soy tu asistente inteligente con tecnología Gemini. Puedo ayudarte a consultar nuestro catálogo, precios actualizados, promociones vigentes, garantías o agendar soporte técnico especializado.',
  systemPrompt:
    'Eres el asistente virtual oficial de IPS TECNOLÓGICA en Colombia. Responde siempre con amabilidad, precisión técnica y basándote exclusivamente en los productos, precios en COP, promociones activas, servicios técnicos y políticas reales de la base de datos. Nunca inventes precios ni disponibilidad.',
  customSystemPrompt:
    'Eres el asistente virtual oficial de IPS TECNOLÓGICA en Colombia. Responde siempre con amabilidad, precisión técnica y basándote exclusivamente en los productos, precios en COP, promociones activas, servicios técnicos y políticas reales de la base de datos. Nunca inventes precios ni disponibilidad.',
  autoReplySchedules: 'Lunes a Viernes de 8:00 a.m. a 6:00 p.m. y Sábados de 8:00 a.m. a 2:00 p.m. (Hora Colombia).',
  businessHoursText: 'Lunes a Viernes de 8:00 a.m. a 6:00 p.m. y Sábados de 8:00 a.m. a 2:00 p.m. (Hora Colombia).',
  paymentMethodsText:
    'Transferencia bancaria Bancolombia / Davivienda, PSE, Nequi, Daviplata, tarjetas de crédito/débito y pago contra entrega en Bogotá D.C.',
  shippingPolicyText:
    'Envíos asegurados a todo el territorio nacional en Colombia (24 a 72 horas hábiles) a través de transportadoras certificadas. Entregas el mismo día en Bogotá D.C.',
  warrantyPolicyText:
    'Todos nuestros equipos cuentan con garantía legal y directa de 12 a 36 meses por defectos de fábrica, respaldada por el laboratorio técnico de IPS TECNOLÓGICA.',
  webhookVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'ips_tecnologica_webhook_2026',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  metaPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  metaBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  metaWebhookVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'ips_tecnologica_webhook_2026',
  metaCloudConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
  updatedAt: new Date().toISOString(),
  updatedBy: 'jeffervr@gmail.com'
};

const INITIAL_TECHNICAL_SERVICES: TechnicalServiceRequest[] = [
  {
    id: 'srv_1',
    ticketNumber: 'SRV-2026-0001',
    clientName: 'Carlos Mendoza',
    clientPhone: '+57 300 123 4567',
    clientEmail: 'cliente@ejemplo.com',
    companyName: 'Inversiones Tecnológicas SAS',
    serviceType: 'Mantenimiento de computadores',
    equipmentType: 'Portátil Workstation',
    equipmentBrand: 'ASUS',
    equipmentModel: 'ProArt Studiobook 16 OLED',
    serialNumber: 'SN-ASUS-994821',
    problemDescription:
      'Mantenimiento preventivo anual, limpieza de sistema térmico, cambio de pasta térmica de alto rendimiento y verificación de SSD NVMe.',
    photos: [],
    modality: 'En sede',
    address: 'Carrera 15 # 85-30, Oficina 402, Bogotá D.C.',
    city: 'Bogotá D.C.',
    appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    appointmentTime: '10:00',
    priority: 'Alta',
    status: 'Cita confirmada',
    assignedTechnicianId: 'usr_3',
    assignedTechnicianName: 'Ing. Andrés Felipe Rojas (Técnico Especialista)',
    assignedTechnicianEmail: 'tecnico@ipstecnologica.com.co',
    diagnosis: 'Equipo operativo con acumulación moderada de polvo en disipadores duales.',
    technicalObservations: 'Recepción en laboratorio e inspección inicial de hardware.',
    activitiesPerformed: 'Limpieza ultrasónica de ventiladores y aplicación de compuesto térmico industrial.',
    spareParts: [
      {
        id: 'sp_1',
        name: 'Pasta Térmica Arctic MX-6 Industrial',
        reference: 'INS-TERM-01',
        quantity: 1,
        unitPriceCOP: 45000,
        unitCostCOP: 45000,
        subtotalCOP: 45000
      }
    ],
    sparePartsUsed: [
      {
        id: 'sp_1',
        name: 'Pasta Térmica Arctic MX-6 Industrial',
        reference: 'INS-TERM-01',
        quantity: 1,
        unitPriceCOP: 45000,
        unitCostCOP: 45000,
        subtotalCOP: 45000
      }
    ],
    laborCostCOP: 120000,
    partsCostCOP: 45000,
    totalCostCOP: 165000,
    beforePhotos: [],
    afterPhotos: [],
    serviceWarrantyText: 'Garantía de 90 días sobre el servicio técnico y mantenimiento realizado.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'jeffervr@gmail.com'
  }
];

const INITIAL_APPOINTMENTS: TechnicalAppointment[] = [
  {
    id: 'CIT-2026-0001',
    serviceId: 'srv_1',
    ticketNumber: 'SRV-2026-0001',
    clientName: 'Carlos Mendoza',
    clientPhone: '+57 300 123 4567',
    clientEmail: 'cliente@ejemplo.com',
    serviceType: 'Mantenimiento de computadores',
    modality: 'En sede',
    address: 'Carrera 15 # 85-30, Oficina 402, Bogotá D.C.',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '10:00',
    durationMinutes: 60,
    technicianId: 'usr_3',
    technicianName: 'Ing. Andrés Felipe Rojas (Técnico Especialista)',
    technicianEmail: 'tecnico@ipstecnologica.com.co',
    status: 'Confirmada',
    notes: 'Mantenimiento preventivo anual y optimización térmica.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_WARRANTIES: WarrantyRecord[] = [
  {
    id: 'GAR-2026-001',
    warrantyCode: 'GAR-2026-001',
    orderId: 'PED-2026-001',
    productId: 'prod_1',
    productReference: 'IPS-NB-001',
    productName: 'Portátil Workstation Pro 16" OLED Core i9',
    serialNumber: 'SN-IPS-PROART-994821',
    clientEmail: 'cliente@ejemplo.com',
    clientName: 'Carlos Mendoza',
    clientPhone: '+57 300 123 4567',
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 362).toISOString(),
    monthsCoverage: 12,
    status: 'Vigente',
    coverageTerms: 'Garantía corporativa directa con laboratorio IPS TECNOLÓGICA por 12 meses.',
    notes: 'Garantía corporativa directa con laboratorio IPS TECNOLÓGICA por 12 meses.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_WHATSAPP_CONVERSATIONS: WhatsAppConversation[] = [
  {
    id: 'wa_conv_1',
    clientPhone: '+57 300 123 4567',
    clientName: 'Carlos Mendoza',
    clientEmail: 'cliente@ejemplo.com',
    status: 'Bot Activo',
    botEnabled: true,
    lastMessageAt: new Date().toISOString(),
    lastMessageText: '¡Hola Carlos! 👋 Claro que sí. En IPS TECNOLÓGICA contamos con equipos disponibles.',
    unreadCount: 0,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    messages: [
      {
        id: 'msg_1',
        sender: 'client',
        senderName: 'Carlos Mendoza',
        text: 'Hola, ¿tienen computadores portátiles disponibles y servicio de mantenimiento?',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        intent: 'consulta_catalogo_y_soporte'
      },
      {
        id: 'msg_2',
        sender: 'gemini',
        senderName: 'Chatbot Gemini · IPS TECNOLÓGICA',
        text: '¡Hola Carlos! 👋 Claro que sí. En *IPS TECNOLÓGICA* contamos con el *Portátil Workstation Pro 16" OLED Core i9* (Ref: IPS-NB-001) y el *Ultrabook Empresarial Carbon X1* (Ref: IPS-NB-002) con disponibilidad inmediata. También ofrecemos servicio de *Mantenimiento de computadores* en sede o a domicilio. ¿Deseas conocer el precio actualizado o agendar una cita técnica?',
        timestamp: new Date(Date.now() - 3590000).toISOString(),
        intent: 'respuesta_catalogo_soporte',
        usedGemini: true
      }
    ]
  }
];

class DatabaseStore {
  private data: DatabaseSchema;
  private simulatedOffline = false;
  private simulatedOfflineServices: Set<string> = new Set();
  private latestGoogleAccessToken: string | null = null;
  private isHydratedFromFirestore = false;
  private lastUpdatedIso: string = new Date().toISOString();

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.products && parsed.company && parsed.users) {
          // Mandatory Pre-Migration Safety Backup if upgrading from an earlier schema version
          const needsMigrationBackup =
            !Array.isArray(parsed.technicalServices) || !Array.isArray(parsed.backups);
          if (needsMigrationBackup) {
            try {
              const migStamp = new Date().toISOString().replace(/[:.]/g, '-');
              const migFile = `RESPALDO_PRE_MIGRACION_${migStamp}.json`;
              fs.writeFileSync(path.join(BACKUPS_DIR, migFile), raw, 'utf-8');
            } catch (bErr) {
              console.warn('Pre-migration backup notice:', bErr);
            }
          }

          if (!parsed.orders) parsed.orders = INITIAL_ORDERS;
          if (!parsed.promotions) parsed.promotions = [];
          if (!parsed.catalogs) parsed.catalogs = [];
          if (!parsed.auditLogs) parsed.auditLogs = [];
          if (!parsed.sessions) parsed.sessions = [];
          if (!parsed.resetTokens) parsed.resetTokens = [];
          if (!parsed.technicalServices) parsed.technicalServices = INITIAL_TECHNICAL_SERVICES;
          if (!parsed.appointments) parsed.appointments = INITIAL_APPOINTMENTS;
          if (!parsed.warranties) parsed.warranties = INITIAL_WARRANTIES;
          if (!parsed.inventoryMovements) parsed.inventoryMovements = [];
          if (!parsed.whatsappConversations) parsed.whatsappConversations = INITIAL_WHATSAPP_CONVERSATIONS;
          if (!parsed.whatsappConfig) parsed.whatsappConfig = DEFAULT_WHATSAPP_CONFIG;
          if (!parsed.backups) parsed.backups = [];
          if (!parsed.trash) parsed.trash = [];
          if (!parsed.syncQueue) parsed.syncQueue = [];
          if (!parsed.connectionLogs) parsed.connectionLogs = [];
          ensureSeasonalTemplateBackgroundSvgs();
          if (!Array.isArray(parsed.seasonalTemplates) || parsed.seasonalTemplates.length === 0) {
            parsed.seasonalTemplates = INITIAL_SEASONAL_TEMPLATES;
          } else {
            parsed.seasonalTemplates = parsed.seasonalTemplates.map((tpl: SeasonalTemplate) => {
              const seedTpl = INITIAL_SEASONAL_TEMPLATES.find(st => st.id === tpl.id);
              return {
                ...tpl,
                name: seedTpl?.name || tpl.name,
                backgroundImageUrl: tpl.backgroundImageUrl || seedTpl?.backgroundImageUrl || `/uploads/tpl_bg_${tpl.id.replace('tpl_', '')}.svg`,
                bannerImageUrl: tpl.bannerImageUrl || seedTpl?.bannerImageUrl || `/uploads/tpl_bg_${tpl.id.replace('tpl_', '')}.svg`,
                isActiveHome: tpl.isActiveHome !== undefined ? tpl.isActiveHome : Boolean(tpl.isActiveWeb)
              };
            });
            for (const seedTpl of INITIAL_SEASONAL_TEMPLATES) {
              if (!parsed.seasonalTemplates.some((t: SeasonalTemplate) => t.id === seedTpl.id)) {
                parsed.seasonalTemplates.push(seedTpl);
              }
            }
          }
          if (!Array.isArray(parsed.promoBanners) || parsed.promoBanners.length === 0) {
            parsed.promoBanners = buildInitialPromoBanners();
          } else {
            const initialSix = buildInitialPromoBanners();
            for (const seedBanner of initialSix) {
              if (!parsed.promoBanners.some((b: PromoBannerItem) => b.slot === seedBanner.slot)) {
                parsed.promoBanners.push(seedBanner);
              }
            }
            parsed.promoBanners.sort((a: PromoBannerItem, b: PromoBannerItem) => a.order - b.order);
          }
          if (!Array.isArray(parsed.discountCodes) || parsed.discountCodes.length === 0) {
            parsed.discountCodes = INITIAL_DISCOUNT_CODES;
          }
          if (!Array.isArray(parsed.policies) || parsed.policies.length === 0) {
            parsed.policies = INITIAL_POLICIES;
          }
          if (!Array.isArray(parsed.shipments) || parsed.shipments.length === 0) {
            parsed.shipments = INITIAL_SHIPMENTS;
          }
          if (!Array.isArray(parsed.orderAuthorizations)) {
            parsed.orderAuthorizations = INITIAL_ORDER_AUTHORIZATIONS;
          }
          if (!Array.isArray(parsed.adminNotifications) || parsed.adminNotifications.length === 0) {
            parsed.adminNotifications = INITIAL_ADMIN_NOTIFICATIONS;
          }
          if (!Array.isArray(parsed.cashMovements)) {
            parsed.cashMovements = INITIAL_CASH_MOVEMENTS;
          }
          if (!Array.isArray(parsed.customerPushEvents) || parsed.customerPushEvents.length === 0) {
            parsed.customerPushEvents = [
              {
                id: 'push_seed_offer_1',
                type: 'NEW_OFFER',
                title: '🔥 ¡Nueva Oferta Publicada en IPS TECNOLÓGICA!',
                body: 'Aprovecha hasta 15% OFF en Portátiles Workstation Pro y usa el cupón IPS10 en el catálogo oficial.',
                tag: 'promo_ips_workstation',
                url: '/?promo=active',
                icon: '/pwa-192x192.png',
                targetAudience: 'all_customers',
                relatedProductRef: 'IPS-NB-001',
                relatedCategory: 'Portátiles y Cómputo',
                discountBadge: '15% OFF',
                catalogPublished: true,
                createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                createdBy: 'jeffervr@gmail.com'
              },
              {
                id: 'push_seed_order_1',
                type: 'ORDER_STATUS',
                title: '📦 Estado de tu Pedido PED-2026-002: En preparación',
                body: 'Tu pedido PED-2026-002 por $4.680.000 COP se encuentra En preparación en nuestro centro logístico.',
                tag: 'order_status_PED-2026-002',
                url: '/?tab=my-account&order=PED-2026-002',
                icon: '/pwa-192x192.png',
                targetAudience: 'specific_customer',
                targetCustomerEmail: 'cliente@ejemplo.com',
                targetCustomerPhone: '+57 300 123 4567',
                targetOrderId: 'PED-2026-002',
                orderStatus: 'En preparación',
                catalogPublished: true,
                createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
                createdBy: 'jeffervr@gmail.com'
              }
            ];
          }
          if (!Array.isArray(parsed.customerPushSubscriptions)) {
            parsed.customerPushSubscriptions = [];
          }
          if (!Array.isArray(parsed.crmCustomers) || parsed.crmCustomers.length === 0) {
            parsed.crmCustomers = INITIAL_CRM_CUSTOMERS;
          }
          if (!Array.isArray(parsed.marketingCampaigns) || parsed.marketingCampaigns.length === 0) {
            parsed.marketingCampaigns = INITIAL_MARKETING_CAMPAIGNS;
          }
          if (!Array.isArray(parsed.paymentMethods) || parsed.paymentMethods.length === 0) {
            parsed.paymentMethods = INITIAL_PAYMENT_METHODS;
          }
          if (!Array.isArray(parsed.remoteSupportTools) || parsed.remoteSupportTools.length === 0) {
            parsed.remoteSupportTools = INITIAL_REMOTE_SUPPORT_TOOLS;
          }
          if (!parsed.whatsappQrConfig) {
            parsed.whatsappQrConfig = INITIAL_WHATSAPP_QR_CONFIG;
          }

          // Ensure company has logoUrl, active template IDs, and taxConfig (Persona natural no responsable de IVA)
          if (!parsed.company.logoUrl) {
            parsed.company.logoUrl = defaultLogoUrl;
          }
          if (!parsed.company.activeWebTemplateId) {
            parsed.company.activeWebTemplateId = 'tpl_corporativa';
          }
          if (!parsed.company.activePdfTemplateId) {
            parsed.company.activePdfTemplateId = 'tpl_corporativa';
          }
          if (!parsed.company.taxConfig) {
            parsed.company.taxConfig = DEFAULT_COMPANY.taxConfig;
          }
          if (!parsed.company.taxConfig?.ivaEnabled && typeof parsed.company.commercialTerms === 'string') {
            parsed.company.commercialTerms = parsed.company.commercialTerms
              .replace(/Incluyen IVA\.?\s*/gi, 'Persona natural no responsable de IVA. ')
              .replace(/IVA incluido\.?\s*/gi, '');
          }

          // Ensure foundational admins and default role accounts exist without overwriting existing users
          for (const userDef of DEFAULT_USERS_DATA) {
            const existing = parsed.users.find(
              (u: User) => u.email.toLowerCase().trim() === userDef.email.toLowerCase().trim()
            );
            if (!existing) {
              const { hash, salt } = hashPassword(userDef.pass);
              parsed.users.push({
                id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: userDef.name,
                email: userDef.email.toLowerCase().trim(),
                role: userDef.role,
                phone: userDef.phone || '+57 310 894 7231',
                status: 'Activo',
                isActive: true,
                passwordHash: hash,
                passwordSalt: salt,
                createdAt: new Date().toISOString()
              });
            } else if (isFoundationalAdmin(existing.email)) {
              existing.role = 'Administrador';
              if (existing.isActive === undefined) existing.isActive = true;
              if (!existing.status) existing.status = existing.isActive ? 'Activo' : 'Inactivo';
            }
          }

          // Normalize all users
          parsed.users = parsed.users.map((u: any) => {
            const isActive = u.isActive !== false && u.status !== 'Inactivo';
            const role: UserRole = isFoundationalAdmin(u.email)
              ? 'Administrador'
              : ALL_VALID_ROLES.includes(u.role)
              ? u.role
              : 'Cliente';
            return {
              ...u,
              email: String(u.email || '').toLowerCase().trim(),
              role,
              isActive,
              status: isActive ? 'Activo' : 'Inactivo'
            };
          });

          // Ensure Repuesto and Remanufacturado seed examples exist if not in trash
          for (const seedProd of INITIAL_PRODUCTS) {
            const existsInProducts = parsed.products.some(
              (p: Product) => p.reference.toUpperCase() === seedProd.reference.toUpperCase()
            );
            const existsInTrash = (parsed.trash || []).some(
              (t: TrashItem) => t.entityType === 'product' && t.data?.reference?.toUpperCase() === seedProd.reference.toUpperCase()
            );
            if (!existsInProducts && !existsInTrash && (seedProd.reference === 'IPS-REP-001' || seedProd.reference === 'IPS-REM-001')) {
              const nowStr = new Date().toISOString();
              parsed.products.push({
                ...seedProd,
                id: `prod_${seedProd.reference.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                images: [generateProductSvgAsset(seedProd.reference, seedProd.name, seedProd.category, seedProd.brand)],
                createdAt: nowStr,
                updatedAt: nowStr
              });
            }
          }

          // Ensure every product has condition, warrantyPolicyId, shippingPolicyId, and at least one local graphic image
          parsed.products = parsed.products.map((p: Product) => {
            const seedMatch = INITIAL_PRODUCTS.find(ip => ip.reference === p.reference);
            const defaultBrand = seedMatch?.brand || 'IPS PRO';
            const defaultStock = p.stock !== undefined ? p.stock : 15;
            const condition: ProductCondition = p.condition || seedMatch?.condition || 'Nuevo';
            const defaultWarrantyPolicy =
              condition === 'Repuesto'
                ? 'pol_garantia_repuesto'
                : condition === 'Remanufacturado'
                ? 'pol_garantia_remanufacturado'
                : 'pol_garantia_nuevo';
            const images =
              Array.isArray(p.images) && p.images.length > 0
                ? p.images
                : [generateProductSvgAsset(p.reference, p.name, p.category, p.brand || defaultBrand)];
            return {
              ...p,
              brand: p.brand || defaultBrand,
              model: p.model || seedMatch?.model || p.reference,
              condition,
              minStock: p.minStock ?? 3,
              warrantyPolicyId: p.warrantyPolicyId || defaultWarrantyPolicy,
              shippingPolicyId: p.shippingPolicyId || 'pol_envio_nacional',
              shippingType: p.shippingType || seedMatch?.shippingType || 'Gratis',
              remanufacturedDetails: p.remanufacturedDetails || seedMatch?.remanufacturedDetails,
              stock: defaultStock,
              images
            };
          });

          // Recover any Google OAuth token from active sessions
          const activeGoogleSession = (parsed.sessions || []).find(
            (s: any) => s.googleAccessToken && s.expiresAt > Date.now()
          );
          if (activeGoogleSession?.googleAccessToken) {
            this.latestGoogleAccessToken = activeGoogleSession.googleAccessToken;
          }

          // Ensure all product images and local uploads are permanently registered and verified in Drive Media Vault
          try {
            driveMediaVault.syncExistingLocalUploads(parsed.products);
            driveMediaVault.verifyAllProductImages(parsed.products, true);
          } catch (vErr) {
            console.warn('Media vault initial sync warning:', vErr);
          }

          this.writeAtomicDisk(parsed);
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading db.json, recreating defaults', err);
    }
    return this.initDefaults();
  }

  private writeAtomicDisk(schemaData: DatabaseSchema): void {
    try {
      const tmpPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(schemaData, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DB_FILE);
    } catch (err) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(schemaData, null, 2), 'utf-8');
      } catch (e2) {
        console.error('Error writing db.json', e2);
      }
    }
  }

  private save(_changedChunks?: PortalChunkKey[], _actorEmail = 'jeffervr@gmail.com'): void {
    this.lastUpdatedIso = new Date().toISOString();
    this.writeAtomicDisk(this.data);
    // 100% Free Architecture: Atomic local server disk persistence + optional free Google Apps Script Web App bridge
    const appsScriptUrl = this.data.company?.appsScriptWebAppUrl;
    if (appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/macros/s/') && !this.isSimulatedOffline()) {
      fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SYNC_SNAPSHOT',
          updatedAt: this.lastUpdatedIso,
          counts: {
            products: this.data.products?.length || 0,
            orders: this.data.orders?.length || 0,
            users: this.data.users?.length || 0
          }
        })
      }).catch(() => {});
    }
  }

  public getLastUpdated(): string {
    return this.lastUpdatedIso;
  }

  public getRawDatabaseForFirestore(): any {
    return this.data;
  }

  public async hydrateFromFirestore(): Promise<{ hydrated: boolean; productsCount: number }> {
    // 100% Free-tier mode: operational source of truth is server_data/db.json + Google Sheets + Google Drive
    this.isHydratedFromFirestore = true;
    return { hydrated: true, productsCount: this.data.products.length };
  }

  private initDefaults(): DatabaseSchema {
    const users: User[] = DEFAULT_USERS_DATA.map((u, i) => {
      const { hash, salt } = hashPassword(u.pass);
      return {
        id: `usr_${i + 1}`,
        name: u.name,
        email: u.email.toLowerCase().trim(),
        role: u.role,
        phone: u.phone || '+57 300 000 0000',
        status: 'Activo',
        isActive: true,
        passwordHash: hash,
        passwordSalt: salt,
        createdAt: new Date().toISOString()
      };
    });

    const now = new Date().toISOString();
    const products: Product[] = INITIAL_PRODUCTS.map((p, idx) => {
      const imgUrl = generateProductSvgAsset(p.reference, p.name, p.category, p.brand);
      const condition: ProductCondition = p.condition || 'Nuevo';
      const defaultWarrantyPolicy =
        condition === 'Repuesto'
          ? 'pol_garantia_repuesto'
          : condition === 'Remanufacturado'
          ? 'pol_garantia_remanufacturado'
          : 'pol_garantia_nuevo';
      return {
        ...p,
        id: `prod_${idx + 1}`,
        condition,
        model: p.model || p.reference,
        minStock: p.minStock ?? 3,
        warrantyPolicyId: p.warrantyPolicyId || defaultWarrantyPolicy,
        shippingPolicyId: p.shippingPolicyId || 'pol_envio_nacional',
        shippingType: p.shippingType || 'Gratis',
        images: [imgUrl],
        createdAt: now,
        updatedAt: now
      };
    });

    const schema: DatabaseSchema = {
      products,
      promotions: [],
      company: {
        ...DEFAULT_COMPANY,
        activeWebTemplateId: 'tpl_corporativa',
        activePdfTemplateId: 'tpl_corporativa'
      },
      users,
      orders: INITIAL_ORDERS,
      catalogs: [],
      auditLogs: [
        {
          id: `aud_${Date.now()}`,
          date: now,
          user: 'jeffervr@gmail.com',
          action: 'INICIALIZACIÓN_SISTEMA',
          detail: 'Base de datos persistente inicializada con administradores, soporte técnico, plantillas, políticas Ley 1480 y catálogo oficial',
          result: 'EXITOSO'
        }
      ],
      technicalServices: INITIAL_TECHNICAL_SERVICES,
      appointments: INITIAL_APPOINTMENTS,
      warranties: INITIAL_WARRANTIES,
      inventoryMovements: [],
      whatsappConversations: INITIAL_WHATSAPP_CONVERSATIONS,
      whatsappConfig: DEFAULT_WHATSAPP_CONFIG,
      backups: [],
      trash: [],
      syncQueue: [],
      connectionLogs: [],
      seasonalTemplates: INITIAL_SEASONAL_TEMPLATES,
      promoBanners: buildInitialPromoBanners(),
      discountCodes: INITIAL_DISCOUNT_CODES,
      policies: INITIAL_POLICIES,
      shipments: INITIAL_SHIPMENTS,
      orderAuthorizations: INITIAL_ORDER_AUTHORIZATIONS,
      adminNotifications: INITIAL_ADMIN_NOTIFICATIONS,
      cashMovements: INITIAL_CASH_MOVEMENTS,
      crmCustomers: INITIAL_CRM_CUSTOMERS,
      marketingCampaigns: INITIAL_MARKETING_CAMPAIGNS,
      paymentMethods: INITIAL_PAYMENT_METHODS,
      remoteSupportTools: INITIAL_REMOTE_SUPPORT_TOOLS,
      whatsappQrConfig: INITIAL_WHATSAPP_QR_CONFIG,
      sessions: [],
      resetTokens: []
    };

    try {
      driveMediaVault.syncExistingLocalUploads(products);
    } catch {}

    this.writeAtomicDisk(schema);
    return schema;
  }

  public isUserAdminByEmail(email: string): boolean {
    if (!email) return false;
    const clean = email.toLowerCase().trim();
    if (isFoundationalAdmin(clean)) return true;
    const u = this.data.users.find(user => user.email.toLowerCase().trim() === clean);
    return Boolean(u && u.isActive && u.role === 'Administrador');
  }

  public getUserByEmail(email: string): Omit<User, 'passwordHash' | 'passwordSalt'> | null {
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    const u = this.data.users.find(user => user.email.toLowerCase().trim() === clean);
    if (!u) return null;
    const { passwordHash, passwordSalt, ...safe } = u;
    return safe;
  }

  public addAuditLog(user: string, action: string, detail: string, result: 'EXITOSO' | 'ERROR' = 'EXITOSO'): AuditLogRecord {
    const entry: AuditLogRecord = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString(),
      user: user || 'Sistema',
      action,
      detail,
      result
    };
    if (!this.data.auditLogs) this.data.auditLogs = [];
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save(['auditLogs'], user || 'Sistema');
    return entry;
  }

  public getAuditLogs(): AuditLogRecord[] {
    return this.data.auditLogs || [];
  }

  // =========================================================================
  // AUTH & USERS MANAGEMENT (RBAC + PERSISTENT SESSIONS)
  // =========================================================================

  public authenticateUser(email: string, pass: string): { user: Omit<User, 'passwordHash' | 'passwordSalt'>; token: string } | null {
    const cleanEmail = email.toLowerCase().trim();
    const user = this.data.users.find(u => u.email.toLowerCase().trim() === cleanEmail);
    if (!user) return null;
    if (!user.isActive || user.status === 'Inactivo') {
      throw new Error('Su cuenta se encuentra desactivada. Contacte al administrador principal.');
    }
    const ok = verifyPassword(pass, user.passwordHash, user.passwordSalt);
    if (!ok) return null;

    if (isFoundationalAdmin(cleanEmail)) {
      user.role = 'Administrador';
    }

    const token = `ses_${crypto.randomBytes(28).toString('hex')}`;
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 14; // 14 days persistent session
    if (!this.data.sessions) this.data.sessions = [];
    this.data.sessions.push({ token, userId: user.id, expiresAt });
    this.save(['users']);

    const { passwordHash, passwordSalt, ...safeUser } = user;
    return { user: safeUser, token };
  }

  /**
   * Issues a persistent backend session for a verified Google OAuth user and caches the Google access token
   * so refreshing the page or closing/reopening the browser never loses the session or data.
   */
  public createGoogleSession(
    email: string,
    name: string,
    picture?: string,
    googleAccessToken?: string
  ): { user: Omit<User, 'passwordHash' | 'passwordSalt'>; token: string } {
    const safeUser = this.getOrCreateGoogleUser(email, name, picture);
    if (googleAccessToken) {
      this.latestGoogleAccessToken = googleAccessToken;
    }
    const token = `ses_g_${crypto.randomBytes(28).toString('hex')}`;
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 14; // 14 days
    if (!this.data.sessions) this.data.sessions = [];
    this.data.sessions.push({
      token,
      userId: safeUser.id,
      expiresAt,
      googleAccessToken
    });
    this.writeAtomicDisk(this.data);
    return { user: safeUser, token };
  }

  public setLatestGoogleAccessToken(token: string | null): void {
    if (token && !token.startsWith('ses_')) {
      this.latestGoogleAccessToken = token;
    }
  }

  public getLatestGoogleAccessToken(): string | null {
    if (this.latestGoogleAccessToken) return this.latestGoogleAccessToken;
    const sessionWithGoogle = (this.data.sessions || []).find(
      s => s.googleAccessToken && s.expiresAt > Date.now()
    );
    return sessionWithGoogle?.googleAccessToken || null;
  }

  public getGoogleTokenForSession(sessionToken: string): string | null {
    const session = (this.data.sessions || []).find(s => s.token === sessionToken && s.expiresAt > Date.now());
    return session?.googleAccessToken || this.latestGoogleAccessToken;
  }

  public registerUser(
    name: string,
    email: string,
    pass: string,
    phone?: string,
    documentId?: string,
    city?: string
  ): { user: Omit<User, 'passwordHash' | 'passwordSalt'>; token: string } {
    const cleanEmail = email.toLowerCase().trim();
    const existing = this.data.users.find(u => u.email.toLowerCase().trim() === cleanEmail);
    if (existing) {
      throw new Error('El correo electrónico ya se encuentra registrado. Por favor inicie sesión.');
    }

    const { hash, salt } = hashPassword(pass);
    const role: UserRole = isFoundationalAdmin(cleanEmail) ? 'Administrador' : 'Cliente';

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: cleanEmail,
      role,
      phone: phone?.trim() || '',
      documentId: documentId?.trim() || '',
      city: city?.trim() || 'Bogotá D.C.',
      status: 'Activo',
      isActive: true,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString()
    };

    this.data.users.push(newUser);

    const token = `ses_${crypto.randomBytes(28).toString('hex')}`;
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 14;
    if (!this.data.sessions) this.data.sessions = [];
    this.data.sessions.push({ token, userId: newUser.id, expiresAt });
    this.addAuditLog(cleanEmail, 'REGISTRO_CLIENTE', `Cuenta registrada: ${newUser.name} (${role})`, 'EXITOSO');
    this.save(['users'], cleanEmail);

    const { passwordHash, passwordSalt, ...safeUser } = newUser;
    return { user: safeUser, token };
  }

  public getUserByToken(token: string): Omit<User, 'passwordHash' | 'passwordSalt'> | null {
    const session = (this.data.sessions || []).find(s => s.token === token && s.expiresAt > Date.now());
    if (!session) return null;
    const user = this.data.users.find(u => u.id === session.userId);
    if (!user) return null;
    if (!user.isActive || user.status === 'Inactivo') return null;

    if (isFoundationalAdmin(user.email)) {
      user.role = 'Administrador';
    }
    const { passwordHash, passwordSalt, ...safeUser } = user;
    return safeUser;
  }

  public getOrCreateGoogleUser(email: string, name: string, _picture?: string): Omit<User, 'passwordHash' | 'passwordSalt'> {
    const cleanEmail = email.toLowerCase().trim();
    let user = this.data.users.find(u => u.email.toLowerCase().trim() === cleanEmail);

    if (!user) {
      const role: UserRole = isFoundationalAdmin(cleanEmail) ? 'Administrador' : 'Cliente';
      const { hash, salt } = hashPassword(crypto.randomBytes(16).toString('hex'));
      user = {
        id: `usr_g_${Date.now()}`,
        name: name || cleanEmail.split('@')[0],
        email: cleanEmail,
        role,
        phone: '',
        status: 'Activo',
        isActive: true,
        passwordHash: hash,
        passwordSalt: salt,
        createdAt: new Date().toISOString()
      };
      this.data.users.push(user);
      this.addAuditLog(cleanEmail, 'LOGIN_GOOGLE_NUEVO', `Usuario autenticado con Google (${role})`, 'EXITOSO');
      this.save(['users'], cleanEmail);
    } else {
      if (isFoundationalAdmin(cleanEmail)) {
        user.role = 'Administrador';
      }
      if (!user.isActive || user.status === 'Inactivo') {
        throw new Error('Su cuenta ha sido desactivada por el administrador.');
      }
    }

    const { passwordHash, passwordSalt, ...safeUser } = user;
    return safeUser;
  }

  public logout(token: string): void {
    this.data.sessions = (this.data.sessions || []).filter(s => s.token !== token);
    this.writeAtomicDisk(this.data);
  }

  public requestPasswordReset(email: string): string | null {
    const cleanEmail = email.toLowerCase().trim();
    const user = this.data.users.find(u => u.email.toLowerCase().trim() === cleanEmail);
    if (!user) return null;
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.data.resetTokens = (this.data.resetTokens || []).filter(r => r.email.toLowerCase().trim() !== cleanEmail);
    this.data.resetTokens.push({
      email: cleanEmail,
      token: resetCode,
      expiresAt: Date.now() + 1000 * 60 * 30
    });
    this.writeAtomicDisk(this.data);
    return resetCode;
  }

  public resetPassword(email: string, code: string, newPass: string): boolean {
    const cleanEmail = email.toLowerCase().trim();
    const record = (this.data.resetTokens || []).find(
      r => r.email.toLowerCase().trim() === cleanEmail && r.token === code && r.expiresAt > Date.now()
    );
    if (!record) return false;

    const user = this.data.users.find(u => u.email.toLowerCase().trim() === cleanEmail);
    if (!user) return false;

    const { hash, salt } = hashPassword(newPass);
    user.passwordHash = hash;
    user.passwordSalt = salt;

    this.data.resetTokens = this.data.resetTokens.filter(r => r !== record);
    this.data.sessions = (this.data.sessions || []).filter(s => s.userId !== user.id);
    this.save(['users'], cleanEmail);
    return true;
  }

  // Admin Users CRUD
  public getUsers(): Omit<User, 'passwordHash' | 'passwordSalt'>[] {
    return this.data.users.map(({ passwordHash, passwordSalt, ...u }) => ({
      ...u,
      role: isFoundationalAdmin(u.email) ? 'Administrador' : u.role,
      isActive: u.isActive !== false && u.status !== 'Inactivo',
      status: u.isActive !== false && u.status !== 'Inactivo' ? 'Activo' : 'Inactivo'
    }));
  }

  public getTechnicians(): Omit<User, 'passwordHash' | 'passwordSalt'>[] {
    return this.getUsers().filter(
      u => u.isActive && (u.role === 'Técnico' || u.role === 'Supervisor' || u.role === 'Administrador')
    );
  }

  public createUserByAdmin(
    data: { name: string; email: string; role: UserRole; phone?: string; documentId?: string; city?: string; password?: string; isActive?: boolean },
    adminEmail: string
  ): Omit<User, 'passwordHash' | 'passwordSalt'> {
    const cleanEmail = data.email.toLowerCase().trim();
    if (!cleanEmail || !data.name?.trim()) {
      throw new Error('Nombre y correo electrónico son obligatorios.');
    }
    const existing = this.data.users.find(u => u.email.toLowerCase().trim() === cleanEmail);
    if (existing) {
      throw new Error('Ya existe un usuario con ese correo electrónico.');
    }

    const role: UserRole = ALL_VALID_ROLES.includes(data.role) ? data.role : 'Cliente';
    const rawPass = data.password && data.password.length >= 6 ? data.password : 'IpsTech2026*';
    const { hash, salt } = hashPassword(rawPass);
    const isActive = data.isActive !== false;

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      email: cleanEmail,
      role,
      phone: data.phone?.trim() || '',
      documentId: data.documentId?.trim() || '',
      city: data.city?.trim() || 'Bogotá D.C.',
      status: isActive ? 'Activo' : 'Inactivo',
      isActive,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail
    };

    this.data.users.push(newUser);
    this.addAuditLog(adminEmail, 'CREAR_USUARIO', `Creó usuario ${newUser.email} con rol ${newUser.role}`, 'EXITOSO');
    this.save(['users'], adminEmail);

    const { passwordHash, passwordSalt, ...safe } = newUser;
    return safe;
  }

  public updateUserByAdmin(
    idOrEmail: string,
    updates: { name?: string; role?: UserRole; phone?: string; documentId?: string; city?: string; isActive?: boolean; password?: string },
    actorUser: { id: string; email: string }
  ): Omit<User, 'passwordHash' | 'passwordSalt'> {
    const cleanTarget = idOrEmail.toLowerCase().trim();
    const user = this.data.users.find(
      u => u.id === idOrEmail || u.email.toLowerCase().trim() === cleanTarget
    );
    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    const isPrimarySuperAdmin = user.email.toLowerCase().trim() === 'jeffervr@gmail.com';
    if (isPrimarySuperAdmin) {
      if (updates.isActive === false) {
        throw new Error('Protección de seguridad: la cuenta del administrador principal (jeffervr@gmail.com) no puede ser desactivada.');
      }
      if (updates.role && updates.role !== 'Administrador') {
        throw new Error('Protección de seguridad: el administrador principal (jeffervr@gmail.com) no puede perder su permiso de Administrador.');
      }
    }

    const isSelf =
      user.id === actorUser.id ||
      user.email.toLowerCase().trim() === actorUser.email.toLowerCase().trim();

    if (isSelf) {
      if (updates.isActive === false) {
        throw new Error('Por seguridad, no puede desactivar su propia cuenta de administrador.');
      }
      if (updates.role && updates.role !== 'Administrador') {
        throw new Error('Por seguridad, no puede quitarse a sí mismo el rol de Administrador.');
      }
    }

    const activeAdmins = this.data.users.filter(
      u => u.role === 'Administrador' && u.isActive !== false && u.status !== 'Inactivo'
    );
    const willStayAdmin =
      (updates.role === undefined ? user.role === 'Administrador' : updates.role === 'Administrador') &&
      (updates.isActive === undefined ? user.isActive : updates.isActive);

    if (user.role === 'Administrador' && user.isActive && !willStayAdmin && activeAdmins.length <= 1) {
      throw new Error('No se puede desactivar ni cambiar el rol del último administrador activo del sistema.');
    }

    if (updates.name !== undefined && updates.name.trim()) {
      user.name = updates.name.trim();
    }
    if (updates.phone !== undefined) {
      user.phone = updates.phone.trim();
    }
    if (updates.documentId !== undefined) {
      user.documentId = updates.documentId.trim();
    }
    if (updates.city !== undefined) {
      user.city = updates.city.trim();
    }
    if (updates.role && ALL_VALID_ROLES.includes(updates.role)) {
      user.role = updates.role;
    }
    if (updates.isActive !== undefined) {
      user.isActive = Boolean(updates.isActive);
      user.status = user.isActive ? 'Activo' : 'Inactivo';
      if (!user.isActive) {
        this.data.sessions = (this.data.sessions || []).filter(s => s.userId !== user.id);
      }
    }
    if (updates.password && updates.password.length >= 6) {
      const { hash, salt } = hashPassword(updates.password);
      user.passwordHash = hash;
      user.passwordSalt = salt;
    }

    user.updatedAt = new Date().toISOString();
    user.updatedBy = actorUser.email;

    this.addAuditLog(
      actorUser.email,
      'ACTUALIZAR_USUARIO',
      `Actualizó usuario ${user.email}: rol=${user.role}, estado=${user.status}`,
      'EXITOSO'
    );
    this.save(['users'], actorUser.email);

    const { passwordHash, passwordSalt, ...safe } = user;
    return safe;
  }

  public deleteUserByAdmin(idOrEmail: string, actorUser: { id: string; email: string }): boolean {
    const cleanTarget = idOrEmail.toLowerCase().trim();
    const user = this.data.users.find(
      u => u.id === idOrEmail || u.email.toLowerCase().trim() === cleanTarget
    );
    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    if (user.id === actorUser.id || user.email.toLowerCase().trim() === actorUser.email.toLowerCase().trim()) {
      throw new Error('No puede eliminar su propia cuenta activa de administrador.');
    }

    if (user.email.toLowerCase().trim() === 'jeffervr@gmail.com') {
      throw new Error('No se puede eliminar la cuenta del administrador principal (jeffervr@gmail.com).');
    }

    if (user.role === 'Administrador') {
      const activeAdmins = this.data.users.filter(
        u => u.role === 'Administrador' && u.isActive !== false && u.status !== 'Inactivo'
      );
      if (activeAdmins.length <= 1) {
        throw new Error('No se puede eliminar el último administrador activo del sistema.');
      }
    }

    // Move to soft-delete trash before removing
    this.moveToTrash('user', user.id, user.name, `${user.email} (${user.role})`, user, actorUser.email);

    this.data.users = this.data.users.filter(u => u.id !== user.id);
    this.data.sessions = (this.data.sessions || []).filter(s => s.userId !== user.id);
    this.addAuditLog(
      actorUser.email,
      'ELIMINAR_USUARIO',
      `Envió a papelera cuenta de usuario: ${user.name} (${user.email})`,
      'EXITOSO'
    );
    this.save(['users', 'trash'], actorUser.email);
    return true;
  }

  public getCustomers(): Omit<User, 'passwordHash' | 'passwordSalt'>[] {
    return this.getUsers().filter(u => u.role === 'Cliente');
  }

  public updateCustomerProfile(
    userId: string,
    name: string,
    phone: string,
    documentId?: string,
    city?: string
  ): Omit<User, 'passwordHash' | 'passwordSalt'> | null {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;
    user.name = name.trim();
    user.phone = phone.trim();
    if (documentId !== undefined) user.documentId = documentId.trim();
    if (city !== undefined) user.city = city.trim();
    user.updatedAt = new Date().toISOString();
    this.save(['users'], user.email);
    const { passwordHash, passwordSalt, ...safeUser } = user;
    return safeUser;
  }

  // =========================================================================
  // PROMOTIONS ENGINE (SCHEDULED & AUTOMATIC PRICE RESTORATION)
  // =========================================================================

  private normalizePromoFields(p: Promotion): Promotion {
    const startIso = p.startAt || p.startDate;
    const endIso = p.endAt || p.endDate;
    const tProdId = p.scope === 'product' ? (p.targetId || p.targetProductId) : undefined;
    const tCat = p.scope === 'category' ? (p.targetId || p.targetCategory) : undefined;
    const tId = p.scope === 'product' ? tProdId : tCat;

    let targetName = p.targetName || '';
    if (p.scope === 'product' && tProdId) {
      const prod = this.data?.products?.find(pr => pr.id === tProdId);
      targetName = prod ? `${prod.reference} · ${prod.name}` : (p.targetName || tProdId);
    } else if (p.scope === 'category' && tCat) {
      targetName = tCat;
    }

    return {
      ...p,
      targetId: tId || '',
      targetName,
      targetProductId: tProdId,
      targetCategory: tCat,
      startAt: startIso,
      endAt: endIso,
      startDate: startIso,
      endDate: endIso
    };
  }

  public computePromotionStatus(promo: Promotion, nowMs: number = Date.now()): PromotionComputedStatus {
    if (promo.manualStatus === 'cancelled') return 'Cancelada';
    const startIso = promo.startAt || promo.startDate;
    const endIso = promo.endAt || promo.endDate;
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();

    if (nowMs > endMs) {
      return 'Finalizada';
    }
    if (promo.manualStatus === 'paused') {
      return 'Pausada';
    }
    if (nowMs < startMs) {
      return 'Programada';
    }
    return 'Activa';
  }

  public evaluatePromotionsLifecycle(): void {
    if (!this.data.promotions || this.data.promotions.length === 0) return;
    const nowMs = Date.now();
    let changed = false;

    for (const promo of this.data.promotions) {
      const currentStatus = this.computePromotionStatus(promo, nowMs);
      if (promo.lastNotifiedState !== currentStatus) {
        if (currentStatus === 'Activa' && (promo.lastNotifiedState === 'Programada' || promo.lastNotifiedState === 'scheduled')) {
          this.addAuditLog(
            'Sistema Automático (America/Bogota)',
            'PROMOCION_ACTIVADA',
            `Promoción "${promo.name}" iniciada automáticamente en la fecha programada.`,
            'EXITOSO'
          );
          if (this.isCatalogPublished()) {
            const discountBadge =
              promo.discountType === 'percentage'
                ? `${promo.discountValue}% OFF`
                : `Oferta $${Number(promo.discountValue).toLocaleString('es-CO')} COP`;
            const targetProd = promo.targetProductId
              ? this.data.products.find(p => p.id === promo.targetProductId)
              : undefined;
            this.emitCustomerPushEvent({
              type: 'PROMO_ACTIVATED',
              title: `🔥 ¡Oferta Activa Ahora: ${promo.name}!`,
              body: `${promo.targetName || 'Catálogo IPS TECNOLÓGICA'} con ${discountBadge}. Disponible por tiempo limitado en el catálogo publicado.`,
              tag: `promo_${promo.id}`,
              url: targetProd
                ? `/?product=${encodeURIComponent(targetProd.reference)}`
                : promo.targetCategory
                ? `/?category=${encodeURIComponent(promo.targetCategory)}`
                : '/?promo=active',
              targetAudience: 'all_customers',
              relatedProductId: promo.targetProductId,
              relatedProductRef: targetProd?.reference,
              relatedCategory: promo.targetCategory,
              discountBadge,
              createdBy: 'Sistema Automático (America/Bogota)'
            });
          }
        } else if (currentStatus === 'Finalizada' && (promo.lastNotifiedState === 'Activa' || promo.lastNotifiedState === 'active')) {
          this.addAuditLog(
            'Sistema Automático (America/Bogota)',
            'PROMOCION_FINALIZADA',
            `Promoción "${promo.name}" finalizó por tiempo. Precios restaurados al valor normal automáticamente.`,
            'EXITOSO'
          );
        }
        promo.lastNotifiedState = currentStatus;
        promo.computedStatus = currentStatus;
        changed = true;
      }
    }

    if (changed) {
      this.save(['promotions']);
    }
  }

  public getPromotions(): Array<
    Promotion & { computedStatus: PromotionComputedStatus; status: PromotionComputedStatus; targetLabel: string }
  > {
    this.evaluatePromotionsLifecycle();
    const nowMs = Date.now();
    return (this.data.promotions || []).map(raw => {
      const p = this.normalizePromoFields(raw);
      const computedStatus = this.computePromotionStatus(p, nowMs);
      const targetLabel =
        p.scope === 'product'
          ? p.targetName || `Producto ID: ${p.targetProductId}`
          : `Categoría: ${p.targetCategory}`;
      return {
        ...p,
        computedStatus,
        status: computedStatus,
        targetLabel
      };
    });
  }

  public getActivePromotionForProduct(product: Product, nowMs: number = Date.now()): ActivePromotionInfo | null {
    if (!this.data.promotions || this.data.promotions.length === 0) return null;

    const activePromos = this.data.promotions
      .map(p => this.normalizePromoFields(p))
      .filter(p => this.computePromotionStatus(p, nowMs) === 'Activa');
    if (activePromos.length === 0) return null;

    const matchingPromo =
      activePromos.find(p => p.scope === 'product' && (p.targetProductId === product.id || p.targetId === product.id)) ||
      activePromos.find(
        p =>
          p.scope === 'category' &&
          (p.targetCategory || p.targetId || '').toLowerCase().trim() === product.category.toLowerCase().trim()
      );

    if (!matchingPromo) return null;

    const normalPriceCOP = Number(product.priceCOP) || 0;
    if (normalPriceCOP <= 0) return null;

    let promotionalPriceCOP = normalPriceCOP;
    let discountPercentage = 0;

    if (matchingPromo.discountType === 'percentage') {
      const pct = Math.min(99, Math.max(1, Number(matchingPromo.discountValue) || 0));
      discountPercentage = pct;
      promotionalPriceCOP = Math.round(normalPriceCOP * (1 - pct / 100));
    } else {
      const fixed = Math.round(Number(matchingPromo.discountValue) || 0);
      if (fixed <= 0 || fixed >= normalPriceCOP) return null;
      promotionalPriceCOP = fixed;
      discountPercentage = Math.round(((normalPriceCOP - fixed) / normalPriceCOP) * 100);
    }

    const savingsCOP = Math.max(0, normalPriceCOP - promotionalPriceCOP);
    if (savingsCOP <= 0) return null;

    const startIso = matchingPromo.startAt || matchingPromo.startDate;
    const endIso = matchingPromo.endAt || matchingPromo.endDate;

    return {
      promotionId: matchingPromo.id,
      name: matchingPromo.name,
      description: matchingPromo.description,
      scope: matchingPromo.scope,
      discountType: matchingPromo.discountType,
      discountValue: matchingPromo.discountValue,
      normalPriceCOP,
      promotionalPriceCOP,
      savingsCOP,
      savingsPercentage: discountPercentage,
      discountPercentage,
      badgeText: `${discountPercentage}% OFF`,
      startAt: startIso,
      endAt: endIso,
      startDate: startIso,
      endDate: endIso,
      timezone: matchingPromo.timezone || 'America/Bogota'
    } as ActivePromotionInfo & { badgeText: string };
  }

  public enrichProductWithPromotion(product: Product, nowMs: number = Date.now()): Product & { promotionalPriceCOP?: number } {
    const activePromotion = this.getActivePromotionForProduct(product, nowMs);
    return {
      ...product,
      priceCOP: Number(product.priceCOP),
      promotionalPriceCOP: activePromotion ? activePromotion.promotionalPriceCOP : undefined,
      activePromotion
    };
  }

  public getActiveProductsWithPromotions(): Array<Product & { promotionalPriceCOP?: number }> {
    this.evaluatePromotionsLifecycle();
    const nowMs = Date.now();
    return this.data.products
      .filter(p => p.isActive)
      .map(p => this.enrichProductWithPromotion(p, nowMs));
  }

  private validatePromotionData(
    input: {
      name: string;
      scope: PromotionScope;
      targetId?: string;
      targetProductId?: string;
      targetCategory?: string;
      discountType: PromotionDiscountType;
      discountValue: number;
      startAt?: string;
      endAt?: string;
      startDate?: string;
      endDate?: string;
      manualStatus?: PromotionManualStatus;
    },
    excludePromoId?: string
  ): { startIso: string; endIso: string; targetProdId?: string; targetCat?: string; targetName: string } {
    if (!input.name || !input.name.trim()) {
      throw new Error('El nombre de la promoción es obligatorio.');
    }

    const rawStart = input.startAt || input.startDate || '';
    const rawEnd = input.endAt || input.endDate || '';
    const startMs = new Date(rawStart).getTime();
    const endMs = new Date(rawEnd).getTime();
    if (!rawStart || !rawEnd || isNaN(startMs) || isNaN(endMs)) {
      throw new Error('Las fechas de inicio y finalización deben tener un formato válido.');
    }
    if (endMs <= startMs) {
      throw new Error('La fecha y hora de finalización debe ser posterior a la fecha y hora de inicio.');
    }

    const val = Number(input.discountValue);
    if (isNaN(val) || val <= 0) {
      throw new Error('El valor del descuento o precio promocional debe ser mayor a cero.');
    }

    if (input.discountType === 'percentage') {
      if (val <= 0 || val >= 100) {
        throw new Error('El descuento porcentual debe estar entre 1% y 99%.');
      }
    }

    const targetProdId = input.scope === 'product' ? (input.targetId || input.targetProductId) : undefined;
    const targetCat = input.scope === 'category' ? (input.targetId || input.targetCategory) : undefined;
    let targetName = '';

    let affectedProducts: Product[] = [];
    if (input.scope === 'product') {
      if (!targetProdId) {
        throw new Error('Debe seleccionar un producto para la promoción.');
      }
      const prod = this.data.products.find(p => p.id === targetProdId);
      if (!prod) {
        throw new Error('El producto seleccionado no existe.');
      }
      targetName = `${prod.reference} · ${prod.name}`;
      affectedProducts = [prod];
    } else if (input.scope === 'category') {
      if (!targetCat || !targetCat.trim()) {
        throw new Error('Debe seleccionar una categoría para la promoción.');
      }
      affectedProducts = this.data.products.filter(
        p => p.category.toLowerCase().trim() === targetCat.toLowerCase().trim()
      );
      if (affectedProducts.length === 0) {
        throw new Error(`No hay productos registrados en la categoría "${targetCat}".`);
      }
      targetName = targetCat;
    } else {
      throw new Error('Alcance de promoción inválido (debe ser producto o categoría).');
    }

    if (input.discountType === 'fixed_price') {
      for (const prod of affectedProducts) {
        if (val >= prod.priceCOP) {
          throw new Error(
            `El precio promocional ($${val.toLocaleString('es-CO')} COP) debe ser menor al precio normal de "${prod.name}" ($${prod.priceCOP.toLocaleString('es-CO')} COP).`
          );
        }
      }
    }

    const statusToCheck = input.manualStatus || 'active';
    if (statusToCheck !== 'cancelled') {
      const affectedIds = new Set(affectedProducts.map(p => p.id));

      for (const rawOther of this.data.promotions || []) {
        const other = this.normalizePromoFields(rawOther);
        if (excludePromoId && other.id === excludePromoId) continue;
        if (other.manualStatus === 'cancelled') continue;

        const otherStart = new Date(other.startDate).getTime();
        const otherEnd = new Date(other.endDate).getTime();
        if (otherEnd < Date.now() && otherEnd < startMs) continue;

        const overlapsInTime = startMs <= otherEnd && endMs >= otherStart;
        if (!overlapsInTime) continue;

        const otherAffectedIds = new Set<string>();
        if (other.scope === 'product' && other.targetProductId) {
          otherAffectedIds.add(other.targetProductId);
        } else if (other.scope === 'category' && other.targetCategory) {
          this.data.products
            .filter(p => p.category.toLowerCase().trim() === other.targetCategory!.toLowerCase().trim())
            .forEach(p => otherAffectedIds.add(p.id));
        }

        const hasCommonProduct = [...affectedIds].some(id => otherAffectedIds.has(id));
        if (hasCommonProduct) {
          throw new Error(
            `Conflicto de promociones: La promoción "${other.name}" ya modifica el precio de este producto o categoría en ese horario.`
          );
        }
      }
    }

    return {
      startIso: new Date(startMs).toISOString(),
      endIso: new Date(endMs).toISOString(),
      targetProdId,
      targetCat,
      targetName
    };
  }

  public createPromotion(
    input: {
      name: string;
      description?: string;
      scope: PromotionScope;
      targetId?: string;
      targetName?: string;
      targetProductId?: string;
      targetCategory?: string;
      discountType: PromotionDiscountType;
      discountValue: number;
      startAt?: string;
      endAt?: string;
      startDate?: string;
      endDate?: string;
      timezone?: string;
      manualStatus?: PromotionManualStatus;
    },
    adminEmail: string
  ): Promotion & { computedStatus: PromotionComputedStatus } {
    const validated = this.validatePromotionData(input);

    const now = new Date().toISOString();
    const promo: Promotion = {
      id: `promo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: input.name.trim(),
      description: (input.description || '').trim(),
      scope: input.scope,
      targetId: input.scope === 'product' ? validated.targetProdId : validated.targetCat,
      targetName: validated.targetName,
      targetProductId: validated.targetProdId,
      targetCategory: validated.targetCat,
      discountType: input.discountType,
      discountValue: Number(input.discountValue),
      startAt: validated.startIso,
      endAt: validated.endIso,
      startDate: validated.startIso,
      endDate: validated.endIso,
      timezone: input.timezone || 'America/Bogota',
      manualStatus: input.manualStatus || 'active',
      createdBy: adminEmail,
      createdAt: now,
      updatedAt: now
    };

    const computedStatus = this.computePromotionStatus(promo);
    promo.computedStatus = computedStatus;
    promo.lastNotifiedState = computedStatus;

    if (!this.data.promotions) this.data.promotions = [];
    this.data.promotions.unshift(promo);
    this.addAuditLog(
      adminEmail,
      'CREAR_PROMOCION',
      `Promoción "${promo.name}" (${promo.scope}) creada con estado ${computedStatus}`,
      'EXITOSO'
    );

    if (computedStatus === 'Activa' && this.isCatalogPublished()) {
      const discountBadge =
        promo.discountType === 'percentage'
          ? `${promo.discountValue}% OFF`
          : `Oferta $${Number(promo.discountValue).toLocaleString('es-CO')} COP`;
      const targetProd = promo.targetProductId
        ? this.data.products.find(p => p.id === promo.targetProductId)
        : undefined;
      this.emitCustomerPushEvent({
        type: 'NEW_OFFER',
        title: `🔥 ¡Nueva Oferta en IPS TECNOLÓGICA: ${promo.name}!`,
        body: `Aprovecha ${discountBadge} en ${promo.targetName || 'nuestro catálogo'}. ¡Compra ahora antes de que termine la cuenta regresiva!`,
        tag: `promo_${promo.id}`,
        url: targetProd
          ? `/?product=${encodeURIComponent(targetProd.reference)}`
          : promo.targetCategory
          ? `/?category=${encodeURIComponent(promo.targetCategory)}`
          : '/?promo=active',
        targetAudience: 'all_customers',
        relatedProductId: promo.targetProductId,
        relatedProductRef: targetProd?.reference,
        relatedCategory: promo.targetCategory,
        discountBadge,
        createdBy: adminEmail
      });
    }

    this.save(['promotions'], adminEmail);

    return { ...promo, computedStatus };
  }

  public updatePromotion(
    id: string,
    updates: Partial<Omit<Promotion, 'id' | 'createdAt' | 'createdBy'>>,
    adminEmail: string
  ): Promotion & { computedStatus: PromotionComputedStatus } {
    const idx = (this.data.promotions || []).findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Promoción no encontrada.');

    const existing = this.normalizePromoFields(this.data.promotions[idx]);
    const nextStart = updates.startAt || updates.startDate || existing.startDate;
    const nextEnd = updates.endAt || updates.endDate || existing.endDate;
    const nextScope = updates.scope || existing.scope;
    const nextTargetId =
      updates.targetId ||
      (nextScope === 'product'
        ? updates.targetProductId || existing.targetProductId
        : updates.targetCategory || existing.targetCategory);

    const candidate = {
      ...existing,
      ...updates,
      scope: nextScope,
      targetId: nextTargetId,
      discountValue: updates.discountValue !== undefined ? Number(updates.discountValue) : existing.discountValue,
      startAt: nextStart,
      endAt: nextEnd,
      startDate: nextStart,
      endDate: nextEnd
    };

    const validated = this.validatePromotionData(candidate, id);

    const merged: Promotion = {
      ...candidate,
      targetId: nextScope === 'product' ? validated.targetProdId : validated.targetCat,
      targetName: validated.targetName,
      targetProductId: validated.targetProdId,
      targetCategory: validated.targetCat,
      startAt: validated.startIso,
      endAt: validated.endIso,
      startDate: validated.startIso,
      endDate: validated.endIso,
      updatedAt: new Date().toISOString()
    };

    const computedStatus = this.computePromotionStatus(merged);
    merged.computedStatus = computedStatus;
    merged.lastNotifiedState = computedStatus;

    this.data.promotions[idx] = merged;
    this.addAuditLog(
      adminEmail,
      'ACTUALIZAR_PROMOCION',
      `Promoción "${merged.name}" actualizada (estado=${computedStatus})`,
      'EXITOSO'
    );

    if (computedStatus === 'Activa' && this.isCatalogPublished()) {
      const discountBadge =
        merged.discountType === 'percentage'
          ? `${merged.discountValue}% OFF`
          : `Oferta $${Number(merged.discountValue).toLocaleString('es-CO')} COP`;
      const targetProd = merged.targetProductId
        ? this.data.products.find(p => p.id === merged.targetProductId)
        : undefined;
      this.emitCustomerPushEvent({
        type: 'NEW_OFFER',
        title: `🔥 ¡Oferta Actualizada: ${merged.name}!`,
        body: `${merged.targetName || 'Catálogo IPS TECNOLÓGICA'} ahora con ${discountBadge}. ¡Mírala en el catálogo en línea!`,
        tag: `promo_${merged.id}_${Date.now()}`,
        url: targetProd
          ? `/?product=${encodeURIComponent(targetProd.reference)}`
          : merged.targetCategory
          ? `/?category=${encodeURIComponent(merged.targetCategory)}`
          : '/?promo=active',
        targetAudience: 'all_customers',
        relatedProductId: merged.targetProductId,
        relatedProductRef: targetProd?.reference,
        relatedCategory: merged.targetCategory,
        discountBadge,
        createdBy: adminEmail
      });
    }

    this.save(['promotions'], adminEmail);

    return { ...merged, computedStatus };
  }

  public deletePromotion(id: string, adminEmail: string): boolean {
    const existing = (this.data.promotions || []).find(p => p.id === id);
    if (!existing) return false;
    this.moveToTrash('promotion', existing.id, existing.name, `${existing.scope} · ${existing.targetName || ''}`, existing, adminEmail);
    this.data.promotions = this.data.promotions.filter(p => p.id !== id);
    this.addAuditLog(
      adminEmail,
      'ELIMINAR_PROMOCION',
      `Promoción enviada a papelera: "${existing.name}"`,
      'EXITOSO'
    );
    this.save(['promotions', 'trash'], adminEmail);
    return true;
  }

  // =========================================================================
  // PRODUCTS & INVENTORY MOVEMENTS MANAGEMENT
  // =========================================================================

  public recordInventoryMovement(
    productId: string,
    productReference: string,
    productName: string,
    type: InventoryMovement['type'],
    quantity: number,
    previousStock: number,
    newStock: number,
    reason: string,
    createdBy: string
  ): InventoryMovement {
    const mov: InventoryMovement = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId,
      productReference,
      productName,
      type,
      quantity,
      previousStock,
      newStock,
      reason,
      createdBy,
      createdAt: new Date().toISOString()
    };
    if (!this.data.inventoryMovements) this.data.inventoryMovements = [];
    this.data.inventoryMovements.unshift(mov);
    if (this.data.inventoryMovements.length > 500) {
      this.data.inventoryMovements = this.data.inventoryMovements.slice(0, 500);
    }
    return mov;
  }

  public getInventoryMovements(): InventoryMovement[] {
    return this.data.inventoryMovements || [];
  }

  public getProducts(search?: string, category?: string, status?: string): Product[] {
    this.evaluatePromotionsLifecycle();
    const nowMs = Date.now();
    let list = this.data.products.map(p => this.enrichProductWithPromotion(p, nowMs));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.reference.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (category && category !== 'Todas') {
      list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    if (status === 'active') {
      list = list.filter(p => p.isActive);
    } else if (status === 'inactive') {
      list = list.filter(p => !p.isActive);
    }

    return list;
  }

  public getProductById(idOrRef: string): Product | null {
    this.evaluatePromotionsLifecycle();
    const clean = idOrRef.trim().toLowerCase();
    const found = this.data.products.find(
      p => p.id === idOrRef || p.reference.toLowerCase() === clean
    );
    if (!found) return null;
    return this.enrichProductWithPromotion(found, Date.now());
  }

  public createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, actorEmail = 'Admin'): Product {
    const cleanRef = String(data.reference || '').trim().toUpperCase();
    if (!cleanRef) {
      throw new Error('La referencia del producto es obligatoria.');
    }
    const duplicate = this.data.products.find(p => p.reference.toUpperCase() === cleanRef);
    if (duplicate) {
      throw new Error(`Ya existe un producto registrado con la referencia "${cleanRef}" (${duplicate.name}).`);
    }

    const price = Number(data.priceCOP);
    if (isNaN(price) || price <= 0) {
      throw new Error('El precio normal debe ser un valor positivo mayor a 0.');
    }

    const now = new Date().toISOString();
    const images =
      Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : [generateProductSvgAsset(cleanRef, data.name, data.category, data.brand)];
    const initialStock = data.stock !== undefined ? Math.max(0, Math.round(Number(data.stock) || 0)) : 10;

    const condition: ProductCondition = data.condition || 'Nuevo';
    const defaultWarrantyPolicy =
      condition === 'Repuesto'
        ? 'pol_garantia_repuesto'
        : condition === 'Remanufacturado'
        ? 'pol_garantia_remanufacturado'
        : 'pol_garantia_nuevo';

    const product: Product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: String(data.name).trim(),
      reference: cleanRef,
      brand: String(data.brand || 'IPS PRO').trim(),
      model: String(data.model || cleanRef).trim(),
      condition,
      shortDescription: String(data.shortDescription || '').trim(),
      category: String(data.category || 'General').trim(),
      priceCOP: price,
      costCOP: data.costCOP !== undefined ? Math.max(0, Number(data.costCOP) || 0) : undefined,
      stock: initialStock,
      minStock: data.minStock !== undefined ? Math.max(0, Number(data.minStock) || 0) : 3,
      serialNumbers: Array.isArray(data.serialNumbers) ? data.serialNumbers : [],
      images,
      driveFileIds: Array.isArray(data.driveFileIds) ? data.driveFileIds : [],
      warrantyPolicyId: data.warrantyPolicyId || defaultWarrantyPolicy,
      shippingPolicyId: data.shippingPolicyId || 'pol_envio_nacional',
      shippingType: data.shippingType || 'Gratis',
      remanufacturedDetails: data.remanufacturedDetails,
      isActive: data.isActive !== false,
      createdAt: now,
      updatedAt: now,
      updatedBy: actorEmail
    };

    // If this reference was previously in trash, remove from trash
    if (this.data.trash) {
      this.data.trash = this.data.trash.filter(
        t => !(t.entityType === 'product' && t.data?.reference?.toUpperCase() === cleanRef)
      );
    }

    this.data.products.unshift(product);
    this.recordInventoryMovement(
      product.id,
      product.reference,
      product.name,
      'ENTRADA',
      initialStock,
      0,
      initialStock,
      'Ingreso inicial de producto al inventario',
      actorEmail
    );
    this.addAuditLog(
      actorEmail,
      'CREAR_PRODUCTO',
      `Agregó producto "${product.name}" (Ref: ${product.reference}) - Precio: $${product.priceCOP.toLocaleString('es-CO')} COP`,
      'EXITOSO'
    );
    this.save(['products', 'inventoryMovements', 'trash'], actorEmail);
    return this.enrichProductWithPromotion(product);
  }

  public updateProduct(
    id: string,
    data: Partial<Omit<Product, 'id' | 'createdAt'>>,
    actorEmail = 'Admin'
  ): Product | null {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const existing = this.data.products[idx];

    if (data.reference !== undefined) {
      const cleanRef = String(data.reference).trim().toUpperCase();
      if (!cleanRef) throw new Error('La referencia no puede estar vacía.');
      const duplicate = this.data.products.find(p => p.id !== id && p.reference.toUpperCase() === cleanRef);
      if (duplicate) {
        throw new Error(`La referencia "${cleanRef}" ya está asignada a otro producto (${duplicate.name}).`);
      }
      data.reference = cleanRef;
    }

    if (data.priceCOP !== undefined) {
      const price = Number(data.priceCOP);
      if (isNaN(price) || price <= 0) {
        throw new Error('El precio normal debe ser mayor a 0.');
      }
      data.priceCOP = price;
    }

    const { activePromotion, ...cleanUpdates } = data as any;
    const prevStock = existing.stock ?? 10;
    const nextStock =
      cleanUpdates.stock !== undefined ? Math.max(0, Math.round(Number(cleanUpdates.stock) || 0)) : prevStock;

    const updated: Product = {
      ...existing,
      ...cleanUpdates,
      stock: nextStock,
      images:
        Array.isArray(cleanUpdates.images) && cleanUpdates.images.length > 0
          ? cleanUpdates.images
          : existing.images?.length > 0
          ? existing.images
          : [
              generateProductSvgAsset(
                cleanUpdates.reference || existing.reference,
                cleanUpdates.name || existing.name,
                cleanUpdates.category || existing.category,
                cleanUpdates.brand || existing.brand
              )
            ],
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail
    };

    this.data.products[idx] = updated;
    // Archive any replaced images in Drive Media Vault so previous photos are never lost
    try {
      driveMediaVault.markProductPreviousAssetsArchived(updated.id, updated.images);
    } catch {}

    if (nextStock !== prevStock) {
      this.recordInventoryMovement(
        updated.id,
        updated.reference,
        updated.name,
        'AJUSTE',
        Math.abs(nextStock - prevStock),
        prevStock,
        nextStock,
        `Ajuste administrativo de existencias (${prevStock} -> ${nextStock})`,
        actorEmail
      );
    }

    this.addAuditLog(
      actorEmail,
      'EDITAR_PRODUCTO',
      `Actualizó producto "${updated.name}" (Ref: ${updated.reference}) - Precio: $${updated.priceCOP.toLocaleString('es-CO')} COP`,
      'EXITOSO'
    );
    this.save(['products', 'inventoryMovements'], actorEmail);
    return this.enrichProductWithPromotion(updated);
  }

  public deleteProduct(id: string, actorEmail = 'Admin'): boolean {
    const existing = this.data.products.find(p => p.id === id);
    if (!existing) return false;

    // Move product to Soft-Delete Trash (Papelera) so it can be recovered at any time
    this.moveToTrash(
      'product',
      existing.id,
      existing.name,
      `Ref: ${existing.reference} · $${existing.priceCOP.toLocaleString('es-CO')} COP`,
      existing,
      actorEmail
    );

    this.recordInventoryMovement(
      existing.id,
      existing.reference,
      existing.name,
      'ELIMINACION_LOGICA',
      existing.stock ?? 0,
      existing.stock ?? 0,
      0,
      'Producto enviado a la papelera de recuperación',
      actorEmail
    );

    this.data.products = this.data.products.filter(p => p.id !== id);
    if (this.data.promotions) {
      this.data.promotions = this.data.promotions.filter(pr => pr.targetProductId !== id);
    }
    this.addAuditLog(
      actorEmail,
      'ELIMINAR_PRODUCTO',
      `Envió producto a papelera "${existing.name}" (Ref: ${existing.reference})`,
      'EXITOSO'
    );
    this.save(['products', 'promotions', 'trash', 'inventoryMovements'], actorEmail);
    return true;
  }

  /**
   * Upserts products coming from Google Sheets sync without duplicating or deleting local products
   */
  public mergeProductsFromSheets(sheetProducts: Product[], actorEmail = 'Google Sheets Sync'): void {
    const trashIds = new Set(
      (this.data.trash || []).filter(t => t.entityType === 'product').map(t => t.entityId)
    );
    for (const sp of sheetProducts) {
      if (!sp || !sp.reference || trashIds.has(sp.id)) continue;
      const idx = this.data.products.findIndex(
        p => p.id === sp.id || p.reference.toUpperCase() === sp.reference.toUpperCase()
      );
      if (idx >= 0) {
        const local = this.data.products[idx];
        const sheetTime = new Date(sp.updatedAt || 0).getTime();
        const localTime = new Date(local.updatedAt || 0).getTime();
        if (sheetTime > localTime) {
          this.data.products[idx] = {
            ...local,
            ...sp,
            id: local.id,
            images: sp.images?.length > 0 ? sp.images : local.images
          };
        }
      } else {
        this.data.products.push({
          ...sp,
          images:
            sp.images?.length > 0
              ? sp.images
              : [generateProductSvgAsset(sp.reference, sp.name, sp.category, sp.brand || 'IPS PRO')]
        });
      }
    }
    this.save(['products'], actorEmail);
  }

  public bulkInsertProducts(items: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>, actorEmail = 'Admin'): number {
    const now = new Date().toISOString();
    let count = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const ref = String(item.reference || '').trim().toUpperCase();
      if (!ref || !item.name) continue;

      const existingIdx = this.data.products.findIndex(p => p.reference.toUpperCase() === ref);
      const images =
        Array.isArray(item.images) && item.images.length > 0
          ? item.images
          : [generateProductSvgAsset(ref, item.name, item.category || 'General', item.brand || 'IPS PRO')];

      if (existingIdx >= 0) {
        this.data.products[existingIdx] = {
          ...this.data.products[existingIdx],
          name: item.name,
          brand: item.brand || this.data.products[existingIdx].brand || 'IPS PRO',
          shortDescription: item.shortDescription || this.data.products[existingIdx].shortDescription,
          category: item.category || this.data.products[existingIdx].category,
          priceCOP: Number(item.priceCOP) > 0 ? Number(item.priceCOP) : this.data.products[existingIdx].priceCOP,
          stock: item.stock !== undefined ? Number(item.stock) : this.data.products[existingIdx].stock,
          isActive: item.isActive !== false,
          updatedAt: now,
          updatedBy: actorEmail
        };
      } else {
        this.data.products.unshift({
          ...item,
          id: `prod_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          reference: ref,
          brand: item.brand || 'IPS PRO',
          stock: item.stock !== undefined ? Number(item.stock) : 10,
          images,
          createdAt: now,
          updatedAt: now,
          updatedBy: actorEmail
        });
      }
      count++;
    }

    this.addAuditLog(actorEmail, 'IMPORTACION_MASIVA', `Importó/actualizó ${count} productos`, 'EXITOSO');
    this.save(['products'], actorEmail);
    return count;
  }

  public generateTestBatch(count: number, actorEmail = 'Admin'): Product[] {
    const sampleCategories = [
      'Portátiles y Cómputo',
      'Servidores y Redes',
      'Monitores y Pantallas',
      'Móviles y Tablets',
      'Audio y Streaming',
      'Accesorios y Periféricos',
      'Almacenamiento',
      'Seguridad y Vigilancia',
      'Componentes y Hardware'
    ];

    const techNames = [
      'Workstation Studio Pro Ultra',
      'Laptop Ultralight Executive Carbon',
      'Servidor Blade Cloud Dual EPYC',
      'Switch Troncal 10GbE Capa 3',
      'Firewall Perimetral NextGen',
      'Monitor IPS 4K 144Hz HDR1000',
      'Tableta de Diseño Digital Pro',
      'Smartphone Titan Rugged 5G',
      'Auriculares Wireless Noise Cancelling',
      'Micrófono de Estudio Podcast Pro',
      'Gabinete Insonorizado Full Tower',
      'Fuente de Poder 1200W Titanium',
      'Cámara de Videoconferencia PTZ 4K',
      'NAS Enterprise 8 Bahías RAID',
      'Unidad SSD PCIe 5.0 4TB NVMe',
      'Sistema de CCTV IA con NVR',
      'Teclado Ergonómico Magnético Hall',
      'Mouse Inalámbrico Óptico 26K DPI'
    ];

    const now = new Date().toISOString();
    const generated: Product[] = [];

    for (let i = 1; i <= count; i++) {
      const name = `${techNames[(i - 1) % techNames.length]} Mod.${i}`;
      const cat = sampleCategories[(i - 1) % sampleCategories.length];
      const ref = `IPS-TEST-${String(i).padStart(3, '0')}`;
      const price = 450000 + ((i * 370000) % 9500000);
      const imgUrl = generateProductSvgAsset(ref, name, cat, 'IPS ENTERPRISE');
      generated.push({
        id: `test_prod_${Date.now()}_${i}`,
        name,
        reference: ref,
        brand: 'IPS ENTERPRISE',
        shortDescription: `Especificación técnica certificada Mod.${i}. Rendimiento garantizado para entornos corporativos de alta demanda.`,
        category: cat,
        priceCOP: price,
        costCOP: Math.round(price * 0.78),
        stock: 15,
        images: [imgUrl],
        isActive: true,
        createdAt: now,
        updatedAt: now,
        updatedBy: actorEmail
      });
    }

    // Preserve existing products and append/update test products rather than wiping real products
    for (const gen of generated) {
      const existingIdx = this.data.products.findIndex(p => p.reference === gen.reference);
      if (existingIdx >= 0) {
        this.data.products[existingIdx] = gen;
      } else {
        this.data.products.push(gen);
      }
    }

    this.addAuditLog(actorEmail, 'LOTE_PRUEBA', `Generó lote de prueba de ${count} productos`, 'EXITOSO');
    this.save(['products'], actorEmail);
    return this.data.products.map(p => this.enrichProductWithPromotion(p));
  }

  // =========================================================================
  // ORDERS, WARRANTIES, CATALOGS & COMPANY
  // =========================================================================

  public getOrdersForCustomer(email: string): Order[] {
    const cleanEmail = email.toLowerCase().trim();
    return (this.data.orders || []).filter(o => o.customerEmail.toLowerCase().trim() === cleanEmail);
  }

  public getAllOrders(): Order[] {
    return this.data.orders || [];
  }

  public getOrders(): Order[] {
    return this.data.orders || [];
  }

  public createOrder(orderData: Omit<Order, 'id' | 'date'>): Order {
    const orderNumber = `PED-2026-${String((this.data.orders?.length || 0) + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    let discountAmountCOP = Number(orderData.discountAmountCOP) || 0;
    const rawSubtotal =
      orderData.subtotalCOP ||
      (orderData.items || []).reduce((acc, it) => acc + (Number(it.subtotalCOP) || 0), 0);

    if (orderData.discountCode) {
      const validation = this.validateDiscountCode(orderData.discountCode, rawSubtotal, orderData.items);
      if (validation.valid) {
        discountAmountCOP = validation.discountAmountCOP;
        this.consumeDiscountCode(
          orderData.discountCode,
          orderNumber,
          orderData.customerEmail,
          orderData.customerName,
          discountAmountCOP,
          rawSubtotal
        );
      }
    }

    const shippingCostCOP = Number(orderData.shippingCostCOP) || 0;
    const computedTotal = Math.max(0, rawSubtotal - discountAmountCOP + shippingCostCOP);

    const newOrder: Order = {
      ...orderData,
      id: orderNumber,
      date: now,
      updatedAt: now,
      subtotalCOP: rawSubtotal,
      discountAmountCOP,
      shippingCostCOP,
      totalCOP: orderData.totalCOP ? Number(orderData.totalCOP) : computedTotal,
      acceptedPolicyVersion: orderData.acceptedPolicyVersion || 'v2.4 (Ley 1480 de 2011)',
      acceptedPolicyAt: orderData.acceptedPolicyAt || now,
      customerEmail: orderData.customerEmail.toLowerCase().trim()
    };
    if (!this.data.orders) this.data.orders = [];
    this.data.orders.unshift(newOrder);

    // Deduct stock and generate automatic warranty record for each purchased product
    if (!this.data.warranties) this.data.warranties = [];
    for (const item of newOrder.items || []) {
      const prod = this.data.products.find(p => p.id === item.productId || p.reference === item.reference);
      const condition: ProductCondition = prod?.condition || item.condition || 'Nuevo';
      const warrantyMonths = condition === 'Repuesto' ? 6 : condition === 'Remanufacturado' ? 6 : 12;
      const warrantyType: WarrantyCategoryType =
        condition === 'Repuesto'
          ? 'Repuesto / Componente'
          : condition === 'Remanufacturado'
          ? 'Producto Remanufacturado'
          : 'Producto Nuevo';

      if (prod) {
        const prevStock = prod.stock ?? 10;
        const newStock = Math.max(0, prevStock - (Number(item.quantity) || 1));
        prod.stock = newStock;
        this.recordInventoryMovement(
          prod.id,
          prod.reference,
          prod.name,
          'SALIDA_VENTA',
          Number(item.quantity) || 1,
          prevStock,
          newStock,
          `Venta según pedido ${newOrder.id}`,
          newOrder.customerEmail
        );
      }

      const expDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * warrantyMonths).toISOString();
      const warId = `GAR-2026-${String(this.data.warranties.length + 1).padStart(3, '0')}`;
      this.data.warranties.unshift({
        id: warId,
        warrantyCode: warId,
        orderId: newOrder.id,
        productId: item.productId,
        productReference: item.reference,
        productName: item.name,
        serialNumber: `SN-IPS-${item.reference}-${Math.floor(100000 + Math.random() * 900000)}`,
        warrantyType,
        policyId: prod?.warrantyPolicyId || 'pol_garantia_nuevo',
        clientEmail: newOrder.customerEmail,
        clientName: newOrder.customerName,
        clientPhone: newOrder.customerPhone,
        startDate: now,
        endDate: expDate,
        monthsCoverage: warrantyMonths,
        status: 'Vigente',
        coverageTerms: `Garantía oficial de ${warrantyMonths} meses (${warrantyType}) respaldada por IPS TECNOLÓGICA conforme a la Ley 1480 de 2011.`,
        notes: `Garantía generada automáticamente con el pedido ${newOrder.id}.`,
        history: [
          {
            date: now,
            status: 'Vigente',
            actor: 'Sistema Automático',
            note: `Activación automática por compra (${newOrder.id})`
          }
        ],
        createdAt: now,
        updatedAt: now
      });
    }

    // Create initial Shipment tracking record linked to the order
    if (!this.data.shipments) this.data.shipments = [];
    const shipmentId = `env_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const newShipment: ShipmentRecord = {
      id: shipmentId,
      orderId: newOrder.id,
      clientName: newOrder.customerName,
      clientEmail: newOrder.customerEmail,
      clientPhone: newOrder.customerPhone,
      address: newOrder.shippingAddress || 'Por confirmar con el cliente',
      city: newOrder.shippingCity || 'Cali / Bogotá D.C.',
      department: newOrder.shippingDepartment || 'Valle del Cauca / Cundinamarca',
      carrier: newOrder.carrier || 'Por asignar (Servientrega / Coordinadora)',
      trackingNumber: newOrder.trackingNumber || 'PENDIENTE-GUIA',
      shippingType: shippingCostCOP > 0 ? 'Pagado por el cliente' : 'Gratis',
      shippingCostCOP,
      status: 'Pendiente de despacho',
      notes: newOrder.notes || 'Pedido pendiente de alistamiento y asignación de guía.',
      history: [
        {
          date: now,
          status: 'Pendiente de despacho',
          actor: newOrder.customerEmail,
          note: `Orden de despacho generada para el pedido ${newOrder.id}`
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    this.data.shipments.unshift(newShipment);
    newOrder.shipmentId = shipmentId;

    this.createAdminNotification({
      eventType: 'NUEVO_PEDIDO',
      title: `Nuevo pedido recibido: ${newOrder.id}`,
      message: `Cliente ${newOrder.customerName} (${newOrder.customerEmail}) registró el pedido ${newOrder.id} por $${newOrder.totalCOP.toLocaleString('es-CO')} COP.`,
      severity: 'success',
      relatedEntityId: newOrder.id,
      relatedModule: 'admin-orders'
    });

    this.createAdminNotification({
      eventType: 'ENVIO_PENDIENTE',
      title: `Envío pendiente de despacho: ${newOrder.id}`,
      message: `El pedido ${newOrder.id} requiere alistamiento y asignación de Número de Guía.`,
      severity: 'info',
      relatedEntityId: newOrder.id,
      relatedModule: 'warranties-shipping'
    });

    this.addAuditLog(
      newOrder.customerEmail,
      'CREAR_PEDIDO',
      `Pedido ${newOrder.id} por $${newOrder.totalCOP.toLocaleString('es-CO')} COP`,
      'EXITOSO'
    );

    if (this.isCatalogPublished()) {
      this.emitCustomerPushEvent({
        type: 'ORDER_STATUS',
        title: `🛍️ ¡Pedido ${newOrder.id} Recibido!`,
        body: `Hola ${newOrder.customerName}, tu pedido ${newOrder.id} por $${newOrder.totalCOP.toLocaleString('es-CO')} COP ha sido registrado con estado "${newOrder.status}".`,
        tag: `order_${newOrder.id}_${newOrder.status}`,
        url: `/?tab=my-account&order=${encodeURIComponent(newOrder.id)}`,
        targetAudience: 'specific_customer',
        targetCustomerEmail: newOrder.customerEmail,
        targetCustomerPhone: newOrder.customerPhone,
        targetOrderId: newOrder.id,
        orderStatus: newOrder.status,
        createdBy: newOrder.customerEmail
      });
    }

    this.save(['orders', 'products', 'warranties', 'inventoryMovements'], newOrder.customerEmail);
    return newOrder;
  }

  public updateOrderStatus(orderId: string, status: OrderStatus, actorEmail = 'Admin'): Order | null {
    if (!this.data.orders) return null;
    const order = this.data.orders.find(o => o.id === orderId);
    if (!order) return null;
    const prevStatus = order.status;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    order.updatedBy = actorEmail;
    this.addAuditLog(actorEmail, 'ESTADO_PEDIDO', `Actualizó estado de ${orderId} a ${status}`, 'EXITOSO');

    if (prevStatus !== status && this.isCatalogPublished()) {
      const statusDescriptions: Record<OrderStatus, string> = {
        Pendiente: 'se encuentra pendiente de verificación',
        Confirmado: 'ha sido confirmado por nuestro equipo comercial',
        Pagado: 'registró su pago exitosamente y pasa a alistamiento',
        'En preparación': 'se encuentra en preparación y empaque en laboratorio',
        Enviado: `ha sido despachado${order.trackingNumber ? ` con guía ${order.carrier || ''}: ${order.trackingNumber}` : ''}`,
        Entregado: 'fue entregado satisfactoriamente. ¡Gracias por tu compra!',
        Cancelado: 'ha sido cancelado. Contáctanos por WhatsApp si tienes dudas'
      };
      this.emitCustomerPushEvent({
        type: 'ORDER_STATUS',
        title: `📦 Pedido ${order.id}: ${status}`,
        body: `Hola ${order.customerName}, tu pedido ${order.id} ($${order.totalCOP.toLocaleString('es-CO')} COP) ${statusDescriptions[status] || `cambió a estado ${status}`}.`,
        tag: `order_${order.id}_${status}_${Date.now()}`,
        url: `/?tab=my-account&order=${encodeURIComponent(order.id)}`,
        targetAudience: 'specific_customer',
        targetCustomerEmail: order.customerEmail,
        targetCustomerPhone: order.customerPhone,
        targetOrderId: order.id,
        orderStatus: status,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        createdBy: actorEmail
      });
    }

    this.save(['orders'], actorEmail);
    return order;
  }

  public getWarrantiesForClient(email: string): WarrantyRecord[] {
    const clean = (email || '').toLowerCase().trim();
    return (this.data.warranties || []).filter(
      w => (w.clientEmail || (w as any).customerEmail || '').toLowerCase().trim() === clean
    );
  }

  public getWarrantiesForCustomer(email: string): WarrantyRecord[] {
    return this.getWarrantiesForClient(email);
  }

  public getWarranties(): WarrantyRecord[] {
    return this.data.warranties || [];
  }

  public getAllWarranties(): WarrantyRecord[] {
    return this.data.warranties || [];
  }

  public createWarranty(input: Partial<WarrantyRecord>, actorEmail = 'Admin'): WarrantyRecord {
    if (!this.data.warranties) this.data.warranties = [];
    const now = new Date().toISOString();
    const warId = `GAR-2026-${String(this.data.warranties.length + 1).padStart(3, '0')}`;
    const months = Number(input.monthsCoverage) || 12;
    const endDate =
      input.endDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * months).toISOString();

    const record: WarrantyRecord = {
      id: warId,
      warrantyCode: input.warrantyCode || warId,
      orderId: input.orderId,
      serviceTicketNumber: input.serviceTicketNumber,
      productId: input.productId,
      productReference: input.productReference || 'GEN-IPS',
      productName: input.productName || 'Producto / Servicio IPS TECNOLÓGICA',
      serialNumber: input.serialNumber || `SN-IPS-${Date.now()}`,
      clientName: input.clientName || 'Cliente',
      clientEmail: (input.clientEmail || '').toLowerCase().trim(),
      clientPhone: input.clientPhone || '',
      startDate: input.startDate || now,
      endDate,
      monthsCoverage: months,
      status: input.status || 'Vigente',
      coverageTerms: input.coverageTerms || 'Garantía oficial respaldada por IPS TECNOLÓGICA.',
      notes: input.notes || '',
      createdAt: now,
      updatedAt: now
    };

    this.data.warranties.unshift(record);
    this.addAuditLog(actorEmail, 'REGISTRAR_GARANTIA', `Registró garantía ${record.warrantyCode} para ${record.clientName}`, 'EXITOSO');
    this.save(['warranties'], actorEmail);
    return record;
  }

  public getCompany(): CompanyProfile {
    if (!this.data.company.logoUrl) {
      this.data.company.logoUrl = defaultLogoUrl;
    }
    return this.data.company;
  }

  public updateCompany(profile: Partial<CompanyProfile>, actorEmail = 'Admin'): CompanyProfile {
    this.data.company = {
      ...this.data.company,
      ...profile,
      social: { ...this.data.company.social, ...(profile.social || {}) },
      colors: { ...this.data.company.colors, ...(profile.colors || {}) }
    };
    this.addAuditLog(
      actorEmail,
      'ACTUALIZAR_EMPRESA',
      `Actualizó configuración corporativa de ${this.data.company.name}`,
      'EXITOSO'
    );
    this.save(['company'], actorEmail);
    return this.data.company;
  }

  public getCatalogs(): SavedCatalogRecord[] {
    return this.data.catalogs || [];
  }

  public addCatalogRecord(record: Omit<SavedCatalogRecord, 'id' | 'date'>): SavedCatalogRecord {
    const newRec: SavedCatalogRecord = {
      ...record,
      id: `cat_${Date.now()}`,
      date: new Date().toISOString()
    };
    if (!this.data.catalogs) this.data.catalogs = [];
    this.data.catalogs.unshift(newRec);
    this.save(['catalogs'], record.createdBy || 'Admin');
    return newRec;
  }

  // =========================================================================
  // TECHNICAL SUPPORT & APPOINTMENTS (MÓDULO DE SOPORTE TÉCNICO Y AGENDAMIENTO)
  // =========================================================================

  /**
   * Checks if a technician already has an active appointment at the given date & time window.
   */
  public checkTechnicianSlotAvailability(
    date: string,
    time: string,
    durationMinutes = 60,
    technicianId?: string,
    excludeServiceId?: string
  ): { available: boolean; assignedTech: { id: string; name: string; email: string } | null; conflictReason?: string } {
    const technicians = this.getTechnicians();
    const parseMinutes = (hhmm: string): number => {
      const [h, m] = String(hhmm || '09:00').split(':').map(Number);
      return (h || 9) * 60 + (m || 0);
    };

    const reqStart = parseMinutes(time);
    const reqEnd = reqStart + (Number(durationMinutes) || 60);

    const activeAppointmentsOnDate = (this.data.appointments || []).filter(
      a =>
        a.date === date &&
        a.status !== 'Cancelada' &&
        (!excludeServiceId || (a.serviceId !== excludeServiceId && a.ticketNumber !== excludeServiceId))
    );

    const hasConflictForTech = (techId: string): boolean => {
      return activeAppointmentsOnDate.some(a => {
        if (a.technicianId !== techId) return false;
        const aStart = parseMinutes(a.time);
        const aEnd = aStart + (a.durationMinutes || 60);
        return reqStart < aEnd && reqEnd > aStart;
      });
    };

    if (technicianId) {
      const tech = technicians.find(t => t.id === technicianId || t.email === technicianId);
      if (!tech) {
        return { available: false, assignedTech: null, conflictReason: 'El técnico seleccionado no existe o no está activo.' };
      }
      if (hasConflictForTech(tech.id)) {
        return {
          available: false,
          assignedTech: null,
          conflictReason: `El técnico ${tech.name} ya tiene una cita programada en el horario ${date} ${time}.`
        };
      }
      return { available: true, assignedTech: { id: tech.id, name: tech.name, email: tech.email } };
    }

    const sortedTechs = [...technicians].sort((a, b) => (a.role === 'Técnico' ? -1 : b.role === 'Técnico' ? 1 : 0));
    for (const tech of sortedTechs) {
      if (!hasConflictForTech(tech.id)) {
        return { available: true, assignedTech: { id: tech.id, name: tech.name, email: tech.email } };
      }
    }

    return {
      available: false,
      assignedTech: null,
      conflictReason: `Todos los técnicos se encuentran ocupados en el horario ${date} a las ${time}. Por favor seleccione otra hora.`
    };
  }

  public getAvailableSlotsForDate(
    date: string,
    technicianId?: string
  ): Array<{ time: string; available: boolean; reason?: string }> {
    const standardSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
    return standardSlots.map(time => {
      const check = this.checkTechnicianSlotAvailability(date, time, 60, technicianId);
      return {
        time,
        available: check.available,
        reason: check.available ? undefined : check.conflictReason
      };
    });
  }

  public getTechnicalServices(): TechnicalServiceRequest[] {
    return this.data.technicalServices || [];
  }

  public getTechnicalServicesForClient(email: string, userId?: string): TechnicalServiceRequest[] {
    const cleanEmail = (email || '').toLowerCase().trim();
    return (this.data.technicalServices || []).filter(t => {
      const tEmail = (t.clientEmail || (t as any).customerEmail || '').toLowerCase().trim();
      return (cleanEmail && tEmail === cleanEmail) || (userId && t.clientId === userId);
    });
  }

  public getTechnicalServiceByTicket(ticketNumber: string): TechnicalServiceRequest | null {
    const clean = (ticketNumber || '').trim().toUpperCase();
    return (
      (this.data.technicalServices || []).find(
        t => (t.ticketNumber || t.id || '').toUpperCase() === clean || t.id.toUpperCase() === clean
      ) || null
    );
  }

  public getTechnicalServiceById(id: string): TechnicalServiceRequest | null {
    const clean = (id || '').trim().toUpperCase();
    return (
      (this.data.technicalServices || []).find(
        t => t.id.toUpperCase() === clean || (t.ticketNumber || '').toUpperCase() === clean
      ) || null
    );
  }

  public createTechnicalService(
    input: Partial<TechnicalServiceRequest> & { allowAdminTechnicianAssignment?: boolean },
    actorEmail?: string
  ): TechnicalServiceRequest {
    const clientName = (input.clientName || (input as any).customerName || '').trim();
    const clientPhone = (input.clientPhone || (input as any).customerPhone || '').trim();
    const clientEmail = (input.clientEmail || (input as any).customerEmail || '').toLowerCase().trim();
    const serviceType = (input.serviceType || 'Mantenimiento de computadores').trim();
    const problemDescription = (input.problemDescription || '').trim();

    if (!clientName || !clientPhone || !serviceType || !problemDescription) {
      throw new Error('Nombre completo, teléfono/WhatsApp, tipo de servicio y descripción del problema son obligatorios.');
    }

    const modality: TechnicalServiceModality = (input.modality as TechnicalServiceModality) || 'En sede';
    if ((modality === 'A domicilio' || modality === 'Domicilio' || modality === 'Servicio a domicilio') && !input.address?.trim()) {
      throw new Error('La dirección es obligatoria cuando solicita servicio técnico a domicilio.');
    }

    const appointmentDate =
      input.appointmentDate ||
      (input as any).preferredDate ||
      new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const appointmentTime = input.appointmentTime || (input as any).preferredTime || '09:00';
    const durationMinutes = Number(input.durationMinutes) || 60;

    const parseMinutes = (hhmm: string): number => {
      const [h, m] = String(hhmm || '09:00').split(':').map(Number);
      return (h || 9) * 60 + (m || 0);
    };
    const formatMinutes = (mins: number): string => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    const appointmentEndTime =
      input.appointmentEndTime || formatMinutes(parseMinutes(appointmentTime) + durationMinutes);

    // CRITICAL RULE (Sections 6 & 7): Customers NEVER select technicians.
    // Only if an Admin explicitly assigns a technician (`allowAdminTechnicianAssignment === true` and `assignedTechnicianId` provided) do we assign & validate conflict.
    let assignedTechnicianId: string | undefined;
    let assignedTechnicianName: string | undefined;
    let assignedTechnicianEmail: string | undefined;
    let initialStatus: TechnicalServiceStatus = 'Pendiente de asignación';

    if (input.allowAdminTechnicianAssignment && input.assignedTechnicianId) {
      const availability = this.checkTechnicianSlotAvailability(
        appointmentDate,
        appointmentTime,
        durationMinutes,
        input.assignedTechnicianId
      );
      if (!availability.available || !availability.assignedTech) {
        throw new Error(
          availability.conflictReason ||
            'El técnico seleccionado ya tiene otra cita asignada en este horario. No se permiten dos citas simultáneas.'
        );
      }
      assignedTechnicianId = availability.assignedTech.id;
      assignedTechnicianName = availability.assignedTech.name;
      assignedTechnicianEmail = availability.assignedTech.email;
      initialStatus = input.status || 'Asignada';
    }

    const now = new Date().toISOString();
    const seq = (this.data.technicalServices?.length || 0) + 1;
    const ticketNumber = `SRV-2026-${String(seq).padStart(4, '0')}`;
    const serviceId = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const appointmentId = `CIT-2026-${String((this.data.appointments?.length || 0) + 1).padStart(4, '0')}`;

    const created: TechnicalServiceRequest = {
      id: serviceId,
      ticketNumber,
      clientId: input.clientId,
      clientName,
      clientPhone,
      clientEmail,
      companyName: input.companyName?.trim() || undefined,
      serviceType,
      equipmentType: (input.equipmentType || 'Computador / Equipo').trim(),
      equipmentBrand: (input.equipmentBrand || '').trim(),
      equipmentModel: (input.equipmentModel || '').trim(),
      serialNumber: input.serialNumber?.trim() || undefined,
      problemDescription,
      observations: (input.observations || '').trim() || undefined,
      photos: Array.isArray(input.photos) ? input.photos : [],
      modality,
      address: input.address?.trim() || undefined,
      city: input.city?.trim() || 'Cali, Valle del Cauca',
      appointmentDate,
      appointmentTime,
      appointmentEndTime,
      durationMinutes,
      priority: input.priority || 'Media',
      status: initialStatus,
      assignedTechnicianId,
      assignedTechnicianName,
      assignedTechnicianEmail,
      diagnosis: '',
      technicalObservations: (input.observations || '').trim(),
      activitiesPerformed: '',
      spareParts: [],
      sparePartsUsed: [],
      laborCostCOP: 0,
      partsCostCOP: 0,
      totalCostCOP: 0,
      beforePhotos: [],
      afterPhotos: [],
      serviceWarrantyText: 'Garantía de 90 días sobre mano de obra y soporte técnico.',
      scheduleHistory: [
        {
          date: now,
          action: assignedTechnicianId ? 'SOLICITUD_Y_ASIGNACION' : 'SOLICITUD_RECIBIDA',
          actor: actorEmail || clientEmail || clientName,
          note: assignedTechnicianId
            ? `Solicitud creada y asignada al técnico ${assignedTechnicianName} (${appointmentDate} ${appointmentTime}-${appointmentEndTime}).`
            : `Solicitud recibida desde Agenda tu Servicio Técnico. Fecha preferida: ${appointmentDate} ${appointmentTime}. Pendiente de asignación por Administración.`
        }
      ],
      createdAt: now,
      updatedAt: now,
      updatedBy: actorEmail || clientEmail || 'Cliente'
    };

    const appointment: TechnicalAppointment = {
      id: appointmentId,
      serviceId: created.id,
      ticketNumber: created.ticketNumber,
      clientName: created.clientName,
      clientPhone: created.clientPhone,
      clientEmail: created.clientEmail,
      serviceType: created.serviceType,
      modality: created.modality,
      address: created.address,
      date: appointmentDate,
      time: appointmentTime,
      durationMinutes,
      technicianId: assignedTechnicianId,
      technicianName: assignedTechnicianName || 'Pendiente de asignar',
      technicianEmail: assignedTechnicianEmail,
      status: assignedTechnicianId ? 'Confirmada' : 'Pendiente',
      notes: created.problemDescription,
      createdAt: now,
      updatedAt: now
    };

    if (!this.data.technicalServices) this.data.technicalServices = [];
    if (!this.data.appointments) this.data.appointments = [];
    this.data.technicalServices.unshift(created);
    this.data.appointments.unshift(appointment);

    this.createAdminNotification({
      eventType: 'NUEVA_CITA',
      title: `Nueva solicitud de servicio técnico ${created.ticketNumber}`,
      message: `${created.clientName} solicitó "${created.serviceType}" (${created.modality}) para el ${appointmentDate} a las ${appointmentTime}. Estado: ${created.status}.`,
      severity: 'info',
      relatedEntityId: created.id,
      relatedModule: 'admin-support'
    });

    this.addAuditLog(
      actorEmail || clientEmail || clientName,
      'CREAR_SERVICIO_TECNICO',
      `Solicitud ${created.ticketNumber} y cita ${appointment.id} registradas para ${created.clientName} (${appointmentDate} ${appointmentTime})`,
      'EXITOSO'
    );
    this.save(['technicalServices', 'appointments'], actorEmail || clientEmail || 'Sistema');
    return created;
  }

  public updateTechnicalService(
    id: string,
    updates: Partial<TechnicalServiceRequest> & { scheduleNote?: string },
    actorEmail = 'Admin'
  ): TechnicalServiceRequest {
    if (!this.data.technicalServices) this.data.technicalServices = [];
    const idx = this.data.technicalServices.findIndex(
      t => t.id === id || t.ticketNumber.toUpperCase() === id.toUpperCase()
    );
    if (idx === -1) throw new Error('Orden de servicio técnico no encontrada.');

    const existing = this.data.technicalServices[idx];
    const nextDate = updates.appointmentDate || existing.appointmentDate;
    const nextTime = updates.appointmentTime || existing.appointmentTime;
    const nextTechId =
      updates.assignedTechnicianId !== undefined ? updates.assignedTechnicianId : existing.assignedTechnicianId;

    const parseMinutes = (hhmm: string): number => {
      const [h, m] = String(hhmm || '09:00').split(':').map(Number);
      return (h || 9) * 60 + (m || 0);
    };
    const formatMinutes = (mins: number): string => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    let nextDuration = Number(updates.durationMinutes || existing.durationMinutes || 60);
    if (updates.appointmentEndTime && nextTime) {
      const diff = parseMinutes(updates.appointmentEndTime) - parseMinutes(nextTime);
      if (diff > 0) nextDuration = diff;
    }
    const nextEndTime =
      updates.appointmentEndTime ||
      (nextTime ? formatMinutes(parseMinutes(nextTime) + nextDuration) : existing.appointmentEndTime);

    const isCancelled = updates.status === 'Cancelado' || updates.status === 'Cancelada';

    // Mandatory Validation (Section 7): A technician CANNOT have two simultaneous appointments.
    if (
      !isCancelled &&
      nextTechId &&
      nextDate &&
      nextTime &&
      ((updates.appointmentDate && updates.appointmentDate !== existing.appointmentDate) ||
        (updates.appointmentTime && updates.appointmentTime !== existing.appointmentTime) ||
        (updates.appointmentEndTime && updates.appointmentEndTime !== existing.appointmentEndTime) ||
        (updates.durationMinutes && updates.durationMinutes !== existing.durationMinutes) ||
        (updates.assignedTechnicianId && updates.assignedTechnicianId !== existing.assignedTechnicianId))
    ) {
      const check = this.checkTechnicianSlotAvailability(
        nextDate,
        nextTime,
        nextDuration,
        nextTechId,
        existing.id
      );
      if (!check.available) {
        throw new Error(
          check.conflictReason ||
            'Conflicto de horario: el técnico seleccionado ya tiene otra cita asignada en ese rango de fecha y hora.'
        );
      }
      if (check.assignedTech) {
        updates.assignedTechnicianId = check.assignedTech.id;
        updates.assignedTechnicianName = check.assignedTech.name;
        updates.assignedTechnicianEmail = check.assignedTech.email;
      }
    }

    const sparePartsUsed: SparePartItem[] = Array.isArray(updates.spareParts)
      ? updates.spareParts
      : Array.isArray(updates.sparePartsUsed)
      ? updates.sparePartsUsed
      : existing.spareParts || existing.sparePartsUsed || [];

    const partsCostCOP =
      updates.partsCostCOP !== undefined
        ? Math.max(0, Number(updates.partsCostCOP) || 0)
        : sparePartsUsed.reduce(
            (acc: number, sp: SparePartItem) =>
              acc +
              (Number(sp.subtotalCOP) ||
                (Number(sp.unitPriceCOP ?? sp.unitCostCOP) || 0) * (Number(sp.quantity) || 1)),
            0
          );

    const laborCostCOP =
      updates.laborCostCOP !== undefined ? Math.max(0, Number(updates.laborCostCOP) || 0) : existing.laborCostCOP || 0;
    const totalCostCOP = laborCostCOP + partsCostCOP;

    const now = new Date().toISOString();
    const scheduleHistory = Array.isArray(existing.scheduleHistory) ? [...existing.scheduleHistory] : [];
    if (
      updates.assignedTechnicianId !== existing.assignedTechnicianId ||
      updates.appointmentDate !== existing.appointmentDate ||
      updates.appointmentTime !== existing.appointmentTime ||
      updates.status !== existing.status
    ) {
      scheduleHistory.unshift({
        date: now,
        action: updates.status || 'ACTUALIZACION_AGENDA',
        actor: actorEmail,
        note:
          updates.scheduleNote ||
          `Estado: ${updates.status || existing.status} · Técnico: ${
            updates.assignedTechnicianName || existing.assignedTechnicianName || 'Sin asignar'
          } · Horario: ${nextDate || ''} ${nextTime || ''}-${nextEndTime || ''}`
      });
    }

    const updated: TechnicalServiceRequest = {
      ...existing,
      ...updates,
      id: existing.id,
      ticketNumber: existing.ticketNumber,
      appointmentEndTime: nextEndTime,
      durationMinutes: nextDuration,
      spareParts: sparePartsUsed,
      sparePartsUsed,
      laborCostCOP,
      partsCostCOP,
      totalCostCOP,
      scheduleHistory,
      updatedAt: now,
      updatedBy: actorEmail
    };

    this.data.technicalServices[idx] = updated;

    const apptIdx = (this.data.appointments || []).findIndex(
      a => a.serviceId === existing.id || (a.ticketNumber || a.serviceTicketNumber) === existing.ticketNumber
    );
    if (apptIdx !== -1 && this.data.appointments) {
      const appt = this.data.appointments[apptIdx];
      let apptStatus = appt.status;
      if (updated.status === 'Cancelado' || updated.status === 'Cancelada') apptStatus = 'Cancelada';
      else if (
        updated.status === 'Servicio finalizado' ||
        updated.status === 'Finalizado' ||
        updated.status === 'Finalizada' ||
        updated.status === 'Entregado'
      ) {
        apptStatus = 'Completada';
      } else if (
        updated.appointmentDate !== existing.appointmentDate ||
        updated.appointmentTime !== existing.appointmentTime
      ) {
        apptStatus = 'Reprogramada';
      } else if (updated.assignedTechnicianId) {
        apptStatus = 'Confirmada';
      }

      this.data.appointments[apptIdx] = {
        ...appt,
        date: updated.appointmentDate || appt.date,
        time: updated.appointmentTime || appt.time,
        durationMinutes: nextDuration,
        technicianId: updated.assignedTechnicianId || appt.technicianId,
        technicianName: updated.assignedTechnicianName || appt.technicianName || 'Pendiente de asignar',
        technicianEmail: updated.assignedTechnicianEmail || appt.technicianEmail,
        status: apptStatus,
        googleCalendarEventId: updated.googleCalendarEventId || appt.googleCalendarEventId,
        updatedAt: now
      };
    }

    this.addAuditLog(
      actorEmail,
      'ACTUALIZAR_SERVICIO_TECNICO',
      `Actualizó orden ${updated.ticketNumber} (Estado: ${updated.status}, Técnico: ${updated.assignedTechnicianName || 'Sin asignar'}, Total: $${updated.totalCostCOP.toLocaleString('es-CO')} COP)`,
      'EXITOSO'
    );
    this.save(['technicalServices', 'appointments'], actorEmail);
    return updated;
  }

  /**
   * Returns complete technician workload, specialty, occupied slots, and availability for Admin Only (Section 7).
   */
  public getTechniciansWorkloadOverview(dateFilter?: string): Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    specialty: string;
    isActive: boolean;
    activeTicketsCount: number;
    todayAppointmentsCount: number;
    occupiedSlots: Array<{
      ticketNumber: string;
      serviceId: string;
      clientName: string;
      serviceType: string;
      modality: string;
      date: string;
      startTime: string;
      endTime: string;
      status: string;
    }>;
  }> {
    const techs = this.getTechnicians();
    const allTickets = this.getTechnicalServices();
    const targetDate = dateFilter || new Date().toISOString().slice(0, 10);

    return techs.map((t, index) => {
      let specialty = 'Soporte Técnico Integral, Portátiles y Mantenimiento';
      if (t.name.toLowerCase().includes('redes') || t.name.toLowerCase().includes('diego')) {
        specialty = 'Servidores, Redes Corporativas, CCTV IP y Cableado Estructurado';
      } else if (t.name.toLowerCase().includes('andrés') || t.name.toLowerCase().includes('rojas')) {
        specialty = 'Workstations, Portátiles, Electrónica de Laboratorio y Actualización SSD/RAM';
      } else if (index % 2 === 1) {
        specialty = 'Diagnóstico Avanzado, Impresoras y Soporte a Domicilio';
      }

      const techTickets = allTickets.filter(
        srv =>
          (srv.assignedTechnicianId === t.id ||
            (srv.assignedTechnicianEmail || '').toLowerCase() === t.email.toLowerCase()) &&
          srv.status !== 'Cancelado' &&
          srv.status !== 'Cancelada' &&
          srv.status !== 'Finalizado' &&
          srv.status !== 'Finalizada' &&
          srv.status !== 'Servicio finalizado' &&
          srv.status !== 'Entregado'
      );

      const occupiedSlots = techTickets
        .filter(srv => !dateFilter || srv.appointmentDate === targetDate)
        .map(srv => ({
          ticketNumber: srv.ticketNumber,
          serviceId: srv.id,
          clientName: srv.clientName,
          serviceType: srv.serviceType,
          modality: srv.modality,
          date: srv.appointmentDate || targetDate,
          startTime: srv.appointmentTime || '09:00',
          endTime: srv.appointmentEndTime || '10:00',
          status: srv.status
        }))
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));

      return {
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone || '+57 310 894 7231',
        specialty,
        isActive: t.isActive !== false,
        activeTicketsCount: techTickets.length,
        todayAppointmentsCount: techTickets.filter(s => s.appointmentDate === targetDate).length,
        occupiedSlots
      };
    });
  }

  public deleteTechnicalService(id: string, actorEmail = 'Admin'): boolean {
    if (!this.data.technicalServices) return false;
    const existing = this.data.technicalServices.find(
      t => t.id === id || t.ticketNumber.toUpperCase() === id.toUpperCase()
    );
    if (!existing) return false;

    this.moveToTrash(
      'technical_service',
      existing.id,
      `${existing.ticketNumber} · ${existing.serviceType}`,
      `${existing.clientName} (${existing.equipmentBrand} ${existing.equipmentModel})`,
      existing,
      actorEmail
    );

    this.data.technicalServices = this.data.technicalServices.filter(t => t.id !== existing.id);
    if (this.data.appointments) {
      this.data.appointments = this.data.appointments.filter(
        a => a.serviceId !== existing.id && (a.ticketNumber || a.serviceTicketNumber) !== existing.ticketNumber
      );
    }

    this.addAuditLog(
      actorEmail,
      'ELIMINAR_SERVICIO_TECNICO',
      `Envió orden de servicio ${existing.ticketNumber} a la Papelera`,
      'EXITOSO'
    );
    this.save(['technicalServices', 'appointments', 'trash'], actorEmail);
    return true;
  }

  public getAppointments(): TechnicalAppointment[] {
    return this.data.appointments || [];
  }

  public getAppointmentsForClient(email: string, userId?: string): TechnicalAppointment[] {
    const cleanEmail = (email || '').toLowerCase().trim();
    const clientTickets = new Set(
      this.getTechnicalServicesForClient(email, userId).map(t => t.ticketNumber)
    );
    return (this.data.appointments || []).filter(a => {
      const aEmail = (a.clientEmail || (a as any).customerEmail || '').toLowerCase().trim();
      const ticketKey = a.ticketNumber || a.serviceTicketNumber || '';
      return (cleanEmail && aEmail === cleanEmail) || (ticketKey !== '' && clientTickets.has(ticketKey));
    });
  }

  // =========================================================================
  // SOFT DELETE TRASH (PAPELERA DE RECUPERACIÓN)
  // =========================================================================

  private moveToTrash(
    entityType: TrashItem['entityType'],
    entityId: string,
    title: string,
    subtitle: string,
    data: any,
    deletedBy: string
  ): void {
    if (!this.data.trash) this.data.trash = [];
    this.data.trash = this.data.trash.filter(t => !(t.entityType === entityType && t.entityId === entityId));
    this.data.trash.unshift({
      id: `trash_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      entityType,
      entityId,
      name: title,
      reference: subtitle,
      title,
      subtitle,
      deletedAt: new Date().toISOString(),
      deletedBy,
      payload: data,
      data
    });
  }

  public getTrashItems(): TrashItem[] {
    return (this.data.trash || []).map(t => ({
      ...t,
      name: t.name || t.title || 'Registro eliminado',
      reference: t.reference || t.subtitle,
      payload: t.payload || t.data
    }));
  }

  public restoreTrashItem(
    trashId: string,
    actorEmail = 'Admin'
  ): { success: boolean; message: string; restoredType?: string; item?: any } {
    if (!this.data.trash || this.data.trash.length === 0) {
      return { success: false, message: 'La papelera está vacía.' };
    }
    const idx = this.data.trash.findIndex(t => t.id === trashId || t.entityId === trashId);
    if (idx === -1) {
      return { success: false, message: 'Elemento no encontrado en la papelera.' };
    }

    const trashItem = this.data.trash[idx];
    const itemData = trashItem.payload || trashItem.data;
    this.data.trash.splice(idx, 1);

    if (trashItem.entityType === 'product') {
      const prod: Product = {
        ...itemData,
        updatedAt: new Date().toISOString(),
        updatedBy: actorEmail
      };
      this.data.products = this.data.products.filter(p => p.id !== prod.id && p.reference !== prod.reference);
      this.data.products.unshift(prod);
      this.recordInventoryMovement(
        prod.id,
        prod.reference,
        prod.name,
        'RESTAURACION',
        prod.stock ?? 10,
        0,
        prod.stock ?? 10,
        'Producto recuperado desde la papelera del sistema',
        actorEmail
      );
      this.addAuditLog(actorEmail, 'RECUPERAR_PRODUCTO', `Recuperó producto eliminado "${prod.name}" (${prod.reference})`, 'EXITOSO');
      this.save(['products', 'trash', 'inventoryMovements'], actorEmail);
      return {
        success: true,
        message: `Producto "${prod.name}" (${prod.reference}) restaurado exitosamente al catálogo activo.`,
        restoredType: 'product',
        item: prod
      };
    }

    if (trashItem.entityType === 'user') {
      const u: User = {
        ...itemData,
        isActive: true,
        status: 'Activo',
        updatedAt: new Date().toISOString(),
        updatedBy: actorEmail
      };
      this.data.users = this.data.users.filter(existing => existing.id !== u.id && existing.email !== u.email);
      this.data.users.push(u);
      this.addAuditLog(actorEmail, 'RECUPERAR_USUARIO', `Recuperó usuario eliminado "${u.name}" (${u.email})`, 'EXITOSO');
      this.save(['users', 'trash'], actorEmail);
      return {
        success: true,
        message: `Usuario "${u.name}" (${u.email}) restaurado exitosamente.`,
        restoredType: 'user',
        item: u
      };
    }

    if (trashItem.entityType === 'promotion') {
      const pr: Promotion = {
        ...itemData,
        updatedAt: new Date().toISOString()
      };
      if (!this.data.promotions) this.data.promotions = [];
      this.data.promotions.unshift(pr);
      this.addAuditLog(actorEmail, 'RECUPERAR_PROMOCION', `Recuperó promoción "${pr.name}"`, 'EXITOSO');
      this.save(['promotions', 'trash'], actorEmail);
      return {
        success: true,
        message: `Promoción "${pr.name}" restaurada exitosamente.`,
        restoredType: 'promotion',
        item: pr
      };
    }

    if (trashItem.entityType === 'technical_service') {
      const srv: TechnicalServiceRequest = {
        ...itemData,
        updatedAt: new Date().toISOString(),
        updatedBy: actorEmail
      };
      if (!this.data.technicalServices) this.data.technicalServices = [];
      this.data.technicalServices.unshift(srv);
      this.save(['technicalServices', 'trash'], actorEmail);
      return {
        success: true,
        message: `Orden de servicio "${srv.ticketNumber}" restaurada exitosamente.`,
        restoredType: 'technical_service',
        item: srv
      };
    }

    this.save(['trash'], actorEmail);
    return {
      success: true,
      message: 'Elemento restaurado exitosamente desde la Papelera.',
      restoredType: trashItem.entityType,
      item: itemData
    };
  }

  // =========================================================================
  // INTEGRAL BACKUP & RECOVERY SYSTEM (RESPALDOS Y RECUPERACIÓN)
  // =========================================================================

  public createSystemBackup(
    optsOrType:
      | {
          type?: BackupType;
          moduleScope?: BackupModuleScope;
          createdBy?: string;
          notes?: string;
          driveFileId?: string;
          driveLink?: string;
        }
      | BackupType = {},
    customName?: string,
    actorEmailArg = 'Sistema'
  ): BackupRecordMeta {
    const isObj = typeof optsOrType === 'object' && optsOrType !== null;
    const type: BackupType = isObj ? optsOrType.type || 'manual' : optsOrType || 'manual';
    const moduleScope: BackupModuleScope = isObj
      ? optsOrType.moduleScope || 'completo'
      : (optsOrType as any) || 'completo';
    const actorEmail = isObj ? optsOrType.createdBy || actorEmailArg : actorEmailArg;
    const notes = isObj ? optsOrType.notes || customName : customName;

    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    const fileName = `IPS_RESPALDO_${moduleScope.toUpperCase()}_${stamp}.json`;
    const localFilePath = path.join(BACKUPS_DIR, fileName);

    const uploadedFiles = fs.existsSync(UPLOAD_DIR)
      ? fs.readdirSync(UPLOAD_DIR).filter(f => !fs.statSync(path.join(UPLOAD_DIR, f)).isDirectory())
      : [];

    // Export real binary/Base64 files from the permanent Media Vault & uploads folder
    try {
      driveMediaVault.syncExistingLocalUploads(this.data.products);
    } catch {}
    const allEmbeddedFiles = driveMediaVault.exportAllFilesForBackup();

    let payloadData: any = {};
    if (moduleScope === 'productos_categorias' || moduleScope === 'solo_productos') {
      const prodEmbedded = allEmbeddedFiles.filter(
        ef => ef.folderPath.startsWith('Productos') || this.data.products.some(p => p.images.includes((ef as any).localUrl || (ef as any).stableUrl))
      );
      payloadData = {
        backupType: type,
        moduleScope,
        createdAt: now.toISOString(),
        products: this.data.products,
        categories: Array.from(new Set(this.data.products.map(p => p.category))),
        embeddedFiles: prodEmbedded
      };
    } else if (moduleScope === 'solo_clientes') {
      payloadData = {
        backupType: type,
        moduleScope,
        createdAt: now.toISOString(),
        users: this.data.users.filter(u => u.role === 'Cliente'),
        crmCustomers: this.getCrmCustomers(),
        embeddedFiles: []
      };
    } else if (moduleScope === 'clientes_usuarios_roles' || moduleScope === 'solo_usuarios') {
      payloadData = {
        backupType: type,
        moduleScope,
        createdAt: now.toISOString(),
        users: this.data.users,
        crmCustomers: this.getCrmCustomers(),
        embeddedFiles: []
      };
    } else if (moduleScope === 'ventas_movimientos') {
      payloadData = {
        backupType: type,
        moduleScope,
        createdAt: now.toISOString(),
        orders: this.data.orders || [],
        warranties: this.data.warranties || [],
        shipments: this.data.shipments || [],
        cashMovements: this.data.cashMovements || [],
        inventoryMovements: this.data.inventoryMovements || [],
        embeddedFiles: []
      };
    } else if (moduleScope === 'promociones') {
      payloadData = {
        backupType: type,
        moduleScope,
        createdAt: now.toISOString(),
        promotions: this.data.promotions || [],
        promoBanners: this.getPromoBanners(),
        discountCodes: this.getDiscountCodes(),
        marketingCampaigns: this.getMarketingCampaigns(),
        embeddedFiles: allEmbeddedFiles.filter(ef => ef.folderPath === 'Banners')
      };
    } else if (moduleScope === 'citas_ordenes_servicio' || moduleScope === 'solo_citas_ordenes') {
      payloadData = {
        backupType: type,
        moduleScope,
        createdAt: now.toISOString(),
        technicalServices: this.data.technicalServices || [],
        appointments: this.data.appointments || [],
        embeddedFiles: allEmbeddedFiles.filter(ef => ef.folderPath === 'Órdenes de servicio')
      };
    } else if (moduleScope === 'solo_fotografias') {
      payloadData = {
        backupType: type,
        moduleScope,
        createdAt: now.toISOString(),
        productImages: this.data.products.map(p => ({
          id: p.id,
          reference: p.reference,
          name: p.name,
          images: p.images,
          driveFileIds: p.driveFileIds || []
        })),
        uploadedFiles: uploadedFiles.filter(f => /\.(jpg|jpeg|png|webp|svg)$/i.test(f)),
        driveMediaAssets: driveMediaVault.getAllAssets(),
        embeddedFiles: allEmbeddedFiles
      };
    } else if (moduleScope === 'solo_catalogos') {
      payloadData = {
        backupType: type,
        moduleScope,
        createdAt: now.toISOString(),
        catalogs: this.data.catalogs || [],
        pdfFiles: uploadedFiles.filter(f => /\.pdf$/i.test(f)),
        embeddedFiles: allEmbeddedFiles.filter(ef => ef.folderPath === 'Catálogos PDF' || /\.pdf$/i.test(ef.fileName))
      };
    } else if (moduleScope === 'solo_documentos' || moduleScope === 'configuraciones_archivos') {
      payloadData = {
        backupType: type,
        moduleScope,
        createdAt: now.toISOString(),
        company: this.data.company,
        appConfig: this.getAppConfig(),
        whatsappConfig: this.getWhatsAppConfig(),
        whatsappQrConfig: this.getWhatsAppQrConfig(),
        policies: this.getPolicies(),
        paymentMethods: this.getPaymentMethods(),
        remoteSupportTools: this.getRemoteSupportTools(),
        warranties: this.data.warranties || [],
        catalogs: this.data.catalogs || [],
        embeddedFiles: allEmbeddedFiles.filter(ef =>
          ['Documentos', 'Logos', 'Plantillas', 'Garantías'].includes(ef.folderPath)
        )
      };
    } else {
      payloadData = {
        ...this.getFullBackup(),
        driveMediaAssets: driveMediaVault.getAllAssets(),
        embeddedFiles: allEmbeddedFiles
      };
    }

    const serialized = JSON.stringify(payloadData, null, 2);
    fs.writeFileSync(localFilePath, serialized, 'utf-8');

    const recordCounts = {
      products: (payloadData.products || this.data.products || []).length,
      users: (payloadData.users || this.data.users || []).length,
      orders: (payloadData.orders || this.data.orders || []).length,
      promotions: (payloadData.promotions || this.data.promotions || []).length,
      technicalServices: (payloadData.technicalServices || this.data.technicalServices || []).length,
      appointments: (payloadData.appointments || this.data.appointments || []).length,
      warranties: (payloadData.warranties || this.data.warranties || []).length,
      inventoryMovements: (payloadData.inventoryMovements || this.data.inventoryMovements || []).length
    };

    const recordCount =
      recordCounts.products +
      recordCounts.users +
      recordCounts.orders +
      recordCounts.promotions +
      recordCounts.technicalServices +
      recordCounts.appointments;

    const embeddedList = Array.isArray(payloadData.embeddedFiles) ? payloadData.embeddedFiles : allEmbeddedFiles;

    const record: BackupRecordMeta = {
      id: `bkp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fileName,
      localFileName: fileName,
      name: notes || `Respaldo ${moduleScope.replace(/_/g, ' ').toUpperCase()} (${now.toLocaleDateString('es-CO')})`,
      type,
      moduleScope,
      createdAt: now.toISOString(),
      createdBy: actorEmail,
      sizeBytes: Buffer.byteLength(serialized, 'utf-8'),
      recordCounts,
      countsSummary: recordCounts,
      recordCount,
      filesIncludedCount: Math.max(uploadedFiles.length, embeddedList.length),
      filesIncluded: embeddedList.map((ef: any) => ef.fileName).slice(0, 150),
      driveFileId: isObj ? optsOrType.driveFileId : undefined,
      driveLink: isObj ? optsOrType.driveLink : undefined,
      status: 'Completado',
      result: 'EXITOSO',
      notes
    };

    if (!this.data.backups) this.data.backups = [];
    this.data.backups.unshift(record);
    if (this.data.backups.length > 100) {
      this.data.backups = this.data.backups.slice(0, 100);
    }

    this.addAuditLog(
      actorEmail,
      'CREAR_RESPALDO',
      `Respaldo "${record.fileName}" (${record.type} / ${record.moduleScope}) creado con ${recordCount} registros y ${embeddedList.length} archivos reales embebidos`,
      'EXITOSO'
    );
    this.save(['backups'], actorEmail);

    return record;
  }

  public getBackups(): BackupRecordMeta[] {
    return this.data.backups || [];
  }

  public getBackupPayloadById(backupId: string): any | null {
    const rec = (this.data.backups || []).find(b => b.id === backupId);
    if (!rec) return null;
    const fName = rec.fileName || rec.localFileName || '';
    const filePath = path.join(BACKUPS_DIR, path.basename(fName));
    if (fName && fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
    return {
      ...this.getFullBackup(),
      driveMediaAssets: driveMediaVault.getAllAssets(),
      embeddedFiles: driveMediaVault.exportAllFilesForBackup()
    };
  }

  public restoreBackupById(
    backupId: string,
    actorEmail = 'Admin',
    overrideScope?: BackupModuleScope
  ): {
    success: boolean;
    message: string;
    preBackup?: BackupRecordMeta;
    preRestoreBackupId?: string;
    restoredFilesCount?: number;
  } {
    const rec = (this.data.backups || []).find(b => b.id === backupId);
    const payload = this.getBackupPayloadById(backupId);
    if (!rec || !payload) {
      return { success: false, message: 'El respaldo solicitado no existe o su archivo fue movido.' };
    }

    // Validate integrity of backup payload before applying
    const hasValidData =
      Array.isArray(payload.products) ||
      Array.isArray(payload.users) ||
      Array.isArray(payload.orders) ||
      Array.isArray(payload.technicalServices) ||
      Array.isArray(payload.productImages) ||
      Array.isArray(payload.catalogs) ||
      Boolean(payload.company);
    if (!hasValidData) {
      return {
        success: false,
        message: 'El respaldo seleccionado no contiene estructuras de datos ni archivos válidos para restaurar.'
      };
    }

    // Mandatory Rule: Automatically create a safety backup of the current state (including real files) BEFORE restoring
    const preBackup = this.createSystemBackup({
      type: 'pre_restauracion',
      moduleScope: 'completo',
      createdBy: actorEmail,
      notes: `Respaldo Automático Pre-Restauración (antes de aplicar ${rec.fileName})`
    });

    const p = payload;
    const targetScope: BackupModuleScope = overrideScope || rec.moduleScope || 'completo';

    // Restore embedded binary/Base64 files first so images/logos/PDFs exist on disk & Media Vault
    let restoredFilesCount = 0;
    if (Array.isArray(p.embeddedFiles) && p.embeddedFiles.length > 0) {
      const resFiles = driveMediaVault.restoreFilesFromBackup(p.embeddedFiles);
      restoredFilesCount = resFiles.restoredCount;
    }

    const applyAll = targetScope === 'completo';

    if (applyAll || targetScope === 'productos_categorias' || targetScope === 'solo_productos') {
      if (Array.isArray(p.products)) this.data.products = p.products;
    }
    if (applyAll || targetScope === 'solo_fotografias') {
      if (Array.isArray(p.productImages)) {
        for (const imgRec of p.productImages) {
          const prod = this.data.products.find(
            pr => pr.id === imgRec.id || pr.reference === imgRec.reference
          );
          if (prod && Array.isArray(imgRec.images) && imgRec.images.length > 0) {
            prod.images = imgRec.images;
            if (Array.isArray(imgRec.driveFileIds)) prod.driveFileIds = imgRec.driveFileIds;
          }
        }
      }
    }
    if (applyAll || targetScope === 'promociones') {
      if (Array.isArray(p.promotions)) this.data.promotions = p.promotions;
      if (Array.isArray(p.promoBanners)) this.data.promoBanners = p.promoBanners;
      if (Array.isArray(p.discountCodes)) this.data.discountCodes = p.discountCodes;
      if (Array.isArray(p.marketingCampaigns)) this.data.marketingCampaigns = p.marketingCampaigns;
    }
    if (applyAll || targetScope === 'solo_clientes') {
      if (Array.isArray(p.users)) {
        const nonClients = this.data.users.filter(u => u.role !== 'Cliente');
        const restoredClients = p.users
          .filter((u: User) => u.role === 'Cliente')
          .map((u: User) => ({
            ...u,
            role: 'Cliente' as UserRole,
            isActive: u.isActive !== false,
            status: (u.isActive !== false ? 'Activo' : 'Inactivo') as 'Activo' | 'Inactivo'
          }));
        this.data.users = [...nonClients, ...restoredClients];
      }
      if (Array.isArray(p.crmCustomers)) this.data.crmCustomers = p.crmCustomers;
    }
    if (applyAll || targetScope === 'clientes_usuarios_roles' || targetScope === 'solo_usuarios') {
      if (Array.isArray(p.users) && p.users.length > 0) {
        this.data.users = p.users.map((u: User) => ({
          ...u,
          role: isFoundationalAdmin(u.email) ? 'Administrador' : u.role || 'Cliente',
          isActive: u.isActive !== false,
          status: u.isActive !== false ? 'Activo' : 'Inactivo'
        }));
      }
      if (Array.isArray(p.crmCustomers)) this.data.crmCustomers = p.crmCustomers;
    }
    if (applyAll || targetScope === 'ventas_movimientos') {
      if (Array.isArray(p.orders)) this.data.orders = p.orders;
      if (Array.isArray(p.warranties)) this.data.warranties = p.warranties;
      if (Array.isArray(p.shipments)) this.data.shipments = p.shipments;
      if (Array.isArray(p.cashMovements)) this.data.cashMovements = p.cashMovements;
      if (Array.isArray(p.inventoryMovements)) this.data.inventoryMovements = p.inventoryMovements;
    }
    if (applyAll || targetScope === 'citas_ordenes_servicio' || targetScope === 'solo_citas_ordenes') {
      if (Array.isArray(p.technicalServices)) this.data.technicalServices = p.technicalServices;
      if (Array.isArray(p.appointments)) this.data.appointments = p.appointments;
    }
    if (applyAll || targetScope === 'solo_catalogos') {
      if (Array.isArray(p.catalogs)) this.data.catalogs = p.catalogs;
    }
    if (applyAll || targetScope === 'solo_documentos' || targetScope === 'configuraciones_archivos') {
      if (p.company && p.company.name) this.data.company = p.company;
      if (p.whatsappConfig) this.data.whatsappConfig = p.whatsappConfig;
      if (p.whatsappQrConfig) this.data.whatsappQrConfig = p.whatsappQrConfig;
      if (Array.isArray(p.seasonalTemplates)) this.data.seasonalTemplates = p.seasonalTemplates;
      if (Array.isArray(p.policies)) this.data.policies = p.policies;
      if (Array.isArray(p.paymentMethods)) this.data.paymentMethods = p.paymentMethods;
      if (Array.isArray(p.remoteSupportTools)) this.data.remoteSupportTools = p.remoteSupportTools;
    }
    if (applyAll) {
      if (Array.isArray(p.orderAuthorizations)) this.data.orderAuthorizations = p.orderAuthorizations;
    }

    this.createAdminNotification({
      eventType: 'RESTAURACION_REALIZADA',
      title: `Restauración ejecutada (${targetScope})`,
      message: `Se restauró el respaldo ${rec.fileName} (${restoredFilesCount} archivos físicos verificados) tras generar copia preventiva ${preBackup.fileName}.`,
      severity: 'warning',
      relatedEntityId: rec.id,
      relatedModule: 'system-backups'
    });

    this.addAuditLog(
      actorEmail,
      'RESTAURAR_RESPALDO',
      `Restauró respaldo "${rec.fileName}" (alcance: ${targetScope}, archivos restaurados: ${restoredFilesCount}) tras crear copia previa ${preBackup.id}`,
      'EXITOSO'
    );
    this.save(undefined, actorEmail);
    return {
      success: true,
      message: `Respaldo ${rec.fileName} restaurado exitosamente (${restoredFilesCount} archivos e imágenes verificados). Se creó el respaldo previo ${preBackup.fileName}.`,
      preBackup,
      preRestoreBackupId: preBackup.id,
      restoredFilesCount
    };
  }

  public getFullBackup(): DatabaseSchema & { embeddedFiles?: any[] } {
    try {
      driveMediaVault.syncExistingLocalUploads(this.data.products);
    } catch {}
    return {
      products: this.data.products,
      promotions: this.data.promotions || [],
      company: this.data.company,
      users: this.data.users,
      orders: this.data.orders || [],
      catalogs: this.data.catalogs || [],
      auditLogs: this.data.auditLogs || [],
      appConfig: this.getAppConfig(),
      technicalServices: this.data.technicalServices || [],
      appointments: this.data.appointments || [],
      warranties: this.data.warranties || [],
      inventoryMovements: this.data.inventoryMovements || [],
      whatsappConversations: this.data.whatsappConversations || [],
      whatsappConfig: this.getWhatsAppConfig(),
      backups: this.data.backups || [],
      trash: this.data.trash || [],
      syncQueue: this.data.syncQueue || [],
      connectionLogs: this.data.connectionLogs || [],
      seasonalTemplates: this.data.seasonalTemplates || INITIAL_SEASONAL_TEMPLATES,
      promoBanners: this.getPromoBanners(),
      discountCodes: this.data.discountCodes || INITIAL_DISCOUNT_CODES,
      policies: this.data.policies || INITIAL_POLICIES,
      shipments: this.data.shipments || INITIAL_SHIPMENTS,
      orderAuthorizations: this.data.orderAuthorizations || [],
      adminNotifications: this.data.adminNotifications || [],
      cashMovements: this.data.cashMovements || [],
      crmCustomers: this.getCrmCustomers(),
      marketingCampaigns: this.getMarketingCampaigns(),
      paymentMethods: this.getPaymentMethods(),
      remoteSupportTools: this.getRemoteSupportTools(),
      whatsappQrConfig: this.getWhatsAppQrConfig(),
      driveMediaAssets: driveMediaVault.getAllAssets(),
      embeddedFiles: driveMediaVault.exportAllFilesForBackup(),
      sessions: [],
      resetTokens: []
    };
  }

  public restoreBackup(schema: Partial<DatabaseSchema> & { embeddedFiles?: any[] }, actorEmail = 'Admin'): boolean {
    if (!schema.products || !schema.company || !schema.users) {
      return false;
    }

    this.createSystemBackup({
      type: 'pre_restauracion',
      moduleScope: 'completo',
      createdBy: actorEmail,
      notes: 'Respaldo Automático Pre-Restauración (Archivo Externo)'
    });

    if (Array.isArray(schema.embeddedFiles) && schema.embeddedFiles.length > 0) {
      try {
        driveMediaVault.restoreFilesFromBackup(schema.embeddedFiles);
      } catch (e) {
        console.warn('Could not restore embedded files from external backup:', e);
      }
    }

    const existingSessions = this.data.sessions || [];
    const existingBackups = this.data.backups || [];

    this.data = {
      products: schema.products,
      promotions: schema.promotions || [],
      company: schema.company,
      users: schema.users.map(u => ({
        ...u,
        role: isFoundationalAdmin(u.email) ? 'Administrador' : u.role || 'Cliente',
        isActive: u.isActive !== false,
        status: u.isActive !== false ? 'Activo' : 'Inactivo'
      })),
      orders: schema.orders || this.data.orders || [],
      catalogs: schema.catalogs || this.data.catalogs || [],
      auditLogs: schema.auditLogs || this.data.auditLogs || [],
      appConfig: schema.appConfig || this.data.appConfig,
      technicalServices: schema.technicalServices || this.data.technicalServices || [],
      appointments: schema.appointments || this.data.appointments || [],
      warranties: schema.warranties || this.data.warranties || [],
      inventoryMovements: schema.inventoryMovements || this.data.inventoryMovements || [],
      whatsappConversations: schema.whatsappConversations || this.data.whatsappConversations || [],
      whatsappConfig: schema.whatsappConfig || this.data.whatsappConfig || DEFAULT_WHATSAPP_CONFIG,
      backups: existingBackups,
      trash: schema.trash || this.data.trash || [],
      syncQueue: schema.syncQueue || this.data.syncQueue || [],
      connectionLogs: schema.connectionLogs || this.data.connectionLogs || [],
      seasonalTemplates: schema.seasonalTemplates || this.data.seasonalTemplates || INITIAL_SEASONAL_TEMPLATES,
      promoBanners: schema.promoBanners || this.data.promoBanners || buildInitialPromoBanners(),
      discountCodes: schema.discountCodes || this.data.discountCodes || INITIAL_DISCOUNT_CODES,
      policies: schema.policies || this.data.policies || INITIAL_POLICIES,
      shipments: schema.shipments || this.data.shipments || INITIAL_SHIPMENTS,
      orderAuthorizations: schema.orderAuthorizations || this.data.orderAuthorizations || [],
      adminNotifications: schema.adminNotifications || this.data.adminNotifications || [],
      cashMovements: schema.cashMovements || this.data.cashMovements || [],
      crmCustomers: schema.crmCustomers || this.data.crmCustomers || INITIAL_CRM_CUSTOMERS,
      marketingCampaigns: schema.marketingCampaigns || this.data.marketingCampaigns || INITIAL_MARKETING_CAMPAIGNS,
      paymentMethods: schema.paymentMethods || this.data.paymentMethods || INITIAL_PAYMENT_METHODS,
      remoteSupportTools: schema.remoteSupportTools || this.data.remoteSupportTools || INITIAL_REMOTE_SUPPORT_TOOLS,
      whatsappQrConfig: schema.whatsappQrConfig || this.data.whatsappQrConfig || INITIAL_WHATSAPP_QR_CONFIG,
      sessions: existingSessions,
      resetTokens: []
    };
    this.addAuditLog(actorEmail, 'RESTAURAR_BACKUP', 'Copia de seguridad restaurada exitosamente (con respaldo previo automático e imágenes)', 'EXITOSO');
    this.save(undefined, actorEmail);
    return true;
  }

  // =========================================================================
  // PERSISTENT SYNC QUEUE & CONNECTION HEALTH (ESTADO DE CONEXIONES)
  // =========================================================================

  public setSimulatedOffline(serviceOrOffline: string | boolean, offlineArg?: boolean): void {
    if (typeof serviceOrOffline === 'boolean') {
      if (serviceOrOffline) {
        this.simulatedOfflineServices.add('ALL');
        this.addConnectionErrorLog(
          'Google Sheets',
          'Modo sin conexión temporal activado',
          'Las operaciones nuevas se guardarán en la cola persistente del servidor sin pérdida de datos.'
        );
      } else {
        this.simulatedOfflineServices.clear();
      }
      return;
    }
    const key = serviceOrOffline.toUpperCase().trim();
    if (offlineArg) {
      this.simulatedOfflineServices.add(key);
    } else {
      this.simulatedOfflineServices.delete(key);
    }
  }

  public isSimulatedOffline(service = 'ALL'): boolean {
    if (this.simulatedOfflineServices.has('ALL')) return true;
    return this.simulatedOfflineServices.has(service.toUpperCase().trim());
  }

  public enqueueSyncOperation(
    entity: string,
    action: string,
    payloadSummary?: any,
    createdBy = 'Sistema'
  ): SyncOperationRecord {
    if (!this.data.syncQueue) this.data.syncQueue = [];

    const summaryStr =
      typeof payloadSummary === 'string' ? payloadSummary : JSON.stringify(payloadSummary || {});

    const existingIdx = this.data.syncQueue.findIndex(
      op =>
        (op.status === 'Pendiente' || op.status === 'PENDIENTE') &&
        op.entity === entity &&
        op.action === action &&
        op.payloadSummary === summaryStr
    );

    const now = new Date().toISOString();
    const op: SyncOperationRecord = {
      id:
        existingIdx >= 0
          ? this.data.syncQueue[existingIdx].id
          : `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      entity,
      action,
      payloadSummary: summaryStr,
      target: 'GOOGLE_SHEETS',
      entityType: entity,
      detail: summaryStr,
      createdAt: existingIdx >= 0 ? this.data.syncQueue[existingIdx].createdAt : now,
      createdBy,
      lastAttemptAt: now,
      attempts: existingIdx >= 0 ? this.data.syncQueue[existingIdx].attempts : 0,
      status: 'Pendiente'
    };

    if (existingIdx >= 0) {
      this.data.syncQueue[existingIdx] = op;
    } else {
      this.data.syncQueue.unshift(op);
    }

    this.save(['syncQueue'], createdBy);
    return op;
  }

  public getPendingSyncOperations(): SyncOperationRecord[] {
    return (this.data.syncQueue || []).filter(
      op =>
        op.status === 'Pendiente' ||
        op.status === 'PENDIENTE' ||
        op.status === 'Error' ||
        op.status === 'ERROR'
    );
  }

  public getSyncQueue(): SyncOperationRecord[] {
    return this.data.syncQueue || [];
  }

  public getAllSyncOperations(): SyncOperationRecord[] {
    return this.data.syncQueue || [];
  }

  public completeSyncOperation(id: string): void {
    if (!this.data.syncQueue) return;
    const op = this.data.syncQueue.find(o => o.id === id);
    if (op) {
      op.status = 'Sincronizado';
      op.lastAttemptAt = new Date().toISOString();
      this.save(['syncQueue']);
    }
  }

  public failSyncOperation(id: string, errorMsg: string): void {
    if (!this.data.syncQueue) return;
    const op = this.data.syncQueue.find(o => o.id === id);
    if (op) {
      op.attempts = (op.attempts || 0) + 1;
      op.errorMessage = errorMsg;
      op.lastError = errorMsg;
      op.lastAttemptAt = new Date().toISOString();
      op.status = 'Error';
      this.save(['syncQueue']);
    }
  }

  public addConnectionErrorLog(
    service: ConnectionErrorLog['service'],
    message: string,
    detail?: string
  ): ConnectionErrorLog {
    if (!this.data.connectionLogs) this.data.connectionLogs = [];
    const entry: ConnectionErrorLog = {
      id: `clog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      service,
      date: new Date().toISOString(),
      message,
      detail,
      resolved: false
    };
    this.data.connectionLogs.unshift(entry);
    if (this.data.connectionLogs.length > 200) {
      this.data.connectionLogs = this.data.connectionLogs.slice(0, 200);
    }
    this.save(['connectionLogs']);
    return entry;
  }

  public getConnectionErrorLogs(): ConnectionErrorLog[] {
    return this.data.connectionLogs || [];
  }

  // =========================================================================
  // WHATSAPP INTELIGENTE & GEMINI AI STATE
  // =========================================================================

  public getWhatsAppConfig(): WhatsAppConfig {
    const cfg = this.data.whatsappConfig
      ? { ...DEFAULT_WHATSAPP_CONFIG, ...this.data.whatsappConfig }
      : { ...DEFAULT_WHATSAPP_CONFIG };
    cfg.metaCloudConfigured = Boolean(
      (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) ||
        (cfg.phoneNumberId && (process.env.WHATSAPP_ACCESS_TOKEN || cfg.metaTokenConfigured))
    );
    return cfg;
  }

  public updateWhatsAppConfig(updates: Partial<WhatsAppConfig>, actorEmail = 'Admin'): WhatsAppConfig {
    const current = this.getWhatsAppConfig();
    const next: WhatsAppConfig = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail
    };
    this.data.whatsappConfig = next;
    this.addAuditLog(actorEmail, 'CONFIGURAR_WHATSAPP_GEMINI', `Actualizó configuración de WhatsApp Inteligente y Gemini`, 'EXITOSO');
    this.save(['whatsappConfig'], actorEmail);
    return next;
  }

  public getWhatsAppConversations(): WhatsAppConversation[] {
    return this.data.whatsappConversations || [];
  }

  public getWhatsAppConversationById(idOrPhone: string): WhatsAppConversation | null {
    const clean = idOrPhone.replace(/\s+/g, '');
    return (
      (this.data.whatsappConversations || []).find(
        c => c.id === idOrPhone || (c.phone || c.customerPhone || '').replace(/\s+/g, '') === clean
      ) || null
    );
  }

  public recordWhatsAppMessage(params: {
    phone: string;
    clientName?: string;
    clientEmail?: string;
    sender: 'client' | 'gemini' | 'advisor';
    text: string;
    intent?: string;
    status?: WhatsAppConversationStatus;
    assignedAdvisor?: string;
  }): WhatsAppConversation {
    if (!this.data.whatsappConversations) this.data.whatsappConversations = [];
    const cleanPhone = (params.phone || '').trim();
    let conv = this.data.whatsappConversations.find(
      c =>
        (c.phone || c.clientPhone || c.customerPhone || '').replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, '') ||
        c.id === cleanPhone
    );

    const now = new Date().toISOString();
    const newMsg: WhatsAppMessage = {
      id: `wamsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: params.sender,
      senderName:
        params.sender === 'client'
          ? params.clientName || cleanPhone
          : params.sender === 'gemini'
          ? 'Asistente Gemini IPS'
          : params.assignedAdvisor || 'Asesor IPS',
      text: params.text,
      timestamp: now,
      intent: params.intent
    };

    if (!conv) {
      conv = {
        id: `wa_conv_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        phone: cleanPhone,
        clientPhone: cleanPhone,
        customerPhone: cleanPhone,
        clientName: params.clientName || cleanPhone,
        customerName: params.clientName || cleanPhone,
        clientEmail: params.clientEmail,
        status: params.status || 'En atención por bot',
        assignedAdvisor: params.assignedAdvisor,
        botEnabled: params.status !== 'Esperando asesor humano' && params.status !== 'En atención humana',
        unreadCount: params.sender === 'client' ? 1 : 0,
        lastMessage: newMsg.text.substring(0, 140),
        lastMessageText: newMsg.text.substring(0, 140),
        lastMessagePreview: newMsg.text.substring(0, 140),
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
        messages: [newMsg]
      };
      this.data.whatsappConversations.unshift(conv);
    } else {
      if (params.clientName && params.clientName !== cleanPhone) {
        conv.clientName = params.clientName;
        conv.customerName = params.clientName;
      }
      if (params.clientEmail) {
        conv.clientEmail = params.clientEmail;
      }
      conv.messages.push(newMsg);
      conv.lastMessageText = newMsg.text.substring(0, 140);
      conv.lastMessagePreview = newMsg.text.substring(0, 140);
      conv.lastMessageAt = now;
      conv.updatedAt = now;
      if (params.status) {
        conv.status = params.status;
      }
      if (params.assignedAdvisor !== undefined) {
        conv.assignedAdvisor = params.assignedAdvisor;
      }
      if (params.sender === 'client') {
        conv.unreadCount = (conv.unreadCount || 0) + 1;
      } else {
        conv.unreadCount = 0;
      }
    }

    this.save(['whatsappConversations']);
    return conv;
  }

  public updateWhatsAppConversation(
    id: string,
    updates: Partial<WhatsAppConversation>,
    actorEmail = 'Admin'
  ): WhatsAppConversation | null {
    const conv = (this.data.whatsappConversations || []).find(c => c.id === id);
    if (!conv) return null;
    if (updates.status !== undefined) conv.status = updates.status;
    if (updates.assignedAdvisor !== undefined) conv.assignedAdvisor = updates.assignedAdvisor;
    if (updates.botEnabled !== undefined) conv.botEnabled = updates.botEnabled;
    if (updates.unreadCount !== undefined) conv.unreadCount = updates.unreadCount;
    conv.updatedAt = new Date().toISOString();
    this.addAuditLog(actorEmail, 'ACTUALIZAR_CHAT_WHATSAPP', `Conversación ${conv.phone}: estado=${conv.status}`, 'EXITOSO');
    this.save(['whatsappConversations'], actorEmail);
    return conv;
  }

  // =========================================================================
  // APP RELEASE & APK CONFIGURATION (PWA + ANDROID)
  // =========================================================================

  public getAppConfig(): AppReleaseConfig {
    const def: AppReleaseConfig = {
      appName: 'IPS TECNOLÓGICA',
      shortName: 'IPS Tech',
      packageId: 'co.ipstecnologica.catalogo',
      versionName: '1.0.0',
      versionCode: 1,
      apkAvailable: false,
      apkDownloadUrl: null,
      apkFileName: null,
      apkFileSizeMB: null,
      apkUpdatedAt: null,
      releaseNotes:
        'Catálogo oficial con visualización rápida de productos tecnológicos, precios actualizados y promociones con cuenta regresiva en tiempo real.',
      showUpdateBanner: false,
      updatedAt: new Date().toISOString(),
      updatedBy: 'jeffervr@gmail.com'
    };

    const current = this.data.appConfig ? { ...def, ...this.data.appConfig } : def;

    if (current.apkDownloadUrl && current.apkDownloadUrl.startsWith('/uploads/apk/')) {
      const apkFile = path.basename(current.apkDownloadUrl);
      const localApkPath = path.join(UPLOAD_DIR, 'apk', apkFile);
      if (!fs.existsSync(localApkPath)) {
        current.apkAvailable = false;
        current.apkDownloadUrl = null;
      } else {
        current.apkAvailable = true;
      }
    } else if (!current.apkDownloadUrl) {
      current.apkAvailable = false;
    }

    return current;
  }

  public updateAppConfig(updates: Partial<AppReleaseConfig>, actorEmail = 'Admin'): AppReleaseConfig {
    const current = this.getAppConfig();
    const next: AppReleaseConfig = {
      ...current,
      ...updates,
      appName: updates.appName || current.appName || 'IPS TECNOLÓGICA',
      shortName: updates.shortName || current.shortName || 'IPS Tech',
      packageId: 'co.ipstecnologica.catalogo',
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail
    };

    if (next.apkDownloadUrl && next.apkDownloadUrl.startsWith('/uploads/apk/')) {
      const apkFile = path.basename(next.apkDownloadUrl);
      const localApkPath = path.join(UPLOAD_DIR, 'apk', apkFile);
      next.apkAvailable = fs.existsSync(localApkPath);
    } else if (next.apkDownloadUrl && /^https?:\/\/.+\.apk(\?.*)?$/i.test(next.apkDownloadUrl.trim())) {
      next.apkAvailable = true;
    } else {
      next.apkAvailable = false;
      next.apkDownloadUrl = null;
    }

    this.data.appConfig = next;
    this.addAuditLog(
      actorEmail,
      'ACTUALIZAR_APP_CONFIG',
      `Actualizó configuración de la App v${next.versionName} (APK disponible: ${next.apkAvailable ? 'Sí' : 'No'})`,
      'EXITOSO'
    );
    this.save(['appConfig'], actorEmail);
    return next;
  }

  public resetToDefault(actorEmail = 'Admin'): void {
    this.createSystemBackup({
      type: 'pre_restauracion',
      moduleScope: 'completo',
      createdBy: actorEmail,
      notes: 'Respaldo Automático antes de Restablecer Fábrica'
    });
    this.data = this.initDefaults();
    this.addAuditLog(actorEmail, 'RESTABLECER_FABRICA', 'Sistema restablecido a valores iniciales', 'EXITOSO');
    this.save(undefined, actorEmail);
  }

  // =========================================================================
  // PLANTILLAS Y DISEÑOS POR TEMPORADA (SECCIÓN 3 — 14 PLANTILLAS)
  // =========================================================================

  public getSeasonalTemplates(): SeasonalTemplate[] {
    if (!this.data.seasonalTemplates || this.data.seasonalTemplates.length === 0) {
      this.data.seasonalTemplates = INITIAL_SEASONAL_TEMPLATES;
    }
    return this.data.seasonalTemplates;
  }

  public getActiveWebTemplate(): SeasonalTemplate {
    const list = this.getSeasonalTemplates();
    return (
      list.find(t => t.isActiveWeb) ||
      list.find(t => t.id === this.data.company.activeWebTemplateId) ||
      list[0]
    );
  }

  public getActivePdfTemplate(): SeasonalTemplate {
    const list = this.getSeasonalTemplates();
    return (
      list.find(t => t.isActivePdf) ||
      list.find(t => t.id === this.data.company.activePdfTemplateId) ||
      list[0]
    );
  }

  public createSeasonalTemplate(
    input: Partial<SeasonalTemplate>,
    actorEmail = 'jeffervr@gmail.com'
  ): SeasonalTemplate {
    const list = this.getSeasonalTemplates();
    const now = new Date().toISOString();
    const created: SeasonalTemplate = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: (input.name || 'Nueva Plantilla de Temporada').trim(),
      seasonKey: (input.seasonKey || 'personalizada').toLowerCase().trim(),
      primaryColor: input.primaryColor || '#DC2626',
      secondaryColor: input.secondaryColor || '#0F172A',
      accentColor: input.accentColor || '#F59E0B',
      backgroundColor: input.backgroundColor || '#F8FAFC',
      headerTextColor: input.headerTextColor || '#FFFFFF',
      bannerTitle: input.bannerTitle || `${input.name || 'Especial'} · IPS TECNOLÓGICA`,
      bannerSubtitle: input.bannerSubtitle || 'Promociones y soluciones tecnológicas con respaldo oficial.',
      bannerImageUrl: input.bannerImageUrl,
      decorativeBadge: input.decorativeBadge || 'EDICIÓN ESPECIAL',
      promoBlockText: input.promoBlockText || 'Garantía directa y envíos a toda Colombia.',
      buttonStyle: input.buttonStyle || 'rounded-xl',
      fontFamily: input.fontFamily || 'Inter, system-ui, sans-serif',
      startAt: input.startAt,
      endAt: input.endAt,
      isActiveWeb: Boolean(input.isActiveWeb),
      isActivePdf: Boolean(input.isActivePdf),
      isDefaultCorporate: false,
      createdAt: now,
      updatedAt: now,
      updatedBy: actorEmail
    };

    if (created.isActiveWeb) {
      list.forEach(t => (t.isActiveWeb = false));
      this.data.company.activeWebTemplateId = created.id;
    }
    if (created.isActivePdf) {
      list.forEach(t => (t.isActivePdf = false));
      this.data.company.activePdfTemplateId = created.id;
    }

    list.unshift(created);
    this.addAuditLog(actorEmail, 'CREAR_PLANTILLA', `Creó plantilla de temporada "${created.name}"`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return created;
  }

  public updateSeasonalTemplate(
    id: string,
    updates: Partial<SeasonalTemplate>,
    actorEmail = 'jeffervr@gmail.com'
  ): SeasonalTemplate {
    const list = this.getSeasonalTemplates();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Plantilla no encontrada.');

    const existing = list[idx];
    const updated: SeasonalTemplate = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail
    };

    if (updates.isActiveWeb) {
      list.forEach(t => (t.isActiveWeb = t.id === id));
      this.data.company.activeWebTemplateId = id;
    }
    if (updates.isActivePdf) {
      list.forEach(t => (t.isActivePdf = t.id === id));
      this.data.company.activePdfTemplateId = id;
    }

    list[idx] = updated;
    this.addAuditLog(actorEmail, 'EDITAR_PLANTILLA', `Actualizó plantilla "${updated.name}"`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return updated;
  }

  public duplicateSeasonalTemplate(id: string, actorEmail = 'jeffervr@gmail.com'): SeasonalTemplate {
    const list = this.getSeasonalTemplates();
    const source = list.find(t => t.id === id);
    if (!source) throw new Error('Plantilla origen no encontrada.');

    return this.createSeasonalTemplate(
      {
        ...source,
        name: `${source.name} (Copia)`,
        isActiveWeb: false,
        isActivePdf: false,
        isDefaultCorporate: false
      },
      actorEmail
    );
  }

  public deleteSeasonalTemplate(id: string, actorEmail = 'jeffervr@gmail.com'): boolean {
    const list = this.getSeasonalTemplates();
    const target = list.find(t => t.id === id);
    if (!target) return false;
    if (target.isDefaultCorporate || target.id === 'tpl_corporativa') {
      throw new Error('No se puede eliminar la plantilla Corporativa IPS TECNOLÓGICA predeterminada.');
    }

    this.data.seasonalTemplates = list.filter(t => t.id !== id);
    if (target.isActiveWeb || target.isActivePdf) {
      this.restoreDefaultCorporateTemplate(actorEmail);
    } else {
      this.save(undefined, actorEmail);
    }
    this.addAuditLog(actorEmail, 'ELIMINAR_PLANTILLA', `Eliminó plantilla "${target.name}"`, 'EXITOSO');
    return true;
  }

  public activateSeasonalTemplate(
    id: string,
    target: 'web' | 'pdf' | 'both' = 'both',
    actorEmail = 'jeffervr@gmail.com'
  ): SeasonalTemplate {
    const list = this.getSeasonalTemplates();
    const found = list.find(t => t.id === id);
    if (!found) throw new Error('Plantilla no encontrada.');

    for (const tpl of list) {
      if (target === 'web' || target === 'both') {
        tpl.isActiveWeb = tpl.id === id;
      }
      if (target === 'pdf' || target === 'both') {
        tpl.isActivePdf = tpl.id === id;
      }
    }
    if (target === 'web' || target === 'both') {
      this.data.company.activeWebTemplateId = id;
    }
    if (target === 'pdf' || target === 'both') {
      this.data.company.activePdfTemplateId = id;
    }

    this.addAuditLog(
      actorEmail,
      'ACTIVAR_PLANTILLA',
      `Activó plantilla "${found.name}" para ${target === 'both' ? 'Web y PDF' : target.toUpperCase()}`,
      'EXITOSO'
    );
    this.save(undefined, actorEmail);
    return found;
  }

  public restoreDefaultCorporateTemplate(actorEmail = 'jeffervr@gmail.com'): SeasonalTemplate {
    return this.activateSeasonalTemplate('tpl_corporativa', 'both', actorEmail);
  }

  // =========================================================================
  // BANNER PRINCIPAL DE TRES PROMOCIONES (SECCIÓN 13)
  // =========================================================================

  public getPromoBanners(): PromoBannerItem[] {
    if (!this.data.promoBanners || this.data.promoBanners.length === 0) {
      this.data.promoBanners = buildInitialPromoBanners();
    } else if (this.data.promoBanners.length < 6) {
      const initialSix = buildInitialPromoBanners();
      for (const seedBanner of initialSix) {
        if (!this.data.promoBanners.some(b => b.slot === seedBanner.slot)) {
          this.data.promoBanners.push(seedBanner);
        }
      }
    }
    return [...this.data.promoBanners].sort((a, b) => a.order - b.order);
  }

  public updatePromoBanner(
    idOrSlot: string | number,
    updates: Partial<PromoBannerItem>,
    actorEmail = 'jeffervr@gmail.com'
  ): PromoBannerItem {
    const list = this.getPromoBanners();
    const idx = list.findIndex(b => b.id === String(idOrSlot) || b.slot === Number(idOrSlot));
    if (idx === -1) throw new Error('Espacio de banner promocional no encontrado.');

    const updated: PromoBannerItem = {
      ...list[idx],
      ...updates,
      id: list[idx].id,
      slot: list[idx].slot,
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail
    };

    const rawIdx = this.data.promoBanners!.findIndex(b => b.id === updated.id);
    if (rawIdx >= 0) {
      this.data.promoBanners![rawIdx] = updated;
    }

    this.addAuditLog(
      actorEmail,
      'ACTUALIZAR_BANNER_PROMOCIONAL',
      `Actualizó Banner Promocional #${updated.slot}: "${updated.title}"`,
      'EXITOSO'
    );

    if (updated.isActive && this.isCatalogPublished()) {
      this.emitCustomerPushEvent({
        type: 'PROMO_BANNER',
        title: `✨ Destacado en Catálogo: ${updated.title}`,
        body: `${updated.description}${updated.badgeText ? ` (${updated.badgeText})` : ''}`,
        tag: `banner_slot_${updated.slot}_${Date.now()}`,
        url:
          updated.linkType === 'product' && updated.linkTarget
            ? `/?product=${encodeURIComponent(updated.linkTarget)}`
            : updated.linkType === 'category' && updated.linkTarget
            ? `/?category=${encodeURIComponent(updated.linkTarget)}`
            : '/?promo=active',
        targetAudience: 'all_customers',
        relatedProductRef: updated.linkType === 'product' ? updated.linkTarget : undefined,
        relatedCategory: updated.linkType === 'category' ? updated.linkTarget : undefined,
        discountBadge: updated.badgeText,
        createdBy: actorEmail
      });
    }

    this.save(undefined, actorEmail);
    return updated;
  }

  // =========================================================================
  // GENERADOR DE CÓDIGOS DE DESCUENTO (SECCIÓN 12)
  // =========================================================================

  public getDiscountCodes(): DiscountCode[] {
    if (!this.data.discountCodes || this.data.discountCodes.length === 0) {
      this.data.discountCodes = INITIAL_DISCOUNT_CODES;
    }
    return this.data.discountCodes;
  }

  public createDiscountCode(
    input: Partial<DiscountCode>,
    actorEmail = 'jeffervr@gmail.com'
  ): DiscountCode {
    const cleanCode = String(input.code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode) throw new Error('El código de descuento es obligatorio.');

    const list = this.getDiscountCodes();
    if (list.some(c => c.code.toUpperCase() === cleanCode)) {
      throw new Error(`El código "${cleanCode}" ya existe.`);
    }

    const now = new Date().toISOString();
    const created: DiscountCode = {
      id: `dc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: cleanCode,
      description: (input.description || `Cupón promocional ${cleanCode}`).trim(),
      discountType: input.discountType === 'fixed_cop' ? 'fixed_cop' : 'percentage',
      discountValue: Math.max(1, Number(input.discountValue) || 10),
      expirationDate: input.expirationDate || new Date(Date.now() + 86400000 * 60).toISOString(),
      maxUses: Math.max(1, Number(input.maxUses) || 100),
      usedCount: 0,
      minPurchaseCOP: Math.max(0, Number(input.minPurchaseCOP) || 0),
      allowedCategory: input.allowedCategory || 'Todas',
      allowedProductIds: Array.isArray(input.allowedProductIds) ? input.allowedProductIds : [],
      isActive: input.isActive !== false,
      usageHistory: [],
      createdAt: now,
      updatedAt: now,
      createdBy: actorEmail
    };

    this.data.discountCodes!.unshift(created);
    this.addAuditLog(
      actorEmail,
      'CREAR_CODIGO_DESCUENTO',
      `Creó código de descuento "${created.code}" (${created.discountType === 'percentage' ? created.discountValue + '%' : '$' + created.discountValue.toLocaleString('es-CO')})`,
      'EXITOSO'
    );

    if (created.isActive && this.isCatalogPublished()) {
      const discountLabel =
        created.discountType === 'percentage'
          ? `${created.discountValue}% de descuento`
          : `$${created.discountValue.toLocaleString('es-CO')} COP de descuento`;
      this.emitCustomerPushEvent({
        type: 'DISCOUNT_CODE',
        title: `🎟️ ¡Nuevo Cupón Promocional: ${created.code}!`,
        body: `Usa el código ${created.code} en el catálogo de IPS TECNOLÓGICA y obtén ${discountLabel} (${created.description}).`,
        tag: `coupon_${created.code}`,
        url:
          created.allowedCategory && created.allowedCategory !== 'Todas'
            ? `/?category=${encodeURIComponent(created.allowedCategory)}`
            : '/?promo=active',
        targetAudience: 'all_customers',
        relatedCategory: created.allowedCategory !== 'Todas' ? created.allowedCategory : undefined,
        discountBadge: created.code,
        createdBy: actorEmail
      });
    }

    this.save(undefined, actorEmail);
    return created;
  }

  public updateDiscountCode(
    id: string,
    updates: Partial<DiscountCode>,
    actorEmail = 'jeffervr@gmail.com'
  ): DiscountCode {
    const list = this.getDiscountCodes();
    const idx = list.findIndex(c => c.id === id || c.code.toUpperCase() === id.toUpperCase());
    if (idx === -1) throw new Error('Código de descuento no encontrado.');

    const updated: DiscountCode = {
      ...list[idx],
      ...updates,
      id: list[idx].id,
      code: updates.code ? String(updates.code).toUpperCase().replace(/[^A-Z0-9_-]/g, '') : list[idx].code,
      updatedAt: new Date().toISOString()
    };

    list[idx] = updated;
    this.addAuditLog(actorEmail, 'ACTUALIZAR_CODIGO_DESCUENTO', `Actualizó código "${updated.code}"`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return updated;
  }

  public deleteDiscountCode(id: string, actorEmail = 'jeffervr@gmail.com'): boolean {
    const list = this.getDiscountCodes();
    const found = list.find(c => c.id === id || c.code.toUpperCase() === id.toUpperCase());
    if (!found) return false;
    this.data.discountCodes = list.filter(c => c.id !== found.id);
    this.addAuditLog(actorEmail, 'ELIMINAR_CODIGO_DESCUENTO', `Eliminó código "${found.code}"`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return true;
  }

  public validateDiscountCode(
    rawCode: string,
    subtotalCOP: number,
    items?: OrderItem[]
  ): {
    valid: boolean;
    discountCode?: DiscountCode;
    discountAmountCOP: number;
    finalSubtotalCOP: number;
    message: string;
  } {
    const clean = String(rawCode || '').trim().toUpperCase();
    if (!clean) {
      return { valid: false, discountAmountCOP: 0, finalSubtotalCOP: subtotalCOP, message: 'Ingrese un código válido.' };
    }
    const found = this.getDiscountCodes().find(c => c.code.toUpperCase() === clean);
    if (!found) {
      return { valid: false, discountAmountCOP: 0, finalSubtotalCOP: subtotalCOP, message: `El código "${clean}" no existe.` };
    }
    if (!found.isActive) {
      return { valid: false, discountAmountCOP: 0, finalSubtotalCOP: subtotalCOP, message: `El código "${clean}" se encuentra inactivo.` };
    }
    if (new Date(found.expirationDate).getTime() < Date.now()) {
      return { valid: false, discountAmountCOP: 0, finalSubtotalCOP: subtotalCOP, message: `El código "${clean}" ha expirado.` };
    }
    if (found.usedCount >= found.maxUses) {
      return { valid: false, discountAmountCOP: 0, finalSubtotalCOP: subtotalCOP, message: `El código "${clean}" alcanzó su límite máximo de usos.` };
    }
    if (subtotalCOP < found.minPurchaseCOP) {
      return {
        valid: false,
        discountAmountCOP: 0,
        finalSubtotalCOP: subtotalCOP,
        message: `El código "${clean}" requiere una compra mínima de $${found.minPurchaseCOP.toLocaleString('es-CO')} COP.`
      };
    }

    let discountAmountCOP = 0;
    if (found.discountType === 'percentage') {
      discountAmountCOP = Math.round(subtotalCOP * (Math.min(90, found.discountValue) / 100));
    } else {
      discountAmountCOP = Math.min(subtotalCOP, Math.round(found.discountValue));
    }

    const finalSubtotalCOP = Math.max(0, subtotalCOP - discountAmountCOP);
    return {
      valid: true,
      discountCode: found,
      discountAmountCOP,
      finalSubtotalCOP,
      message: `¡Código ${found.code} aplicado! Ahorras $${discountAmountCOP.toLocaleString('es-CO')} COP.`
    };
  }

  public consumeDiscountCode(
    rawCode: string,
    orderId: string,
    customerEmail: string,
    customerName: string,
    discountAppliedCOP: number,
    orderSubtotalCOP: number
  ): void {
    const clean = String(rawCode || '').trim().toUpperCase();
    const found = this.getDiscountCodes().find(c => c.code.toUpperCase() === clean);
    if (!found) return;
    found.usedCount = (found.usedCount || 0) + 1;
    if (!found.usageHistory) found.usageHistory = [];
    found.usageHistory.unshift({
      id: `use_${Date.now()}`,
      orderId,
      customerEmail,
      customerName,
      discountAppliedCOP,
      orderSubtotalCOP,
      usedAt: new Date().toISOString()
    });
    this.createAdminNotification({
      eventType: 'CODIGO_DESCUENTO_USADO',
      title: `Código de descuento ${found.code} utilizado`,
      message: `El cliente ${customerName} (${customerEmail}) aplicó el código ${found.code} (-$${discountAppliedCOP.toLocaleString('es-CO')} COP) en el pedido ${orderId}.`,
      severity: 'info',
      relatedEntityId: orderId,
      relatedModule: 'promotions'
    });
  }

  // =========================================================================
  // POLÍTICAS DE GARANTÍAS Y ENVÍOS (SECCIÓN 15 — LEY 1480 DE 2011)
  // =========================================================================

  public getPolicies(): PolicyDocument[] {
    if (!this.data.policies || this.data.policies.length === 0) {
      this.data.policies = INITIAL_POLICIES;
    }
    return this.data.policies;
  }

  public getPolicyByIdOrCategory(idOrCategory: string): PolicyDocument | null {
    const list = this.getPolicies();
    return (
      list.find(p => p.id === idOrCategory || p.category === idOrCategory || p.code === idOrCategory) || null
    );
  }

  public updatePolicy(
    idOrCategory: string,
    updates: Partial<PolicyDocument>,
    actorEmail = 'jeffervr@gmail.com'
  ): PolicyDocument {
    const list = this.getPolicies();
    const idx = list.findIndex(p => p.id === idOrCategory || p.category === idOrCategory);
    if (idx === -1) throw new Error('Política no encontrada.');

    const updated: PolicyDocument = {
      ...list[idx],
      ...updates,
      id: list[idx].id,
      category: list[idx].category,
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail
    };
    list[idx] = updated;

    this.addAuditLog(
      actorEmail,
      'ACTUALIZAR_POLITICA_GARANTIA_ENVIO',
      `Actualizó política "${updated.title}" (${updated.version})`,
      'EXITOSO'
    );
    this.save(undefined, actorEmail);
    return updated;
  }

  public updateWarranty(
    idOrCode: string,
    updates: Partial<WarrantyRecord> & { statusNote?: string },
    actorEmail = 'jeffervr@gmail.com'
  ): WarrantyRecord {
    if (!this.data.warranties) this.data.warranties = [];
    const idx = this.data.warranties.findIndex(
      w => w.id === idOrCode || (w.warrantyCode || '').toUpperCase() === idOrCode.toUpperCase()
    );
    if (idx === -1) throw new Error('Caso de garantía no encontrado.');

    const existing = this.data.warranties[idx];
    const now = new Date().toISOString();
    const nextStatus: WarrantyCaseStatus = updates.status || existing.status;

    if (nextStatus === 'Rechazada con justificación' && !updates.rejectionJustification && !existing.rejectionJustification) {
      throw new Error('Para rechazar una garantía conforme a la Ley 1480 de 2011 es obligatorio indicar la justificación técnica y pruebas.');
    }

    const history = Array.isArray(existing.history) ? [...existing.history] : [];
    if (updates.status && updates.status !== existing.status) {
      history.unshift({
        date: now,
        status: nextStatus,
        actor: actorEmail,
        note:
          updates.statusNote ||
          updates.rejectionJustification ||
          updates.appliedSolution ||
          updates.technicalDiagnosis ||
          `Cambio de estado a ${nextStatus}`
      });
    }

    const updated: WarrantyRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      status: nextStatus,
      history,
      updatedAt: now,
      updatedBy: actorEmail
    };

    this.data.warranties[idx] = updated;

    if (nextStatus === 'Solicitud recibida' || nextStatus === 'En reclamación') {
      this.createAdminNotification({
        eventType: 'SOLICITUD_GARANTIA',
        title: `Reclamación de garantía: ${updated.warrantyCode || updated.id}`,
        message: `Cliente ${updated.clientName} reportó solicitud de garantía para ${updated.productName} (Serial: ${updated.serialNumber || 'N/A'}).`,
        severity: 'urgent',
        relatedEntityId: updated.id,
        relatedModule: 'warranties-shipping'
      });
    }

    this.addAuditLog(
      actorEmail,
      'ACTUALIZAR_GARANTIA',
      `Actualizó caso de garantía ${updated.warrantyCode || updated.id}: estado=${updated.status}`,
      'EXITOSO'
    );
    this.save(['warranties'], actorEmail);
    return updated;
  }

  // =========================================================================
  // GESTIÓN Y SEGUIMIENTO DE ENVÍOS (SECCIÓN 15.7)
  // =========================================================================

  public getShipments(): ShipmentRecord[] {
    if (!this.data.shipments) this.data.shipments = INITIAL_SHIPMENTS;
    return this.data.shipments;
  }

  public getShipmentsForClient(email: string): ShipmentRecord[] {
    const clean = (email || '').toLowerCase().trim();
    return this.getShipments().filter(s => s.clientEmail.toLowerCase().trim() === clean);
  }

  public getShipmentByOrderId(orderId: string): ShipmentRecord | null {
    return this.getShipments().find(s => s.orderId === orderId || s.id === orderId) || null;
  }

  public createOrUpdateShipment(
    orderIdOrShipmentId: string,
    updates: Partial<ShipmentRecord> & { statusNote?: string },
    actorEmail = 'jeffervr@gmail.com'
  ): ShipmentRecord {
    const list = this.getShipments();
    const idx = list.findIndex(s => s.id === orderIdOrShipmentId || s.orderId === orderIdOrShipmentId);
    const now = new Date().toISOString();

    if (idx === -1) {
      const order = (this.data.orders || []).find(o => o.id === orderIdOrShipmentId);
      const created: ShipmentRecord = {
        id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        orderId: updates.orderId || order?.id || orderIdOrShipmentId,
        clientName: updates.clientName || order?.customerName || 'Cliente',
        clientEmail: (updates.clientEmail || order?.customerEmail || '').toLowerCase().trim(),
        clientPhone: updates.clientPhone || order?.customerPhone || '',
        address: updates.address || order?.shippingAddress || '',
        city: updates.city || order?.shippingCity || 'Cali',
        department: updates.department || order?.shippingDepartment || 'Valle del Cauca',
        carrier: updates.carrier || 'Servientrega',
        trackingNumber: updates.trackingNumber || 'GUIA-PENDIENTE',
        trackingUrl: updates.trackingUrl || 'https://www.servientrega.com/',
        shippingType: updates.shippingType || 'Gratis',
        shippingCostCOP: Number(updates.shippingCostCOP) || 0,
        dispatchDate: updates.dispatchDate || now.slice(0, 10),
        estimatedDeliveryDate: updates.estimatedDeliveryDate || new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
        status: updates.status || 'Pendiente de despacho',
        notes: updates.notes || '',
        history: [
          {
            date: now,
            status: updates.status || 'Pendiente de despacho',
            actor: actorEmail,
            note: updates.statusNote || `Registro de envío con guía ${updates.trackingNumber || 'PENDIENTE'}`
          }
        ],
        createdAt: now,
        updatedAt: now,
        updatedBy: actorEmail
      };
      list.unshift(created);
      if (order) {
        order.shipmentId = created.id;
        order.trackingNumber = created.trackingNumber;
        order.carrier = created.carrier;
      }
      this.addAuditLog(actorEmail, 'REGISTRAR_ENVIO', `Registró envío para ${created.orderId} con guía ${created.trackingNumber}`, 'EXITOSO');
      this.save(undefined, actorEmail);
      return created;
    }

    const existing = list[idx];
    const nextStatus = updates.status || existing.status;
    const history = Array.isArray(existing.history) ? [...existing.history] : [];
    if (updates.status && updates.status !== existing.status) {
      history.unshift({
        date: now,
        status: nextStatus,
        actor: actorEmail,
        note: updates.statusNote || `Estado de envío actualizado a ${nextStatus} (Guía: ${updates.trackingNumber || existing.trackingNumber})`
      });
    }

    const updated: ShipmentRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      status: nextStatus,
      history,
      updatedAt: now,
      updatedBy: actorEmail
    };
    list[idx] = updated;

    const order = (this.data.orders || []).find(o => o.id === updated.orderId);
    if (order) {
      order.trackingNumber = updated.trackingNumber;
      order.carrier = updated.carrier;
      if (nextStatus === 'Despachado' || nextStatus === 'En tránsito' || nextStatus === 'En reparto') {
        order.status = 'Enviado';
      } else if (nextStatus === 'Entregado') {
        order.status = 'Entregado';
      }
    }

    if (nextStatus === 'Novedad' || nextStatus === 'Devuelto') {
      this.createAdminNotification({
        eventType: 'NOVEDAD_TRANSPORTADORA',
        title: `Novedad en transportadora (${updated.carrier}): Pedido ${updated.orderId}`,
        message: `El envío con guía ${updated.trackingNumber} para ${updated.clientName} reporta estado "${nextStatus}": ${updated.notes || 'Revisar con transportadora'}.`,
        severity: 'urgent',
        relatedEntityId: updated.orderId,
        relatedModule: 'warranties-shipping'
      });
    }

    this.addAuditLog(
      actorEmail,
      'ACTUALIZAR_ENVIO',
      `Actualizó envío del pedido ${updated.orderId} (Guía: ${updated.trackingNumber}, Estado: ${updated.status})`,
      'EXITOSO'
    );

    if (this.isCatalogPublished()) {
      this.emitCustomerPushEvent({
        type: 'SHIPMENT_UPDATE',
        title: `🚚 Envío de tu Pedido ${updated.orderId}: ${updated.status}`,
        body: `Transportadora ${updated.carrier} · Guía N° ${updated.trackingNumber}. Estado actual: ${updated.status}.`,
        tag: `shipment_${updated.orderId}_${updated.status}_${Date.now()}`,
        url: `/?tab=my-account&order=${encodeURIComponent(updated.orderId)}`,
        targetAudience: 'specific_customer',
        targetCustomerEmail: updated.clientEmail,
        targetCustomerPhone: updated.clientPhone,
        targetOrderId: updated.orderId,
        orderStatus: order?.status,
        trackingNumber: updated.trackingNumber,
        carrier: updated.carrier,
        createdBy: actorEmail
      });
    }

    this.save(undefined, actorEmail);
    return updated;
  }

  // =========================================================================
  // FLUJO DE AUTORIZACIÓN DE SUPERVISORES PARA PEDIDOS (SECCIÓN 8)
  // =========================================================================

  public getOrderAuthorizations(): OrderAuthorizationRequest[] {
    if (!this.data.orderAuthorizations) this.data.orderAuthorizations = [];
    return this.data.orderAuthorizations;
  }

  public createOrderAuthorizationRequest(
    params: {
      orderId: string;
      actionType: 'Modificar' | 'Cancelar' | 'Eliminar lógicamente';
      reason: string;
      proposedChanges: {
        status?: OrderStatus;
        notes?: string;
        shippingAddress?: string;
        isLogicallyDeleted?: boolean;
      };
    },
    actor: { email: string; name: string; role: UserRole }
  ): OrderAuthorizationRequest {
    const order = (this.data.orders || []).find(o => o.id === params.orderId);
    if (!order) throw new Error('Pedido no encontrado.');
    if (!params.reason || !params.reason.trim()) {
      throw new Error('Debe especificar el motivo de la solicitud de autorización al administrador principal.');
    }

    const reqRecord: OrderAuthorizationRequest = {
      id: `auth_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderId: order.id,
      customerName: order.customerName,
      orderTotalCOP: order.totalCOP,
      requestedByEmail: actor.email,
      requestedByName: actor.name,
      requestedByRole: actor.role,
      requestedAt: new Date().toISOString(),
      actionType: params.actionType,
      reason: params.reason.trim(),
      proposedChanges: params.proposedChanges,
      status: 'Pendiente'
    };

    if (!this.data.orderAuthorizations) this.data.orderAuthorizations = [];
    this.data.orderAuthorizations.unshift(reqRecord);

    this.createAdminNotification({
      eventType: 'SOLICITUD_AUTORIZACION_SUPERVISOR',
      title: `Autorización solicitada por Supervisor (${actor.name})`,
      message: `${actor.name} (${actor.email}) solicita autorización para "${params.actionType}" el pedido ${order.id} ($${order.totalCOP.toLocaleString('es-CO')} COP). Motivo: ${params.reason}`,
      severity: 'urgent',
      relatedEntityId: reqRecord.id,
      relatedModule: 'admin-orders'
    });

    this.addAuditLog(
      actor.email,
      'SOLICITAR_AUTORIZACION_PEDIDO',
      `Supervisor solicitó autorización al administrador principal para ${params.actionType} pedido ${order.id}. Motivo: ${params.reason}`,
      'EXITOSO'
    );
    this.save(undefined, actor.email);
    return reqRecord;
  }

  public reviewOrderAuthorizationRequest(
    requestId: string,
    decision: 'Aprobada' | 'Rechazada',
    reviewNotes: string,
    adminEmail = 'jeffervr@gmail.com'
  ): { request: OrderAuthorizationRequest; order?: Order } {
    const list = this.getOrderAuthorizations();
    const reqRecord = list.find(r => r.id === requestId);
    if (!reqRecord) throw new Error('Solicitud de autorización no encontrada.');
    if (reqRecord.status !== 'Pendiente') {
      throw new Error(`Esta solicitud ya fue ${reqRecord.status.toLowerCase()}.`);
    }

    reqRecord.status = decision;
    reqRecord.reviewedByEmail = adminEmail;
    reqRecord.reviewedAt = new Date().toISOString();
    reqRecord.reviewNotes = reviewNotes || (decision === 'Aprobada' ? 'Autorizado por Administrador Principal' : 'Rechazado por Administrador Principal');

    let updatedOrder: Order | undefined;
    if (decision === 'Aprobada') {
      const order = (this.data.orders || []).find(o => o.id === reqRecord.orderId);
      if (order) {
        if (reqRecord.proposedChanges.status) order.status = reqRecord.proposedChanges.status;
        if (reqRecord.proposedChanges.notes !== undefined) order.notes = reqRecord.proposedChanges.notes;
        if (reqRecord.proposedChanges.shippingAddress !== undefined) {
          order.shippingAddress = reqRecord.proposedChanges.shippingAddress;
        }
        if (reqRecord.proposedChanges.isLogicallyDeleted || reqRecord.actionType === 'Cancelar' || reqRecord.actionType === 'Eliminar lógicamente') {
          order.status = 'Cancelado';
          order.isLogicallyDeleted = Boolean(reqRecord.proposedChanges.isLogicallyDeleted);
        }
        order.authorizedBy = adminEmail;
        order.updatedAt = new Date().toISOString();
        order.updatedBy = `${reqRecord.requestedByEmail} (Autorizado por ${adminEmail})`;
        updatedOrder = order;
      }
    }

    this.addAuditLog(
      adminEmail,
      decision === 'Aprobada' ? 'APROBAR_AUTORIZACION_PEDIDO' : 'RECHAZAR_AUTORIZACION_PEDIDO',
      `${decision} solicitud ${reqRecord.id} de ${reqRecord.requestedByEmail} sobre pedido ${reqRecord.orderId}. Notas: ${reqRecord.reviewNotes}`,
      'EXITOSO'
    );

    if (decision === 'Aprobada' && updatedOrder && this.isCatalogPublished()) {
      this.emitCustomerPushEvent({
        type: 'ORDER_STATUS',
        title: `📦 Pedido ${updatedOrder.id} actualizado a: ${updatedOrder.status}`,
        body: `Hola ${updatedOrder.customerName}, el estado de tu pedido ${updatedOrder.id} ha sido actualizado a "${updatedOrder.status}".`,
        tag: `order_${updatedOrder.id}_${updatedOrder.status}_${Date.now()}`,
        url: `/?tab=my-account&order=${encodeURIComponent(updatedOrder.id)}`,
        targetAudience: 'specific_customer',
        targetCustomerEmail: updatedOrder.customerEmail,
        targetCustomerPhone: updatedOrder.customerPhone,
        targetOrderId: updatedOrder.id,
        orderStatus: updatedOrder.status,
        trackingNumber: updatedOrder.trackingNumber,
        carrier: updatedOrder.carrier,
        createdBy: adminEmail
      });
    }

    this.save(undefined, adminEmail);
    return { request: reqRecord, order: updatedOrder };
  }

  // =========================================================================
  // NOTIFICACIONES DEL ADMINISTRADOR PRINCIPAL (SECCIÓN 16)
  // =========================================================================

  public getAdminNotifications(): AdminNotification[] {
    if (!this.data.adminNotifications) {
      this.data.adminNotifications = INITIAL_ADMIN_NOTIFICATIONS;
    }
    return this.data.adminNotifications;
  }

  public createAdminNotification(params: {
    eventType: AdminNotificationEventType;
    title: string;
    message: string;
    severity?: 'info' | 'warning' | 'urgent' | 'success';
    relatedEntityId?: string;
    relatedModule?: string;
  }): AdminNotification {
    if (!this.data.adminNotifications) this.data.adminNotifications = [];
    const notif: AdminNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      targetAdminEmail: 'jeffervr@gmail.com',
      eventType: params.eventType,
      title: params.title,
      message: params.message,
      severity: params.severity || 'info',
      relatedEntityId: params.relatedEntityId,
      relatedModule: params.relatedModule,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.data.adminNotifications.unshift(notif);
    if (this.data.adminNotifications.length > 200) {
      this.data.adminNotifications = this.data.adminNotifications.slice(0, 200);
    }
    return notif;
  }

  public markAdminNotificationRead(id: string): boolean {
    const list = this.getAdminNotifications();
    const found = list.find(n => n.id === id);
    if (!found) return false;
    found.isRead = true;
    this.save();
    return true;
  }

  public markAllAdminNotificationsRead(): void {
    const list = this.getAdminNotifications();
    list.forEach(n => (n.isRead = true));
    this.save();
  }

  // =========================================================================
  // MOVIMIENTOS DE CAJA & TÉCNICOS PÚBLICOS (SECCIÓN 6 Y 11)
  // =========================================================================

  public getCashMovements(): CashMovement[] {
    if (!this.data.cashMovements) this.data.cashMovements = INITIAL_CASH_MOVEMENTS;
    return this.data.cashMovements;
  }

  public recordCashMovement(
    input: Omit<CashMovement, 'id' | 'createdAt'>,
    actorEmail = 'caja@ipstecnologica.com.co'
  ): CashMovement {
    if (!this.data.cashMovements) this.data.cashMovements = [];
    const mov: CashMovement = {
      id: `cash_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      ...input,
      recordedBy: actorEmail,
      createdAt: new Date().toISOString()
    };
    this.data.cashMovements.unshift(mov);
    this.addAuditLog(actorEmail, 'MOVIMIENTO_CAJA', `${mov.type}: ${mov.concept} ($${mov.amountCOP.toLocaleString('es-CO')} COP)`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return mov;
  }

  /**
   * Public safe technician list for "Agenda tu Servicio Técnico" (Section 11):
   * Only exposes id, name, specialty, and availability — never private emails, phones, or passwords.
   */
  public getPublicTechnicians(): PublicTechnicianInfo[] {
    const techs = this.getTechnicians();
    return techs.map((t, index) => {
      let specialty = 'Soporte Técnico Integral, Portátiles y Mantenimiento';
      if (t.name.toLowerCase().includes('redes') || t.name.toLowerCase().includes('diego')) {
        specialty = 'Servidores, Redes Corporativas, CCTV IP y Cableado Estructurado';
      } else if (t.name.toLowerCase().includes('andrés') || t.name.toLowerCase().includes('rojas')) {
        specialty = 'Workstations, Portátiles, Electrónica de Laboratorio y Actualización SSD/RAM';
      } else if (index % 2 === 1) {
        specialty = 'Diagnóstico Avanzado, Impresoras y Soporte a Domicilio';
      }
      return {
        id: t.id,
        name: t.name.replace(/\s*\(.*?\)\s*/g, '').trim(),
        specialty,
        availability: 'Disponible Lunes a Sábado (8:00 a.m. – 6:00 p.m.)'
      };
    });
  }

  // =========================================================================
  // SERVICE WORKER PUSH NOTIFICATIONS FOR CUSTOMERS (OFFERS & ORDER STATUS)
  // =========================================================================

  /**
   * Returns true when the online catalog is published and has active products
   */
  public isCatalogPublished(): boolean {
    const activeCount = (this.data.products || []).filter(p => p.isActive).length;
    return activeCount > 0;
  }

  public emitCustomerPushEvent(params: {
    type: CustomerPushEventType;
    title: string;
    body: string;
    tag?: string;
    url?: string;
    icon?: string;
    targetAudience: 'all_customers' | 'specific_customer';
    targetCustomerEmail?: string;
    targetCustomerPhone?: string;
    targetOrderId?: string;
    relatedProductId?: string;
    relatedProductRef?: string;
    relatedCategory?: string;
    discountBadge?: string;
    orderStatus?: OrderStatus;
    trackingNumber?: string;
    carrier?: string;
    createdBy?: string;
  }): CustomerPushEvent {
    if (!this.data.customerPushEvents) {
      this.data.customerPushEvents = [];
    }
    const id = `push_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const event: CustomerPushEvent = {
      id,
      type: params.type,
      title: params.title,
      body: params.body,
      tag: params.tag || id,
      url: params.url || '/?promo=active',
      icon: params.icon || '/pwa-192x192.png',
      targetAudience: params.targetAudience,
      targetCustomerEmail: params.targetCustomerEmail?.toLowerCase().trim(),
      targetCustomerPhone: params.targetCustomerPhone?.trim(),
      targetOrderId: params.targetOrderId?.toUpperCase().trim(),
      relatedProductId: params.relatedProductId,
      relatedProductRef: params.relatedProductRef,
      relatedCategory: params.relatedCategory,
      discountBadge: params.discountBadge,
      orderStatus: params.orderStatus,
      trackingNumber: params.trackingNumber,
      carrier: params.carrier,
      catalogPublished: this.isCatalogPublished(),
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy || 'Sistema IPS TECNOLÓGICA'
    };

    this.data.customerPushEvents.unshift(event);
    if (this.data.customerPushEvents.length > 150) {
      this.data.customerPushEvents = this.data.customerPushEvents.slice(0, 150);
    }
    return event;
  }

  public getCustomerPushEvents(filters?: {
    since?: string;
    email?: string;
    orderIds?: string[];
    includeOffers?: boolean;
    includeOrders?: boolean;
  }): CustomerPushEvent[] {
    if (!this.isCatalogPublished()) {
      return [];
    }
    const list = this.data.customerPushEvents || [];
    const sinceMs = filters?.since ? new Date(filters.since).getTime() : 0;
    const cleanEmail = (filters?.email || '').toLowerCase().trim();
    const trackedSet = new Set(
      (filters?.orderIds || []).map(id => String(id).toUpperCase().trim()).filter(Boolean)
    );
    const includeOffers = filters?.includeOffers !== false;
    const includeOrders = filters?.includeOrders !== false;

    return list.filter(ev => {
      if (!ev.catalogPublished) return false;
      if (sinceMs > 0 && !isNaN(sinceMs)) {
        const evMs = new Date(ev.createdAt).getTime();
        if (evMs <= sinceMs) return false;
      }

      if (ev.targetAudience === 'all_customers') {
        return includeOffers;
      }

      if (ev.targetAudience === 'specific_customer') {
        if (!includeOrders) return false;
        const matchesEmail =
          cleanEmail && ev.targetCustomerEmail && ev.targetCustomerEmail.toLowerCase().trim() === cleanEmail;
        const matchesOrder =
          ev.targetOrderId && trackedSet.has(ev.targetOrderId.toUpperCase().trim());
        return Boolean(matchesEmail || matchesOrder);
      }

      return false;
    });
  }

  public upsertCustomerPushSubscription(input: {
    deviceId: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    subscribedToOffers?: boolean;
    subscribedToOrders?: boolean;
    trackedOrderIds?: string[];
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    userAgent?: string;
    active?: boolean;
  }): CustomerPushSubscription {
    if (!this.data.customerPushSubscriptions) {
      this.data.customerPushSubscriptions = [];
    }
    const cleanDeviceId = String(input.deviceId || `dev_${Date.now()}`).trim();
    const now = new Date().toISOString();
    const existingIdx = this.data.customerPushSubscriptions.findIndex(
      s => s.deviceId === cleanDeviceId
    );

    const cleanOrders = Array.from(
      new Set(
        (input.trackedOrderIds || [])
          .map(id => String(id || '').toUpperCase().trim())
          .filter(Boolean)
      )
    );

    if (existingIdx >= 0) {
      const prev = this.data.customerPushSubscriptions[existingIdx];
      const mergedOrders = Array.from(new Set([...(prev.trackedOrderIds || []), ...cleanOrders]));
      const updated: CustomerPushSubscription = {
        ...prev,
        customerEmail:
          input.customerEmail !== undefined
            ? input.customerEmail.toLowerCase().trim()
            : prev.customerEmail,
        customerName: input.customerName !== undefined ? input.customerName.trim() : prev.customerName,
        customerPhone: input.customerPhone !== undefined ? input.customerPhone.trim() : prev.customerPhone,
        subscribedToOffers:
          input.subscribedToOffers !== undefined ? Boolean(input.subscribedToOffers) : prev.subscribedToOffers,
        subscribedToOrders:
          input.subscribedToOrders !== undefined ? Boolean(input.subscribedToOrders) : prev.subscribedToOrders,
        trackedOrderIds: input.trackedOrderIds !== undefined ? cleanOrders : mergedOrders,
        endpoint: input.endpoint || prev.endpoint,
        keys: input.keys || prev.keys,
        userAgent: input.userAgent || prev.userAgent,
        active: input.active !== undefined ? Boolean(input.active) : prev.active,
        updatedAt: now
      };
      this.data.customerPushSubscriptions[existingIdx] = updated;
      this.save();
      return updated;
    }

    const created: CustomerPushSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      deviceId: cleanDeviceId,
      customerEmail: input.customerEmail ? input.customerEmail.toLowerCase().trim() : undefined,
      customerName: input.customerName ? input.customerName.trim() : undefined,
      customerPhone: input.customerPhone ? input.customerPhone.trim() : undefined,
      subscribedToOffers: input.subscribedToOffers !== false,
      subscribedToOrders: input.subscribedToOrders !== false,
      trackedOrderIds: cleanOrders,
      endpoint: input.endpoint,
      keys: input.keys,
      userAgent: input.userAgent,
      active: input.active !== false,
      createdAt: now,
      updatedAt: now
    };
    this.data.customerPushSubscriptions.unshift(created);
    this.save();
    return created;
  }

  public getCustomerPushSubscriptions(): CustomerPushSubscription[] {
    return this.data.customerPushSubscriptions || [];
  }

  // =========================================================================
  // CRM & DIGITAL MARKETING MODULE (SECCIÓN 11)
  // =========================================================================

  public getCrmCustomers(): CrmCustomerRecord[] {
    if (!this.data.crmCustomers || this.data.crmCustomers.length === 0) {
      this.data.crmCustomers = INITIAL_CRM_CUSTOMERS;
    }
    // Sync any registered 'Cliente' users into CRM automatically if not already present
    const existingEmails = new Set(this.data.crmCustomers.map(c => c.email.toLowerCase().trim()));
    for (const u of this.data.users.filter(usr => usr.role === 'Cliente')) {
      const cleanEmail = u.email.toLowerCase().trim();
      if (!existingEmails.has(cleanEmail)) {
        const clientOrders = (this.data.orders || []).filter(
          o => o.customerEmail.toLowerCase().trim() === cleanEmail && o.status !== 'Cancelado'
        );
        const totalSpent = clientOrders.reduce((acc, o) => acc + (Number(o.totalCOP) || 0), 0);
        const now = new Date().toISOString();
        this.data.crmCustomers.push({
          id: `crm_${u.id}`,
          userId: u.id,
          fullName: u.name,
          documentOrNit: u.documentId || 'Pendiente',
          phone: u.phone || '+57 300 000 0000',
          whatsapp: u.phone || '+57 300 000 0000',
          email: cleanEmail,
          city: u.city || 'Cali, Valle del Cauca',
          address: clientOrders[0]?.shippingAddress || 'Cali, Colombia',
          classification: clientOrders.length >= 2 ? 'Cliente frecuente' : 'Cliente nuevo',
          totalPurchasesCOP: totalSpent,
          ordersCount: clientOrders.length,
          servicesCount: (this.data.technicalServices || []).filter(
            s => (s.clientEmail || '').toLowerCase().trim() === cleanEmail
          ).length,
          warrantiesCount: (this.data.warranties || []).filter(
            w => (w.clientEmail || '').toLowerCase().trim() === cleanEmail
          ).length,
          lastPurchaseDate: clientOrders[0]?.date,
          marketingConsent: true,
          consentDate: u.createdAt || now,
          optedOut: false,
          preferredCategories: ['Portátiles y Cómputo'],
          internalNotes: 'Cliente sincronizado desde el Portal de Clientes.',
          followUps: [],
          createdAt: u.createdAt || now,
          updatedAt: now
        });
        existingEmails.add(cleanEmail);
      }
    }
    return this.data.crmCustomers;
  }

  public upsertCrmCustomer(
    input: Partial<CrmCustomerRecord>,
    actorEmail = 'jeffervr@gmail.com'
  ): CrmCustomerRecord {
    const list = this.getCrmCustomers();
    const now = new Date().toISOString();
    const cleanEmail = String(input.email || '').toLowerCase().trim();
    const existingIdx = list.findIndex(
      c => c.id === input.id || (cleanEmail && c.email.toLowerCase().trim() === cleanEmail)
    );

    const resolvedName = (input.fullName || input.name || '').trim();

    if (existingIdx >= 0) {
      const prev = list[existingIdx];
      const updated: CrmCustomerRecord = {
        ...prev,
        ...input,
        id: prev.id,
        fullName: resolvedName || prev.fullName,
        name: resolvedName || prev.fullName,
        email: cleanEmail || prev.email,
        followUps: Array.isArray(input.followUps) ? input.followUps : prev.followUps || [],
        updatedAt: now
      };
      list[existingIdx] = updated;
      this.addAuditLog(actorEmail, 'ACTUALIZAR_CLIENTE_CRM', `Actualizó ficha CRM de ${updated.fullName} (${updated.classification})`, 'EXITOSO');
      this.save(undefined, actorEmail);
      return updated;
    }

    if (!resolvedName || !cleanEmail) {
      throw new Error('El nombre completo y correo electrónico son obligatorios para registrar en CRM.');
    }

    const created: CrmCustomerRecord = {
      id: `crm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fullName: resolvedName,
      name: resolvedName,
      companyName: input.companyName?.trim(),
      documentOrNit: (input.documentOrNit || input.documentId || 'N/A').trim(),
      phone: input.phone?.trim() || '+57 300 000 0000',
      whatsapp: input.whatsapp?.trim() || input.phone?.trim() || '+57 300 000 0000',
      email: cleanEmail,
      city: input.city?.trim() || 'Cali, Valle del Cauca',
      address: input.address?.trim() || 'Cali, Colombia',
      classification: input.classification || 'Prospecto',
      totalPurchasesCOP: Number(input.totalPurchasesCOP) || 0,
      ordersCount: Number(input.ordersCount) || 0,
      servicesCount: Number(input.servicesCount) || 0,
      warrantiesCount: Number(input.warrantiesCount) || 0,
      lastPurchaseDate: input.lastPurchaseDate,
      lastContactDate: now,
      nextFollowUpDate: input.nextFollowUpDate,
      marketingConsent: input.marketingConsent !== false,
      consentDate: input.marketingConsent !== false ? now : undefined,
      optedOut: Boolean(input.optedOut),
      preferredCategories: Array.isArray(input.preferredCategories) ? input.preferredCategories : [],
      internalNotes: input.internalNotes || '',
      followUps: Array.isArray(input.followUps) ? input.followUps : [],
      createdAt: now,
      updatedAt: now
    };
    this.data.crmCustomers!.unshift(created);
    this.addAuditLog(actorEmail, 'CREAR_CLIENTE_CRM', `Registró cliente CRM ${created.fullName} (${created.classification})`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return created;
  }

  public addCrmFollowUp(
    customerId: string,
    entry: Partial<CrmFollowUpEntry> & { note?: string; notes?: string; channel?: string; type?: string; nextFollowUpDate?: string; nextActionDate?: string },
    actorEmail = 'jeffervr@gmail.com'
  ): CrmCustomerRecord {
    const list = this.getCrmCustomers();
    const customer = list.find(c => c.id === customerId);
    if (!customer) throw new Error('Cliente CRM no encontrado.');

    const now = new Date().toISOString();
    const resolvedNote = (entry.note || entry.notes || entry.summary || '').trim();
    if (!resolvedNote) {
      throw new Error('Debe ingresar una nota o descripción del seguimiento comercial.');
    }
    const resolvedChannel = entry.channel || entry.type || 'WhatsApp';
    const resolvedNextDate = entry.nextFollowUpDate || entry.nextActionDate;

    const followUp: CrmFollowUpEntry = {
      id: `fup_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      date: now,
      type: resolvedChannel,
      channel: resolvedChannel,
      note: resolvedNote,
      notes: resolvedNote,
      summary: resolvedNote,
      nextActionDate: resolvedNextDate,
      nextFollowUpDate: resolvedNextDate,
      completed: Boolean(entry.completed),
      createdBy: actorEmail,
      actor: actorEmail
    };
    if (!customer.followUps) customer.followUps = [];
    customer.followUps.unshift(followUp);
    customer.lastContactDate = now;
    if (resolvedNextDate) customer.nextFollowUpDate = resolvedNextDate;
    customer.updatedAt = now;

    this.addAuditLog(actorEmail, 'SEGUIMIENTO_CRM', `Registró seguimiento (${resolvedChannel}) para ${customer.fullName}`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return customer;
  }

  public getCrmOpportunities(): CrmOpportunity[] {
    if (!this.data.crmOpportunities) {
      const now = new Date().toISOString();
      this.data.crmOpportunities = [
        {
          id: 'opp_seed_1',
          customerId: 'crm_1',
          customerName: 'Clínica Médica del Valle S.A.S.',
          customerEmail: 'compras@clinicavalle.co',
          title: 'Renovación de 8 Estaciones de Trabajo + Mantenimiento Preventivo Anual',
          description: 'Dotación de equipos corporativos Core i7 con SSD 1TB y póliza de soporte técnico presencial/remoto.',
          estimatedValueCOP: 28500000,
          stage: 'Cotización enviada',
          expectedCloseDate: new Date(Date.now() + 86400000 * 12).toISOString().slice(0, 10),
          assignedTo: 'jeffervr@gmail.com',
          relatedProductIds: ['prod_1', 'prod_2'],
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'opp_seed_2',
          customerId: 'crm_2',
          customerName: 'Ingeniería y Proyectos Pacífico Ltda.',
          customerEmail: 'gerencia@ingpacifico.com',
          title: 'Circuito Cerrado CCTV IP + Firewall Empresarial',
          description: 'Instalación de 16 cámaras IP 4K con NVR y configuración de red corporativa segura.',
          estimatedValueCOP: 12400000,
          stage: 'En negociación',
          expectedCloseDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
          assignedTo: 'jeffervr@gmail.com',
          relatedProductIds: ['prod_5'],
          createdAt: now,
          updatedAt: now
        }
      ];
    }
    return this.data.crmOpportunities;
  }

  public upsertCrmOpportunity(
    input: Partial<CrmOpportunity>,
    actorEmail = 'jeffervr@gmail.com'
  ): CrmOpportunity {
    const list = this.getCrmOpportunities();
    const now = new Date().toISOString();
    const idx = list.findIndex(o => o.id === input.id);
    if (idx >= 0) {
      const updated: CrmOpportunity = {
        ...list[idx],
        ...input,
        id: list[idx].id,
        estimatedValueCOP: Number(input.estimatedValueCOP ?? list[idx].estimatedValueCOP) || 0,
        updatedAt: now
      };
      list[idx] = updated;
      this.addAuditLog(actorEmail, 'ACTUALIZAR_OPORTUNIDAD_CRM', `Actualizó oportunidad "${updated.title}" (${updated.stage})`, 'EXITOSO');
      this.save(undefined, actorEmail);
      return updated;
    }

    const customer = this.getCrmCustomers().find(c => c.id === input.customerId);
    const created: CrmOpportunity = {
      id: `opp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      customerId: input.customerId || customer?.id || 'crm_general',
      customerName: (input.customerName || customer?.fullName || 'Cliente Empresarial').trim(),
      customerEmail: (input.customerEmail || customer?.email || '').trim(),
      title: (input.title || 'Nueva Oportunidad Comercial').trim(),
      description: (input.description || '').trim(),
      estimatedValueCOP: Number(input.estimatedValueCOP) || 0,
      stage: input.stage || 'Prospecto',
      expectedCloseDate: input.expectedCloseDate || new Date(Date.now() + 86400000 * 15).toISOString().slice(0, 10),
      assignedTo: input.assignedTo || actorEmail,
      relatedProductIds: Array.isArray(input.relatedProductIds) ? input.relatedProductIds : [],
      createdAt: now,
      updatedAt: now
    };
    list.unshift(created);
    this.addAuditLog(actorEmail, 'CREAR_OPORTUNIDAD_CRM', `Creó oportunidad comercial "${created.title}" ($${created.estimatedValueCOP.toLocaleString('es-CO')} COP)`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return created;
  }

  public deleteCrmOpportunity(id: string, actorEmail = 'jeffervr@gmail.com'): boolean {
    const list = this.getCrmOpportunities();
    const found = list.find(o => o.id === id);
    if (!found) return false;
    this.data.crmOpportunities = list.filter(o => o.id !== id);
    this.addAuditLog(actorEmail, 'ELIMINAR_OPORTUNIDAD_CRM', `Eliminó oportunidad comercial "${found.title}"`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return true;
  }

  public getMarketingCampaigns(): MarketingCampaign[] {
    if (!this.data.marketingCampaigns || this.data.marketingCampaigns.length === 0) {
      this.data.marketingCampaigns = INITIAL_MARKETING_CAMPAIGNS;
    }
    return this.data.marketingCampaigns.map(c => ({
      ...c,
      seasonOrObjective: c.seasonOrObjective || c.seasonOrTheme || c.objective || 'Temporada IPS',
      seasonOrTheme: c.seasonOrTheme || c.seasonOrObjective || 'Temporada IPS',
      targetClassification: c.targetClassification || (c.targetSegment as any) || 'Todos',
      targetSegment: c.targetSegment || c.targetClassification || 'Todos con autorización',
      whatsappTemplateText:
        c.whatsappTemplateText ||
        c.whatsappMessageTemplate ||
        'Hola {nombre} 👋, en *IPS TECNOLÓGICA* tenemos ofertas especiales para ti: https://ipstecnologica.com.co/catalogo',
      whatsappMessageTemplate:
        c.whatsappMessageTemplate ||
        c.whatsappTemplateText ||
        'Hola {nombre} 👋, en *IPS TECNOLÓGICA* tenemos ofertas especiales para ti: https://ipstecnologica.com.co/catalogo'
    }));
  }

  public upsertMarketingCampaign(
    input: Partial<MarketingCampaign>,
    actorEmail = 'jeffervr@gmail.com'
  ): MarketingCampaign {
    if (!this.data.marketingCampaigns || this.data.marketingCampaigns.length === 0) {
      this.data.marketingCampaigns = INITIAL_MARKETING_CAMPAIGNS;
    }
    const list = this.data.marketingCampaigns;
    const now = new Date().toISOString();
    const existingIdx = list.findIndex(c => c.id === input.id);

    const resolvedSeason = (input.seasonOrObjective || input.seasonOrTheme || input.objective || 'Temporada IPS').trim();
    const resolvedTarget = input.targetClassification || input.targetSegment || 'Todos';
    const resolvedTemplate =
      input.whatsappTemplateText ||
      input.whatsappMessageTemplate ||
      'Hola {nombre} 👋, en *IPS TECNOLÓGICA* tenemos ofertas especiales para ti en nuestro catálogo oficial: https://ipstecnologica.com.co/catalogo';

    if (existingIdx >= 0) {
      const prev = list[existingIdx];
      const updated: MarketingCampaign = {
        ...prev,
        ...input,
        id: prev.id,
        seasonOrObjective: resolvedSeason,
        seasonOrTheme: resolvedSeason,
        targetClassification: resolvedTarget,
        targetSegment: resolvedTarget,
        whatsappTemplateText: resolvedTemplate,
        whatsappMessageTemplate: resolvedTemplate,
        updatedAt: now
      };
      list[existingIdx] = updated;
      this.addAuditLog(actorEmail, 'ACTUALIZAR_CAMPANA_MARKETING', `Actualizó campaña "${updated.name}"`, 'EXITOSO');
      this.save(undefined, actorEmail);
      return updated;
    }

    const created: MarketingCampaign = {
      id: `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: (input.name || 'Nueva Campaña Comercial').trim(),
      description: (input.description || '').trim(),
      imageUrl: input.imageUrl,
      seasonOrObjective: resolvedSeason,
      seasonOrTheme: resolvedSeason,
      targetClassification: resolvedTarget,
      targetSegment: resolvedTarget,
      targetCategory: input.targetCategory || 'Todas',
      relatedProductIds: Array.isArray(input.relatedProductIds) ? input.relatedProductIds : [],
      discountCode: input.discountCode,
      discountPercent: Number(input.discountPercent) || undefined,
      channel: input.channel || 'WhatsApp',
      bannerTitle: input.bannerTitle || input.name || 'Promoción Especial IPS TECNOLÓGICA',
      whatsappTemplateText: resolvedTemplate,
      whatsappMessageTemplate: resolvedTemplate,
      startDate: input.startDate || now,
      endDate: input.endDate || new Date(Date.now() + 86400000 * 15).toISOString(),
      status: input.status || 'Activa',
      sentCount: Number(input.sentCount) || 0,
      clicksCount: Number(input.clicksCount) || 0,
      conversionsCount: Number(input.conversionsCount) || 0,
      revenueGeneratedCOP: Number(input.revenueGeneratedCOP) || 0,
      createdAt: now,
      updatedAt: now,
      createdBy: actorEmail
    };
    list.unshift(created);
    this.addAuditLog(actorEmail, 'CREAR_CAMPANA_MARKETING', `Creó campaña de marketing "${created.name}"`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return created;
  }

  public deleteMarketingCampaign(id: string, actorEmail = 'jeffervr@gmail.com'): boolean {
    const list = this.getMarketingCampaigns();
    const target = list.find(c => c.id === id);
    if (!target) return false;
    this.data.marketingCampaigns = list.filter(c => c.id !== id);
    this.addAuditLog(actorEmail, 'ELIMINAR_CAMPANA_MARKETING', `Eliminó campaña "${target.name}"`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return true;
  }

  // =========================================================================
  // LANDING PAGE EMPRESARIAL — CMS ADMINISTRABLE (SECCIÓN 2 Y 3)
  // =========================================================================

  private getDefaultLandingPageCms(): LandingPageCmsConfig {
    const now = new Date().toISOString();
    return {
      version: 1,
      publishedAt: now,
      updatedAt: now,
      updatedBy: 'jeffervr@gmail.com',
      hero: {
        badgeText: 'SOLUCIONES TECNOLÓGICAS EMPRESARIALES Y COMERCIALES EN COLOMBIA',
        title: 'Ingeniería, Soporte Técnico y Equipamiento para',
        highlightedTitle: 'Empresas y Hogares que No Pueden Detenerse',
        subtitle:
          'En IPS TECNOLÓGICA integramos venta de computadores corporativos, repuestos certificados, soporte técnico remoto y presencial, mantenimiento preventivo y correctivo, redes, licenciamiento y garantías directas bajo la Ley 1480 de 2011.',
        primaryCtaText: 'EXPLORAR CATÁLOGO ONLINE',
        secondaryCtaText: 'PORTAL DE CLIENTES',
        supportCtaText: 'AGENDA TU SERVICIO TÉCNICO',
        heroImageUrl: '/uploads/prod_1.svg',
        stats: [
          { label: 'Equipos y Repuestos en Catálogo', value: '36+ Referencias' },
          { label: 'Garantía Legal y Posventa', value: '100% Respaldada' },
          { label: 'Atención Remota y en Sitio', value: 'Lun - Sáb' },
          { label: 'Cobertura de Despachos', value: 'Nacional Colombia' }
        ]
      },
      about: {
        badgeText: 'QUIÉNES SOMOS · IPS TECNOLÓGICA',
        title: 'Aliado Tecnológico Integral con Respaldo, Organización y Atención Empresarial',
        description:
          'Somos una compañía colombiana especializada en soluciones de infraestructura TI, comercialización de hardware nuevo, repuestos y equipos remanufacturados verificados, junto con un centro de servicio técnico especializado para empresas, profesionales e instituciones.',
        mission:
          'Proveer soluciones tecnológicas confiables, suministro ágil de equipos y soporte técnico especializado que impulsen la productividad de nuestros clientes en Cali, el Valle del Cauca y toda Colombia.',
        vision:
          'Consolidarnos como el referente empresarial en servicios tecnológicos integrales, distinguidos por la transparencia técnica, cumplimiento de garantías y excelencia en el servicio posventa.',
        yearsExperience: 10,
        HighlightPoints: [
          'Laboratorio técnico propio con diagnóstico trazable por número de orden (SRV)',
          'Facturación e inventario verificado con precios transparentes en pesos colombianos (COP)',
          'Atención corporativa, pólizas de mantenimiento y soporte remoto seguro',
          'Cumplimiento estricto del Estatuto del Consumidor (Ley 1480 de 2011)'
        ]
      },
      howWeWork: [
        {
          step: 1,
          title: '1. Recibimos',
          description: 'Registramos tu requerimiento comercial o solicitud técnica con número único de seguimiento.'
        },
        {
          step: 2,
          title: '2. Diagnosticamos',
          description: 'Nuestro equipo de ingeniería evalúa el equipo o requerimiento en laboratorio, remoto o en sitio.'
        },
        {
          step: 3,
          title: '3. Proponemos',
          description: 'Presentamos cotización clara, repuestos certificados y tiempos reales antes de intervenir.'
        },
        {
          step: 4,
          title: '4. Solucionamos',
          description: 'Ejecutamos la reparación, mantenimiento o suministro con pruebas de calidad documentadas.'
        },
        {
          step: 5,
          title: '5. Acompañamos',
          description: 'Entregamos garantía escrita, factura/orden SRV en tu Portal de Clientes y soporte posventa.'
        }
      ],
      benefits: [
        {
          id: 'ben_1',
          title: 'Diagnóstico y Trazabilidad en Línea',
          description: 'Consulta el estado real de tus órdenes de servicio (SRV), pedidos, envíos y garantías desde el Portal de Clientes.'
        },
        {
          id: 'ben_2',
          title: 'Atención Remota, en Sede o a Domicilio',
          description: 'Nos adaptamos a la urgencia de tu operación con asistencia remota inmediata o visita técnica programada.'
        },
        {
          id: 'ben_3',
          title: 'Equipos Nuevos, Repuestos y Remanufacturados',
          description: 'Amplio portafolio con ficha técnica clara, condición visible y garantía específica por categoría.'
        },
        {
          id: 'ben_4',
          title: 'Envíos Seguros a Toda Colombia',
          description: 'Despachos con número de guía verificable a través de transportadoras aliadas a nivel nacional.'
        }
      ],
      services: [
        {
          id: 'srv_emp_1',
          title: 'Soporte Técnico Remoto y Presencial',
          category: 'Soporte Corporativo',
          shortDescription: 'Asistencia inmediata para resolver fallas operativas, configuración de correo, impresoras, red y sistemas.',
          features: ['Conexión remota segura autorizada', 'Visitas técnicas en sede o empresa', 'Atención por niveles de prioridad'],
          ctaText: 'Agendar Soporte',
          ctaAction: 'support',
          visible: true,
          order: 1
        },
        {
          id: 'srv_emp_2',
          title: 'Mantenimiento Preventivo y Correctivo',
          category: 'Laboratorio Hardware',
          shortDescription: 'Limpieza profunda electrónica, cambio de pasta térmica de alto rendimiento, optimización y reparación.',
          features: ['Portátiles, PCs corporativos y Todo en Uno', 'Pruebas de estrés y temperatura', 'Informe técnico en PDF'],
          ctaText: 'Solicitar Mantenimiento',
          ctaAction: 'support',
          visible: true,
          order: 2
        },
        {
          id: 'srv_emp_3',
          title: 'Servicio Técnico a Domicilio',
          category: 'Atención en Sitio',
          shortDescription: 'Desplazamiento de ingenieros y técnicos certificados a tu oficina u hogar con agendamiento confirmado.',
          features: ['Revisión de redes, Wi-Fi y cableado', 'Configuración de periféricos y servidores', 'Protocolo de seguridad empresarial'],
          ctaText: 'Programar Visita',
          ctaAction: 'support',
          visible: true,
          order: 3
        },
        {
          id: 'srv_emp_4',
          title: 'Venta de Equipos, Repuestos y Licencias',
          category: 'Comercialización TI',
          shortDescription: 'Portátiles empresariales, workstations, monitores, memorias RAM, discos SSD NVMe, baterías y periféricos.',
          features: ['Equipos nuevos y remanufacturados Grado A+', 'Precios especiales para empresas y mayoristas', 'Stock real sincronizado'],
          ctaText: 'Ver Catálogo',
          ctaAction: 'catalog',
          visible: true,
          order: 4
        },
        {
          id: 'srv_emp_5',
          title: 'Instalación de Software y Licenciamiento',
          category: 'Software & Seguridad',
          shortDescription: 'Instalación y parametrización de sistemas operativos, suites ofimáticas, antivirus corporativos y copias de seguridad.',
          features: ['Optimización de arranque y rendimiento', 'Migración de datos sin pérdida', 'Configuración de políticas de respaldo'],
          ctaText: 'Agendar Instalación',
          ctaAction: 'support',
          visible: true,
          order: 5
        },
        {
          id: 'srv_emp_6',
          title: 'Asesoría Tecnológica, Redes y CCTV IP',
          category: 'Infraestructura',
          shortDescription: 'Diseño e implementación de redes estructuradas, routers empresariales, firewalls y cámaras de seguridad IP.',
          features: ['Diagnóstico de cobertura y velocidad', 'Monitoreo desde celular o central', 'Proyectos llave en mano'],
          ctaText: 'Solicitar Asesoría',
          ctaAction: 'support',
          visible: true,
          order: 6
        }
      ],
      testimonials: [
        {
          id: 'test_1',
          clientName: 'Dr. Carlos Andrés Mejía',
          companyOrRole: 'Director Administrativo · Clínica Médica del Valle',
          city: 'Cali, Valle del Cauca',
          quote:
            'Con IPS TECNOLÓGICA logramos estandarizar el mantenimiento preventivo de nuestras 35 estaciones médicas y el suministro de portátiles con respuesta en menos de 4 horas.',
          rating: 5,
          serviceOrProduct: 'Mantenimiento Corporativo & Equipos',
          visible: true
        },
        {
          id: 'test_2',
          clientName: 'Ing. Carolina Ospina',
          companyOrRole: 'Gerente de Operaciones · Logística Andina S.A.S.',
          city: 'Bogotá / Cali',
          quote:
            'El Portal de Clientes nos permite descargar las órdenes de servicio en PDF, verificar las garantías y hacer seguimiento a cada guía de envío con total transparencia.',
          rating: 5,
          serviceOrProduct: 'Catálogo Corporativo & Portal de Clientes',
          visible: true
        },
        {
          id: 'test_3',
          clientName: 'Arq. Sebastián Valencia',
          companyOrRole: 'Estudio de Arquitectura & Renderizado 3D',
          city: 'Medellín, Antioquia',
          quote:
            'Adquirimos Workstations y actualizaciones SSD NVMe / RAM. Excelente asesoría técnica previa y cumplimiento exacto en los tiempos de entrega nacional.',
          rating: 5,
          serviceOrProduct: 'Workstations & Componentes de Alto Rendimiento',
          visible: true
        }
      ],
      faqs: [
        {
          id: 'faq_1',
          question: '¿Cómo agendo un servicio técnico o mantenimiento para mi equipo o empresa?',
          answer:
            'Haz clic en el botón "Agenda tu Servicio Técnico", completa los datos de tu equipo, modalidad (remoto, presencial en sede o a domicilio) y tu fecha/hora preferida. Recibirás un número único de seguimiento (SRV) y nuestro equipo administrativo asignará el especialista y confirmará tu cita.',
          category: 'Soporte Técnico',
          visible: true
        },
        {
          id: 'faq_2',
          question: '¿Qué diferencia hay entre productos Nuevos, Repuestos y Remanufacturados?',
          answer:
            'Los equipos Nuevos cuentan con 12 meses de garantía directa; los Repuestos (SSD, RAM, baterías, pantallas) cuentan con garantía específica por componente; y los equipos Remanufacturados son unidades revisadas en laboratorio con informe de estado estético, pruebas superadas y 6 meses de garantía conforme a la Ley 1480 de 2011.',
          category: 'Garantías',
          visible: true
        },
        {
          id: 'faq_3',
          question: '¿Qué puedo consultar dentro del Portal de Clientes?',
          answer:
            'Al iniciar sesión en tu cuenta puedes consultar tu historial de compras y pedidos, estado de envíos y números de guía, órdenes de servicio técnico (SRV), garantías vigentes, citas programadas, descargar documentos PDF y activar o desactivar notificaciones de promociones.',
          category: 'Portal de Clientes',
          visible: true
        },
        {
          id: 'faq_4',
          question: '¿Realizan envíos a otras ciudades de Colombia?',
          answer:
            'Sí. Realizamos despachos asegurados a todo el territorio colombiano mediante transportadoras aliadas (Servientrega, Inter Rapidísimo, Coordinadora, Envia) y registramos el número de guía en tu cuenta para seguimiento en línea.',
          category: 'Envíos',
          visible: true
        }
      ],
      sections: [
        { id: 'sec_hero', key: 'hero', title: 'Banner Principal Corporativo', subtitle: 'Propuesta de valor y accesos rápidos', visible: true, order: 1 },
        { id: 'sec_servicios', key: 'servicios_empresariales', title: 'Servicios Empresariales y Soporte Técnico', subtitle: 'Soluciones integrales de tecnología', visible: true, order: 2 },
        { id: 'sec_como', key: 'como_trabajamos', title: 'Cómo Trabajamos', subtitle: 'Recibimos · Diagnosticamos · Proponemos · Solucionamos · Acompañamos', visible: true, order: 3 },
        { id: 'sec_promos', key: 'promociones_destacadas', title: 'Promociones y Equipos Destacados', subtitle: 'Ofertas activas y catálogo en línea', visible: true, order: 4 },
        { id: 'sec_quienes', key: 'quienes_somos', title: 'Quiénes Somos', subtitle: 'Experiencia, respaldo e ingeniería', visible: true, order: 5 },
        { id: 'sec_beneficios', key: 'beneficios', title: 'Beneficios de Trabajar con IPS TECNOLÓGICA', subtitle: 'Ventajas competitivas para tu empresa u hogar', visible: true, order: 6 },
        { id: 'sec_garantias', key: 'garantias_envios', title: 'Garantías Ley 1480 y Envíos Nacionales', subtitle: 'Respaldo posventa transparente', visible: true, order: 7 },
        { id: 'sec_testimonios', key: 'testimonios', title: 'Clientes y Testimonios', subtitle: 'Empresas y profesionales que confían en nosotros', visible: true, order: 8 },
        { id: 'sec_remoto', key: 'soporte_remoto', title: 'Herramientas Oficiales de Soporte Remoto', subtitle: 'Asistencia técnica autorizada a distancia', visible: true, order: 9 },
        { id: 'sec_faq', key: 'faq', title: 'Preguntas Frecuentes', subtitle: 'Respuestas claras sobre nuestros servicios y garantías', visible: true, order: 10 },
        { id: 'sec_contacto', key: 'contacto', title: 'Contacto y Solicitud Empresarial', subtitle: 'Canales directos de atención comercial y técnica', visible: true, order: 11 }
      ],
      contactSection: {
        title: 'Contáctanos o Solicita una Cotización Empresarial',
        subtitle: 'Nuestro equipo comercial y de ingeniería responderá tu solicitud de manera prioritaria.',
        scheduleText: 'Lunes a Viernes: 8:00 a.m. – 6:00 p.m. · Sábados: 8:30 a.m. – 1:00 p.m.',
        addressText: this.data?.company?.address || 'Cali, Valle del Cauca, Colombia',
        phoneText: this.data?.company?.phone || '+57 310 894 7231',
        emailText: this.data?.company?.email || 'contacto@ipstecnologica.com.co'
      },
      previousVersions: []
    };
  }

  public getLandingPageCms(): LandingPageCmsConfig {
    if (!this.data.landingPageCms) {
      this.data.landingPageCms = this.getDefaultLandingPageCms();
    }
    return this.data.landingPageCms;
  }

  public updateLandingPageCms(
    updates: Partial<LandingPageCmsConfig>,
    actorEmail = 'jeffervr@gmail.com'
  ): LandingPageCmsConfig {
    const current = this.getLandingPageCms();
    const now = new Date().toISOString();
    const { previousVersions, ...snapshotWithoutHistory } = current;
    const history = Array.isArray(previousVersions) ? [...previousVersions] : [];
    history.unshift({
      version: current.version || 1,
      savedAt: now,
      savedBy: actorEmail,
      snapshot: JSON.parse(JSON.stringify(snapshotWithoutHistory))
    });

    const next: LandingPageCmsConfig = {
      ...current,
      ...updates,
      hero: updates.hero ? { ...current.hero, ...updates.hero } : current.hero,
      about: updates.about ? { ...current.about, ...updates.about } : current.about,
      howWeWork: Array.isArray(updates.howWeWork) ? updates.howWeWork : current.howWeWork,
      benefits: Array.isArray(updates.benefits) ? updates.benefits : current.benefits,
      services: Array.isArray(updates.services) ? updates.services : current.services,
      testimonials: Array.isArray(updates.testimonials) ? updates.testimonials : current.testimonials,
      faqs: Array.isArray(updates.faqs) ? updates.faqs : current.faqs,
      sections: Array.isArray(updates.sections) ? updates.sections : current.sections,
      contactSection: updates.contactSection
        ? { ...current.contactSection, ...updates.contactSection }
        : current.contactSection,
      version: (current.version || 1) + 1,
      publishedAt: now,
      updatedAt: now,
      updatedBy: actorEmail,
      previousVersions: history.slice(0, 15)
    };

    this.data.landingPageCms = next;
    this.addAuditLog(
      actorEmail,
      'PUBLICAR_PAGINA_PRINCIPAL',
      `Publicó versión v${next.version} de la Página Principal Empresarial`,
      'EXITOSO'
    );
    this.save(undefined, actorEmail);
    return next;
  }

  public restoreLandingPageCmsVersion(
    versionNumber: number,
    actorEmail = 'jeffervr@gmail.com'
  ): LandingPageCmsConfig {
    const current = this.getLandingPageCms();
    if (versionNumber === 0) {
      const def = this.getDefaultLandingPageCms();
      return this.updateLandingPageCms(def, actorEmail);
    }
    const found = (current.previousVersions || []).find(v => v.version === Number(versionNumber));
    if (!found) {
      throw new Error(`No se encontró la versión v${versionNumber} en el historial.`);
    }
    return this.updateLandingPageCms(found.snapshot, actorEmail);
  }

  // =========================================================================
  // PAYMENT METHODS, REMOTE SUPPORT TOOLS & WHATSAPP QR CONFIG (SECCIONES 7, 12, 14)
  // =========================================================================

  public getPaymentMethods(): PaymentMethodItem[] {
    if (!this.data.paymentMethods || this.data.paymentMethods.length === 0) {
      this.data.paymentMethods = INITIAL_PAYMENT_METHODS;
    }
    return [...this.data.paymentMethods].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public updatePaymentMethods(items: PaymentMethodItem[], actorEmail = 'jeffervr@gmail.com'): PaymentMethodItem[] {
    this.data.paymentMethods = items.map((item, idx) => ({
      ...item,
      displayOrder: item.displayOrder ?? idx + 1
    }));
    this.addAuditLog(actorEmail, 'ACTUALIZAR_MEDIOS_PAGO', `Actualizó configuración de medios de pago (${items.length} métodos)`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return this.getPaymentMethods();
  }

  public getRemoteSupportTools(): RemoteSupportToolItem[] {
    if (!this.data.remoteSupportTools || this.data.remoteSupportTools.length === 0) {
      this.data.remoteSupportTools = INITIAL_REMOTE_SUPPORT_TOOLS;
    }
    return this.data.remoteSupportTools;
  }

  public updateRemoteSupportTools(
    tools: RemoteSupportToolItem[],
    actorEmail = 'jeffervr@gmail.com'
  ): RemoteSupportToolItem[] {
    this.data.remoteSupportTools = tools;
    this.addAuditLog(actorEmail, 'ACTUALIZAR_APPS_SOPORTE_REMOTO', `Actualizó enlaces oficiales de soporte remoto`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return this.getRemoteSupportTools();
  }

  public getWhatsAppQrConfig(): WhatsAppQrConfig {
    if (!this.data.whatsappQrConfig) {
      this.data.whatsappQrConfig = INITIAL_WHATSAPP_QR_CONFIG;
    }
    return this.data.whatsappQrConfig;
  }

  public updateWhatsAppQrConfig(
    updates: Partial<WhatsAppQrConfig>,
    actorEmail = 'jeffervr@gmail.com'
  ): WhatsAppQrConfig {
    const current = this.getWhatsAppQrConfig();
    const cleanPhone = String(updates.phoneNumber || current.phoneNumber).replace(/[^\d+]/g, '');
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    const msg = updates.welcomeMessage !== undefined ? updates.welcomeMessage : current.welcomeMessage;
    const directWaMeUrl = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(msg)}`;

    const updated: WhatsAppQrConfig = {
      ...current,
      ...updates,
      phoneNumber: cleanPhone || current.phoneNumber,
      welcomeMessage: msg,
      directWaMeUrl,
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail
    };
    this.data.whatsappQrConfig = updated;
    if (this.data.company) {
      this.data.company.whatsapp = updated.phoneNumber;
      if (this.data.company.social) {
        this.data.company.social.whatsapp = directWaMeUrl;
      }
    }
    this.addAuditLog(actorEmail, 'CONFIGURAR_QR_WHATSAPP', `Actualizó número y QR oficial de WhatsApp (${updated.phoneNumber})`, 'EXITOSO');
    this.save(undefined, actorEmail);
    return updated;
  }

  // =========================================================================
  // DEMO USER READ-ONLY & FICTIONAL DATA ISOLATION (SECCIÓN 5)
  // =========================================================================

  public isDemoReadOnlyUser(emailOrRole?: string): boolean {
    if (!emailOrRole) return false;
    const clean = emailOrRole.toLowerCase().trim();
    return clean === 'demo@ipstecnologica.com' || clean === 'consulta';
  }

  public getDemoSafeCustomers(): Omit<User, 'passwordHash' | 'passwordSalt'>[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'demo_cli_1',
        name: 'Empresa Demostración Andina S.A.S. (Datos de Ejemplo)',
        email: 'contacto.demo@empresa-ejemplo.co',
        role: 'Cliente',
        phone: '+57 300 000 0001',
        documentId: '900.000.001-1',
        city: 'Cali, Valle del Cauca',
        status: 'Activo',
        isActive: true,
        createdAt: now
      },
      {
        id: 'demo_cli_2',
        name: 'Juan Pérez (Cliente Ficticio DEMO)',
        email: 'juan.perez.demo@ejemplo.co',
        role: 'Cliente',
        phone: '+57 300 000 0002',
        documentId: '1.100.000.002',
        city: 'Bogotá D.C.',
        status: 'Activo',
        isActive: true,
        createdAt: now
      }
    ];
  }

  public getDemoSafeOrders(): Order[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'PED-DEMO-001',
        customerEmail: 'contacto.demo@empresa-ejemplo.co',
        customerName: 'Empresa Demostración Andina S.A.S. (Datos Ficticios)',
        customerPhone: '+57 300 000 0001',
        date: now,
        totalCOP: 5290000,
        status: 'Confirmado',
        shippingAddress: 'Av. Ejemplo # 10-20 (Dato de Demostración)',
        notes: 'Pedido ficticio para visualización en modo DEMO de solo lectura.',
        items: [
          {
            productId: 'prod_2',
            reference: 'IPS-NB-002',
            name: 'Ultrabook Titan Slim 14" Core Ultra 7',
            quantity: 1,
            unitPriceCOP: 5290000,
            subtotalCOP: 5290000
          }
        ]
      }
    ];
  }

  public getDemoSafeCrmCustomers(): CrmCustomerRecord[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'crm_demo_1',
        fullName: 'Empresa Demostración Andina S.A.S. (DEMO)',
        companyName: 'Demostración Andina S.A.S.',
        documentOrNit: '900.000.001-1',
        phone: '+57 300 000 0001',
        whatsapp: '+57 300 000 0001',
        email: 'contacto.demo@empresa-ejemplo.co',
        city: 'Cali, Valle del Cauca',
        address: 'Av. Ejemplo # 10-20 (Modo DEMO)',
        classification: 'Cliente empresarial',
        totalPurchasesCOP: 5290000,
        ordersCount: 1,
        servicesCount: 1,
        warrantiesCount: 0,
        lastPurchaseDate: now,
        marketingConsent: true,
        consentDate: now,
        optedOut: false,
        preferredCategories: ['Portátiles y Cómputo'],
        internalNotes: 'Registro ficticio exclusivo para el usuario DEMO. Los datos reales de clientes están protegidos.',
        followUps: [],
        createdAt: now,
        updatedAt: now
      }
    ];
  }
}

export const db = new DatabaseStore();



