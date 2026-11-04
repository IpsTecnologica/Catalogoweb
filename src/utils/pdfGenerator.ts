import { jsPDF } from 'jspdf';
import { Product, CompanyProfile, CatalogOptions } from '../types';
import { formatCOP, formatBogotaDateTime } from './formatters';
import { api } from '../services/api';

/**
 * Letter Paper Dimensions in millimeters (ANSI Letter: 8.5 x 11 inches)
 */
const PAGE_WIDTH = 215.9;
const PAGE_HEIGHT = 279.4;

const MARGIN_LEFT = 10;
const MARGIN_RIGHT = 10;
const MARGIN_TOP = 26; // start of product grid
const MARGIN_BOTTOM = 18; // bottom reserved for footer

const GRID_COLS = 3;
const GRID_ROWS = 4;
export const PRODUCTS_PER_PAGE = GRID_COLS * GRID_ROWS; // 12 products per page

export interface PreloadedImageAsset {
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  format: 'PNG' | 'JPEG';
}

export interface PreloadedImageMap {
  logoAsset: PreloadedImageAsset | null;
  logoDataUrl: string | null;
  productImages: Record<string, string>; // legacy compatibility: product.id -> dataUrl
  productAssets: Record<string, PreloadedImageAsset>; // product.id -> full asset with natural dimensions
  failedProducts: Array<{ id: string; reference: string; name: string; reason: string }>;
}

export type PreloadedCatalogAssets = PreloadedImageMap;

/**
 * Calculates page distribution for a list of products
 */
export function calculateCatalogPages(productCount: number, includeCover: boolean) {
  const interiorPages = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_PAGE));
  const totalPages = includeCover ? interiorPages + 1 : interiorPages;
  return { interiorPages, totalPages };
}

/**
 * Loads any image URL (local /uploads/..., SVG, PNG, JPEG, WebP, or remote URL),
 * detects its natural width and height, and rasterizes it at its EXACT original aspect ratio
 * without stretching, cropping, or distorting it.
 */
async function loadAndRasterizeImagePreservingAspect(
  rawUrl: string,
  maxDimensionPx = 900,
  transparentBg = false
): Promise<PreloadedImageAsset | null> {
  if (!rawUrl || !rawUrl.trim()) return null;

  try {
    let sourceDataUrl = rawUrl;
    if (!rawUrl.startsWith('data:image/')) {
      const resolved = await api.getImageDataUrl(rawUrl);
      if (resolved && resolved.dataUrl) {
        sourceDataUrl = resolved.dataUrl;
      }
    }

    return await new Promise<PreloadedImageAsset | null>(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const naturalW = img.naturalWidth || img.width || 600;
          const naturalH = img.naturalHeight || img.height || 400;
          if (naturalW <= 0 || naturalH <= 0) {
            resolve(null);
            return;
          }

          // Scale down only if larger than maxDimensionPx, strictly keeping original aspect ratio
          const scale = Math.min(1, maxDimensionPx / Math.max(naturalW, naturalH));
          const canvasW = Math.max(1, Math.round(naturalW * scale));
          const canvasH = Math.max(1, Math.round(naturalH * scale));

          const canvas = document.createElement('canvas');
          canvas.width = canvasW;
          canvas.height = canvasH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          if (!transparentBg) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvasW, canvasH);
          } else {
            ctx.clearRect(0, 0, canvasW, canvasH);
          }

          ctx.drawImage(img, 0, 0, canvasW, canvasH);
          const outMime = transparentBg ? 'image/png' : 'image/jpeg';
          const format: 'PNG' | 'JPEG' = transparentBg ? 'PNG' : 'JPEG';
          const dataUrl = canvas.toDataURL(outMime, 0.94);

          resolve({
            dataUrl,
            width: naturalW,
            height: naturalH,
            aspectRatio: naturalW / naturalH,
            format
          });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = sourceDataUrl;
    });
  } catch {
    return null;
  }
}

