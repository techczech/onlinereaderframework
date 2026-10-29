import { parseXml, SVG_NS } from './epub-xhtml.js';

export type PublicationEpubImageType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/svg+xml';

export interface PublicationEpubAsset {
  /** Exact image src in rendered publication content; no URL is fetched. */
  href: string;
  /** Optional cover role; at most one supplied asset may have it. */
  role?: 'cover';
  mediaType: PublicationEpubImageType;
  data: Blob | Uint8Array | ArrayBuffer;
}

export interface PublicationEpubOptions {
  assets?: readonly PublicationEpubAsset[];
}

export interface PreparedAsset {
  filename: string;
  mediaType: PublicationEpubImageType;
  bytes: Uint8Array;
}

const MAX_ASSET_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const extensions: Record<PublicationEpubImageType, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/svg+xml': 'svg',
};

export async function prepareAsset(asset: PublicationEpubAsset, index: number): Promise<PreparedAsset> {
  if (!Object.prototype.hasOwnProperty.call(extensions, asset.mediaType)) throw new Error(`Unsupported EPUB image media type: ${asset.mediaType}`);
  const size = asset.data instanceof Blob ? asset.data.size : asset.data.byteLength;
  if (size === 0 || size > MAX_ASSET_BYTES) throw new Error(`EPUB image must contain 1–${MAX_ASSET_BYTES} bytes: ${asset.href}`);
  const bytes = asset.data instanceof Blob ? new Uint8Array(await asset.data.arrayBuffer())
    : asset.data instanceof Uint8Array ? new Uint8Array(asset.data) : new Uint8Array(asset.data.slice(0));
  if (asset.mediaType === 'image/svg+xml') validateSvg(bytes, asset.href);
  else {
    const prefix = Array.from(bytes.slice(0, 8));
    const valid = asset.mediaType === 'image/png' ? prefix.join(',') === '137,80,78,71,13,10,26,10'
      : asset.mediaType === 'image/jpeg' ? prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255
      : new TextDecoder().decode(bytes.slice(0, 6)).match(/^GIF8[79]a$/);
    if (!valid) throw new Error(`EPUB image bytes do not match ${asset.mediaType}: ${asset.href}`);
    const bitmap = await createImageBitmap(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: asset.mediaType })).catch(() => {
      throw new Error(`EPUB image cannot be decoded: ${asset.href}`);
    });
    const tooLarge = bitmap.width * bitmap.height > 64_000_000 || bitmap.width > 32768 || bitmap.height > 32768;
    bitmap.close();
    if (tooLarge) throw new Error(`EPUB image exceeds the 64 megapixel / 32768 pixel limit: ${asset.href}`);
  }
  return { filename: `Assets/image-${String(index + 1).padStart(4, '0')}.${extensions[asset.mediaType]}`, mediaType: asset.mediaType, bytes };
}

export function assertTotalAssetSize(assets: readonly PreparedAsset[]): void {
  if (assets.reduce((total, asset) => total + asset.bytes.byteLength, 0) > MAX_TOTAL_BYTES) {
    throw new Error('EPUB supplied images exceed the 100 MiB total limit.');
  }
}

// A static SVG subset permits diagrams without scripting, CSS, animation,
// foreign HTML, external references, entity expansion or resource loading.
const svgTags = new Set('svg g defs path line polyline polygon rect circle ellipse text tspan textPath linearGradient radialGradient stop clipPath mask pattern marker title desc use symbol'.split(' '));
const svgAttributes = new Set(('id class role aria-label aria-labelledby aria-describedby viewBox preserveAspectRatio width height x y x1 y1 x2 y2 dx dy cx cy r rx ry d points transform gradientTransform gradientUnits spreadMethod offset stop-color stop-opacity fill fill-rule fill-opacity stroke stroke-width stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset stroke-opacity opacity font-family font-size font-weight font-style text-anchor dominant-baseline marker-start marker-mid marker-end markerWidth markerHeight markerUnits refX refY orient clip-path clipPathUnits mask maskUnits maskContentUnits patternUnits patternContentUnits patternTransform startOffset textLength lengthAdjust href').split(' '));
function validateSvg(bytes: Uint8Array, href: string): void {
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (/<!DOCTYPE|<!ENTITY|<\?/i.test(source.replace(/^\s*<\?xml\s[^?]*\?>/, ''))) {
    throw new Error(`Unsafe SVG declarations in EPUB image: ${href}`);
  }
  const document = parseXml(source, `SVG image ${href}`);
  if (document.documentElement.localName !== 'svg' || document.documentElement.namespaceURI !== SVG_NS) {
    throw new Error(`EPUB SVG image requires an SVG namespace root: ${href}`);
  }
  const ids = new Set<string>();
  const references: string[] = [];
  for (const element of Array.from(document.getElementsByTagName('*'))) {
    if (element.namespaceURI !== SVG_NS || !svgTags.has(element.localName)) throw new Error(`Unsafe SVG element in EPUB image: ${href}`);
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name === 'xmlns' && attribute.value === SVG_NS) continue;
      if (attribute.name === 'xmlns:xlink' && attribute.value === 'http://www.w3.org/1999/xlink') continue;
      if (attribute.name === 'xml:space' && /^(default|preserve)$/.test(attribute.value)) continue;
      if (!svgAttributes.has(attribute.name) && attribute.name !== 'xlink:href') throw new Error(`Unsafe SVG attribute ${attribute.name} in EPUB image: ${href}`);
      if (attribute.name === 'id') {
        if (!attribute.value || ids.has(attribute.value)) throw new Error(`Duplicate or empty SVG ID in EPUB image: ${href}`);
        ids.add(attribute.value);
      }
      if (attribute.localName === 'href') {
        if (!/^#[A-Za-z_][\w.:-]*$/.test(attribute.value)) throw new Error(`External SVG reference in EPUB image: ${href}`);
        references.push(attribute.value.slice(1));
      }
      if (/url\s*\(|[\\{};]/i.test(attribute.value)) {
        const reference = attribute.value.match(/^url\(#[A-Za-z_][\w.:-]*\)$/);
        if (!reference) throw new Error(`Unsafe SVG resource or CSS in EPUB image: ${href}`);
        references.push(attribute.value.slice(5, -1));
      }
    }
  }
  if (references.some(reference => !ids.has(reference))) throw new Error(`Missing SVG fragment in EPUB image: ${href}`);
}
