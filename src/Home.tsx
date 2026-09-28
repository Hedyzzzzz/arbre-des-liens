import { useMemo, useState, type FormEvent } from 'react';
import { Compass, Sparkles, X } from 'lucide-react';
import type { CloudTree } from './cloud';

const NODES: [number, number][] = [[90, 120], [315, 105], [150, 55], [255, 50], [200, 30], [45, 150], [360, 160]];

export function Home({ trees, onCreate, onExplore, onOpen }: { trees: CloudTree[]; onCreate: (name: string, password: string) => Promise<void>; onExplore: () => void; onOpen: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const stars = useMemo(() => Array.from({ length: 70 }, () => ({ left: Math.random() * 100, top: Math.random() * 100, size: 1 + Math.random() * 2, delay: Math.random() * 6 })), []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await onCreate(name.trim(), password); }
    catch (e) { setError(e instanceof Error ? e.message : 'Impossible de créer l’arbre.'); setBusy(false); }
  };
  return <main className="home">
    <div className="home-stars" aria-hidden="true">{stars.map((s, i) => <i key={i} style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}/>)}</div>
    <svg className="home-tree" viewBox="0 0 400 270" aria-hidden="true">
      <defs>
        <linearGradient id="home-gold" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#a8741f"/><stop offset="1" stopColor="#ffe3a3"/></linearGradient>
        <filter id="home-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <g fill="none" stroke="url(#home-gold)" strokeLinecap="round" filter="url(#home-glow)">
        <path d="M200 262 C200 210 194 175 200 125" strokeWidth="7"/>
        <path d="M200 200 C160 185 120 170 90 120" strokeWidth="3.5"/>
        <path d="M200 185 C240 170 285 150 315 105" strokeWidth="3.5"/>
        <path d="M198 150 C186 115 170 85 150 55" strokeWidth="3"/>
        <path d="M201 140 C215 110 235 85 255 50" strokeWidth="3"/>
        <path d="M200 125 C200 100 200 65 200 30" strokeWidth="3"/>
        <path d="M120 152 C95 156 70 158 45 150" strokeWidth="2.5"/>
        <path d="M270 158 C300 168 335 170 360 160" strokeWidth="2.5"/>
        <path d="M190 262 C150 262 120 268 80 268 M210 262 C250 262 280 268 320 268" strokeWidth="2.5"/>
      </g>
      {NODES.map(([x, y], i) => <g key={i} className="home-node" style={{ animationDelay: `${i * .7}s` }}>
        <rect x={x - 17} y={y - 12} width="34" height="24" rx="7"/><circle cx={x} cy={y - 3} r="4.5"/><rect x={x - 9} y={y + 4} width="18" height="3" rx="1.5"/>
      </g>)}
    </svg>
    <p className="home-eyebrow">LINEAGE</p>
    <h1>L’Arbre des liens</h1>
    <p className="home-sub">Dessine ta famille, ton clan, ton monde.<br/>Tout le monde peut voir les arbres des autres.</p>
    <div className="home-actions">
      <button className="home-button primary" onClick={() => setOpen(true)}><Sparkles size={20}/>Créer un arbre</button>
      <button className="home-button" onClick={onExplore}><Compass size={20}/>Explorer les arbres{trees.length > 0 && <em>{trees.length}</em>}</button>
    </div>
    {trees.length > 0 && <div className="home-recent"><span>Arbres récents</span>
      {[...trees].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6).map(tree => <button key={tree.name} onClick={() => onOpen(tree.name)}>{tree.name}</button>)}
    </div>}
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
