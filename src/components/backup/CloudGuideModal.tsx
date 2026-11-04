import React, { useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Cloud,
  Database,
  Download,
  Upload,
  Globe,
  Key,
  Server,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy
} from 'lucide-react';

interface CloudGuideModalProps {
  onDataRestored: () => void;
}

export const CloudGuideModal: React.FC<CloudGuideModalProps> = ({ onDataRestored }) => {
  const { notify, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'backup' | 'db' | 'storage' | 'deploy' | 'domain'>('backup');
  const [restoring, setRestoring] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    notify('Copiado al portapapeles', 'info');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadBackup = async () => {
    try {
      const data = await api.getBackupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IPS_TECNOLOGICA_RESPALDO_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify('Copia de seguridad descargada exitosamente.', 'success');
    } catch (err: any) {
      notify(err.message || 'Error al generar respaldo.', 'error');
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('¿Desea restaurar esta copia de seguridad? Se reemplazarán los datos actuales de la aplicación.')) {
      e.target.value = '';
      return;
    }

    setRestoring(true);
    const reader = new FileReader();
    reader.onload = async evt => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        const res = await api.restoreBackup(json);
        notify(res.message, 'success');
        onDataRestored();
      } catch (err: any) {
        notify('El archivo no contiene un respaldo JSON válido.', 'error');
      } finally {
        setRestoring(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDefaults = async () => {
    if (!confirm('¿Confirma que desea restablecer los datos de IPS TECNOLÓGICA a los valores iniciales de fábrica?')) {
      return;
    }
    try {
      const res = await api.resetDefaults();
      notify(res.message, 'success');
      onDataRestored();
    } catch (err: any) {
      notify(err.message || 'Error al restablecer datos.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Arquitectura Nube, Publicación y Copias de Seguridad
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Guía técnica paso a paso para producción, bases de datos cloud, almacenamiento S3 y dominios personalizados
            </p>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-1.5 mt-5 pt-4 border-t border-slate-100 overflow-x-auto">
          {[
            { id: 'backup', label: '1. Copias de Seguridad (Backup/Restore)', icon: Database },
            { id: 'db', label: '2. Base de Datos Cloud (PostgreSQL / Supabase)', icon: Server },
            { id: 'storage', label: '3. Almacenamiento de Fotos (S3 / R2)', icon: Cloud },
            { id: 'deploy', label: '4. Despliegue en Internet (Cloud Run / Railway)', icon: Globe },
            { id: 'domain', label: '5. Conexión de Dominio Propio (DNS)', icon: Key }
          ].map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content 1: Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-red-600" />
              <span>Respaldo Integral de la Base de Datos</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Descarga un archivo JSON completo que contiene todos los productos, fotografías, usuarios del sistema, perfiles empresariales y configuraciones de diseño. Este archivo permite restaurar el sistema en cualquier momento o migrarlo entre servidores.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleDownloadBackup}
                className="px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 shadow-2xs"
              >
                <Download className="w-4 h-4 text-red-500" />
                <span>Descargar Copia de Seguridad JSON</span>
              </button>

              <label className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-2xs">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>{restoring ? 'Restaurando...' : 'Restaurar desde Respaldo JSON'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFile}
                  disabled={restoring}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
              <h4 className="font-bold text-slate-800">Estructura del archivo de respaldo:</h4>
              <ul className="list-disc pl-5 text-slate-600 space-y-1">
                <li><code className="text-red-600">products</code>: Lista de equipos, referencias, descripciones técnicas y precios COP.</li>
                <li><code className="text-red-600">company</code>: Datos de IPS TECNOLÓGICA (teléfonos, WhatsApp, redes sociales, vigencia).</li>
                <li><code className="text-red-600">users</code>: Cuentas con roles (Administrador, Editor, Consulta) y contraseñas cifradas con scrypt.</li>
              </ul>
            </div>
          </div>

          {/* Reset factory card */}
          <div className="bg-white rounded-xl border border-red-200 p-6 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider block mb-1">
                Restablecer Fábrica
              </span>
              <h4 className="text-sm font-bold text-slate-900 mb-2">
                Restaurar Datos Iniciales
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Vuelve a cargar los 28 productos iniciales de IPS TECNOLÓGICA y las 3 cuentas de demostración. Útil para reiniciar el catálogo tras realizar pruebas.
              </p>
            </div>

            <button
              onClick={handleResetDefaults}
              className="w-full py-2 px-3 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restablecer Datos de Demostración</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab Content 2: PostgreSQL / Supabase */}
      {activeTab === 'db' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Paso a Paso: Conexión con PostgreSQL / Supabase
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Actualmente el backend almacena la información de forma persistente y compartida en el servidor (<code className="text-red-600">server_data/db.json</code>). Para escalar a una base de datos relacional PostgreSQL en la nube, sigue estos pasos:
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <strong className="text-slate-900 block mb-1">Paso 1: Crear proyecto en Supabase o Neon</strong>
              <p className="text-slate-600">
                1. Ingresa a <span className="font-semibold text-red-600">supabase.com</span> y crea una organización gratuita.<br />
                2. Selecciona la región más cercana (ej. <em>US East</em> o <em>São Paulo</em> para menor latencia en Colombia).<br />
                3. Copia tu cadena de conexión <code className="text-slate-800">postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres</code>.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <strong className="text-slate-900 block mb-1">Paso 2: Script SQL de Creación de Tablas</strong>
              <div className="relative mt-2">
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-md overflow-x-auto text-[11px] font-mono leading-relaxed">
{`CREATE TABLE products (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  reference VARCHAR(64) UNIQUE NOT NULL,
  short_description TEXT,
  category VARCHAR(100) NOT NULL,
  price_cop BIGINT NOT NULL,
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE company_profile (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL
);`}
                </pre>
                <button
                  onClick={() => copyToClipboard(`CREATE TABLE products (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  reference VARCHAR(64) UNIQUE NOT NULL,
  short_description TEXT,
  category VARCHAR(100) NOT NULL,
  price_cop BIGINT NOT NULL,
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`, 'sql-schema')}
                  className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-medium"
                >
                  {copiedKey === 'sql-schema' ? '¡Copiado!' : 'Copiar SQL'}
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <strong className="text-slate-900 block mb-1">Paso 3: Variables de Entorno</strong>
              <p className="text-slate-600 mb-2">Agrega en tu archivo <code className="text-red-600">.env</code> de producción:</p>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[11px] font-mono">
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxx.supabase.co:5432/postgres"
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Storage (S3 / R2) */}
      {activeTab === 'storage' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Almacenamiento de Fotografías y Logotipo en la Nube
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              La aplicación gestiona la carga de imágenes vía <code className="text-red-600">/api/upload</code> guardándolas en disco y sirviéndolas con URLs estáticas. Para conectar buckets S3 (AWS, Cloudflare R2 o Supabase Storage):
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <strong className="text-slate-900 block mb-1">Opción A: Cloudflare R2 (Recomendado por $0 costo de egreso)</strong>
              <p className="text-slate-600 mb-2">
                1. Crea un bucket llamado <code className="text-slate-800">ips-catalog-assets</code>.<br />
                2. Activa el dominio público personalizado (ej. <code className="text-slate-800">cdn.ipstecnologica.com.co</code>).<br />
                3. Configura las variables en el servidor:
              </p>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[11px] font-mono">
R2_ACCOUNT_ID="tu_id_de_cuenta_cloudflare"
R2_ACCESS_KEY_ID="tu_access_key"
R2_SECRET_ACCESS_KEY="tu_secret_key"
R2_BUCKET_NAME="ips-catalog-assets"
CDN_PUBLIC_URL="https://cdn.ipstecnologica.com.co"
              </pre>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <strong className="text-slate-900 block mb-1">Opción B: AWS S3</strong>
              <p className="text-slate-600 mb-2">
                Configura un bucket S3 con política de lectura pública para la carpeta <code className="text-slate-800">uploads/*</code>.
              </p>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[11px] font-mono">
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="ipstecnologica-catalogo"
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 4: Deployment */}
      {activeTab === 'deploy' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Despliegue Continuo de Frontend y Backend
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              La aplicación es 100% full-stack (React + Express + TypeScript). Al ejecutar <code className="text-red-600">npm run build</code>, se genera la compilación optimizada en <code className="text-slate-800">dist/</code> y Express sirve tanto la API como la interfaz web.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <strong className="text-slate-900 block mb-1">1. Despliegue en Railway o Render</strong>
              <ol className="list-decimal pl-5 text-slate-600 space-y-1">
                <li>Conecta tu repositorio de GitHub.</li>
                <li>Build Command: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">npm run build</code></li>
                <li>Start Command: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">npm start</code> (o <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">tsx server.ts</code>)</li>
                <li>Define la variable de entorno <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">PORT=3000</code>.</li>
              </ol>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <strong className="text-slate-900 block mb-1">2. Despliegue en Google Cloud Run con Docker</strong>
              <pre className="p-2.5 bg-slate-900 text-slate-100 rounded text-[11px] font-mono leading-relaxed">
{`FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 5: Custom Domain */}
      {activeTab === 'domain' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Configuración de Dominio Propio (DNS y Certificado SSL)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Para vincular el dominio <strong className="text-slate-900">ipstecnologica.com.co</strong> o <strong className="text-slate-900">catalogo.ipstecnologica.com</strong>:
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <strong className="text-slate-900 block mb-2">Registros DNS requeridos en tu proveedor de dominio:</strong>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-1">Tipo</th>
                      <th className="py-1">Nombre / Host</th>
                      <th className="py-1">Valor / Destino</th>
                      <th className="py-1">TTL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    <tr>
                      <td className="py-1.5 text-red-600 font-bold">CNAME</td>
                      <td className="py-1.5">catalogo</td>
                      <td className="py-1.5">tu-app.railway.app (o tu URL Cloud Run)</td>
                      <td className="py-1.5">Automático</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-blue-600 font-bold">A</td>
                      <td className="py-1.5">@</td>
                      <td className="py-1.5">IP proporcionada por el host de producción</td>
                      <td className="py-1.5">3600</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-emerald-50 text-emerald-900">
              <strong className="flex items-center gap-1.5 font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Certificado SSL / HTTPS Automático
              </strong>
              <p className="text-emerald-800">
                Al apuntar los registros DNS, los proveedores modernos como Cloud Run, Railway, Vercel o Cloudflare aprovisionan automáticamente certificados TLS/SSL de Let's Encrypt sin costo adicional.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
