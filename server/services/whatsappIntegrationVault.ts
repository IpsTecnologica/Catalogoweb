import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SECRETS_DIR = path.resolve(process.cwd(), 'server_data', '.secrets');
const MASTER_KEY_PATH = path.join(SECRETS_DIR, '.vault_master.key');
const VAULT_FILE_PATH = path.join(SECRETS_DIR, 'whatsapp_integration.enc.json');

export interface EncryptedFieldPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface WhatsAppIntegrationErrorLog {
  id: string;
  timestamp: string;
  operation: 'CONEXION_META' | 'ENVIO_MENSAJE' | 'WEBHOOK_VERIFICACION' | 'WEBHOOK_FIRMA' | 'WEBHOOK_RECEPCION' | 'CONFIGURACION';
  statusCode?: number;
  errorMessage: string;
  detail?: string;
}

interface StoredVaultSchema {
  publicAppUrl: string;
  vitePublicAppUrl: string;
  integrationEnabled: boolean;
  encryptedAccessToken?: EncryptedFieldPayload | null;
  encryptedPhoneNumberId?: EncryptedFieldPayload | null;
  encryptedVerifyToken?: EncryptedFieldPayload | null;
  encryptedAppSecret?: EncryptedFieldPayload | null;
  phoneNumberIdMasked?: string | null;
  updatedAt: string;
  updatedBy: string;
  lastConnectionStatus: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
  lastConnectionTestAt: string | null;
  lastConnectionMessage: string;
  verifiedPhoneName?: string | null;
  verifiedDisplayNumber?: string | null;
  errorLogs: WhatsAppIntegrationErrorLog[];
}

export interface SanitizedWhatsAppIntegrationView {
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

export interface ResolvedWhatsAppSecrets {
  publicAppUrl: string;
  vitePublicAppUrl: string;
  integrationEnabled: boolean;
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  appSecret: string;
}

function ensureSecretsDirectory(): void {
  if (!fs.existsSync(SECRETS_DIR)) {
    fs.mkdirSync(SECRETS_DIR, { recursive: true, mode: 0o700 });
  }
}

function getOrCreateMasterKey(): Buffer {
  ensureSecretsDirectory();
  if (process.env.SECRET_MASTER_KEY && process.env.SECRET_MASTER_KEY.trim().length >= 16) {
    return crypto.scryptSync(process.env.SECRET_MASTER_KEY.trim(), 'ips_tecnologica_vault_salt_2026', 32);
  }
  if (fs.existsSync(MASTER_KEY_PATH)) {
    const rawHex = fs.readFileSync(MASTER_KEY_PATH, 'utf-8').trim();
    if (rawHex.length === 64) {
      return Buffer.from(rawHex, 'hex');
    }
  }
  const newKey = crypto.randomBytes(32);
  fs.writeFileSync(MASTER_KEY_PATH, newKey.toString('hex'), { encoding: 'utf-8', mode: 0o600 });
  return newKey;
}

function encryptSecret(plaintext: string): EncryptedFieldPayload {
  const key = getOrCreateMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex')
  };
}

