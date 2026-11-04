import React from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import {
  LogIn,
  LogOut,
  FileText,
  Globe,
  Menu,
  X,
  UserPlus,
  User as UserIcon,
  PackageCheck,
  Share2,
  Tag,
  Smartphone,
  WifiOff,
  Wrench,
  MessageCircle,
  HardDrive,
  Bell,
  ShieldCheck,
  Layers
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenShareCatalog: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    whatsapp?: string;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLogin,
  onOpenRegister,
  onOpenShareCatalog,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  mobileMenuOpen,
  setMobileMenuOpen,
  socialLinks = {
    facebook: 'https://facebook.com/ipstecnologica',
    instagram: 'https://instagram.com/ipstecnologica',
    tiktok: 'https://tiktok.com/@ipstecnologica',
    youtube: 'https://youtube.com/@ipstecnologica',
    whatsapp: '+573108947231'
  }
}) => {
  const { user, logout, isAdmin, canEdit, isStaff, notify } = useAuth();
  const { isInstalled, isOnline, promptInstall } = usePWAInstall();

  const handleInstallNavbarClick = async () => {
    const res = await promptInstall();
    if (res === 'accepted') {
      notify('¡Aplicación de IPS TECNOLÓGICA instalada correctamente!', 'success');
    } else if (res === 'manual-instructions') {
      setActiveTab('public');
      setTimeout(() => {
        const el = document.getElementById('descarga-nuestra-app');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs py-1.5 px-4 flex items-center justify-center gap-2 font-semibold">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            Modo sin conexión activo: Estás viendo datos guardados. Los cambios en cola se sincronizarán al reconectar.
          </span>
        </div>
      )}

      <div className="bg-slate-900 text-slate-300 text-[11px] py-1 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white tracking-wide">IPS TECNOLÓGICA</span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline">
            Línea Mayorista & Soporte Técnico: {socialLinks.whatsapp}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-[10px] hidden md:inline">Síguenos:</span>
          {socialLinks.facebook && (
            <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white transition">
              Facebook
            </a>
          )}
          {socialLinks.instagram && (
            <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white transition">
              Instagram
            </a>
          )}
          {socialLinks.tiktok && (
            <a href={socialLinks.tiktok} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white transition">
              TikTok
            </a>
          )}
          {socialLinks.youtube && (
            <a href={socialLinks.youtube} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white transition">
              YouTube
            </a>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center text-left whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <BrandLogo size="md" showSlogan={false} />
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-3.5 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab('home')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 cursor-pointer ${
                activeTab === 'home' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Inicio Web</span>
            </button>

            <button
              onClick={() => setActiveTab('public')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 cursor-pointer ${
                activeTab === 'public' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
              }`}
            >
              <PackageCheck className="w-4 h-4 text-red-600" />
              <span>Catálogo Online</span>
            </button>

            <button
              onClick={() => setActiveTab('public-support')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 cursor-pointer ${
                activeTab === 'public-support' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
              }`}
            >
              <Wrench className="w-4 h-4 text-red-600" />
              <span>Soporte Técnico</span>
            </button>

            <button
              onClick={() => setActiveTab('studio')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 cursor-pointer ${
                activeTab === 'studio' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>PDF Carta</span>
            </button>

            {user && (
              <button
                onClick={() => setActiveTab('my-account')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1 cursor-pointer ${
                  activeTab === 'my-account' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>Mi Cuenta</span>
              </button>
            )}

            {isStaff && (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                {canEdit && (
                  <>
                    <button
                      onClick={() => setActiveTab('products')}
                      className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 py-1 cursor-pointer ${
                        activeTab === 'products' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
                      }`}
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Productos</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('promotions')}
                      className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 py-1 cursor-pointer ${
                        activeTab === 'promotions' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5 text-red-600" />
                      <span>Promos</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('templates-banners')}
                      className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 py-1 cursor-pointer ${
                        activeTab === 'templates-banners' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-red-600" />
                      <span>14 Plantillas & 6 Banners</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('crm-marketing')}
                      className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 py-1 cursor-pointer ${
                        activeTab === 'crm-marketing' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
                      }`}
                    >
                      <UserIcon className="w-3.5 h-3.5 text-red-600" />
                      <span>CRM & Marketing</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setActiveTab('admin-support')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 py-1 cursor-pointer ${
                    activeTab === 'admin-support' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Órdenes SRV</span>
                </button>

                <button
                  onClick={() => setActiveTab('warranties-shipping')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 py-1 cursor-pointer ${
                    activeTab === 'warranties-shipping' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Garantías & Envíos</span>
                </button>

                <button
                  onClick={() => setActiveTab('whatsapp-ai')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 py-1 cursor-pointer ${
                    activeTab === 'whatsapp-ai' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp IA</span>
                </button>

                {isAdmin && (
                  <>
                    <button
                      onClick={() => setActiveTab('system-config')}
                      className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 py-1 cursor-pointer ${
                        activeTab === 'system-config' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
                      }`}
                    >
                      <span>Configuración (12)</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('integrations-whatsapp')}
                      className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 py-1 cursor-pointer ${
                        activeTab === 'integrations-whatsapp' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Integración WhatsApp</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('system-backups')}
                      className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 py-1 cursor-pointer ${
                        activeTab === 'system-backups' ? 'text-red-600 font-bold border-b-2 border-red-600' : ''
                      }`}
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Respaldos</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallNavbarClick}
                className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                title="Instalar aplicación oficial de IPS TECNOLÓGICA"
              >
                <Smartphone className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden lg:inline">INSTALAR APP</span>
              </button>
            )}

            <button
              onClick={onOpenShareCatalog}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              title="Compartir enlace del catálogo público"
            >
              <Share2 className="w-3.5 h-3.5 text-red-600" />
              <span className="hidden sm:inline">COMPARTIR</span>
            </button>

            {isAdmin && onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative p-2 text-slate-700 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 rounded-xl transition cursor-pointer"
                title="Centro de Notificaciones y Autorizaciones Administrativas"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab(canEdit ? 'products' : isStaff ? 'admin-support' : 'my-account')}
                  className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 py-1.5 px-3 rounded-xl transition text-left cursor-pointer"
                >
                  <div
                    className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                      isAdmin ? 'bg-red-600' : 'bg-slate-800'
                    }`}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden xl:flex flex-col">
                    <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        isAdmin ? 'text-red-600' : 'text-slate-500'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                </button>

                <button
                  onClick={logout}
                  title="Cerrar sesión"
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenLogin}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Iniciar Sesión</span>
                </button>

                <button
                  onClick={onOpenRegister}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-sm shadow-red-600/20 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Registrarse</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Abrir menú de navegación móvil"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (360px, 390px, 768px Responsive Menu) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 max-h-[82vh] overflow-y-auto shadow-lg">
          <button
            onClick={() => {
              setActiveTab('home');
              setMobileMenuOpen(false);
            }}
            className={`w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 ${
              activeTab === 'home' ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>Inicio Web Corporativa (/)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('public');
              setMobileMenuOpen(false);
            }}
            className={`w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 ${
              activeTab === 'public' ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <PackageCheck className="w-4 h-4 shrink-0 text-red-600" />
            <span>Catálogo Online (/catalogo)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('public-support');
              setMobileMenuOpen(false);
            }}
            className={`w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 ${
              activeTab === 'public-support' ? 'bg-red-50 text-red-600 font-bold' : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0" />
            <span>Agenda tu Servicio Técnico (SRV)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('studio');
              setMobileMenuOpen(false);
            }}
            className={`w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 ${
              activeTab === 'studio' ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Generador PDF Carta (3x4)</span>
          </button>

          {user && (
            <button
              onClick={() => {
                setActiveTab('my-account');
                setMobileMenuOpen(false);
              }}
              className={`w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 ${
                activeTab === 'my-account' ? 'bg-red-50 text-red-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <UserIcon className="w-4 h-4 shrink-0" />
              <span>Mi Cuenta (Pedidos, Citas y Garantías)</span>
            </button>
          )}

          {isStaff && (
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block px-3 py-1">
                Panel Administrativo y Técnico:
              </span>
              {canEdit && (
                <>
                  <button
                    onClick={() => {
                      setActiveTab('dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
                  >
                    Panel de Control y Estadísticas
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('products');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
                  >
                    Inventario de Productos
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('promotions');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
                  >
                    Promociones y Códigos de Descuento
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('templates-banners');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
                  >
                    14 Plantillas de Temporada y 6 Banners
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('crm-marketing');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-bold text-red-700 hover:bg-red-50 flex items-center"
                  >
                    CRM y Marketing Digital (Ley 1581)
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setActiveTab('admin-support');
                  setMobileMenuOpen(false);
                }}
                className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
              >
                Soporte Técnico y Calendario (SRV)
              </button>
              <button
                onClick={() => {
                  setActiveTab('warranties-shipping');
                  setMobileMenuOpen(false);
                }}
                className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
              >
                Garantías y Envíos (Ley 1480 de 2011)
              </button>
              <button
                onClick={() => {
                  setActiveTab('whatsapp-ai');
                  setMobileMenuOpen(false);
                }}
                className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
              >
                WhatsApp Inteligente — Gemini IA
              </button>
              <button
                onClick={() => {
                  setActiveTab('admin-orders');
                  setMobileMenuOpen(false);
                }}
                className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
              >
                Pedidos de Clientes y Guías
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setActiveTab('system-config');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-bold text-red-700 hover:bg-red-50 flex items-center"
                  >
                    Configuración del Sistema (12 Integraciones)
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('integrations-whatsapp');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center"
                  >
                    Configuración → Integraciones → WhatsApp Business
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('system-backups');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
                  >
                    Respaldos, Papelera y Conexiones
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('users');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
                  >
                    Usuarios y Roles (RBAC)
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('workspace');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
                  >
                    Google Sheets (12 Hojas) & Drive (9 Carpetas)
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('company');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
                  >
                    Identidad Corporativa y Logo
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('app-manager');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
                  >
                    Gestión de la App (PWA y Android APK)
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('cloud-guide');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
                  >
                    Nube y Despliegue Online
                  </button>
                </>
              )}
            </div>
          )}

          {/* Quick mobile action buttons */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenShareCatalog();
              }}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-4 h-4 text-red-600" />
              <span>Compartir</span>
            </button>

            {!isInstalled && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleInstallNavbarClick();
                }}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Smartphone className="w-4 h-4 text-red-400" />
                <span>Instalar App</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
