import crypto from "node:crypto";

// Stored format: scrypt$<cost>$<blockSize>$<parallelization>$<salt b64>$<hash b64>
const HASH_SCHEME = "scrypt";
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const DERIVED_KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT_MAX_MEMORY_BYTES = 64 * 1024 * 1024;

interface ScryptParameters {
  cost: number;
  blockSize: number;
  parallelization: number;
}

function deriveKey(password: string, salt: Buffer, parameters: ScryptParameters): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    crypto.scrypt(
      password,
      salt,
      DERIVED_KEY_LENGTH,
      {
        N: parameters.cost,
        r: parameters.blockSize,
        p: parameters.parallelization,
        maxmem: SCRYPT_MAX_MEMORY_BYTES,
      },
      (error, derivedKey) => (error ? reject(error) : resolve(derivedKey)),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = await deriveKey(password, salt, {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK_SIZE,
    parallelization: SCRYPT_PARALLELIZATION,
  });
  return [
    HASH_SCHEME,
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

/** Constant-time comparison; parameters are read from the stored hash so older hashes keep working. */
export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
  const [scheme, cost, blockSize, parallelization, salt, hash] = (storedHash ?? "").split("$");
  if (scheme !== HASH_SCHEME || !salt || !hash) return false;

  const expectedHash = Buffer.from(hash, "base64");
  const actualHash = await deriveKey(password, Buffer.from(salt, "base64"), {
    cost: Number(cost),
    blockSize: Number(blockSize),
    parallelization: Number(parallelization),
  });
  return actualHash.length === expectedHash.length && crypto.timingSafeEqual(actualHash, expectedHash);
}
