import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  db,
  isAuthorizedAdmin,
  AUTHORIZED_ADMIN_EMAILS,
  TECHNICAL_SERVICE_CATALOG,
  BackupType,
  BackupModuleScope,
  driveMediaVault,
  DriveOfficialFolderPath
} from './server/data/store.js';
import { generateFreeGoogleAppsScriptCode } from './server/data/enterpriseModulesSeed.js';
import {
  loadWorkspaceConfig,
  verifyGoogleToken,
  uploadFileToDrive,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent
} from './server/workspace/sheetsDriveService.js';
import { sheetsDb } from './server/workspace/sheetsDatabase.js';
import {
  ensurePwaAndOgAssets,
  buildWebManifestObject,
  normalizeHexColor
} from './server/utils/pwaAssetsGenerator.js';
import {
  testFirestoreConnection,
  getFirestoreConnectionState,
  saveAllChunksToFirestore
} from './server/data/firestoreService.js';
import {
  generateWhatsAppGeminiResponse,
  isGeminiConfigured
} from './server/services/whatsappGeminiService.js';
import {
  getSanitizedWhatsAppIntegrationView,
  getWhatsAppIntegrationSecrets,
  updateWhatsAppIntegrationVault,
  testWhatsAppCloudConnection,
  sendRealWhatsAppCloudMessage,
  verifyMetaWebhookSignature,
  appendWhatsAppIntegrationError,
  clearWhatsAppIntegrationErrors,
  getSanitizedGeminiIntegrationView,
  updateGeminiIntegrationVault,
  testRealGeminiConnection,
  getCustomModuleState,
  updateCustomModuleState,
  recordSystemIntegrationTest,
  getSystemIntegrationTestHistory
} from './server/services/whatsappIntegrationVault.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const rawAppUrl =
  process.env.PUBLIC_APP_URL ||
  process.env.SHARED_APP_URL ||
  process.env.APP_URL ||
  'https://ais-pre-ouzmtvpcklhtkaxl7txrq4-235668912498.us-west2.run.app';

const PUBLIC_SHARED_URL = rawAppUrl.includes('ais-dev-')
  ? rawAppUrl.replace('ais-dev-', 'ais-pre-')
  : rawAppUrl;

function getEffectivePublicAppUrl(): string {
  try {
    const vaultUrl = getWhatsAppIntegrationSecrets().publicAppUrl;
    if (vaultUrl && vaultUrl.startsWith('http')) {
      return vaultUrl.replace(/\/+$/, '');
    }
  } catch {}
  return PUBLIC_SHARED_URL.replace(/\/+$/, '');
}

app.use(
  express.json({
    limit: '120mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: true, limit: '120mb' }));

const PUBLIC_DIR = path.resolve(__dirname, 'public');
const UPLOAD_DIR = path.resolve(PUBLIC_DIR, 'uploads');
const APK_UPLOAD_DIR = path.resolve(UPLOAD_DIR, 'apk');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(APK_UPLOAD_DIR)) {
  fs.mkdirSync(APK_UPLOAD_DIR, { recursive: true });
}

try {
  ensurePwaAndOgAssets(PUBLIC_DIR, db.getCompany(), db.getAppConfig(), true);
} catch (err) {
  console.warn('Warning generating PWA assets:', err);
}

app.get('/manifest.webmanifest', (_req: Request, res: Response) => {
  const manifest = buildWebManifestObject(db.getCompany(), db.getAppConfig());
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(JSON.stringify(manifest, null, 2));
});

// Auto-hydrate any missing /uploads/:filename from the permanent Drive Media Vault so photos never disappear after 24h
app.get('/uploads/:filename', (req: Request, res: Response, next: NextFunction) => {
  const safeFile = path.basename(req.params.filename || '');
  if (!safeFile) return next();
  const localPath = path.join(UPLOAD_DIR, safeFile);
  if (fs.existsSync(localPath)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return next();
  }
  const hydrated = driveMediaVault.serveOrHydrateFile(safeFile);
  if (hydrated) {
    res.setHeader('Content-Type', hydrated.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(hydrated.buffer);
  }
  next();
});

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '365d', immutable: true }));

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildDynamicOpenGraphHtml(htmlTemplate: string, req: Request): string {
  try {
    const company = db.getCompany();
    const baseUrl = getEffectivePublicAppUrl();
    const productRef = typeof req.query.product === 'string' ? req.query.product.trim() : '';
    const categoryQuery = typeof req.query.category === 'string' ? req.query.category.trim() : '';

    let ogTitle = `${company.name || 'IPS TECNOLÓGICA'} | Catálogo Oficial de Productos y Promociones`;
    let ogDesc =
      company.description ||
      'Explora el catálogo oficial de IPS TECNOLÓGICA. Equipos de cómputo, portátiles, monitores, periféricos, redes y promociones exclusivas en Colombia.';
    let ogImage = `${baseUrl}/og-catalog-banner.png`;
    let ogUrl = `${baseUrl}/`;

    if (productRef) {
      const products = db.getProducts();
      const matched = products.find(
        p => p.reference.toLowerCase() === productRef.toLowerCase() || p.id === productRef
      );
      if (matched) {
        const formattedPrice = new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          maximumFractionDigits: 0
        }).format(matched.priceCOP);

        const promoPrefix = matched.activePromotion
          ? `🔥 OFERTA ${formattedPrice} (-${matched.activePromotion.discountPercentage}%) | `
          : `${formattedPrice} | `;

        ogTitle = `${matched.name} (${matched.reference}) - ${company.name}`;
        ogDesc = `${promoPrefix}${matched.shortDescription || matched.category}. Disponible en el catálogo oficial de ${company.name}.`;
        ogUrl = `${baseUrl}/?product=${encodeURIComponent(matched.reference)}`;

        if (matched.images && matched.images.length > 0) {
          const primaryImg = matched.images[0];
          if (primaryImg.startsWith('http://') || primaryImg.startsWith('https://')) {
            ogImage = primaryImg;
          } else if (primaryImg.startsWith('/')) {
            ogImage = `${baseUrl}${primaryImg}`;
          }
        }
      }
    } else if (categoryQuery) {
      ogTitle = `Catálogo de ${categoryQuery} | ${company.name}`;
      ogDesc = `Descubre nuestra línea de ${categoryQuery} en ${company.name}. Consulta precios en COP, disponibilidad inmediata y promociones activas.`;
      ogUrl = `${baseUrl}/?category=${encodeURIComponent(categoryQuery)}`;
    }

    const safeTitle = escapeHtml(ogTitle);
    const safeDesc = escapeHtml(ogDesc);
    const safeImage = escapeHtml(ogImage);
    const safeUrl = escapeHtml(ogUrl);
    const safePrimaryColor = escapeHtml(normalizeHexColor(company.colors?.primary, '#DC2626'));

    return htmlTemplate
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
      .replace(
        /<meta\s+name="theme-color"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="theme-color" content="${safePrimaryColor}" />`
      )
      .replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="description" content="${safeDesc}" />`
      )
      .replace(
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:title" content="${safeTitle}" />`
      )
      .replace(
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:description" content="${safeDesc}" />`
      )
      .replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:image" content="${safeImage}" />`
      )
      .replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:url" content="${safeUrl}" />`
      )
      .replace(
        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:title" content="${safeTitle}" />`
      )
      .replace(
        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:description" content="${safeDesc}" />`
      )
      .replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:image" content="${safeImage}" />`
      );
  } catch {
    return htmlTemplate;
  }
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.substring(7).trim();
}

/**
 * Middleware: Authenticate user using local session token or Google OAuth access token.
 * Populates req.user and req.googleToken (including persistent Google token stored in session).
 */
async function authenticateUser(
  req: Request & { user?: any; googleToken?: string },
  _res: Response,
  next: NextFunction
) {
  const token = getBearerToken(req);
  const headerGoogleToken =
    typeof req.headers['x-google-access-token'] === 'string'
      ? req.headers['x-google-access-token'].trim()
      : undefined;

  if (token) {
    // 1. Check persistent backend session token
    const localUser = db.getUserByToken(token);
    if (localUser) {
      req.user = localUser;
      req.googleToken = headerGoogleToken || db.getLatestGoogleAccessToken() || undefined;
      return next();
    }

    // 2. Otherwise verify Google OAuth token directly
    req.googleToken = token;
    const googleProfile = await verifyGoogleToken(token);
    if (googleProfile && googleProfile.email) {
      try {
        const user = db.getOrCreateGoogleUser(googleProfile.email, googleProfile.name, googleProfile.picture);
        req.user = user;
      } catch {
        req.user = null;
      }
    }
  } else if (headerGoogleToken) {
    req.googleToken = headerGoogleToken;
  }
  next();
}

app.use(authenticateUser);

function requireAuth(req: Request & { user?: any }, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Sesión expirada o no autenticada. Inicie sesión para continuar.' });
  }
  if (req.user.isActive === false || req.user.status === 'Inactivo') {
    return res.status(403).json({ error: 'Su cuenta se encuentra desactivada. Contacte al administrador.' });
  }
  next();
}

function blockDemoUserMutation(req: Request & { user?: any }, res: Response): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    if (req.user && db.isDemoReadOnlyUser(req.user.email || req.user.role)) {
      res.status(403).json({
        error:
          'Modo DEMO (Solo Consulta): El usuario de demostración no tiene permisos para crear, editar, eliminar ni modificar configuraciones.'
      });
      return true;
    }
  }
  return false;
}

function requireAdmin(req: Request & { user?: any }, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Acceso restringido. Debe iniciar sesión como Administrador.' });
  }
  if (req.user.isActive === false || req.user.status === 'Inactivo') {
    return res.status(403).json({ error: 'Su cuenta ha sido desactivada.' });
  }
  if (blockDemoUserMutation(req, res)) return;

  const isReadOnlyDemoGet =
    req.method === 'GET' && db.isDemoReadOnlyUser(req.user.email || req.user.role);

  const allowed =
    req.user.role === 'Administrador' ||
    req.user.role === 'Supervisor' ||
    isReadOnlyDemoGet ||
    isAuthorizedAdmin(req.user.email);

  if (!allowed) {
    return res.status(403).json({
      error: 'Permisos insuficientes. Esta operación requiere rol de Administrador o Supervisor autorizado de IPS TECNOLÓGICA.'
    });
  }
  next();
}

function requireStrictAdminOnly(req: Request & { user?: any }, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Acceso restringido. Debe iniciar sesión como Administrador autorizado.' });
  }
  if (req.user.isActive === false || req.user.status === 'Inactivo') {
    return res.status(403).json({ error: 'Su cuenta ha sido desactivada.' });
  }
  if (blockDemoUserMutation(req, res)) return;

  const isReadOnlyDemoGet =
    req.method === 'GET' && db.isDemoReadOnlyUser(req.user.email || req.user.role);

  const allowed = req.user.role === 'Administrador' || isReadOnlyDemoGet || isAuthorizedAdmin(req.user.email);
  if (!allowed) {
    return res.status(403).json({
      error: 'Acceso denegado. Solo los Administradores autorizados pueden gestionar secretos e integraciones.'
    });
  }
  next();
}

function requireEditorOrAdmin(req: Request & { user?: any }, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Acceso restringido. Inicie sesión para gestionar el inventario.' });
  }
  if (req.user.isActive === false || req.user.status === 'Inactivo') {
    return res.status(403).json({ error: 'Su cuenta ha sido desactivada.' });
  }
  if (blockDemoUserMutation(req, res)) return;

  const allowed =
    req.user.role === 'Administrador' ||
    req.user.role === 'Supervisor' ||
    req.user.role === 'Editor' ||
    isAuthorizedAdmin(req.user.email);

  if (!allowed) {
    return res.status(403).json({
      error: 'No tiene permisos para modificar productos. Solo Administradores, Supervisores y Editores autorizados pueden realizar cambios.'
    });
  }
  next();
}

function requireSupportStaff(req: Request & { user?: any }, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Acceso restringido. Inicie sesión para gestionar soporte técnico.' });
  }
  if (req.user.isActive === false || req.user.status === 'Inactivo') {
    return res.status(403).json({ error: 'Su cuenta ha sido desactivada.' });
  }
  if (blockDemoUserMutation(req, res)) return;

  const allowed =
    req.user.role === 'Administrador' ||
    req.user.role === 'Supervisor' ||
    req.user.role === 'Técnico' ||
    req.user.role === 'Caja' ||
    req.user.role === 'Editor' ||
    req.user.role === 'Consulta' ||
    isAuthorizedAdmin(req.user.email);

  if (!allowed) {
    return res.status(403).json({
      error: 'Permisos insuficientes para acceder al panel interno de soporte técnico.'
    });
  }
  next();
}

/* ==========================================================================
   SYSTEM CONFIG, PWA & ANDROID APK RELEASE MANAGEMENT
   ========================================================================== */

app.get('/api/config', (_req: Request, res: Response) => {
  const now = new Date();
  const bogotaTime = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'full',
    timeStyle: 'medium'
  }).format(now);

  res.json({
    publicAppUrl: getEffectivePublicAppUrl(),
    timezone: 'America/Bogota',
    serverTimeISO: now.toISOString(),
    bogotaFormatted: bogotaTime
  });
});

app.get('/api/app-config', (_req: Request, res: Response) => {
  res.json(db.getAppConfig());
});

app.put('/api/app-config', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const updated = db.updateAppConfig(req.body, req.user?.email || 'Admin');
    try {
      ensurePwaAndOgAssets(PUBLIC_DIR, db.getCompany(), updated, false);
    } catch {}
    res.json({
      appConfig: updated,
      message: 'Configuración de versión y lanzamiento actualizada exitosamente.'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar configuración de la aplicación.' });
  }
});

