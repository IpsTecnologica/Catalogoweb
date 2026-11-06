import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Product, CompanyProfile, AppReleaseConfig } from './types';
import { setConfiguredPublicUrl, getRemainingCountdown } from './utils/formatters';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { StatsOverview } from './components/dashboard/StatsOverview';
import { ProductList } from './components/products/ProductList';
import { ProductModal } from './components/products/ProductModal';
import { ImportExportModal } from './components/products/ImportExportModal';
import { CatalogStudio } from './components/catalog/CatalogStudio';
import { PublicCatalog } from './components/public/PublicCatalog';
import { CompanySettings } from './components/company/CompanySettings';
import { UserManager } from './components/users/UserManager';
import { WorkspaceManager } from './components/workspace/WorkspaceManager';
import { DriveImagesManager } from './components/workspace/DriveImagesManager';
import { CloudGuideModal } from './components/backup/CloudGuideModal';
import { SystemBackupManager } from './components/backup/SystemBackupManager';
import { LoginModal } from './components/auth/LoginModal';
import { RegisterModal } from './components/auth/RegisterModal';
import { AdminLoginScreen } from './components/auth/AdminLoginScreen';
import { ClientPortal } from './components/client/ClientPortal';
import { AdminOrdersManager } from './components/orders/AdminOrdersManager';
import { PromotionsManager } from './components/promotions/PromotionsManager';
import { AppManager } from './components/admin/AppManager';
import { ShareCatalogModal } from './components/common/ShareCatalogModal';
import { PublicSupportBooking } from './components/support/PublicSupportBooking';
import { AdminSupportManager } from './components/support/AdminSupportManager';
import { WhatsAppManager } from './components/whatsapp/WhatsAppManager';
import { WhatsAppBusinessIntegration } from './components/integrations/WhatsAppBusinessIntegration';
import { SystemConfigurationHub } from './components/settings/SystemConfigurationHub';
import { SeasonalTemplatesManager } from './components/templates/SeasonalTemplatesManager';
import { WarrantiesAndShippingManager } from './components/policies/WarrantiesAndShippingManager';
import { AdminNotificationsModal } from './components/notifications/AdminNotificationsModal';
import { CorporateHomePage } from './components/public/CorporateHomePage';
import { CrmMarketingManager } from './components/crm/CrmMarketingManager';
import { LandingPageCmsManager } from './components/admin/LandingPageCmsManager';
import { Loader2 } from 'lucide-react';

const DEFAULT_COMPANY: CompanyProfile = {
  name: 'IPS TECNOLÓGICA',
  nit: '901.458.920-1',
  slogan: 'Innovación, Equipamiento y Soluciones Tecnológicas de Alta Gama',
  logoUrl: '/uploads/ips_official_logo.svg',
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
    whatsapp: '+57 310 894 7231',
    website: 'https://ipstecnologica.com.co'
  },
  colors: {
    primary: '#DC2626',
    secondary: '#111827',
    accent: '#475569',
    background: '#FFFFFF'
  },
  commercialTerms:
    'Precios expresados en Pesos Colombianos (COP). Persona natural no responsable de IVA. Garantía legal de 12 a 36 meses según línea de producto. Precios y disponibilidad sujetos a cambio sin previo aviso. Envíos asegurados a todo el territorio nacional.'
};

const EDITOR_OR_ADMIN_TABS = ['dashboard', 'landing-cms', 'products', 'promotions', 'templates-banners', 'crm-marketing', 'crm-campaigns'];
const STAFF_TABS = ['admin-support', 'admin-technicians', 'admin-service-orders', 'whatsapp-ai', 'admin-orders', 'warranties-shipping'];
const ADMIN_ONLY_TABS = [
  'system-config',
  'integrations-whatsapp',
  'system-backups',
  'drive-images',
  'company',
  'workspace',
  'users',
  'app-manager',
  'cloud-guide'
];

