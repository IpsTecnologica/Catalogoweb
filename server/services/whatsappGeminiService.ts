import { GoogleGenAI } from '@google/genai';
import { db, TECHNICAL_SERVICE_CATALOG } from '../data/store.js';
import { getResolvedGeminiSecrets } from './whatsappIntegrationVault.js';

export interface WhatsAppReplyResult {
  replyText: string;
  intent: string;
  usedGemini: boolean;
  metaSent?: boolean;
}

function getGenAIClient(): { client: GoogleGenAI; model: string; systemInstructions: string } | null {
  const resolved = getResolvedGeminiSecrets();
  if (!resolved.enabled || !resolved.apiKey || resolved.apiKey === 'MY_GEMINI_API_KEY' || resolved.apiKey.trim() === '') {
    return null;
  }
  return {
    client: new GoogleGenAI({
      apiKey: resolved.apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    }),
    model: resolved.model || 'gemini-3-flash-preview',
    systemInstructions: resolved.systemInstructions
  };
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

/**
 * Builds the authoritative context from the real IPS TECNOLÓGICA database
 */
function buildRealDatabaseContext(clientPhone?: string): string {
  const company = db.getCompany();
  const activeProducts = db.getActiveProductsWithPromotions();
  const activePromos = db.getPromotions().filter(p => p.status === 'Activa');
  const servicesList = TECHNICAL_SERVICE_CATALOG.join(', ');

  // Lookup any existing support tickets for this phone number
  const cleanPhone = (clientPhone || '').replace(/\D/g, '');
  const matchingTickets = cleanPhone
    ? db
        .getTechnicalServices()
        .filter(t => (t.clientPhone || '').replace(/\D/g, '').includes(cleanPhone.slice(-7)))
    : [];

  const productLines = activeProducts.map(p => {
    const promoPart = p.activePromotion
      ? ` | EN PROMOCIÓN: ${formatCOP(p.promotionalPriceCOP || p.priceCOP)} (${p.activePromotion.badgeText} hasta ${p.activePromotion.endDate})`
      : '';
    return `- [${p.reference}] ${p.name} (${p.category} | Marca: ${p.brand || 'IPS PRO'}): Precio normal ${formatCOP(
      p.priceCOP
    )}${promoPart} | Stock: ${p.stock ?? 10} uds | Descripción: ${p.shortDescription}`;
  });

  const ticketLines = matchingTickets.map(
    t =>
      `- Orden ${t.ticketNumber}: ${t.serviceType} (${t.equipmentBrand} ${t.equipmentModel}) | Estado: ${
        t.status
      } | Fecha cita: ${t.appointmentDate || 'Por definir'} ${t.appointmentTime || ''} | Técnico: ${
        t.assignedTechnicianName || 'Por asignar'
      } | Costo total: ${formatCOP(t.totalCostCOP)}`
  );

  return `
DATOS OFICIALES DE LA EMPRESA:
- Empresa: ${company.name} (NIT: ${company.nit})
- Eslogan: ${company.slogan}
- WhatsApp Oficial: ${company.whatsapp} | PBX: ${company.phone}
- Correo: ${company.email}
- Dirección: ${company.address}, ${company.city}
- Sitio Web / Catálogo Digital: ${company.website}
- Condiciones Comerciales y Garantías: ${company.commercialTerms}

CATÁLOGO REAL DE PRODUCTOS ACTIVOS (${activeProducts.length} productos):
${productLines.join('\n')}

PROMOCIONES VIGENTES (${activePromos.length}):
${
  activePromos.length > 0
    ? activePromos
        .map(
          pr =>
            `- ${pr.name}: ${
              pr.discountType === 'porcentaje' ? `${pr.discountValue}% DCTO` : `${formatCOP(pr.discountValue)} DCTO`
            } en ${pr.targetLabel} (Vigente de ${pr.startDate} a ${pr.endDate})`
        )
        .join('\n')
    : '- Actualmente no hay promociones especiales activas.'
}

SERVICIOS TÉCNICOS DISPONIBLES PARA AGENDAMIENTO:
${servicesList}
Modalidades: En sede principal (${company.address}), Servicio a domicilio, o Soporte remoto.

${
  ticketLines.length > 0
    ? `ÓRDENES DE SERVICIO TÉCNICO ASOCIADAS A ESTE CLIENTE:\n${ticketLines.join('\n')}`
    : 'No se encontraron órdenes de servicio previas asociadas a este número telefónico.'
}
`.trim();
}

function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('srv-') || lower.includes('orden') || lower.includes('estado') || lower.includes('reparac')) {
    return 'consulta_orden_servicio';
  }
  if (
    lower.includes('cita') ||
    lower.includes('agendar') ||
    lower.includes('soporte') ||
    lower.includes('mantenimiento') ||
    lower.includes('camara') ||
    lower.includes('cámara') ||
    lower.includes(' Domicilio'.toLowerCase()) ||
    lower.includes('tecnico') ||
    lower.includes('técnico')
  ) {
    return 'agendamiento_soporte';
  }
  if (lower.includes('promo') || lower.includes('descuento') || lower.includes('oferta')) {
    return 'consulta_promociones';
  }
  if (lower.includes('garantia') || lower.includes('garantía')) {
    return 'consulta_garantia';
  }
  if (lower.includes('asesor') || lower.includes('humano') || lower.includes('persona')) {
    return 'transferencia_asesor';
  }
  return 'consulta_catalogo_precios';
}

