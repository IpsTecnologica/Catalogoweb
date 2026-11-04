import React, { useState, useEffect } from 'react';
import {
  Layout, Save, RotateCcw, Plus, Trash2, Eye, CheckCircle2,
  AlertCircle, Image as ImageIcon, Upload, HelpCircle, Star,
  Wrench, Building2, Phone, ArrowUp, ArrowDown
} from 'lucide-react';
import { LandingPageCmsConfig, LandingServiceItem, LandingTestimonialItem, LandingFaqItem } from '../../types';
import { api } from '../../services/api';

export const LandingPageCmsManager: React.FC = () => {
  const [cms, setCms] = useState<LandingPageCmsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'hero' | 'about' | 'services' | 'testimonials' | 'faqs' | 'contact' | 'versions'>('hero');

  const loadCms = async () => {
    setLoading(true);
    try {
      const data = await api.getLandingPageCms();
      setCms(data);
    } catch (e: any) {
      setStatusMsg({ ok: false, text: 'Error al cargar la configuración de la página principal.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCms();
  }, []);

  const handleSave = async () => {
    if (!cms) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.updateLandingPageCms(cms);
      if (res && res.cms) {
        setCms(res.cms);
        setStatusMsg({ ok: true, text: 'Página principal actualizada y publicada permanentemente en el servidor.' });
      } else {
        setStatusMsg({ ok: true, text: 'Cambios guardados correctamente.' });
      }
    } catch (e: any) {
      setStatusMsg({ ok: false, text: e?.message || 'Error al guardar los cambios en el servidor.' });
    } finally {
      setSaving(false);
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cms) return;
    try {
      setStatusMsg({ ok: true, text: 'Subiendo imagen a la bóveda permanente...' });
      const uploaded: any = await (api as any).uploadImageFile(file);
      if (uploaded && uploaded.url) {
        setCms({
          ...cms,
          heroImageUrl: uploaded.url,
          heroImageDriveId: uploaded.driveId || uploaded.driveFileId || ''
        });
        setStatusMsg({ ok: true, text: 'Imagen cargada en bóveda permanente. Recuerda hacer clic en Guardar y Publicar.' });
      }
    } catch (err: any) {
      setStatusMsg({ ok: false, text: 'No se pudo subir la imagen.' });
    }
  };

  const handleRestoreVersion = async (index: number) => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.restoreLandingPageCmsVersion(index);
      if (res && res.cms) {
        setCms(res.cms);
        setStatusMsg({ ok: true, text: 'Versión anterior restaurada y publicada con éxito.' });
      }
    } catch (err: any) {
      setStatusMsg({ ok: false, text: 'No se pudo restaurar la versión seleccionada.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !cms) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
        Cargando administrador de la Página Principal...
      </div>
    );
  }

  const addService = () => {
    const newSrv: LandingServiceItem = {
      id: `srv-${Date.now()}`,
      title: 'Nuevo Servicio Tecnológico',
      description: 'Descripción detallada del servicio corporativo o técnico.',
      tag: 'Especializado',
      icon: 'Wrench',
      whatsappText: 'Hola IPS TECNOLÓGICA, deseo información sobre este servicio.'
    };
    setCms({ ...cms, services: [...(cms.services || []), newSrv] });
  };

  const addTestimonial = () => {
    const newTest: LandingTestimonialItem = {
      id: `test-${Date.now()}`,
      clientName: 'Nombre del Cliente',
      company: 'Empresa S.A.S.',
      role: 'Cargo',
      comment: 'Excelente atención y soporte técnico oportuno.',
      rating: 5
    };
    setCms({ ...cms, testimonials: [...(cms.testimonials || []), newTest] });
  };

  const addFaq = () => {
    const newFaq: LandingFaqItem = {
      id: `faq-${Date.now()}`,
      question: '¿Nueva pregunta frecuente?',
      answer: 'Respuesta clara y detallada para los visitantes.'
    };
    setCms({ ...cms, faqs: [...(cms.faqs || []), newFaq] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-red-600">CMS Empresarial</span>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Layout className="w-6 h-6 text-red-600" />
            Editor de Página Principal (Landing Page)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Personaliza textos, títulos, servicios, preguntas frecuentes, testimonios y fotografías permanentes de la portada pública.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar y Publicar Cambios'}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${
          statusMsg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {statusMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200">
        {[
          { id: 'hero', label: 'Portada / Hero' },
          { id: 'about', label: 'Quiénes Somos & Proceso' },
          { id: 'services', label: `Servicios (${(cms.services || []).length})` },
          { id: 'testimonials', label: `Testimonios (${(cms.testimonials || []).length})` },
          { id: 'faqs', label: `Preguntas Frecuentes (${(cms.faqs || []).length})` },
          { id: 'contact', label: 'Contacto y Horarios' },
          { id: 'versions', label: `Historial de Versiones (${(cms.previousVersions || []).length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        {activeSubTab === 'hero' && (
          <div className="space-y-4">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">Configuración de Portada Principal (Hero)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Insignia Superior (Badge)</label>
                <input
                  type="text"
                  value={cms.heroBadge || ''}
                  onChange={e => setCms({ ...cms, heroBadge: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título Principal</label>
                <input
                  type="text"
                  value={cms.heroTitle || ''}
                  onChange={e => setCms({ ...cms, heroTitle: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subtítulo / Descripción Principal</label>
              <textarea
                rows={3}
                value={cms.heroSubtitle || ''}
                onChange={e => setCms({ ...cms, heroSubtitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Texto Botón Principal</label>
                <input
                  type="text"
                  value={cms.heroPrimaryCta || ''}
                  onChange={e => setCms({ ...cms, heroPrimaryCta: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Texto Botón Secundario (Agendar)</label>
                <input
                  type="text"
                  value={cms.heroSecondaryCta || ''}
                  onChange={e => setCms({ ...cms, heroSecondaryCta: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-2">Fotografía o Banner de Portada (Almacenamiento Permanente)</label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Subir Imagen de Portada
                  <input type="file" accept="image/*" onChange={handleHeroImageUpload} className="hidden" />
                </label>
                {cms.heroImageUrl && (
                  <div className="flex items-center gap-3">
                    <img src={cms.heroImageUrl} alt="Hero" className="h-14 w-24 object-cover rounded-lg border border-slate-300" />
                    <button
                      onClick={() => setCms({ ...cms, heroImageUrl: '', heroImageDriveId: '' })}
                      className="text-xs text-red-600 font-bold hover:underline"
                    >
                      Quitar imagen
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'about' && (
          <div className="space-y-4">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">Sección Quiénes Somos</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Título Quiénes Somos</label>
              <input
                type="text"
                value={cms.aboutTitle || ''}
                onChange={e => setCms({ ...cms, aboutTitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Descripción Corporativa</label>
              <textarea
                rows={3}
                value={cms.aboutDescription || ''}
                onChange={e => setCms({ ...cms, aboutDescription: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Misión</label>
                <textarea
                  rows={3}
                  value={cms.aboutMission || ''}
                  onChange={e => setCms({ ...cms, aboutMission: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Visión</label>
                <textarea
                  rows={3}
                  value={cms.aboutVision || ''}
                  onChange={e => setCms({ ...cms, aboutVision: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Servicios Empresariales y Técnicos</h3>
              <button
                onClick={addService}
                className="px-3.5 py-2 bg-slate-900 hover:bg-red-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Agregar Servicio
              </button>
            </div>

            <div className="space-y-4">
              {(cms.services || []).map((srv, index) => (
                <div key={srv.id || index} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre del Servicio</label>
                      <input
                        type="text"
                        value={srv.title}
                        onChange={e => {
                          const next = [...cms.services];
                          next[index] = { ...srv, title: e.target.value };
                          setCms({ ...cms, services: next });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Etiqueta / Especialidad</label>
                      <input
                        type="text"
                        value={srv.tag}
                        onChange={e => {
                          const next = [...cms.services];
                          next[index] = { ...srv, tag: e.target.value };
                          setCms({ ...cms, services: next });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Descripción</label>
                    <textarea
                      rows={2}
                      value={srv.description}
                      onChange={e => {
                        const next = [...cms.services];
                        next[index] = { ...srv, description: e.target.value };
                        setCms({ ...cms, services: next });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <input
                      type="text"
                      value={srv.whatsappText || ''}
                      onChange={e => {
                        const next = [...cms.services];
                        next[index] = { ...srv, whatsappText: e.target.value };
                        setCms({ ...cms, services: next });
                      }}
                      placeholder="Mensaje predeterminado de WhatsApp..."
                      className="flex-1 mr-4 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                    <button
                      onClick={() => {
                        const next = cms.services.filter((_, i) => i !== index);
                        setCms({ ...cms, services: next });
                      }}
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'testimonials' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Clientes y Testimonios</h3>
              <button
                onClick={addTestimonial}
                className="px-3.5 py-2 bg-slate-900 hover:bg-red-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Agregar Testimonio
              </button>
            </div>

            <div className="space-y-4">
              {(cms.testimonials || []).map((t, index) => (
                <div key={t.id || index} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre del Cliente</label>
                      <input
                        type="text"
                        value={t.clientName}
                        onChange={e => {
                          const next = [...cms.testimonials];
                          next[index] = { ...t, clientName: e.target.value };
                          setCms({ ...cms, testimonials: next });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Empresa</label>
                      <input
                        type="text"
                        value={t.company}
                        onChange={e => {
                          const next = [...cms.testimonials];
                          next[index] = { ...t, company: e.target.value };
                          setCms({ ...cms, testimonials: next });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Cargo</label>
                      <input
                        type="text"
                        value={t.role}
                        onChange={e => {
                          const next = [...cms.testimonials];
                          next[index] = { ...t, role: e.target.value };
                          setCms({ ...cms, testimonials: next });
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Testimonio</label>
                    <textarea
                      rows={2}
                      value={t.comment}
                      onChange={e => {
                        const next = [...cms.testimonials];
                        next[index] = { ...t, comment: e.target.value };
                        setCms({ ...cms, testimonials: next });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        const next = cms.testimonials.filter((_, i) => i !== index);
                        setCms({ ...cms, testimonials: next });
                      }}
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'faqs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Preguntas Frecuentes (FAQ)</h3>
              <button
                onClick={addFaq}
                className="px-3.5 py-2 bg-slate-900 hover:bg-red-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Agregar Pregunta
              </button>
            </div>

            <div className="space-y-4">
              {(cms.faqs || []).map((faq, index) => (
                <div key={faq.id || index} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Pregunta</label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={e => {
                        const next = [...cms.faqs];
                        next[index] = { ...faq, question: e.target.value };
                        setCms({ ...cms, faqs: next });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Respuesta</label>
                    <textarea
                      rows={2}
                      value={faq.answer}
                      onChange={e => {
                        const next = [...cms.faqs];
                        next[index] = { ...faq, answer: e.target.value };
                        setCms({ ...cms, faqs: next });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        const next = cms.faqs.filter((_, i) => i !== index);
                        setCms({ ...cms, faqs: next });
                      }}
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'contact' && (
          <div className="space-y-4">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">Datos de Contacto y Horarios en Portada</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono / WhatsApp Principal</label>
                <input
                  type="text"
                  value={cms.contactPhone || ''}
                  onChange={e => setCms({ ...cms, contactPhone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico de Contacto</label>
                <input
                  type="email"
                  value={cms.contactEmail || ''}
                  onChange={e => setCms({ ...cms, contactEmail: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dirección Física / Sede</label>
                <input
                  type="text"
                  value={cms.contactAddress || ''}
                  onChange={e => setCms({ ...cms, contactAddress: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Horario de Atención</label>
                <input
                  type="text"
                  value={cms.businessHours || ''}
                  onChange={e => setCms({ ...cms, businessHours: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'versions' && (
          <div className="space-y-4">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">
              Historial de Versiones Publicadas
            </h3>
            {(!cms.previousVersions || cms.previousVersions.length === 0) ? (
              <p className="text-xs text-slate-500">
                Aún no hay versiones anteriores guardadas. Cada vez que guardes cambios se creará un punto de restauración automático.
              </p>
            ) : (
              <div className="space-y-2">
                {cms.previousVersions.map((ver, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Versión guardada: {new Date(ver.savedAt).toLocaleString('es-CO')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Título: {ver.snapshot?.heroTitle || 'Sin título'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreVersion(idx)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-red-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar esta versión
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
