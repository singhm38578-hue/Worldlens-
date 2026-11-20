import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_IMAGE_FILE_BYTES, validateImageFile } from './imageEncoder';

describe('validateImageFile — Camera & Gallery Input Validation', () => {
  it('accepts JPEG, PNG, WebP, HEIC/HEIF, BMP, and GIF images', () => {
    const validFiles = [
      { name: 'photo.jpg', type: 'image/jpeg', size: 120_000 },
      { name: 'scan.png', type: 'image/png', size: 84_000 },
      { name: 'product.webp', type: 'image/webp', size: 65_000 },
      { name: 'iphone.heic', type: 'image/heic', size: 420_000 },
      { name: 'camera.heif', type: 'image/heif', size: 310_000 },
      { name: 'bitmap.bmp', type: 'image/bmp', size: 220_000 },
      { name: 'frame.gif', type: 'image/gif', size: 50_000 },
    ];

    for (const file of validFiles) {
      const result = validateImageFile(file);
      assert.equal(result.ok, true, `Expected ${file.type} to be valid`);
    }
  });

  it('falls back safely to extension when browser omits MIME type for supported images', () => {
    const result = validateImageFile({ name: 'captured_photo.heic', type: '', size: 150_000 });
    assert.equal(result.ok, true);
  });

  it('rejects unsupported formats such as SVG, TIFF, PDF, video, and text files', () => {
    const unsupportedFiles = [
      { name: 'vector.svg', type: 'image/svg+xml', size: 8_000 },
      { name: 'raw.tiff', type: 'image/tiff', size: 120_000 },
      { name: 'clip.mp4', type: 'video/mp4', size: 900_000 },
      { name: 'doc.pdf', type: 'application/pdf', size: 50_000 },
      { name: 'notes.txt', type: 'text/plain', size: 1_024 },
      { name: 'unknown.bin', type: '', size: 2_048 },
    ];

    for (const file of unsupportedFiles) {
      const result = validateImageFile(file);
      assert.deepEqual(result, { ok: false, reason: 'unsupported-format' });
    }
  });

  it('rejects empty files and files exceeding 25 MB', () => {
    assert.deepEqual(
      validateImageFile({ name: 'empty.jpg', type: 'image/jpeg', size: 0 }),
      { ok: false, reason: 'empty-file' }
    );

    assert.deepEqual(
      validateImageFile({
        name: 'huge.png',
        type: 'image/png',
        size: MAX_IMAGE_FILE_BYTES + 1,
      }),
      { ok: false, reason: 'file-too-large' }
    );
  });
});
