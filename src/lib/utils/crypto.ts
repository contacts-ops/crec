import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hashe une clé sensible
 * @param key - La clé à hasher
 * @returns La clé hashée
 */
export async function hashKey(key: string): Promise<string> {
  return await bcrypt.hash(key, SALT_ROUNDS);
}

/**
 * Vérifie si une clé correspond au hash
 * @param key - La clé en clair
 * @param hashedKey - La clé hashée
 * @returns true si la clé correspond
 */
export async function verifyKey(key: string, hashedKey: string): Promise<boolean> {
  return await bcrypt.compare(key, hashedKey);
}

/**
 * Chiffre une clé pour le stockage temporaire (moins sécurisé que le hash)
 * @param key - La clé à chiffrer
 * @returns La clé chiffrée
 */
export function encryptKey(key: string): string {
  // Pour les clés publiques, on peut utiliser un chiffrement simple
  // car elles ne sont pas sensibles
  return Buffer.from(key).toString('base64');
}

/**
 * Déchiffre une clé
 * @param encryptedKey - La clé chiffrée
 * @returns La clé en clair
 */
export function decryptKey(encryptedKey: string): string {
  return Buffer.from(encryptedKey, 'base64').toString();
} 