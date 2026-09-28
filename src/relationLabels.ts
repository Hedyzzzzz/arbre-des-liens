import { CARD_WIDTH, CARD_HEIGHT, type Point } from './treeGeometry.ts';
import type { RelationKind } from './relations.ts';
export const LABEL_WIDTHS: Record<RelationKind, number> = { parent: 164, sibling: 142, partner: 108 };
export const LABEL_HEIGHT = 34;
// Badge réduit (symbole seul) posé dans l'espace entre deux cartes voisines.
export const SIDE_LABEL_WIDTH = 34;
export const SIDE_LINK_TYPES: RelationKind[] = ['sibling', 'partner'];

// Frère/sœur et couple : quand les deux cartes sont côte à côte sur la même ligne
// (aucune autre carte entre elles), on les relie directement de côté à côté.
// Le lien ne croise alors plus les flèches parent → enfant.
export function isSideLink(relation: { personA: string; personB: string; type: RelationKind }, positions: Map<string, Point>) {
  if (!SIDE_LINK_TYPES.includes(relation.type)) return false;
  const a = positions.get(relation.personA), b = positions.get(relation.personB);
  if (!a || !b || Math.abs(a.y - b.y) > 1) return false;
  const left = Math.min(a.x, b.x), right = Math.max(a.x, b.x);
  if (right - left < CARD_WIDTH) return false;
  return ![...positions.values()].some(p => p !== a && p !== b && Math.abs(p.y - a.y) <= 1 && p.x > left && p.x < right);
}
type Box = Point & { width: number; height: number };
type Link = { id: string; personA: string; personB: string; type: RelationKind };
const overlaps = (a: Box, b: Box) => a.x < b.x+b.width+10 && a.x+a.width+10 > b.x && a.y < b.y+b.height+10 && a.y+a.height+10 > b.y;

// Reserve room for all labels together, not independently inside each edge.
// Include hidden links too, so filtering never makes the remaining labels jump.
export function placeRelationLabels(relations: Link[], positions: Map<string, Point>) {
  const occupied: Box[] = [...positions.values()].map(p => ({...p,width:CARD_WIDTH,height:CARD_HEIGHT}));
  const result = new Map<string, Point>();
  relations.forEach((relation,index) => {
    const source=positions.get(relation.personA),target=positions.get(relation.personB);
    if (!source || !target) return;
    const side=isSideLink(relation,positions);
    const parent=relation.type==='parent';
    const sign=relation.type==='sibling'?1:-1;
    const sourceY=source.y+(relation.type==='partner'?0:CARD_HEIGHT);
    const targetY=target.y+(relation.type==='sibling'?CARD_HEIGHT:0);
    const anchor=side?{x:(source.x+target.x+CARD_WIDTH)/2,y:source.y+CARD_HEIGHT/2}:{x:(source.x+target.x+CARD_WIDTH)/2,y:parent?(sourceY+targetY)/2:(sign===1?Math.max(sourceY,targetY):Math.min(sourceY,targetY))+sign*(48+(index%3)*28)};
    const width=side?SIDE_LABEL_WIDTH:LABEL_WIDTHS[relation.type];
    const free=(point:Point) => !occupied.some(box=>overlaps({x:point.x-width/2,y:point.y-LABEL_HEIGHT/2,width,height:LABEL_HEIGHT},box));
    let chosen: Point | undefined;
    if (free(anchor)) chosen=anchor;
    // Prefer a short horizontal shift along the link before changing rows.
    for(let ring=1;!chosen && ring<=30;ring++) {
      const candidates: Point[]=[];
      for(let dx=-ring;dx<=ring;dx++) for(let dy=-ring;dy<=ring;dy++) {
        if(Math.max(Math.abs(dx),Math.abs(dy))!==ring) continue;
        candidates.push({x:anchor.x+dx*44,y:anchor.y+dy*46});
      }
      candidates.sort((a,b)=>(a.x-anchor.x)**2+2*(a.y-anchor.y)**2-((b.x-anchor.x)**2+2*(b.y-anchor.y)**2));
      chosen=candidates.find(free);
    }
    // A guaranteed free overflow position for unusually dense imported graphs.
    chosen ??= {x:Math.max(...occupied.map(box=>box.x+box.width),anchor.x)+width/2+20,y:anchor.y};
    result.set(relation.id,chosen);
    occupied.push({x:chosen.x-width/2,y:chosen.y-LABEL_HEIGHT/2,width,height:LABEL_HEIGHT});
  });
  return result;
}
