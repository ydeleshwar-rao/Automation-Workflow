function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

/**
 * RSA-OAEP (SHA-256) encrypt using the browser's native Web Crypto API.
 * Returns a base64 string safe to include in a JSON payload.
 * The private key lives only on the server — DevTools will only ever show ciphertext.
 */
export async function encryptWithPublicKey(
  publicKeyPem: string,
  plaintext: string
): Promise<string> {
  const publicKey = await crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(publicKeyPem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    new TextEncoder().encode(plaintext)
  );

  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}
