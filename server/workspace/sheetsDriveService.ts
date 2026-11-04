import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.resolve(process.cwd(), 'server_data', 'workspace_config.json');

export interface WorkspaceFolders {
  sheetsDataId: string | null;     // 01_DATOS_Y_REPORTES / 01_BASE_DATOS_Y_REPORTES
  photosId: string | null;         // 02_FOTOS_PRODUCTOS
  pdfsId: string | null;           // 03_CATALOGOS_PDF
  logosId: string | null;          // 04_LOGOS_DOCUMENTOS / 04_LOGOS_Y_DOCUMENTOS_EMPRESA
  clientDocsId: string | null;     // 05_DOCUMENTOS_CLIENTES
  serviceOrdersId: string | null;  // 06_ORDENES_SERVICIO / 06_ORDENES_DE_SERVICIO
  backupsId: string | null;        // 07_RESPALDOS_AUTOMATICOS
  adminReportsId: string | null;   // 08_REPORTES_ADMINISTRATIVOS
  warrantiesId: string | null;     // 09_DOCUMENTOS_GARANTIAS / 09_DOCUMENTOS_DE_GARANTIAS
  accountingDocsId?: string | null; // 10_DOCUMENTOS_CONTABLES
}

export interface WorkspaceConfig {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  rootFolderId: string | null;
  rootFolderUrl: string | null;
  folders: WorkspaceFolders;
  lastSyncedAt: string | null;
  lastBackupAt?: string | null;
}

export function loadWorkspaceConfig(): WorkspaceConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        spreadsheetId: parsed.spreadsheetId || null,
        spreadsheetUrl: parsed.spreadsheetUrl || null,
        rootFolderId: parsed.rootFolderId || null,
        rootFolderUrl: parsed.rootFolderUrl || null,
        folders: {
          sheetsDataId: parsed.folders?.sheetsDataId || null,
          photosId: parsed.folders?.photosId || null,
          pdfsId: parsed.folders?.pdfsId || null,
          logosId: parsed.folders?.logosId || null,
          clientDocsId: parsed.folders?.clientDocsId || null,
          serviceOrdersId: parsed.folders?.serviceOrdersId || null,
          backupsId: parsed.folders?.backupsId || null,
          adminReportsId: parsed.folders?.adminReportsId || null,
          warrantiesId: parsed.folders?.warrantiesId || null,
          accountingDocsId: parsed.folders?.accountingDocsId || null
        },
        lastSyncedAt: parsed.lastSyncedAt || null,
        lastBackupAt: parsed.lastBackupAt || null
      };
    }
  } catch (err) {
    console.error('Error reading workspace_config.json', err);
  }
  return {
    spreadsheetId: null,
    spreadsheetUrl: null,
    rootFolderId: null,
    rootFolderUrl: null,
    folders: {
      sheetsDataId: null,
      photosId: null,
      pdfsId: null,
      logosId: null,
      clientDocsId: null,
      serviceOrdersId: null,
      backupsId: null,
      adminReportsId: null,
      warrantiesId: null,
      accountingDocsId: null
    },
    lastSyncedAt: null,
    lastBackupAt: null
  };
}

export function saveWorkspaceConfig(config: WorkspaceConfig): void {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving workspace_config.json', err);
  }
}

/**
 * Formula injection prevention:
 * Prepend single quote if string begins with =, +, -, @, or tab
 */
export function sanitizeCellValue(val: any): any {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (
      trimmed.startsWith('=') ||
      trimmed.startsWith('+') ||
      trimmed.startsWith('-') ||
      trimmed.startsWith('@') ||
      trimmed.startsWith('\t')
    ) {
      return `'${val}`;
    }
  }
  return val;
}

export function desanitizeCellValue(val: any): string {
  if (
    typeof val === 'string' &&
    val.startsWith("'") &&
    (val.startsWith("'=") || val.startsWith("'+") || val.startsWith("'-") || val.startsWith("'@"))
  ) {
    return val.substring(1);
  }
  return val !== undefined && val !== null ? String(val) : '';
}

/**
 * Validates Google OAuth access token and returns user profile
 */
export async function verifyGoogleToken(
  accessToken: string
): Promise<{ email: string; name: string; picture: string } | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return null;
    const info = await res.json();
    return {
      email: info.email?.toLowerCase(),
      name: info.name || info.email,
      picture: info.picture || ''
    };
  } catch (err) {
    console.error('Error verifying Google token:', err);
    return null;
  }
}

/**
 * Find or create a folder in Google Drive without creating duplicates
 */