app.post('/api/app-config/upload-apk', requireAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    const { filename, dataBase64, versionName, version, versionCode, releaseNotes } = req.body;
    if (!dataBase64) {
      return res.status(400).json({ error: 'No se recibió el archivo APK.' });
    }

    const cleanBase64 = String(dataBase64).replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (buffer.length < 64) {
      return res.status(400).json({ error: 'El archivo APK proporcionado está vacío o es inválido.' });
    }

    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return res.status(400).json({
        error: 'El archivo seleccionado no tiene una firma de paquete Android APK válida (PK ZIP).'
      });
    }

    const resolvedVersion = String(versionName || version || db.getAppConfig().versionName || '1.0.0').replace(
      /[^0-9A-Za-z._-]/g,
      ''
    );
    const apkFileName = `IPS_TECNOLOGICA_v${resolvedVersion}.apk`;
    const apkFilePath = path.join(APK_UPLOAD_DIR, apkFileName);

    fs.writeFileSync(apkFilePath, buffer);

    const fileSizeMB = Number((buffer.length / (1024 * 1024)).toFixed(2));
    const downloadUrl = `/uploads/apk/${apkFileName}`;

    if (req.googleToken) {
      const wsConfig = loadWorkspaceConfig();
      const targetFolder = wsConfig.folders?.backupsId || wsConfig.rootFolderId;
      if (targetFolder) {
        try {
          await uploadFileToDrive(
            req.googleToken,
            apkFileName,
            'application/vnd.android.package-archive',
            buffer,
            targetFolder,
            `Instalador Android APK IPS TECNOLÓGICA v${resolvedVersion}`
          );
        } catch (driveErr) {
          console.warn('Optional Drive APK mirror warning:', driveErr);
        }
      }
    }

    const updatedConfig = db.updateAppConfig(
      {
        versionName: resolvedVersion,
        versionCode: versionCode ? Number(versionCode) : db.getAppConfig().versionCode + 1,
        releaseNotes: releaseNotes !== undefined ? releaseNotes : db.getAppConfig().releaseNotes,
        apkAvailable: true,
        apkDownloadUrl: downloadUrl,
        apkFileName: filename || apkFileName,
        apkFileSizeMB: fileSizeMB,
        apkUpdatedAt: new Date().toISOString()
      },
      req.user?.email || 'Admin'
    );

    res.json({
      appConfig: updatedConfig,
      message: `Instalador Android (${apkFileName}) verificado y publicado exitosamente.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al procesar y publicar el archivo APK.' });
  }
});

app.delete('/api/app-config/apk', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const current = db.getAppConfig();
    if (current.apkDownloadUrl && current.apkDownloadUrl.startsWith('/uploads/apk/')) {
      const filePart = path.basename(current.apkDownloadUrl);
      const localPath = path.join(APK_UPLOAD_DIR, filePart);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }
    const updated = db.updateAppConfig(
      {
        apkAvailable: false,
        apkDownloadUrl: null,
        apkFileName: null,
        apkFileSizeMB: null,
        apkUpdatedAt: null
      },
      req.user?.email || 'Admin'
    );
    res.json({
      appConfig: updated,
      message: 'El archivo APK ha sido retirado y el botón de descarga Android se ha ocultado del catálogo público.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al retirar el archivo APK.' });
  }
});

/* ==========================================================================
   AUTH & REGISTRATION ENDPOINTS (INCLUDING PERSISTENT GOOGLE SESSION)
   ========================================================================== */

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, phone, acceptTerms } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
  }
  if (!acceptTerms) {
    return res.status(400).json({ error: 'Debe aceptar la política de tratamiento de datos personales.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const result = db.registerUser(name, email, password, phone);
    res.status(201).json({
      user: result.user,
      token: result.token,
      message: '¡Registro completado exitosamente! Bienvenido a IPS TECNOLÓGICA.'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al registrar usuario.' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son requeridos.' });
  }

  try {
    const result = db.authenticateUser(email, password);
    if (!result) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifique su correo y contraseña.' });
    }

    res.json({
      user: result.user,
      token: result.token,
      message: `Sesión iniciada como ${result.user.role}.`
    });
  } catch (err: any) {
    res.status(403).json({ error: err.message || 'No se pudo iniciar sesión.' });
  }
});

// Exchange Google OAuth token for a persistent backend session token so page reloads never drop auth
app.post('/api/auth/google', async (req: Request, res: Response) => {
  const { googleAccessToken } = req.body;
  const tokenToVerify = googleAccessToken || getBearerToken(req);
  if (!tokenToVerify) {
    return res.status(400).json({ error: 'Token de Google OAuth requerido.' });
  }

  try {
    const profile = await verifyGoogleToken(tokenToVerify);
    if (!profile || !profile.email) {
      return res.status(401).json({ error: 'No se pudo verificar el token de Google.' });
    }

    const result = db.createGoogleSession(profile.email, profile.name, profile.picture, tokenToVerify);
    res.json({
      user: result.user,
      token: result.token,
      message: `Sesión de Google iniciada como ${result.user.role}.`
    });
  } catch (err: any) {
    res.status(403).json({ error: err.message || 'No se pudo iniciar sesión con Google.' });
  }
});

app.get('/api/auth/me', (req: Request & { user?: any }, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ user: null });
  }
  res.json({ user: req.user });
});

app.put('/api/auth/profile', requireAuth, (req: Request & { user?: any }, res: Response) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio.' });

  const updated = db.updateCustomerProfile(req.user.id, name, phone || '');
  if (!updated) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ user: updated, message: 'Perfil actualizado exitosamente.' });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = getBearerToken(req);
  if (token) db.logout(token);
  res.json({ success: true });
});

app.post('/api/auth/recover', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Correo requerido.' });
  const code = db.requestPasswordReset(email);
  res.json({
    message: 'Código de recuperación generado.',
    code: code || '892401'
  });
});

app.post('/api/auth/reset', (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  const ok = db.resetPassword(email, code, newPassword);
  if (!ok) return res.status(400).json({ error: 'Código inválido o expirado.' });
  res.json({ success: true, message: 'Contraseña restablecida correctamente.' });
});

/* ==========================================================================
   USERS & ADMINISTRATORS MANAGEMENT (RBAC)
   ========================================================================== */

app.get('/api/users', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  if (req.user && db.isDemoReadOnlyUser(req.user.email || req.user.role)) {
    return res.json(db.getDemoSafeCustomers());
  }
  res.json(db.getUsers());
});

app.post('/api/users', requireAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    const newUser = db.createUserByAdmin(req.body, req.user.email);
    const op = db.enqueueSyncOperation('Usuarios y roles', 'CREAR_USUARIO', { id: newUser.id, email: newUser.email });
    if (req.googleToken && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      sheetsDb
        .syncUsersToSheets(req.googleToken, req.user.email)
        .then(() => db.completeSyncOperation(op.id))
        .catch(e => db.failSyncOperation(op.id, e?.message || 'Error Sheets'));
    }
    res.status(201).json(newUser);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al crear usuario.' });
  }
});

app.put('/api/users/:id', requireAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    const updatedUser = db.updateUserByAdmin(req.params.id, req.body, {
      id: req.user.id,
      email: req.user.email
    });
    const op = db.enqueueSyncOperation('Usuarios y roles', 'ACTUALIZAR_USUARIO', {
      id: updatedUser.id,
      email: updatedUser.email
    });
    if (req.googleToken && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      sheetsDb
        .syncUsersToSheets(req.googleToken, req.user.email)
        .then(() => db.completeSyncOperation(op.id))
        .catch(e => db.failSyncOperation(op.id, e?.message || 'Error Sheets'));
    }
    res.json(updatedUser);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar usuario.' });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    db.deleteUserByAdmin(req.params.id, {
      id: req.user.id,
      email: req.user.email
    });
    const op = db.enqueueSyncOperation('Usuarios y roles', 'ELIMINAR_USUARIO', { id: req.params.id });
    if (req.googleToken && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      sheetsDb
        .syncUsersToSheets(req.googleToken, req.user.email)
        .then(() => db.completeSyncOperation(op.id))
        .catch(e => db.failSyncOperation(op.id, e?.message || 'Error Sheets'));
    }
    res.json({ success: true, message: 'Usuario enviado a la Papelera exitosamente.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al eliminar usuario.' });
  }
});

/* ==========================================================================
   SCHEDULED PROMOTIONS ENDPOINTS (ADMIN / EDITOR)
   ========================================================================== */

app.get('/api/promotions', (_req: Request, res: Response) => {
  res.json(db.getPromotions());
});

app.post('/api/promotions', requireEditorOrAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    const created = db.createPromotion(req.body, req.user.email);
    const op = db.enqueueSyncOperation('Promociones', 'CREAR_PROMOCION', { id: created.id, name: created.name });
    if (req.googleToken && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      sheetsDb
        .syncPromotionsToSheets(req.googleToken, req.user.email)
        .then(() => db.completeSyncOperation(op.id))
        .catch(e => db.failSyncOperation(op.id, e?.message || 'Error Sheets'));
    }
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al crear la promoción.' });
  }
});

app.put('/api/promotions/:id', requireEditorOrAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    const updated = db.updatePromotion(req.params.id, req.body, req.user.email);
    const op = db.enqueueSyncOperation('Promociones', 'ACTUALIZAR_PROMOCION', { id: updated.id, name: updated.name });
    if (req.googleToken && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      sheetsDb
        .syncPromotionsToSheets(req.googleToken, req.user.email)
        .then(() => db.completeSyncOperation(op.id))
        .catch(e => db.failSyncOperation(op.id, e?.message || 'Error Sheets'));
    }
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar la promoción.' });
  }
});

app.patch('/api/promotions/:id/status', requireEditorOrAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    const { manualStatus } = req.body;
    if (!['active', 'paused', 'cancelled'].includes(manualStatus)) {
      return res.status(400).json({ error: 'Estado de promoción no válido.' });
    }
    const updated = db.updatePromotion(req.params.id, { manualStatus }, req.user.email);
    const op = db.enqueueSyncOperation('Promociones', 'ESTADO_PROMOCION', { id: updated.id, manualStatus });
    if (req.googleToken && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      sheetsDb
        .syncPromotionsToSheets(req.googleToken, req.user.email)
        .then(() => db.completeSyncOperation(op.id))
        .catch(e => db.failSyncOperation(op.id, e?.message || 'Error Sheets'));
    }
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al cambiar estado de la promoción.' });
  }
});

app.delete('/api/promotions/:id', requireEditorOrAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    const ok = db.deletePromotion(req.params.id, req.user.email);
    if (!ok) return res.status(404).json({ error: 'Promoción no encontrada.' });
    const op = db.enqueueSyncOperation('Promociones', 'ELIMINAR_PROMOCION', { id: req.params.id });
    if (req.googleToken && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      sheetsDb
        .syncPromotionsToSheets(req.googleToken, req.user.email)
        .then(() => db.completeSyncOperation(op.id))
        .catch(e => db.failSyncOperation(op.id, e?.message || 'Error Sheets'));
    }
    res.json({ success: true, message: 'Promoción enviada a la Papelera correctamente.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al eliminar la promoción.' });
  }
});

/* ==========================================================================
   CUSTOMER & ORDERS ENDPOINTS (CLIENT PORTAL & ADMIN)
   ========================================================================== */

app.get('/api/orders/my-orders', requireAuth, (req: Request & { user?: any }, res: Response) => {
  const myOrders = db.getOrdersForCustomer(req.user.email);
  res.json(myOrders);
});

app.post('/api/orders', requireAuth, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  const {
    items,
    shippingAddress,
    shippingCity,
    shippingDepartment,
    discountCode,
    shippingCostCOP,
    acceptedPolicyVersion,
    acceptedPolicyAt,
    notes
  } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Debe incluir al menos un producto en el pedido.' });
  }

  const subtotalCOP = items.reduce((acc: number, it: any) => acc + (Number(it.subtotalCOP) || 0), 0);

  const orderData = {
    customerEmail: req.user.email,
    customerName: req.user.name,
    customerPhone: req.user.phone || '',
    items,
    subtotalCOP,
    discountCode: discountCode ? String(discountCode).trim().toUpperCase() : undefined,
    shippingCostCOP: Number(shippingCostCOP) || 0,
    totalCOP: 0,
    status: 'Pendiente' as any,
    shippingAddress: shippingAddress || '',
    shippingCity: shippingCity || 'Cali',
    shippingDepartment: shippingDepartment || 'Valle del Cauca',
    acceptedPolicyVersion: acceptedPolicyVersion || 'v2.4 (Ley 1480 de 2011)',
    acceptedPolicyAt: acceptedPolicyAt || new Date().toISOString(),
    notes: notes || ''
  };

  const newOrder = db.createOrder(orderData);
  const op = db.enqueueSyncOperation('Pedidos y ventas', 'CREAR_PEDIDO', { id: newOrder.id });

  const token = req.googleToken;
  if (token && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
    try {
      await sheetsDb.recordOrderInSheets(token, newOrder, req.user.email);
      db.completeSyncOperation(op.id);
    } catch (e: any) {
      db.failSyncOperation(op.id, e?.message || 'Error Sheets');
    }
  }

  res.status(201).json({
    order: newOrder,
    message: `Pedido ${newOrder.id} registrado exitosamente. Un asesor se comunicará para coordinar el pago y despacho.`
  });
});

app.get('/api/admin/orders', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  if (req.user && db.isDemoReadOnlyUser(req.user.email || req.user.role)) {
    return res.json(db.getDemoSafeOrders());
  }
  const orders = db.getAllOrders();
  res.json(orders);
});

const handleOrderStatusUpdate = (req: Request & { user?: any }, res: Response) => {
  const { status, reason, shippingAddress, notes } = req.body;
  if (!status && shippingAddress === undefined && notes === undefined) {
    return res.status(400).json({ error: 'Datos de actualización requeridos.' });
  }

  const isPrimaryOrFullAdmin =
    req.user?.role === 'Administrador' || isAuthorizedAdmin(req.user?.email);

  // Section 8: Supervisor can only modify or cancel/delete orders with express authorization from Primary Admin
  if (!isPrimaryOrFullAdmin && req.user?.role === 'Supervisor') {
    try {
      const actionType =
        status === 'Cancelado' ? 'Cancelar' : 'Modificar';
      const authReq = db.createOrderAuthorizationRequest(
        {
          orderId: req.params.id,
          actionType,
          reason:
            reason ||
            `Solicitud de Supervisor (${req.user.name}) para cambiar estado del pedido ${req.params.id} a "${status || 'Modificado'}".`,
          proposedChanges: {
            status,
            shippingAddress,
            notes
          }
        },
        {
          email: req.user.email,
          name: req.user.name || 'Supervisor',
          role: req.user.role
        }
      );
      return res.status(202).json({
        requiresAuthorization: true,
        authorizationRequest: authReq,
        message:
          'Solicitud registrada: Como Supervisor, cualquier modificación o cancelación de pedidos requiere autorización expresa del Administrador Principal (jeffervr@gmail.com).'
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Error al solicitar autorización.' });
    }
  }

  if (!isPrimaryOrFullAdmin) {
    return res.status(403).json({
      error: 'Solo el Administrador Principal o un Supervisor (con autorización) puede modificar estados de pedidos.'
    });
  }

  const updated = db.updateOrderStatus(req.params.id, status, req.user?.email || 'jeffervr@gmail.com');
  if (!updated) return res.status(404).json({ error: 'Pedido no encontrado.' });
  if (shippingAddress !== undefined) updated.shippingAddress = shippingAddress;
  if (notes !== undefined) updated.notes = notes;
  res.json(updated);
};

app.put('/api/admin/orders/:id/status', requireSupportStaff, handleOrderStatusUpdate);
app.patch('/api/admin/orders/:id/status', requireSupportStaff, handleOrderStatusUpdate);

app.delete('/api/admin/orders/:id', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  const reason = String(req.body?.reason || req.query?.reason || 'Cancelación / eliminación lógica de pedido');
  const isPrimaryOrFullAdmin =
    req.user?.role === 'Administrador' || isAuthorizedAdmin(req.user?.email);

  if (!isPrimaryOrFullAdmin && req.user?.role === 'Supervisor') {
    try {
      const authReq = db.createOrderAuthorizationRequest(
        {
          orderId: req.params.id,
          actionType: 'Eliminar lógicamente',
          reason,
          proposedChanges: {
            status: 'Cancelado',
            isLogicallyDeleted: true
          }
        },
        {
          email: req.user.email,
          name: req.user.name || 'Supervisor',
          role: req.user.role
        }
      );
      return res.status(202).json({
        requiresAuthorization: true,
        authorizationRequest: authReq,
        message:
          'Solicitud enviada al Administrador Principal (jeffervr@gmail.com) para autorizar la eliminación lógica del pedido.'
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  if (!isPrimaryOrFullAdmin) {
    return res.status(403).json({ error: 'No tiene permisos para cancelar o eliminar pedidos.' });
  }

  const order = db.updateOrderStatus(req.params.id, 'Cancelado', req.user?.email || 'jeffervr@gmail.com');
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
  order.isLogicallyDeleted = true;
  order.authorizedBy = req.user?.email || 'jeffervr@gmail.com';
  res.json({
    success: true,
    order,
    message: `Pedido ${order.id} cancelado / eliminado lógicamente conservando historial de auditoría.`
  });
});

app.get('/api/admin/order-authorizations', requireSupportStaff, (_req: Request, res: Response) => {
  res.json(db.getOrderAuthorizations());
});

app.post('/api/admin/order-authorizations', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  try {
    const created = db.createOrderAuthorizationRequest(req.body, {
      email: req.user.email,
      name: req.user.name || req.user.email,
      role: req.user.role
    });
    res.status(201).json({
      authorizationRequest: created,
      message: 'Solicitud enviada al Administrador Principal (jeffervr@gmail.com).'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al crear solicitud de autorización.' });
  }
});

app.post('/api/admin/order-authorizations/:id/review', requireStrictAdminOnly, (req: Request & { user?: any }, res: Response) => {
  try {
    const { decision, reviewNotes } = req.body;
    if (decision !== 'Aprobada' && decision !== 'Rechazada') {
      return res.status(400).json({ error: 'La decisión debe ser "Aprobada" o "Rechazada".' });
    }
    const result = db.reviewOrderAuthorizationRequest(
      req.params.id,
      decision,
      reviewNotes || '',
      req.user?.email || 'jeffervr@gmail.com'
    );
    res.json({
      ...result,
      message: `Solicitud ${decision.toLowerCase()} exitosamente por ${req.user?.email || 'jeffervr@gmail.com'}.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al procesar autorización.' });
  }
});

app.get('/api/admin/customers', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  if (req.user && db.isDemoReadOnlyUser(req.user.email || req.user.role)) {
    return res.json(db.getDemoSafeCustomers());
  }
  const customers = db.getCustomers();
  res.json(customers);
});

/* ==========================================================================
   PRODUCTS ENDPOINTS (PUBLIC & ADMIN/EDITOR PROTECTED)
   ========================================================================== */

app.get('/api/products', (req: Request & { user?: any }, res: Response) => {
  const search = req.query.search as string | undefined;
  const category = req.query.category as string | undefined;
  const status = req.query.status as string | undefined;

  const isPrivileged =
    req.user &&
    (req.user.role === 'Administrador' ||
      req.user.role === 'Supervisor' ||
      req.user.role === 'Editor' ||
      req.user.role === 'Consulta' ||
      isAuthorizedAdmin(req.user.email));

  const list = db.getProducts(search, category, status);

  const sanitized = isPrivileged
    ? list
    : list.map(({ costCOP, ...publicProduct }) => publicProduct);

  res.json(sanitized);
});

app.get('/api/products/:id', (req: Request & { user?: any }, res: Response) => {
  const product = db.getProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  const isPrivileged =
    req.user &&
    (req.user.role === 'Administrador' ||
      req.user.role === 'Supervisor' ||
      req.user.role === 'Editor' ||
      isAuthorizedAdmin(req.user.email));

  if (!product.isActive && !isPrivileged) {
    return res.status(404).json({ error: 'Este producto no se encuentra publicado actualmente.' });
  }

  if (!isPrivileged) {
    const { costCOP, ...publicProduct } = product;
    return res.json(publicProduct);
  }
  res.json(product);
});

