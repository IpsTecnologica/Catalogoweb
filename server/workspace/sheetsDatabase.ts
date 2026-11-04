import fs from 'fs';
import path from 'path';
import {
  loadWorkspaceConfig,
  saveWorkspaceConfig,
  sanitizeCellValue,
  desanitizeCellValue,
  getOrCreateDriveFolder,
  uploadFileToDrive
} from './sheetsDriveService.js';
import { Product, CompanyProfile, UserRole, Order, isAuthorizedAdmin, db } from '../data/store.js';

export interface SheetUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string;
  status: 'Activo' | 'Inactivo';
  registeredAt: string;
}

export interface SheetAudit {
  date: string;
  user: string;
  action: string;
  detail: string;
  result: string;
}

/**
 * Official 12 Google Sheets Structure inside 01_BASE_DATOS_Y_REPORTES:
 * 1. Productos
 * 2. Categorías
 * 3. Clientes
 * 4. Usuarios y roles
 * 5. Pedidos y ventas
 * 6. Promociones
 * 7. Servicios técnicos
 * 8. Citas y agendamientos
 * 9. Historial de cambios
 * 10. Configuración de la empresa
 * 11. Inventario y movimientos
 * 12. Registro de sincronización
 */
export const TAB_HEADERS: Record<string, string[]> = {
  Productos: [
    'ID',
    'Código / Referencia',
    'Nombre',
    'Descripción',
    'Categoría',
    'Precio Normal COP',
    'Referencia Imagen Principal (Drive/URL)',
    'Referencias Imágenes Adicionales',
    'Estado',
    'Fecha Creación',
    'Fecha Actualización',
    'Marca',
    'Existencias'
  ],
  Categorías: ['ID', 'Nombre', 'Descripción', 'Estado'],
  Clientes: [
    'ID Cliente',
    'Correo Electrónico',
    'Nombre Completo',
    'Teléfono / WhatsApp',
    'Estado',
    'Fecha Registro'
  ],
  Usuarios: [
    'ID Usuario',
    'Correo Normalizado',
    'Nombre Completo',
    'Rol Autorizado',
    'Teléfono / WhatsApp',
    'Estado Acceso',
    'Fecha Registro',
    'Actualizado Por'
  ],
  Roles: [
    'Rol',
    'Descripción de Permisos',
    'Usuarios Activos',
    'Nivel de Seguridad'
  ],
  'Usuarios y roles': [
    'ID Usuario',
    'Correo Normalizado',
    'Nombre Completo',
    'Rol Autorizado',
    'Teléfono / WhatsApp',
    'Estado Acceso',
    'Fecha Registro',
    'Actualizado Por'
  ],
  Inventario: [
    'ID Movimiento',
    'ID Producto',
    'Referencia',
    'Producto',
    'Tipo Movimiento',
    'Cantidad',
    'Stock Anterior',
    'Stock Nuevo',
    'Motivo',
    'Responsable',
    'Fecha (ISO)'
  ],
  'Inventario y movimientos': [
    'ID Movimiento',
    'ID Producto',
    'Referencia',
    'Producto',
    'Tipo Movimiento',
    'Cantidad',
    'Stock Anterior',
    'Stock Nuevo',
    'Motivo',
    'Responsable',
    'Fecha (ISO)'
  ],
  Pedidos: [
    'ID Pedido',
    'Cliente Correo',
    'Cliente Nombre',
    'Teléfono',
    'Fecha Compra',
    'Total COP',
    'Estado',
    'Dirección Entrega',
    'Resumen Productos',
    'Notas'
  ],
  Ventas: [
    'ID Venta / Pedido',
    'Cliente Correo',
    'Cliente Nombre',
    'Fecha Facturación',
    'Total COP',
    'Estado Venta',
    'Resumen Equipos'
  ],
  'Pedidos y ventas': [
    'ID Pedido',
    'Cliente Correo',
    'Cliente Nombre',
    'Teléfono',
    'Fecha Compra',
    'Total COP',
    'Estado',
    'Dirección Entrega',
    'Resumen Productos',
    'Notas'
  ],
  Promociones: [
    'ID Promoción',
    'Nombre',
    'Alcance',
    'Objetivo (Producto/Categoría)',
    'Tipo Descuento',
    'Valor Descuento',
    'Fecha Inicio (America/Bogota)',
    'Fecha Fin (America/Bogota)',
    'Estado Manual',
    'Creado Por',
    'Fecha Creación'
  ],
  'Servicios técnicos': [
    'ID Servicio',
    'Número Orden (SRV)',
    'Cliente Nombre',
    'Cliente Correo',
    'Teléfono / WhatsApp',
    'Tipo Servicio',
    'Equipo (Marca / Modelo)',
    'Serial',
    'Descripción Falla',
    'Modalidad',
    'Prioridad',
    'Estado Actual',
    'Técnico Asignado',
    'Diagnóstico Técnico',
    'Costo Total COP',
    'Garantía Servicio',
    'Fecha Creación'
  ],
  Citas: [
    'ID Cita',
    'Número Orden (SRV)',
    'Cliente Nombre',
    'Teléfono',
    'Tipo Servicio',
    'Modalidad',
    'Fecha Agendada',
    'Hora Agendada',
    'Técnico Asignado',
    'Estado Cita',
    'ID Evento Google Calendar'
  ],
  'Citas y agendamientos': [
    'ID Cita',
    'Número Orden (SRV)',
    'Cliente Nombre',
    'Teléfono',
    'Tipo Servicio',
    'Modalidad',
    'Fecha Agendada',
    'Hora Agendada',
    'Técnico Asignado',
    'Estado Cita',
    'ID Evento Google Calendar'
  ],
  Técnicos: [
    'ID Técnico',
    'Nombre Completo',
    'Correo Electrónico',
    'Teléfono',
    'Especialidad / Rol',
    'Estado'
  ],
  Garantías: [
    'ID Garantía',
    'Tipo Garantía',
    'Referencia / Orden SRV',
    'Producto o Servicio',
    'Cliente Nombre',
    'Teléfono',
    'Fecha Inicio',
    'Fecha Vencimiento',
    'Estado',
    'Términos'
  ],
  'Historial de cambios': ['Fecha (ISO)', 'Usuario', 'Acción', 'Detalle', 'Resultado'],
  Configuración: [
    'Nombre',
    'NIT',
    'Eslogan',
    'Enlace Logotipo Oficial',
    'WhatsApp',
    'Teléfono PBX',
    'Correo Electrónico',
    'Dirección',
    'Ciudad',
    'Sitio Web',
    'Condiciones Comerciales',
    'Facebook',
    'Instagram',
    'TikTok',
    'YouTube'
  ],
  'Configuración de la empresa': [
    'Nombre',
    'NIT',
    'Eslogan',
    'Enlace Logotipo Oficial',
    'WhatsApp',
    'Teléfono PBX',
    'Correo Electrónico',
    'Dirección',
    'Ciudad',
    'Sitio Web',
    'Condiciones Comerciales',
    'Facebook',
    'Instagram',
    'TikTok',
    'YouTube'
  ],
  Sincronización: [
    'ID Operación',
    'Fecha (ISO)',
    'Módulo / Entidad',
    'Acción',
    'Estado',
    'Detalle'
  ],
  'Registro de sincronización': [
    'ID Operación',
    'Fecha (ISO)',
    'Módulo / Entidad',
    'Acción',
    'Estado',
    'Detalle'
  ]
};