/**
 * Draws an image inside a target bounding box in millimeters using strict `contain` math:
 * - Preserves original aspect ratio
 * - Centers horizontally and vertically
 * - Never stretches, flattens, or crops the image
 */
function drawImageContainInBox(
  doc: jsPDF,
  asset: PreloadedImageAsset,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  paddingMm = 1.2
): boolean {
  const availW = Math.max(1, boxW - paddingMm * 2);
  const availH = Math.max(1, boxH - paddingMm * 2);

  const imgW = asset.width > 0 ? asset.width : 600;
  const imgH = asset.height > 0 ? asset.height : 400;

  const scale = Math.min(availW / imgW, availH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;

  const drawX = boxX + paddingMm + (availW - drawW) / 2;
  const drawY = boxY + paddingMm + (availH - drawH) / 2;

  try {
    doc.addImage(asset.dataUrl, asset.format, drawX, drawY, drawW, drawH, undefined, 'FAST');
    return true;
  } catch {
    return false;
  }
}

/**
 * Preloads and verifies all product images and company logo before generating the PDF,
 * recording exact original dimensions so every image renders with proportional `contain` fit.
 */
export async function verifyAndPreloadCatalogImages(
  products: Product[],
  company: CompanyProfile
): Promise<PreloadedImageMap> {
  const productImages: Record<string, string> = {};
  const productAssets: Record<string, PreloadedImageAsset> = {};
  const failedProducts: Array<{ id: string; reference: string; name: string; reason: string }> = [];

  // 1. Preload Company Logo preserving exact aspect ratio and transparency
  let logoAsset: PreloadedImageAsset | null = null;
  if (company.logoUrl) {
    logoAsset = await loadAndRasterizeImagePreservingAspect(company.logoUrl, 600, true);
  }
  if (!logoAsset) {
    logoAsset = await loadAndRasterizeImagePreservingAspect('/uploads/ips_official_logo.svg', 600, true);
  }

  // 2. Preload each product's primary image preserving natural aspect ratio
  await Promise.all(
    products.map(async product => {
      const mainImgUrl = product.images && product.images.length > 0 ? product.images[0] : '';
      if (!mainImgUrl) {
        failedProducts.push({
          id: product.id,
          reference: product.reference,
          name: product.name,
          reason: 'El producto no tiene fotografía asignada.'
        });
        return;
      }

      const asset = await loadAndRasterizeImagePreservingAspect(mainImgUrl, 900, false);
      if (asset) {
        productAssets[product.id] = asset;
        productImages[product.id] = asset.dataUrl;
      } else {
        failedProducts.push({
          id: product.id,
          reference: product.reference,
          name: product.name,
          reason: `No se pudo cargar o verificar la imagen (${mainImgUrl}).`
        });
      }
    })
  );

  return {
    logoAsset,
    logoDataUrl: logoAsset ? logoAsset.dataUrl : null,
    productImages,
    productAssets,
    failedProducts
  };
}

/**
 * Generates the professional PDF catalog with real verified images (strict aspect-ratio contain),
 * company logo, and promotional prices when active.
 */
export async function generateCatalogPDF(
  products: Product[],
  company: CompanyProfile,
  options: CatalogOptions,
  preloaded?: PreloadedImageMap
): Promise<jsPDF> {
  const filteredProducts = products.filter(p => !options.onlyActive || p.isActive);
  const imageAssets = preloaded || (await verifyAndPreloadCatalogImages(filteredProducts, company));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
    compress: true
  });

  const { template, includeCover } = options;
  const totalInteriorPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const grandTotalPages = includeCover ? totalInteriorPages + 1 : totalInteriorPages;

  const theme = getThemeColors(template, options.seasonalTemplate);

  // 1. COVER PAGE (Optional)
  if (includeCover) {
    drawCoverPage(doc, company, options, filteredProducts, theme, imageAssets.logoAsset);
    doc.addPage('letter', 'portrait');
  }

  // 2. INTERIOR PAGES (3 cols x 4 rows = max 12 items per page)
  for (let pageIdx = 0; pageIdx < totalInteriorPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage('letter', 'portrait');
    }

    // Interior Header with Logo & Company Info
    drawInteriorHeader(doc, company, options, theme, imageAssets.logoAsset);

    // Slice products for this page
    const startIndex = pageIdx * PRODUCTS_PER_PAGE;
    const pageProducts = filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);

    // Draw the 3x4 grid with real product photos & promotions
    drawProductGrid(doc, pageProducts, theme, options, imageAssets.productAssets);

    // Interior Footer with pagination
    drawInteriorFooter(
      doc,
      company,
      options,
      theme,
      includeCover ? pageIdx + 2 : pageIdx + 1,
      grandTotalPages
    );
  }

  return doc;
}

