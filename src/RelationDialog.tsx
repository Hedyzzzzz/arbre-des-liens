import { useState, type FormEvent } from 'react';
import { X, Link2 } from 'lucide-react';
import { RELATION_STYLES, validateRelation, type FamilyRelation, type RelationKind } from './relations';
export function RelationDialog({ persons, relations, onClose, onAdd }: {
 persons: {id:string;name:string}[]; relations: FamilyRelation[]; onClose:()=>void; onAdd:(relation:FamilyRelation)=>void;
}) {
 const [personA,setA]=useState(persons[0]?.id??'');
 const [personB,setB]=useState(persons[1]?.id??'');
 const [type,setType]=useState<RelationKind>('sibling');
 const [error,setError]=useState('');
 const submit=(event:FormEvent)=>{event.preventDefault();const relation={personA,personB,type};const issue=validateRelation(relation,relations,persons.map(p=>p.id));if(issue){setError(issue);return;}onAdd(relation);};
 return <div className="access-overlay" onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
  <section className="access-dialog" role="dialog" aria-modal="true" aria-labelledby="relation-dialog-title" onKeyDown={event=>{if(event.key==='Escape')onClose();
    if(event.key==='Tab'){const items=[...event.currentTarget.querySelectorAll<HTMLElement>('button,select')];const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}}>
   <button className="icon-button access-close" onClick={onClose} aria-label="Fermer les liens"><X size={19}/></button>
   <Link2 className="access-symbol" size={26}/><h2 id="relation-dialog-title">Relier deux personnages</h2>
   <p>Ajoutez un lien entre deux personnages déjà présents. Le clan reste indépendant.</p>
   <form onSubmit={submit}>
    <label className="field"><span>Type de lien</span><select autoFocus value={type} onChange={e=>setType(e.target.value as RelationKind)}>{Object.entries(RELATION_STYLES).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label>
    <label className="field"><span>{type==='parent'?'Le parent':'Premier personnage'}</span><select value={personA} onChange={e=>setA(e.target.value)}>{persons.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label className="field"><span>{type==='parent'?'Son enfant':'Deuxième personnage'}</span><select value={personB} onChange={e=>setB(e.target.value)}>{persons.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    {error&&<p role="alert" className="access-error">{error}</p>}<button className="primary-button">Créer le lien</button>
   </form>
  </section>
 </div>;
}