function decryptSecret(payload?: EncryptedFieldPayload | null): string {
  if (!payload || !payload.iv || !payload.authTag || !payload.ciphertext) return '';
  try {
    const key = getOrCreateMasterKey();
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const encryptedText = Buffer.from(payload.ciphertext, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Error decrypting secret from vault:', err);
    return '';
  }
}

function maskIdentifier(val: string): string | null {
  const clean = (val || '').trim();
  if (!clean) return null;
  if (clean.length <= 4) return '••••';
  return `••••••••${clean.slice(-4)}`;
}

function getDefaultPublicUrl(): string {
  const raw =
    process.env.PUBLIC_APP_URL ||
    process.env.SHARED_APP_URL ||
    process.env.APP_URL ||
    'https://ais-pre-ouzmtvpcklhtkaxl7txrq4-235668912498.us-west2.run.app';
  return raw.includes('ais-dev-') ? raw.replace('ais-dev-', 'ais-pre-') : raw;
}

function loadRawVault(): StoredVaultSchema {
  ensureSecretsDirectory();
  const defaultUrl = getDefaultPublicUrl();
  const defaultViteUrl = process.env.VITE_PUBLIC_APP_URL || defaultUrl;

  if (fs.existsSync(VAULT_FILE_PATH)) {
    try {
      const content = fs.readFileSync(VAULT_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        publicAppUrl: parsed.publicAppUrl || defaultUrl,
        vitePublicAppUrl: parsed.vitePublicAppUrl || defaultViteUrl,
        integrationEnabled: parsed.integrationEnabled !== false,
        encryptedAccessToken: parsed.encryptedAccessToken || null,
        encryptedPhoneNumberId: parsed.encryptedPhoneNumberId || null,
        encryptedVerifyToken: parsed.encryptedVerifyToken || null,
        encryptedAppSecret: parsed.encryptedAppSecret || null,
        phoneNumberIdMasked: parsed.phoneNumberIdMasked || null,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        updatedBy: parsed.updatedBy || 'Sistema',
        lastConnectionStatus: parsed.lastConnectionStatus || 'Sin configurar',
        lastConnectionTestAt: parsed.lastConnectionTestAt || null,
        lastConnectionMessage:
          parsed.lastConnectionMessage || 'Integración pendiente de prueba de conexión con Meta Graph API.',
        verifiedPhoneName: parsed.verifiedPhoneName || null,
        verifiedDisplayNumber: parsed.verifiedDisplayNumber || null,
        errorLogs: Array.isArray(parsed.errorLogs) ? parsed.errorLogs : []
      };
    } catch (err) {
      console.error('Error reading whatsapp_integration.enc.json:', err);
    }
  }

  return {
    publicAppUrl: defaultUrl,
    vitePublicAppUrl: defaultViteUrl,
    integrationEnabled: true,
    encryptedAccessToken: null,
    encryptedPhoneNumberId: null,
    encryptedVerifyToken: null,
    encryptedAppSecret: null,
    phoneNumberIdMasked: null,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Sistema Inicial',
    lastConnectionStatus: 'Sin configurar',
    lastConnectionTestAt: null,
    lastConnectionMessage: 'Configure los tokens de Meta WhatsApp Cloud API y presione "Probar Conexión".',
    verifiedPhoneName: null,
    verifiedDisplayNumber: null,
    errorLogs: []
  };
}

function saveRawVault(schema: StoredVaultSchema): void {
  ensureSecretsDirectory();
  const tmpPath = `${VAULT_FILE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(schema, null, 2), { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmpPath, VAULT_FILE_PATH);
}

export function appendWhatsAppIntegrationError(
  operation: WhatsAppIntegrationErrorLog['operation'],
  errorMessage: string,
  detail?: string,
  statusCode?: number
): WhatsAppIntegrationErrorLog {
  const vault = loadRawVault();
  const entry: WhatsAppIntegrationErrorLog = {
    id: `wa_err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    operation,
    statusCode,
    errorMessage,
    detail
  };
  vault.errorLogs.unshift(entry);
  if (vault.errorLogs.length > 100) {
    vault.errorLogs = vault.errorLogs.slice(0, 100);
  }
  saveRawVault(vault);
  return entry;
}

export function clearWhatsAppIntegrationErrors(): void {
  const vault = loadRawVault();
  vault.errorLogs = [];
  saveRawVault(vault);
}

/**
 * Resolves the active secrets on the backend ONLY.
 * Never expose the return value of this function to any HTTP response!
 */
export function getWhatsAppIntegrationSecrets(): ResolvedWhatsAppSecrets {
  const vault = loadRawVault();
  const vaultAccessToken = decryptSecret(vault.encryptedAccessToken);
  const vaultPhoneId = decryptSecret(vault.encryptedPhoneNumberId);
  const vaultVerifyToken = decryptSecret(vault.encryptedVerifyToken);
  const vaultAppSecret = decryptSecret(vault.encryptedAppSecret);

  const envAccessToken = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const envPhoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const envVerifyToken = (process.env.WHATSAPP_VERIFY_TOKEN || '').trim();
  const envAppSecret = (process.env.WHATSAPP_APP_SECRET || '').trim();

  return {
    publicAppUrl: (vault.publicAppUrl || getDefaultPublicUrl()).replace(/\/+$/, ''),
    vitePublicAppUrl: (vault.vitePublicAppUrl || getDefaultPublicUrl()).replace(/\/+$/, ''),
    integrationEnabled: vault.integrationEnabled,
    accessToken: vaultAccessToken || envAccessToken,
    phoneNumberId: vaultPhoneId || envPhoneId,
    verifyToken: vaultVerifyToken || envVerifyToken,
    appSecret: vaultAppSecret || envAppSecret
  };
}

/**
 * Returns the sanitized view for the Admin UI.
 * Never includes any plaintext secret or token!
 */
