const MAX_LONG_SIDE = 2600;
const MAX_LONG_SIDE_TALL = 3000; // long vertical receipts
const MIN_LONG_SIDE = 1800;
const OCR_MAX_BYTES = 1024 * 1024; // OCR.Space free tier limit
const QUALITY_STEPS = [0.92, 0.85, 0.78, 0.7, 0.62];

/**
 * Resize, enhance and compress camera/gallery images before OCR upload.
 * PDFs and spreadsheets are returned unchanged.
 *
 * Throws an Error with code UNSUPPORTED_IMAGE when the browser cannot decode
 * the file (for example HEIC on Chrome), so the caller can show a clear message
 * instead of uploading an unreadable file.
 */
export async function compressImageForOcr(file) {
  if (!file?.type?.startsWith('image/')) {
    return file;
  }

  // Crisp screenshots are already ideal for OCR: do not degrade them.
  if (file.type === 'image/png' && file.size <= OCR_MAX_BYTES) {
    return file;
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    const error = new Error('Formato de imagen no soportado. Probá con JPG o PNG.');
    error.code = 'UNSUPPORTED_IMAGE';
    throw error;
  }

  try {
    const longSide = Math.max(bitmap.width, bitmap.height);
    const shortSide = Math.min(bitmap.width, bitmap.height);
    const isTall = longSide / shortSide >= 2;
    const cap = isTall ? MAX_LONG_SIDE_TALL : MAX_LONG_SIDE;
    const targetLong = Math.min(cap, Math.max(longSide, MIN_LONG_SIDE));

    let scale = Math.min(1, targetLong / longSide);
    let canvas = drawToCanvas(bitmap, scale);
    enhanceForOcr(canvas);

    let blob = await encodeJpeg(canvas, QUALITY_STEPS);

    // Still above the OCR.Space limit: shrink and retry.
    while (blob && blob.size > OCR_MAX_BYTES && scale > 0.35) {
      scale *= 0.8;
      canvas = drawToCanvas(bitmap, scale);
      enhanceForOcr(canvas);
      blob = await encodeJpeg(canvas, QUALITY_STEPS);
    }

    if (!blob) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'receipt';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close?.();
  }
}

function drawToCanvas(bitmap, scale) {
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  // White background: transparent PNG areas would turn black on JPEG export.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function enhanceForOcr(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return;
  }

  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;

  // Grayscale + contrast: thermal paper and shadows become readable.
  const contrast = 1.35;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const value = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  // Unsharp mask (3x3 kernel) to recover blurred edges.
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const source = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          sum += source[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
        }
      }
      const idx = (y * width + x) * 4;
      const value = Math.max(0, Math.min(255, sum));
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
    }
  }

  ctx.putImageData(image, 0, 0);
}

async function encodeJpeg(canvas, qualities) {
  let last = null;
  for (const quality of qualities) {
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob) {
      continue;
    }
    last = blob;
    if (blob.size <= OCR_MAX_BYTES) {
      return blob;
    }
  }
  return last;
}

export function fileFingerprint(file) {
  if (!file) {
    return '';
  }
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}
