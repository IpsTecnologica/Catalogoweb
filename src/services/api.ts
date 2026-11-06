import {
  Product,
  CompanyProfile,
  User,
  Order,
  OrderItem,
  Promotion,
  PromotionComputedStatus,
  PromotionManualStatus,
  AppReleaseConfig,
  TechnicalServiceRequest,
  TechnicalAppointment,
  WarrantyRecord,
  WarrantyCategoryType,
  InventoryMovement,
  BackupRecordMeta,
  BackupType,
  BackupModuleScope,
  TrashItem,
  ConnectionsOverview,
  WhatsAppConversation,
  WhatsAppConfig,
  WhatsAppBusinessIntegrationView,
  SeasonalTemplate,
  PromoBannerItem,
  DiscountCode,
  PolicyDocument,
  ShipmentRecord,
  OrderAuthorizationRequest,
  AdminNotification,
  CashMovement,
  PublicTechnicianInfo
} from '../types';
import { getCachedAccessToken } from './googleAuth';

const LEGACY_TOKEN_KEY = 'ips_catalog_auth_token';

export function getStoredToken(): string | null {
  try {
    const localSession = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (localSession) return localSession;
  } catch {
    // ignore
  }
  const googleToken = getCachedAccessToken();
  if (googleToken) return googleToken;
  return null;
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(LEGACY_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
  } catch (err) {
    console.error('Storage error', err);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const googleToken = getCachedAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (googleToken) {
    headers['X-Google-Access-Token'] = googleToken;
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Error ${res.status}: ${res.statusText}` }));
      throw new Error(errorData.error || `Error en la solicitud (${res.status})`);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  async getSystemConfig(): Promise<{
    publicAppUrl: string;
    timezone: string;
    serverTimeISO: string;
    bogotaFormatted: string;
    authorizedAdmins: string[];
  }> {
    return await request('/api/config');
  },

  // Google Workspace (12 Sheets & 9 Drive Folders)
  async getWorkspaceStatus(): Promise<{
    spreadsheetId: string | null;
    spreadsheetUrl: string | null;
    rootFolderUrl: string | null;
    folders?: {
      sheetsDataId?: string | null;
      photosId?: string | null;
      pdfsId?: string | null;
      logosId?: string | null;
      clientDocsId?: string | null;
      serviceOrdersId?: string | null;
      backupsId?: string | null;
      adminReportsId?: string | null;
      warrantiesId?: string | null;
    };
    lastSyncedAt: string | null;
    lastBackupAt?: string | null;
    isConfigured: boolean;
  }> {
    return await request('/api/workspace/status');
  },

  async initWorkspace(): Promise<{
    success: boolean;
    spreadsheetId: string;
    spreadsheetUrl: string;
    folderUrl: string;
    message: string;
  }> {
    return await request('/api/workspace/init', { method: 'POST' });
  },

  async syncWorkspace(): Promise<{
    success: boolean;
    productsCount: number;
    usersCount: number;
    message: string;
  }> {
    return await request('/api/workspace/sync', { method: 'POST' });
  },

  // Products
  async getProducts(params?: { search?: string; category?: string; status?: string }): Promise<Product[]> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.category) q.set('category', params.category);
    if (params?.status) q.set('status', params.status);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    return await request<Product[]>(`/api/products${queryString}`);
  },

  async getProduct(id: string): Promise<Product> {
    return await request<Product>(`/api/products/${encodeURIComponent(id)}`);
  },

  async createProduct(productData: Partial<Product>): Promise<Product> {
    return await request<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    return await request<Product>(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message?: string }> {
    return await request<{ success: boolean; message?: string }>(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  async bulkImport(items: any[]): Promise<{ count: number; message: string }> {
    return await request<{ count: number; message: string }>('/api/products/bulk', {
      method: 'POST',
      body: JSON.stringify({ items })
    });
  },

  async generateTestBatch(count: number): Promise<{ count: number; products: Product[]; message: string }> {
    return await request<{ count: number; products: Product[]; message: string }>('/api/products/test-seed', {
      method: 'POST',
      body: JSON.stringify({ count })
    });
  },

  // Promotions (Scheduled & Real-time evaluated in America/Bogota)
  async getPromotions(): Promise<Array<Promotion & { computedStatus: PromotionComputedStatus; targetLabel: string }>> {
    return await request('/api/promotions');
  },

  async createPromotion(data: Partial<Promotion>): Promise<Promotion & { computedStatus: PromotionComputedStatus }> {
    return await request('/api/promotions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updatePromotion(id: string, data: Partial<Promotion>): Promise<Promotion & { computedStatus: PromotionComputedStatus }> {
    return await request(`/api/promotions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async updatePromotionStatus(
    id: string,
    manualStatus: PromotionManualStatus
  ): Promise<Promotion & { computedStatus: PromotionComputedStatus }> {
    return await request(`/api/promotions/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ manualStatus })
    });
  },

  async deletePromotion(id: string): Promise<{ success: boolean; message: string }> {
    return await request(`/api/promotions/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  // Image Upload & Server-Side Base64 Resolver for PDF
  async uploadImage(
    filename: string,
    dataBase64: string,
    isLogo = false,
    productRef?: string,
    category?: string,
    folderCategory?: 'service_order' | 'client_doc' | 'warranty' | 'banner' | 'template' | 'pdf_catalog' | 'document' | 'product_additional',
    isAdditionalPhoto = false
  ): Promise<{
    url: string;
    driveFileId?: string;
    driveLink?: string;
    directUrl?: string;
    filename: string;
    sha256?: string;
    folderPath?: string;
    reusedExisting?: boolean;
    verifiedInVault?: boolean;
  }> {
    return await request('/api/upload', {
      method: 'POST',
      body: JSON.stringify({
        filename,
        dataBase64,
        isLogo,
        isAdditionalPhoto,
        productRef,
        category,
        folderCategory
      })
    });
  },

  async getImageDataUrl(url: string): Promise<{ dataUrl: string; mime?: string }> {
    return await request(`/api/image-data?url=${encodeURIComponent(url)}`);
  },

  // Catalogs & Drive
  async saveCatalogToDrive(
    name: string,
    productCount: number,
    pdfBase64: string
  ): Promise<{ success: boolean; catalog: any; message: string }> {
    return await request('/api/catalogs/save-pdf', {
      method: 'POST',
      body: JSON.stringify({ name, productCount, pdfBase64 })
    });
  },

  async getCatalogs(): Promise<any[]> {
    return await request('/api/catalogs');
  },

  // Company Profile
  async getCompany(): Promise<CompanyProfile> {
    return await request<CompanyProfile>('/api/company');
  },

  async updateCompany(data: Partial<CompanyProfile>): Promise<CompanyProfile> {
    return await request<CompanyProfile>('/api/company', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Users Management (Admin RBAC)
  async getUsers(): Promise<User[]> {
    return await request<User[]>('/api/users');
  },

  async createUser(userData: {
    name: string;
    email: string;
    role: string;
    phone?: string;
    password?: string;
    status?: string;
    isActive?: boolean;
  }): Promise<User> {
    return await request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async updateUser(
    id: string,
    updates: {
      name?: string;
      email?: string;
      role?: string;
      phone?: string;
      status?: string;
      isActive?: boolean;
      password?: string;
    }
  ): Promise<User> {
    return await request<User>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteUser(idOrEmail: string): Promise<{ success: boolean; message?: string }> {
    return await request<{ success: boolean; message?: string }>(`/api/users/${encodeURIComponent(idOrEmail)}`, {
      method: 'DELETE'
    });
  },

  // Audit Logs
  async getAuditLogs(): Promise<Array<{ date: string; user: string; action: string; detail: string; result: string }>> {
    return await request('/api/audit');
  },

  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setStoredToken(data.token);
    return data;
  },

  async loginWithGoogleToken(googleAccessToken: string): Promise<{ user: User; token: string; message: string }> {
    const data = await request<{ user: User; token: string; message: string }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ googleAccessToken })
    });
    setStoredToken(data.token);
    return data;
  },

  async register(userData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    acceptTerms: boolean;
    allowMarketing?: boolean;
  }): Promise<{ user: User; token: string; message: string }> {
    const data = await request<{ user: User; token: string; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    setStoredToken(data.token);
    return data;
  },

  async updateProfile(profileData: { name?: string; phone?: string }): Promise<{ user: User }> {
    return await request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async getMe(): Promise<{ user: User | null }> {
    try {
      return await request<{ user: User | null }>('/api/auth/me');
    } catch {
      return { user: null };
    }
  },

  async recoverPassword(email: string): Promise<{ message: string; code: string }> {
    return await request('/api/auth/recover', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    return await request('/api/auth/reset', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword })
    });
  },

  // Orders & Customer Portal
  async getMyOrders(): Promise<Order[]> {
    return await request<Order[]>('/api/orders/my-orders');
  },

  async createOrder(orderData: {
    items: OrderItem[];
    shippingAddress?: string;
    shippingCity?: string;
    shippingDepartment?: string;
    discountCode?: string;
    shippingCostCOP?: number;
    acceptedPolicyVersion?: string;
    acceptedPolicyAt?: string;
    notes?: string;
  }): Promise<{ order: Order; message: string }> {
    return await request<{ order: Order; message: string }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  async getAdminOrders(): Promise<Order[]> {
    return await request<Order[]>('/api/admin/orders');
  },

  async updateOrderStatus(
    id: string,
    status: string,
    extra?: { reason?: string; shippingAddress?: string; notes?: string }
  ): Promise<any> {
    return await request<any>(`/api/admin/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...(extra || {}) })
    });
  },

  async deleteAdminOrder(id: string, reason?: string): Promise<any> {
    return await request<any>(`/api/admin/orders/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    });
  },

  async getOrderAuthorizations(): Promise<OrderAuthorizationRequest[]> {
    return await request<OrderAuthorizationRequest[]>('/api/admin/order-authorizations');
  },

  async requestOrderAuthorization(payload: {
    orderId: string;
    actionType: 'Modificar' | 'Cancelar' | 'Eliminar lógicamente';
    reason: string;
    proposedChanges: {
      status?: string;
      notes?: string;
      shippingAddress?: string;
      isLogicallyDeleted?: boolean;
    };
  }): Promise<{ authorizationRequest: OrderAuthorizationRequest; message: string }> {
    return await request('/api/admin/order-authorizations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async reviewOrderAuthorization(
    id: string,
    decision: 'Aprobada' | 'Rechazada',
    reviewNotes?: string
  ): Promise<{ request: OrderAuthorizationRequest; order?: Order; message: string }> {
    return await request(`/api/admin/order-authorizations/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, reviewNotes })
    });
  },

  async getAdminCustomers(): Promise<any[]> {
    return await request<any[]>('/api/admin/customers');
  },

  async updateSocialLinks(social: Partial<import('../types').SocialLinks>): Promise<import('../types').SocialLinks> {
    return await request<import('../types').SocialLinks>('/api/company/social', {
      method: 'PUT',
      body: JSON.stringify(social)
    });
  },

  // Connections Status & Sync Queue
  async getConnectionsStatus(): Promise<ConnectionsOverview & { simulatedOffline?: boolean }> {
    return await request('/api/connections/status');
  },

  async retrySyncQueue(): Promise<{
    success: boolean;
    processedCount: number;
    pendingSyncCount: number;
    message: string;
  }> {
    return await request('/api/connections/retry-sync', { method: 'POST' });
  },

  async setSimulatedOffline(offline: boolean): Promise<{ simulatedOffline: boolean; message: string }> {
    return await request('/api/connections/simulate-offline', {
      method: 'POST',
      body: JSON.stringify({ offline })
    });
  },

  // Integral Backups & Trash Recovery
  async getBackups(): Promise<BackupRecordMeta[]> {
    return await request<BackupRecordMeta[]>('/api/backups');
  },

  async createSystemBackup(params: {
    type?: BackupType;
    moduleScope?: BackupModuleScope;
    notes?: string;
  }): Promise<{ backup: BackupRecordMeta; message: string }> {
    return await request('/api/backups', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async restoreSystemBackup(
    id: string,
    confirmRestore = true,
    moduleScope?: BackupModuleScope
  ): Promise<{
    success: boolean;
    message: string;
    preBackup?: BackupRecordMeta;
    restoredFilesCount?: number;
  }> {
    return await request(`/api/backups/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
      body: JSON.stringify({ confirmRestore, moduleScope })
    });
  },

  async getTrashItems(): Promise<TrashItem[]> {
    return await request<TrashItem[]>('/api/trash');
  },

  async restoreTrashItem(id: string): Promise<{ success: boolean; message: string }> {
    return await request(`/api/trash/${encodeURIComponent(id)}/restore`, {
      method: 'POST'
    });
  },

  // Legacy Backup & Restore
  async getBackupData(): Promise<any> {
    return await request<any>('/api/backup');
  },

  async restoreBackup(backupData: any): Promise<{ success: boolean; message: string }> {
    return await request<{ success: boolean; message: string }>('/api/restore', {
      method: 'POST',
      body: JSON.stringify(backupData)
    });
  },

  async resetDefaults(): Promise<{ success: boolean; message: string }> {
    return await request<{ success: boolean; message: string }>('/api/reset-defaults', {
      method: 'POST'
    });
  },

  // Technical Support & Scheduling
  async getSupportCatalog(): Promise<{
    serviceTypes: string[];
    technicians: Array<{ id: string; name: string; email: string; role: string }>;
    publicTechnicians?: PublicTechnicianInfo[];
    businessHours: { weekdays: string; saturday: string; slots: string[] };
  }> {
    return await request('/api/support/catalog');
  },

  async getPublicTechnicians(): Promise<PublicTechnicianInfo[]> {
    return await request<PublicTechnicianInfo[]>('/api/support/public-technicians');
  },

  async getSupportAvailability(
    date: string,
    technicianId?: string
  ): Promise<{ date: string; slots: Array<{ time: string; available: boolean }> }> {
    const q = new URLSearchParams({ date });
    if (technicianId) q.set('technicianId', technicianId);
    return await request(`/api/support/availability?${q.toString()}`);
  },

  async createSupportTicket(
    data: Partial<TechnicalServiceRequest>
  ): Promise<{ ticket: TechnicalServiceRequest; message: string }> {
    return await request('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getMySupportTickets(): Promise<{
    tickets: TechnicalServiceRequest[];
    appointments: TechnicalAppointment[];
  }> {
    return await request('/api/support/my-tickets');
  },

  async lookupSupportTicket(ticketNumber: string): Promise<TechnicalServiceRequest> {
    return await request(`/api/support/lookup/${encodeURIComponent(ticketNumber)}`);
  },

  async getSupportTickets(onlyMine = false): Promise<TechnicalServiceRequest[]> {
    return await request(`/api/support/tickets${onlyMine ? '?onlyMine=true' : ''}`);
  },

  async updateSupportTicket(
    id: string,
    updates: Partial<TechnicalServiceRequest>
  ): Promise<{ ticket: TechnicalServiceRequest; message: string }> {
    return await request(`/api/support/tickets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteSupportTicket(id: string): Promise<{ success: boolean; message: string }> {
    return await request(`/api/support/tickets/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  async getSupportAppointments(): Promise<TechnicalAppointment[]> {
    return await request('/api/support/appointments');
  },

  // Warranties & Inventory Movements
  async getMyWarranties(): Promise<WarrantyRecord[]> {
    return await request('/api/warranties/my-warranties');
  },

  async getWarranties(): Promise<WarrantyRecord[]> {
    return await request('/api/warranties');
  },

  async createWarranty(data: Partial<WarrantyRecord>): Promise<WarrantyRecord> {
    return await request('/api/warranties', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateWarranty(
    id: string,
    updates: Partial<WarrantyRecord> & { statusNote?: string }
  ): Promise<{ warranty: WarrantyRecord; message: string }> {
    return await request(`/api/warranties/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async submitWarrantyClaim(payload: {
    warrantyId?: string;
    reportedFailure?: string;
    claimReason?: string;
    productOrServiceName?: string;
    warrantyCategory?: WarrantyCategoryType;
    componentSubCategory?: string;
    orderId?: string;
    serialNumber?: string;
    evidencePhotos?: string[];
  }): Promise<{ warranty: WarrantyRecord; message: string }> {
    return await request('/api/warranties/claim', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        reportedFailure: payload.reportedFailure || payload.claimReason || 'Solicitud de garantía'
      })
    });
  },

  async getInventoryMovements(): Promise<InventoryMovement[]> {
    return await request('/api/inventory/movements');
  },

  // Seasonal Templates & 3-Slot Promo Banners (Sections 3 & 13)
  async getTemplates(): Promise<{
    templates: SeasonalTemplate[];
    activeWebTemplate: SeasonalTemplate;
    activePdfTemplate: SeasonalTemplate;
  }> {
    return await request('/api/templates');
  },

  async createTemplate(data: Partial<SeasonalTemplate>): Promise<{ template: SeasonalTemplate; message: string }> {
    return await request('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateTemplate(
    id: string,
    updates: Partial<SeasonalTemplate>
  ): Promise<{ template: SeasonalTemplate; message: string }> {
    return await request(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async duplicateTemplate(id: string): Promise<{ template: SeasonalTemplate; message: string }> {
    return await request(`/api/templates/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST'
    });
  },

  async activateTemplate(
    id: string,
    target: 'web' | 'pdf' | 'both' = 'both'
  ): Promise<{
    template: SeasonalTemplate;
    activeWebTemplate: SeasonalTemplate;
    activePdfTemplate: SeasonalTemplate;
    message: string;
  }> {
    return await request(`/api/templates/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
      body: JSON.stringify({ target })
    });
  },

  async restoreDefaultTemplate(): Promise<{
    template: SeasonalTemplate;
    activeWebTemplate: SeasonalTemplate;
    activePdfTemplate: SeasonalTemplate;
    message: string;
  }> {
    return await request('/api/templates/restore-default', {
      method: 'POST'
    });
  },

  async deleteTemplate(id: string): Promise<{ success: boolean; message: string }> {
    return await request(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  async getPromoBanners(): Promise<PromoBannerItem[]> {
    return await request<PromoBannerItem[]>('/api/promo-banners');
  },

  async getPromotionalPosters(): Promise<PromoBannerItem[]> {
    return await request<PromoBannerItem[]>('/api/promo-banners');
  },

  async updatePromoBanner(
    slotOrId: number | string,
    updates: Partial<PromoBannerItem>
  ): Promise<{ banner: PromoBannerItem; banners: PromoBannerItem[]; message: string }> {
    return await request(`/api/promo-banners/${encodeURIComponent(String(slotOrId))}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // Discount Code Generator (Section 12)
  async getDiscountCodes(): Promise<DiscountCode[]> {
    return await request<DiscountCode[]>('/api/discount-codes');
  },

  async createDiscountCode(
    data: Partial<DiscountCode>
  ): Promise<{ discountCode: DiscountCode; message: string }> {
    return await request('/api/discount-codes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateDiscountCode(
    id: string,
    updates: Partial<DiscountCode>
  ): Promise<{ discountCode: DiscountCode; message: string }> {
    return await request(`/api/discount-codes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteDiscountCode(id: string): Promise<{ success: boolean; message: string }> {
    return await request(`/api/discount-codes/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  async validateDiscountCode(
    code: string,
    subtotalCOP: number,
    items?: OrderItem[]
  ): Promise<{
    valid: boolean;
    discountCode?: DiscountCode;
    discountAmountCOP: number;
    finalSubtotalCOP: number;
    message: string;
  }> {
    return await request('/api/discount-codes/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotalCOP, items })
    });
  },

  // Ley 1480 de 2011 Policies & Shipments (Section 15)
  async getPolicies(): Promise<PolicyDocument[]> {
    return await request<PolicyDocument[]>('/api/policies');
  },

  async getPolicy(idOrCategory: string): Promise<PolicyDocument> {
    return await request<PolicyDocument>(`/api/policies/${encodeURIComponent(idOrCategory)}`);
  },

  async updatePolicy(
    idOrCategory: string,
    updates: Partial<PolicyDocument>
  ): Promise<{ policy: PolicyDocument; message: string }> {
    return await request(`/api/policies/${encodeURIComponent(idOrCategory)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async getShipments(): Promise<ShipmentRecord[]> {
    return await request<ShipmentRecord[]>('/api/shipments');
  },

  async getMyShipments(): Promise<ShipmentRecord[]> {
    return await request<ShipmentRecord[]>('/api/shipments/my-shipments');
  },

  async createShipment(
    payload: Partial<ShipmentRecord> & { statusNote?: string }
  ): Promise<{ shipment: ShipmentRecord; message: string }> {
    return await request('/api/shipments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateShipment(
    orderIdOrShipmentId: string,
    updates: Partial<ShipmentRecord> & { statusNote?: string }
  ): Promise<{ shipment: ShipmentRecord; message: string }> {
    return await request(`/api/shipments/${encodeURIComponent(orderIdOrShipmentId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // Primary Admin Notifications & Cash Movements (Sections 6 & 16)
  async getAdminNotifications(): Promise<{
    notifications: AdminNotification[];
    unreadCount: number;
  }> {
    return await request('/api/admin/notifications');
  },

  async markNotificationRead(id: string): Promise<{
    notifications: AdminNotification[];
    unreadCount: number;
  }> {
    return await request(`/api/admin/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH'
    });
  },

  async markAllNotificationsRead(): Promise<{
    notifications: AdminNotification[];
    unreadCount: number;
    message: string;
  }> {
    return await request('/api/admin/notifications/read-all', {
      method: 'POST'
    });
  },

  async getCashMovements(): Promise<CashMovement[]> {
    return await request<CashMovement[]>('/api/cash-movements');
  },

  async recordCashMovement(
    data: Partial<CashMovement>
  ): Promise<{ movement: CashMovement; message: string }> {
    return await request('/api/cash-movements', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Free Google Apps Script Bridge
  async getAppsScriptConfig(): Promise<{
    appsScriptWebAppUrl: string;
    scriptCode: string;
    driveFolders: string[];
  }> {
    return await request('/api/workspace/apps-script');
  },

  async getAppsScriptInfo(): Promise<{
    webAppUrl: string;
    enabled: boolean;
    lastSyncedAt: string | null;
    scriptCode: string;
    folders: string[];
  }> {
    const res = await request<any>('/api/workspace/apps-script');
    return {
      webAppUrl: res.appsScriptWebAppUrl || res.webAppUrl || '',
      enabled: Boolean(res.appsScriptWebAppUrl || res.enabled),
      lastSyncedAt: res.lastSyncedAt || null,
      scriptCode: res.scriptCode || '',
      folders: res.driveFolders || res.folders || []
    };
  },

  async updateAppsScriptUrl(
    appsScriptWebAppUrl: string
  ): Promise<{ appsScriptWebAppUrl: string; message: string }> {
    return await request('/api/workspace/apps-script', {
      method: 'PUT',
      body: JSON.stringify({ appsScriptWebAppUrl })
    });
  },

  async saveAppsScriptConfig(payload: {
    webAppUrl: string;
    enabled: boolean;
  }): Promise<{ appsScriptWebAppUrl: string; message: string }> {
    return await request('/api/workspace/apps-script', {
      method: 'PUT',
      body: JSON.stringify({ appsScriptWebAppUrl: payload.webAppUrl, enabled: payload.enabled })
    });
  },

  async testAppsScriptBridge(): Promise<{ message: string }> {
    return await request('/api/workspace/sync', {
      method: 'POST'
    });
  },

  // WhatsApp Inteligente & Gemini
  async getWhatsAppConfig(): Promise<WhatsAppConfig & { geminiApiReady: boolean }> {
    return await request('/api/whatsapp/config');
  },

  async updateWhatsAppConfig(
    updates: Partial<WhatsAppConfig>
  ): Promise<{ config: WhatsAppConfig; message: string }> {
    return await request('/api/whatsapp/config', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async getWhatsAppConversations(): Promise<WhatsAppConversation[]> {
    return await request('/api/whatsapp/conversations');
  },

  async sendWhatsAppMessage(params: {
    phone: string;
    clientName?: string;
    clientEmail?: string;
    text: string;
  }): Promise<{
    conversation: WhatsAppConversation;
    autoReplied: boolean;
    replyText?: string;
    intent?: string;
    usedGemini?: boolean;
  }> {
    return await request('/api/whatsapp/message', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async sendWhatsAppAdvisorReply(params: {
    conversationId?: string;
    phone?: string;
    text?: string;
    status?: WhatsAppConversation['status'];
    assignedAdvisor?: string;
  }): Promise<{ conversations: WhatsAppConversation[]; message: string }> {
    return await request('/api/whatsapp/advisor-reply', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  // App Release & APK Management (PWA + Android)
  async getAppConfig(): Promise<AppReleaseConfig> {
    return await request<AppReleaseConfig>('/api/app-config');
  },

  async updateAppConfig(updates: Partial<AppReleaseConfig>): Promise<{ appConfig: AppReleaseConfig; message: string }> {
    return await request<{ appConfig: AppReleaseConfig; message: string }>('/api/app-config', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async uploadApk(
    filename: string,
    dataBase64: string,
    versionName?: string,
    versionCode?: number,
    releaseNotes?: string
  ): Promise<{ appConfig: AppReleaseConfig; message: string }> {
    return await request<{ appConfig: AppReleaseConfig; message: string }>('/api/app-config/upload-apk', {
      method: 'POST',
      body: JSON.stringify({ filename, dataBase64, versionName, versionCode, releaseNotes })
    });
  },

  async removeApk(): Promise<{ appConfig: AppReleaseConfig; message: string }> {
    return await request<{ appConfig: AppReleaseConfig; message: string }>('/api/app-config/apk', {
      method: 'DELETE'
    });
  },

  // Configuración → Integraciones → WhatsApp Business (Bóveda Cifrada del Servidor)
  async getWhatsAppBusinessIntegration(): Promise<WhatsAppBusinessIntegrationView> {
    return await request<WhatsAppBusinessIntegrationView>('/api/admin/integrations/whatsapp');
  },

  async updateWhatsAppBusinessIntegration(payload: {
    publicAppUrl?: string;
    vitePublicAppUrl?: string;
    integrationEnabled?: boolean;
    whatsappAccessToken?: string;
    whatsappPhoneNumberId?: string;
    whatsappVerifyToken?: string;
    whatsappAppSecret?: string;
  }): Promise<{ integration: WhatsAppBusinessIntegrationView; message: string }> {
    return await request<{ integration: WhatsAppBusinessIntegrationView; message: string }>(
      '/api/admin/integrations/whatsapp',
      {
        method: 'PUT',
        body: JSON.stringify(payload)
      }
    );
  },

  async toggleWhatsAppBusinessIntegration(enabled?: boolean): Promise<{
    integration: WhatsAppBusinessIntegrationView;
    message: string;
  }> {
    return await request<{ integration: WhatsAppBusinessIntegrationView; message: string }>(
      '/api/admin/integrations/whatsapp/toggle',
      {
        method: 'POST',
        body: JSON.stringify({ enabled })
      }
    );
  },

  async testWhatsAppBusinessConnection(): Promise<{
    connected: boolean;
    status: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
    message: string;
    verifiedPhoneName?: string | null;
    verifiedDisplayNumber?: string | null;
    httpStatus?: number;
    view: WhatsAppBusinessIntegrationView;
  }> {
    return await request('/api/admin/integrations/whatsapp/test-connection', {
      method: 'POST'
    });
  },

  async testWhatsAppBusinessSend(params: {
    recipientPhone: string;
    messageText?: string;
    includeGeminiPreview?: boolean;
  }): Promise<{
    sent: boolean;
    messageId?: string;
    httpStatus?: number;
    error?: string;
    dispatchedText: string;
    geminiReplyPreview?: string | null;
    integration: WhatsAppBusinessIntegrationView;
    message: string;
  }> {
    return await request('/api/admin/integrations/whatsapp/test-send', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async clearWhatsAppBusinessErrors(): Promise<{
    integration: WhatsAppBusinessIntegrationView;
    message: string;
  }> {
    return await request('/api/admin/integrations/whatsapp/errors', {
      method: 'DELETE'
    });
  },

  async getWhatsAppCommunicationLogs(params?: {
    page?: number;
    pageSize?: number;
    filter?: 'all' | 'sent' | 'received' | 'error';
  }): Promise<import('../types').WhatsAppCommunicationLogsResponse> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    if (params?.filter) q.set('filter', params.filter);
    const qs = q.toString();
    return await request(`/api/admin/integrations/whatsapp/logs${qs ? `?${qs}` : ''}`);
  },

  // Gemini AI Integration (Encrypted Server Vault)
  async getGeminiIntegration(): Promise<import('../types').GeminiIntegrationView> {
    return await request('/api/admin/integrations/gemini');
  },

  async updateGeminiIntegration(payload: {
    geminiApiKey?: string;
    enabled?: boolean;
    model?: string;
    systemInstructions?: string;
  }): Promise<{ gemini: import('../types').GeminiIntegrationView; message: string }> {
    return await request('/api/admin/integrations/gemini', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async testGeminiIntegration(): Promise<{
    connected: boolean;
    status: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
    message: string;
    sampleReply?: string;
    view: import('../types').GeminiIntegrationView;
  }> {
    return await request('/api/admin/integrations/gemini/test', {
      method: 'POST'
    });
  },

  // Unified 12-Service System Configuration Hub
  async getSystemConfigurationHub(): Promise<any> {
    return await request('/api/admin/system-configuration');
  },

  async updateSystemConfigurationModule(
    moduleKey: string,
    payload: { enabled?: boolean; settings?: Record<string, string> }
  ): Promise<{ moduleState: any; message: string }> {
    return await request(`/api/admin/system-configuration/${encodeURIComponent(moduleKey)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async testSystemConfigurationModule(moduleKey: string): Promise<{
    connected: boolean;
    status: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
    message: string;
    record?: import('../types').SystemIntegrationTestRecord;
  }> {
    return await request(`/api/admin/system-configuration/${encodeURIComponent(moduleKey)}/test`, {
      method: 'POST'
    });
  },

  // Service Worker Push Notifications for Customers (Offers & Order Status)
  async getCustomerPushEvents(params?: {
    since?: string;
    email?: string;
    orderIds?: string[];
    includeOffers?: boolean;
    includeOrders?: boolean;
  }): Promise<{
    catalogPublished: boolean;
    activeProductsCount: number;
    activePromotionsCount: number;
    events: import('../types').CustomerPushEvent[];
  }> {
    const q = new URLSearchParams();
    if (params?.since) q.set('since', params.since);
    if (params?.email) q.set('email', params.email);
    if (params?.orderIds && params.orderIds.length > 0) {
      q.set('orderIds', params.orderIds.join(','));
    }
    if (params?.includeOffers !== undefined) {
      q.set('includeOffers', String(params.includeOffers));
    }
    if (params?.includeOrders !== undefined) {
      q.set('includeOrders', String(params.includeOrders));
    }
    const qs = q.toString();
    return await request(`/api/push/events${qs ? `?${qs}` : ''}`);
  },

  async saveCustomerPushSubscription(payload: {
    deviceId: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    subscribedToOffers?: boolean;
    subscribedToOrders?: boolean;
    trackedOrderIds?: string[];
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    active?: boolean;
  }): Promise<{
    subscription: import('../types').CustomerPushSubscription;
    catalogPublished: boolean;
    message: string;
  }> {
    return await request('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getAdminPushSubscriptions(): Promise<{
    catalogPublished: boolean;
    totalSubscriptions: number;
    activeSubscriptions: number;
    offersSubscribers: number;
    ordersSubscribers: number;
    subscriptions: import('../types').CustomerPushSubscription[];
  }> {
    return await request('/api/push/subscriptions');
  },

  async sendCustomerPushNotification(payload: {
    type?: import('../types').CustomerPushEventType;
    title: string;
    body: string;
    tag?: string;
    url?: string;
    promotionId?: string;
    targetAudience?: 'all_customers' | 'specific_customer';
    targetCustomerEmail?: string;
    targetCustomerPhone?: string;
    targetOrderId?: string;
    productId?: string;
    relatedProductId?: string;
    relatedProductRef?: string;
    relatedCategory?: string;
    discountBadge?: string;
    orderStatus?: import('../types').OrderStatus;
    trackingNumber?: string;
    carrier?: string;
  }): Promise<{
    event: import('../types').CustomerPushEvent;
    message: string;
  }> {
    return await request('/api/push/notify', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Permanent Image Storage in Google Drive & 15-Step Persistence Test (Section 1)
  async getDriveAssets(): Promise<{
    totalAssets: number;
    activeAssets: number;
    archivedAssets: number;
    officialFolders: string[];
    assets: import('../types').DriveMediaAsset[];
  }> {
    return await request('/api/drive/assets');
  },

  async verifyDriveProductImages(): Promise<{
    totalProducts: number;
    totalImagesChecked: number;
    healthyImages: number;
    rehydratedCount: number;
    missingOrBrokenCount: number;
    message?: string;
    details: Array<{
      productId: string;
      reference: string;
      productName?: string;
      name?: string;
      imageUrl: string;
      driveFileId?: string;
      status: 'OK' | 'REHYDRATED' | 'MISSING' | 'ok' | 'rehydrated_from_vault' | 'missing';
      message?: string;
    }>;
  }> {
    return await request('/api/drive/verify-images');
  },

  async relinkDriveProductImages(productId?: string, newImageUrl?: string): Promise<{
    totalProducts: number;
    totalImagesChecked: number;
    healthyImages: number;
    rehydratedCount: number;
    missingOrBrokenCount: number;
    details?: any[];
    message: string;
  }> {
    return await request('/api/drive/relink-image', {
      method: 'POST',
      body: JSON.stringify({ productId, newImageUrl })
    });
  },

  async runDrivePersistenceTest(): Promise<{
    passed: boolean;
    executedAt: string;
    passedCount?: number;
    pending24hCount?: number;
    failedCount?: number;
    summary?: string;
    steps: import('../types').DrivePersistenceTestStep[];
  }> {
    return await request('/api/drive/persistence-test', {
      method: 'POST'
    });
  },

  // Admin-Only Technician Workload & Schedule Assignment (Section 7)
  async getTechniciansWorkload(date?: string): Promise<{
    date: string;
    technicians: Array<{
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
    }>;
  }> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return await request(`/api/support/technicians-workload${qs}`);
  },

  async assignTechnicianToTicket(
    ticketId: string,
    payload: {
      assignedTechnicianId?: string;
      appointmentDate?: string;
      appointmentTime?: string;
      appointmentEndTime?: string;
      durationMinutes?: number;
      status?: import('../types').TechnicalServiceStatus;
      scheduleNote?: string;
    }
  ): Promise<{ ticket: import('../types').TechnicalServiceRequest; message: string }> {
    return await request(`/api/support/tickets/${encodeURIComponent(ticketId)}/assign-technician`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // CRM & Digital Marketing (Section 8)
  async getCrmOverview(): Promise<{
    customers: import('../types').CrmCustomerRecord[];
    campaigns: import('../types').MarketingCampaign[];
    opportunities: import('../types').CrmOpportunity[];
    topSellingProducts: Array<{
      productId: string;
      reference: string;
      name: string;
      quantitySold: number;
      unitsSold: number;
      revenueCOP: number;
    }>;
    metrics?: {
      topSellingProducts: Array<{
        productId: string;
        reference: string;
        name: string;
        quantitySold: number;
        unitsSold: number;
        revenueCOP: number;
      }>;
    };
    isDemoMode?: boolean;
  }> {
    return await request('/api/crm/customers');
  },

  async upsertCrmCustomer(
    data: Partial<import('../types').CrmCustomerRecord>
  ): Promise<{ customer: import('../types').CrmCustomerRecord; message: string }> {
    if (data.id) {
      return await request(`/api/crm/customers/${encodeURIComponent(data.id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    }
    return await request('/api/crm/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async addCrmFollowUp(
    customerId: string,
    entry: {
      type?: string;
      channel?: string;
      note?: string;
      notes?: string;
      nextActionDate?: string;
      nextFollowUpDate?: string;
      completed?: boolean;
    }
  ): Promise<{ customer: import('../types').CrmCustomerRecord; message: string }> {
    return await request(`/api/crm/customers/${encodeURIComponent(customerId)}/followup`, {
      method: 'POST',
      body: JSON.stringify(entry)
    });
  },

  async getCrmOpportunities(): Promise<import('../types').CrmOpportunity[]> {
    return await request('/api/crm/opportunities');
  },

  async upsertCrmOpportunity(
    data: Partial<import('../types').CrmOpportunity>
  ): Promise<{ opportunity: import('../types').CrmOpportunity; message: string }> {
    if (data.id) {
      return await request(`/api/crm/opportunities/${encodeURIComponent(data.id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    }
    return await request('/api/crm/opportunities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteCrmOpportunity(id: string): Promise<{ success: boolean; message: string }> {
    return await request(`/api/crm/opportunities/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  async getMarketingCampaigns(): Promise<import('../types').MarketingCampaign[]> {
    return await request('/api/marketing/campaigns');
  },

  async upsertMarketingCampaign(
    data: Partial<import('../types').MarketingCampaign>
  ): Promise<{ campaign: import('../types').MarketingCampaign; message: string }> {
    if (data.id) {
      return await request(`/api/marketing/campaigns/${encodeURIComponent(data.id)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    }
    return await request('/api/marketing/campaigns', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteMarketingCampaign(id: string): Promise<{ success: boolean; message: string }> {
    return await request(`/api/marketing/campaigns/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  // Landing Page Empresarial CMS & Contact Form (Sections 2 & 3)
  async getLandingPageCms(): Promise<import('../types').LandingPageCmsConfig> {
    return await request('/api/landing-cms');
  },

  async updateLandingPageCms(
    updates: Partial<import('../types').LandingPageCmsConfig>
  ): Promise<{ cms: import('../types').LandingPageCmsConfig; message: string }> {
    return await request('/api/landing-cms', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async restoreLandingPageCmsVersion(
    version: number
  ): Promise<{ cms: import('../types').LandingPageCmsConfig; message: string }> {
    return await request('/api/landing-cms/restore-version', {
      method: 'POST',
      body: JSON.stringify({ version })
    });
  },

  async submitContactInquiry(payload: {
    fullName: string;
    email: string;
    phone: string;
    companyName?: string;
    city?: string;
    subject?: string;
    message: string;
  }): Promise<{ success: boolean; customerId: string; message: string }> {
    return await request('/api/contact-inquiry', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Payment Methods, Remote Support Tools & WhatsApp QR Config (Sections 7, 10, 12, 14)
  async getPaymentMethods(): Promise<import('../types').PaymentMethodItem[]> {
    return await request('/api/payment-methods');
  },

  async updatePaymentMethods(
    items: import('../types').PaymentMethodItem[]
  ): Promise<{ paymentMethods: import('../types').PaymentMethodItem[]; message: string }> {
    return await request('/api/payment-methods', {
      method: 'PUT',
      body: JSON.stringify({ items })
    });
  },

  async getRemoteSupportTools(): Promise<import('../types').RemoteSupportToolItem[]> {
    return await request('/api/remote-support-tools');
  },

  async updateRemoteSupportTools(
    tools: import('../types').RemoteSupportToolItem[]
  ): Promise<{ remoteSupportTools: import('../types').RemoteSupportToolItem[]; message: string }> {
    return await request('/api/remote-support-tools', {
      method: 'PUT',
      body: JSON.stringify({ tools })
    });
  },

  async getWhatsAppQrConfig(): Promise<import('../types').WhatsAppQrConfig> {
    return await request('/api/whatsapp-qr-config');
  },

  async updateWhatsAppQrConfig(
    updates: Partial<import('../types').WhatsAppQrConfig>
  ): Promise<{ config: import('../types').WhatsAppQrConfig; message: string }> {
    return await request('/api/whatsapp-qr-config', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }
};