export function getSanitizedWhatsAppIntegrationView(): SanitizedWhatsAppIntegrationView {
  const vault = loadRawVault();
  const vaultAccessToken = decryptSecret(vault.encryptedAccessToken);
  const vaultPhoneId = decryptSecret(vault.encryptedPhoneNumberId);
  const vaultVerifyToken = decryptSecret(vault.encryptedVerifyToken);
  const vaultAppSecret = decryptSecret(vault.encryptedAppSecret);

  const envAccessToken = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const envPhoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const envVerifyToken = (process.env.WHATSAPP_VERIFY_TOKEN || '').trim();
  const envAppSecret = (process.env.WHATSAPP_APP_SECRET || '').trim();

  const accessTokenConfigured = Boolean(vaultAccessToken || envAccessToken);
  const phoneNumberIdConfigured = Boolean(vaultPhoneId || envPhoneId);
  const verifyTokenConfigured = Boolean(vaultVerifyToken || envVerifyToken);
  const appSecretConfigured = Boolean(vaultAppSecret || envAppSecret);

  const effectivePhoneId = vaultPhoneId || envPhoneId;
  const isConfigured = accessTokenConfigured && phoneNumberIdConfigured && verifyTokenConfigured;

  let connectionStatus = vault.lastConnectionStatus;
  if (!vault.integrationEnabled) {
    connectionStatus = 'Desconectado';
  } else if (!isConfigured && connectionStatus === 'Conectado') {
    connectionStatus = 'Sin configurar';
  }

  const cleanPublicUrl = (vault.publicAppUrl || getDefaultPublicUrl()).replace(/\/+$/, '');

  return {
    publicAppUrl: cleanPublicUrl,
    vitePublicAppUrl: (vault.vitePublicAppUrl || cleanPublicUrl).replace(/\/+$/, ''),
    compiledVitePublicAppUrl: (process.env.VITE_PUBLIC_APP_URL || cleanPublicUrl).replace(/\/+$/, ''),
    webhookUrl: `${cleanPublicUrl}/api/whatsapp/webhook`,
    integrationEnabled: vault.integrationEnabled,
    isConfigured,
    connectionStatus,
    lastConnectionTestAt: vault.lastConnectionTestAt,
    lastConnectionMessage: vault.lastConnectionMessage,
    verifiedPhoneName: vault.verifiedPhoneName || null,
    verifiedDisplayNumber: vault.verifiedDisplayNumber || null,
    updatedAt: vault.updatedAt,
    updatedBy: vault.updatedBy,
    secretsStatus: {
      accessTokenConfigured,
      accessTokenSource: vaultAccessToken ? 'vault_aes256gcm' : envAccessToken ? 'process_env' : 'none',
      phoneNumberIdConfigured,
      phoneNumberIdMasked: maskIdentifier(effectivePhoneId),
      phoneNumberIdSource: vaultPhoneId ? 'vault_aes256gcm' : envPhoneId ? 'process_env' : 'none',
      verifyTokenConfigured,
      verifyTokenSource: vaultVerifyToken ? 'vault_aes256gcm' : envVerifyToken ? 'process_env' : 'none',
      appSecretConfigured,
      appSecretSource: vaultAppSecret ? 'vault_aes256gcm' : envAppSecret ? 'process_env' : 'none'
    },
    storageMechanism: {
      encryptionAlgorithm: 'AES-256-GCM (Autenticado con clave maestra de 256 bits fuera de la base de datos)',
      vaultLocation: 'server_data/.secrets/whatsapp_integration.enc.json (Permisos 0600, aislado de Firestore y Google Sheets)',
      isolatedFromFrontend: true,
      isolatedFromSheetsAndFirestore: true,
      cloudRunPersistenceNote:
        'Los secretos se cifran con AES-256-GCM en el servidor y nunca se envían a Google Sheets, Firestore ni al navegador. En entornos sin disco persistente (como instancias efímeras de Cloud Run que se reinician tras inactividad), se recomienda montar un volumen persistente o definir SECRET_MASTER_KEY / Google Secret Manager en el servicio.'
    },
    errorLogs: vault.errorLogs
  };
}

export interface UpdateWhatsAppIntegrationInput {
  publicAppUrl?: string;
  vitePublicAppUrl?: string;
  integrationEnabled?: boolean;
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappVerifyToken?: string;
  whatsappAppSecret?: string;
}