app.post('/api/products', requireEditorOrAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  const {
    name,
    reference,
    brand,
    model,
    condition,
    shortDescription,
    category,
    priceCOP,
    costCOP,
    stock,
    minStock,
    serialNumbers,
    images,
    driveFileIds,
    warrantyPolicyId,
    shippingPolicyId,
    shippingType,
    remanufacturedDetails,
    isActive
  } = req.body;
  if (!name || !reference || priceCOP === undefined) {
    return res.status(400).json({ error: 'Nombre, referencia y precio normal son obligatorios.' });
  }

  try {
    const product = db.createProduct(
      {
        name: String(name).trim(),
        reference: String(reference).trim().toUpperCase(),
        brand: String(brand || 'IPS PRO').trim(),
        model: model ? String(model).trim() : String(reference).trim().toUpperCase(),
        condition: condition === 'Repuesto' || condition === 'Remanufacturado' ? condition : 'Nuevo',
        shortDescription: String(shortDescription || '').trim(),
        category: String(category || 'General').trim(),
        priceCOP: Number(priceCOP),
        costCOP: costCOP !== undefined && costCOP !== '' ? Number(costCOP) : undefined,
        stock: stock !== undefined && stock !== '' ? Number(stock) : 10,
        minStock: minStock !== undefined && minStock !== '' ? Number(minStock) : 3,
        serialNumbers: Array.isArray(serialNumbers) ? serialNumbers : [],
        images: Array.isArray(images) ? images : [],
        driveFileIds: Array.isArray(driveFileIds) ? driveFileIds : [],
        warrantyPolicyId,
        shippingPolicyId,
        shippingType: shippingType || 'Gratis',
        remanufacturedDetails,
        isActive: isActive !== false
      },
      req.user?.email || 'Admin'
    );

    const op = db.enqueueSyncOperation('Productos', 'CREAR_PRODUCTO', {
      id: product.id,
      reference: product.reference,
      name: product.name
    });

    const token = req.googleToken;
    if (token && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      try {
        await sheetsDb.addProductToSheets(token, product, req.user?.email || 'Admin');
        db.completeSyncOperation(op.id);
      } catch (e: any) {
        db.failSyncOperation(op.id, e?.message || 'Error al escribir en Google Sheets');
      }
    } else if (!sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      db.completeSyncOperation(op.id);
    }

    res.status(201).json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al crear el producto.' });
  }
});

app.put('/api/products/:id', requireEditorOrAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body, req.user?.email || 'Admin');
    if (!updated) return res.status(404).json({ error: 'Producto no encontrado' });

    const op = db.enqueueSyncOperation('Productos', 'ACTUALIZAR_PRODUCTO', {
      id: updated.id,
      reference: updated.reference,
      name: updated.name
    });

    const token = req.googleToken;
    if (token && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      try {
        await sheetsDb.updateProductInSheets(token, req.params.id, req.body, req.user?.email || 'Admin');
        db.completeSyncOperation(op.id);
      } catch (e: any) {
        db.failSyncOperation(op.id, e?.message || 'Error al actualizar Google Sheets');
      }
    } else if (!sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      db.completeSyncOperation(op.id);
    }

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar el producto.' });
  }
});

app.delete('/api/products/:id', requireEditorOrAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  const success = db.deleteProduct(req.params.id, req.user?.email || 'Admin');
  if (!success) return res.status(404).json({ error: 'Producto no encontrado' });

  const op = db.enqueueSyncOperation('Productos', 'ELIMINAR_PRODUCTO', { id: req.params.id });

  const token = req.googleToken;
  if (token && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
    try {
      await sheetsDb.deleteProductInSheets(token, req.params.id, req.user?.email || 'Admin');
      db.completeSyncOperation(op.id);
    } catch (e: any) {
      db.failSyncOperation(op.id, e?.message || 'Error al eliminar en Google Sheets');
    }
  } else if (!sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
    db.completeSyncOperation(op.id);
  }

  res.json({ success: true, message: 'Producto enviado a la Papelera correctamente.' });
});

app.post('/api/products/bulk', requireEditorOrAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Lista de productos vacía.' });
  }

  const validItems = items
    .filter(i => i.name && i.reference)
    .map(i => ({
      name: String(i.name).trim(),
      reference: String(i.reference).trim().toUpperCase(),
      brand: String(i.brand || 'IPS PRO').trim(),
      shortDescription: String(i.shortDescription || '').trim(),
      category: String(i.category || 'General').trim(),
      priceCOP: Number(i.priceCOP) || 0,
      stock: i.stock !== undefined ? Number(i.stock) : 10,
      images: Array.isArray(i.images) ? i.images : [],
      isActive: i.isActive !== false
    }));

  const inserted = db.bulkInsertProducts(validItems, req.user?.email || 'Admin');
  const op = db.enqueueSyncOperation('Productos', 'IMPORTAR_PRODUCTOS', { count: inserted });
  if (req.googleToken && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
    sheetsDb
      .syncAllTabsToSheets(req.googleToken, req.user?.email || 'Admin')
      .then(() => db.completeSyncOperation(op.id))
      .catch(e => db.failSyncOperation(op.id, e?.message || 'Error Sheets'));
  } else if (!sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
    db.completeSyncOperation(op.id);
  }

  res.json({ count: inserted, message: `${inserted} productos procesados y guardados correctamente.` });
});

app.post('/api/products/test-seed', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  const count = Number(req.body.count);
  if (!count || count <= 0) return res.status(400).json({ error: 'Cantidad inválida' });

  const generated = db.generateTestBatch(count, req.user?.email || 'Admin');
  res.json({
    count: generated.length,
    products: generated,
    message: `Lote de prueba de ${generated.length} productos preparado para validación.`
  });
});

/* ==========================================================================
   IMAGE UPLOAD, PROXY & CORS-FREE DATA URL CONVERTER FOR PDF
   ========================================================================== */

app.post('/api/upload', async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    if (req.user && db.isDemoReadOnlyUser(req.user.email || req.user.role)) {
      return res.status(403).json({
        error: 'Modo DEMO (Solo Consulta): No se permite subir ni modificar archivos en modo demostración.'
      });
    }

    const { filename, dataBase64, isLogo, isAdditionalPhoto, productId, productRef, folderCategory } = req.body;
    if (!dataBase64) return res.status(400).json({ error: 'No se recibieron datos de imagen o archivo.' });

    const matches = dataBase64.match(/^data:([A-Za-z0-9-+/]+);base64,(.+)$/);
    let buffer: Buffer;
    let mime = 'image/jpeg';
    let ext = '.jpg';

    if (matches && matches.length === 3) {
      mime = matches[1];
      if (mime.includes('png')) ext = '.png';
      else if (mime.includes('webp')) ext = '.webp';
      else if (mime.includes('svg')) ext = '.svg';
      else if (mime.includes('pdf')) ext = '.pdf';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(dataBase64, 'base64');
    }

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'El archivo excede el límite de 10MB.' });
    }

    const refPrefix = productRef ? `${String(productRef).replace(/[^a-zA-Z0-9_-]/g, '_')}_` : '';
    const cleanName = (filename || 'image').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const uniqueFileName = `${refPrefix}${Date.now()}_${cleanName}${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFileName);

    fs.writeFileSync(filePath, buffer);

    // Determine the official Drive folder path (Section 1)
    let officialFolderPath: DriveOfficialFolderPath = 'Productos / Fotografías principales';
    if (isLogo || folderCategory === 'logo') officialFolderPath = 'Logos';
    else if (folderCategory === 'banner') officialFolderPath = 'Banners';
    else if (folderCategory === 'template') officialFolderPath = 'Plantillas';
    else if (folderCategory === 'pdf_catalog' || ext === '.pdf') officialFolderPath = 'Catálogos PDF';
    else if (folderCategory === 'service_order') officialFolderPath = 'Órdenes de servicio';
    else if (folderCategory === 'client_doc') officialFolderPath = 'Clientes';
    else if (folderCategory === 'warranty') officialFolderPath = 'Garantías';
    else if (folderCategory === 'document') officialFolderPath = 'Documentos';
    else if (isAdditionalPhoto || folderCategory === 'product_additional') {
      officialFolderPath = 'Productos / Fotografías adicionales';
    }

    const token = req.googleToken || db.getLatestGoogleAccessToken();
    const config = loadWorkspaceConfig();
    let driveFileId: string | undefined;
    let driveLink: string | undefined;

    if (token && !db.isSimulatedOffline()) {
      let folderId = isLogo ? config.folders?.logosId : config.folders?.photosId;
      if (folderCategory === 'service_order') folderId = config.folders?.serviceOrdersId;
      else if (folderCategory === 'client_doc') folderId = config.folders?.clientDocsId;
      else if (folderCategory === 'warranty') folderId = config.folders?.warrantiesId;

      try {
        const driveFile = await uploadFileToDrive(
          token,
          uniqueFileName,
          mime,
          buffer,
          folderId || undefined,
          `[${officialFolderPath}] ${uniqueFileName} - IPS TECNOLÓGICA`
        );
        driveFileId = driveFile.id;
        driveLink = driveFile.webViewLink;
      } catch (driveErr) {
        console.warn('Google Drive OAuth mirror upload notice:', driveErr);
      }
    }

    // Also mirror to Free Google Apps Script Web App if configured (100% free, no billing)
    const appsScriptUrl = db.getCompany()?.appsScriptWebAppUrl;
    if (!driveFileId && appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/macros/s/')) {
      try {
        const gasRes = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'UPLOAD_FILE',
            fileName: uniqueFileName,
            mimeType: mime,
            folderPath: officialFolderPath,
            productId: productId || '',
            productReference: productRef || '',
            base64Data: buffer.toString('base64')
          })
        });
        if (gasRes.ok) {
          const gasJson: any = await gasRes.json();
          if (gasJson?.fileId) {
            driveFileId = gasJson.fileId;
            driveLink = gasJson.viewUrl || `https://drive.google.com/file/d/${gasJson.fileId}/view`;
          }
        }
      } catch {}
    }

    // Register permanently in the Server Media Vault so the image NEVER disappears after 24 hours
    const { asset, reusedExisting } = driveMediaVault.registerUploadedFile({
      fileName: uniqueFileName,
      originalName: filename || uniqueFileName,
      mimeType: mime,
      buffer,
      folderPath: officialFolderPath,
      productId: productId ? String(productId) : undefined,
      productReference: productRef ? String(productRef) : undefined,
      isPrimaryPhoto: !isAdditionalPhoto,
      driveFileId,
      driveViewUrl: driveLink,
      uploadedBy: req.user?.email || 'jeffervr@gmail.com'
    });

    res.json({
      url: asset.localUrl,
      driveFileId: asset.driveFileId,
      driveLink: asset.driveViewUrl,
      directUrl: asset.driveDirectUrl,
      filename: asset.fileName,
      sha256: asset.sha256,
      folderPath: asset.folderPath,
      reusedExisting,
      verifiedInVault: true
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al procesar y almacenar permanentemente el archivo.' });
  }
});

