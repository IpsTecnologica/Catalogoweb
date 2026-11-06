import React, { useState } from 'react';
import { CompanyProfile } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Phone,
  Share2,
  Palette,
  Save,
  Upload,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

interface CompanySettingsProps {
  company: CompanyProfile;
  onCompanyUpdated: (updated: CompanyProfile) => void;
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({
  company,
  onCompanyUpdated
}) => {
  const { notify, isAdmin } = useAuth();

  const [form, setForm] = useState<CompanyProfile>({
    ...company,
    nit: company.nit || '901.458.920-1'
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setError(null);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await api.uploadImage(file.name, base64Data, true);
      setForm(prev => ({ ...prev, logoUrl: res.url }));
      notify('Logotipo empresarial cargado correctamente. Recuerde hacer clic en Guardar Cambios.', 'success');
    } catch (err: any) {
      setError(err.message || 'Error al cargar logotipo.');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleRestoreOfficialLogo = () => {
    setForm(prev => ({ ...prev, logoUrl: '/uploads/ips_official_logo.svg' }));
    notify('Logo oficial de IPS TECNOLÓGICA restaurado. Haga clic en Guardar Cambios para aplicar.', 'info');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      notify('Solo el Administrador puede modificar los datos corporativos.', 'error');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateCompany(form);
      onCompanyUpdated(updated);
      notify('Datos empresariales y logotipo actualizados exitosamente en el catálogo y PDF.', 'success');
    } catch (err: any) {
      setError(err.message || 'Error al guardar configuración empresarial.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Identidad Corporativa y Configuración Empresarial
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Personaliza el logotipo oficial, NIT, teléfonos, redes sociales y condiciones para el catálogo web y PDF
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Basic Company Data & Logo */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-red-600" />
            <span>1. Datos Generales y Logotipo Oficial (Aparece en Portada y Encabezados PDF)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {/* Logo Preview & Upload */}
            <div className="md:col-span-1 border border-slate-200 rounded-lg p-4 bg-slate-50 text-center">
              <span className="text-xs font-semibold text-slate-700 block mb-2">
                Logotipo Corporativo Oficial
              </span>
              <div className="w-36 h-36 mx-auto bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden mb-3 relative group">
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain p-2"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 bg-red-600 rounded-lg text-white font-extrabold flex items-center justify-center text-xl shadow-sm">
                    IPS
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="flex flex-col gap-2">
                  <label className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>{uploadingLogo ? 'Subiendo...' : 'Subir Nuevo Logo'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRestoreOfficialLogo}
                    className="px-3 py-1 text-[11px] font-medium text-slate-600 hover:text-red-600 inline-flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar Logo Oficial IPS</span>
                  </button>
                </div>
              )}
            </div>

            {/* Name, NIT, Slogan & Description */}
            <div className="md:col-span-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Razón Social / Nombre Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isAdmin}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="IPS TECNOLÓGICA"
                    className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIT / Identificación Fiscal
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={form.nit || ''}
                    onChange={e => setForm({ ...form, nit: e.target.value })}
                    placeholder="901.458.920-1"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Eslogan Institucional
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={form.slogan}
                  onChange={e => setForm({ ...form, slogan: e.target.value })}
                  placeholder="Innovación y Soluciones Tecnológicas de Alta Gama"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción Institucional
                </label>
                <textarea
                  rows={3}
                  disabled={!isAdmin}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Breve reseña que aparecerá en la portada de los catálogos y portal web..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Phone className="w-4 h-4 text-red-600" />
            <span>2. Canales de Contacto y Ubicación</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono Fijo / PBX
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+57 (601) 745-8920"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Comercial
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.whatsapp}
                onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="+57 310 894 7231"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                disabled={!isAdmin}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="contacto@ipstecnologica.com.co"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dirección Física
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Carrera 15 # 85-30, Oficina 402"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ciudad y País
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="Bogotá D.C., Colombia"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sitio Web Oficial
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.website}
                onChange={e => setForm({ ...form, website: e.target.value })}
                placeholder="https://ipstecnologica.com.co"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Social Networks */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Share2 className="w-4 h-4 text-red-600" />
            <span>3. Redes Sociales</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Facebook
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.social.facebook}
                onChange={e => setForm({ ...form, social: { ...form.social, facebook: e.target.value } })}
                placeholder="https://facebook.com/ipstecnologica"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instagram
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.social.instagram}
                onChange={e => setForm({ ...form, social: { ...form.social, instagram: e.target.value } })}
                placeholder="https://instagram.com/ipstecnologica"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                TikTok
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.social.tiktok}
                onChange={e => setForm({ ...form, social: { ...form.social, tiktok: e.target.value } })}
                placeholder="https://tiktok.com/@ipstecnologica"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                YouTube
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.social.youtube}
                onChange={e => setForm({ ...form, social: { ...form.social, youtube: e.target.value } })}
                placeholder="https://youtube.com/@ipstecnologica"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Corporate Colors & Commercial Conditions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Palette className="w-4 h-4 text-red-600" />
            <span>4. Colores Corporativos y Condiciones Comerciales</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rojo Brillante (Acción)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  disabled={!isAdmin}
                  value={form.colors.primary}
                  onChange={e => setForm({ ...form, colors: { ...form.colors, primary: e.target.value } })}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={form.colors.primary}
                  onChange={e => setForm({ ...form, colors: { ...form.colors, primary: e.target.value } })}
                  className="w-24 px-2 py-1 text-xs font-mono border border-slate-300 rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Negro (Estructura)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  disabled={!isAdmin}
                  value={form.colors.secondary}
                  onChange={e => setForm({ ...form, colors: { ...form.colors, secondary: e.target.value } })}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={form.colors.secondary}
                  onChange={e => setForm({ ...form, colors: { ...form.colors, secondary: e.target.value } })}
                  className="w-24 px-2 py-1 text-xs font-mono border border-slate-300 rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gris Técnico
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  disabled={!isAdmin}
                  value={form.colors.accent}
                  onChange={e => setForm({ ...form, colors: { ...form.colors, accent: e.target.value } })}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={form.colors.accent}
                  onChange={e => setForm({ ...form, colors: { ...form.colors, accent: e.target.value } })}
                  className="w-24 px-2 py-1 text-xs font-mono border border-slate-300 rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Blanco (Lienzo)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  disabled={!isAdmin}
                  value={form.colors.background}
                  onChange={e => setForm({ ...form, colors: { ...form.colors, background: e.target.value } })}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={form.colors.background}
                  onChange={e => setForm({ ...form, colors: { ...form.colors, background: e.target.value } })}
                  className="w-24 px-2 py-1 text-xs font-mono border border-slate-300 rounded"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Condiciones Comerciales y Vigencia de Precios
            </label>
            <textarea
              rows={3}
              disabled={!isAdmin}
              value={form.commercialTerms}
              onChange={e => setForm({ ...form, commercialTerms: e.target.value })}
              placeholder="Texto legal que se incluirá en el pie de página de los catálogos..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
            />
          </div>
        </div>

        {/* Section 5: Tax Configuration (DIAN — Persona Natural No Responsable de IVA) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-red-600" />
              <span>5. Configuración Tributaria (DIAN — Exclusivo Administrador)</span>
            </h3>
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
              {form.taxConfig?.regime || 'Persona natural - No responsable de IVA'}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Condición actual predeterminada: <strong>Persona natural no responsable de IVA</strong>. El sistema no calcula ni suma automáticamente el 19% de IVA, no incrementa precios existentes y no muestra etiquetas de IVA por defecto en productos, servicios, cotizaciones, cuentas de cobro, recibos ni catálogos PDF. Solo el administrador puede modificar esta condición si cambia la responsabilidad ante la DIAN.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Régimen Tributario Actual ante la DIAN
              </label>
              <select
                disabled={!isAdmin}
                value={form.taxConfig?.regime || 'Persona natural - No responsable de IVA'}
                onChange={e => {
                  const nextRegime = e.target.value as any;
                  const isIvaResp = nextRegime === 'Responsable de IVA (Régimen Común)';
                  setForm({
                    ...form,
                    taxConfig: {
                      regime: nextRegime,
                      ivaEnabled: isIvaResp,
                      ivaRatePercent: isIvaResp ? (form.taxConfig?.ivaRatePercent || 19) : 0,
                      showIvaLabelInCatalog: isIvaResp ? Boolean(form.taxConfig?.showIvaLabelInCatalog) : false,
                      priceLabelText: form.taxConfig?.priceLabelText || 'Precio Oficial COP',
                      invoiceFooterText: isIvaResp
                        ? 'Responsable de Impuesto sobre las Ventas - Régimen Común DIAN.'
                        : 'Persona natural no responsable de IVA (Art. 437 Estatuto Tributario - DIAN).',
                      otherTaxes: form.taxConfig?.otherTaxes || []
                    }
                  });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
              >
                <option value="Persona natural - No responsable de IVA">
                  Persona natural - No responsable de IVA (Predeterminado)
                </option>
                <option value="Responsable de IVA (Régimen Común)">
                  Responsable de IVA (Régimen Común)
                </option>
                <option value="Régimen Simple de Tributación">
                  Régimen Simple de Tributación
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Etiqueta de Precio en Catálogo y PDFs
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.taxConfig?.priceLabelText || 'Precio Oficial COP'}
                onChange={e =>
                  setForm({
                    ...form,
                    taxConfig: {
                      ...(form.taxConfig || {
                        regime: 'Persona natural - No responsable de IVA',
                        ivaEnabled: false,
                        ivaRatePercent: 0,
                        showIvaLabelInCatalog: false,
                        invoiceFooterText: 'Persona natural no responsable de IVA.'
                      }),
                      priceLabelText: e.target.value
                    }
                  })
                }
                placeholder="Precio Oficial COP"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nota Tributaria en Cotizaciones, Cuentas de Cobro, Recibos y Reportes
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={
                  form.taxConfig?.invoiceFooterText ||
                  'Persona natural no responsable de IVA (Art. 437 Estatuto Tributario - DIAN).'
                }
                onChange={e =>
                  setForm({
                    ...form,
                    taxConfig: {
                      ...(form.taxConfig || {
                        regime: 'Persona natural - No responsable de IVA',
                        ivaEnabled: false,
                        ivaRatePercent: 0,
                        showIvaLabelInCatalog: false,
                        priceLabelText: 'Precio Oficial COP'
                      }),
                      invoiceFooterText: e.target.value
                    }
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50"
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={Boolean(form.taxConfig?.ivaEnabled)}
                  onChange={e =>
                    setForm({
                      ...form,
                      taxConfig: {
                        ...(form.taxConfig || {
                          regime: 'Persona natural - No responsable de IVA',
                          ivaRatePercent: 0,
                          showIvaLabelInCatalog: false,
                          priceLabelText: 'Precio Oficial COP',
                          invoiceFooterText: 'Persona natural no responsable de IVA.'
                        }),
                        ivaEnabled: e.target.checked,
                        showIvaLabelInCatalog: e.target.checked ? Boolean(form.taxConfig?.showIvaLabelInCatalog) : false
                      }
                    })
                  }
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span>Habilitar cálculo de IVA (desactivado para Persona natural no responsable de IVA)</span>
              </label>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-800 block">
              Otros conceptos tributarios separados (Operaciones particulares)
            </span>
            <p className="text-[11px] text-slate-500">
              Se mantienen separados de los precios de catálogo y solo aplican cuando una operación empresarial particular lo requiera (ej. Retención en la fuente o ReteICA).
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar y Aplicar al Catálogo'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