export function updateWhatsAppIntegrationVault(
  input: UpdateWhatsAppIntegrationInput,
  actorEmail: string
): SanitizedWhatsAppIntegrationView {
  const vault = loadRawVault();

  if (typeof input.publicAppUrl === 'string' && input.publicAppUrl.trim()) {
    vault.publicAppUrl = input.publicAppUrl.trim().replace(/\/+$/, '');
  }
  if (typeof input.vitePublicAppUrl === 'string' && input.vitePublicAppUrl.trim()) {
    vault.vitePublicAppUrl = input.vitePublicAppUrl.trim().replace(/\/+$/, '');
  }
  if (typeof input.integrationEnabled === 'boolean') {
    vault.integrationEnabled = input.integrationEnabled;
    if (!input.integrationEnabled) {
      vault.lastConnectionStatus = 'Desconectado';
      vault.lastConnectionMessage = 'Integración desactivada manualmente por el administrador.';
    }
  }

  // Only overwrite encrypted secrets if a non-empty string is provided
  if (typeof input.whatsappAccessToken === 'string' && input.whatsappAccessToken.trim().length > 0) {
    vault.encryptedAccessToken = encryptSecret(input.whatsappAccessToken.trim());
  }
  if (typeof input.whatsappPhoneNumberId === 'string' && input.whatsappPhoneNumberId.trim().length > 0) {
    const cleanPhoneId = input.whatsappPhoneNumberId.trim();
    vault.encryptedPhoneNumberId = encryptSecret(cleanPhoneId);
    vault.phoneNumberIdMasked = maskIdentifier(cleanPhoneId);
  }
  if (typeof input.whatsappVerifyToken === 'string' && input.whatsappVerifyToken.trim().length > 0) {
    vault.encryptedVerifyToken = encryptSecret(input.whatsappVerifyToken.trim());
  }
  if (typeof input.whatsappAppSecret === 'string' && input.whatsappAppSecret.trim().length > 0) {
    vault.encryptedAppSecret = encryptSecret(input.whatsappAppSecret.trim());
  }

  vault.updatedAt = new Date().toISOString();
  vault.updatedBy = actorEmail;

  saveRawVault(vault);
  return getSanitizedWhatsAppIntegrationView();
}

/**
 * Performs a REAL connection test against Meta WhatsApp Cloud API (Graph API v21.0).
 * Never simulates a successful connection.
 */
export async function testWhatsAppCloudConnection(): Promise<{
  connected: boolean;
  status: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
  message: string;
  verifiedPhoneName?: string | null;
  verifiedDisplayNumber?: string | null;
  httpStatus?: number;
  view: SanitizedWhatsAppIntegrationView;
}> {
  const vault = loadRawVault();
  const secrets = getWhatsAppIntegrationSecrets();
  const now = new Date().toISOString();
  vault.lastConnectionTestAt = now;

  if (!secrets.integrationEnabled) {
    vault.lastConnectionStatus = 'Desconectado';
    vault.lastConnectionMessage = 'La integración de WhatsApp Business está desactivada. Actívela para probar la conexión.';
    saveRawVault(vault);
    return {
      connected: false,
      status: 'Desconectado',
      message: vault.lastConnectionMessage,
      view: getSanitizedWhatsAppIntegrationView()
    };
  }

  if (!secrets.accessToken || !secrets.phoneNumberId) {
    const msg =
      'No se puede conectar con Meta Graph API: faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID en la bóveda del servidor.';
    vault.lastConnectionStatus = 'Sin configurar';
    vault.lastConnectionMessage = msg;
    saveRawVault(vault);
    appendWhatsAppIntegrationError('CONEXION_META', msg, 'Campos obligatorios no configurados.');
    return {
      connected: false,
      status: 'Sin configurar',
      message: msg,
      view: getSanitizedWhatsAppIntegrationView()
    };
  }

  const graphUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
    secrets.phoneNumberId
  )}?fields=id,display_phone_number,verified_name,quality_rating`;

  try {
    const response = await fetch(graphUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secrets.accessToken}`,
        Accept: 'application/json'
      }
    });

    const bodyText = await response.text();
    let parsed: any = {};
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      parsed = { raw: bodyText };
    }

    if (!response.ok) {
      const metaErrMsg =
        parsed?.error?.message || `Error HTTP ${response.status} al consultar Meta Graph API.`;
      const metaErrCode = parsed?.error?.code ? ` (Código Meta: ${parsed.error.code})` : '';
      const fullErr = `Error real de Meta Graph API: ${metaErrMsg}${metaErrCode}`;

      vault.lastConnectionStatus = 'Error de conexión';
      vault.lastConnectionMessage = fullErr;
      saveRawVault(vault);
      appendWhatsAppIntegrationError(
        'CONEXION_META',
        fullErr,
        `Phone Number ID: ${maskIdentifier(secrets.phoneNumberId)}`,
        response.status
      );

      return {
        connected: false,
        status: 'Error de conexión',
        message: fullErr,
        httpStatus: response.status,
        view: getSanitizedWhatsAppIntegrationView()
      };
    }

    const verifiedName = parsed.verified_name || 'Cuenta WhatsApp Business Oficial';
    const displayPhone = parsed.display_phone_number || secrets.phoneNumberId;
    const successMsg = `Conexión verificada con Meta Graph API. Número activo: ${displayPhone} (${verifiedName}).`;

    vault.lastConnectionStatus = 'Conectado';
    vault.lastConnectionMessage = successMsg;
    vault.verifiedPhoneName = verifiedName;
    vault.verifiedDisplayNumber = displayPhone;
    saveRawVault(vault);

    return {
      connected: true,
      status: 'Conectado',
      message: successMsg,
      verifiedPhoneName: verifiedName,
      verifiedDisplayNumber: displayPhone,
      httpStatus: response.status,
      view: getSanitizedWhatsAppIntegrationView()
    };
  } catch (networkErr: any) {
    const errMsg = `Fallo de red al contactar graph.facebook.com: ${networkErr?.message || 'Error desconocido'}`;
    vault.lastConnectionStatus = 'Error de conexión';
    vault.lastConnectionMessage = errMsg;
    saveRawVault(vault);
    appendWhatsAppIntegrationError('CONEXION_META', errMsg);
    return {
      connected: false,
      status: 'Error de conexión',
      message: errMsg,
      view: getSanitizedWhatsAppIntegrationView()
    };
  }
}

