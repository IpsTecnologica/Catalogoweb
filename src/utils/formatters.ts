const DEFAULT_PUBLIC_APP_URL = 'https://ais-pre-ouzmtvpcklhtkaxl7txrq4-235668912498.us-west2.run.app';

let configuredPublicUrl: string = DEFAULT_PUBLIC_APP_URL;

export function setConfiguredPublicUrl(url: string) {
  if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    configuredPublicUrl = url.replace(/\/+$/, '');
  }
}

/**
 * Returns the real public shareable URL of the catalog, a specific category, or an individual product.
 * Never returns a localhost address.
 */
export function getPublicCatalogUrl(productRefOrId?: string, categoryName?: string): string {
  let base = configuredPublicUrl;
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      // If running on ais-dev, prefer the public ais-pre shared URL for sharing with external clients
      if (origin.includes('ais-dev-')) {
        base = origin.replace('ais-dev-', 'ais-pre-');
      } else {
        base = origin;
      }
    }
  }
  base = base.replace(/\/+$/, '');
  if (productRefOrId && productRefOrId.trim()) {
    return `${base}/?product=${encodeURIComponent(productRefOrId.trim())}`;
  }
  if (categoryName && categoryName.trim() && categoryName !== 'Todas') {
    return `${base}/?category=${encodeURIComponent(categoryName.trim())}`;
  }
  return `${base}/`;
}

/**
 * Generates the official commercial WhatsApp share URL for the catalog, a category, or a single product.
 * Properly encodes emojis, accents, spaces, and URL parameters.
 */
export function createCatalogWhatsAppShareUrl(options?: {
  productName?: string;
  productRef?: string;
  priceCOP?: number;
  normalPriceCOP?: number;
  categoryName?: string;
}): string {
  const shareUrl = getPublicCatalogUrl(options?.productRef, options?.categoryName);

  if (options?.productRef && options?.productName) {
    const priceStr =
      options.normalPriceCOP && options.priceCOP && options.normalPriceCOP > options.priceCOP
        ? `en promoción por ${formatCOP(options.priceCOP)} (Precio normal: ${formatCOP(options.normalPriceCOP)})`
        : options.priceCOP
        ? `por ${formatCOP(options.priceCOP)}`
        : '';
    const message = `¡Hola! 👋 Te comparto este producto del catálogo de IPS TECNOLÓGICA: ${options.productName} (Ref: ${options.productRef}) ${priceStr}. Visítanos aquí: ${shareUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  if (options?.categoryName && options.categoryName !== 'Todas') {
    const message = `¡Hola! 👋 Te comparto el catálogo de IPS TECNOLÓGICA (${options.categoryName}). Encuentra productos tecnológicos, consulta precios y descubre nuestras promociones. Visítanos aquí: ${shareUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  const defaultMessage = `¡Hola! 👋 Te comparto el catálogo de IPS TECNOLÓGICA. Encuentra productos tecnológicos, consulta precios y descubre nuestras promociones. Visítanos aquí: ${shareUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(defaultMessage)}`;
}

/**
 * Colombian Peso (COP) Currency Formatter
 * Example output: "$2.990.000 COP"
 */
export function formatCOP(amount: number): string {
  if (isNaN(amount)) return '$0 COP';
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${formatted} COP`;
}

/**
 * Clean phone numbers to international WhatsApp format (defaults to +57 Colombia if 10 digits)
 */
export function cleanWhatsAppNumber(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('57')) {
    return digits;
  }
  if (digits.length === 10) {
    return `57${digits}`;
  }
  return digits || '573108947231';
}

/**
 * Generate a prefilled WhatsApp inquiry message to the company's commercial line
 */
export function createWhatsAppLink(
  phone: string,
  productName: string,
  reference: string,
  price: number,
  normalPrice?: number
): string {
  const cleanPhone = cleanWhatsAppNumber(phone);
  const priceText =
    normalPrice && normalPrice > price
      ? `en promoción por *${formatCOP(price)}* (Precio normal: ${formatCOP(normalPrice)})`
      : `con precio *${formatCOP(price)}*`;
  const productUrl = getPublicCatalogUrl(reference);
  const text = `¡Hola IPS TECNOLÓGICA! Estoy interesado en el producto: *${productName}* (Ref: *${reference}*) ${priceText}.\nEnlace: ${productUrl}\n¿Tienen disponibilidad inmediata?`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Generate a prefilled WhatsApp order consultation link
 */
export function buildWhatsAppOrderLink(
  phone: string,
  orderId: string,
  totalCOP: number,
  itemsList: string[]
): string {
  const cleanPhone = cleanWhatsAppNumber(phone);
  const itemsText = itemsList.slice(0, 3).join(', ') + (itemsList.length > 3 ? '...' : '');
  const text = `¡Hola IPS TECNOLÓGICA! Deseo consultar el estado de mi pedido *${orderId}* por total ${formatCOP(totalCOP)} (${itemsText}).`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Format ISO dates for human reading in America/Bogota
 */
export function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return isoDate;
  }
}

/**
 * Format full date and time in Colombia timezone (America/Bogota)
 */
export function formatBogotaDateTime(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return isoDate;
  }
}

/**
 * Converts a Date or ISO string to YYYY-MM-DDTHH:mm formatted in America/Bogota (UTC-5)
 * for <input type="datetime-local" />
 */
export function toBogotaDateTimeLocalInput(dateOrIso: Date | string): string {
  try {
    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    const bogotaMs = d.getTime() - 5 * 60 * 60 * 1000;
    const bogotaDate = new Date(bogotaMs);
    return bogotaDate.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

/**
 * Parses a YYYY-MM-DDTHH:mm string from <input type="datetime-local" />
 * assuming America/Bogota (UTC-05:00) and returns a standard UTC ISO string.
 */
export function fromBogotaDateTimeLocalInput(localValue: string): string {
  if (!localValue) return new Date().toISOString();
  if (localValue.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(localValue)) {
    return new Date(localValue).toISOString();
  }
  const withSeconds = localValue.length === 16 ? `${localValue}:00` : localValue;
  return new Date(`${withSeconds}-05:00`).toISOString();
}

/**
 * Computes remaining time until endDate ISO string
 */
export function getRemainingCountdown(endDateIso: string, nowMs: number = Date.now()) {
  const endMs = new Date(endDateIso).getTime();
  const diff = Math.max(0, endMs - nowMs);
  const expired = diff <= 0;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatted =
    days > 0
      ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    expired,
    totalMs: diff,
    days,
    hours,
    minutes,
    seconds,
    formatted
  };
}
