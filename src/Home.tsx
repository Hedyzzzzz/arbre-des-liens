import { useMemo, useState, type FormEvent } from 'react';
import { Compass, Sparkles, X } from 'lucide-react';
import type { CloudTree } from './cloud';
import { CelestialSky } from './WorldTree';
import { curvePath, curvePoint, seededRandom, type Point } from './treeGeometry';

const ROOT: Point = { x: 500, y: 650 };
const ANCHORS: Point[] = [{ x: 130, y: 310 }, { x: 305, y: 185 }, { x: 500, y: 115 }, { x: 695, y: 185 }, { x: 870, y: 310 }];
const SLOT = [2, 1, 3, 0, 4]; // le plus recent au centre
const CARD_W = 172, CARD_H = 62;

// Meme dessin que l'arbre de l'appli : branches fines dorees, ramilles, etincelles, cartes au bout.
function HomeTree({ trees, onOpen }: { trees: CloudTree[]; onOpen: (name: string) => void }) {
  const scene = useMemo(() => {
    const random = seededRandom('lineage-home-tree');
    const twigs: { d: string; w: number; o: number }[] = [];
    const sparks: { x: number; y: number; r: number; o: number }[] = [];
    const limbs: string[] = [];
    const fork = (s: Point, angle: number, length: number, depth: number) => {
      const tip = { x: s.x + Math.cos(angle) * length, y: s.y + Math.sin(angle) * length };
      const c = { x: s.x + Math.cos(angle + .22) * length * .55, y: s.y + Math.sin(angle + .22) * length * .55 };
      twigs.push({ d: `M${s.x},${s.y} Q${c.x},${c.y} ${tip.x},${tip.y}`, w: depth * .45 + .25, o: .3 + depth * .12 });
      if (depth > 0) { fork(tip, angle - .25 - random() * .35, length * .6, depth - 1); fork(tip, angle + .2 + random() * .45, length * .64, depth - 1); }
      else for (let j = 0; j < 2; j++) sparks.push({ x: tip.x + (random() - .5) * 20, y: tip.y + (random() - .5) * 16, r: .6 + random() * 1.4, o: .2 + random() * .5 });
    };
    for (const a of ANCHORS) {
      const end = { x: a.x, y: a.y + CARD_H / 2 + 3 };
      const dir = Math.sign(a.x - ROOT.x);
      const bend = Math.max(60, Math.abs(a.x - ROOT.x) * .35);
      const curve: [Point, Point, Point, Point] = [ROOT, { x: ROOT.x + dir * 30, y: ROOT.y - (ROOT.y - end.y) * .6 }, { x: end.x - dir * bend, y: end.y + 130 }, end];
      limbs.push(curvePath(curve));
      for (let s = 0; s < 4; s++) {
        const shift = (s - 1.5) * 4;
        twigs.push({ d: curvePath([{ x: ROOT.x + shift, y: ROOT.y }, { x: curve[1].x + shift * 3, y: curve[1].y + random() * 40 }, { x: curve[2].x + shift, y: curve[2].y }, end]), w: .6 + random() * .8, o: .35 + random() * .4 });
      }
      for (let i = 0; i < 6; i++) fork(curvePoint(curve, .3 + (i / 6) * .62), -Math.PI / 2 + (i % 2 ? 1 : -1) * (.5 + random() * .8), 22 + random() * 34, 3);
    }
    return { twigs, sparks, limbs };
  }, []);
  const recent = [...trees].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return <svg viewBox="0 0 1000 660" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Les arbres">
    <g fill="none" stroke="#d9b888" strokeLinecap="round">
      {scene.limbs.map((d, i) => <path key={i} d={d} strokeWidth="3" opacity=".5"/>)}
      {scene.twigs.map((t, i) => <path key={i} d={t.d} strokeWidth={t.w} opacity={t.o}/>)}
    </g>
    {scene.sparks.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f1e5d0" opacity={s.o}/>)}
    {ANCHORS.map((a, i) => {
      const tree = recent[SLOT.indexOf(i)];
      const x = a.x - CARD_W / 2, y = a.y - CARD_H / 2;
      if (!tree) return <rect key={i} className="lin-card-empty" x={x} y={y} width={CARD_W} height={CARD_H} rx="6"/>;
      const label = tree.name.length > 16 ? `${tree.name.slice(0, 15)}…` : tree.name;
      return <g key={i} className="lin-card" role="button" tabIndex={0} onClick={() => onOpen(tree.name)} onKeyDown={e => { if (e.key === 'Enter') onOpen(tree.name); }}>
        <rect x={x} y={y} width={CARD_W} height={CARD_H} rx="6"/>
        <text x={a.x} y={a.y - 1} textAnchor="middle" className="lin-card-name">{label}</text>
        <text x={a.x} y={a.y + 19} textAnchor="middle" className="lin-card-sub">{tree.data?.persons?.length ?? 0} personnage(s)</text>
      </g>;
    })}
  </svg>;
}

function Ornament() { return <div className="lin-orn" aria-hidden="true"><span/><i/><span/></div>; }

export function Home({ trees, onCreate, onExplore, onOpen }: { trees: CloudTree[]; onCreate: (name: string, password: string) => Promise<void>; onExplore: () => void; onOpen: (name: string) => void }) {
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
  return <main className="lin-home">
    <CelestialSky />
    <header className="lin-head">
      <p className="lin-eyebrow">LINEAGE</p>
      <h1>L’Arbre des liens</h1>
      <Ornament />
      <p className="lin-sub">Dessine ta famille, ton clan, ton monde. Tout le monde peut voir les arbres des autres.</p>
    </header>
    <div className="lin-tree"><HomeTree trees={trees} onOpen={onOpen} /></div>
    <div className="lin-actions">
      <button className="lin-btn primary" onClick={() => setOpen(true)}><Sparkles size={18}/>Créer un arbre</button>
      <button className="lin-btn" onClick={onExplore}><Compass size={18}/>Explorer les arbres{trees.length > 0 && <em>{trees.length}</em>}</button>
    </div>
    <small className="home-version">version du {__BUILD__}</small>
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

export function Explore({ trees, loaded, onOpen, onDelete, onBack }: { trees: CloudTree[]; loaded: boolean; onOpen: (name: string) => void; onDelete: (name: string, password: string) => Promise<void>; onBack: () => void }) {
  const [target, setTarget] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => { setTarget(null); setPassword(''); setError(''); setBusy(false); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!target) return; setBusy(true); setError('');
    try { await onDelete(target, password); close(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Suppression impossible.'); setBusy(false); }
  };
  return <main className="lin-home lin-explore">
    <CelestialSky />
    <div className="lin-page">
      <button className="lin-back" onClick={onBack}>← Accueil</button>
      <p className="lin-eyebrow">LINEAGE</p>
      <h1>Les arbres</h1>
      <Ornament />
      {!loaded ? <p className="lin-sub">Chargement…</p>
        : trees.length === 0 ? <p className="lin-sub">Aucun arbre pour l’instant. Crée le premier !</p>
        : <div className="lin-grid">{trees.map(tree => <div key={tree.name} className="lin-tile">
          <button className="lin-tile-main" onClick={() => onOpen(tree.name)}>
            <strong>{tree.name}</strong><span>{tree.data?.persons?.length ?? 0} personnage(s)</span>
            <small>modifié le {new Date(tree.updated_at).toLocaleDateString('fr-FR')}</small>
          </button>
          <button className="lin-tile-delete" aria-label={`Supprimer ${tree.name}`} onClick={() => setTarget(tree.name)}>Supprimer</button>
        </div>)}</div>}
    </div>
    {target && <div className="access-overlay" onClick={event => { if (event.target === event.currentTarget && !busy) close(); }}>
      <div className="access-dialog" role="dialog" aria-modal="true">
        <button className="icon-button access-close" aria-label="Fermer" onClick={close}><X size={19}/></button>
        <div className="eyebrow">Suppression</div>
        <h2>Supprimer « {target} » ?</h2>
        <p>L’arbre sera effacé pour tout le monde. Entre le mot de passe pour confirmer.</p>
        <form onSubmit={submit}>
          <label className="field"><span>Mot de passe</span><input autoFocus type="password" required value={password} disabled={busy} onChange={e => setPassword(e.target.value)}/></label>
          {error && <p className="access-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy}>{busy ? 'Suppression…' : 'Supprimer définitivement'}</button>
        </form>
      </div>
    </div>}
  </main>;
}