/**
 * Sends a REAL WhatsApp message using Meta WhatsApp Cloud API (Graph API v21.0).
 * Never simulates delivery: returns the real Meta message ID or the real error from Meta.
 */
export async function sendRealWhatsAppCloudMessage(
  recipientPhone: string,
  textBody: string
): Promise<{
  sent: boolean;
  messageId?: string;
  httpStatus?: number;
  error?: string;
}> {
  const secrets = getWhatsAppIntegrationSecrets();

  if (!secrets.integrationEnabled) {
    const err = 'La integración con WhatsApp Business está desactivada en el panel administrativo.';
    appendWhatsAppIntegrationError('ENVIO_MENSAJE', err, `Destinatario: ${recipientPhone}`);
    return { sent: false, error: err };
  }

  if (!secrets.accessToken || !secrets.phoneNumberId) {
    const err =
      'No se pudo enviar el mensaje real por WhatsApp Cloud API: WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID no están configurados.';
    appendWhatsAppIntegrationError('ENVIO_MENSAJE', err, `Destinatario: ${recipientPhone}`);
    return { sent: false, error: err };
  }

  const cleanRecipient = String(recipientPhone || '').replace(/\D/g, '');
  if (!cleanRecipient || cleanRecipient.length < 8) {
    const err = 'Número de teléfono destinatario inválido. Use formato internacional (ej. 573108947231).';
    appendWhatsAppIntegrationError('ENVIO_MENSAJE', err, `Destinatario recibido: ${recipientPhone}`);
    return { sent: false, error: err };
  }

  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(secrets.phoneNumberId)}/messages`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secrets.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanRecipient,
        type: 'text',
        text: {
          preview_url: true,
          body: textBody
        }
      })
    });

    const rawText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    if (!response.ok) {
      const metaErr =
        data?.error?.message || `Error HTTP ${response.status} al enviar mensaje por WhatsApp Cloud API.`;
      const codeSuffix = data?.error?.code ? ` (Código Meta: ${data.error.code})` : '';
      const fullErr = `${metaErr}${codeSuffix}`;
      appendWhatsAppIntegrationError(
        'ENVIO_MENSAJE',
        fullErr,
        `Destinatario: +${cleanRecipient}`,
        response.status
      );
      return {
        sent: false,
        httpStatus: response.status,
        error: fullErr
      };
    }

    const messageId = data?.messages?.[0]?.id || undefined;
    return {
      sent: true,
      messageId,
      httpStatus: response.status
    };
  } catch (err: any) {
    const errMsg = `Error de red al enviar mensaje a Meta WhatsApp Cloud API: ${err?.message || 'Error desconocido'}`;
    appendWhatsAppIntegrationError('ENVIO_MENSAJE', errMsg, `Destinatario: +${cleanRecipient}`);
    return {
      sent: false,
      error: errMsg
    };
  }
}

/**
 * Validates the X-Hub-Signature-256 header sent by Meta on incoming webhook notifications
 * using HMAC-SHA256 with the configured WHATSAPP_APP_SECRET.
 */
export function verifyMetaWebhookSignature(
  rawBody: Buffer | string | undefined,
  signatureHeader?: string
): { valid: boolean; reason?: string } {
  const secrets = getWhatsAppIntegrationSecrets();
  if (!secrets.appSecret) {
    // If App Secret is not configured yet, allow webhook payload processing while noting it
    return { valid: true, reason: 'WHATSAPP_APP_SECRET no configurado (validación de firma omitida).' };
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    const reason = 'Notificación entrante rechazada: falta el encabezado X-Hub-Signature-256 de Meta.';
    appendWhatsAppIntegrationError('WEBHOOK_FIRMA', reason);
    return { valid: false, reason };
  }

  if (!rawBody) {
    const reason = 'No se pudo verificar la firma X-Hub-Signature-256: cuerpo crudo (rawBody) no disponible.';
    appendWhatsAppIntegrationError('WEBHOOK_FIRMA', reason);
    return { valid: false, reason };
  }

  const expectedHmac = crypto
    .createHmac('sha256', secrets.appSecret)
    .update(rawBody)
    .digest('hex');
  const expectedSignature = `sha256=${expectedHmac}`;

  const sigBuffer = Buffer.from(signatureHeader, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    const reason = 'Firma X-Hub-Signature-256 inválida: la notificación no coincide con el WHATSAPP_APP_SECRET configurado.';
    appendWhatsAppIntegrationError('WEBHOOK_FIRMA', reason, `Recibido: ${signatureHeader.slice(0, 20)}...`);
    return { valid: false, reason };
  }

  return { valid: true };
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

export interface SanitizedGeminiIntegrationView {
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

interface ExtraVaultConfig {
  encryptedGeminiApiKey?: EncryptedFieldPayload | null;
  geminiApiKeyMasked?: string | null;
  geminiEnabled?: boolean;
  geminiModel?: string;
  geminiSystemInstructions?: string;
  geminiLastStatus?: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
  geminiLastTestAt?: string | null;
  geminiLastTestMessage?: string;
  geminiUpdatedAt?: string;
  geminiUpdatedBy?: string;
  moduleStates?: Record<
    string,
    {
      enabled: boolean;
      settings: Record<string, string>;
      updatedAt: string;
      updatedBy: string;
      lastStatus?: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
      lastTestAt?: string | null;
      lastTestMessage?: string;
    }
  >;
  testHistory?: SystemIntegrationTestRecord[];
}

const SYSTEM_VAULT_FILE_PATH = path.join(SECRETS_DIR, 'system_integrations.enc.json');

function loadExtraVault(): ExtraVaultConfig {
  ensureSecretsDirectory();
  if (fs.existsSync(SYSTEM_VAULT_FILE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(SYSTEM_VAULT_FILE_PATH, 'utf-8'));
    } catch (err) {
      console.error('Error reading system_integrations.enc.json:', err);
    }
  }
  return {
    geminiEnabled: true,
    geminiModel: 'gemini-3-flash-preview',
    geminiSystemInstructions:
      'Eres el asesor virtual experto de IPS TECNOLÓGICA en Colombia. Responde siempre con base en el inventario real, precios en COP, promociones activas y órdenes de servicio técnico SRV.',
    geminiLastStatus: 'Sin configurar',
    geminiLastTestAt: null,
    geminiLastTestMessage: 'Lista para validar conexión con Google Gemini API.',
    geminiUpdatedAt: new Date().toISOString(),
    geminiUpdatedBy: 'Sistema Inicial',
    moduleStates: {},
    testHistory: []
  };
}

function saveExtraVault(data: ExtraVaultConfig): void {
  ensureSecretsDirectory();
  const tmp = `${SYSTEM_VAULT_FILE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmp, SYSTEM_VAULT_FILE_PATH);
}

