import { memo, useMemo } from 'react';
import { ViewportPortal } from '@xyflow/react';
import { CARD_HEIGHT, CARD_WIDTH, curvePath, curvePoint, seededRandom, type Bounds, type Point } from './treeGeometry';

function Star({ x, y, size = 6 }: { x: number; y: number; size?: number }) {
  return <path d={`M${x-size},${y} Q${x},${y-1} ${x},${y-size*1.8} Q${x+1},${y} ${x+size},${y} Q${x},${y+1} ${x},${y+size*1.8} Q${x-1},${y} ${x-size},${y}`} fill="currentColor" />;
}

export const CelestialSky = memo(function CelestialSky() {
  const stars = useMemo(() => {
    const random = seededRandom('lineage-night-sky');
    return Array.from({ length: 160 }, () => ({ x: random()*1600, y: random()*1100, r: .4+random()*1.1, opacity: .12+random()*.5 }));
  }, []);
  return <div className="celestial-sky" aria-hidden="true">
    <svg viewBox="0 0 1600 1100" preserveAspectRatio="xMidYMid slice">
      <defs><radialGradient id="moon-shade"><stop stopColor="#b8bac7" stopOpacity=".2"/><stop offset=".85" stopColor="#78818c" stopOpacity=".03"/><stop offset="1" stopColor="#c7c5bf" stopOpacity=".3"/></radialGradient></defs>
      <circle cx="1360" cy="160" r="91" fill="url(#moon-shade)" />
      <circle cx="1314" cy="133" r="24" fill="#070a12" opacity=".2" />
      <circle cx="242" cy="865" r="27" fill="url(#moon-shade)" />
      {stars.map((star, i) => <circle key={i} {...star} cx={star.x} cy={star.y} fill="#f1e5d0" />)}
    </svg>
    <div className="celestial-frame"><i/><i/><i/><i/></div>
  </div>;
});