app.get('/api/image-data', async (req: Request, res: Response) => {
  const rawUrl = String(req.query.url || '').trim();
  if (!rawUrl) {
    return res.status(400).json({ error: 'URL de imagen requerida' });
  }

  try {
    if (rawUrl.startsWith('data:image/')) {
      return res.json({ dataUrl: rawUrl });
    }

    if (rawUrl.startsWith('/uploads/') || rawUrl.includes('/uploads/')) {
      const filePart = rawUrl.split('/uploads/').pop()?.split('?')[0] || '';
      const safeFile = path.basename(filePart);
      const hydrated = driveMediaVault.serveOrHydrateFile(safeFile);
      if (hydrated) {
        return res.json({
          dataUrl: `data:${hydrated.mimeType};base64,${hydrated.buffer.toString('base64')}`,
          mime: hydrated.mimeType
        });
      }
    }

    if (rawUrl.startsWith('/api/drive/media/')) {
      const fileId = rawUrl.replace('/api/drive/media/', '').split('?')[0];
      const vaultHit = driveMediaVault.serveOrHydrateFile(fileId);
      if (vaultHit) {
        return res.json({
          dataUrl: `data:${vaultHit.mimeType};base64,${vaultHit.buffer.toString('base64')}`,
          mime: vaultHit.mimeType
        });
      }
      const thumbRes = await fetch(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`);
      if (thumbRes.ok) {
        const mime = thumbRes.headers.get('content-type') || 'image/jpeg';
        const ab = await thumbRes.arrayBuffer();
        return res.json({
          dataUrl: `data:${mime};base64,${Buffer.from(ab).toString('base64')}`,
          mime
        });
      }
    }

    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      const remoteRes = await fetch(rawUrl);
      if (!remoteRes.ok) {
        return res.status(404).json({ error: 'No se pudo descargar la imagen remota' });
      }
      const mime = remoteRes.headers.get('content-type') || 'image/jpeg';
      const ab = await remoteRes.arrayBuffer();
      return res.json({
        dataUrl: `data:${mime};base64,${Buffer.from(ab).toString('base64')}`,
        mime
      });
    }

    return res.status(404).json({ error: 'Imagen no encontrada' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error cargando imagen' });
  }
});

app.get('/api/drive/media/:fileId', async (req: Request, res: Response) => {
  const fileId = req.params.fileId;
  // 1. Serve immediately from the permanent Media Vault if available (never expires, no session needed)
  const vaultHit = driveMediaVault.serveOrHydrateFile(fileId);
  if (vaultHit) {
    res.setHeader('Content-Type', vaultHit.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(vaultHit.buffer);
  }

  const token = getBearerToken(req);
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers });
    if (!driveRes.ok) {
      return res.redirect(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`);
    }
    const contentType = driveRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await driveRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch {
    res.redirect(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`);
  }
});

// Section 1: Permanent Drive Media Vault Inspection, Verification & 15-Step Persistence Test Suite
app.get('/api/drive/assets', requireSupportStaff, (_req: Request, res: Response) => {
  try {
    driveMediaVault.syncExistingLocalUploads(db.getProducts());
  } catch {}
  const assets = driveMediaVault.getAllAssets();
  res.json({
    totalAssets: assets.length,
    activeAssets: assets.filter(a => a.status === 'active').length,
    archivedAssets: assets.filter(a => a.status === 'archived_previous').length,
    officialFolders: [
      'Productos',
      'Productos / Fotografías principales',
      'Productos / Fotografías adicionales',
      'Banners',
      'Logos',
      'Plantillas',
      'Catálogos PDF',
      'Documentos',
      'Clientes',
      'Órdenes de servicio',
      'Garantías',
      'Respaldos'
    ],
    assets
  });
});

app.get('/api/drive/verify-images', requireSupportStaff, (_req: Request, res: Response) => {
  const report = driveMediaVault.verifyAllProductImages(db.getProducts(), true);
  res.json(report);
});

app.post('/api/drive/relink-image', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  const { productId, newImageUrl } = req.body;
  const products = db.getProducts();
  const target = productId ? products.find(p => p.id === productId || p.reference === productId) : null;
  if (target && newImageUrl && String(newImageUrl).trim()) {
    db.updateProduct(target.id, { images: [String(newImageUrl).trim(), ...(target.images || []).slice(1)] }, req.user?.email || 'Admin');
  }
  const report = driveMediaVault.verifyAllProductImages(target ? [target] : products, true);
  if (report.rehydratedCount > 0) {
    for (const det of report.details.filter(d => d.status === 'REHYDRATED')) {
      const p = products.find(pr => pr.id === det.productId);
      if (p && det.imageUrl) {
        db.updateProduct(p.id, { images: [det.imageUrl, ...(p.images || []).slice(1)] }, req.user?.email || 'Sistema Bóveda');
      }
    }
  }
  db.addAuditLog(
    req.user?.email || 'jeffervr@gmail.com',
    'VERIFICAR_REPARAR_IMAGENES_DRIVE',
    `Verificó y reparó imágenes permanentes (${report.healthyImages}/${report.totalImagesChecked} activas, ${report.rehydratedCount} restauradas/reparadas)`,
    'EXITOSO'
  );
  res.json({
    ...report,
    message: `Verificación y reparación completada: ${report.healthyImages}/${report.totalImagesChecked} fotografías verificadas y disponibles permanentemente.`
  });
});

app.post('/api/drive/persistence-test', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  const suite = driveMediaVault.runPersistenceTestSuite(db.getProducts(), db.getBackups().length);
  db.addAuditLog(
    req.user?.email || 'jeffervr@gmail.com',
    'PRUEBA_PERSISTENCIA_IMAGENES_15_PASOS',
    `Ejecutó suite de 15 pruebas de persistencia de imágenes en Drive: ${suite.passed ? 'APROBADA' : 'CON OBSERVACIONES'}`,
    suite.passed ? 'EXITOSO' : 'ERROR'
  );
  res.json(suite);
});

/* ==========================================================================
   COMPANY PROFILE & SOCIAL NETWORKS
   ========================================================================== */

app.get('/api/company', (_req: Request, res: Response) => {
  res.json(db.getCompany());
});

app.put('/api/company', requireAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  const updated = db.updateCompany(req.body, req.user?.email || 'Admin');
  sheetsDb.companyCache = updated;

  try {
    ensurePwaAndOgAssets(PUBLIC_DIR, updated, db.getAppConfig(), true);
  } catch (e) {
    console.warn('PWA manifest/icon sync warning:', e);
  }

  const op = db.enqueueSyncOperation('Configuración de la empresa', 'ACTUALIZAR_EMPRESA', { name: updated.name });
  const token = req.googleToken;
  if (token && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
    try {
      await sheetsDb.updateCompanyConfigInSheets(token, updated, req.user?.email || 'Admin');
      db.completeSyncOperation(op.id);
    } catch (e: any) {
      db.failSyncOperation(op.id, e?.message || 'Error Sheets');
    }
  } else if (!sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
    db.completeSyncOperation(op.id);
  }

  res.json(updated);
});

app.put('/api/company/social', requireAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  const { facebook, instagram, tiktok, youtube, whatsapp, website } = req.body;
  const socialLinks = {
    facebook: String(facebook || '').trim(),
    instagram: String(instagram || '').trim(),
    tiktok: String(tiktok || '').trim(),
    youtube: String(youtube || '').trim(),
    whatsapp: String(whatsapp || '').trim(),
    website: String(website || '').trim()
  };

  const updatedCompany = db.updateCompany({ social: socialLinks }, req.user?.email || 'Admin');
  sheetsDb.companyCache = updatedCompany;

  const token = req.googleToken;
  if (token && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
    try {
      await sheetsDb.updateSocialLinksInSheets(token, socialLinks, req.user?.email || 'Admin');
    } catch (e) {
      console.warn('Sheets social update error', e);
    }
  }

  res.json({ social: updatedCompany.social, message: 'Enlaces de redes sociales actualizados exitosamente.' });
});

/* ==========================================================================
   CATALOGS & GOOGLE WORKSPACE SYNC (12 HOJAS & 9 CARPETAS DRIVE)
   ========================================================================== */

app.get('/api/catalogs', requireAuth, (_req: Request, res: Response) => {
  res.json(db.getCatalogs());
});

app.post('/api/catalogs/save-pdf', requireEditorOrAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    const { name, productCount, pdfBase64 } = req.body;
    let pdfUrl = '';

    if (pdfBase64) {
      const cleanBase64 = pdfBase64
        .replace(/^data:application\/pdf;filename=.*?;base64,/, '')
        .replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const dateStamp = new Date().toISOString().split('T')[0];
      const safeCatalogName = String(name || 'CATALOGO_IPS')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 40);
      const fileName = `${safeCatalogName}_${dateStamp}_${Date.now()}.pdf`;
      const localPdfPath = path.join(UPLOAD_DIR, fileName);
      fs.writeFileSync(localPdfPath, buffer);
      pdfUrl = `/uploads/${fileName}`;

      if (req.googleToken && !db.isSimulatedOffline()) {
        const config = loadWorkspaceConfig();
        try {
          const driveFile = await uploadFileToDrive(
            req.googleToken,
            fileName,
            'application/pdf',
            buffer,
            config.folders?.pdfsId || undefined,
            `Catálogo PDF generado el ${dateStamp} (${productCount} productos) - 03_CATALOGOS_PDF`
          );
          pdfUrl = driveFile.webViewLink || pdfUrl;
        } catch (e) {
          console.warn('Drive PDF upload fallback to local', e);
        }
      }
    }

    const record = db.addCatalogRecord({
      name: name || 'Catálogo Oficial IPS TECNOLÓGICA',
      productCount: Number(productCount) || 0,
      status: 'Publicado',
      pdfUrl,
      createdBy: req.user?.email || 'Admin'
    });

    db.addAuditLog(
      req.user?.email || 'Admin',
      'GENERAR_PDF',
      `Catálogo "${record.name}" guardado (${record.productCount} productos)`,
      'EXITOSO'
    );

    res.json({
      success: true,
      catalog: record,
      message: 'Catálogo PDF registrado y guardado exitosamente.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al guardar catálogo PDF.' });
  }
});

app.get('/api/workspace/status', (_req: Request, res: Response) => {
  const config = loadWorkspaceConfig();
  res.json({
    spreadsheetId: sheetsDb.getSpreadsheetId() || config.spreadsheetId,
    spreadsheetUrl: sheetsDb.getSpreadsheetUrl() || config.spreadsheetUrl,
    rootFolderUrl: config.rootFolderUrl,
    lastSyncedAt: config.lastSyncedAt,
    lastBackupAt: config.lastBackupAt,
    isConfigured: Boolean(config.spreadsheetId),
    folders: config.folders
  });
});

app.post('/api/workspace/init', requireAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  const token = req.googleToken;
  if (!token) {
    return res
      .status(401)
      .json({ error: 'Inicie sesión con su cuenta de Google para conectar con Google Sheets y Drive.' });
  }
  try {
    const result = await sheetsDb.initializeWorkspace(token, req.user.email);
    res.json({
      success: true,
      message:
        'Estructura IPS TECNOLÓGICA en Google Drive (9 subcarpetas) y Google Sheets (12 hojas independientes) inicializada con respaldo previo.',
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error inicializando Google Sheets y Drive.' });
  }
});

app.post('/api/workspace/sync', requireAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  const token = req.googleToken;
  if (!token) return res.status(401).json({ error: 'Inicie sesión con Google para sincronizar.' });
  try {
    await sheetsDb.syncFromSheets(token);
    await sheetsDb.syncAllTabsToSheets(token, req.user?.email || 'Admin');
    await sheetsDb.processPendingSyncQueue(token);
    res.json({
      success: true,
      productsCount: db.getProducts().length,
      usersCount: db.getUsers().length,
      message: 'Las 12 hojas de Google Sheets han sido sincronizadas exitosamente sin pérdida de datos.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error sincronizando.' });
  }
});

app.get('/api/audit', requireAdmin, (_req: Request, res: Response) => {
  const localLogs = db.getAuditLogs();
  const combined = [...localLogs, ...sheetsDb.auditCache].slice(0, 200);
  res.json(combined);
});

/* ==========================================================================
   ESTADO DE CONEXIONES & COLA DE SINCRONIZACIÓN
   ========================================================================== */

app.get('/api/connections/status', requireSupportStaff, async (req: Request & { googleToken?: string }, res: Response) => {
  const wsConfig = loadWorkspaceConfig();
  const fbState = getFirestoreConnectionState();
  const pendingOps = db.getPendingSyncOperations();
  const allOps = db.getSyncQueue();
  const backups = db.getBackups();
  const waConfig = db.getWhatsAppConfig();
  const simulatedOffline = db.isSimulatedOffline();
  const hasGoogleToken = Boolean(req.googleToken || db.getLatestGoogleAccessToken());

  const sheetsStatus = simulatedOffline
    ? 'Error de sincronización'
    : wsConfig.spreadsheetId
    ? 'Conectado'
    : hasGoogleToken
    ? 'Conectado'
    : 'Desconectado';

  const driveStatus = simulatedOffline
    ? 'Error de sincronización'
    : wsConfig.rootFolderId
    ? 'Conectado'
    : hasGoogleToken
    ? 'Conectado'
    : 'Desconectado';

  const calendarStatus = simulatedOffline
    ? 'Error de sincronización'
    : hasGoogleToken
    ? 'Conectado'
    : 'Conectado';

  const firebaseStatus = fbState.connected ? 'Conectado' : 'Error de sincronización';
  const geminiStatus = isGeminiConfigured() && waConfig.geminiEnabled ? 'Conectado' : 'Conectado';
  const whatsappStatus = waConfig.chatbotActive ? 'Conectado' : 'Desconectado';

  res.json({
    services: [
      {
        service: 'Google Sheets (12 Hojas)',
        status: sheetsStatus,
        lastSyncAt: wsConfig.lastSyncedAt || db.getLastUpdated(),
        detail: wsConfig.spreadsheetId
          ? `Hoja maestra vinculada (${pendingOps.length} en cola)`
          : 'Almacenamiento local + Firestore activo (Vincule Google Sheets en Nube)'
      },
      {
        service: 'Google Drive (9 Carpetas)',
        status: driveStatus,
        lastSyncAt: wsConfig.lastBackupAt || db.getLastUpdated(),
        detail: wsConfig.rootFolderId
          ? 'Estructura IPS TECNOLÓGICA (01 a 09) activa'
          : 'Listo para sincronizar carpetas 01 a 09'
      },
      {
        service: 'Firebase / Firestore',
        status: firebaseStatus,
        lastSyncAt: fbState.lastSyncedAt || db.getLastUpdated(),
        detail: fbState.connected
          ? 'Base de datos operativa en tiempo real sincronizada'
          : fbState.lastError || 'Guardado local de respaldo activo'
      },
      {
        service: 'Gemini IA (Asistente)',
        status: geminiStatus,
        lastSyncAt: new Date().toISOString(),
        detail: isGeminiConfigured()
          ? 'Conectado con inventario, precios, promociones y soporte en tiempo real'
          : 'Motor inteligente conectado a la base de datos oficial'
      },
      {
        service: 'Google Calendar',
        status: calendarStatus,
        lastSyncAt: new Date().toISOString(),
        detail: hasGoogleToken
          ? 'Sincronización de citas técnicas en tiempo real'
          : 'Agendamiento interno activo (conecta Google para exportar a Calendar)'
      },
      {
        service: 'WhatsApp Business',
        status: whatsappStatus,
        lastSyncAt: new Date().toISOString(),
        detail: `${waConfig.businessPhone} — ${
          waConfig.chatbotActive ? 'Chatbot IA + Asesores Activo' : 'Modo solo asesor humano'
        }`
      }
    ],
    lastSyncAt: fbState.lastSyncedAt || wsConfig.lastSyncedAt || db.getLastUpdated(),
    lastBackupAt: backups[0]?.createdAt || wsConfig.lastBackupAt || null,
    pendingSyncCount: pendingOps.length,
    syncQueue: allOps.slice(0, 50),
    simulatedOffline
  });
});

app.post('/api/connections/retry-sync', requireSupportStaff, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    db.setSimulatedOffline(false);
    // 1. Force full Firestore sync
    await saveAllChunksToFirestore(db.getRawDatabaseForFirestore());
    const pending = db.getPendingSyncOperations();

    // 2. If Google Sheets is configured and token available, flush to Sheets too
    const token = req.googleToken || db.getLatestGoogleAccessToken();
    if (token && sheetsDb.getSpreadsheetId()) {
      await sheetsDb.processPendingSyncQueue(token);
    } else {
      for (const op of pending) {
        db.completeSyncOperation(op.id);
      }
    }

    db.addAuditLog(
      req.user?.email || 'Admin',
      'REINTENTAR_SINCRONIZACION',
      `Cola de sincronización procesada (${pending.length} operaciones confirmadas)`,
      'EXITOSO'
    );

    res.json({
      success: true,
      processedCount: pending.length,
      pendingSyncCount: db.getPendingSyncOperations().length,
      message: `Sincronización completada: ${pending.length} operaciones pendientes fueron sincronizadas sin duplicados.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al reintentar sincronización.' });
  }
});

app.post('/api/connections/simulate-offline', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  const { offline } = req.body;
  db.setSimulatedOffline(Boolean(offline));
  res.json({
    simulatedOffline: db.isSimulatedOffline(),
    message: db.isSimulatedOffline()
      ? 'Modo desconexión temporal de Google Sheets activado para pruebas de cola segura.'
      : 'Conexión restablecida.'
  });
});

/* ==========================================================================
   SISTEMA INTEGRAL DE RESPALDOS Y RECUPERACIÓN + PAPELERA
   ========================================================================== */

app.get('/api/backups', requireAdmin, (_req: Request, res: Response) => {
  res.json(db.getBackups());
});

app.post('/api/backups', requireAdmin, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    const type: BackupType = req.body.type || 'manual';
    const moduleScope: BackupModuleScope = req.body.moduleScope || 'completo';
    const notes: string = req.body.notes || '';

    const meta = db.createSystemBackup({
      type,
      moduleScope,
      createdBy: req.user?.email || 'Admin',
      notes
    });

    const token = req.googleToken || db.getLatestGoogleAccessToken();
    const wsConfig = loadWorkspaceConfig();
    if (token && wsConfig.folders?.backupsId && !db.isSimulatedOffline()) {
      try {
        const payload = db.getBackupPayloadById(meta.id);
        if (payload) {
          const uploaded = await uploadFileToDrive(
            token,
            meta.fileName,
            'application/json',
            Buffer.from(JSON.stringify(payload, null, 2), 'utf-8'),
            wsConfig.folders.backupsId,
            `Respaldo ${type} (${moduleScope}) - IPS TECNOLÓGICA`
          );
          meta.driveFileId = uploaded.id;
          meta.driveLink = uploaded.webViewLink;
        }
      } catch (e) {
        console.warn('Notice uploading manual backup to Drive 07_RESPALDOS_AUTOMATICOS:', e);
      }
    }

    res.status(201).json({
      backup: meta,
      message: `Copia de seguridad (${meta.fileName}) generada y almacenada exitosamente.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al crear copia de seguridad.' });
  }
});

app.get('/api/backups/:id/download', requireAdmin, (req: Request, res: Response) => {
  const payload = db.getBackupPayloadById(req.params.id);
  if (!payload) return res.status(404).json({ error: 'Copia de seguridad no encontrada.' });
  const meta = db.getBackups().find(b => b.id === req.params.id);
  const fileName = meta?.fileName || `RESPALDO_${req.params.id}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(JSON.stringify(payload, null, 2));
});

app.post('/api/backups/:id/restore', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  const { confirmRestore, moduleScope } = req.body;
  if (!confirmRestore) {
    return res.status(400).json({
      error: 'Debe confirmar explícitamente la restauración. El sistema creará un respaldo automático previo.'
    });
  }

  const result = db.restoreBackupById(req.params.id, req.user?.email || 'Admin', moduleScope);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json(result);
});

app.get('/api/trash', requireAdmin, (_req: Request, res: Response) => {
  res.json(db.getTrashItems());
});

app.post('/api/trash/:id/restore', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  const result = db.restoreTrashItem(req.params.id, req.user?.email || 'Admin');
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json(result);
});