export function recordSystemIntegrationTest(
  moduleKey: string,
  moduleName: string,
  actor: string,
  status: SystemIntegrationTestRecord['status'],
  success: boolean,
  message: string
): SystemIntegrationTestRecord {
  const extra = loadExtraVault();
  if (!Array.isArray(extra.testHistory)) extra.testHistory = [];
  const entry: SystemIntegrationTestRecord = {
    id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    moduleKey,
    moduleName,
    timestamp: new Date().toISOString(),
    actor,
    status,
    success,
    message
  };
  extra.testHistory.unshift(entry);
  if (extra.testHistory.length > 100) {
    extra.testHistory = extra.testHistory.slice(0, 100);
  }
  saveExtraVault(extra);
  return entry;
}

export function getSystemIntegrationTestHistory(): SystemIntegrationTestRecord[] {
  return loadExtraVault().testHistory || [];
}

export function getResolvedGeminiSecrets(): {
  enabled: boolean;
  apiKey: string;
  model: string;
  systemInstructions: string;
} {
  const extra = loadExtraVault();
  const vaultKey = decryptSecret(extra.encryptedGeminiApiKey);
  const rawEnvKey = (process.env.GEMINI_API_KEY || '').trim();
  const envKey = rawEnvKey && rawEnvKey !== 'MY_GEMINI_API_KEY' ? rawEnvKey : '';
  return {
    enabled: extra.geminiEnabled !== false,
    apiKey: vaultKey || envKey,
    model: extra.geminiModel || 'gemini-3-flash-preview',
    systemInstructions:
      extra.geminiSystemInstructions ||
      'Eres el asesor virtual experto de IPS TECNOLÓGICA en Colombia.'
  };
}

