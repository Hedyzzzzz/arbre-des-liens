import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, getStraightPath, type EdgeProps } from '@xyflow/react';
import { LABEL_WIDTHS, FULL_LABEL_WIDTHS, LABEL_HEIGHT, SIDE_LABEL_WIDTH } from './relationLabels';
import { RELATION_STYLES, type RelationKind } from './relations';

type LinkData = { side?: boolean; sideY?: number; labelPosition?: { x:number; y:number }; color: string; kind: RelationKind; lane: number; dimmed: boolean; showText?: boolean; description: string; onInspect: () => void };
export function FamilyEdge(props: EdgeProps) {
  const { id, sourceX: sx, sourceY: sy, targetX: tx, targetY: ty, sourcePosition, targetPosition, markerEnd } = props;
  const data = props.data as LinkData;
  const appearance = RELATION_STYLES[data.kind];
  let path: string, x: number, y: number;
  if (data.side) {
    const cy = data.sideY ?? sy;
    [path,x,y] = getStraightPath({sourceX:sx,sourceY:cy,targetX:tx,targetY:cy});
  } else if (data.kind === 'parent') {
    [path,x,y] = getSmoothStepPath({sourceX:sx,sourceY:sy,targetX:tx,targetY:ty,sourcePosition,targetPosition,borderRadius:16,offset:30});
  } else {
    const sign=data.kind==='sibling'?1:-1;
    const lane=(sign===1?Math.max(sy,ty):Math.min(sy,ty))+sign*(48+data.lane*28);
    const direction=tx>=sx?1:-1; const radius=Math.min(14,Math.abs(tx-sx)/4);
    path=`M${sx},${sy} L${sx},${lane-sign*radius} Q${sx},${lane} ${sx+direction*radius},${lane} L${tx-direction*radius},${lane} Q${tx},${lane} ${tx},${lane-sign*radius} L${tx},${ty}`;
    x=(sx+tx)/2; y=lane;
  }
  const label = data.labelPosition ?? {x,y};
  const shifted = Math.hypot(label.x-x,label.y-y)>5;
  return <g opacity={data.dimmed ? .15 : 1}>
    <path d={path} fill="none" stroke="#080d18" strokeWidth="9" strokeLinecap="round"/>
    <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{stroke:data.color,strokeWidth:data.kind==='partner'?6:3,strokeDasharray:data.kind==='sibling'?'9 5':undefined}}/>
    {data.kind==='partner' && <path d={path} fill="none" stroke="#10141e" strokeWidth="2" pointerEvents="none"/>}
    {shifted && <g pointerEvents="none">
      <path d={`M${x},${y} L${label.x},${label.y}`} fill="none" stroke={data.color} strokeWidth="1.2" strokeDasharray="3 4" opacity=".75"/>
      <circle cx={x} cy={y} r="3" fill={data.color}/>
    </g>}
    <EdgeLabelRenderer>
      <button className={`relation-badge relation-${data.kind}${data.side?' relation-badge-side':''}${!data.side&&!data.showText?' relation-badge-compact':''} nodrag nopan`} title={data.description} aria-label={data.description}
        onClick={data.onInspect} style={{transform:`translate(-50%, -50%) translate(${label.x}px,${label.y}px)`,width:data.side?SIDE_LABEL_WIDTH:data.showText?FULL_LABEL_WIDTHS[data.kind]:LABEL_WIDTHS[data.kind],height:LABEL_HEIGHT,justifyContent:"center",borderColor:data.color,color:"#edf1f7",opacity:data.dimmed ? .2 : 1}}>
        <b aria-hidden="true" style={{color:data.color}}>{appearance.symbol}</b>{!data.side && <span className={data.showText ? undefined : 'relation-text'}>{appearance.label}</span>}
      </button>
    </EdgeLabelRenderer>
  </g>;
}
export const familyEdgeTypes = { family: FamilyEdge };