function hexToRgbTuple(hex: string, fallback: [number, number, number]): [number, number, number] {
  const clean = (hex || '').replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return [r, g, b];
    }
  }
  return fallback;
}

function getEffectiveHorizontalMargin(options: CatalogOptions): number {
  const raw = Number(options.marginMm);
  if (!Number.isFinite(raw) || raw <= 0) return MARGIN_LEFT;
  return Math.max(8, Math.min(18, raw));
}

function getThemeColors(template: string, seasonalTemplate?: CatalogOptions['seasonalTemplate']) {
  if (seasonalTemplate?.primaryColor) {
    const primary = hexToRgbTuple(seasonalTemplate.primaryColor, [220, 38, 38]);
    const secondary = hexToRgbTuple(seasonalTemplate.secondaryColor || '#111827', [17, 24, 39]);
    return {
      primary,
      darkHeader: secondary,
      headerText: [255, 255, 255] as [number, number, number],
      border: [226, 232, 240] as [number, number, number],
      textDark: [15, 23, 42] as [number, number, number],
      textMuted: [100, 116, 139] as [number, number, number],
      bgCard: [255, 255, 255] as [number, number, number],
      accentBar: primary,
      seasonalName: seasonalTemplate.name,
      seasonalBadge: seasonalTemplate.decorativeBadge || seasonalTemplate.badgeText
    };
  }

  switch (template) {
    case 'darkpro':
      return {
        primary: [220, 38, 38] as [number, number, number],
        darkHeader: [17, 24, 39] as [number, number, number],
        headerText: [255, 255, 255] as [number, number, number],
        border: [203, 213, 225] as [number, number, number],
        textDark: [15, 23, 42] as [number, number, number],
        textMuted: [100, 116, 139] as [number, number, number],
        bgCard: [255, 255, 255] as [number, number, number],
        accentBar: [220, 38, 38] as [number, number, number],
        seasonalName: undefined,
        seasonalBadge: undefined
      };
    case 'minimalista':
      return {
        primary: [220, 38, 38] as [number, number, number],
        darkHeader: [255, 255, 255] as [number, number, number],
        headerText: [15, 23, 42] as [number, number, number],
        border: [226, 232, 240] as [number, number, number],
        textDark: [15, 23, 42] as [number, number, number],
        textMuted: [100, 116, 139] as [number, number, number],
        bgCard: [255, 255, 255] as [number, number, number],
        accentBar: [220, 38, 38] as [number, number, number],
        seasonalName: undefined,
        seasonalBadge: undefined
      };
    case 'corporativo':
    default:
      return {
        primary: [220, 38, 38] as [number, number, number],
        darkHeader: [17, 24, 39] as [number, number, number],
        headerText: [15, 23, 42] as [number, number, number],
        border: [226, 232, 240] as [number, number, number],
        textDark: [17, 24, 39] as [number, number, number],
        textMuted: [100, 116, 139] as [number, number, number],
        bgCard: [255, 255, 255] as [number, number, number],
        accentBar: [220, 38, 38] as [number, number, number],
        seasonalName: undefined,
        seasonalBadge: undefined
      };
  }
}

