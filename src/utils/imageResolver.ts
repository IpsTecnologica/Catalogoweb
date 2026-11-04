export function getProductFallbackSvg(name = 'IPS TECNOLÓGICA', category = 'Tecnología'): string {
  const safeName = (name || 'IPS TECNOLÓGICA').replace(/[<>&"']/g, '').slice(0, 32);
  const safeCat = (category || 'Hardware TI').replace(/[<>&"']/g, '').slice(0, 24);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="600" height="450" fill="url(#bg)"/>
    <rect x="24" y="24" width="552" height="402" rx="16" fill="none" stroke="#dc2626" stroke-width="2" stroke-opacity="0.4"/>
    <rect x="44" y="44" width="90" height="32" rx="6" fill="#dc2626"/>
    <text x="89" y="65" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="14">IPS TECH</text>
    <text x="300" y="215" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="22">${safeName}</text>
    <text x="300" y="250" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="15">${safeCat}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function resolveProductImageUrl(item?: {
  images?: string[];
  imageUrl?: string;
  imageDriveId?: string;
  name?: string;
  category?: string;
} | null): string {
  if (!item) return getProductFallbackSvg();
  const primary = (item.images && item.images[0]) || item.imageUrl || '';
  if (primary && primary.trim() !== '') {
    return primary;
  }
  if (item.imageDriveId && item.imageDriveId.trim() !== '') {
    return `/api/drive/files/${encodeURIComponent(item.imageDriveId.trim())}`;
  }
  return getProductFallbackSvg(item.name, item.category);
}