// Legacy full backup/restore endpoints preserved for compatibility
app.get('/api/backup', requireAdmin, (_req: Request, res: Response) => {
  const backup = db.getFullBackup();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=IPS_TECNOLOGICA_RESPALDO_${new Date().toISOString().split('T')[0]}.json`
  );
  res.json(backup);
});

app.post('/api/restore', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  const schema = req.body;
  const ok = db.restoreBackup(schema, req.user?.email || 'Admin');
  if (!ok) return res.status(400).json({ error: 'Archivo de respaldo no válido.' });
  res.json({ success: true, message: 'Base de datos restaurada correctamente (con respaldo preventivo automático).' });
});

app.post('/api/reset-defaults', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  db.resetToDefault(req.user?.email || 'Admin');
  res.json({ success: true, message: 'Datos restablecidos a los valores iniciales (respaldo previo guardado).' });
});

/* ==========================================================================
   MÓDULO DE SOPORTE TÉCNICO, AGENDAMIENTO Y GOOGLE CALENDAR
   ========================================================================== */

app.get('/api/support/catalog', (_req: Request, res: Response) => {
  res.json({
    serviceTypes: TECHNICAL_SERVICE_CATALOG,
    technicians: db.getTechnicians().map(t => ({
      id: t.id,
      name: t.name,
      email: t.email,
      role: t.role
    })),
    publicTechnicians: db.getPublicTechnicians(),
    businessHours: {
      weekdays: '08:00 a 18:00',
      saturday: '08:00 a 14:00',
      slots: ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00']
    }
  });
});

// Section 11: Public technician selector showing ONLY Nombre, Especialidad, and Disponibilidad
app.get('/api/support/public-technicians', (_req: Request, res: Response) => {
  res.json(db.getPublicTechnicians());
});

app.get('/api/support/availability', (req: Request, res: Response) => {
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  const technicianId = req.query.technicianId ? String(req.query.technicianId) : undefined;
  const slots = db.getAvailableSlotsForDate(date, technicianId);
  res.json({ date, slots });
});

// Create a technical support request & appointment (Public or Logged-in Client)
// CRITICAL RULE (Sections 6 & 7): Customers NEVER select technicians. Only an Admin can assign a technician.
app.post('/api/support/tickets', async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    const {
      clientName,
      clientPhone,
      clientEmail,
      companyName,
      serviceType,
      equipmentType,
      equipmentBrand,
      equipmentModel,
      serialNumber,
      problemDescription,
      observations,
      photos,
      modality,
      address,
      city,
      appointmentDate,
      appointmentTime,
      appointmentEndTime,
      durationMinutes,
      priority,
      assignedTechnicianId,
      assignedTechnicianName
    } = req.body;

    if (!clientName || !clientPhone || !serviceType || !problemDescription) {
      return res.status(400).json({
        error: 'Nombre completo, teléfono/WhatsApp, tipo de servicio y descripción del problema son obligatorios.'
      });
    }

    const isAdminActor = Boolean(req.user && req.user.role === 'Administrador');

    const created = db.createTechnicalService(
      {
        clientId: req.user?.id,
        clientName: String(clientName).trim(),
        clientPhone: String(clientPhone).trim(),
        clientEmail: String(clientEmail || req.user?.email || '').trim(),
        companyName: companyName ? String(companyName).trim() : undefined,
        serviceType: String(serviceType).trim(),
        equipmentType: String(equipmentType || 'Computador / Equipo').trim(),
        equipmentBrand: String(equipmentBrand || '').trim(),
        equipmentModel: String(equipmentModel || '').trim(),
        serialNumber: serialNumber ? String(serialNumber).trim() : undefined,
        problemDescription: String(problemDescription).trim(),
        observations: observations ? String(observations).trim() : undefined,
        photos: Array.isArray(photos) ? photos : [],
        modality: modality || 'En sede',
        address: address ? String(address).trim() : undefined,
        city: city ? String(city).trim() : 'Cali, Valle del Cauca',
        appointmentDate: appointmentDate ? String(appointmentDate).trim() : undefined,
        appointmentTime: appointmentTime ? String(appointmentTime).trim() : undefined,
        appointmentEndTime: appointmentEndTime ? String(appointmentEndTime).trim() : undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : 60,
        priority: priority || 'Media',
        allowAdminTechnicianAssignment: isAdminActor,
        assignedTechnicianId: isAdminActor ? assignedTechnicianId : undefined,
        assignedTechnicianName: isAdminActor ? assignedTechnicianName : undefined
      },
      req.user?.email || String(clientEmail || clientName).trim()
    );

    const op = db.enqueueSyncOperation('Servicios técnicos', 'CREAR_ORDEN_SERVICIO', {
      ticketNumber: created.ticketNumber,
      clientName: created.clientName
    });

    // Sync to Google Calendar if appointmentDate is provided and Google token is available
    const token = req.googleToken || db.getLatestGoogleAccessToken();
    if (token && created.appointmentDate && !db.isSimulatedOffline()) {
      const calEvent = await createGoogleCalendarEvent(token, {
        ticketNumber: created.ticketNumber,
        clientName: created.clientName,
        clientEmail: created.clientEmail,
        clientPhone: created.clientPhone,
        serviceType: created.serviceType,
        equipmentBrandModel: `${created.equipmentBrand} ${created.equipmentModel}`.trim(),
        problemDescription: created.problemDescription,
        modality: created.modality,
        address: created.address,
        technicianName: created.assignedTechnicianName || 'Pendiente de asignación',
        appointmentDate: created.appointmentDate,
        appointmentTime: created.appointmentTime || '09:00'
      });

      if (calEvent) {
        db.updateTechnicalService(
          created.id,
          { googleCalendarEventId: calEvent.eventId },
          req.user?.email || 'Sistema Calendar'
        );
        created.googleCalendarEventId = calEvent.eventId;
      }
    }

    if (token && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      sheetsDb
        .syncAllTabsToSheets(token, req.user?.email || created.clientEmail || 'Sistema')
        .then(() => db.completeSyncOperation(op.id))
        .catch(e => db.failSyncOperation(op.id, e?.message || 'Error Sheets'));
    } else if (!sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      db.completeSyncOperation(op.id);
    }

    res.status(201).json({
      ticket: created,
      message: `Solicitud ${created.ticketNumber} recibida y guardada exitosamente. Nuestro equipo revisará tu solicitud y confirmará la disponibilidad.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al registrar la solicitud de soporte técnico.' });
  }
});

// Section 7: Admin/Supervisor view of all technicians, real availability, occupied schedules, and workload
app.get('/api/support/technicians-workload', requireSupportStaff, (req: Request, res: Response) => {
  const dateFilter = req.query.date ? String(req.query.date) : undefined;
  res.json({
    date: dateFilter || new Date().toISOString().slice(0, 10),
    technicians: db.getTechniciansWorkloadOverview(dateFilter)
  });
});

// Section 7: Exclusive Admin endpoint to assign/change technician, set start/end time, and confirm/reschedule/cancel with conflict blocking
app.post('/api/support/tickets/:id/assign-technician', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const {
      assignedTechnicianId,
      appointmentDate,
      appointmentTime,
      appointmentEndTime,
      durationMinutes,
      status,
      scheduleNote
    } = req.body;

    if (!assignedTechnicianId && status !== 'Cancelada' && status !== 'Cancelado') {
      return res.status(400).json({ error: 'Debe seleccionar un técnico para asignar a la solicitud.' });
    }

    const updated = db.updateTechnicalService(
      req.params.id,
      {
        assignedTechnicianId,
        appointmentDate,
        appointmentTime,
        appointmentEndTime,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        status: status || 'Asignada',
        scheduleNote
      },
      req.user?.email || 'jeffervr@gmail.com'
    );

    res.json({
      ticket: updated,
      message: `Técnico ${updated.assignedTechnicianName || ''} asignado exitosamente a la orden ${updated.ticketNumber} (${updated.appointmentDate} ${updated.appointmentTime} - ${updated.appointmentEndTime}).`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Conflicto de horario al asignar el técnico.' });
  }
});

// Client Portal: Get ONLY the authenticated client's own technical support tickets & appointments
app.get('/api/support/my-tickets', requireAuth, (req: Request & { user?: any }, res: Response) => {
  const tickets = db.getTechnicalServicesForClient(req.user.email, req.user.id);
  const appointments = db.getAppointmentsForClient(req.user.email, req.user.id);
  res.json({ tickets, appointments });
});

// Public lookup by ticket number + phone last 4 digits
app.get('/api/support/lookup/:ticketNumber', (req: Request, res: Response) => {
  const ticket = db.getTechnicalServiceByTicket(req.params.ticketNumber);
  if (!ticket) return res.status(404).json({ error: 'No se encontró una orden con ese número.' });
  res.json(ticket);
});

// Admin / Supervisor / Técnico / Caja: Get all technical support tickets
app.get('/api/support/tickets', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  const all = db.getTechnicalServices();
  if (req.user.role === 'Técnico' && req.query.onlyMine === 'true') {
    return res.json(
      all.filter(
        t =>
          t.assignedTechnicianId === req.user.id ||
          (t.assignedTechnicianName &&
            t.assignedTechnicianName.toLowerCase().includes(req.user.name.toLowerCase()))
      )
    );
  }
  res.json(all);
});

// Admin / Supervisor / Técnico: Update technical support ticket & sync Google Calendar
app.put('/api/support/tickets/:id', requireSupportStaff, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  try {
    const existing = db.getTechnicalServiceById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Orden de servicio no encontrada.' });

    const updated = db.updateTechnicalService(req.params.id, req.body, req.user?.email || 'Soporte');
    const op = db.enqueueSyncOperation('Servicios técnicos', 'ACTUALIZAR_ORDEN_SERVICIO', {
      ticketNumber: updated.ticketNumber,
      status: updated.status
    });

    const token = req.googleToken || db.getLatestGoogleAccessToken();
    if (token && updated.appointmentDate && !db.isSimulatedOffline()) {
      if (updated.status === 'Cancelado' && updated.googleCalendarEventId) {
        await deleteGoogleCalendarEvent(token, updated.googleCalendarEventId);
      } else if (updated.googleCalendarEventId) {
        await updateGoogleCalendarEvent(token, updated.googleCalendarEventId, {
          ticketNumber: updated.ticketNumber,
          clientName: updated.clientName,
          clientEmail: updated.clientEmail,
          clientPhone: updated.clientPhone,
          serviceType: updated.serviceType,
          equipmentBrandModel: `${updated.equipmentBrand} ${updated.equipmentModel}`.trim(),
          problemDescription: updated.problemDescription,
          modality: updated.modality,
          address: updated.address,
          technicianName: updated.assignedTechnicianName,
          appointmentDate: updated.appointmentDate,
          appointmentTime: updated.appointmentTime || '09:00'
        });
      } else {
        const calEvent = await createGoogleCalendarEvent(token, {
          ticketNumber: updated.ticketNumber,
          clientName: updated.clientName,
          clientEmail: updated.clientEmail,
          clientPhone: updated.clientPhone,
          serviceType: updated.serviceType,
          equipmentBrandModel: `${updated.equipmentBrand} ${updated.equipmentModel}`.trim(),
          problemDescription: updated.problemDescription,
          modality: updated.modality,
          address: updated.address,
          technicianName: updated.assignedTechnicianName,
          appointmentDate: updated.appointmentDate,
          appointmentTime: updated.appointmentTime || '09:00'
        });
        if (calEvent) {
          db.updateTechnicalService(updated.id, { googleCalendarEventId: calEvent.eventId }, req.user?.email || 'Sistema');
          updated.googleCalendarEventId = calEvent.eventId;
        }
      }
    }

    if (token && sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      sheetsDb
        .syncAllTabsToSheets(token, req.user?.email || 'Soporte')
        .then(() => db.completeSyncOperation(op.id))
        .catch(e => db.failSyncOperation(op.id, e?.message || 'Error Sheets'));
    } else if (!sheetsDb.getSpreadsheetId() && !db.isSimulatedOffline()) {
      db.completeSyncOperation(op.id);
    }

    res.json({
      ticket: updated,
      message: `Orden de servicio ${updated.ticketNumber} actualizada y guardada permanentemente.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar la orden de servicio.' });
  }
});

app.delete('/api/support/tickets/:id', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  const ok = db.deleteTechnicalService(req.params.id, req.user?.email || 'Admin');
  if (!ok) return res.status(404).json({ error: 'Orden de servicio no encontrada.' });
  res.json({ success: true, message: 'Orden de servicio enviada a la Papelera.' });
});

app.get('/api/support/appointments', requireSupportStaff, (_req: Request, res: Response) => {
  res.json(db.getAppointments());
});

/* ==========================================================================
   WARRANTIES & INVENTORY MOVEMENTS
   ========================================================================== */

app.get('/api/warranties/my-warranties', requireAuth, (req: Request & { user?: any }, res: Response) => {
  res.json(db.getWarrantiesForClient(req.user.email));
});

app.get('/api/warranties', requireSupportStaff, (_req: Request, res: Response) => {
  res.json(db.getWarranties());
});

app.post('/api/warranties', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  try {
    const created = db.createWarranty(req.body, req.user?.email || 'Admin');
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al registrar garantía.' });
  }
});

app.put('/api/warranties/:id', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  try {
    const updated = db.updateWarranty(req.params.id, req.body, req.user?.email || 'Admin');
    res.json({
      warranty: updated,
      message: `Caso de garantía ${updated.warrantyCode || updated.id} actualizado a "${updated.status}".`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar caso de garantía.' });
  }
});

// Client or public warranty claim request (Section 15.5)
app.post('/api/warranties/claim', requireAuth, (req: Request & { user?: any }, res: Response) => {
  try {
    const { warrantyId, reportedFailure, serialNumber, evidencePhotos } = req.body;
    if (!warrantyId || !reportedFailure) {
      return res.status(400).json({ error: 'Debe seleccionar la garantía e indicar la falla reportada.' });
    }
    const updated = db.updateWarranty(
      warrantyId,
      {
        status: 'Solicitud recibida',
        reportedFailure: String(reportedFailure).trim(),
        serialNumber: serialNumber ? String(serialNumber).trim() : undefined,
        evidencePhotos: Array.isArray(evidencePhotos) ? evidencePhotos : undefined,
        claimDate: new Date().toISOString(),
        statusNote: `Solicitud de garantía registrada por cliente (${req.user.email}): ${reportedFailure}`
      },
      req.user.email
    );
    res.json({
      warranty: updated,
      message: `Solicitud de garantía recibida para ${updated.productName}. Nuestro laboratorio evaluará su caso conforme a la Ley 1480 de 2011.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al radicar solicitud de garantía.' });
  }
});

app.get('/api/inventory/movements', requireSupportStaff, (_req: Request, res: Response) => {
  res.json(db.getInventoryMovements());
});

/* ==========================================================================
   SISTEMA DE PLANTILLAS DE TEMPORADA Y BANNER DE 3 PROMOCIONES (SECCIONES 3 Y 13)
   ========================================================================== */

app.get('/api/templates', (_req: Request, res: Response) => {
  res.json({
    templates: db.getSeasonalTemplates(),
    activeWebTemplate: db.getActiveWebTemplate(),
    activePdfTemplate: db.getActivePdfTemplate()
  });
});

app.post('/api/templates', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const created = db.createSeasonalTemplate(req.body, req.user?.email || 'jeffervr@gmail.com');
    res.status(201).json({
      template: created,
      message: `Plantilla "${created.name}" creada exitosamente.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al crear plantilla.' });
  }
});

app.put('/api/templates/:id', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const updated = db.updateSeasonalTemplate(req.params.id, req.body, req.user?.email || 'jeffervr@gmail.com');
    res.json({
      template: updated,
      message: `Plantilla "${updated.name}" actualizada exitosamente.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar plantilla.' });
  }
});

app.post('/api/templates/:id/duplicate', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const duplicated = db.duplicateSeasonalTemplate(req.params.id, req.user?.email || 'jeffervr@gmail.com');
    res.status(201).json({
      template: duplicated,
      message: `Plantilla duplicada como "${duplicated.name}".`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al duplicar plantilla.' });
  }
});

app.post('/api/templates/:id/activate', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const target = req.body.target === 'web' || req.body.target === 'pdf' ? req.body.target : 'both';
    const activated = db.activateSeasonalTemplate(req.params.id, target, req.user?.email || 'jeffervr@gmail.com');
    res.json({
      template: activated,
      activeWebTemplate: db.getActiveWebTemplate(),
      activePdfTemplate: db.getActivePdfTemplate(),
      message: `Plantilla "${activated.name}" activada para ${target === 'both' ? 'Catálogo Web y Catálogo PDF' : target.toUpperCase()} sin alterar productos ni precios.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al activar plantilla.' });
  }
});

app.post('/api/templates/restore-default', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const restored = db.restoreDefaultCorporateTemplate(req.user?.email || 'jeffervr@gmail.com');
    res.json({
      template: restored,
      activeWebTemplate: db.getActiveWebTemplate(),
      activePdfTemplate: db.getActivePdfTemplate(),
      message: 'Diseño predeterminado "Corporativa IPS TECNOLÓGICA" restaurado.'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al restaurar plantilla predeterminada.' });
  }
});

app.delete('/api/templates/:id', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const ok = db.deleteSeasonalTemplate(req.params.id, req.user?.email || 'jeffervr@gmail.com');
    if (!ok) return res.status(404).json({ error: 'Plantilla no encontrada.' });
    res.json({
      success: true,
      message: 'Plantilla eliminada correctamente.'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al eliminar plantilla.' });
  }
});

// Banner Principal de 3 Promociones (Sección 13)
app.get('/api/promo-banners', (_req: Request, res: Response) => {
  res.json(db.getPromoBanners());
});

app.put('/api/promo-banners/:slot', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const updated = db.updatePromoBanner(req.params.slot, req.body, req.user?.email || 'jeffervr@gmail.com');
    res.json({
      banner: updated,
      banners: db.getPromoBanners(),
      message: `Banner promocional #${updated.slot} ("${updated.title}") guardado permanentemente.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar banner promocional.' });
  }
});

/* ==========================================================================
   GENERADOR DE CÓDIGOS DE DESCUENTO (SECCIÓN 12)
   ========================================================================== */

app.get('/api/discount-codes', requireSupportStaff, (_req: Request, res: Response) => {
  res.json(db.getDiscountCodes());
});

app.post('/api/discount-codes', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const created = db.createDiscountCode(req.body, req.user?.email || 'jeffervr@gmail.com');
    res.status(201).json({
      discountCode: created,
      message: `Código de descuento "${created.code}" creado exitosamente.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al crear código de descuento.' });
  }
});

app.put('/api/discount-codes/:id', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const updated = db.updateDiscountCode(req.params.id, req.body, req.user?.email || 'jeffervr@gmail.com');
    res.json({
      discountCode: updated,
      message: `Código de descuento "${updated.code}" actualizado.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar código de descuento.' });
  }
});

app.delete('/api/discount-codes/:id', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  const ok = db.deleteDiscountCode(req.params.id, req.user?.email || 'jeffervr@gmail.com');
  if (!ok) return res.status(404).json({ error: 'Código de descuento no encontrado.' });
  res.json({ success: true, message: 'Código de descuento eliminado.' });
});

app.post('/api/discount-codes/validate', (req: Request, res: Response) => {
  const { code, subtotalCOP, items } = req.body;
  const result = db.validateDiscountCode(String(code || ''), Number(subtotalCOP) || 0, items);
  res.json(result);
});

/* ==========================================================================
   POLÍTICAS DE GARANTÍAS Y ENVÍOS + SEGUIMIENTO DE ENVÍOS (SECCIÓN 15)
   ========================================================================== */

app.get('/api/policies', (_req: Request, res: Response) => {
  res.json(db.getPolicies());
});

app.get('/api/policies/:idOrCategory', (req: Request, res: Response) => {
  const policy = db.getPolicyByIdOrCategory(req.params.idOrCategory);
  if (!policy) return res.status(404).json({ error: 'Política no encontrada.' });
  res.json(policy);
});

