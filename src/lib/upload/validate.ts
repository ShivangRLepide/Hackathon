export const MAX_UPLOAD_BYTES = 1_048_576;

export type UploadFileType = 'csv' | 'txt';

export type UploadRejection = 'empty' | 'oversized' | 'unsupported_type' | 'binary' | 'invalid_utf8';

export type UploadCheck =
  | { ok: true; fileType: UploadFileType; text: string }
  | { ok: false; reason: UploadRejection };

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * Checks the name and size before any bytes are read. Used in the browser so a file
 * that cannot be accepted is never uploaded. The server still runs checkUpload.
 */
export function precheckUpload(name: string, sizeBytes: number): UploadRejection | null {
  if (sizeBytes === 0) return 'empty';
  if (sizeBytes > MAX_UPLOAD_BYTES) return 'oversized';
  const extension = extensionOf(name);
  if (extension !== 'csv' && extension !== 'txt') return 'unsupported_type';
  return null;
}

// Runs on the server only. Size and type come from the bytes and name, never from client-reported values alone.
export function checkUpload(name: string, bytes: Uint8Array): UploadCheck {
  if (bytes.byteLength === 0) return { ok: false, reason: 'empty' };
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return { ok: false, reason: 'oversized' };

  const extension = extensionOf(name);
  if (extension !== 'csv' && extension !== 'txt') return { ok: false, reason: 'unsupported_type' };

  if (bytes.includes(0)) return { ok: false, reason: 'binary' };

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, reason: 'invalid_utf8' };
  }

  return { ok: true, fileType: extension, text };
}
