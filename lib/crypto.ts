/**
 * Utility functions for E2EE using Web Crypto API
 */

// --- Helpers ---

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (!base64 || typeof base64 !== "string") {
    return new ArrayBuffer(0);
  }

  // Handle URL-safe base64 and remove any whitespace/newlines
  let standardBase64 = base64
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/\s/g, "");

  // Add padding if necessary
  const pad = (4 - (standardBase64.length % 4)) % 4;
  if (pad > 0) {
    standardBase64 += "=".repeat(pad);
  }

  try {
    const binaryString = atob(standardBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    console.error("Failed to decode base64 string", { 
      originalLength: base64.length,
      processedLength: standardBase64.length,
      isString: typeof base64 === "string"
    });
    throw e;
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// --- Key Generation ---

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export function generateSalt(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(16)); // 128-bit salt
}

// --- Key Wrapping ---

export async function deriveWrappingKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

export async function wrapPrivateKey(privateKey: CryptoKey, wrappingKey: CryptoKey): Promise<ArrayBuffer> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await window.crypto.subtle.wrapKey(
    "pkcs8",
    privateKey,
    wrappingKey,
    { name: "AES-GCM", iv }
  );

  const combined = new Uint8Array(iv.length + wrapped.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(wrapped), iv.length);
  return combined.buffer;
}

export async function unwrapPrivateKey(wrappedKeyBuffer: ArrayBuffer, wrappingKey: CryptoKey): Promise<CryptoKey> {
  const iv = new Uint8Array(wrappedKeyBuffer.slice(0, 12));
  const wrapped = wrappedKeyBuffer.slice(12);

  return await window.crypto.subtle.unwrapKey(
    "pkcs8",
    wrapped,
    wrappingKey,
    { name: "AES-GCM", iv },
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

// --- Key Export/Import ---

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  return arrayBufferToBase64(exported);
}

export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64Key);
  return await window.crypto.subtle.importKey(
    "spki",
    buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

// --- Message Encryption ---

export async function encryptBinary(
  data: Uint8Array,
  recipientPublicKey: CryptoKey,
  senderPublicKey: CryptoKey
): Promise<{ ciphertext: string; iv: string; encryptedKey: string; encryptedKeyForSelf: string }> {
  // 1. Generate AES-GCM key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );

  // 2. Generate IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV

  // 3. Encrypt data
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    data
  );

  // 4. Export AES key to encrypt it with RSA
  const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // 5. Encrypt AES key for recipient
  const encryptedKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    exportedAesKey
  );

  // 6. Encrypt AES key for self
  const encryptedKeyForSelf = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    senderPublicKey,
    exportedAesKey
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedContent),
    iv: arrayBufferToBase64(iv),
    encryptedKey: arrayBufferToBase64(encryptedKey),
    encryptedKeyForSelf: arrayBufferToBase64(encryptedKeyForSelf),
  };
}

export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: CryptoKey,
  senderPublicKey: CryptoKey
): Promise<{ ciphertext: string; iv: string; encryptedKey: string; encryptedKeyForSelf: string }> {
  return encryptBinary(encoder.encode(plaintext), recipientPublicKey, senderPublicKey);
}

// --- Message Decryption ---

export async function decryptBinary(
  payload: { ciphertext: string; iv: string; encryptedKey: string },
  privateKey: CryptoKey
): Promise<Uint8Array> {
  if (!payload.encryptedKey || !payload.iv || !payload.ciphertext) {
    throw new Error("Invalid decryption payload: missing required fields");
  }

  // 1. Decrypt AES key with RSA private key
  const decryptedAesKeyBuffer = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToArrayBuffer(payload.encryptedKey)
  );

  // 2. Import the AES key
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    decryptedAesKeyBuffer,
    "AES-GCM",
    false,
    ["decrypt"]
  );

  // 3. Decrypt the message
  const decryptedContent = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToArrayBuffer(payload.iv),
    },
    aesKey,
    base64ToArrayBuffer(payload.ciphertext)
  );

  return new Uint8Array(decryptedContent);
}

export async function decryptMessage(
  payload: { ciphertext: string; iv: string; encryptedKey: string },
  privateKey: CryptoKey
): Promise<string> {
  const decryptedBinary = await decryptBinary(payload, privateKey);
  return decoder.decode(decryptedBinary);
}