const TAB_TITLES: Record<string, string> = {
  dashboard: 'Panel de Control y Estadísticas',
  'landing-cms': 'Editor de Página Principal Corporativa (CMS)',
  products: 'Inventario de Equipos Tecnológicos',
  promotions: 'Módulo de Promociones Programadas y Códigos de Descuento',
  'templates-banners': '14 Plantillas de Temporada y Carrusel Promocional de 6 Destacados',
  'crm-marketing': 'CRM, Clientes, Oportunidades y Seguimiento Comercial',
  'crm-campaigns': 'Campañas Comerciales y Notificaciones de Promociones (Ley 1581)',
  'admin-support': 'Gestión de Soporte Técnico, Agenda y Citas',
  'admin-technicians': 'Gestión Exclusiva de Técnicos, Especialidades y Horarios',
  'admin-service-orders': 'Órdenes de Servicio Técnico (SRV) y Diagnósticos',
  'warranties-shipping': 'Políticas Oficiales de Garantías y Envíos (Ley 1480 de 2011)',
  'whatsapp-ai': 'WhatsApp Inteligente con IA Gemini',
  'system-config': 'Configuración del Sistema (12 Módulos e Integraciones)',
  'integrations-whatsapp': 'Configuración → Integraciones → Conectar WhatsApp (QR wa.me & API Oficial)',
  'system-backups': 'Respaldos, Bóveda Drive de Imágenes y Recuperación del Sistema',
  'drive-images': 'GESTIÓN DE IMÁGENES GOOGLE DRIVE',
  'admin-orders': 'Gestión de Pedidos de Clientes y Números de Guía',
  company: 'Identidad Corporativa y Configuración Tributaria',
  workspace: 'Google Workspace (18 Hojas Sheets & 9 Carpetas Drive)',
  users: 'Gestión de Usuarios y Permisos (RBAC)',
  'app-manager': 'Gestión de la App (PWA y Android APK)',
  'cloud-guide': 'Nube, Respaldo y Despliegue'
};

