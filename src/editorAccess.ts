// Local UI lock only. Server authorization is required for shared online data.
export const ACCESS_KEY = 'lineage.minecraft.editor.v1';
const ITERATIONS = 600_000;
type Credential = { version: 1; salt: string; hash: string; iterations: number };
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

export function readCredential(storage: Store = localStorage): Credential | null {
  const raw = storage.getItem(ACCESS_KEY);
  if (raw === null) return null;
  let value: Credential;
  try { value = JSON.parse(raw); } catch { throw new Error('Le verrou local est illisible. Vos personnages sont conservés.'); }
  if (!value || value.version !== 1 || !/^[a-f0-9]{32}$/.test(value.salt) || !/^[a-f0-9]{64}$/.test(value.hash) || value.iterations !== ITERATIONS) {
    throw new Error('Le verrou local est invalide. Vos personnages sont conservés.');
  }
  return value;
}

async function derive(password: string, salt: string) {
  if (!globalThis.crypto?.subtle) throw new Error('Ouvrez le site sur localhost ou en HTTPS pour utiliser le mot de passe.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(salt.match(/../g)!, byte => parseInt(byte, 16)), iterations: ITERATIONS, hash: 'SHA-256' }, key, 256);
  return hex(new Uint8Array(bits));
}

export async function createPassword(password: string, storage: Store = localStorage) {
  if (password.length < 8 || !password.trim()) throw new Error('Choisissez un mot de passe d’au moins 8 caractères.');
  if (readCredential(storage)) throw new Error('Un mot de passe existe déjà. Fermez puis rouvrez cette fenêtre pour vous connecter.');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await derive(password, salt);
  if (readCredential(storage)) throw new Error('Un mot de passe a été créé dans un autre onglet. Recommencez.');
  storage.setItem(ACCESS_KEY, JSON.stringify({ version: 1, salt, hash, iterations: ITERATIONS }));
}

export async function verifyPassword(password: string, storage: Store = localStorage) {
  const before = storage.getItem(ACCESS_KEY);
  const credential = readCredential(storage);
  if (!credential) return false;
  const hash = await derive(password, credential.salt);
  if (storage.getItem(ACCESS_KEY) !== before) throw new Error('Le verrou a changé dans un autre onglet. Recommencez.');
  let difference = 0;
  for (let i = 0; i < hash.length; i++) difference |= hash.charCodeAt(i) ^ credential.hash.charCodeAt(i);
  return difference === 0;
}