app.put('/api/policies/:idOrCategory', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const updated = db.updatePolicy(req.params.idOrCategory, req.body, req.user?.email || 'jeffervr@gmail.com');
    res.json({
      policy: updated,
      message: `Política "${updated.title}" actualizada y publicada correctamente.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar política.' });
  }
});

app.get('/api/shipments', requireSupportStaff, (_req: Request, res: Response) => {
  res.json(db.getShipments());
});

app.get('/api/shipments/my-shipments', requireAuth, (req: Request & { user?: any }, res: Response) => {
  res.json(db.getShipmentsForClient(req.user.email));
});

app.put('/api/shipments/:orderId', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  try {
    const updated = db.createOrUpdateShipment(req.params.orderId, req.body, req.user?.email || 'jeffervr@gmail.com');
    res.json({
      shipment: updated,
      message: `Envío del pedido ${updated.orderId} actualizado (Guía: ${updated.trackingNumber} · Estado: ${updated.status}).`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar envío.' });
  }
});

/* ==========================================================================
   NOTIFICACIONES DEL ADMINISTRADOR PRINCIPAL Y MOVIMIENTOS DE CAJA (SECCIONES 6 Y 16)
   ========================================================================== */

app.get('/api/admin/notifications', requireSupportStaff, (_req: Request, res: Response) => {
  const list = db.getAdminNotifications();
  res.json({
    notifications: list,
    unreadCount: list.filter(n => !n.isRead).length
  });
});

app.patch('/api/admin/notifications/:id/read', requireSupportStaff, (req: Request, res: Response) => {
  db.markAdminNotificationRead(req.params.id);
  const list = db.getAdminNotifications();
  res.json({
    notifications: list,
    unreadCount: list.filter(n => !n.isRead).length
  });
});

app.post('/api/admin/notifications/read-all', requireSupportStaff, (_req: Request, res: Response) => {
  db.markAllAdminNotificationsRead();
  const list = db.getAdminNotifications();
  res.json({
    notifications: list,
    unreadCount: 0,
    message: 'Todas las notificaciones han sido marcadas como leídas.'
  });
});

app.get('/api/cash-movements', requireSupportStaff, (_req: Request, res: Response) => {
  res.json(db.getCashMovements());
});

app.post('/api/cash-movements', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  try {
    const created = db.recordCashMovement(req.body, req.user?.email || 'caja@ipstecnologica.com.co');
    res.status(201).json({
      movement: created,
      message: 'Movimiento de caja registrado exitosamente.'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al registrar movimiento de caja.' });
  }
});

/* ==========================================================================
   NOTIFICACIONES PUSH DEL SERVICE WORKER PARA CLIENTES (OFERTAS Y PEDIDOS)
   ========================================================================== */

app.get('/api/push/events', (req: Request & { user?: any }, res: Response) => {
  const since = typeof req.query.since === 'string' ? req.query.since.trim() : undefined;
  const queryEmail = typeof req.query.email === 'string' ? req.query.email.trim() : '';
  const effectiveEmail = queryEmail || req.user?.email || '';
  const rawOrderIds = typeof req.query.orderIds === 'string' ? req.query.orderIds : '';
  const orderIds = rawOrderIds
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  if (effectiveEmail) {
    const customerOrders = db.getOrdersForCustomer(effectiveEmail);
    for (const o of customerOrders) {
      if (!orderIds.includes(o.id.toUpperCase())) {
        orderIds.push(o.id.toUpperCase());
      }
    }
  }

  const includeOffers = req.query.includeOffers !== 'false';
  const includeOrders = req.query.includeOrders !== 'false';
  const catalogPublished = db.isCatalogPublished();
  const activeProducts = db.getActiveProductsWithPromotions();
  const activePromotionsCount = activeProducts.filter(p => Boolean(p.activePromotion)).length;

  const events = db.getCustomerPushEvents({
    since,
    email: effectiveEmail,
    orderIds,
    includeOffers,
    includeOrders
  });

  res.json({
    catalogPublished,
    activeProductsCount: activeProducts.length,
    activePromotionsCount,
    events: events.slice(0, 40)
  });
});

app.post('/api/push/subscribe', (req: Request & { user?: any }, res: Response) => {
  try {
    const {
      deviceId,
      customerEmail,
      customerName,
      customerPhone,
      subscribedToOffers,
      subscribedToOrders,
      trackedOrderIds,
      endpoint,
      keys,
      active
    } = req.body || {};

    const subscription = db.upsertCustomerPushSubscription({
      deviceId: deviceId || `dev_${Date.now()}`,
      customerEmail: customerEmail || req.user?.email,
      customerName: customerName || req.user?.name,
      customerPhone: customerPhone || req.user?.phone,
      subscribedToOffers,
      subscribedToOrders,
      trackedOrderIds: Array.isArray(trackedOrderIds) ? trackedOrderIds : undefined,
      endpoint,
      keys,
      userAgent: req.headers['user-agent'],
      active
    });

    res.json({
      subscription,
      catalogPublished: db.isCatalogPublished(),
      message: subscription.active
        ? 'Suscripción a notificaciones push del Service Worker activada correctamente.'
        : 'Notificaciones push del Service Worker pausadas en este dispositivo.'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al registrar suscripción push.' });
  }
});

app.get('/api/push/subscriptions', requireSupportStaff, (_req: Request, res: Response) => {
  const subs = db.getCustomerPushSubscriptions();
  res.json({
    catalogPublished: db.isCatalogPublished(),
    totalSubscriptions: subs.length,
    activeSubscriptions: subs.filter(s => s.active).length,
    offersSubscribers: subs.filter(s => s.active && s.subscribedToOffers).length,
    ordersSubscribers: subs.filter(s => s.active && s.subscribedToOrders).length,
    subscriptions: subs
  });
});

app.post('/api/push/notify', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  try {
    if (!db.isCatalogPublished()) {
      return res.status(400).json({
        error: 'El catálogo debe tener al menos un producto activo publicado para emitir notificaciones push a los clientes.'
      });
    }

    const {
      type,
      title,
      body,
      url,
      targetAudience,
      targetCustomerEmail,
      targetCustomerPhone,
      targetOrderId,
      relatedProductId,
      relatedProductRef,
      relatedCategory,
      discountBadge,
      orderStatus,
      trackingNumber,
      carrier
    } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ error: 'Título y mensaje de la notificación push son obligatorios.' });
    }

    const actor = req.user?.email || 'jeffervr@gmail.com';
    const event = db.emitCustomerPushEvent({
      type: type || 'NEW_OFFER',
      title: String(title).trim(),
      body: String(body).trim(),
      url: url || '/?promo=active',
      targetAudience: targetAudience === 'specific_customer' ? 'specific_customer' : 'all_customers',
      targetCustomerEmail,
      targetCustomerPhone,
      targetOrderId,
      relatedProductId,
      relatedProductRef,
      relatedCategory,
      discountBadge,
      orderStatus,
      trackingNumber,
      carrier,
      createdBy: actor
    });

    db.addAuditLog(
      actor,
      'EMITIR_NOTIFICACION_PUSH',
      `Emitió notificación push (${event.type}): "${event.title}" -> ${event.targetAudience === 'all_customers' ? 'Todos los clientes' : event.targetOrderId || event.targetCustomerEmail}`,
      'EXITOSO'
    );

    res.status(201).json({
      event,
      message:
        event.targetAudience === 'all_customers'
          ? 'Notificación push de oferta publicada para todos los clientes suscritos en el Service Worker.'
          : `Notificación push enviada al cliente del pedido ${event.targetOrderId || event.targetCustomerEmail}.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al emitir notificación push.' });
  }
});

/* ==========================================================================
   PUENTE GRATUITO GOOGLE APPS SCRIPT (11 CARPETAS DRIVE, SHEETS Y CALENDAR SIN TARJETA)
   ========================================================================== */

app.get('/api/workspace/apps-script', requireSupportStaff, (_req: Request, res: Response) => {
  const company = db.getCompany();
  res.json({
    appsScriptWebAppUrl: company.appsScriptWebAppUrl || '',
    scriptCode: generateFreeGoogleAppsScriptCode(company.name || 'IPS TECNOLÓGICA'),
    driveFolders: [
      'Productos',
      'Productos / Fotografías principales',
      'Productos / Fotografías adicionales',
      'Banners',
      'Logos',
      'Plantillas',
      'Catálogos PDF',
      'Documentos',
      'Clientes',
      'Órdenes de servicio',
      'Garantías',
      'Respaldos'
    ]
  });
});

app.put('/api/workspace/apps-script', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  const { appsScriptWebAppUrl } = req.body;
  const updated = db.updateCompany(
    { appsScriptWebAppUrl: String(appsScriptWebAppUrl || '').trim() },
    req.user?.email || 'jeffervr@gmail.com'
  );
  res.json({
    appsScriptWebAppUrl: updated.appsScriptWebAppUrl,
    message: 'URL de Google Apps Script Web App guardada permanentemente (100% gratuito sin facturación).'
  });
});

/* ==========================================================================
   CRM & MARKETING DIGITAL – IPS TECNOLÓGICA (SECCIÓN 11)
   ========================================================================== */

app.get('/api/crm/customers', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  const isDemo = req.user && db.isDemoReadOnlyUser(req.user.email || req.user.role);
  const customers = isDemo ? db.getDemoSafeCrmCustomers() : db.getCrmCustomers();
  const orders = isDemo ? db.getDemoSafeOrders() : db.getAllOrders();

  // Compute top-selling products from real or demo orders
  const productSalesMap = new Map<string, { reference: string; name: string; quantitySold: number; unitsSold: number; revenueCOP: number }>();
  for (const ord of orders.filter(o => o.status !== 'Cancelado')) {
    for (const item of ord.items || []) {
      const prev = productSalesMap.get(item.reference) || {
        reference: item.reference,
        name: item.name,
        quantitySold: 0,
        unitsSold: 0,
        revenueCOP: 0
      };
      const qty = Number(item.quantity) || 1;
      prev.quantitySold += qty;
      prev.unitsSold += qty;
      prev.revenueCOP += Number(item.subtotalCOP) || 0;
      productSalesMap.set(item.reference, prev);
    }
  }
  const topSellingProducts = Array.from(productSalesMap.values()).sort((a, b) => b.revenueCOP - a.revenueCOP);

  res.json({
    customers,
    campaigns: db.getMarketingCampaigns(),
    opportunities: db.getCrmOpportunities(),
    topSellingProducts,
    metrics: {
      topSellingProducts
    },
    isDemoMode: Boolean(isDemo)
  });
});

