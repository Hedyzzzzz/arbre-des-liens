import { useState, type FormEvent } from 'react';
import { Compass, Sparkles, X } from 'lucide-react';
import type { CloudTree } from './cloud';

export function Home({ count, onCreate, onExplore }: { count: number; onCreate: (name: string, password: string) => Promise<void>; onExplore: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await onCreate(name.trim(), password); }
    catch (e) { setError(e instanceof Error ? e.message : 'Impossible de créer l’arbre.'); setBusy(false); }
  };
  return <main className="home">
    <p className="home-eyebrow">LINEAGE</p>
    <h1>L’Arbre des liens</h1>
    <p className="home-sub">Dessine ta famille, ton clan, ton monde. Tout le monde peut voir les arbres des autres.</p>
    <div className="home-actions">
      <button className="home-button primary" onClick={() => setOpen(true)}><Sparkles size={20}/>Créer un arbre</button>
      <button className="home-button" onClick={onExplore}><Compass size={20}/>Explorer les arbres{count > 0 && <em>{count}</em>}</button>
    </div>
    {open && <div className="access-overlay" onClick={event => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <div className="access-dialog" role="dialog" aria-modal="true">
        <button className="icon-button access-close" aria-label="Fermer" onClick={() => setOpen(false)}><X size={19}/></button>
        <div className="eyebrow">Nouvel arbre</div>
        <h2>Créer mon arbre</h2>
        <p>Choisis un nom, puis entre le mot de passe qui permet de modifier.</p>
        <form onSubmit={submit}>
          <label className="field"><span>Nom de l’arbre</span><input autoFocus required minLength={2} maxLength={40} value={name} disabled={busy} onChange={e => setName(e.target.value)}/></label>
          <label className="field"><span>Mot de passe</span><input type="password" required maxLength={256} value={password} disabled={busy} onChange={e => setPassword(e.target.value)}/></label>
          {error && <p className="access-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy}>{busy ? 'Création…' : 'Créer et commencer'}</button>
        </form>
      </div>
    </div>}
  </main>;
}

export function Explore({ trees, loaded, onOpen, onBack }: { trees: CloudTree[]; loaded: boolean; onOpen: (name: string) => void; onBack: () => void }) {
  return <main className="home explore">
    <button className="home-back" onClick={onBack}>← Accueil</button>
    <h1>Les arbres</h1>
    {!loaded ? <p className="home-sub">Chargement…</p>
      : trees.length === 0 ? <p className="home-sub">Aucun arbre pour l’instant. Crée le premier !</p>
      : <div className="tree-grid">{trees.map(tree => <button key={tree.name} className="tree-card" onClick={() => onOpen(tree.name)}>
        <strong>{tree.name}</strong><span>{tree.data?.persons?.length ?? 0} personnage(s)</span>
        <small>modifié le {new Date(tree.updated_at).toLocaleDateString('fr-FR')}</small>
      </button>)}</div>}
  </main>;
}