class SheetsDatabase {
  private spreadsheetId: string | null = null;
  private spreadsheetUrl: string | null = null;
  private isInitialized = false;

  public productsCache: Product[] = [];
  public companyCache: CompanyProfile | null = null;
  public usersCache: SheetUser[] = [];
  public categoriesCache: string[] = [];
  public ordersCache: Order[] = [];
  public auditCache: SheetAudit[] = [];

  constructor() {
    const config = loadWorkspaceConfig();
    this.spreadsheetId = config.spreadsheetId;
    this.spreadsheetUrl = config.spreadsheetUrl;
  }

  public getSpreadsheetId(): string | null {
    return this.spreadsheetId;
  }

  public getSpreadsheetUrl(): string | null {
    return this.spreadsheetUrl;
  }

  /**
   * Creates a local & Google Drive backup in 07_RESPALDOS_AUTOMATICOS before reorganizing or migrating data.
   */
  public async createSafetyBackup(accessToken?: string, backupsFolderId?: string | null): Promise<string> {
    const backupMeta = db.createSystemBackup({
      type: 'automatico_diario',
      createdBy: 'Sistema Workspace',
      notes: 'Respaldo preventivo automático en Google Drive (07_RESPALDOS_AUTOMATICOS)'
    });
    const backupPayload = db.getBackupPayloadById(backupMeta.id) || db.getFullBackup();
    const jsonString = JSON.stringify(backupPayload, null, 2);

    if (accessToken && backupsFolderId) {
      try {
        await uploadFileToDrive(
          accessToken,
          backupMeta.fileName,
          'application/json',
          Buffer.from(jsonString, 'utf-8'),
          backupsFolderId,
          'Copia de seguridad automática de IPS TECNOLÓGICA'
        );
      } catch (err) {
        console.warn('Could not upload backup JSON to 07_RESPALDOS_AUTOMATICOS:', err);
      }
    }

    return backupMeta.fileName;
  }