type Twig = { d: string; width: number; opacity: number };
type Spark = Point & { radius: number; opacity: number };
export const WorldTree = memo(function WorldTree({ positions, bounds }: { positions: Map<string, Point>; bounds: Bounds }) {
  const scene = useMemo(() => {
    const cx = bounds.x + bounds.width / 2;
    const ground = bounds.y + bounds.height - 105;
    const root = { x: cx, y: ground - 25 };
    const twigs: Twig[] = [];
    const sparks: Spark[] = [];
    const limbs: string[] = [];
    const ornaments: Point[] = [];
    const anchors = positions.size ? [...positions.entries()] : [
      ['empty-left', { x: cx - 430, y: ground - 510 }],
      ['empty-right', { x: cx + 150, y: ground - 510 }],
      ['empty-top', { x: cx - 140, y: ground - 630 }],
    ] as [string, Point][];
    const amount = Math.max(3, Math.min(13, Math.floor(120 / anchors.length)));
    for (const [id, position] of anchors) {
      const random = seededRandom(id);
      const end = { x: position.x + CARD_WIDTH / 2, y: position.y + CARD_HEIGHT + 3 };
      const direction = end.x < cx ? -1 : 1;
      const bend = Math.max(90, Math.abs(end.x-cx)*.35);
      const curve: [Point, Point, Point, Point] = [root,
        { x: cx + direction * 38, y: ground - (ground-end.y)*.6 },
        { x: end.x - direction*bend, y: end.y + 160 }, end];
      limbs.push(curvePath(curve));
      for (let strand = 0; strand < 4; strand++) {
        const shift = (strand-1.5)*5;
        twigs.push({ d: curvePath([ {x: root.x+shift, y:root.y}, {x:curve[1].x+shift*3,y:curve[1].y+random()*50}, {x:curve[2].x+shift,y:curve[2].y}, end ]), width: .7+random()*.9, opacity:.35+random()*.4 });
      }
      const fork = (start: Point, angle: number, length: number, depth: number) => {
        const tip = { x: start.x + Math.cos(angle)*length, y: start.y + Math.sin(angle)*length };
        const control = { x: start.x + Math.cos(angle+.22)*length*.55, y: start.y+Math.sin(angle+.22)*length*.55 };
        twigs.push({d:`M${start.x},${start.y} Q${control.x},${control.y} ${tip.x},${tip.y}`,width:depth*.55+.2,opacity:.3+depth*.12});
        if (depth > 0) {
          fork(tip,angle-.25-random()*.35,length*.57,depth-1);
          fork(tip,angle+.2+random()*.45,length*.62,depth-1);
        } else {
          for (let j=0;j<5;j++) sparks.push({x:tip.x+(random()-.5)*30,y:tip.y+(random()-.5)*22,radius:.5+random()*1.7,opacity:.12+random()*.5});
        }
      };
      for (let i=0;i<amount;i++) {
        const t=.35+(i/amount)*.58;
        const start=curvePoint(curve,t);
        const side=i%2 ? direction : -direction;
        fork(start,-Math.PI/2+side*(.5+random()*.8),38+random()*62,3);
      }
      // A small organic crown around each card, leaving its text area opaque.
      for (const side of [-1,1]) {
        fork({x:end.x+side*110,y:end.y-12},-Math.PI/2+side*.35,65+random()*25,3);
      }
      if (anchors.length <= 30) ornaments.push({x:end.x+direction*110,y:end.y+25+random()*25});
    }
    const spine: string[]=[];
    const top = bounds.y + 148;
    for (let i=0;i<15;i++) {
      const shift=(i-7)*3;
      spine.push(`M${cx+shift},${ground-25} C${cx+70-shift},${ground-190} ${cx-80+shift},${ground-280} ${cx+shift*.7},${ground-390} S${cx+shift*2},${top+130} ${cx},${top}`);
    }
    const roots: string[]=[];
    const random=seededRandom('world-roots');
    for (let i=0;i<22;i++) {
      const side=i%2 ? -1:1, reach=70+random()*220;
      roots.push(`M${cx+(random()-.5)*35},${ground-100-random()*80} C${cx+side*35},${ground-20} ${cx+side*reach*.6},${ground-5} ${cx+side*reach},${ground+15+random()*8}`);
    }
    return { cx, ground, twigs, sparks, limbs, roots, ornaments, spine };
  }, [positions, bounds]);
  const {cx,ground}=scene;
  const crestY=bounds.y+80;
  return <ViewportPortal><svg className="world-tree" aria-hidden="true" style={{left:bounds.x,top:bounds.y,width:bounds.width,height:bounds.height}}
    viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}>
    <defs>
      <filter id="tree-halo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
      <radialGradient id="tree-aura"><stop stopColor="var(--tree-gold)" stopOpacity=".09"/><stop offset="1" stopColor="var(--tree-gold)" stopOpacity="0"/></radialGradient>
      <linearGradient id="tree-bark" x1="0" y1="1" x2="0" y2="0"><stop stopColor="var(--tree-gold)" stopOpacity=".9"/><stop offset="1" stopColor="var(--tree-gold)" stopOpacity=".2"/></linearGradient>
    </defs>
    <ellipse cx={cx} cy={ground-320} rx={bounds.width*.5} ry={bounds.height*.55} fill="url(#tree-aura)"/>
    <g fill="none" stroke="currentColor" opacity=".2" strokeWidth=".8">
      <ellipse cx={cx} cy={ground-280} rx={bounds.width*.46} ry={bounds.height*.57}/>
      <ellipse cx={cx} cy={ground-280} rx={bounds.width*.46+9} ry={bounds.height*.57+9}/>
      {[0,1,2,3].map(i=><ellipse key={i} cx={cx} cy={ground+30} rx={130+i*69} ry={12+i*9}/>)}
      <path d={`M${cx-350},${ground+30} H${cx+350} M${cx},${ground-30} V${ground+88}`}/>
    </g>
    <g fill="none" stroke="currentColor" filter="url(#tree-halo)" opacity=".27" strokeWidth="7">
      {scene.limbs.map((d,i)=><path key={i} d={d}/>)}
      {scene.roots.map((d,i)=><path key={`r${i}`} d={d}/>)}
    </g>
    <g fill="none" strokeLinecap="round">
      {scene.spine.map((d,i)=><path key={`spine${i}`} d={d} stroke="currentColor" strokeWidth={i%3===0?1.7:.6} opacity={.12+(i%4)*.07}/>)}
      {scene.limbs.map((d,i)=><path key={i} d={d} stroke="url(#tree-bark)" strokeWidth="5"/>)}
      {scene.twigs.map((twig,i)=><path key={i} d={twig.d} stroke="currentColor" strokeWidth={twig.width} opacity={twig.opacity}/>)}
      {scene.roots.map((d,i)=><path key={`r${i}`} d={d} stroke="currentColor" strokeWidth={i%3===0?2:.7} opacity={.3+(i%4)*.15}/>)}
    </g>
    <g fill="currentColor">{scene.sparks.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r={s.radius} opacity={s.opacity}/>)}</g>
    <g opacity=".65">{scene.ornaments.map((p,i)=><g key={i}>
      <path d={`M${p.x},${p.y} v55`} stroke="currentColor" strokeWidth=".6" strokeDasharray="2 5"/>
      {i%2 ? <circle cx={p.x} cy={p.y+62} r="7" fill="none" stroke="currentColor" strokeWidth=".8"/> : <Star x={p.x} y={p.y+62} size={4}/>}
    </g>)}</g>
    <g className="tree-crest" fill="none" stroke="currentColor" strokeWidth="1">
      <circle cx={cx} cy={crestY} r="40"/><circle cx={cx} cy={crestY} r="47" opacity=".35"/>
      <path d={`M${cx-65},${crestY} H${cx+65} M${cx},${crestY-65} V${crestY+68}`}/>
      <path d={`M${cx-20},${crestY-20} L${cx+20},${crestY+20} M${cx+20},${crestY-20} L${cx-20},${crestY+20}`} opacity=".55"/>
      <Star x={cx} y={crestY} size={14}/>
    </g>
    <Star x={cx} y={ground+30} size={9}/>
    <text x={cx} y={ground+84} textAnchor="middle" fill="currentColor" fontSize="11" letterSpacing="5" opacity=".75">NOS LIENS · NOTRE HISTOIRE</text>
  </svg></ViewportPortal>;
});
