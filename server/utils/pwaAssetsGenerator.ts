import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import type { CompanyProfile, AppReleaseConfig } from '../data/store.js';

// Precompute CRC32 table for valid PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

export function hexToRgb(hex: string | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!hex || typeof hex !== 'string') return fallback;
  const clean = hex.trim().replace(/^#/, '');
  if (/^[0-9A-Fa-f]{3}$/.test(clean)) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16)
    ];
  }
  if (/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return [
      parseInt(clean.substring(0, 2), 16),
      parseInt(clean.substring(2, 4), 16),
      parseInt(clean.substring(4, 6), 16)
    ];
  }
  return fallback;
}

export function normalizeHexColor(hex: string | undefined, fallback: string): string {
  if (!hex || typeof hex !== 'string') return fallback;
  const clean = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return clean.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`.toUpperCase();
  }
  return fallback;
}

/**
 * 5x7 geometric bitmap font for "IPS" and "TECH"
 */
const GLYPHS: Record<string, string[]> = {
  I: [
    '11111',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '11111'
  ],
  P: [
    '11110',
    '10001',
    '10001',
    '11110',
    '10000',
    '10000',
    '10000'
  ],
  S: [
    '01111',
    '10000',
    '10000',
    '01110',
    '00001',
    '00001',
    '11110'
  ],
  T: [
    '11111',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100'
  ],
  E: [
    '11111',
    '10000',
    '10000',
    '11110',
    '10000',
    '10000',
    '11111'
  ],
  C: [
    '01111',
    '10000',
    '10000',
    '10000',
    '10000',
    '10000',
    '01111'
  ],
  H: [
    '10001',
    '10001',
    '10001',
    '11111',
    '10001',
    '10001',
    '10001'
  ]
};

function isInsideRoundedRect(
  x: number,
  y: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  radius: number
): boolean {
  if (x < rx || x >= rx + rw || y < ry || y >= ry + rh) return false;
  const cx = Math.max(rx + radius, Math.min(x, rx + rw - radius - 1));
  const cy = Math.max(ry + radius, Math.min(y, ry + rh - radius - 1));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function isInsideText(
  x: number,
  y: number,
  text: string,
  startX: number,
  startY: number,
  scale: number
): boolean {
  const charW = 5 * scale;
  const charH = 7 * scale;
  const gap = 1.5 * scale;
  if (y < startY || y >= startY + charH) return false;

  for (let idx = 0; idx < text.length; idx++) {
    const ch = text[idx];
    const glyph = GLYPHS[ch];
    if (!glyph) continue;
    const cx0 = startX + idx * (charW + gap);
    if (x >= cx0 && x < cx0 + charW) {
      const gx = Math.floor((x - cx0) / scale);
      const gy = Math.floor((y - startY) / scale);
      if (gy >= 0 && gy < 7 && gx >= 0 && gx < 5) {
        return glyph[gy][gx] === '1';
      }
    }
  }
  return false;
}

function generateCorporatePng(
  width: number,
  height: number,
  isMaskable = false,
  primaryHex = '#DC2626',
  backgroundHex = '#FFFFFF',
  secondaryHex = '#111827'
): Buffer {
  const [pR, pG, pB] = hexToRgb(primaryHex, [220, 38, 38]);
  const [bgR, bgG, bgB] = hexToRgb(backgroundHex, [255, 255, 255]);
  const [secR, secG, secB] = hexToRgb(secondaryHex, [17, 24, 39]);

  // Filter byte (1) + RGB (3 bytes per pixel)
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);

  // Safe zone padding for maskable (20% per W3C spec) vs standard any icon (8%)
  const pad = isMaskable
    ? Math.round(Math.min(width, height) * 0.18)
    : Math.round(Math.min(width, height) * 0.08);
  const badgeSize = Math.min(width, height) - pad * 2;
  const badgeX = Math.round((width - badgeSize) / 2);
  const badgeY = Math.round((height - badgeSize) / 2);
  const radius = Math.round(badgeSize * 0.22);

  // Outer card frame for standard icons
  const outerPad = Math.round(Math.min(width, height) * 0.03);
  const outerSize = Math.min(width, height) - outerPad * 2;
  const outerX = Math.round((width - outerSize) / 2);
  const outerY = Math.round((height - outerSize) / 2);
  const outerRadius = Math.round(outerSize * 0.24);

  // Text "IPS" centered in upper-middle of the primary badge, and "TECH" below it
  const ipsScale = Math.max(2, Math.round(badgeSize / 25));
  const ipsW = 3 * 5 * ipsScale + 2 * 1.5 * ipsScale;
  const ipsH = 7 * ipsScale;
  const ipsX = Math.round(width / 2 - ipsW / 2);
  const ipsY = Math.round(height / 2 - ipsH * 0.72);

  const techScale = Math.max(1, Math.round(badgeSize / 56));
  const techW = 4 * 5 * techScale + 3 * 1.5 * techScale;
  const techX = Math.round(width / 2 - techW / 2);
  const techY = Math.round(ipsY + ipsH + Math.max(4, Math.round(badgeSize * 0.06)));

  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3;

      // Base canvas uses company background color (for maskable/splash harmony) or secondary dark on wide banners
      let r = width > height ? secR : isMaskable ? pR : bgR;
      let g = width > height ? secG : isMaskable ? pG : bgG;
      let b = width > height ? secB : isMaskable ? pB : bgB;

      // For non-maskable square icons, draw a sleek dark secondary frame around the primary emblem
      if (!isMaskable && width === height) {
        if (isInsideRoundedRect(x, y, outerX, outerY, outerSize, outerSize, outerRadius)) {
          r = secR;
          g = secG;
          b = secB;
        }
      }

      // Top primary accent bar on wide OpenGraph banner
      if (width > height && y < Math.round(height * 0.045)) {
        r = pR;
        g = pG;
        b = pB;
      }

      // Inner primary emblem
      if (isInsideRoundedRect(x, y, badgeX, badgeY, badgeSize, badgeSize, radius)) {
        // Subtle vertical gradient on the primary badge for high-res depth
        const relY = (y - badgeY) / Math.max(1, badgeSize);
        const shade = 1 - relY * 0.14;
        r = Math.max(0, Math.min(255, Math.round(pR * shade)));
        g = Math.max(0, Math.min(255, Math.round(pG * shade)));
        b = Math.max(0, Math.min(255, Math.round(pB * shade)));

        if (isInsideText(x, y, 'IPS', ipsX, ipsY, ipsScale)) {
          r = 255;
          g = 255;
          b = 255;
        } else if (badgeSize >= 120 && isInsideText(x, y, 'TECH', techX, techY, techScale)) {
          r = 254;
          g = 226;
          b = 226;
        }
      }

      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth 8
  ihdr[9] = 2; // color type 2 (Truecolor RGB)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 6 });
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', iend)
  ]);
}

/**
 * Builds the optimized Web App Manifest object dynamically reflecting the company's
 * primary (`theme_color`) and background (`background_color`) colors and high-res icons.
 */
export function buildWebManifestObject(
  company?: Partial<CompanyProfile>,
  appConfig?: Partial<AppReleaseConfig>
) {
  const themeColor = normalizeHexColor(company?.colors?.primary, '#DC2626');
  const backgroundColor = normalizeHexColor(company?.colors?.background, '#FFFFFF');
  const appName = appConfig?.appName || company?.name || 'IPS TECNOLÓGICA';
  const shortName = appConfig?.shortName || 'IPS Tech';
  const description =
    company?.description ||
    'Catálogo oficial de productos tecnológicos, precios actualizados, promociones con cuenta regresiva y pedidos en línea de IPS TECNOLÓGICA.';

  return {
    id: '/',
    name: appName,
    short_name: shortName,
    description,
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    theme_color: themeColor,
    background_color: backgroundColor,
    prefer_related_applications: false,
    categories: ['shopping', 'business', 'technology'],
    lang: 'es-CO',
    dir: 'ltr',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/pwa-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: company?.logoUrl || '/uploads/ips_official_logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      }
    ],
    shortcuts: [
      {
        name: 'Catálogo de Productos',
        short_name: 'Catálogo',
        description: 'Explorar todos los productos tecnológicos disponibles',
        url: '/?source=pwa-shortcut',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      },
      {
        name: 'Promociones Activas',
        short_name: 'Ofertas',
        description: 'Ver productos con descuento y cuenta regresiva',
        url: '/?promo=active&source=pwa-shortcut',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    ]
  };
}

export function ensurePwaAndOgAssets(
  publicDir: string,
  company?: Partial<CompanyProfile>,
  appConfig?: Partial<AppReleaseConfig>,
  forceRegenerate = false
): void {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const primaryHex = normalizeHexColor(company?.colors?.primary, '#DC2626');
  const backgroundHex = normalizeHexColor(company?.colors?.background, '#FFFFFF');
  const secondaryHex = normalizeHexColor(company?.colors?.secondary, '#111827');

  const assets = [
    { name: 'pwa-192x192.png', w: 192, h: 192, maskable: false },
    { name: 'pwa-maskable-192x192.png', w: 192, h: 192, maskable: true },
    { name: 'pwa-512x512.png', w: 512, h: 512, maskable: false },
    { name: 'pwa-maskable-512x512.png', w: 512, h: 512, maskable: true },
    { name: 'apple-touch-icon.png', w: 180, h: 180, maskable: false },
    { name: 'og-catalog-banner.png', w: 600, h: 315, maskable: false }
  ];

  for (const item of assets) {
    const target = path.join(publicDir, item.name);
    if (forceRegenerate || !fs.existsSync(target)) {
      try {
        const pngBuf = generateCorporatePng(
          item.w,
          item.h,
          item.maskable,
          primaryHex,
          backgroundHex,
          secondaryHex
        );
        fs.writeFileSync(target, pngBuf);
      } catch (e) {
        console.warn(`Could not generate ${item.name}:`, e);
      }
    }
  }

  // Write synchronized manifest.webmanifest to disk
  try {
    const manifestObj = buildWebManifestObject(company, appConfig);
    fs.writeFileSync(
      path.join(publicDir, 'manifest.webmanifest'),
      JSON.stringify(manifestObj, null, 2),
      'utf-8'
    );
  } catch (e) {
    console.warn('Could not write manifest.webmanifest:', e);
  }
}
