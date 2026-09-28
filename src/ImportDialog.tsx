import { useState } from 'react';
import { X } from 'lucide-react';

type Group = { tree: string; persons: any[]; relations: any[] };

export function ImportDialog({ groups, onImport, onClose }: { groups: Group[]; onImport: (persons: any[], relations: any[]) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = groups.filter(g => g.persons.length);
  return <div className="access-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="access-dialog import-dialog" role="dialog" aria-modal="true">
      <button className="icon-button access-close" aria-label="Fermer" onClick={onClose}><X size={19}/></button>
      <div className="eyebrow">Autres arbres</div>
      <h2>Importer des personnages</h2>
      <p>Copie des personnages (ou un arbre entier, avec ses liens) dans l’arbre que tu modifies.</p>
      <input className="import-search" placeholder="Chercher un personnage…" value={query} onChange={e => setQuery(e.target.value)}/>
      {visible.length === 0 && <p className="access-note">Aucun autre arbre avec des personnages pour l’instant.</p>}
      {visible.map(group => <section key={group.tree} className="import-group">
        <header><strong>{group.tree}</strong><button className="import-all" onClick={() => onImport(group.persons, group.relations)}>Tout importer ({group.persons.length})</button></header>
        {group.persons.filter(p => !q || String(p.name).toLowerCase().includes(q)).map(p =>
          <div key={p.id} className="import-row"><span>{p.name}{p.clan ? ` · ${p.clan}` : ''}</span><button onClick={() => onImport([p], [])}>Ajouter</button></div>)}
      </section>)}
    </div>
  </div>;
}
