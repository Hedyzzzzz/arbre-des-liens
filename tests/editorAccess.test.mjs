import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCESS_KEY, createPassword, readCredential, verifyPassword } from '../src/editorAccess.ts';
const store = () => {
 const data = new Map();
 return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
test('création salée, aucun mot de passe en clair, vérification correcte et refus des erreurs', async () => {
 const first=store(), second=store();
 await createPassword('Veilleurs-2026!',first);
 await createPassword('Veilleurs-2026!',second);
 assert.ok(!first.getItem(ACCESS_KEY).includes('Veilleurs-2026!'));
 assert.notEqual(readCredential(first).salt,readCredential(second).salt);
 assert.notEqual(readCredential(first).hash,readCredential(second).hash);
 assert.equal(await verifyPassword('Veilleurs-2026!',first),true);
 assert.equal(await verifyPassword('mauvais-mot-de-passe',first),false);
 assert.equal(await verifyPassword('',first),false);
});
test('un mot de passe existant ne peut pas être remplacé par le formulaire initial',async()=>{
 const storage=store(); await createPassword('secret-initial',storage);
 const before=storage.getItem(ACCESS_KEY);
 await assert.rejects(createPassword('nouveau-secret',storage));
 assert.equal(storage.getItem(ACCESS_KEY),before);
});
test('absence ou corruption du verrou ne valide jamais une connexion',async()=>{
 const storage=store();assert.equal(readCredential(storage),null);
 assert.equal(await verifyPassword('secret',storage),false);
 for(const invalid of ['{','null','{}','{"version":1}']) {
   storage.setItem(ACCESS_KEY,invalid);
   assert.throws(()=>readCredential(storage));
   await assert.rejects(createPassword('secret-valide',storage));
   await assert.rejects(verifyPassword('secret-valide',storage));
 }
});
test('un échec de sauvegarde ou un mot de passe trop court interdit l’activation',async()=>{
 await assert.rejects(createPassword('court',store()));
 await assert.rejects(createPassword('          ',store()));
 await assert.rejects(createPassword('secret-valide',{getItem:()=>null,setItem:()=>{throw Error('Stockage indisponible')}}));
});
test('les caractères Unicode et espaces du mot de passe sont conservés',async()=>{
 const storage=store();await createPassword('  Étoiles ✨  ',storage);
 assert.equal(await verifyPassword('  Étoiles ✨  ',storage),true);
 assert.equal(await verifyPassword('Étoiles ✨',storage),false);
});