  /**
   * Initializes the 10 organized folders in Google Drive under root folder "IPS TECNOLÓGICA"
   * and ensures all required tabs exist in the Google Sheets master spreadsheet inside "01_BASE_DATOS_Y_REPORTES".
   */
  public async initializeWorkspace(
    accessToken: string,
    adminEmail: string
  ): Promise<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    folderUrl: string;
    folders: Record<string, string | null>;
  }> {
    const config = loadWorkspaceConfig();

    // 1. Root Folder: IPS TECNOLÓGICA
    const rootFolder = await getOrCreateDriveFolder(accessToken, 'IPS TECNOLÓGICA');

    // 2. Ten Official Subfolders (checks existence first to prevent duplicates)
    const [
      sheetsDataFolder,
      photosFolder,
      pdfsFolder,
      logosDocsFolder,
      clientDocsFolder,
      serviceOrdersFolder,
      backupsFolder,
      adminReportsFolder,
      warrantiesFolder,
      accountingDocsFolder
    ] = await Promise.all([
      getOrCreateDriveFolder(accessToken, '01_BASE_DATOS_Y_REPORTES', rootFolder.id),
      getOrCreateDriveFolder(accessToken, '02_FOTOS_PRODUCTOS', rootFolder.id),
      getOrCreateDriveFolder(accessToken, '03_CATALOGOS_PDF', rootFolder.id),
      getOrCreateDriveFolder(accessToken, '04_LOGOS_Y_DOCUMENTOS_EMPRESA', rootFolder.id),
      getOrCreateDriveFolder(accessToken, '05_DOCUMENTOS_CLIENTES', rootFolder.id),
      getOrCreateDriveFolder(accessToken, '06_ORDENES_DE_SERVICIO', rootFolder.id),
      getOrCreateDriveFolder(accessToken, '07_RESPALDOS_AUTOMATICOS', rootFolder.id),
      getOrCreateDriveFolder(accessToken, '08_REPORTES_ADMINISTRATIVOS', rootFolder.id),
      getOrCreateDriveFolder(accessToken, '09_DOCUMENTOS_DE_GARANTIAS', rootFolder.id),
      getOrCreateDriveFolder(accessToken, '10_DOCUMENTOS_CONTABLES', rootFolder.id)
    ]);

    config.rootFolderId = rootFolder.id;
    config.rootFolderUrl = rootFolder.webViewLink || `https://drive.google.com/drive/folders/${rootFolder.id}`;
    config.folders = {
      sheetsDataId: sheetsDataFolder.id,
      photosId: photosFolder.id,
      pdfsId: pdfsFolder.id,
      logosId: logosDocsFolder.id,
      clientDocsId: clientDocsFolder.id,
      serviceOrdersId: serviceOrdersFolder.id,
      backupsId: backupsFolder.id,
      adminReportsId: adminReportsFolder.id,
      warrantiesId: warrantiesFolder.id,
      accountingDocsId: accountingDocsFolder.id
    };

    // 3. Mandatory Safety Backup in 07_RESPALDOS_AUTOMATICOS
    await this.createSafetyBackup(accessToken, backupsFolder.id);
    config.lastBackupAt = new Date().toISOString();

    // 4. Save Corporate Information summary file in 04_LOGOS_Y_DOCUMENTOS_EMPRESA
    try {
      const comp = db.getCompany();
      const corpDoc = JSON.stringify(
        {
          empresa: comp.name,
          nit: comp.nit,
          eslogan: comp.slogan,
          descripcion: comp.description,
          contacto: {
            telefono: comp.phone,
            whatsapp: comp.whatsapp,
            email: comp.email,
            direccion: comp.address,
            ciudad: comp.city,
            sitioWeb: comp.website
          },
          redesSociales: comp.social,
          condicionesComerciales: comp.commercialTerms,
          actualizadoEn: new Date().toISOString()
        },
        null,
        2
      );
      await uploadFileToDrive(
        accessToken,
        'INFORMACION_CORPORATIVA_IPS_TECNOLOGICA.json',
        'application/json',
        Buffer.from(corpDoc, 'utf-8'),
        logosDocsFolder.id,
        'Datos oficiales de contacto e información corporativa de IPS TECNOLÓGICA'
      );
    } catch (docErr) {
      console.warn('Notice saving corporate info file to 04_LOGOS_Y_DOCUMENTOS_EMPRESA:', docErr);
    }

    // 5. Find or Create Google Sheets Master Spreadsheet inside 01_BASE_DATOS_Y_REPORTES
    let sheetId = config.spreadsheetId;
    let sheetUrl = config.spreadsheetUrl;

    if (!sheetId) {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `name = 'IPS TECNOLÓGICA - Base de Datos Central' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
        )}&fields=files(id,name,webViewLink)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          sheetId = searchData.files[0].id;
          sheetUrl = searchData.files[0].webViewLink;
        }
      }
    }

    if (!sheetId) {
      const createSheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: 'IPS TECNOLÓGICA - Base de Datos Central'
          },
          sheets: Object.keys(TAB_HEADERS).map(tabName => ({
            properties: { title: tabName }
          }))
        })
      });

      if (!createSheetRes.ok) {
        const err = await createSheetRes.text();
        throw new Error(`Error creando Google Sheets: ${err}`);
      }

      const createdSheet = await createSheetRes.json();
      sheetId = createdSheet.spreadsheetId;
      sheetUrl = createdSheet.spreadsheetUrl;
    } else {
      await this.ensureAllTabsExist(accessToken, sheetId);
    }

    if (!sheetId) {
      throw new Error('No se pudo crear ni encontrar la hoja de cálculo de Google');
    }

    // Place spreadsheet inside 01_BASE_DATOS_Y_REPORTES
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${sheetId}?addParents=${sheetsDataFolder.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } catch (moveErr) {
      console.warn('Could not move sheet into 01_BASE_DATOS_Y_REPORTES', moveErr);
    }

    // Write Header Rows for all 12 tabs
    const dataToAppend = Object.entries(TAB_HEADERS).map(([tabName, headers]) => ({
      range: `'${tabName}'!A1`,
      values: [headers]
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataToAppend
      })
    });

    this.spreadsheetId = sheetId;
    this.spreadsheetUrl = sheetUrl;
    config.spreadsheetId = sheetId;
    config.spreadsheetUrl = sheetUrl;
    config.lastSyncedAt = new Date().toISOString();
    saveWorkspaceConfig(config);

    // First pull any existing records from Sheets so we NEVER overwrite them
    await this.syncFromSheets(accessToken);

    // Then push current operational database state to all 12 sheets
    await this.syncAllTabsToSheets(accessToken, adminEmail);

    this.isInitialized = true;

    return {
      spreadsheetId: sheetId,
      spreadsheetUrl: sheetUrl || `https://docs.google.com/spreadsheets/d/${sheetId}`,
      folderUrl: config.rootFolderUrl || '',
      folders: { ...config.folders }
    };
  }

  private async ensureAllTabsExist(accessToken: string, sheetId: string): Promise<void> {
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (!metaRes.ok) return;
      const meta = await metaRes.json();
      const existingTitles = new Set<string>(
        (meta.sheets || []).map((s: any) => s.properties?.title).filter(Boolean)
      );

      const missingTabs = Object.keys(TAB_HEADERS).filter(t => !existingTitles.has(t));
      if (missingTabs.length === 0) return;

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: missingTabs.map(title => ({
            addSheet: { properties: { title } }
          }))
        })
      });
    } catch (e) {
      console.warn('Error ensuring tabs exist:', e);
    }
  }

  /**
   * Reads from Google Sheets and non-destructively merges into local/Firestore store
   */
  public async syncFromSheets(accessToken: string): Promise<void> {
    if (!this.spreadsheetId || db.isSimulatedOffline()) return;

    try {
      const ranges = Object.keys(TAB_HEADERS).map(tab => `'${tab}'!A2:Z`);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values:batchGet?${ranges
        .map(r => `ranges=${encodeURIComponent(r)}`)
        .join('&')}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) return;

      const data = await res.json();
      const valueRanges = data.valueRanges || [];

      // 1. Productos — Merge non-destructively into db
      const prodRows = valueRanges[0]?.values || [];
      if (prodRows.length > 0) {
        const parsedProducts: Product[] = prodRows
          .filter((r: any[]) => r && r[0] && r[2])
          .map((r: any[]) => ({
            id: desanitizeCellValue(r[0]),
            reference: desanitizeCellValue(r[1]),
            name: desanitizeCellValue(r[2]),
            shortDescription: desanitizeCellValue(r[3]),
            category: desanitizeCellValue(r[4]) || 'General',
            priceCOP: Number(desanitizeCellValue(r[5])) || 0,
            images: r[6]
              ? [
                  desanitizeCellValue(r[6]),
                  ...(r[7] ? desanitizeCellValue(r[7]).split('|').filter(Boolean) : [])
                ]
              : [],
            isActive:
              desanitizeCellValue(r[8]).toLowerCase() === 'activo' ||
              desanitizeCellValue(r[8]).toLowerCase() === 'true',
            createdAt: desanitizeCellValue(r[9]) || new Date().toISOString(),
            updatedAt: desanitizeCellValue(r[10]) || new Date().toISOString(),
            brand: desanitizeCellValue(r[11]) || 'IPS PRO',
            stock: r[12] !== undefined ? Number(desanitizeCellValue(r[12])) : 10
          }));

        this.productsCache = parsedProducts;
        db.mergeProductsFromSheets(parsedProducts);
      }

      // 2. Categorías
      const catRows = valueRanges[1]?.values || [];
      this.categoriesCache = catRows.map((r: any[]) => desanitizeCellValue(r[1])).filter(Boolean);

      // 4. Usuarios y roles
      const userRows = valueRanges[3]?.values || [];
      this.usersCache = userRows.map((r: any[]) => {
        const email = desanitizeCellValue(r[1]).toLowerCase().trim();
        return {
          id: desanitizeCellValue(r[0]),
          email,
          name: desanitizeCellValue(r[2]),
          role:
            (desanitizeCellValue(r[3]) as UserRole) ||
            (isAuthorizedAdmin(email) ? 'Administrador' : 'Cliente'),
          phone: desanitizeCellValue(r[4]),
          status: (desanitizeCellValue(r[5]) as any) || 'Activo',
          registeredAt: desanitizeCellValue(r[6]) || new Date().toISOString()
        };
      });

      // 9. Historial de cambios
      const auditRows = valueRanges[8]?.values || [];
      this.auditCache = auditRows
        .map((r: any[]) => ({
          date: desanitizeCellValue(r[0]),
          user: desanitizeCellValue(r[1]),
          action: desanitizeCellValue(r[2]),
          detail: desanitizeCellValue(r[3]),
          result: desanitizeCellValue(r[4])
        }))
        .reverse();

      const cfg = loadWorkspaceConfig();
      cfg.lastSyncedAt = new Date().toISOString();
      saveWorkspaceConfig(cfg);
    } catch (err) {
      console.error('Error in syncFromSheets:', err);
    }
  }

  /**
   * Synchronizes all 12 tabs in Google Sheets with the authoritative server database
   */
  public async syncAllTabsToSheets(accessToken: string, adminEmail: string): Promise<void> {
    if (!this.spreadsheetId || db.isSimulatedOffline()) return;

    await this.ensureAllTabsExist(accessToken, this.spreadsheetId);

    const now = new Date().toISOString();

    const categories = [
      ['CAT-01', 'Portátiles y Cómputo', 'Laptops empresariales y workstations móviles', 'Activo'],
      ['CAT-02', 'Servidores y Redes', 'Servidores rack, switches gestionables y firewalls', 'Activo'],
      ['CAT-03', 'Monitores y Pantallas', 'Monitores 4K, ultrawide y calibración de color', 'Activo'],
      ['CAT-04', 'Móviles y Tablets', 'Smartphones corporativos y tabletas digitalizadoras', 'Activo'],
      ['CAT-05', 'Audio y Streaming', 'Auriculares de estudio y micrófonos profesionales', 'Activo'],
      ['CAT-06', 'Accesorios y Periféricos', 'Teclados, mouse ergonómicos y dockings', 'Activo'],
      ['CAT-07', 'Almacenamiento', 'Sistemas NAS, discos NVMe y externos blindados', 'Activo'],
      ['CAT-08', 'Seguridad y Vigilancia', 'Cámaras IP 4K PoE y control biométrico', 'Activo']
    ];

    const allUsers = db.getUsers();
    const clientRows = allUsers
      .filter(u => u.role === 'Cliente')
      .map(u => [u.id, u.email, u.name, u.phone || '', u.status || 'Activo', u.createdAt]);

    const userRows = allUsers.map(u => [
      u.id,
      u.email,
      u.name,
      u.role,
      u.phone || '',
      u.status || 'Activo',
      u.createdAt,
      u.updatedBy || 'Sistema'
    ]);

    const productRows = db.getProducts().map(p => [
      p.id,
      p.reference,
      p.name,
      p.shortDescription,
      p.category,
      p.priceCOP,
      (p.images?.[0] || '').startsWith('data:') ? `/uploads/prod_${p.reference.toLowerCase()}.jpg` : (p.images?.[0] || ''),
      (p.images || [])
        .slice(1)
        .filter(img => !img.startsWith('data:'))
        .join('|'),
      p.isActive ? 'Activo' : 'Inactivo',
      p.createdAt,
      p.updatedAt,
      p.brand || 'IPS PRO',
      p.stock ?? 10
    ]);

    const orderRows = db.getOrders().map(o => [
      o.id,
      o.customerEmail,
      o.customerName,
      o.customerPhone,
      o.date,
      o.totalCOP,
      o.status,
      o.shippingAddress || '',
      (o.items || []).map(i => `${i.quantity}x ${i.name}`).join(' | '),
      o.notes || ''
    ]);

    const promoRows = db.getPromotions().map(pr => [
      pr.id,
      pr.name,
      pr.scope,
      pr.targetLabel,
      pr.discountType,
      pr.discountValue,
      pr.startDate,
      pr.endDate,
      pr.manualStatus,
      pr.createdBy,
      pr.createdAt
    ]);

    const serviceRows = db.getTechnicalServices().map(s => [
      s.id,
      s.ticketNumber,
      s.clientName,
      s.clientEmail || '',
      s.clientPhone,
      s.serviceType,
      `${s.equipmentBrand} ${s.equipmentModel}`.trim(),
      s.serialNumber || '',
      s.problemDescription,
      s.modality,
      s.priority,
      s.status,
      s.assignedTechnicianName || 'Por asignar',
      s.diagnosis || '',
      s.totalCostCOP || 0,
      s.serviceWarrantyText || '',
      s.createdAt
    ]);

    const appointmentRows = db.getAppointments().map(a => [
      a.id,
      a.ticketNumber,
      a.clientName,
      a.clientPhone,
      a.serviceType,
      a.modality,
      a.date,
      a.time,
      a.technicianName || 'Por asignar',
      a.status,
      a.googleCalendarEventId || ''
    ]);

    const inventoryRows = db.getInventoryMovements().slice(0, 200).map(m => [
      m.id,
      m.productId,
      m.productReference,
      m.productName,
      m.type,
      m.quantity,
      m.previousStock,
      m.newStock,
      m.reason,
      m.createdBy,
      m.createdAt
    ]);

    const syncLogRows = db.getSyncQueue().slice(0, 200).map(op => [
      op.id,
      op.createdAt,
      op.entity,
      op.action,
      op.status,
      op.lastError || 'Sincronizado con éxito'
    ]);

    const comp = db.getCompany();
    const empresaRow = [
      comp.name,
      comp.nit || '901.458.920-1',
      comp.slogan,
      comp.logoUrl?.startsWith('data:') ? '/uploads/ips_official_logo.svg' : (comp.logoUrl || ''),
      comp.whatsapp,
      comp.phone,
      comp.email,
      comp.address,
      comp.city,
      comp.website,
      comp.commercialTerms,
      comp.social.facebook,
      comp.social.instagram,
      comp.social.tiktok,
      comp.social.youtube
    ];

    const roleRows = [
      ['Administrador', 'Control total del sistema, usuarios, respaldos e integraciones', db.getUsers().filter(u => u.role === 'Administrador').length, 'Nivel 1 (Máximo)'],
      ['Supervisor', 'Supervisión de ventas, soporte técnico, agenda y reportes', db.getUsers().filter(u => u.role === 'Supervisor').length, 'Nivel 2'],
      ['Técnico', 'Atención de órdenes SRV, diagnóstico, repuestos y calendario', db.getUsers().filter(u => u.role === 'Técnico').length, 'Nivel 3'],
      ['Caja', 'Gestión de pedidos, facturación y entregas', db.getUsers().filter(u => u.role === 'Caja').length, 'Nivel 3'],
      ['Editor', 'Gestión de productos, precios, imágenes y promociones', db.getUsers().filter(u => u.role === 'Editor').length, 'Nivel 3'],
      ['Consulta', 'Lectura de catálogo e informes internos', db.getUsers().filter(u => u.role === 'Consulta').length, 'Nivel 4'],
      ['Cliente', 'Portal de compras, citas de servicio técnico y garantías', db.getUsers().filter(u => u.role === 'Cliente').length, 'Cliente Externo']
    ];

    const technicianRows = db.getTechnicians().map(t => [
      t.id,
      t.name,
      t.email,
      t.phone || '',
      t.role,
      t.status
    ]);

    const warrantyRows = db.getWarranties().map((w: any) => [
      w.id,
      w.type || w.warrantyType || 'Producto / Servicio',
      w.referenceCode || w.ticketNumber || w.productReference || '',
      w.itemName || w.productName || w.serviceType || '',
      w.clientName,
      w.clientPhone || '',
      w.startDate,
      w.endDate,
      w.status,
      w.terms || w.coverageDetails || ''
    ]);

    const salesRows = db.getAllOrders().map(o => [
      o.id,
      o.customerEmail,
      o.customerName,
      o.date,
      o.totalCOP,
      o.status,
      (o.items || []).map(i => `${i.quantity}x ${i.name}`).join(' | ')
    ]);

    const dataPayload: Array<{ range: string; values: any[][] }> = [
      { range: `'Productos'!A2`, values: productRows.map(r => r.map(sanitizeCellValue)) },
      { range: `'Categorías'!A2`, values: categories.map(r => r.map(sanitizeCellValue)) },
      { range: `'Usuarios'!A2`, values: userRows.map(r => r.map(sanitizeCellValue)) },
      { range: `'Roles'!A2`, values: roleRows.map(r => r.map(sanitizeCellValue)) },
      { range: `'Usuarios y roles'!A2`, values: userRows.map(r => r.map(sanitizeCellValue)) },
      { range: `'Configuración'!A2`, values: [empresaRow.map(sanitizeCellValue)] },
      { range: `'Configuración de la empresa'!A2`, values: [empresaRow.map(sanitizeCellValue)] }
    ];

    if (clientRows.length > 0) {
      dataPayload.push({ range: `'Clientes'!A2`, values: clientRows.map(r => r.map(sanitizeCellValue)) });
    }
    if (orderRows.length > 0) {
      dataPayload.push({ range: `'Pedidos'!A2`, values: orderRows.map(r => r.map(sanitizeCellValue)) });
      dataPayload.push({ range: `'Pedidos y ventas'!A2`, values: orderRows.map(r => r.map(sanitizeCellValue)) });
    }
    if (salesRows.length > 0) {
      dataPayload.push({ range: `'Ventas'!A2`, values: salesRows.map(r => r.map(sanitizeCellValue)) });
    }
    if (promoRows.length > 0) {
      dataPayload.push({ range: `'Promociones'!A2`, values: promoRows.map(r => r.map(sanitizeCellValue)) });
    }
    if (serviceRows.length > 0) {
      dataPayload.push({ range: `'Servicios técnicos'!A2`, values: serviceRows.map(r => r.map(sanitizeCellValue)) });
    }
    if (appointmentRows.length > 0) {
      dataPayload.push({
        range: `'Citas'!A2`,
        values: appointmentRows.map(r => r.map(sanitizeCellValue))
      });
      dataPayload.push({
        range: `'Citas y agendamientos'!A2`,
        values: appointmentRows.map(r => r.map(sanitizeCellValue))
      });
    }
    if (technicianRows.length > 0) {
      dataPayload.push({
        range: `'Técnicos'!A2`,
        values: technicianRows.map(r => r.map(sanitizeCellValue))
      });
    }
    if (warrantyRows.length > 0) {
      dataPayload.push({
        range: `'Garantías'!A2`,
        values: warrantyRows.map(r => r.map(sanitizeCellValue))
      });
    }
    if (inventoryRows.length > 0) {
      dataPayload.push({
        range: `'Inventario'!A2`,
        values: inventoryRows.map(r => r.map(sanitizeCellValue))
      });
      dataPayload.push({
        range: `'Inventario y movimientos'!A2`,
        values: inventoryRows.map(r => r.map(sanitizeCellValue))
      });
    }
    if (syncLogRows.length > 0) {
      dataPayload.push({
        range: `'Sincronización'!A2`,
        values: syncLogRows.map(r => r.map(sanitizeCellValue))
      });
      dataPayload.push({
        range: `'Registro de sincronización'!A2`,
        values: syncLogRows.map(r => r.map(sanitizeCellValue))
      });
    }

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataPayload
      })
    });

    await this.logAudit(
      accessToken,
      adminEmail || 'Sistema',
      'SINCRONIZACION_INTEGRAL_16_HOJAS',
      `Sincronizadas las 16 hojas oficiales en Google Sheets (${now})`,
      'EXITOSO'
    );
  }

  /**
   * Processes any pending operations in the SyncQueue when Google Sheets connection is available
   */
  public async processPendingSyncQueue(accessToken: string): Promise<{ processed: number; failed: number }> {
    if (!this.spreadsheetId || db.isSimulatedOffline()) {
      return { processed: 0, failed: 0 };
    }

    const pending = db.getPendingSyncOperations();
    if (pending.length === 0) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;

    try {
      await this.syncAllTabsToSheets(accessToken, 'Cola de Sincronización');
      for (const op of pending) {
        db.completeSyncOperation(op.id);
        processed++;
      }
      const cfg = loadWorkspaceConfig();
      cfg.lastSyncedAt = new Date().toISOString();
      saveWorkspaceConfig(cfg);
    } catch (err: any) {
      for (const op of pending) {
        db.failSyncOperation(op.id, err?.message || 'Error de conexión con Google Sheets');
        failed++;
      }
    }

    return { processed, failed };
  }

  public async logAudit(
    accessToken: string,
    user: string,
    action: string,
    detail: string,
    result: 'EXITOSO' | 'ERROR'
  ): Promise<void> {
    if (!this.spreadsheetId || db.isSimulatedOffline()) return;
    const now = new Date().toISOString();
    const row = [now, user, action, detail, result].map(sanitizeCellValue);

    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(
          "'Historial de cambios'!A:E"
        )}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [row] })
        }
      );
      this.auditCache.unshift({ date: now, user, action, detail, result });
    } catch (e) {
      console.error('Audit log write error', e);
    }
  }

  public async addProductToSheets(accessToken: string, product: Product, userEmail: string): Promise<Product> {
    if (!this.spreadsheetId || db.isSimulatedOffline()) {
      throw new Error('Google Spreadsheet desconectado o en modo cola offline');
    }

    const primaryImg = (product.images?.[0] || '').startsWith('data:')
      ? `REF:${product.reference}_IMG_1`
      : product.images?.[0] || '';
    const otherImgs = (product.images || [])
      .slice(1)
      .map((img, i) => (img.startsWith('data:') ? `REF:${product.reference}_IMG_${i + 2}` : img))
      .join('|');

    const row = [
      product.id,
      product.reference,
      product.name,
      product.shortDescription,
      product.category,
      product.priceCOP,
      primaryImg,
      otherImgs,
      product.isActive ? 'Activo' : 'Inactivo',
      product.createdAt,
      product.updatedAt,
      product.brand || 'IPS PRO',
      product.stock ?? 10
    ].map(sanitizeCellValue);

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Productos!A:M:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [row] })
      }
    );

    if (!res.ok) {
      throw new Error(`Google Sheets HTTP ${res.status}`);
    }

    await this.logAudit(
      accessToken,
      userEmail,
      'CREAR_PRODUCTO',
      `Producto: ${product.name} (${product.reference})`,
      'EXITOSO'
    );
    return product;
  }

  public async updateProductInSheets(
    accessToken: string,
    id: string,
    _updates: Partial<Product>,
    userEmail: string
  ): Promise<void> {
    if (!this.spreadsheetId || db.isSimulatedOffline()) {
      throw new Error('Google Spreadsheet desconectado');
    }

    const updated = db.getProductById(id);
    if (!updated) return;

    const colARes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Productos!A:A`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    if (!colARes.ok) throw new Error(`Google Sheets HTTP ${colARes.status}`);
    const colAData = await colARes.json();
    const rows = colAData.values || [];
    const sheetRowIndex = rows.findIndex((r: any[]) => r[0] === id) + 1;

    const primaryImg = (updated.images?.[0] || '').startsWith('data:')
      ? `REF:${updated.reference}_IMG_1`
      : updated.images?.[0] || '';
    const otherImgs = (updated.images || [])
      .slice(1)
      .map((img, i) => (img.startsWith('data:') ? `REF:${updated.reference}_IMG_${i + 2}` : img))
      .join('|');

    const row = [
      updated.id,
      updated.reference,
      updated.name,
      updated.shortDescription,
      updated.category,
      updated.priceCOP,
      primaryImg,
      otherImgs,
      updated.isActive ? 'Activo' : 'Inactivo',
      updated.createdAt,
      updated.updatedAt,
      updated.brand || 'IPS PRO',
      updated.stock ?? 10
    ].map(sanitizeCellValue);

    if (sheetRowIndex > 1) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Productos!A${sheetRowIndex}:M${sheetRowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [row] })
        }
      );
    } else {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Productos!A:M:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [row] })
        }
      );
    }

    await this.logAudit(
      accessToken,
      userEmail,
      'ACTUALIZAR_PRODUCTO',
      `Producto: ${updated.name} (${updated.reference})`,
      'EXITOSO'
    );
  }

  public async deleteProductInSheets(accessToken: string, id: string, userEmail: string): Promise<boolean> {
    if (!this.spreadsheetId || db.isSimulatedOffline()) {
      throw new Error('Google Spreadsheet desconectado');
    }

    const header = TAB_HEADERS.Productos;
    const allProds = db.getProducts();
    const rows = allProds.map(p =>
      [
        p.id,
        p.reference,
        p.name,
        p.shortDescription,
        p.category,
        p.priceCOP,
        (p.images?.[0] || '').startsWith('data:') ? `REF:${p.reference}_IMG_1` : p.images?.[0] || '',
        (p.images || [])
          .slice(1)
          .filter(img => !img.startsWith('data:'))
          .join('|'),
        p.isActive ? 'Activo' : 'Inactivo',
        p.createdAt,
        p.updatedAt,
        p.brand || 'IPS PRO',
        p.stock ?? 10
      ].map(sanitizeCellValue)
    );

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Productos!A:M:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Productos!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [header, ...rows] })
      }
    );

    await this.logAudit(
      accessToken,
      userEmail,
      'ELIMINAR_PRODUCTO',
      `Producto ID eliminado: ${id} (enviado a Papelera y preservado en respaldos)`,
      'EXITOSO'
    );
    return true;
  }

  public async syncPromotionsToSheets(accessToken: string, _userEmail: string): Promise<void> {
    if (!this.spreadsheetId || db.isSimulatedOffline()) return;
    const header = TAB_HEADERS.Promociones;
    const promos = db.getPromotions();
    const rows = promos.map(pr =>
      [
        pr.id,
        pr.name,
        pr.scope,
        pr.targetLabel,
        pr.discountType,
        pr.discountValue,
        pr.startDate,
        pr.endDate,
        pr.manualStatus,
        pr.createdBy,
        pr.createdAt
      ].map(sanitizeCellValue)
    );

    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Promociones!A:K:clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Promociones!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [header, ...rows] })
        }
      );
    } catch (e) {
      console.warn('Could not sync promotions to sheets', e);
    }
  }

  public async syncUsersToSheets(accessToken: string, _userEmail: string): Promise<void> {
    if (!this.spreadsheetId || db.isSimulatedOffline()) return;
    const usersHeader = TAB_HEADERS['Usuarios y roles'];
    const clientsHeader = TAB_HEADERS.Clientes;
    const users = db.getUsers();

    const userRows = users.map(u =>
      [
        u.id,
        u.email,
        u.name,
        u.role,
        u.phone || '',
        u.status || 'Activo',
        u.createdAt,
        u.updatedBy || 'Admin'
      ].map(sanitizeCellValue)
    );

    const clientRows = users
      .filter(u => u.role === 'Cliente')
      .map(u => [u.id, u.email, u.name, u.phone || '', u.status || 'Activo', u.createdAt].map(sanitizeCellValue));

    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(
          "'Usuarios y roles'!A:H"
        )}:clear`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(
          "'Usuarios y roles'!A1"
        )}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [usersHeader, ...userRows] })
        }
      );

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Clientes!A:F:clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Clientes!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [clientsHeader, ...clientRows] })
        }
      );
    } catch (e) {
      console.warn('Could not sync users/clients to sheets', e);
    }
  }

  public async updateCompanyConfigInSheets(accessToken: string, company: CompanyProfile, userEmail: string): Promise<void> {
    if (!this.spreadsheetId || db.isSimulatedOffline()) return;

    const row = [
      company.name,
      company.nit || '',
      company.slogan,
      company.logoUrl?.startsWith('data:') ? '/uploads/ips_official_logo.svg' : (company.logoUrl || ''),
      company.whatsapp,
      company.phone,
      company.email,
      company.address,
      company.city,
      company.website,
      company.commercialTerms,
      company.social?.facebook || '',
      company.social?.instagram || '',
      company.social?.tiktok || '',
      company.social?.youtube || ''
    ].map(sanitizeCellValue);

    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(
          "'Configuración de la empresa'!A2:O2"
        )}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [row] })
        }
      );
      this.companyCache = company;
      await this.logAudit(
        accessToken,
        userEmail,
        'ACTUALIZAR_CONFIG_EMPRESA',
        'Configuración de la empresa y redes sociales sincronizada en Google Sheets',
        'EXITOSO'
      );
    } catch (e) {
      console.warn('Could not update Configuración de la empresa tab', e);
    }
  }

  public async updateSocialLinksInSheets(accessToken: string, social: any, userEmail: string): Promise<void> {
    const comp = db.getCompany();
    comp.social = { ...comp.social, ...social };
    await this.updateCompanyConfigInSheets(accessToken, comp, userEmail);
  }

  public async recordOrderInSheets(accessToken: string, order: Order, userEmail: string): Promise<void> {
    if (!this.spreadsheetId || db.isSimulatedOffline()) return;

    await this.ensureAllTabsExist(accessToken, this.spreadsheetId);

    const orderRow = [
      order.id,
      order.customerEmail,
      order.customerName,
      order.customerPhone,
      order.date,
      order.totalCOP,
      order.status,
      order.shippingAddress || '',
      (order.items || []).map(i => `${i.quantity}x ${i.name}`).join(' | '),
      order.notes || ''
    ].map(sanitizeCellValue);

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(
        "'Pedidos y ventas'!A:J"
      )}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [orderRow] })
      }
    );

    this.ordersCache.unshift(order);
    await this.logAudit(
      accessToken,
      userEmail,
      'REGISTRAR_PEDIDO',
      `Pedido ${order.id} registrado para ${order.customerEmail}`,
      'EXITOSO'
    );
  }
}

export const sheetsDb = new SheetsDatabase();