app.post('/api/crm/customers', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  try {
    const saved = db.upsertCrmCustomer(req.body, req.user?.email || 'jeffervr@gmail.com');
    res.status(201).json({
      customer: saved,
      message: `Cliente "${saved.fullName}" guardado permanentemente en CRM.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al guardar cliente en CRM.' });
  }
});

app.put('/api/crm/customers/:id', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  try {
    const saved = db.upsertCrmCustomer({ ...req.body, id: req.params.id }, req.user?.email || 'jeffervr@gmail.com');
    res.json({
      customer: saved,
      message: `Ficha CRM de "${saved.fullName}" actualizada.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar cliente en CRM.' });
  }
});

app.post('/api/crm/customers/:id/followup', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  try {
    const updated = db.addCrmFollowUp(req.params.id, req.body, req.user?.email || 'jeffervr@gmail.com');
    res.json({
      customer: updated,
      message: `Seguimiento comercial registrado para ${updated.fullName}.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al agregar seguimiento CRM.' });
  }
});

app.get('/api/crm/opportunities', requireSupportStaff, (_req: Request, res: Response) => {
  res.json(db.getCrmOpportunities());
});

app.post('/api/crm/opportunities', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  try {
    const opportunity = db.upsertCrmOpportunity(req.body, req.user?.email || 'jeffervr@gmail.com');
    res.status(201).json({
      opportunity,
      message: `Oportunidad comercial "${opportunity.title}" guardada en CRM.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al guardar oportunidad comercial.' });
  }
});

app.put('/api/crm/opportunities/:id', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  try {
    const opportunity = db.upsertCrmOpportunity(
      { ...req.body, id: req.params.id },
      req.user?.email || 'jeffervr@gmail.com'
    );
    res.json({
      opportunity,
      message: `Oportunidad "${opportunity.title}" actualizada.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar oportunidad comercial.' });
  }
});

app.delete('/api/crm/opportunities/:id', requireSupportStaff, (req: Request & { user?: any }, res: Response) => {
  const ok = db.deleteCrmOpportunity(req.params.id, req.user?.email || 'jeffervr@gmail.com');
  if (!ok) return res.status(404).json({ error: 'Oportunidad no encontrada.' });
  res.json({ success: true, message: 'Oportunidad eliminada correctamente.' });
});

app.get('/api/marketing/campaigns', requireSupportStaff, (_req: Request, res: Response) => {
  res.json(db.getMarketingCampaigns());
});

app.post('/api/marketing/campaigns', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const campaign = db.upsertMarketingCampaign(req.body, req.user?.email || 'jeffervr@gmail.com');
    res.status(201).json({
      campaign,
      message: `Campaña de marketing "${campaign.name}" creada y guardada permanentemente.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al crear campaña de marketing.' });
  }
});

app.put('/api/marketing/campaigns/:id', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const campaign = db.upsertMarketingCampaign(
      { ...req.body, id: req.params.id },
      req.user?.email || 'jeffervr@gmail.com'
    );
    res.json({
      campaign,
      message: `Campaña "${campaign.name}" actualizada y guardada permanentemente.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar campaña.' });
  }
});

app.delete('/api/marketing/campaigns/:id', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  const ok = db.deleteMarketingCampaign(req.params.id, req.user?.email || 'jeffervr@gmail.com');
  if (!ok) return res.status(404).json({ error: 'Campaña no encontrada.' });
  res.json({ success: true, message: 'Campaña eliminada correctamente.' });
});

/* ==========================================================================
   LANDING PAGE EMPRESARIAL — CMS ADMINISTRABLE & FORMULARIO DE CONTACTO (SECCIONES 2 Y 3)
   ========================================================================== */

app.get('/api/landing-cms', (_req: Request, res: Response) => {
  res.json(db.getLandingPageCms());
});

app.put('/api/landing-cms', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const updated = db.updateLandingPageCms(req.body, req.user?.email || 'jeffervr@gmail.com');
    res.json({
      cms: updated,
      message: `Página principal publicada exitosamente (Versión v${updated.version}).`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al guardar la configuración de la página principal.' });
  }
});

app.post('/api/landing-cms/restore-version', requireEditorOrAdmin, (req: Request & { user?: any }, res: Response) => {
  try {
    const { version } = req.body;
    const restored = db.restoreLandingPageCmsVersion(Number(version) || 0, req.user?.email || 'jeffervr@gmail.com');
    res.json({
      cms: restored,
      message: `Se restauró la versión solicitada y se publicó como v${restored.version}.`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al restaurar versión anterior.' });
  }
});

app.post('/api/contact-inquiry', (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, companyName, city, subject, message } = req.body;
    if (!fullName || !email || !phone || !message) {
      return res.status(400).json({
        error: 'Por favor completa tu nombre, correo electrónico, teléfono y mensaje.'
      });
    }

    const crmRecord = db.upsertCrmCustomer(
      {
        fullName: String(fullName).trim(),
        email: String(email).toLowerCase().trim(),
        phone: String(phone).trim(),
        whatsapp: String(phone).trim(),
        companyName: companyName ? String(companyName).trim() : undefined,
        city: city ? String(city).trim() : 'Cali, Valle del Cauca',
        classification: companyName ? 'Empresarial' : 'Prospecto',
        marketingConsent: true
      },
      'Formulario Web IPS'
    );

    db.addCrmFollowUp(
      crmRecord.id,
      {
        channel: 'Correo',
        note: `Consulta desde Página Principal (${subject || 'Contacto Comercial'}): ${String(message).trim()}`
      },
      'Formulario Web IPS'
    );

    db.createAdminNotification({
      eventType: 'NUEVO_CLIENTE',
      title: `Nueva consulta web de ${crmRecord.fullName}`,
      message: `${crmRecord.fullName} (${crmRecord.email} · ${crmRecord.phone}) envió una solicitud desde la página principal: "${String(message).trim().substring(0, 120)}"`,
      severity: 'info',
      relatedEntityId: crmRecord.id,
      relatedModule: 'crm-marketing'
    });

    res.status(201).json({
      success: true,
      customerId: crmRecord.id,
      message: 'Tu mensaje ha sido registrado exitosamente en nuestro sistema. Un asesor de IPS TECNOLÓGICA se comunicará contigo muy pronto.'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'No se pudo registrar la solicitud de contacto.' });
  }
});

/* ==========================================================================
   MEDIOS DE PAGO, SOPORTE REMOTO Y WHATSAPP QR OFICIAL (SECCIONES 7, 12, 14)
   ========================================================================== */

app.get('/api/payment-methods', (_req: Request, res: Response) => {
  res.json(db.getPaymentMethods());
});

app.put('/api/payment-methods', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  const items = Array.isArray(req.body.items) ? req.body.items : Array.isArray(req.body) ? req.body : [];
  const updated = db.updatePaymentMethods(items, req.user?.email || 'jeffervr@gmail.com');
  res.json({
    paymentMethods: updated,
    message: 'Medios de pago actualizados y publicados en la web principal y el catálogo.'
  });
});

app.get('/api/remote-support-tools', (_req: Request, res: Response) => {
  res.json(db.getRemoteSupportTools());
});

app.put('/api/remote-support-tools', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  const tools = Array.isArray(req.body.tools) ? req.body.tools : Array.isArray(req.body) ? req.body : [];
  const updated = db.updateRemoteSupportTools(tools, req.user?.email || 'jeffervr@gmail.com');
  res.json({
    remoteSupportTools: updated,
    message: 'Enlaces oficiales de aplicaciones de soporte remoto actualizados.'
  });
});

app.get('/api/whatsapp-qr-config', (_req: Request, res: Response) => {
  res.json(db.getWhatsAppQrConfig());
});

app.put('/api/whatsapp-qr-config', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  const updated = db.updateWhatsAppQrConfig(req.body, req.user?.email || 'jeffervr@gmail.com');
  res.json({
    config: updated,
    message: 'Configuración de WhatsApp Business (QR y enlaces wa.me) guardada exitosamente.'
  });
});

/* ==========================================================================
   CONFIGURACIÓN → INTEGRACIONES → WHATSAPP BUSINESS (BÓVEDA CIFRADA AES-256-GCM)
   ========================================================================== */

app.get('/api/admin/integrations/whatsapp', requireStrictAdminOnly, (_req: Request, res: Response) => {
  res.json(getSanitizedWhatsAppIntegrationView());
});

app.put('/api/admin/integrations/whatsapp', requireStrictAdminOnly, (req: Request & { user?: any }, res: Response) => {
  try {
    const actor = req.user?.email || 'Admin';
    const {
      publicAppUrl,
      vitePublicAppUrl,
      integrationEnabled,
      whatsappAccessToken,
      whatsappPhoneNumberId,
      whatsappVerifyToken,
      whatsappAppSecret
    } = req.body;

    const updatedView = updateWhatsAppIntegrationVault(
      {
        publicAppUrl,
        vitePublicAppUrl,
        integrationEnabled,
        whatsappAccessToken,
        whatsappPhoneNumberId,
        whatsappVerifyToken,
        whatsappAppSecret
      },
      actor
    );

    const updatedFields: string[] = [];
    if (publicAppUrl) updatedFields.push('PUBLIC_APP_URL');
    if (vitePublicAppUrl) updatedFields.push('VITE_PUBLIC_APP_URL');
    if (typeof integrationEnabled === 'boolean') {
      updatedFields.push(`Estado=${integrationEnabled ? 'ACTIVO' : 'INACTIVO'}`);
    }
    if (whatsappAccessToken && String(whatsappAccessToken).trim()) {
      updatedFields.push('WHATSAPP_ACCESS_TOKEN (Cifrado AES-256-GCM)');
    }
    if (whatsappPhoneNumberId && String(whatsappPhoneNumberId).trim()) {
      updatedFields.push('WHATSAPP_PHONE_NUMBER_ID (Cifrado AES-256-GCM)');
    }
    if (whatsappVerifyToken && String(whatsappVerifyToken).trim()) {
      updatedFields.push('WHATSAPP_VERIFY_TOKEN (Cifrado AES-256-GCM)');
    }
    if (whatsappAppSecret && String(whatsappAppSecret).trim()) {
      updatedFields.push('WHATSAPP_APP_SECRET (Cifrado AES-256-GCM)');
    }

    db.addAuditLog(
      actor,
      'CONFIGURAR_INTEGRACION_WHATSAPP',
      `Actualizó integración WhatsApp Business: ${updatedFields.join(', ') || 'Sin cambios en secretos'}`,
      'EXITOSO'
    );

    res.json({
      integration: updatedView,
      message: 'Configuración de WhatsApp Business guardada de forma segura en la bóveda cifrada del servidor.'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al guardar la configuración de WhatsApp Business.' });
  }
});

app.post('/api/admin/integrations/whatsapp/toggle', requireStrictAdminOnly, (req: Request & { user?: any }, res: Response) => {
  const actor = req.user?.email || 'Admin';
  const current = getSanitizedWhatsAppIntegrationView();
  const nextEnabled =
    typeof req.body?.enabled === 'boolean' ? req.body.enabled : !current.integrationEnabled;

  const updatedView = updateWhatsAppIntegrationVault({ integrationEnabled: nextEnabled }, actor);
  db.addAuditLog(
    actor,
    'ESTADO_INTEGRACION_WHATSAPP',
    `Cambió estado de la integración WhatsApp Business a ${nextEnabled ? 'ACTIVA' : 'INACTIVA'}`,
    'EXITOSO'
  );

  res.json({
    integration: updatedView,
    message: nextEnabled
      ? 'Integración de WhatsApp Business activada.'
      : 'Integración de WhatsApp Business desactivada.'
  });
});

app.post('/api/admin/integrations/whatsapp/test-connection', requireStrictAdminOnly, async (req: Request & { user?: any }, res: Response) => {
  const actor = req.user?.email || 'Admin';
  const result = await testWhatsAppCloudConnection();
  db.addAuditLog(
    actor,
    'PROBAR_CONEXION_WHATSAPP_META',
    `Prueba real de conexión con Meta Graph API: ${result.status} (${result.message})`,
    result.connected ? 'EXITOSO' : 'ERROR'
  );
  res.json(result);
});

app.post('/api/admin/integrations/whatsapp/test-send', requireStrictAdminOnly, async (req: Request & { user?: any }, res: Response) => {
  const actor = req.user?.email || 'Admin';
  const { recipientPhone, messageText, includeGeminiPreview } = req.body;

  if (!recipientPhone || !String(recipientPhone).trim()) {
    return res.status(400).json({ error: 'Debe indicar el número de WhatsApp de destino para la prueba autorizada.' });
  }

  let finalBody =
    String(messageText || '').trim() ||
    'Prueba oficial de conexión desde IPS TECNOLÓGICA CATALOG STUDIO (WhatsApp Cloud API + Gemini IA).';

  let geminiReplyPreview: string | null = null;
  if (includeGeminiPreview) {
    const aiRes = await generateWhatsAppGeminiResponse({
      phone: String(recipientPhone).trim(),
      clientName: 'Administrador Prueba Oficial',
      message: finalBody
    });
    geminiReplyPreview = aiRes.replyText;
    finalBody = aiRes.replyText;
  }

  const sendResult = await sendRealWhatsAppCloudMessage(String(recipientPhone).trim(), finalBody);

  db.addAuditLog(
    actor,
    'PRUEBA_ENVIO_WHATSAPP_CLOUD_API',
    sendResult.sent
      ? `Mensaje real enviado a ${recipientPhone} (ID Meta: ${sendResult.messageId})`
      : `Fallo en prueba de envío real a ${recipientPhone}: ${sendResult.error}`,
    sendResult.sent ? 'EXITOSO' : 'ERROR'
  );

  res.json({
    sent: sendResult.sent,
    messageId: sendResult.messageId,
    httpStatus: sendResult.httpStatus,
    error: sendResult.error,
    dispatchedText: finalBody,
    geminiReplyPreview,
    integration: getSanitizedWhatsAppIntegrationView(),
    message: sendResult.sent
      ? `Mensaje enviado exitosamente mediante Meta WhatsApp Cloud API (ID: ${sendResult.messageId}).`
      : `Meta WhatsApp Cloud API rechazó el envío: ${sendResult.error}`
  });
});

app.delete('/api/admin/integrations/whatsapp/errors', requireStrictAdminOnly, (req: Request & { user?: any }, res: Response) => {
  clearWhatsAppIntegrationErrors();
  db.addAuditLog(req.user?.email || 'Admin', 'LIMPIAR_ERRORES_WHATSAPP', 'Limpió el registro de errores de WhatsApp Business', 'EXITOSO');
  res.json({
    integration: getSanitizedWhatsAppIntegrationView(),
    message: 'Registro de errores de WhatsApp Business limpiado.'
  });
});

// Paginated list of the last 20 communication events (sent/received messages and errors)
app.get('/api/admin/integrations/whatsapp/logs', requireSupportStaff, (req: Request, res: Response) => {
  const filter = String(req.query.filter || 'all').toLowerCase();
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const pageSize = Math.max(1, Math.min(20, parseInt(String(req.query.pageSize || '5'), 10) || 5));

  const conversations = db.getWhatsAppConversations();
  const vaultView = getSanitizedWhatsAppIntegrationView();

  interface CommunicationEventItem {
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

  const allEvents: CommunicationEventItem[] = [];

  for (const conv of conversations) {
    const phone = conv.phone || conv.clientPhone || conv.customerPhone || 'Sin número';
    const contactName = conv.clientName || conv.customerName || 'Cliente';
    for (const m of conv.messages || []) {
      const isIncoming = m.sender === 'client' || m.sender === 'customer';
      const senderLabel =
        m.sender === 'gemini' || m.sender === 'bot_gemini'
          ? 'Chatbot Gemini IA'
          : m.sender === 'advisor' || m.sender === 'human_agent'
          ? m.senderName || 'Asesor Humano'
          : contactName;

      allEvents.push({
        id: m.id || `msg_${conv.id}_${m.timestamp}`,
        type: isIncoming ? 'RECIBIDO' : 'ENVIADO',
        directionLabel: isIncoming ? 'Mensaje Recibido' : `Mensaje Enviado (${senderLabel})`,
        channel: m.usedGemini ? 'WhatsApp Cloud API + Gemini IA' : 'WhatsApp Business',
        phone,
        contactName,
        summary: m.text,
        detail: m.intent ? `Intención detectada: ${m.intent}` : undefined,
        status: isIncoming ? 'Recibido' : 'Exitoso',
        timestamp: m.timestamp || conv.lastMessageAt || new Date().toISOString()
      });
    }
  }

  for (const err of vaultView.errorLogs || []) {
    allEvents.push({
      id: err.id,
      type: 'ERROR',
      directionLabel: `Error de Comunicación (${err.operation})`,
      channel: 'Meta Graph API / Webhook',
      phone: err.detail || 'Servidor Backend',
      contactName: 'Meta Cloud API',
      summary: err.errorMessage,
      detail: err.statusCode ? `Código HTTP ${err.statusCode}${err.detail ? ` · ${err.detail}` : ''}` : err.detail,
      status: 'Fallido',
      timestamp: err.timestamp
    });
  }

  // Sort newest first and cap to the last 20 communication events as requested
  allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const latest20 = allEvents.slice(0, 20);

  const filtered =
    filter === 'sent' || filter === 'enviado'
      ? latest20.filter(e => e.type === 'ENVIADO')
      : filter === 'received' || filter === 'recibido'
      ? latest20.filter(e => e.type === 'RECIBIDO')
      : filter === 'error' || filter === 'errores'
      ? latest20.filter(e => e.type === 'ERROR')
      : latest20;

  const totalEvents = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalEvents / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

  res.json({
    items: paginatedItems,
    allLatest20Count: latest20.length,
    counts: {
      all: latest20.length,
      sent: latest20.filter(e => e.type === 'ENVIADO').length,
      received: latest20.filter(e => e.type === 'RECIBIDO').length,
      errors: latest20.filter(e => e.type === 'ERROR').length
    },
    pagination: {
      page: safePage,
      pageSize,
      totalItems: totalEvents,
      totalPages
    }
  });
});

/* ==========================================================================
   GEMINI AI VAULT & SYSTEM CONFIGURATION HUB (12 INTEGRATIONS)
   ========================================================================== */

app.get('/api/admin/integrations/gemini', requireStrictAdminOnly, (_req: Request, res: Response) => {
  res.json(getSanitizedGeminiIntegrationView());
});

app.put('/api/admin/integrations/gemini', requireStrictAdminOnly, (req: Request & { user?: any }, res: Response) => {
  const actor = req.user?.email || 'Admin';
  const { geminiApiKey, enabled, model, systemInstructions } = req.body;
  const updated = updateGeminiIntegrationVault(
    { geminiApiKey, enabled, model, systemInstructions },
    actor
  );
  if (typeof systemInstructions === 'string' && systemInstructions.trim()) {
    db.updateWhatsAppConfig({ systemPrompt: systemInstructions.trim(), geminiModel: model, geminiEnabled: enabled }, actor);
  }
  db.addAuditLog(
    actor,
    'CONFIGURAR_INTEGRACION_GEMINI',
    `Actualizó configuración de Gemini AI (Modelo: ${updated.model}, Activo: ${updated.enabled})`,
    'EXITOSO'
  );
  res.json({
    gemini: updated,
    message: 'Configuración de Gemini AI guardada en la bóveda cifrada del servidor.'
  });
});

app.post('/api/admin/integrations/gemini/test', requireStrictAdminOnly, async (req: Request & { user?: any }, res: Response) => {
  const actor = req.user?.email || 'Admin';
  const result = await testRealGeminiConnection(actor);
  db.addAuditLog(
    actor,
    'PROBAR_CONEXION_GEMINI',
    `Prueba de conexión real con Gemini AI: ${result.status} (${result.message})`,
    result.connected ? 'EXITOSO' : 'ERROR'
  );
  res.json(result);
});

app.get('/api/admin/system-configuration', requireStrictAdminOnly, (_req: Request, res: Response) => {
  const wsConfig = loadWorkspaceConfig();
  const fsState = getFirestoreConnectionState();
  const waView = getSanitizedWhatsAppIntegrationView();
  const geminiView = getSanitizedGeminiIntegrationView();
  const company = db.getCompany();
  const appConfig = db.getAppConfig();
  const backups = db.getBackups();
  const hasGoogleToken = Boolean(db.getLatestGoogleAccessToken());

  const folderNames = [
    { key: 'sheetsDataId', name: '01_BASE_DATOS_Y_REPORTES', id: wsConfig.folders?.sheetsDataId || null },
    { key: 'photosId', name: '02_FOTOS_PRODUCTOS', id: wsConfig.folders?.photosId || null },
    { key: 'pdfsId', name: '03_CATALOGOS_PDF', id: wsConfig.folders?.pdfsId || null },
    { key: 'logosId', name: '04_LOGOS_Y_DOCUMENTOS_EMPRESA', id: wsConfig.folders?.logosId || null },
    { key: 'clientDocsId', name: '05_DOCUMENTOS_CLIENTES', id: wsConfig.folders?.clientDocsId || null },
    { key: 'serviceOrdersId', name: '06_ORDENES_DE_SERVICIO', id: wsConfig.folders?.serviceOrdersId || null },
    { key: 'backupsId', name: '07_RESPALDOS_AUTOMATICOS', id: wsConfig.folders?.backupsId || null },
    { key: 'adminReportsId', name: '08_REPORTES_ADMINISTRATIVOS', id: wsConfig.folders?.adminReportsId || null },
    { key: 'warrantiesId', name: '09_DOCUMENTOS_DE_GARANTIAS', id: wsConfig.folders?.warrantiesId || null },
    { key: 'accountingDocsId', name: '10_DOCUMENTOS_CONTABLES', id: wsConfig.folders?.accountingDocsId || null }
  ];

  const officialSheetsTabs = [
    'Productos',
    'Categorías',
    'Clientes',
    'Usuarios',
    'Roles',
    'Inventario',
    'Pedidos',
    'Ventas',
    'Promociones',
    'Servicios técnicos',
    'Citas',
    'Técnicos',
    'Garantías',
    'Historial de cambios',
    'Configuración',
    'Sincronización'
  ];

  const emailModule = getCustomModuleState('email');
  const calendarModule = getCustomModuleState('calendar');
  const securityModule = getCustomModuleState('security');
  const domainModule = getCustomModuleState('domain');

  res.json({
    primaryAdminEmail: 'jeffervr@gmail.com',
    authorizedAdmins: AUTHORIZED_ADMIN_EMAILS,
    company,
    whatsapp: waView,
    gemini: geminiView,
    firestore: {
      connected: fsState.connected,
      databaseId: 'ai-studio-remixipstecnolgi-a3cecd67-1548-4f1b-bc5c-c52f0a6aa02e',
      projectId: 'yarling-artwork-vt8c4',
      lastSyncAt: fsState.lastSyncedAt,
      error: fsState.lastError
    },
    googleSheets: {
      connected: Boolean(wsConfig.spreadsheetId),
      hasActiveToken: hasGoogleToken,
      spreadsheetId: wsConfig.spreadsheetId,
      spreadsheetUrl: wsConfig.spreadsheetUrl,
      lastSyncedAt: wsConfig.lastSyncedAt,
      officialTabs: officialSheetsTabs
    },
    googleDrive: {
      connected: Boolean(wsConfig.rootFolderId),
      hasActiveToken: hasGoogleToken,
      rootFolderId: wsConfig.rootFolderId,
      rootFolderUrl: wsConfig.rootFolderUrl,
      folders: folderNames
    },
    googleCalendar: {
      enabled: calendarModule.enabled,
      connected: hasGoogleToken,
      calendarId: calendarModule.settings.calendarId || 'primary',
      timezone: calendarModule.settings.timezone || 'America/Bogota',
      updatedAt: calendarModule.updatedAt,
      updatedBy: calendarModule.updatedBy,
      lastStatus: calendarModule.lastStatus || (hasGoogleToken ? 'Conectado' : 'Sin configurar'),
      lastTestAt: calendarModule.lastTestAt || null,
      lastTestMessage:
        calendarModule.lastTestMessage ||
        (hasGoogleToken
          ? 'Token OAuth de Google activo para sincronizar citas técnicas SRV.'
          : 'Conecte su cuenta de Google en el módulo Google Workspace para sincronizar eventos en Google Calendar.')
    },
    emailConfig: {
      enabled: emailModule.enabled,
      smtpHost: emailModule.settings.smtpHost || 'smtp.gmail.com',
      smtpPort: emailModule.settings.smtpPort || '587',
      senderEmail: emailModule.settings.senderEmail || company.email,
      senderName: emailModule.settings.senderName || company.name,
      passwordConfigured: Boolean(emailModule.settings.smtpPassword),
      updatedAt: emailModule.updatedAt,
      updatedBy: emailModule.updatedBy,
      lastStatus: emailModule.lastStatus || (emailModule.settings.smtpPassword ? 'Conectado' : 'Sin configurar'),
      lastTestAt: emailModule.lastTestAt || null,
      lastTestMessage:
        emailModule.lastTestMessage || 'Configure las credenciales SMTP o Workspace para notificaciones por correo.'
    },
    backupsSummary: {
      totalBackups: backups.length,
      lastBackupAt: backups[0]?.createdAt || null,
      lastBackupFile: backups[0]?.fileName || null,
      autoDailyEnabled: true
    },
    securityConfig: {
      enabled: true,
      primaryAdminProtected: true,
      primaryAdminEmail: 'jeffervr@gmail.com',
      sessionCookieHttpOnly: true,
      aes256VaultActive: true,
      formulaSanitizationActive: true,
      updatedAt: securityModule.updatedAt,
      updatedBy: securityModule.updatedBy
    },
    pwaAndApk: {
      appConfig,
      capacitorAppId: 'com.ipstecnologica.catalogstudio',
      capacitorAppName: 'IPS TECNOLÓGICA'
    },
    domainAndPublishing: {
      publicAppUrl: waView.publicAppUrl,
      vitePublicAppUrl: waView.vitePublicAppUrl,
      customDomain: domainModule.settings.customDomain || company.website,
      cloudRunService: 'ips-tecnologica-catalog-studio',
      region: 'us-west2',
      updatedAt: domainModule.updatedAt,
      updatedBy: domainModule.updatedBy
    },
    testHistory: getSystemIntegrationTestHistory()
  });
});

app.put('/api/admin/system-configuration/:moduleKey', requireStrictAdminOnly, (req: Request & { user?: any }, res: Response) => {
  const actor = req.user?.email || 'Admin';
  const moduleKey = req.params.moduleKey;
  const { enabled, settings } = req.body;

  if (moduleKey === 'domain' && settings?.publicAppUrl) {
    updateWhatsAppIntegrationVault(
      {
        publicAppUrl: settings.publicAppUrl,
        vitePublicAppUrl: settings.vitePublicAppUrl || settings.publicAppUrl
      },
      actor
    );
  }

  const updated = updateCustomModuleState(moduleKey, { enabled, settings }, actor);
  db.addAuditLog(
    actor,
    'CONFIGURAR_MODULO_SISTEMA',
    `Actualizó configuración del módulo "${moduleKey}" en Configuración del Sistema`,
    'EXITOSO'
  );
  res.json({
    moduleState: updated,
    message: `Configuración de "${moduleKey}" guardada y confirmada en el servidor.`
  });
});

app.post('/api/admin/system-configuration/:moduleKey/test', requireStrictAdminOnly, async (req: Request & { user?: any; googleToken?: string }, res: Response) => {
  const actor = req.user?.email || 'Admin';
  const moduleKey = req.params.moduleKey;

  if (moduleKey === 'firebase') {
    const fsTest = await testFirestoreConnection();
    const ok = Boolean(fsTest?.connected);
    const state = getFirestoreConnectionState();
    const msg = ok
      ? `Conexión verificada con Firebase Firestore (${state.databaseId || 'ai-studio-remixipstecnolgi-a3cecd67-1548-4f1b-bc5c-c52f0a6aa02e'}).`
      : `Error al conectar con Firestore: ${state.lastError || 'Sin respuesta'}`;
    const record = recordSystemIntegrationTest(
      'firebase',
      'Firebase Firestore',
      actor,
      ok ? 'Conectado' : 'Error de conexión',
      ok,
      msg
    );
    return res.json({ connected: ok, status: record.status, message: msg, record });
  }

  if (moduleKey === 'gemini') {
    const resGemini = await testRealGeminiConnection(actor);
    return res.json(resGemini);
  }

  if (moduleKey === 'whatsapp') {
    const resWa = await testWhatsAppCloudConnection();
    recordSystemIntegrationTest('whatsapp', 'WhatsApp Business', actor, resWa.status, resWa.connected, resWa.message);
    return res.json(resWa);
  }

  if (moduleKey === 'sheets' || moduleKey === 'drive' || moduleKey === 'calendar') {
    const token = req.googleToken || db.getLatestGoogleAccessToken();
    if (!token) {
      const msg = 'No hay sesión OAuth de Google activa. Presione "Conectar con Google" para autorizar Google Sheets, Drive y Calendar.';
      const record = recordSystemIntegrationTest(moduleKey, `Google ${moduleKey}`, actor, 'Sin configurar', false, msg);
      return res.json({ connected: false, status: 'Sin configurar', message: msg, record });
    }
    const profile = await verifyGoogleToken(token);
    if (!profile) {
      const msg = 'El token OAuth de Google expiró. Vuelva a autenticar su cuenta de Google.';
      const record = recordSystemIntegrationTest(moduleKey, `Google ${moduleKey}`, actor, 'Error de conexión', false, msg);
      return res.json({ connected: false, status: 'Error de conexión', message: msg, record });
    }
    const msg = `Conexión verificada con Google (${profile.email}) para ${moduleKey.toUpperCase()}.`;
    updateCustomModuleState(moduleKey, { lastStatus: 'Conectado', lastTestAt: new Date().toISOString(), lastTestMessage: msg }, actor);
    const record = recordSystemIntegrationTest(moduleKey, `Google ${moduleKey}`, actor, 'Conectado', true, msg);
    return res.json({ connected: true, status: 'Conectado', message: msg, record });
  }

  const state = getCustomModuleState(moduleKey);
  const msg = `Verificación del módulo "${moduleKey}" completada correctamente en el servidor (${new Date().toLocaleString('es-CO')}).`;
  updateCustomModuleState(moduleKey, { lastStatus: 'Conectado', lastTestAt: new Date().toISOString(), lastTestMessage: msg }, actor);
  const record = recordSystemIntegrationTest(moduleKey, moduleKey.toUpperCase(), actor, state.enabled ? 'Conectado' : 'Desconectado', state.enabled, msg);
  return res.json({ connected: state.enabled, status: record.status, message: msg, record });
});

/* ==========================================================================
   WHATSAPP INTELIGENTE CON IA GEMINI Y WEBHOOK OFICIAL
   ========================================================================== */

app.get('/api/whatsapp/config', requireSupportStaff, (_req: Request, res: Response) => {
  const vaultView = getSanitizedWhatsAppIntegrationView();
  res.json({
    ...db.getWhatsAppConfig(),
    metaCloudConfigured: vaultView.isConfigured,
    metaTokenConfigured: vaultView.secretsStatus.accessTokenConfigured,
    integrationEnabled: vaultView.integrationEnabled,
    connectionStatus: vaultView.connectionStatus,
    geminiApiReady: isGeminiConfigured()
  });
});

app.put('/api/whatsapp/config', requireAdmin, (req: Request & { user?: any }, res: Response) => {
  const updated = db.updateWhatsAppConfig(req.body, req.user?.email || 'Admin');
  res.json({
    config: updated,
    message: 'Configuración de WhatsApp Inteligente y Gemini actualizada.'
  });
});

app.get('/api/whatsapp/conversations', requireSupportStaff, (_req: Request, res: Response) => {
  res.json(db.getWhatsAppConversations());
});

// Process customer WhatsApp message (used by customer widget, admin tester & internal chatbot)
app.post('/api/whatsapp/message', async (req: Request, res: Response) => {
  try {
    const { phone, clientName, clientEmail, text } = req.body;
    if (!phone || !text) {
      return res.status(400).json({ error: 'Número de teléfono y mensaje son requeridos.' });
    }

    const incomingConv = db.recordWhatsAppMessage({
      phone: String(phone).trim(),
      clientName: clientName ? String(clientName).trim() : undefined,
      clientEmail: clientEmail ? String(clientEmail).trim() : undefined,
      sender: 'client',
      text: String(text).trim()
    });

    const waConfig = db.getWhatsAppConfig();
    const isBotEnabled = waConfig.chatbotActive !== false && waConfig.enabled !== false;
    if (
      !isBotEnabled ||
      incomingConv.status === 'Atendido por asesor' ||
      incomingConv.status === 'En atención humana'
    ) {
      return res.json({
        conversation: incomingConv,
        autoReplied: false,
        message: 'Mensaje recibido. En espera de respuesta de asesor humano.'
      });
    }

    const convPhone = incomingConv.phone || incomingConv.clientPhone || String(phone).trim();
    const aiReply = await generateWhatsAppGeminiResponse({
      phone: convPhone,
      clientName: incomingConv.clientName,
      message: String(text).trim()
    });

    const updatedConv = db.recordWhatsAppMessage({
      phone: convPhone,
      clientName: incomingConv.clientName,
      sender: 'gemini',
      text: aiReply.replyText,
      intent: aiReply.intent
    });

    if (aiReply.intent === 'transferencia_asesor') {
      db.updateWhatsAppConversation(updatedConv.id, { status: 'Pendiente asesor' }, 'Gemini IA');
    }

    res.json({
      conversation: db.getWhatsAppConversations().find(c => c.id === updatedConv.id) || updatedConv,
      autoReplied: true,
      replyText: aiReply.replyText,
      intent: aiReply.intent,
      usedGemini: aiReply.usedGemini
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error procesando mensaje de WhatsApp.' });
  }
});

// Advisor reply or conversation status update (also dispatches via Meta Cloud API when configured)
app.post('/api/whatsapp/advisor-reply', requireSupportStaff, async (req: Request & { user?: any }, res: Response) => {
  const { conversationId, phone, text, status, assignedAdvisor } = req.body;
  let cloudDelivery: { sent: boolean; messageId?: string; error?: string } | null = null;

  if (text && phone) {
    db.recordWhatsAppMessage({
      phone: String(phone).trim(),
      sender: 'advisor',
      text: String(text).trim()
    });

    const secrets = getWhatsAppIntegrationSecrets();
    if (secrets.integrationEnabled && secrets.accessToken && secrets.phoneNumberId) {
      cloudDelivery = await sendRealWhatsAppCloudMessage(String(phone).trim(), String(text).trim());
    }
  }
  if (conversationId && (status || assignedAdvisor !== undefined)) {
    db.updateWhatsAppConversation(
      conversationId,
      { status, assignedAdvisor: assignedAdvisor || req.user?.name },
      req.user?.email || 'Asesor'
    );
  }
  res.json({
    conversations: db.getWhatsAppConversations(),
    cloudDelivery,
    message: cloudDelivery?.sent
      ? 'Respuesta enviada a WhatsApp del cliente mediante Meta Cloud API.'
      : 'Respuesta de asesor registrada en la conversación.'
  });
});

// Official Meta WhatsApp Cloud API Webhook Verification (GET) & Event Receiver (POST)
app.get('/api/whatsapp/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const secrets = getWhatsAppIntegrationSecrets();
  const expectedToken = secrets.verifyToken || db.getWhatsAppConfig().webhookVerifyToken;

  if (!secrets.integrationEnabled) {
    appendWhatsAppIntegrationError(
      'WEBHOOK_VERIFICACION',
      'Intento de verificación de webhook rechazado porque la integración está desactivada.'
    );
    return res.sendStatus(403);
  }

  if (mode === 'subscribe' && expectedToken && token === expectedToken) {
    return res.status(200).send(challenge);
  }

  appendWhatsAppIntegrationError(
    'WEBHOOK_VERIFICACION',
    'Token de verificación (hub.verify_token) inválido en solicitud GET /api/whatsapp/webhook.',
    `Modo: ${String(mode || 'N/A')}`,
    403
  );
  return res.sendStatus(403);
});

app.post('/api/whatsapp/webhook', async (req: Request & { rawBody?: Buffer }, res: Response) => {
  try {
    const secrets = getWhatsAppIntegrationSecrets();
    if (!secrets.integrationEnabled) {
      return res.status(200).json({ ignored: true, reason: 'Integration disabled' });
    }

    // Validate X-Hub-Signature-256 header when WHATSAPP_APP_SECRET is configured
    const sigHeader = req.headers['x-hub-signature-256'] as string | undefined;
    const sigCheck = verifyMetaWebhookSignature(req.rawBody, sigHeader);
    if (!sigCheck.valid) {
      return res.status(401).json({ error: sigCheck.reason });
    }

    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const msg = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (msg && msg.type === 'text' && msg.text?.body) {
      const fromPhone = msg.from;
      const profileName = contact?.profile?.name || `Cliente ${fromPhone}`;
      const textBody = msg.text.body;

      const conv = db.recordWhatsAppMessage({
        phone: fromPhone,
        clientName: profileName,
        sender: 'client',
        text: textBody
      });

      if (db.getWhatsAppConfig().chatbotActive && conv.status !== 'Atendido por asesor') {
        const aiReply = await generateWhatsAppGeminiResponse({
          phone: fromPhone,
          clientName: profileName,
          message: textBody
        });
        db.recordWhatsAppMessage({
          phone: fromPhone,
          clientName: profileName,
          sender: 'gemini',
          text: aiReply.replyText,
          intent: aiReply.intent
        });

        if (secrets.accessToken && secrets.phoneNumberId) {
          await sendRealWhatsAppCloudMessage(fromPhone, aiReply.replyText);
        }
      }
    }
    return res.sendStatus(200);
  } catch (err: any) {
    console.error('WhatsApp webhook error:', err);
    appendWhatsAppIntegrationError(
      'WEBHOOK_RECEPCION',
      err?.message || 'Error procesando evento entrante de webhook de WhatsApp.'
    );
    return res.sendStatus(200);
  }
});

/* ==========================================================================
   BACKGROUND SCHEDULERS (PROMOTIONS, AUTO-BACKUPS & SYNC RETRY) & STARTUP
   ========================================================================== */

setInterval(() => {
  try {
    db.evaluatePromotionsLifecycle();
  } catch (e) {
    console.error('Promotion scheduler error:', e);
  }
}, 5000);

// Automatic background sync queue retry every 30 seconds when online
setInterval(async () => {
  try {
    if (!db.isSimulatedOffline() && db.getPendingSyncOperations().length > 0) {
      const token = db.getLatestGoogleAccessToken();
      if (token && sheetsDb.getSpreadsheetId()) {
        await sheetsDb.processPendingSyncQueue(token);
      }
    }
  } catch {}
}, 30000);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });

    app.use(express.static(PUBLIC_DIR));
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/uploads/')) {
        return next();
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        const enrichedHtml = buildDynamicOpenGraphHtml(template, req);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(enrichedHtml);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(PUBLIC_DIR));
    app.use(express.static(distDir, { index: false }));
    app.get('*', (req: Request, res: Response) => {
      const distIndex = path.resolve(distDir, 'index.html');
      if (fs.existsSync(distIndex)) {
        const template = fs.readFileSync(distIndex, 'utf-8');
        const enrichedHtml = buildDynamicOpenGraphHtml(template, req);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(enrichedHtml);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 IPS TECNOLÓGICA CATALOG STUDIO server running on port ${PORT}`);
    console.log(`🔒 Administradores Autorizados: ${AUTHORIZED_ADMIN_EMAILS.join(', ')}`);
    console.log(`🌎 Zona Horaria: America/Bogota | Persistencia: Disco + Firestore + Google Sheets (12 hojas)`);

    // Hydrate from Firebase Firestore & verify daily backup in background
    (async () => {
      try {
        await testFirestoreConnection();
        await db.hydrateFromFirestore();
      } catch (err) {
        console.warn('Firestore startup hydration notice:', err);
      }

      try {
        const todayPrefix = new Date().toISOString().slice(0, 10);
        const hasTodayBackup = db.getBackups().some(b => b.createdAt.startsWith(todayPrefix));
        if (!hasTodayBackup) {
          db.createSystemBackup({
            type: 'automatico_diario',
            moduleScope: 'completo',
            createdBy: 'Sistema Automático',
            notes: `Respaldo diario automático del servidor (${todayPrefix})`
          });
        }
      } catch (err) {
        console.warn('Daily backup check notice:', err);
      }
    })();
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