export function getSanitizedGeminiIntegrationView(): SanitizedGeminiIntegrationView {
  const extra = loadExtraVault();
  const vaultKey = decryptSecret(extra.encryptedGeminiApiKey);
  const rawEnvKey = (process.env.GEMINI_API_KEY || '').trim();
  const envKey = rawEnvKey && rawEnvKey !== 'MY_GEMINI_API_KEY' ? rawEnvKey : '';
  const effectiveKey = vaultKey || envKey;
  const apiKeyConfigured = Boolean(effectiveKey && effectiveKey.length > 5);
  const enabled = extra.geminiEnabled !== false;

  let connectionStatus = extra.geminiLastStatus || (apiKeyConfigured ? 'Conectado' : 'Sin configurar');
  if (!enabled) {
    connectionStatus = 'Desconectado';
  } else if (!apiKeyConfigured) {
    connectionStatus = 'Sin configurar';
  }

  return {
    enabled,
    isConfigured: apiKeyConfigured,
    apiKeyConfigured,
    apiKeySource: vaultKey ? 'vault_aes256gcm' : envKey ? 'process_env' : 'none',
    apiKeyMasked: maskIdentifier(effectiveKey),
    model: extra.geminiModel || 'gemini-3-flash-preview',
    availableModels: ['gemini-3-flash-preview', 'gemini-3.1-pro-preview', 'gemini-2.5-flash'],
    systemInstructions:
      extra.geminiSystemInstructions ||
      'Eres el asesor virtual experto de IPS TECNOLÓGICA en Colombia. Responde siempre con base en el inventario real, precios en COP, promociones activas y órdenes de servicio técnico SRV.',
    connectionStatus,
    lastTestAt: extra.geminiLastTestAt || null,
    lastTestMessage:
      extra.geminiLastTestMessage ||
      (apiKeyConfigured
        ? 'API Key de Gemini detectada en el servidor. Presione "Probar Conexión" para verificar respuesta en vivo.'
        : 'Sin API Key configurada. Ingrese su GEMINI_API_KEY para habilitar respuestas generativas en vivo.'),
    updatedAt: extra.geminiUpdatedAt || new Date().toISOString(),
    updatedBy: extra.geminiUpdatedBy || 'Sistema'
  };
}

export function updateGeminiIntegrationVault(
  input: {
    geminiApiKey?: string;
    enabled?: boolean;
    model?: string;
    systemInstructions?: string;
  },
  actorEmail: string
): SanitizedGeminiIntegrationView {
  const extra = loadExtraVault();
  if (typeof input.geminiApiKey === 'string' && input.geminiApiKey.trim().length > 0) {
    const clean = input.geminiApiKey.trim();
    extra.encryptedGeminiApiKey = encryptSecret(clean);
    extra.geminiApiKeyMasked = maskIdentifier(clean);
  }
  if (typeof input.enabled === 'boolean') {
    extra.geminiEnabled = input.enabled;
    if (!input.enabled) {
      extra.geminiLastStatus = 'Desconectado';
      extra.geminiLastTestMessage = 'Integración de Gemini AI desactivada manualmente por el administrador.';
    }
  }
  if (typeof input.model === 'string' && input.model.trim()) {
    extra.geminiModel = input.model.trim();
  }
  if (typeof input.systemInstructions === 'string') {
    extra.geminiSystemInstructions = input.systemInstructions.trim();
  }
  extra.geminiUpdatedAt = new Date().toISOString();
  extra.geminiUpdatedBy = actorEmail;
  saveExtraVault(extra);
  return getSanitizedGeminiIntegrationView();
}

