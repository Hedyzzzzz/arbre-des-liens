// Partage en ligne via Supabase (API REST, sans SDK). Sans configuration, le site reste 100 % local.
const env = (import.meta as any).env ?? {};
const URL_BASE: string | undefined = env.VITE_SUPABASE_URL;
const KEY: string | undefined = env.VITE_SUPABASE_ANON_KEY;
export const cloudEnabled = Boolean(URL_BASE && KEY);
export type CloudTree = { name: string; data: any; updated_at: string };

async function call(path: string, init?: RequestInit) {
  const response = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    // Les clés sb_publishable_... ne sont pas des JWT : elles vont dans apikey uniquement.
    headers: { apikey: KEY!, ...(KEY!.startsWith('sb_') ? {} : { Authorization: `Bearer ${KEY}` }), 'Content-Type': 'application/json' },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message ?? 'Serveur injoignable.');
  return body;
}
const rpc = (fn: string, args: object) => call(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });

export const listTrees = (): Promise<CloudTree[]> => call('trees?select=name,data,updated_at&order=name.asc');
export const unlockTree = (password: string, name: string, token: string): Promise<'new' | 'mine'> =>
  rpc('unlock_tree', { p_password: password, p_name: name, p_token: token });
export const saveTree = (password: string, name: string, token: string, data: unknown) =>
  rpc('save_tree', { p_password: password, p_name: name, p_token: token, p_data: data });

// Le mot de passe du groupe protège les écritures ; cette valeur fixe sert seulement au serveur déjà installé.
export const SHARED_TOKEN = 'arbre-partage';
