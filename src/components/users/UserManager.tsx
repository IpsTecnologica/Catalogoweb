import React, { useState, useEffect } from 'react';
import { User, UserRole, UserAccountStatus } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import {
  UserPlus,
  Shield,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

export const UserManager: React.FC = () => {
  const { user: currentUser, notify, isAdmin } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('Técnico');
  const [status, setStatus] = useState<UserAccountStatus>('Activo');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('+57 ');
    setRole('Técnico');
    setStatus('Activo');
    setPassword('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone || '+57 ');
    setRole(u.role);
    setStatus(u.status || (u.isActive === false ? 'Inactivo' : 'Activo'));
    setPassword('');
    setError(null);
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError('El nombre y el correo electrónico son obligatorios.');
      return;
    }

    if (!editingUser && password && password.length < 6) {
      setError('La contraseña debe tener mínimo 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingUser) {
        const updated = await api.updateUser(editingUser.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          status,
          isActive: status === 'Activo',
          ...(password.trim() ? { password: password.trim() } : {})
        });
        setUsers(prev => prev.map(item => (item.id === editingUser.id ? updated : item)));
        notify(`Usuario ${updated.name} actualizado (${updated.role} · ${updated.status || 'Activo'}).`, 'success');
      } else {
        const created = await api.createUser({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          status,
          password: password.trim() || undefined
        });
        setUsers(prev => [...prev, created]);
        notify(`Usuario ${created.name} (${created.role}) registrado exitosamente.`, 'success');
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAccess = async (u: User) => {
    if (u.id === currentUser?.id || u.email.toLowerCase() === currentUser?.email.toLowerCase()) {
      notify('No puede desactivar su propia cuenta de administrador activa.', 'error');
      return;
    }

    const currentActive = u.status !== 'Inactivo' && u.isActive !== false;
    const nextStatus: UserAccountStatus = currentActive ? 'Inactivo' : 'Activo';

    try {
      const updated = await api.updateUser(u.id, {
        status: nextStatus,
        isActive: nextStatus === 'Activo'
      });
      setUsers(prev => prev.map(item => (item.id === u.id ? updated : item)));
      notify(`Acceso de ${u.name} cambiado a ${nextStatus}.`, 'info');
    } catch (err: any) {
      notify(err.message || 'Error al cambiar el estado del usuario.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;
    try {
      await api.deleteUser(deleteConfirmUser.id);
      setUsers(prev => prev.filter(u => u.id !== deleteConfirmUser.id));
      notify(`Usuario ${deleteConfirmUser.name} enviado a la Papelera correctamente.`, 'info');
      setDeleteConfirmUser(null);
    } catch (err: any) {
      notify(err.message || 'Error al eliminar usuario.', 'error');
      setDeleteConfirmUser(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-900">Acceso Restringido</h3>
        <p className="text-xs text-slate-500 mt-1">
          Solo los usuarios con rol de Administrador o Supervisor validados por el servidor pueden gestionar cuentas y permisos.
        </p>
      </div>
    );
  }

  const activeAdminCount = users.filter(
    u => u.role === 'Administrador' && u.status !== 'Inactivo' && u.isActive !== false
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Administración de Usuarios, Roles y Acceso (RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Roles oficiales: Administrador, Supervisor, Técnico, Caja, Editor y Cliente · {activeAdminCount} Administradores activos
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Usuario / Rol</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Cargando usuarios...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Usuario</th>
                  <th className="px-5 py-3.5">Correo (Google Auth / Login)</th>
                  <th className="px-5 py-3.5">Rol en el Sistema</th>
                  <th className="px-5 py-3.5">Estado de Acceso</th>
                  <th className="px-5 py-3.5">Registro / Auditoría</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => {
                  const isSelf =
                    u.id === currentUser?.id ||
                    u.email.toLowerCase() === (currentUser?.email || '').toLowerCase();
                  const isUserActive = u.status !== 'Inactivo' && u.isActive !== false;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                              u.role === 'Administrador' || u.role === 'Supervisor'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[10px] text-red-600 font-semibold">
                                  (Sesión Actual)
                                </span>
                              )}
                            </div>
                            {u.phone && (
                              <span className="text-[11px] text-slate-400 font-normal block">
                                {u.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-slate-700 font-mono">
                        {u.email}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              u.role === 'Administrador' || u.role === 'Supervisor'
                                ? 'bg-red-600'
                                : u.role === 'Técnico'
                                ? 'bg-emerald-600'
                                : u.role === 'Caja' || u.role === 'Editor'
                                ? 'bg-blue-600'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span>{u.role}</span>
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleAccess(u)}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors ${
                            isUserActive ? 'text-emerald-700' : 'text-slate-500'
                          } ${isSelf ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:underline'}`}
                        >
                          {isUserActive ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-500" />
                              <span>Inactivo</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-5 py-3.5 text-slate-500">
                        <span className="block">{formatDate(u.updatedAt || u.createdAt)}</span>
                        {u.updatedBy && (
                          <span className="text-[10px] text-slate-400 block">
                            Por: {u.updatedBy}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar rol o datos del usuario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {!isSelf && (
                            <button
                              onClick={() => setDeleteConfirmUser(u)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Enviar a Papelera"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider block mb-1">
            Administrador
          </span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Control total: usuarios, respaldos, empresa, productos, promociones, soporte y WhatsApp IA.
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block mb-1">
            Supervisor
          </span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Supervisión operativa de inventario, pedidos, reportes, técnicos y atención por WhatsApp.
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
            Técnico
          </span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Gestión de órdenes de servicio asignadas (SRV), diagnósticos, repuestos, fotos y calendario.
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
            Caja / Editor
          </span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Facturación de ventas, liquidación de órdenes de servicio, catálogo y promociones.
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
            Cliente
          </span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Acceso privado a sus propias compras, órdenes de servicio técnico, citas y garantías.
          </p>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingUser ? 'Editar Usuario y Permisos' : 'Registrar Nuevo Usuario'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico (Google / Acceso) *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@gmail.com"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+57 310 000 0000"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rol Asignado *
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Caja">Caja</option>
                    <option value="Editor">Editor</option>
                    <option value="Consulta">Consulta</option>
                    <option value="Cliente">Cliente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado de Acceso *
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as UserAccountStatus)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Activo">Activo (Permitido)</option>
                    <option value="Inactivo">Inactivo (Suspendido)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingUser
                    ? 'Nueva Contraseña (opcional)'
                    : 'Contraseña de Acceso'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Registrar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ¿Confirmar envío a Papelera?
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Se retirará el acceso de <strong>{deleteConfirmUser.name}</strong> ({deleteConfirmUser.email}) y se enviará a la Papelera de recuperación.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Sí, Enviar a Papelera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
