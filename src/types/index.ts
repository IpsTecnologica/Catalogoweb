export type UserRole =
  | 'Administrador'
  | 'Supervisor'
  | 'Técnico'
  | 'Caja'
  | 'Editor'
  | 'Consulta'
  | 'Cliente';

export type UserAccountStatus = 'Activo' | 'Inactivo';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  documentId?: string;
  city?: string;
  avatarUrl?: string;
  status?: UserAccountStatus;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type PromotionScope = 'product' | 'category';
export type PromotionDiscountType = 'percentage' | 'fixed_price' | 'fixed_discount';
export type PromotionManualStatus = 'active' | 'paused' | 'cancelled';
export type PromotionComputedStatus =
  | 'Programada'
  | 'Activa'
  | 'Pausada'
  | 'Finalizada'
  | 'Cancelada'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'expired'
  | 'cancelled';

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  scope: PromotionScope;
  targetId?: string;
  targetName?: string;
  targetLabel?: string;
  targetProductId?: string;
  targetCategory?: string;
  discountType: PromotionDiscountType;
  discountValue: number; // Percentage (1-99) or Fixed promotional price in COP
  startAt?: string;
  endAt?: string;
  startDate: string; // ISO string (stored in UTC, configured in America/Bogota)
  endDate: string; // ISO string (stored in UTC, configured in America/Bogota)
  timezone: string; // 'America/Bogota'
  manualStatus: PromotionManualStatus;
  computedStatus?: PromotionComputedStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivePromotionInfo {
  promotionId: string;
  name: string;
  description?: string;
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

export type ProductCondition = 'Nuevo' | 'Repuesto' | 'Remanufacturado';

export type ProductShippingType =
  | 'Gratis'
  | 'Pagado por el cliente'
  | 'Incluido en el precio'
  | 'Cotizado según destino';

export interface RemanufacturedDetails {
  aestheticGrade: string; // e.g., 'Grado A+ (Excelente)', 'Grado A (Muy bueno)'
  inspectedComponents: string | string[];
  replacedComponents?: string;
  testsPerformed?: string;
  diagnosticSummary?: string;
  durationMonths?: number;
  warrantyMonths?: number;
  coverage?: string;
  exclusions?: string;
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
  priceCOP: number; // Always the normal original price
  price?: number;
  costCOP?: number; // Optional cost price (only visible to admins/editors)
  stock?: number; // Available inventory units
  minStock?: number; // Minimum stock alert threshold
  serialNumbers?: string[];
  images: string[]; // images[0] is always the selected main image
  driveFileId?: string;
  driveViewUrl?: string;
  driveFileIds?: string[];
  warrantyMonths?: number;
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
    primary: string; // Rojo brillante #DC2626
    secondary: string; // Negro #111827
    accent: string; // Gris #475569
    background: string; // Blanco #FFFFFF
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
  id: string; // e.g. PED-2026-001
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  date: string;
  items: OrderItem[];
  subtotalCOP?: number;
  discountCode?: string;
  discountAmountCOP?: number;
  discountCOP?: number;
  shippingCostCOP?: number;
  totalCOP: number;
  status: OrderStatus;
  notes?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingDepartment?: string;
  acceptedPolicyVersion?: string;
  acceptedPolicyAt?: string;
  acceptedWarrantyPolicy?: boolean;
  shipmentId?: string;
  trackingNumber?: string;
  guideNumber?: string;
  carrier?: string;
  carrierName?: string;
  isLogicallyDeleted?: boolean;
  authorizedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type CatalogTemplateId =
  | 'corporativo'
  | 'minimalista'
  | 'darkpro'
  | 'navidad'
  | 'halloween'
  | 'amor_amistad'
  | 'dia_mujer'
  | 'dia_madre'
  | 'dia_padre'
  | 'black_friday'
  | 'regreso_clases'
  | 'ofertas_especiales'
  | string;

export interface CatalogOptions {
  title: string;
  subtitle: string;
  includeCover: boolean;
  template: CatalogTemplateId;
  categoryFilter?: string;
  onlyActive: boolean;
  selectedProductIds?: string[];
  includePrice: boolean;
  includeReference: boolean;
  includeDescription: boolean;
  includeTermsFooter: boolean;
  validityText?: string;
  offerValidityText?: string;
  customNotes?: string;
  marginMm?: number;
  seasonalTemplate?: SeasonalTemplate;
}

export interface AuditLogEntry {
  id?: string;
  date: string;
  user: string;
  action: string;
  detail: string;
  result: string;
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

/* ============================================================================
   TECHNICAL SUPPORT & APPOINTMENTS (MÓDULO DE SOPORTE TÉCNICO Y AGENDAMIENTO)
   ============================================================================ */

export type TechnicalServiceType =
  | 'Mantenimiento preventivo de computadores'
  | 'Mantenimiento correctivo de computadores'
  | 'Reparación de portátiles'
  | 'Reparación de impresoras'
  | 'Instalación de cámaras de seguridad'
  | 'Mantenimiento de cámaras de seguridad'
  | 'Configuración de redes e internet'
  | 'Instalación de programas y sistemas operativos'
  | 'Servicio técnico a domicilio'
  | 'Diagnóstico técnico especializado'
  | 'Asesoría tecnológica'
  | 'Soporte técnico preventivo'
  | 'Soporte técnico correctivo'
  | 'Mantenimiento de computadores'
  | 'Instalación de programas y licencias'
  | 'Configuración de impresoras y periféricos'
  | 'Solución de problemas de red'
  | 'Diagnóstico de equipos'
  | 'Otros servicios tecnológicos'
  | string;

export type TechnicalServiceModality =
  | 'En sede'
  | 'A domicilio'
  | 'Servicio a domicilio'
  | 'Remoto'
  | 'Domicilio';
export type ServiceModality = TechnicalServiceModality;
export type TechnicalServicePriority = 'Baja' | 'Media' | 'Alta' | 'Urgente';
export type ClientEntityType = 'Persona' | 'Empresa';

export type TechnicalServiceStatus =
  | 'Recibida'
  | 'Pendiente de asignación'
  | 'Asignada'
  | 'Confirmada'
  | 'En proceso'
  | 'Finalizada'
  | 'Cancelada'
  | 'Recibido'
  | 'Pendiente de diagnóstico'
  | 'En diagnóstico'
  | 'En reparación'
  | 'Esperando repuesto'
  | 'Esperando repuestos'
  | 'Terminado'
  | 'Entregado'
  | 'Cancelado'
  | 'Pendiente'
  | 'Confirmado'
  | 'Listo para entrega'
  | 'Finalizado'
  | 'Solicitud recibida'
  | 'Pendiente de confirmación'
  | 'Cita confirmada'
  | 'Técnico asignado'
  | 'Pendiente de repuesto'
  | 'Servicio finalizado';

export interface SparePartItem {
  id?: string;
  name: string;
  reference?: string;
  quantity: number;
  unitPriceCOP?: number;
  unitCostCOP?: number;
  subtotalCOP: number;
}
export type SparePartUsed = SparePartItem;

export interface TechnicalServiceRequest {
  id: string;
  ticketNumber: string; // e.g. SRV-2026-0001
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  companyName?: string;
  serviceType: string;
  equipmentType: string;
  equipmentBrand: string;
  equipmentModel: string;
  serialNumber?: string;
  problemDescription: string;
  observations?: string;
  photos: string[];
  beforePhotos: string[];
  afterPhotos: string[];
  modality: TechnicalServiceModality;
  address?: string;
  city: string;
  appointmentDate?: string; // YYYY-MM-DD
  appointmentTime?: string; // HH:mm
  appointmentEndTime?: string; // HH:mm
  durationMinutes?: number;
  priority: TechnicalServicePriority;
  status: TechnicalServiceStatus;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  assignedTechnicianEmail?: string;
  diagnosis?: string;
  technicalObservations?: string;
  activitiesPerformed?: string;
  spareParts: SparePartItem[];
  sparePartsUsed?: SparePartItem[];
  laborCostCOP: number;
  partsCostCOP: number;
  totalCostCOP: number;
  serviceWarrantyText?: string;
  serviceOrderPdfUrl?: string;
  googleCalendarEventId?: string;
  scheduleHistory?: Array<{
    date: string;
    action: string;
    actor: string;
    note: string;
  }>;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}
export type TechnicalServiceTicket = TechnicalServiceRequest;

export interface TechnicalAppointment {
  id: string;
  serviceId: string;
  serviceTicketNumber?: string;
  ticketNumber?: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceType: string;
  modality: TechnicalServiceModality;
  address?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  technicianId?: string;
  technicianName?: string;
  technicianEmail?: string;
  status: 'Pendiente' | 'Confirmada' | 'En curso' | 'Completada' | 'Reprogramada' | 'Cancelada';
  googleCalendarEventId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
export type SupportAppointment = TechnicalAppointment;

export type WarrantyCaseStatus =
  | 'Vigente'
  | 'Activa'
  | 'Solicitud recibida'
  | 'En revisión'
  | 'En diagnóstico'
  | 'En trámite con proveedor'
  | 'Aprobada'
  | 'Rechazada con justificación'
  | 'Reparada'
  | 'Reemplazada'
  | 'Finalizada'
  | 'En reclamación'
  | 'Vencida';

export type WarrantyCategoryType =
  | 'Producto Nuevo'
  | 'Repuesto'
  | 'Repuesto / Componente'
  | 'Remanufacturado'
  | 'Producto Remanufacturado'
  | 'Servicio Técnico';

export interface WarrantyHistoryEntry {
  date: string;
  status: WarrantyCaseStatus;
  actor: string;
  note: string;
}

export interface WarrantyRecord {
  id: string; // e.g. GAR-2026-001
  warrantyCode?: string;
  orderId?: string;
  serviceTicketNumber?: string;
  productId?: string;
  productReference?: string;
  productName?: string;
  productOrServiceName?: string;
  serialNumber?: string;
  type?: string;
  warrantyType?: WarrantyCategoryType;
  warrantyCategory?: WarrantyCategoryType;
  componentSubCategory?: string;
  policyId?: string;
  clientEmail: string;
  clientName: string;
  clientPhone?: string;
  customerEmail?: string;
  customerName?: string;
  startDate: string;
  endDate: string;
  purchaseDate?: string;
  expirationDate?: string;
  warrantyMonths?: number;
  monthsCoverage?: number;
  coverageTerms?: string;
  failureDescription?: string;
  reportedFailure?: string;
  claimReason?: string;
  claimDate?: string;
  photos?: string[];
  evidencePhotos?: string[];
  documents?: string[];
  technicalDiagnosis?: string;
  assignedTechnician?: string;
  assignedTechnicianName?: string;
  appliedSolution?: string;
  rejectionJustification?: string;
  status: WarrantyCaseStatus;
  documentUrl?: string;
  notes?: string;
  history?: WarrantyHistoryEntry[];
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productReference: string;
  productName: string;
  type: 'ENTRADA' | 'SALIDA' | 'SALIDA_VENTA' | 'AJUSTE' | 'VENTA' | 'REPUESTO_SERVICIO' | 'ELIMINACION_LOGICA' | 'RESTAURACION';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

/* ============================================================================
   BACKUPS, TRASH & RECOVERY (RESPALDOS Y RECUPERACIÓN DEL SISTEMA)
   ============================================================================ */

export type BackupType =
  | 'manual'
  | 'automatico_diario'
  | 'automatico_semanal'
  | 'por_modulo'
  | 'pre_restauracion'
  | 'completo'
  | 'diario_automatico'
  | 'semanal_completo';

export type BackupModuleScope =
  | 'completo'
  | 'productos_categorias'
  | 'clientes_usuarios_roles'
  | 'ventas_movimientos'
  | 'promociones'
  | 'citas_ordenes_servicio'
  | 'configuraciones_archivos'
  | 'solo_productos'
  | 'solo_clientes'
  | 'solo_usuarios'
  | 'solo_fotografias'
  | 'solo_catalogos'
  | 'solo_documentos'
  | 'solo_citas_ordenes';

export type BackupModuleType = BackupModuleScope | BackupType;

export interface BackupRecordMeta {
  id: string;
  fileName: string;
  localFileName?: string;
  name?: string;
  type: BackupType;
  moduleScope: BackupModuleScope;
  createdAt: string;
  createdBy: string;
  sizeBytes: number;
  itemsSummary?: string;
  recordCounts?: {
    products: number;
    users: number;
    orders: number;
    promotions: number;
    technicalServices: number;
    appointments: number;
    warranties?: number;
    inventoryMovements?: number;
  };
  counts?: {
    products: number;
    users: number;
    orders: number;
    promotions: number;
    technicalServices: number;
    appointments: number;
    warranties?: number;
    inventoryMovements?: number;
  };
  countsSummary?: {
    products: number;
    users: number;
    orders: number;
    promotions: number;
    technicalServices: number;
    appointments: number;
    warranties?: number;
    inventoryMovements?: number;
  };
  recordCount?: number;
  filesIncludedCount?: number;
  filesIncluded?: string[];
  driveFileId?: string | null;
  driveLink?: string | null;
  driveUrl?: string | null;
  status?: 'Completado' | 'Fallido';
  result?: 'EXITOSO' | 'ERROR';
  notes?: string;
}
export type BackupRecord = BackupRecordMeta;

export interface TrashItem {
  id: string;
  entityType: 'product' | 'user' | 'promotion' | 'technical_service' | 'order';
  entityId: string;
  entityName?: string;
  displayName?: string;
  name?: string;
  reference?: string;
  title?: string;
  subtitle?: string;
  deletedBy: string;
  deletedAt: string;
  payload?: any;
  data?: any;
}

/* ============================================================================
   CONNECTION STATUS & SYNC QUEUE (ESTADO DE CONEXIONES)
   ============================================================================ */

export interface SyncOperationRecord {
  id: string;
  entity?: string;
  tabName?: string;
  target?: 'GOOGLE_SHEETS' | 'GOOGLE_DRIVE' | 'GOOGLE_CALENDAR' | 'FIRESTORE';
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: string;
  payloadSummary?: string;
  payload?: any;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  lastAttemptAt?: string;
  attempts?: number;
  retryCount?: number;
  errorMessage?: string;
  lastError?: string;
  status: 'Pendiente' | 'Sincronizado' | 'Error' | 'PENDIENTE' | 'COMPLETADO' | 'ERROR' | 'pendiente' | 'sincronizado' | 'error';
}
export type PendingSyncOperation = SyncOperationRecord;

export interface ConnectionErrorLog {
  id: string;
  service: string;
  date: string;
  message: string;
  detail?: string;
  resolved: boolean;
}

export interface ConnectionStatusItem {
  name?: string;
  service?: string;
  status: 'Conectado' | 'Desconectado' | 'Error de sincronización';
  lastSyncAt?: string | null;
  lastBackupAt?: string | null;
  detail: string;
  errorMessage?: string;
}
export type ServiceConnectionStatus = ConnectionStatusItem;

export interface ConnectionsOverview {
  services: ConnectionStatusItem[];
  lastSyncAt: string | null;
  lastBackupAt: string | null;
  pendingOperationsCount?: number;
  pendingSyncCount?: number;
  pendingOperations?: SyncOperationRecord[];
  syncQueue?: SyncOperationRecord[];
  simulatedOffline: boolean;
}

/* ============================================================================
   WHATSAPP INTELIGENTE & GEMINI AI
   ============================================================================ */

export interface WhatsAppMessage {
  id: string;
  sender: 'client' | 'gemini' | 'advisor' | 'customer' | 'bot_gemini' | 'human_agent';
  senderName?: string;
  text: string;
  timestamp: string;
  intent?: string;
  usedGemini?: boolean;
}

export type WhatsAppConversationStatus =
  | 'En atención por bot'
  | 'Esperando asesor humano'
  | 'En atención humana'
  | 'Cerrada'
  | 'Bot activo'
  | 'Bot Activo'
  | 'Pendiente asesor'
  | 'Atendido por asesor'
  | 'Cerrado'
  | 'en_atencion_bot'
  | 'esperando_asesor'
  | 'atendido_humano'
  | 'cerrado';

export interface WhatsAppConversation {
  id: string;
  phone?: string;
  clientPhone?: string;
  customerPhone?: string;
  clientName: string;
  customerName?: string;
  clientEmail?: string;
  status: WhatsAppConversationStatus;
  assignedAdvisor?: string;
  botEnabled?: boolean;
  unreadCount: number;
  lastMessageText: string;
  lastMessage?: string;
  lastMessagePreview?: string;
  lastMessageAt: string;
  createdAt?: string;
  updatedAt?: string;
  messages: WhatsAppMessage[];
}

export interface WhatsAppConfig {
  enabled?: boolean;
  botActiveGlobal?: boolean;
  chatbotActive?: boolean;
  geminiEnabled?: boolean;
  geminiModel?: string;
  businessPhone: string;
  phoneNumberId?: string;
  metaPhoneNumberId?: string;
  metaBusinessAccountId?: string;
  verifyToken?: string;
  webhookVerifyToken?: string;
  metaVerifyToken?: string;
  metaWebhookVerifyToken?: string;
  metaTokenConfigured?: boolean;
  metaCloudConfigured?: boolean;
  autoReplyEnabled?: boolean;
  autoReplyDelayMs?: number;
  systemPrompt?: string;
  customSystemPrompt?: string;
  welcomeMessage: string;
  outOfHoursMessage?: string;
  humanEscalationMessage?: string;
  autoReplySchedules?: string;
  businessHoursText?: string;
  paymentMethodsText?: string;
  shippingPolicyText?: string;
  warrantyPolicyText?: string;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface WhatsAppIntegrationErrorLog {
  id: string;
  timestamp: string;
  operation:
    | 'CONEXION_META'
    | 'ENVIO_MENSAJE'
    | 'WEBHOOK_VERIFICACION'
    | 'WEBHOOK_FIRMA'
    | 'WEBHOOK_RECEPCION'
    | 'CONFIGURACION';
  statusCode?: number;
  errorMessage: string;
  detail?: string;
}

export interface WhatsAppBusinessIntegrationView {
  publicAppUrl: string;
  vitePublicAppUrl: string;
  compiledVitePublicAppUrl: string;
  webhookUrl: string;
  integrationEnabled: boolean;
  isConfigured: boolean;
  connectionStatus: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
  lastConnectionTestAt: string | null;
  lastConnectionMessage: string;
  verifiedPhoneName: string | null;
  verifiedDisplayNumber: string | null;
  updatedAt: string;
  updatedBy: string;
  secretsStatus: {
    accessTokenConfigured: boolean;
    accessTokenSource: 'vault_aes256gcm' | 'process_env' | 'none';
    phoneNumberIdConfigured: boolean;
    phoneNumberIdMasked: string | null;
    phoneNumberIdSource: 'vault_aes256gcm' | 'process_env' | 'none';
    verifyTokenConfigured: boolean;
    verifyTokenSource: 'vault_aes256gcm' | 'process_env' | 'none';
    appSecretConfigured: boolean;
    appSecretSource: 'vault_aes256gcm' | 'process_env' | 'none';
  };
  storageMechanism: {
    encryptionAlgorithm: string;
    vaultLocation: string;
    isolatedFromFrontend: boolean;
    isolatedFromSheetsAndFirestore: boolean;
    cloudRunPersistenceNote: string;
  };
  errorLogs: WhatsAppIntegrationErrorLog[];
}

export interface WhatsAppCommunicationEventItem {
  id: string;
  type: 'ENVIADO' | 'RECIBIDO' | 'ERROR';
  directionLabel: string;
  channel: string;
  phone: string;
  contactName: string;
  summary: string;
  detail?: string;
  status: 'Exitoso' | 'Recibido' | 'Fallido';
  timestamp: string;
}

export interface WhatsAppCommunicationLogsResponse {
  items: WhatsAppCommunicationEventItem[];
  allLatest20Count: number;
  counts: {
    all: number;
    sent: number;
    received: number;
    errors: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface GeminiIntegrationView {
  enabled: boolean;
  isConfigured: boolean;
  apiKeyConfigured: boolean;
  apiKeySource: 'vault_aes256gcm' | 'process_env' | 'none';
  apiKeyMasked: string | null;
  model: string;
  availableModels: string[];
  systemInstructions: string;
  connectionStatus: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
  lastTestAt: string | null;
  lastTestMessage: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SystemIntegrationTestRecord {
  id: string;
  moduleKey: string;
  moduleName: string;
  timestamp: string;
  actor: string;
  status: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
  success: boolean;
  message: string;
}

/* ============================================================================
   PLANTILLAS Y DISEÑOS POR TEMPORADA (SECCIÓN 3)
   ============================================================================ */

export interface SeasonalTemplate {
  id: string;
  name: string;
  seasonKey: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  headerTextColor: string;
  bannerTitle: string;
  bannerSubtitle: string;
  bannerImageUrl?: string;
  backgroundImageUrl?: string;
  backgroundDriveFileId?: string;
  logoUrl?: string;
  decorativeBadge: string;
  badgeText?: string;
  promoBlockText: string;
  buttonStyle: 'rounded-xl' | 'rounded-full' | 'rounded-lg';
  fontFamily: string;
  headerStyle?: string;
  footerStyle?: string;
  cardFrameStyle?: string;
  promoTagStyle?: string;
  startAt?: string;
  endAt?: string;
  isActiveHome?: boolean;
  isActiveWeb: boolean;
  isActivePdf: boolean;
  isDefaultCorporate?: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

/* ============================================================================
   PROMOCIONES Y DESTACADOS DE TEMPORADA (6 ESPACIOS EN CARRUSEL)
   ============================================================================ */

export interface PromoBannerItem {
  id: string;
  slot: 1 | 2 | 3 | 4 | 5 | 6 | number;
  order: number;
  title: string;
  description: string;
  badgeText?: string;
  imageUrl: string;
  driveFileId?: string;
  normalPriceCOP?: number;
  originalPriceCOP?: number;
  promotionalPriceCOP?: number;
  discountPercentage?: number;
  discountPercent?: number;
  ctaText: string;
  linkType: 'product' | 'category';
  linkTarget: string; // Product reference/ID or Category name
  targetCategory?: string;
  targetProductId?: string;
  startAt?: string;
  endAt?: string;
  endDate?: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy?: string;
}

/* ============================================================================
   GENERADOR DE CÓDIGOS DE DESCUENTO (SECCIÓN 12)
   ============================================================================ */

export interface DiscountCodeUsageRecord {
  id: string;
  orderId: string;
  customerEmail: string;
  customerName?: string;
  discountAppliedCOP: number;
  orderSubtotalCOP: number;
  usedAt: string;
}

export interface DiscountCode {
  id: string;
  code: string; // e.g., IPS10, NAVIDAD20, HALLOWEEN15, AMORYAMISTAD, MUJER2027
  description: string;
  discountType: 'percentage' | 'fixed_cop';
  discountValue: number;
  expirationDate: string; // ISO date
  maxUses: number;
  usedCount: number;
  minPurchaseCOP: number;
  allowedCategory?: string; // Optional category filter ('Todas' or specific)
  allowedProductIds?: string[]; // Optional product IDs
  isActive: boolean;
  usageHistory: DiscountCodeUsageRecord[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/* ============================================================================
   POLÍTICAS DE GARANTÍAS Y ENVÍOS + SEGUIMIENTO DE ENVÍOS (SECCIÓN 15)
   ============================================================================ */

export type PolicyCategoryKey =
  | 'garantia_nuevo'
  | 'garantia_repuesto'
  | 'garantia_remanufacturado'
  | 'garantia_servicio'
  | 'politica_envio';

export interface SparePartPolicyRule {
  componentType: string; // Memorias RAM, Discos SSD y HDD, Pantallas, Baterías, etc.
  category?: string;
  durationMonths: number;
  warrantyMonths?: number;
  requiresTechInstallation: boolean;
  coverage: string;
  exclusions: string;
  conditions?: string;
}

export interface ShippingZoneRule {
  zone: string; // Envíos dentro de Cali, Valle del Cauca, Nacional Colombia
  zoneName?: string;
  carriers: string[];
  estimatedTime: string;
  baseCostCOP: number;
  freeShippingMinCOP: number;
  costRule?: string;
  conditions: string;
}

export interface PolicyDocument {
  id: string;
  code: string;
  category: PolicyCategoryKey;
  title: string;
  version: string;
  summary: string;
  content?: string;
  legalFramework: string; // Ley 1480 de 2011 - Estatuto del Consumidor Colombia
  durationMonths: number;
  coveragePeriod?: string;
  startCondition: string;
  coverageDetails: string[];
  coveredItems?: string[];
  exclusions: string[];
  excludedCauses?: string[];
  requirements: string[];
  claimRequirements?: string[];
  claimProcedure: string[];
  StepByStepProcess?: string[];
  estimatedAttentionTime: string;
  responseTimes?: string;
  possibleSolutions?: string[];
  sparePartRules?: SparePartPolicyRule[];
  sparePartsSubCategories?: SparePartPolicyRule[];
  shippingZones?: ShippingZoneRule[];
  isActive: boolean;
  updatedAt: string;
  updatedBy: string;
}

export type ShipmentStatus =
  | 'Pendiente de despacho'
  | 'Preparando pedido'
  | 'Despachado'
  | 'En tránsito'
  | 'En reparto'
  | 'Entregado'
  | 'Novedad'
  | 'Devuelto';

export interface ShipmentHistoryEntry {
  date: string;
  status: ShipmentStatus;
  actor: string;
  note: string;
}

export interface ShipmentRecord {
  id: string;
  orderId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  address: string;
  city: string;
  department: string;
  carrier: string;
  trackingNumber: string; // Número de guía manual
  guideNumber?: string;
  trackingUrl?: string;
  shippingType: ProductShippingType;
  shippingCostCOP: number;
  dispatchDate?: string;
  estimatedDeliveryDate?: string;
  status: ShipmentStatus;
  notes?: string;
  history: ShipmentHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

/* ============================================================================
   AUTORIZACIÓN DE SUPERVISORES PARA PEDIDOS (SECCIÓN 8)
   ============================================================================ */

export interface OrderAuthorizationRequest {
  id: string;
  orderId: string;
  customerName: string;
  orderTotalCOP: number;
  requestedByEmail: string;
  requestedByName: string;
  requestedByRole: UserRole;
  requestedAt: string;
  actionType: 'Modificar' | 'Cancelar' | 'Eliminar lógicamente';
  reason: string;
  proposedChanges: {
    status?: OrderStatus;
    notes?: string;
    shippingAddress?: string;
    isLogicallyDeleted?: boolean;
  };
  status: 'Pendiente' | 'Aprobada' | 'Rechazada';
  reviewedByEmail?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

/* ============================================================================
   NOTIFICACIONES DEL ADMINISTRADOR PRINCIPAL (SECCIÓN 16)
   ============================================================================ */

export type AdminNotificationEventType =
  | 'NUEVO_CLIENTE'
  | 'NUEVO_PEDIDO'
  | 'PEDIDO_MODIFICADO'
  | 'SOLICITUD_AUTORIZACION_SUPERVISOR'
  | 'NUEVA_CITA'
  | 'NUEVA_ORDEN_SRV'
  | 'SOLICITUD_GARANTIA'
  | 'GARANTIA_POR_VENCER'
  | 'ENVIO_PENDIENTE'
  | 'NOVEDAD_TRANSPORTADORA'
  | 'PROMOCION_POR_VENCER'
  | 'CODIGO_DESCUENTO_USADO'
  | 'ERROR_ALMACENAMIENTO'
  | 'ERROR_SINCRONIZACION'
  | 'RESPALDO_EXITOSO'
  | 'RESPALDO_FALLIDO'
  | 'RESTAURACION_REALIZADA';

export interface AdminNotification {
  id: string;
  targetAdminEmail: string; // 'jeffervr@gmail.com'
  eventType: AdminNotificationEventType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent' | 'success';
  relatedEntityId?: string;
  relatedModule?: string;
  isRead: boolean;
  read?: boolean;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  type: 'INGRESO_VENTA' | 'INGRESO_SERVICIO' | 'EGRESO_GASTO' | 'REEMBOLSO_GARANTIA';
  referenceId: string;
  concept: string;
  amountCOP: number;
  paymentMethod: string;
  recordedBy: string;
  createdAt: string;
}

export interface PublicTechnicianInfo {
  id: string;
  name: string;
  specialty: string;
  availability: string;
}

/* ============================================================================
   NOTIFICACIONES PUSH DEL SERVICE WORKER PARA CLIENTES (OFERTAS Y PEDIDOS)
   ============================================================================ */

export type CustomerPushEventType =
  | 'NEW_OFFER'
  | 'PROMO_ACTIVATED'
  | 'DISCOUNT_CODE'
  | 'PROMO_BANNER'
  | 'ORDER_STATUS'
  | 'SHIPMENT_UPDATE'
  | 'new_offer'
  | 'order_status'
  | 'shipment_update';

export interface CustomerPushEvent {
  id: string;
  type: CustomerPushEventType;
  title: string;
  body: string;
  tag: string;
  url: string;
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
  catalogPublished: boolean;
  createdAt: string;
  createdBy: string;
}

export interface CustomerPushSubscription {
  id: string;
  deviceId: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  subscribedToOffers: boolean;
  subscribedToOrders: boolean;
  trackedOrderIds: string[];
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
  userAgent?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ============================================================================
   ALMACENAMIENTO PERMANENTE DE IMÁGENES Y ARCHIVOS EN GOOGLE DRIVE (SECCIÓN 1)
   ============================================================================ */

export type DriveOfficialFolderPath =
  | 'IPS TECNOLÓGICA / Productos'
  | 'IPS TECNOLÓGICA / Productos / Fotografías principales'
  | 'IPS TECNOLÓGICA / Productos / Fotografías adicionales'
  | 'IPS TECNOLÓGICA / Banners'
  | 'IPS TECNOLÓGICA / Logos'
  | 'IPS TECNOLÓGICA / Plantillas'
  | 'IPS TECNOLÓGICA / Catálogos PDF'
  | 'IPS TECNOLÓGICA / Documentos'
  | 'IPS TECNOLÓGICA / Clientes'
  | 'IPS TECNOLÓGICA / Órdenes de servicio'
  | 'IPS TECNOLÓGICA / Garantías'
  | 'IPS TECNOLÓGICA / Respaldos';

export interface DriveMediaAsset {
  id: string;
  driveFileId: string;
  fileName: string;
  originalFileName: string;
  originalName?: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  folderPath: DriveOfficialFolderPath;
  productId?: string;
  productReference?: string;
  isPrimaryPhoto?: boolean;
  stableUrl: string;
  localUrl?: string;
  driveViewUrl: string;
  verifiedInDrive: boolean;
  verifiedInSheets: boolean;
  status: 'active' | 'archived_previous' | 'broken';
  replacedByDriveFileId?: string;
  previousDriveFileId?: string;
  uploadedBy: string;
  createdAt: string;
  lastVerifiedAt: string;
}

export interface DrivePersistenceTestStep {
  stepNumber: number;
  title: string;
  status: 'APROBADO' | 'PENDIENTE_24H' | 'FALLIDO';
  detail: string;
  timestamp: string;
}

/* ============================================================================
   CRM Y MARKETING DIGITAL – IPS TECNOLÓGICA (SECCIÓN 8)
   ============================================================================ */

export type CrmClassification =
  | 'Nuevo'
  | 'Prospecto'
  | 'Frecuente'
  | 'Empresarial'
  | 'Mayorista'
  | 'Inactivo'
  | 'Cliente nuevo'
  | 'Cliente frecuente'
  | 'Cliente empresarial'
  | 'Cliente mayorista'
  | 'Cliente inactivo'
  | 'Cliente potencial';

export interface CrmFollowUpEntry {
  id: string;
  date: string;
  actor?: string;
  createdBy?: string;
  channel?: 'WhatsApp' | 'Llamada' | 'Correo' | 'Visita' | 'Soporte SRV' | string;
  type?: string;
  note?: string;
  notes?: string;
  summary?: string;
  nextFollowUpDate?: string;
  nextActionDate?: string;
  completed?: boolean;
}

export interface CrmOpportunity {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  title: string;
  description: string;
  estimatedValueCOP: number;
  stage: 'Prospecto' | 'Cotización enviada' | 'En negociación' | 'Ganada' | 'Perdida';
  expectedCloseDate: string;
  assignedTo: string;
  relatedProductIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CrmCustomerRecord {
  id: string;
  userId?: string;
  fullName: string;
  name?: string;
  email: string;
  phone: string;
  whatsapp?: string;
  documentOrNit?: string;
  documentId?: string;
  companyName?: string;
  city: string;
  address?: string;
  clientType?: 'Persona Natural' | 'Empresa / Corporativo';
  classification: CrmClassification;
  status?: 'Activo' | 'En seguimiento' | 'Inactivo' | 'Prospecto' | 'Nuevo' | 'Frecuente' | 'Empresarial' | 'Mayorista';
  lastPurchaseDate?: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  totalPurchasesCOP: number;
  ordersCount: number;
  servicesCount: number;
  warrantiesCount: number;
  preferredCategories?: string[];
  internalNotes: string;
  followUps: CrmFollowUpEntry[];
  marketingConsent: boolean;
  consentAccepted?: boolean;
  consentDate?: string;
  optedOut: boolean;
  optOutCommercial?: boolean;
  optOutDate?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  seasonOrObjective?: string;
  seasonOrTheme?: string;
  objective?: string;
  targetClassification?: CrmClassification | 'Todos' | string;
  targetSegment?: CrmClassification | 'Todos con autorización' | 'Todos con consentimiento' | string;
  targetCategory?: string;
  relatedProductIds?: string[];
  promotionId?: string;
  discountCode?: string;
  discountPercent?: number;
  bannerTitle?: string;
  channel?: 'WhatsApp' | 'Correo' | 'Catálogo Web' | 'Portal de Clientes' | 'Multicanal';
  whatsappTemplateText?: string;
  whatsappMessageTemplate?: string;
  messageTemplate?: string;
  whatsappPreparedText?: string;
  startDate: string;
  endDate: string;
  campaignDate?: string;
  status: 'Borrador' | 'Programada' | 'Activa' | 'Pausada' | 'Finalizada';
  sentCount: number;
  clicksCount: number;
  eligibleRecipientsCount?: number;
  clicksOrResponsesCount?: number;
  conversionsCount: number;
  revenueGeneratedCOP: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/* ============================================================================
   MEDIOS DE PAGO, SOPORTE REMOTO Y WHATSAPP QR (SECCIONES 7, 10, 12)
   ============================================================================ */

export interface PaymentMethodItem {
  id: string;
  name: string;
  category: 'Efectivo' | 'Transferencia' | 'Billetera Digital' | 'Tarjetas' | 'QR' | 'Enlace de Pago' | 'Otro';
  description: string;
  instructions?: string;
  badgeText?: string;
  logoUrl?: string;
  enabled: boolean;
  isActive?: boolean;
  displayOrder: number;
  order?: number;
}

export interface RemoteSupportToolItem {
  id: string;
  programName: string;
  name?: string;
  operatingSystem: 'Windows' | 'macOS' | 'Linux' | 'Android / iOS';
  platforms?: string;
  description: string;
  version: string;
  officialDownloadUrl: string;
  instructions: string[];
  requirements: string;
  supportHours?: string;
  privacyNotice?: string;
  updatedAt: string;
  enabled: boolean;
  isActive?: boolean;
}

export interface WhatsAppQrConfig {
  whatsappNumber?: string;
  countryCode?: string;
  phoneNumber: string;
  businessName?: string;
  welcomeMessage: string;
  defaultWelcomeMessage?: string;
  catalogInquiryMessage?: string;
  supportInquiryMessage?: string;
  orderInquiryMessage?: string;
  customerServiceMessage?: string;
  ordersMessage?: string;
  appointmentsMessage?: string;
  warrantiesMessage?: string;
  shipmentsMessage?: string;
  directWaMeUrl: string;
  qrEnabled: boolean;
  showFloatingButton?: boolean;
  geminiFreeEnabled?: boolean;
  updatedAt: string;
  updatedBy: string;
}

/* ============================================================================
   LANDING PAGE EMPRESARIAL — CMS ADMINISTRABLE (SECCIÓN 2 Y 3)
   ============================================================================ */

export interface LandingServiceItem {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  features: string[];
  ctaText: string;
  ctaAction: 'support' | 'catalog' | 'portal' | 'whatsapp';
  imageUrl?: string;
  visible: boolean;
  order: number;
}

export interface LandingTestimonialItem {
  id: string;
  clientName: string;
  companyOrRole: string;
  city: string;
  quote: string;
  rating: number;
  serviceOrProduct: string;
  visible: boolean;
}

export interface LandingFaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  visible: boolean;
}

export interface LandingSectionConfig {
  id: string;
  key:
    | 'hero'
    | 'servicios_empresariales'
    | 'como_trabajamos'
    | 'soluciones_especializadas'
    | 'quienes_somos'
    | 'beneficios'
    | 'promociones_destacadas'
    | 'garantias_envios'
    | 'testimonios'
    | 'soporte_remoto'
    | 'faq'
    | 'contacto';
  title: string;
  subtitle: string;
  visible: boolean;
  order: number;
}

export interface LandingPageCmsConfig {
  version: number;
  publishedAt: string;
  updatedAt: string;
  updatedBy: string;
  hero: {
    badgeText: string;
    title: string;
    highlightedTitle: string;
    subtitle: string;
    primaryCtaText: string;
    secondaryCtaText: string;
    supportCtaText: string;
    heroImageUrl: string;
    stats: Array<{ label: string; value: string }>;
  };
  about: {
    badgeText: string;
    title: string;
    description: string;
    mission: string;
    vision: string;
    yearsExperience: number;
    HighlightPoints: string[];
    imageUrl?: string;
  };
  howWeWork: Array<{
    step: number;
    title: string;
    description: string;
  }>;
  benefits: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  services: LandingServiceItem[];
  testimonials: LandingTestimonialItem[];
  faqs: LandingFaqItem[];
  sections: LandingSectionConfig[];
  contactSection: {
    title: string;
    subtitle: string;
    scheduleText: string;
    addressText: string;
    phoneText: string;
    emailText: string;
    mapEmbedUrl?: string;
  };
  previousVersions?: Array<{
    version: number;
    savedAt: string;
    savedBy: string;
    snapshot: Omit<LandingPageCmsConfig, 'previousVersions'>;
  }>;
}

export interface DatabaseSchema {
  products: Product[];
  promotions: Promotion[];
  company: CompanyProfile;
  users: any[];
  orders: Order[];
  catalogs: any[];
  auditLogs: AuditLogEntry[];
  appConfig?: AppReleaseConfig;
  technicalServices?: TechnicalServiceRequest[];
  appointments?: TechnicalAppointment[];
  warranties?: WarrantyRecord[];
  inventoryMovements?: InventoryMovement[];
  whatsappConversations?: WhatsAppConversation[];
  whatsappConfig?: WhatsAppConfig;
  backups?: BackupRecordMeta[];
  trash?: TrashItem[];
  syncQueue?: SyncOperationRecord[];
  connectionLogs?: ConnectionErrorLog[];
  seasonalTemplates?: SeasonalTemplate[];
  promoBanners?: PromoBannerItem[];
  discountCodes?: DiscountCode[];
  policies?: PolicyDocument[];
  shipments?: ShipmentRecord[];
  orderAuthorizations?: OrderAuthorizationRequest[];
  adminNotifications?: AdminNotification[];
  cashMovements?: CashMovement[];
  crmCustomers?: CrmCustomerRecord[];
  crmOpportunities?: CrmOpportunity[];
  marketingCampaigns?: MarketingCampaign[];
  paymentMethods?: PaymentMethodItem[];
  remoteSupportTools?: RemoteSupportToolItem[];
  whatsappQrConfig?: WhatsAppQrConfig;
  landingPageCms?: LandingPageCmsConfig;
  customerPushEvents?: CustomerPushEvent[];
  customerPushSubscriptions?: CustomerPushSubscription[];
  driveMediaAssets?: DriveMediaAsset[];
  sessions?: any[];
  resetTokens?: any[];
}