function MainApp() {
  const { user, isAdmin, canEdit, isStaff, notify } = useAuth();

  const [activeTab, setActiveTab] = useState<string>(() => {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    if (path.includes('/catalogo') || params.has('product') || params.has('category') || params.get('view') === 'catalogo') {
      return 'public';
    }
    return 'home';
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY);
  const [appConfig, setAppConfig] = useState<AppReleaseConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isShareCatalogOpen, setIsShareCatalogOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadAdminNotificationsCount = async () => {
    if (!isAdmin) return;
    try {
      const [notifsRes, auths] = await Promise.all([
        api.getAdminNotifications().catch(() => ({ notifications: [], unreadCount: 0 })),
        api.getOrderAuthorizations().catch(() => [])
      ]);
      const unread = notifsRes?.unreadCount ?? (notifsRes?.notifications || []).filter(n => !n.isRead && !n.read).length;
      const pendingAuths = (auths || []).filter(a => a.status === 'Pendiente').length;
      setUnreadNotificationsCount(unread + pendingAuths);
    } catch {
      // ignore
    }
  };

  const loadData = async () => {
    try {
      const [fetchedProducts, fetchedCompany, sysConfig, fetchedAppConfig] = await Promise.all([
        api.getProducts(),
        api.getCompany().catch(() => DEFAULT_COMPANY),
        api.getSystemConfig().catch(() => null),
        api.getAppConfig().catch(() => null)
      ]);
      setProducts(fetchedProducts);
      if (fetchedCompany) setCompany(fetchedCompany);
      if (sysConfig?.publicAppUrl) {
        setConfiguredPublicUrl(sysConfig.publicAppUrl);
      }
      if (fetchedAppConfig) {
        setAppConfig(fetchedAppConfig);
      }
    } catch (err: any) {
      console.error('Failed to load products/company', err);
      notify('Error al conectar con el servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAdminNotificationsCount();
    }
  }, [isAdmin]);

  useEffect(() => {
    const primaryColor = company.colors?.primary || '#DC2626';
    const backgroundColor = company.colors?.background || '#FFFFFF';
    const secondaryColor = company.colors?.secondary || '#111827';

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', primaryColor);
    }

    document.documentElement.style.setProperty('--company-primary', primaryColor);
    document.documentElement.style.setProperty('--company-background', backgroundColor);
    document.documentElement.style.setProperty('--company-secondary', secondaryColor);
  }, [company.colors]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const latestProducts = await api.getProducts();
        setProducts(latestProducts);
      } catch {
        // Ignore silent background polling error
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasDeepLink = params.has('product') || params.has('category');
    if (user && (activeTab === 'public' || activeTab === 'home') && !hasDeepLink) {
      if (canEdit) {
        setActiveTab('products');
      } else if (isStaff) {
        setActiveTab('admin-support');
      } else {
        setActiveTab('my-account');
      }
    }
  }, [user]);

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  const activePromoCount = products.filter(
    p => p.isActive && p.activePromotion && !getRemainingCountdown(p.activePromotion.endAt).expired
  ).length;

  const handleOpenCreateProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setProductToEdit(p);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    try {
      await api.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      notify(`Producto "${name}" enviado a la Papelera y sincronizado.`, 'info');
    } catch (err: any) {
      notify(err.message || 'Error al eliminar producto.', 'error');
    }
  };

  const handleToggleStatus = async (p: Product) => {
    try {
      const updated = await api.updateProduct(p.id, { isActive: !p.isActive });
      setProducts(prev => prev.map(item => (item.id === p.id ? updated : item)));
      notify(`Estado de "${p.name}" actualizado a ${!p.isActive ? 'Activo' : 'Inactivo'}.`, 'success');
    } catch (err: any) {
      notify(err.message || 'Error al actualizar estado.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 bg-red-600 rounded-xl text-white font-extrabold flex items-center justify-center text-lg mb-4 shadow-md animate-bounce">
          IPS
        </div>
        <div className="flex items-center gap-2 text-slate-800 text-sm font-bold">
          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
          <span>Iniciando IPS TECNOLÓGICA CATALOG STUDIO...</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Recuperando catálogo permanente desde el servidor, Google Drive y Google Sheets
        </p>
      </div>
    );
  }

  const requiresEditorOrAdmin = EDITOR_OR_ADMIN_TABS.includes(activeTab) && (!user || !canEdit);
  const requiresStaff = STAFF_TABS.includes(activeTab) && (!user || !isStaff);
  const requiresStrictAdmin = ADMIN_ONLY_TABS.includes(activeTab) && (!user || !isAdmin);
  const requiresAuthGate = requiresEditorOrAdmin || requiresStaff || requiresStrictAdmin;

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-100 flex flex-col text-slate-900 font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenShareCatalog={() => setIsShareCatalogOpen(true)}
        onOpenNotifications={() => {
          setIsNotificationsOpen(true);
          loadAdminNotificationsCount();
        }}
        unreadNotificationsCount={unreadNotificationsCount}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        socialLinks={company.social}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto min-w-0">
        <div className="hidden md:block">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            productCount={products.length}
            activePromoCount={activePromoCount}
          />
        </div>

        <main className="flex-1 p-3 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden overflow-y-auto">
          {requiresAuthGate ? (
            <AdminLoginScreen
              onBackToPublic={() => setActiveTab('home')}
              destinationTabTitle={TAB_TITLES[activeTab] || 'Panel Administrativo'}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <CorporateHomePage
                  products={products}
                  company={company}
                  categories={categories}
                  appConfig={appConfig}
                  onOpenCatalog={() => setActiveTab('public')}
                  onOpenClientPortal={() => {
                    if (user) {
                      setActiveTab('my-account');
                    } else {
                      setIsLoginOpen(true);
                    }
                  }}
                  onOpenSupportBooking={() => {
                    if (user) {
                      setActiveTab('my-account');
                    } else {
                      setActiveTab('public-support');
                    }
                  }}
                />
              )}

              {activeTab === 'public' && (
                <PublicCatalog
                  products={products}
                  company={company}
                  categories={categories}
                  appConfig={appConfig}
                  onRequestClientLogin={() => setIsLoginOpen(true)}
                />
              )}

              {activeTab === 'public-support' && (
                <PublicSupportBooking
                  company={company}
                  onBackToCatalog={() => setActiveTab('public')}
                />
              )}

              {activeTab === 'studio' && (
                <CatalogStudio
                  products={products}
                  company={company}
                  categories={categories}
                  onReloadProducts={loadData}
                  onRequestClientLogin={() => setIsLoginOpen(true)}
                />
              )}

              {activeTab === 'my-account' && (
                <ClientPortal
                  company={company}
                  onGoToCatalog={() => setActiveTab('public')}
                  onGoToSupportBooking={() => setActiveTab('public-support')}
                  whatsappCompanyPhone={company.whatsapp}
                />
              )}

              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <StatsOverview
                    products={products}
                    categories={categories}
                    onOpenCreate={handleOpenCreateProduct}
                    onGoToStudio={() => setActiveTab('studio')}
                    onGoToPublic={() => setActiveTab('public')}
                    canEdit={canEdit}
                  />
                  <ProductList
                    products={products.slice(0, 6)}
                    categories={categories}
                    companyName={company.name}
                    onOpenCreate={handleOpenCreateProduct}
                    onOpenEdit={handleOpenEditProduct}
                    onDeleteProduct={handleDeleteProduct}
                    onToggleStatus={handleToggleStatus}
                    onOpenImportExport={() => setIsImportExportOpen(true)}
                  />
                </div>
              )}

              {activeTab === 'products' && (
                <ProductList
                  products={products}
                  categories={categories}
                  companyName={company.name}
                  onOpenCreate={handleOpenCreateProduct}
                  onOpenEdit={handleOpenEditProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onToggleStatus={handleToggleStatus}
                  onOpenImportExport={() => setIsImportExportOpen(true)}
                />
              )}

              {activeTab === 'promotions' && (
                <PromotionsManager
                  products={products}
                  categories={categories}
                  onPromotionsChanged={loadData}
                />
              )}

              {activeTab === 'templates-banners' && (
                <SeasonalTemplatesManager
                  products={products}
                  onNotify={(title, msg, type) => notify(`${title}: ${msg}`, type || 'info')}
                  onTemplatesChanged={() => loadData()}
                  onBannersChanged={() => loadData()}
                />
              )}

              {activeTab === 'landing-cms' && (
                <LandingPageCmsManager />
              )}

              {activeTab === 'crm-marketing' && (
                <CrmMarketingManager
                  products={products}
                  company={company}
                  initialSubTab="crm"
                />
              )}

              {activeTab === 'crm-campaigns' && (
                <CrmMarketingManager
                  products={products}
                  company={company}
                  initialSubTab="campaigns"
                />
              )}

              {activeTab === 'admin-support' && (
                <AdminSupportManager company={company} initialSubTab="ordenes" />
              )}

              {activeTab === 'admin-technicians' && (
                <AdminSupportManager company={company} initialSubTab="tecnicos" />
              )}

              {activeTab === 'admin-service-orders' && (
                <AdminSupportManager company={company} initialSubTab="ordenes" />
              )}

              {activeTab === 'warranties-shipping' && (
                <WarrantiesAndShippingManager
                  company={company}
                  canEditPolicies={isAdmin}
                  onNotify={(title, msg, type) => notify(`${title}: ${msg}`, type || 'info')}
                />
              )}

              {activeTab === 'whatsapp-ai' && (
                <WhatsAppManager company={company} />
              )}

              {activeTab === 'system-config' && (
                <SystemConfigurationHub
                  company={company}
                  onCompanyUpdated={updated => setCompany(updated)}
                  onDataChanged={loadData}
                />
              )}

              {activeTab === 'integrations-whatsapp' && (
                <WhatsAppBusinessIntegration onConfigUpdated={loadData} />
              )}

              {activeTab === 'system-backups' && (
                <SystemBackupManager onDataRestored={loadData} />
              )}

              {activeTab === 'drive-images' && (
                <DriveImagesManager />
              )}

              {activeTab === 'admin-orders' && <AdminOrdersManager />}

              {activeTab === 'company' && (
                <CompanySettings
                  company={company}
                  onCompanyUpdated={updated => setCompany(updated)}
                />
              )}

              {activeTab === 'workspace' && (
                <WorkspaceManager onDataSynced={loadData} />
              )}

              {activeTab === 'users' && <UserManager />}

              {activeTab === 'app-manager' && (
                <AppManager onConfigUpdated={loadData} />
              )}

              {activeTab === 'cloud-guide' && (
                <CloudGuideModal onDataRestored={loadData} />
              )}
            </>
          )}
        </main>
      </div>

      <ShareCatalogModal
        isOpen={isShareCatalogOpen}
        onClose={() => setIsShareCatalogOpen(false)}
        company={company}
        companyName={company.name}
        categories={categories}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onOpenRegister={() => setIsRegisterOpen(true)}
      />

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
        onSaved={loadData}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        products={products}
        onImportComplete={loadData}
      />

      <AdminNotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => {
          setIsNotificationsOpen(false);
          loadAdminNotificationsCount();
        }}
        isPrimaryAdmin={user?.email?.toLowerCase() === 'jeffervr@gmail.com' || isAdmin}
        onNavigateTab={tab => setActiveTab(tab)}
        onNotify={(title, msg, type) => notify(`${title}: ${msg}`, type || 'info')}
        onUnreadCountChange={cnt => setUnreadNotificationsCount(cnt)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
