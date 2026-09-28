import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LockKeyhole, X } from 'lucide-react';
import { createPassword, readCredential, verifyPassword } from './editorAccess';
import { cloudEnabled } from './cloud';

export function EditorAccessDialog({ onClose, onUnlock }: { onClose: () => void; onUnlock: (password: string) => void | Promise<void> }) {
  const [initial] = useState(() => {
    try { return { setup: !cloudEnabled && !readCredential(), error: '' }; }
    catch (error) { return { setup: false, error: error instanceof Error ? error.message : 'Impossible de lire le verrou local.' }; }
  });
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initial.error);
  const request = useRef(0);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => { request.current++; previousFocus?.focus(); };
  }, []);
  const close = () => { request.current++; onClose(); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || initial.error) return;
    if (initial.setup && password !== confirmation) { setError('Les deux mots de passe sont différents.'); return; }
    const attempt = ++request.current;
    setBusy(true); setError('');
    try {
      if (!cloudEnabled) {
        if (initial.setup) await createPassword(password);
        else if (!await verifyPassword(password)) throw new Error('Mot de passe incorrect.');
      }
      await onUnlock(password);
      if (request.current === attempt) { setPassword(''); setConfirmation(''); }
    } catch (error) {
      if (request.current === attempt) setError(error instanceof Error ? error.message : 'Impossible de déverrouiller l’édition.');
    } finally { if (request.current === attempt) setBusy(false); }
  };
  return <div className="access-overlay" onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div ref={dialog} className="access-dialog" role="dialog" aria-modal="true" aria-labelledby="access-title" aria-describedby="access-description"
      onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); close(); }
        if (event.key === 'Tab') {
          const items = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])') ?? [])];
          const first = items[0], last = items.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <button className="icon-button access-close" aria-label="Fermer le déverrouillage" onClick={close}><X size={19}/></button>
      <LockKeyhole className="access-symbol" size={26}/>
      <div className="eyebrow">Accès à l’édition</div>
      <h2 id="access-title">{cloudEnabled ? 'Modifier cet arbre' : initial.setup ? 'Choisir votre mot de passe' : 'Déverrouiller l’édition'}</h2>
      <p id="access-description">{cloudEnabled ? 'Tout le monde peut voir cet arbre. Le mot de passe est nécessaire pour le modifier.' : initial.setup ? 'Ce mot de passe sera demandé pour ajouter ou modifier des personnages, des liens et l’apparence de l’arbre.' : 'L’arbre et les fiches restent consultables sans mot de passe.'}</p>
      <form onSubmit={submit}>
        <label className="field"><span>{initial.setup ? 'Nouveau mot de passe' : cloudEnabled ? 'Mot de passe du groupe' : 'Mot de passe'}</span>
          <input type="password" autoComplete={initial.setup ? 'new-password' : 'current-password'} required minLength={initial.setup ? 8 : undefined} maxLength={256} value={password} disabled={busy || !!initial.error} onChange={event => setPassword(event.target.value)}/>
        </label>
        {initial.setup && <label className="field"><span>Confirmer le mot de passe</span>
          <input type="password" autoComplete="new-password" required maxLength={256} value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)}/>
        </label>}
        {error && <p className="access-error" role="alert">{error}</p>}
        <button className="primary-button" disabled={busy || !!initial.error}>{busy ? 'Vérification…' : initial.setup ? 'Créer le mot de passe et modifier' : 'Passer en mode édition'}</button>
      </form>
      {!cloudEnabled && <p className="access-note">Verrou local à ce navigateur. Ce mot de passe ne protège pas des données partagées sur un serveur. Le rechargement remet le site en lecture seule.</p>}
    </div>
  </div>;
}