/**
 * Draws the independent Cover Page with official company logo, details, and promotion validity
 */
function drawCoverPage(
  doc: jsPDF,
  company: CompanyProfile,
  options: CatalogOptions,
  filteredProducts: Product[],
  theme: ReturnType<typeof getThemeColors>,
  logoAsset: PreloadedImageAsset | null
) {
  const marginX = getEffectiveHorizontalMargin(options);
  const contentWidth = PAGE_WIDTH - marginX * 2;
  const productCount = filteredProducts.length;
  const activePromoCount = filteredProducts.filter(p => Boolean(p.activePromotion)).length;

  // Top Corporate Accent Bar
  doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  doc.rect(0, 0, PAGE_WIDTH, 12, 'F');

  // Background Header Block
  doc.setFillColor(theme.darkHeader[0], theme.darkHeader[1], theme.darkHeader[2]);
  doc.rect(0, 12, PAGE_WIDTH, 74, 'F');

  // Draw Configured Company Logo or Emblem with strict aspect ratio
  let textStartX = marginX + 26;
  if (logoAsset) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX, 22, 42, 20, 2, 2, 'F');
    const ok = drawImageContainInBox(doc, logoAsset, marginX, 22, 42, 20, 1.2);
    if (ok) {
      textStartX = marginX + 47;
    } else {
      doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
      doc.roundedRect(marginX, 24, 18, 18, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('IPS', marginX + 9, 36, { align: 'center' });
    }
  } else {
    doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    doc.roundedRect(marginX, 24, 18, 18, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('IPS', marginX + 9, 36, { align: 'center' });
  }

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const companyLines = doc.splitTextToSize(company.name || 'IPS TECNOLÓGICA', PAGE_WIDTH - marginX - textStartX);
  doc.text(companyLines.slice(0, 1), textStartX, 32);

  // Slogan
  doc.setFontSize(9.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  const sloganLines = doc.splitTextToSize(
    company.slogan || 'Innovación y Soluciones Tecnológicas de Alta Gama',
    PAGE_WIDTH - marginX - textStartX
  );
  doc.text(sloganLines.slice(0, 1), textStartX, 40);

  // Thin primary divider
  doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  doc.setLineWidth(1.2);
  doc.line(marginX, 48, PAGE_WIDTH - marginX, 48);

  // Generation Date & Edition Metadata
  doc.setFontSize(8.2);
  doc.setTextColor(226, 232, 240);
  const generatedStr = formatBogotaDateTime(new Date().toISOString());
  const seasonalTag = theme.seasonalName ? ` · EDICIÓN: ${theme.seasonalName.toUpperCase()}` : '';
  doc.text(`FECHA DE GENERACIÓN (COLOMBIA): ${generatedStr.toUpperCase()}${seasonalTag}`, marginX, 56);

  if (activePromoCount > 0) {
    doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    doc.roundedRect(marginX, 61, contentWidth, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.text(
      `★ INCLUYE ${activePromoCount} ${activePromoCount === 1 ? 'PRODUCTO CON PROMOCIÓN ACTIVA' : 'PRODUCTOS CON PROMOCIONES ACTIVAS'} POR TIEMPO LIMITADO`,
      marginX + 4,
      67.5
    );
  } else {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const valLines = doc.splitTextToSize(
      options.validityText ||
        options.offerValidityText ||
        'Vigencia comercial sujeta a disponibilidad de inventario · Precios en COP con IVA incluido.',
      contentWidth
    );
    doc.text(valLines.slice(0, 2), marginX, 64);
  }

  // Central Hero Frame
  const cardY = 96;
  const cardH = 100;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(marginX, cardY, contentWidth, cardH, 4, 4, 'FD');

  // Left vertical primary strip in hero
  doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  doc.rect(marginX, cardY + 8, 4, cardH - 16, 'F');

  // Hero Title (measured & wrapped so it never overflows)
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const heroTitleLines = doc.splitTextToSize(
    options.title || 'PORTAFOLIO DE EQUIPOS TECNOLÓGICOS',
    contentWidth - 22
  );
  doc.text(heroTitleLines.slice(0, 2), marginX + 12, cardY + 18);

  // Subtitle
  const subY = heroTitleLines.length > 1 ? cardY + 32 : cardY + 27;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const subLines = doc.splitTextToSize(
    options.subtitle || 'Hardware Profesional, Cómputo Corporativo y Redes de Vanguardia',
    contentWidth - 22
  );
  doc.text(subLines.slice(0, 2), marginX + 12, subY);

  // Company Description (wrapped)
  doc.setFontSize(8.8);
  doc.setTextColor(100, 116, 139);
  const descLines = doc.splitTextToSize(
    company.description ||
      'Presentamos nuestra selección oficial de productos tecnológicos certificados con garantía directa en Colombia. Soluciones integrales para optimizar el rendimiento y la conectividad empresarial.',
    contentWidth - 24
  );
  doc.text(descLines.slice(0, 3), marginX + 12, subY + 10);

  // 3 Feature Metrics inside Hero
  const featY = cardY + 70;
  const boxGap = 6;
  const boxW = (contentWidth - 24 - boxGap * 2) / 3;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX + 12, featY, boxW, 20, 2, 2, 'FD');
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`${productCount} EQUIPOS`, marginX + 12 + boxW / 2, featY + 9, { align: 'center' });
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.text('Fotografías reales proporcionales', marginX + 12 + boxW / 2, featY + 15, { align: 'center' });

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX + 12 + boxW + boxGap, featY, boxW, 20, 2, 2, 'FD');
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('100% GARANTÍA', marginX + 12 + boxW + boxGap + boxW / 2, featY + 9, { align: 'center' });
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.text('Soporte directo Ley 1480', marginX + 12 + boxW + boxGap + boxW / 2, featY + 15, { align: 'center' });

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX + 12 + (boxW + boxGap) * 2, featY, boxW, 20, 2, 2, 'FD');
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('ENVÍO NACIONAL', marginX + 12 + (boxW + boxGap) * 2 + boxW / 2, featY + 9, { align: 'center' });
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.text('Despachos asegurados', marginX + 12 + (boxW + boxGap) * 2 + boxW / 2, featY + 15, { align: 'center' });

  // Contact & Business Info Footer on Cover
  const contactY = 208;
  doc.setFillColor(17, 24, 39);
  doc.roundedRect(marginX, contactY, contentWidth, 56, 4, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DE CONTACTO OFICIALES Y CANALES COMERCIALES', marginX + 10, contactY + 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Empresa: ${company.name} ${company.nit ? `· NIT: ${company.nit}` : ''}`, marginX + 10, contactY + 20);
  doc.text(`Teléfono / PBX: ${company.phone || '+57 (601) 745-8920'}`, marginX + 10, contactY + 26);
  doc.text(`WhatsApp Comercial: ${company.whatsapp || '+57 310 894 7231'}`, marginX + 10, contactY + 32);
  doc.text(`Correo Electrónico: ${company.email || 'contacto@ipstecnologica.com.co'}`, marginX + 10, contactY + 38);
  doc.text(`Dirección: ${company.address || 'Cra. 15 # 85-30, Of. 402'} · ${company.city || 'Bogotá D.C.'}`, marginX + 10, contactY + 44);
  doc.text(`Sitio Web: ${company.website || 'https://ipstecnologica.com.co'}`, marginX + 10, contactY + 50);

  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('REDES Y ATENCIÓN DIGITAL:', marginX + contentWidth * 0.62, contactY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Instagram: ${company.social?.instagram || '@ipstecnologica'}`, marginX + contentWidth * 0.62, contactY + 27);
  doc.text(`Facebook: ${company.social?.facebook || '/ipstecnologica'}`, marginX + contentWidth * 0.62, contactY + 34);
  doc.text(`TikTok: ${company.social?.tiktok || '@ipstecnologica'}`, marginX + contentWidth * 0.62, contactY + 41);
  doc.text(`YouTube: ${company.social?.youtube || '@ipstecnologica'}`, marginX + contentWidth * 0.62, contactY + 48);

  // Bottom Notice
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.8);
  const termsLine = (company.commercialTerms || 'Precios en pesos colombianos (COP). Incluyen IVA.').substring(0, 135);
  doc.text(termsLine, PAGE_WIDTH / 2, PAGE_HEIGHT - 6, { align: 'center' });
}

/**
 * Draws the interior page header including the company logo with proportional `contain` scaling
 */
function drawInteriorHeader(
  doc: jsPDF,
  company: CompanyProfile,
  options: CatalogOptions,
  theme: ReturnType<typeof getThemeColors>,
  logoAsset: PreloadedImageAsset | null
) {
  const marginX = getEffectiveHorizontalMargin(options);

  // Top primary line
  doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  doc.rect(0, 0, PAGE_WIDTH, 3.5, 'F');

  let textX = marginX;
  if (logoAsset) {
    const ok = drawImageContainInBox(doc, logoAsset, marginX, 5, 24, 12, 0.5);
    if (ok) {
      textX = marginX + 26.5;
    }
  }

  // Company Name & Slogan on Left
  doc.setTextColor(theme.textDark[0], theme.textDark[1], theme.textDark[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text((company.name || 'IPS TECNOLÓGICA').substring(0, 38), textX, 10.5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(theme.textMuted[0], theme.textMuted[1], theme.textMuted[2]);
  doc.text((company.slogan || 'Catálogo Profesional de Productos Tecnológicos').substring(0, 56), textX, 15.2);

  // Title & Contact on Right
  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  const headerTitle = (options.title || 'CATÁLOGO DE PRODUCTOS').substring(0, 48);
  doc.text(headerTitle, PAGE_WIDTH - marginX, 10.5, { align: 'right' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(theme.textMuted[0], theme.textMuted[1], theme.textMuted[2]);
  doc.text(`WhatsApp: ${company.whatsapp} · Tel: ${company.phone}`, PAGE_WIDTH - marginX, 15.2, {
    align: 'right'
  });

  // Divider line
  doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
  doc.setLineWidth(0.4);
  doc.line(marginX, 20, PAGE_WIDTH - marginX, 20);
}

/**
 * Draws 3 columns x 4 rows = 12 products maximum per page
 */
function drawProductGrid(
  doc: jsPDF,
  products: Product[],
  theme: ReturnType<typeof getThemeColors>,
  options: CatalogOptions,
  productAssets: Record<string, PreloadedImageAsset>
) {
  const marginX = getEffectiveHorizontalMargin(options);
  const availableWidth = PAGE_WIDTH - marginX * 2;
  const colGap = 4;
  const colWidth = (availableWidth - colGap * (GRID_COLS - 1)) / GRID_COLS;

  const startY = MARGIN_TOP;
  const availableHeight = PAGE_HEIGHT - startY - MARGIN_BOTTOM;
  const rowGap = 3.5;
  const rowHeight = (availableHeight - rowGap * (GRID_ROWS - 1)) / GRID_ROWS;

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const index = row * GRID_COLS + col;
      if (index >= products.length) break;

      const product = products[index];
      const x = marginX + col * (colWidth + colGap);
      const y = startY + row * (rowHeight + rowGap);

      drawProductCard(doc, product, x, y, colWidth, rowHeight, theme, options, productAssets[product.id]);
    }
  }
}

/**
 * Draws an individual product card with:
 * - Strict text width/height measurement before drawing
 * - Automatic line wrapping within inner card padding
 * - Reserved non-overlapping zones for Photo, Reference+Brand, Title, Description, and Price Bar
 * - Image fitted via strict `contain` calculation centered horizontally and vertically (never stretched)
 */
function drawProductCard(
  doc: jsPDF,
  product: Product,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: ReturnType<typeof getThemeColors>,
  options: CatalogOptions,
  imageAsset?: PreloadedImageAsset
) {
  const hasPromo = Boolean(product.activePromotion);
  const padX = 2.8;
  const innerW = Math.max(20, width - padX * 2);

  // Card outer container
  doc.setFillColor(theme.bgCard[0], theme.bgCard[1], theme.bgCard[2]);
  if (hasPromo) {
    doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    doc.setLineWidth(0.5);
  } else {
    doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
    doc.setLineWidth(0.3);
  }
  doc.roundedRect(x, y, width, height, 1.5, 1.5, 'FD');

  // 1. Uniform Upper Photo Area (strictly bounded)
  const photoH = 22.5;
  const photoW = width - 4;
  const photoX = x + 2;
  const photoY = y + 2;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.25);
  doc.roundedRect(photoX, photoY, photoW, photoH, 1, 1, 'FD');

  let drawnOk = false;
  if (imageAsset) {
    drawnOk = drawImageContainInBox(doc, imageAsset, photoX, photoY, photoW, photoH, 1.2);
  }

  if (!drawnOk) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1, 0.8, 0.8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Imagen no disponible', photoX + photoW / 2, photoY + photoH / 2 - 1, { align: 'center' });
    doc.setFontSize(5);
    doc.text(product.reference, photoX + photoW / 2, photoY + photoH / 2 + 2.5, { align: 'center' });
  }

  // Promotional Corner Ribbon if active
  if (hasPromo && product.activePromotion) {
    const pct = product.activePromotion.savingsPercentage ?? product.activePromotion.discountPercentage ?? 0;
    doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    doc.roundedRect(photoX + photoW - 20.5, photoY + 1, 19.5, 4.2, 0.8, 0.8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.text(`OFERTA -${pct}%`, photoX + photoW - 10.75, photoY + 3.8, {
      align: 'center'
    });
  }

  // Reserve bottom price zone height so text above never collides with prices
  const priceZoneH = options.includePrice !== false ? (hasPromo ? 9.5 : 7.5) : 1.5;
  const maxContentBottomY = y + height - priceZoneH - 1.2;

  // 2. Reference Code & Brand/Category (measured so left & right never collide)
  let cursorY = photoY + photoH + 3.4;
  let refWidth = 0;
  if (options.includeReference !== false) {
    doc.setFontSize(5.4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    const refText = `REF: ${product.reference}`.substring(0, 18);
    doc.text(refText, x + padX, cursorY);
    refWidth = doc.getTextWidth(refText) + 2;
  }

  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(theme.textMuted[0], theme.textMuted[1], theme.textMuted[2]);
  const maxRightTextW = Math.max(12, innerW - refWidth);
  const rawBrandCat = `${(product.brand || product.category || 'IPS').substring(0, 12)} · ${
    product.isActive ? 'Disponible' : 'Inactivo'
  }`;
  const fittedBrandCat = doc.splitTextToSize(rawBrandCat, maxRightTextW)[0] || 'Disponible';
  doc.text(fittedBrandCat, x + width - padX, cursorY, { align: 'right' });

  // 3. Product Name (measured & wrapped up to 2 lines, height-checked)
  cursorY += 3.5;
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(theme.textDark[0], theme.textDark[1], theme.textDark[2]);
  const titleLines: string[] = doc.splitTextToSize(product.name || 'Equipo Tecnológico', innerW).slice(0, 2);
  const titleLineHeight = 2.75;
  for (let i = 0; i < titleLines.length; i++) {
    if (cursorY + i * titleLineHeight <= maxContentBottomY) {
      doc.text(titleLines[i], x + padX, cursorY + i * titleLineHeight);
    }
  }
  cursorY += titleLines.length * titleLineHeight + 0.8;

  // 4. Short Description (wrapped & strictly clipped to available vertical space above price bar)
  if (options.includeDescription !== false && cursorY + 2.2 <= maxContentBottomY) {
    doc.setFontSize(5.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(theme.textMuted[0], theme.textMuted[1], theme.textMuted[2]);
    const descLines: string[] = doc
      .splitTextToSize(
        product.shortDescription || 'Garantía oficial y soporte técnico directo en Colombia.',
        innerW
      )
      .slice(0, 2);
    const descLineHeight = 2.3;
    for (let i = 0; i < descLines.length; i++) {
      if (cursorY + i * descLineHeight <= maxContentBottomY) {
        doc.text(descLines[i], x + padX, cursorY + i * descLineHeight);
      }
    }
  }

  // 5. Bottom Price Area (Non-overlapping normal + promotional price)
  if (options.includePrice !== false) {
    const barY = y + height - priceZoneH;

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.25);
    doc.line(x + padX, barY, x + width - padX, barY);

    if (hasPromo && product.activePromotion) {
      const normalStr = `Antes: ${formatCOP(product.priceCOP)}`;
      doc.setFontSize(4.9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(normalStr, x + padX, barY + 3.0);
      const textWidth = doc.getTextWidth(normalStr);
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.22);
      doc.line(x + padX, barY + 2.4, x + padX + textWidth, barY + 2.4);

      doc.setFontSize(4.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      const saveStr = `-${product.activePromotion.savingsPercentage ?? product.activePromotion.discountPercentage ?? 0}%`;
      doc.text(saveStr, x + width - padX, barY + 3.0, {
        align: 'right'
      });

      doc.setFontSize(7.4);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
      doc.text(formatCOP(product.activePromotion.promotionalPriceCOP), x + padX, barY + 7.2);

      doc.setFontSize(4.9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Oferta vigente', x + width - padX, barY + 7.2, { align: 'right' });
    } else {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
      doc.text(formatCOP(product.priceCOP), x + padX, barY + 5.0);

      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('IVA incluido', x + width - padX, barY + 5.0, { align: 'right' });
    }
  }
}

/**
 * Draws interior footer with company links, conditions and exact pagination
 */
function drawInteriorFooter(
  doc: jsPDF,
  company: CompanyProfile,
  options: CatalogOptions,
  theme: ReturnType<typeof getThemeColors>,
  pageNum: number,
  totalPages: number
) {
  const marginX = getEffectiveHorizontalMargin(options);
  const footerY = PAGE_HEIGHT - 12;

  doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
  doc.setLineWidth(0.3);
  doc.line(marginX, footerY - 2, PAGE_WIDTH - marginX, footerY - 2);

  doc.setFontSize(6.3);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(theme.textMuted[0], theme.textMuted[1], theme.textMuted[2]);
  doc.text(
    `${company.name} · PBX: ${company.phone} · WhatsApp: ${company.whatsapp} · ${company.email}`,
    marginX,
    footerY + 2
  );

  doc.setFontSize(5.4);
  doc.text(
    options.includeTermsFooter
      ? 'Precios en COP incluyen IVA. Las promociones activas rigen únicamente hasta su fecha y hora de finalización.'
      : 'Asesoría comercial y despachos asegurados a toda Colombia.',
    marginX,
    footerY + 5.5
  );

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(theme.textDark[0], theme.textDark[1], theme.textDark[2]);
  doc.text(`Página ${pageNum} de ${totalPages}`, PAGE_WIDTH - marginX, footerY + 2, { align: 'right' });

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  doc.text(company.website || 'https://ipstecnologica.com.co', PAGE_WIDTH - marginX, footerY + 5.5, {
    align: 'right'
  });
}
