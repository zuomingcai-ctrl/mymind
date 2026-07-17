/**
 * FI-007: Web Crypto PBKDF2 + AES-GCM encryption.
 * Legacy XOR format (`mymind-encrypted`) remains readable via decryptDocumentJson.
 */

const V2_FORMAT = 'mymind-encrypted-v2';
const LEGACY_FORMAT = 'mymind-encrypted';
const PBKDF2_ITERATIONS = 100_000;
const SALT_LEN = 16;
const IV_LEN = 12;

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)!;
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypt JSON string → mymind-encrypted-v2 envelope */
export async function encryptDocumentJsonV2(json: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(password || 'mymind', salt);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(json),
  );
  return JSON.stringify({
    format: V2_FORMAT,
    version: 2,
    salt: toB64(salt),
    iv: toB64(iv),
    payload: toB64(new Uint8Array(cipher)),
  });
}

export async function decryptDocumentJsonV2(encrypted: string, password: string): Promise<string> {
  const parsed = JSON.parse(encrypted) as {
    format?: string;
    salt?: string;
    iv?: string;
    payload?: string;
  };
  if (parsed.format !== V2_FORMAT || !parsed.salt || !parsed.iv || !parsed.payload) {
    throw new Error('Not a v2 encrypted MyMind file');
  }
  const salt = fromB64(parsed.salt);
  const iv = fromB64(parsed.iv);
  const key = await deriveKey(password || 'mymind', salt);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    fromB64(parsed.payload) as BufferSource,
  );
  return new TextDecoder().decode(plain);
}

export function isEncryptedDocumentJsonAny(text: string): boolean {
  try {
    const p = JSON.parse(text) as { format?: string };
    return p.format === V2_FORMAT || p.format === LEGACY_FORMAT;
  } catch {
    return false;
  }
}

export function isEncryptedV2(text: string): boolean {
  try {
    const p = JSON.parse(text) as { format?: string };
    return p.format === V2_FORMAT;
  } catch {
    return false;
  }
}
