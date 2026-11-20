const MAX_DIMENSION_PX = 1024;
const JPEG_QUALITY = 0.86;

export const MAX_IMAGE_FILE_BYTES = 25 * 1024 * 1024; // 25 MB safety cap

export const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/x-ms-bmp',
  'image/gif',
]);

const SUPPORTED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.bmp',
  '.gif',
]);

export type ImageFileValidationResult =
  | { ok: true; mimeType: string }
  | { ok: false; reason: 'unsupported-format' | 'file-too-large' | 'empty-file' };

export interface ImageFileLike {
  name: string;
  type: string;
  size: number;
}

/**
 * Validates a user-selected image file against safely supported raster formats
 * (JPEG, PNG, WebP, HEIC/HEIF, BMP, GIF) and a 25 MB size limit.
 * Explicitly rejects SVG, TIFF, PDF, video, and empty/corrupt files.
 */
export function validateImageFile(file: ImageFileLike): ImageFileValidationResult {
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, reason: 'empty-file' };
  }

  if (file.size > MAX_IMAGE_FILE_BYTES) {
    return { ok: false, reason: 'file-too-large' };
  }

  const normalizedType = file.type.trim().toLowerCase().split(';')[0].trim();
  if (normalizedType) {
    if (!SUPPORTED_IMAGE_MIME_TYPES.has(normalizedType)) {
      return { ok: false, reason: 'unsupported-format' };
    }
    return { ok: true, mimeType: normalizedType };
  }

  // Some mobile browsers omit file.type for HEIC or camera files; check extension safely
  const lowerName = file.name.trim().toLowerCase();
  const dotIdx = lowerName.lastIndexOf('.');
  const ext = dotIdx >= 0 ? lowerName.slice(dotIdx) : '';
  if (SUPPORTED_EXTENSIONS.has(ext)) {
    return { ok: true, mimeType: ext === '.png' ? 'image/png' : 'image/jpeg' };
  }

  return { ok: false, reason: 'unsupported-format' };
}

export interface EncodedImagePayload {
  imageBase64: string;
  mimeType: 'image/jpeg';
}

/**
 * Decodes a selected image URI safely and downscales to at most 1024px on the
 * longest edge before sending to the server-side Gemini endpoint, preventing
 * excessive memory usage or oversized payloads.
 */
export function decodeAndResizeImageUri(uri: string): Promise<EncodedImagePayload> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;
        if (naturalWidth <= 0 || naturalHeight <= 0) {
          reject(new Error('INVALID_IMAGE'));
          return;
        }

        const longest = Math.max(naturalWidth, naturalHeight);
        const scale = longest > MAX_DIMENSION_PX ? MAX_DIMENSION_PX / longest : 1;
        const targetW = Math.max(1, Math.round(naturalWidth * scale));
        const targetH = Math.max(1, Math.round(naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('INVALID_IMAGE'));
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        const commaIndex = dataUrl.indexOf(',');
        if (commaIndex === -1) {
          reject(new Error('INVALID_IMAGE'));
          return;
        }

        const imageBase64 = dataUrl.slice(commaIndex + 1);
        if (!imageBase64) {
          reject(new Error('INVALID_IMAGE'));
          return;
        }

        resolve({
          imageBase64,
          mimeType: 'image/jpeg',
        });
      } catch {
        reject(new Error('INVALID_IMAGE'));
      }
    };

    img.onerror = () => {
      reject(new Error('INVALID_IMAGE'));
    };

    img.src = uri;
  });
}

const THUMBNAIL_MAX_DIM_PX = 180;
const THUMBNAIL_JPEG_QUALITY = 0.65;
const MAX_THUMBNAIL_DATA_URL_CHARS = 36_000;

/**
 * Generates a compact, local-only JPEG thumbnail data URL (<= 180px, <= ~36 KB)
 * for on-device scan history display. Never throws — returns undefined if image
 * decoding fails or exceeds safe size bounds.
 */
export function createSafeThumbnailDataUrl(uri: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      resolve(undefined);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;
        if (naturalWidth <= 0 || naturalHeight <= 0) {
          resolve(undefined);
          return;
        }

        const longest = Math.max(naturalWidth, naturalHeight);
        const scale = longest > THUMBNAIL_MAX_DIM_PX ? THUMBNAIL_MAX_DIM_PX / longest : 1;
        const targetW = Math.max(1, Math.round(naturalWidth * scale));
        const targetH = Math.max(1, Math.round(naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(undefined);
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL('image/jpeg', THUMBNAIL_JPEG_QUALITY);
        if (
          dataUrl.startsWith('data:image/jpeg;base64,') &&
          dataUrl.length <= MAX_THUMBNAIL_DATA_URL_CHARS
        ) {
          resolve(dataUrl);
        } else {
          resolve(undefined);
        }
      } catch {
        resolve(undefined);
      }
    };

    img.onerror = () => resolve(undefined);
    img.src = uri;
  });
}

