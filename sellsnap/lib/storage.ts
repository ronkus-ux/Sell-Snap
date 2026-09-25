import { put } from '@vercel/blob';
import { logger } from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Magic bytes for file type detection (checking actual bytes, not Content-Type header)
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header; full check also requires bytes 8-11 = WEBP
};

/**
 * Detects the MIME type from the first bytes of the file buffer.
 * Never trusts the client-provided Content-Type.
 */
function detectMimeType(buffer: Buffer): string | null {
  for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (sig.every((byte, i) => buffer[i] === byte)) {
        // Extra WEBP check: bytes 8–11 must be "WEBP"
        if (mimeType === 'image/webp') {
          const webpMark = buffer.subarray(8, 12).toString('ascii');
          if (webpMark !== 'WEBP') continue;
        }
        return mimeType;
      }
    }
  }
  return null;
}

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Uploads a product image.
 * - Uses Vercel Blob if a valid BLOB_READ_WRITE_TOKEN is configured.
 * - Falls back to local public/uploads/ directory for local development.
 * - Validates MIME type from file magic bytes (not Content-Type header).
 * - Enforces 5MB size limit.
 * - Uses a random filename to prevent path traversal.
 */
export async function uploadProductImage(file: File): Promise<UploadResult> {
  try {
    // Size check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { ok: false, error: 'Image must be smaller than 5MB.' };
    }

    // Read first few bytes for MIME detection
    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedMime = detectMimeType(buffer);

    if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
      return { ok: false, error: 'Only JPEG, PNG, and WebP images are allowed.' };
    }

    // Generate random filename — never use the client's original filename
    const ext = detectedMime.split('/')[1];
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const isDummyToken = !token || token.includes('dummy') || token === 'vercel_blob_rw_123456789';

    // If using real Vercel Blob token, upload to Vercel Blob
    if (!isDummyToken) {
      try {
        const blob = await put(`products/${filename}`, buffer, {
          access: 'public',
          contentType: detectedMime,
        });
        return { ok: true, url: blob.url };
      } catch (blobErr) {
        logger.warn('storage.vercel_blob.failed_fallback_to_local', { error: blobErr });
      }
    }

    // Local filesystem fallback for dev mode
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);

    logger.info('storage.upload.local_success', { filename });
    return { ok: true, url: `/uploads/${filename}` };
  } catch (error) {
    logger.error('storage.upload.failed', { error });
    return { ok: false, error: 'Failed to upload image. Please try again.' };
  }
}
