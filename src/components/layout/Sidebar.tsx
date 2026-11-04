import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Globe,
  FileText,
  Package,
  Building2,
  Users,
  Cloud,
  Layers,
  Lock,
  LogOut,
  LogIn,
  ShieldCheck,
  ShoppingBag,
  User as UserIcon,
  Tag,
  Smartphone,
  Wrench,
  MessageCircle,
  HardDrive
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  productCount: number;
  activePromoCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  productCount,
  activePromoCount = 0
}) => {
  const { user, isAdmin, canEdit, isStaff, logout } = useAuth();

  const navItems = [
    {
      id: 'home',
      label: 'Inicio Web Corporativa',
      icon: Building2,
      badge: '19 Secc.',
      isProtected: false
    },
    {
      id: 'public',
      label: 'Catálogo Online (/catalogo)',
      icon: Globe,
      badge: 'Tienda',
      isProtected: false
    },
    {
      id: 'public-support',
      label: 'Agenda tu Servicio Técnico',
      icon: Wrench,
      badge: 'Citas SRV',
      isProtected: false
    },
    {
      id: 'my-account',
      label: 'Portal de Clientes',
      icon: UserIcon,
      badge: 'Clientes',
      isProtected: false
    },
    {
      id: 'studio',
      label: 'Generador PDF Carta',
      icon: FileText,
      badge: '3×4 (12 p/pág)',
      isProtected: false
    },
    ...(canEdit
      ? [
          {
            id: 'dashboard',
            label: 'Resumen Ejecutivo',
            icon: Layers,
            isProtected: true
          },
          {
            id: 'landing-cms',
            label: 'Página Principal (CMS)',
            icon: Building2,
            badge: 'Editor Web',
            isProtected: true
          },
          {
            id: 'products',
            label: 'Productos e Inventario',
            icon: Package,
            badge: `${productCount}`,
            isProtected: true
          },
          {
            id: 'crm-marketing',
            label: 'CRM, Clientes y Oportunidades',
            icon: Users,
            badge: 'CRM 360',
            isProtected: true
          },
          {
            id: 'crm-campaigns',
            label: 'Campañas Comerciales',
            icon: Tag,
            badge: 'Marketing',
            isProtected: true
          },
          {
            id: 'promotions',
            label: 'Promociones y Cupones',
            icon: Tag,
            badge: activePromoCount > 0 ? `${activePromoCount} Activas` : 'Cupones',
            isProtected: true
          },
          {
            id: 'templates-banners',
            label: 'Plantillas (14 Temporadas)',
            icon: Layers,
            badge: '14 Temp.',
            isProtected: true
          }
        ]
      : []),
    ...(isStaff
      ? [
          {
            id: 'admin-support',
            label: 'Agenda Técnica y Citas',
            icon: Wrench,
            badge: 'Agenda',
            isProtected: true
          },
          {
            id: 'admin-technicians',
            label: 'Técnicos y Disponibilidad',
            icon: Users,
            badge: 'Asignación',
            isProtected: true
          },
          {
            id: 'admin-service-orders',
            label: 'Órdenes de Servicio (SRV)',
            icon: FileText,
            badge: 'Órdenes',
            isProtected: true
          },
          {
            id: 'admin-orders',
            label: 'Pedidos y Guías',
            icon: ShoppingBag,
            badge: 'Ventas',
            isProtected: true
          },
          {
            id: 'warranties-shipping',
            label: 'Garantías y Envíos',
            icon: ShieldCheck,
            badge: 'Ley 1480',
            isProtected: true
          },
          {
            id: 'whatsapp-ai',
            label: 'WhatsApp Inteligente',
            icon: MessageCircle,
            badge: 'Chatbot',
            isProtected: true
          }
        ]
      : []),
    ...(isAdmin
      ? [
          {
            id: 'integrations-whatsapp',
            label: 'Conectar WhatsApp (QR / API)',
            icon: MessageCircle,
            badge: 'Config',
            isProtected: true
          },
          {
            id: 'system-config',
            label: 'Configuración del Sistema',
            icon: ShieldCheck,
            badge: '12 Módulos',
            isProtected: true
          },
          {
            id: 'system-backups',
            label: 'Respaldos y Bóveda Fotos',
            icon: HardDrive,
            badge: 'Seguridad',
            isProtected: true
          },
          {
            id: 'users',
            label: 'Usuarios y Roles',
            icon: Users,
            badge: 'RBAC',
            isProtected: true
          },
          {
            id: 'workspace',
            label: 'Google Sheets & Drive',
            icon: FileText,
            badge: '16 Hojas',
            isProtected: true
          },
          {
            id: 'company',
            label: 'Identidad & Logo',
            icon: Building2,
            isProtected: true
          },
          {
            id: 'app-manager',
            label: 'Gestión de la App',
            icon: Smartphone,
            badge: 'PWA/APK',
            isProtected: true
          },
          {
            id: 'cloud-guide',
            label: 'Nube y Despliegue',
            icon: Cloud,
            isProtected: true
          }
        ]
      : [])
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] select-none">
      <div className="p-4 space-y-6">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
            Módulos del Sistema
          </span>
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const showLock = item.isProtected && !user;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-red-50 text-red-600 font-bold border border-red-200 shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-600' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {showLock && (
                      <span title="Ruta protegida">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </span>
                    )}
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-red-600 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Security / System Status */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Persistencia Real
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
              <ShieldCheck className="w-3 h-3" />
              <span>Activa</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            {user
              ? `Sesión activa: ${user.role} (${user.email}).`
              : 'Catálogo público y agendamiento de soporte técnico activos.'}
          </p>
        </div>
      </div>

      {/* Footer Info & Prominent Logout Button */}
      <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/50">
        {user ? (
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div
                className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                  isAdmin ? 'bg-red-600' : 'bg-slate-800'
                }`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate text-left flex-1">
                <span className="text-xs font-bold text-slate-900 block truncate leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block truncate">
                  {user.role} • {user.email}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full py-2 px-3 text-xs font-bold text-red-700 hover:text-white bg-red-100/70 hover:bg-red-600 border border-red-200 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setActiveTab('dashboard')}
            className="w-full py-2 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Acceso Interno / Admin</span>
          </button>
        )}

        <div className="text-[10px] text-slate-400 text-center font-medium">
          IPS TECNOLÓGICA CATALOG STUDIO
        </div>
      </div>
    </aside>
  );
};