/**
 * Deterministic fallback grounded 100% in the real database if Gemini API key is not configured or unavailable
 */
function buildDeterministicDatabaseReply(userMessage: string, clientPhone?: string): string {
  const company = db.getCompany();
  const activeProducts = db.getActiveProductsWithPromotions();
  const lower = userMessage.toLowerCase();

  // Check if user asks for a specific SRV ticket number
  const srvMatch = userMessage.toUpperCase().match(/SRV-\d{4}-\d{3,6}/);
  if (srvMatch) {
    const ticket = db.getTechnicalServiceByTicket(srvMatch[0]);
    if (ticket) {
      return `Hola, te informamos el estado oficial de tu Orden de Servicio *${ticket.ticketNumber}* en *${company.name}*:\n\n• *Servicio:* ${ticket.serviceType}\n• *Equipo:* ${ticket.equipmentBrand} ${ticket.equipmentModel}\n• *Estado actual:* ${ticket.status}\n• *Técnico asignado:* ${ticket.assignedTechnicianName || 'En asignación'}\n• *Cita programada:* ${ticket.appointmentDate || 'Por confirmar'} ${ticket.appointmentTime || ''}\n• *Diagnóstico:* ${ticket.diagnosis || 'En revisión técnica'}\n• *Valor total:* ${formatCOP(ticket.totalCostCOP)}`;
    }
    return `Consultamos nuestra base de datos en *${company.name}* y no encontramos una orden registrada con el código *${srvMatch[0]}*. Por favor verifica el número (ejemplo: SRV-2026-1001) o indícanos tu número de contacto.`;
  }

  // Filter matching products by keywords
  const keywords = lower
    .replace(/[^\wáéíóúñ\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !['hola', 'precio', 'tiene', 'tienen', 'para', 'como', 'cual', 'cuanto', 'vale', 'cuesta', 'quiero', 'info', 'informacion', 'productos', 'catalogo'].includes(w));

  const matchedProducts =
    keywords.length > 0
      ? activeProducts.filter(p => {
          const haystack = `${p.name} ${p.reference} ${p.category} ${p.brand || ''} ${p.shortDescription}`.toLowerCase();
          return keywords.some(k => haystack.includes(k));
        })
      : [];

  if (matchedProducts.length > 0) {
    const itemsText = matchedProducts
      .slice(0, 4)
      .map(p => {
        const priceText = p.activePromotion
          ? `~${formatCOP(p.priceCOP)}~ *${formatCOP(p.promotionalPriceCOP || p.priceCOP)}* (${p.activePromotion.badgeText})`
          : `*${formatCOP(p.priceCOP)}*`;
        return `• *${p.name}* (Ref: \`${p.reference}\`)\n  Precio: ${priceText} | Stock disponible: ${p.stock ?? 10} uds\n  _${p.shortDescription}_`;
      })
      .join('\n\n');

    return `¡Hola! Bienvenido a *${company.name}*. Encontramos estos equipos disponibles en nuestro inventario real:\n\n${itemsText}\n\n📍 Estamos en ${company.address} (${company.city}). ¿Deseas recibir una cotización formal o agendar una compra?`;
  }

  if (lower.includes('soporte') || lower.includes('cita') || lower.includes('mantenimiento') || lower.includes('reparar') || lower.includes('tecnico') || lower.includes('técnico')) {
    return `En *${company.name}* contamos con servicio técnico especializado y agendamiento en línea:\n\n${TECHNICAL_SERVICE_CATALOG.slice(0, 6).map(s => `• ${s}`).join('\n')}\n\nPuedes agendar tu cita directamente en la sección *AGENDA TU SERVICIO TÉCNICO* de nuestra plataforma o enviarnos por aquí:\n1. Tipo de servicio y marca/modelo del equipo\n2. Fecha y hora deseada\n3. Modalidad (En sede, A domicilio o Remoto)`;
  }

  const sampleProds = activeProducts
    .slice(0, 4)
    .map(p => `• *${p.name}* (${p.reference}): *${formatCOP(p.promotionalPriceCOP || p.priceCOP)}*`)
    .join('\n');

  return `¡Hola! Soy el asistente virtual de *${company.name}* (${company.slogan}).\n\nAlgunos de nuestros productos destacados en inventario:\n${sampleProds}\n\nTambién ofrecemos *Soporte Técnico y Agendamiento de Citas* (Mantenimiento de computadores, cámaras de seguridad, redes y servidores).\n\n¿En qué producto, cotización o servicio técnico te podemos colaborar hoy?`;
}

export async function generateWhatsAppGeminiResponse(params: {
  phone: string;
  clientName?: string;
  message: string;
}): Promise<WhatsAppReplyResult> {
  const config = db.getWhatsAppConfig();
  const intent = detectIntent(params.message);
  const realContext = buildRealDatabaseContext(params.phone);

  const aiBundle = getGenAIClient();
  let replyText = '';
  let usedGemini = false;

  if (aiBundle && config.geminiEnabled) {
    try {
      const systemInstruction = `${aiBundle.systemInstructions || config.systemPrompt}

REGLAS ESTRICTAS E INQUEBRANTABLES:
1. SOLO utiliza los datos reales suministrados a continuación del inventario, precios, promociones, órdenes de servicio y datos de contacto de IPS TECNOLÓGICA.
2. NUNCA inventes precios, productos, existencias ni promociones que no aparezcan en el listado oficial.
3. Si el cliente pregunta por un producto que no está en la lista, infórmale amablemente qué alternativas reales sí tenemos en el catálogo.
4. Responde en español profesional, claro, conciso y apto para WhatsApp (usando viñetas y negritas con un solo asterisco *texto*).

${realContext}`;

      const response = await aiBundle.client.models.generateContent({
        model: aiBundle.model || 'gemini-3-flash-preview',
        contents: `Cliente (${params.clientName || params.phone}) escribe por WhatsApp: "${params.message}"`,
        config: {
          systemInstruction,
          temperature: 0.25
        }
      });

      if (response.text && response.text.trim()) {
        replyText = response.text.trim();
        usedGemini = true;
      }
    } catch (err) {
      console.warn('Gemini API fallback activated for WhatsApp response:', err);
    }
  }

  if (!replyText) {
    replyText = buildDeterministicDatabaseReply(params.message, params.phone);
  }

  // Optional Meta WhatsApp Cloud API delivery if configured in environment
  let metaSent = false;
  const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || config.phoneNumberId;
  if (waToken && waPhoneId && params.phone && !params.phone.startsWith('SIM-')) {
    try {
      const cleanRecipient = params.phone.replace(/\D/g, '');
      if (cleanRecipient.length >= 10) {
        const metaRes = await fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${waToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanRecipient,
            type: 'text',
            text: { body: replyText }
          })
        });
        metaSent = metaRes.ok;
      }
    } catch (metaErr) {
      console.warn('Meta WhatsApp Cloud API delivery notice:', metaErr);
    }
  }

  return {
    replyText,
    intent,
    usedGemini,
    metaSent
  };
}

export function isGeminiConfigured(): boolean {
  const resolved = getResolvedGeminiSecrets();
  return Boolean(resolved.enabled && resolved.apiKey && resolved.apiKey !== 'MY_GEMINI_API_KEY' && resolved.apiKey.trim().length > 5);
}
