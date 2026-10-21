export const MAX_UPLOAD_BYTES = 1_048_576;

export type UploadFileType = 'csv' | 'txt';

export type UploadRejection = 'empty' | 'oversized' | 'unsupported_type' | 'binary' | 'invalid_utf8';

export type UploadCheck =
  | { ok: true; fileType: UploadFileType; text: string }
  | { ok: false; reason: UploadRejection };

// Runs on the server only. Size and type come from the bytes and name, never from client-reported values alone.
export function checkUpload(name: string, bytes: Uint8Array): UploadCheck {
  if (bytes.byteLength === 0) return { ok: false, reason: 'empty' };
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return { ok: false, reason: 'oversized' };

  const dot = name.lastIndexOf('.');
  const extension = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
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