export async function getOrCreateDriveFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<{ id: string; webViewLink?: string }> {
  let query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return { id: searchData.files[0].id, webViewLink: searchData.files[0].webViewLink };
    }
  }

  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Error al crear carpeta en Google Drive (${folderName}): ${errText}`);
  }

  const created = await createRes.json();
  return { id: created.id, webViewLink: created.webViewLink };
}

/**
 * Upload a file to Google Drive (Images, PDFs, Backups, Service Orders, Warranties, Corporate Docs)
 */
export async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
  folderId?: string,
  description?: string
): Promise<{ id: string; webViewLink: string; thumbnailLink?: string }> {
  const metadata: any = {
    name: fileName,
    mimeType: mimeType
  };
  if (folderId) {
    metadata.parents = [folderId];
  }
  if (description) {
    metadata.description = description;
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody = Buffer.concat([
    Buffer.from(
      delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n`
    ),
    buffer,
    Buffer.from(closeDelimiter)
  ]);

  const uploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink';
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error al subir archivo a Google Drive: ${errText}`);
  }

  const fileData = await res.json();

  if (mimeType !== 'application/json') {
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });
    } catch (permErr) {
      console.warn('Could not set public permission on Drive file, proxy will be used', permErr);
    }
  }

  return {
    id: fileData.id,
    webViewLink: fileData.webViewLink,
    thumbnailLink: fileData.thumbnailLink
  };
}

/**
 * Google Calendar Integration for Technical Support Appointments
 */
export interface CalendarAppointmentPayload {
  ticketNumber: string;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  serviceType: string;
  equipmentBrandModel: string;
  problemDescription: string;
  modality: string;
  address?: string;
  technicianName?: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
}

function buildCalendarDateTimeRange(dateStr: string, timeStr: string): { start: string; end: string } {
  const cleanDate = dateStr || new Date().toISOString().slice(0, 10);
  const cleanTime = timeStr && /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : '09:00';
  const [hoursStr, minsStr] = cleanTime.split(':');
  const startHour = Number(hoursStr);
  const endHour = Math.min(23, startHour + 1);
  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    start: `${cleanDate}T${pad(startHour)}:${minsStr}:00-05:00`,
    end: `${cleanDate}T${pad(endHour)}:${minsStr}:00-05:00`
  };
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  payload: CalendarAppointmentPayload
): Promise<{ eventId: string; htmlLink: string } | null> {
  try {
    const { start, end } = buildCalendarDateTimeRange(payload.appointmentDate, payload.appointmentTime);
    const eventBody: any = {
      summary: `[${payload.ticketNumber}] ${payload.serviceType} - ${payload.clientName}`,
      location: payload.address || 'Sede Principal IPS TECNOLÓGICA - Bogotá D.C.',
      description: [
        `Orden de Servicio: ${payload.ticketNumber}`,
        `Cliente: ${payload.clientName} (${payload.clientPhone})`,
        `Tipo de Servicio: ${payload.serviceType}`,
        `Equipo: ${payload.equipmentBrandModel}`,
        `Modalidad: ${payload.modality}`,
        `Técnico Asignado: ${payload.technicianName || 'Por asignar'}`,
        `Falla Reportada: ${payload.problemDescription}`
      ].join('\n'),
      start: {
        dateTime: start,
        timeZone: 'America/Bogota'
      },
      end: {
        dateTime: end,
        timeZone: 'America/Bogota'
      }
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventBody)
    });

    if (!res.ok) {
      return null;
    }

    const created = await res.json();
    return {
      eventId: created.id,
      htmlLink: created.htmlLink
    };
  } catch (err) {
    console.warn('Notice creating Google Calendar event:', err);
    return null;
  }
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  payload: CalendarAppointmentPayload
): Promise<boolean> {
  try {
    const { start, end } = buildCalendarDateTimeRange(payload.appointmentDate, payload.appointmentTime);
    const eventBody: any = {
      summary: `[${payload.ticketNumber}] ${payload.serviceType} - ${payload.clientName}`,
      location: payload.address || 'Sede Principal IPS TECNOLÓGICA - Bogotá D.C.',
      description: [
        `Orden de Servicio: ${payload.ticketNumber}`,
        `Cliente: ${payload.clientName} (${payload.clientPhone})`,
        `Tipo de Servicio: ${payload.serviceType}`,
        `Equipo: ${payload.equipmentBrandModel}`,
        `Modalidad: ${payload.modality}`,
        `Técnico Asignado: ${payload.technicianName || 'Por asignar'}`,
        `Falla Reportada: ${payload.problemDescription}`
      ].join('\n'),
      start: {
        dateTime: start,
        timeZone: 'America/Bogota'
      },
      end: {
        dateTime: end,
        timeZone: 'America/Bogota'
      }
    };

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventBody)
    });

    return res.ok;
  } catch (err) {
    console.warn('Notice updating Google Calendar event:', err);
    return false;
  }
}

export async function deleteGoogleCalendarEvent(accessToken: string, eventId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return res.ok || res.status === 404;
  } catch (err) {
    console.warn('Notice deleting Google Calendar event:', err);
    return false;
  }
}