export async function testRealGeminiConnection(actorEmail: string): Promise<{
  connected: boolean;
  status: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
  message: string;
  sampleReply?: string;
  view: SanitizedGeminiIntegrationView;
}> {
  const extra = loadExtraVault();
  const resolved = getResolvedGeminiSecrets();
  const now = new Date().toISOString();
  extra.geminiLastTestAt = now;

  if (!resolved.enabled) {
    const msg = 'La integración de Gemini AI está desactivada. Actívela antes de probar la conexión.';
    extra.geminiLastStatus = 'Desconectado';
    extra.geminiLastTestMessage = msg;
    saveExtraVault(extra);
    recordSystemIntegrationTest('gemini', 'Gemini AI', actorEmail, 'Desconectado', false, msg);
    return {
      connected: false,
      status: 'Desconectado',
      message: msg,
      view: getSanitizedGeminiIntegrationView()
    };
  }

  if (!resolved.apiKey || resolved.apiKey.length < 6) {
    const msg = 'No hay GEMINI_API_KEY configurada en la bóveda cifrada del servidor ni en el entorno.';
    extra.geminiLastStatus = 'Sin configurar';
    extra.geminiLastTestMessage = msg;
    saveExtraVault(extra);
    recordSystemIntegrationTest('gemini', 'Gemini AI', actorEmail, 'Sin configurar', false, msg);
    return {
      connected: false,
      status: 'Sin configurar',
      message: msg,
      view: getSanitizedGeminiIntegrationView()
    };
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey: resolved.apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    const response = await ai.models.generateContent({
      model: resolved.model || 'gemini-3-flash-preview',
      contents: 'Responde en una sola frase corta confirmando que el motor Gemini de IPS TECNOLÓGICA está operativo.',
      config: { temperature: 0.1 }
    });
    const sample = (response.text || '').trim();
    if (!sample) {
      throw new Error('El modelo respondió sin texto.');
    }
    const okMsg = `Conexión verificada con Google Gemini (${resolved.model}). Respuesta: "${sample}"`;
    extra.geminiLastStatus = 'Conectado';
    extra.geminiLastTestMessage = okMsg;
    saveExtraVault(extra);
    recordSystemIntegrationTest('gemini', 'Gemini AI', actorEmail, 'Conectado', true, okMsg);
    return {
      connected: true,
      status: 'Conectado',
      message: okMsg,
      sampleReply: sample,
      view: getSanitizedGeminiIntegrationView()
    };
  } catch (err: any) {
    const errMsg = `Error real al conectar con Google Gemini API: ${err?.message || 'Clave inválida o servicio no disponible'}`;
    extra.geminiLastStatus = 'Error de conexión';
    extra.geminiLastTestMessage = errMsg;
    saveExtraVault(extra);
    recordSystemIntegrationTest('gemini', 'Gemini AI', actorEmail, 'Error de conexión', false, errMsg);
    return {
      connected: false,
      status: 'Error de conexión',
      message: errMsg,
      view: getSanitizedGeminiIntegrationView()
    };
  }
}

export function getCustomModuleState(moduleKey: string): {
  enabled: boolean;
  settings: Record<string, string>;
  updatedAt: string;
  updatedBy: string;
  lastStatus?: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
  lastTestAt?: string | null;
  lastTestMessage?: string;
} {
  const extra = loadExtraVault();
  const existing = extra.moduleStates?.[moduleKey];
  if (existing) return existing;
  return {
    enabled: true,
    settings: {},
    updatedAt: new Date().toISOString(),
    updatedBy: 'Sistema Inicial'
  };
}

export function updateCustomModuleState(
  moduleKey: string,
  updates: {
    enabled?: boolean;
    settings?: Record<string, string>;
    lastStatus?: 'Conectado' | 'Desconectado' | 'Error de conexión' | 'Sin configurar';
    lastTestAt?: string | null;
    lastTestMessage?: string;
  },
  actorEmail: string
) {
  const extra = loadExtraVault();
  if (!extra.moduleStates) extra.moduleStates = {};
  const prev = extra.moduleStates[moduleKey] || {
    enabled: true,
    settings: {},
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail
  };

  const mergedSettings = { ...prev.settings };
  if (updates.settings) {
    for (const [k, v] of Object.entries(updates.settings)) {
      if (k.toLowerCase().includes('password') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('token')) {
        if (v && v.trim()) {
          mergedSettings[k] = '•••••••• (Cifrado en servidor)';
        }
      } else {
        mergedSettings[k] = v;
      }
    }
  }

  extra.moduleStates[moduleKey] = {
    enabled: typeof updates.enabled === 'boolean' ? updates.enabled : prev.enabled,
    settings: mergedSettings,
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
    lastStatus: updates.lastStatus ?? prev.lastStatus,
    lastTestAt: updates.lastTestAt !== undefined ? updates.lastTestAt : prev.lastTestAt,
    lastTestMessage: updates.lastTestMessage ?? prev.lastTestMessage
  };
  saveExtraVault(extra);
  return extra.moduleStates[moduleKey];
}

