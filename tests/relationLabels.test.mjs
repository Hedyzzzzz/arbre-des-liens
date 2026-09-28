import test from 'node:test';
import assert from 'node:assert/strict';
import {placeRelationLabels,isSideLink,SIDE_LABEL_WIDTH,LABEL_WIDTHS,LABEL_HEIGHT} from '../src/relationLabels.ts';
const intersect=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
test('les étiquettes proches ne se chevauchent ni entre elles ni avec les cartes',()=>{
 const positions=new Map([['a',{x:0,y:0}],['b',{x:350,y:0}],['c',{x:0,y:250}],['d',{x:350,y:250}]]);
 const relations=Array.from({length:24},(_,i)=>({id:String(i),personA:i%2?'a':'c',personB:i%2?'b':'d',type:['parent','sibling','partner'][i%3]}));
 const labels=placeRelationLabels(relations,positions);
 const boxes=relations.map(r=>{const p=labels.get(r.id);const w=isSideLink(r,positions)?SIDE_LABEL_WIDTH:LABEL_WIDTHS[r.type];return {x:p.x-w/2,y:p.y-LABEL_HEIGHT/2,w,h:LABEL_HEIGHT};});
 for(let i=0;i<boxes.length;i++){
  for(let j=i+1;j<boxes.length;j++)assert.equal(intersect(boxes[i],boxes[j]),false);
  for(const p of positions.values())assert.equal(intersect(boxes[i],{...p,w:280,h:122}),false);
 }
 assert.deepEqual([...labels],[...placeRelationLabels(relations,positions)]);
});
test('un lien manquant ou un arbre vide ne provoque pas d’erreur',()=>{
 assert.equal(placeRelationLabels([],new Map()).size,0);
 assert.equal(placeRelationLabels([{id:'1',personA:'a',personB:'b',type:'sibling'}],new Map()).size,0);
});
test('frère/sœur et couple se relient de côté seulement si les cartes sont voisines sur la même ligne',()=>{
 const positions=new Map([['a',{x:0,y:0}],['b',{x:350,y:0}],['c',{x:700,y:0}],['d',{x:0,y:250}]]);
 const link=(personA,personB,type)=>({id:personA+personB+type,personA,personB,type});
 assert.equal(isSideLink(link('a','b','sibling'),positions),true);
 assert.equal(isSideLink(link('c','b','partner'),positions),true);
 assert.equal(isSideLink(link('a','c','sibling'),positions),false);
 assert.equal(isSideLink(link('a','d','sibling'),positions),false);
 assert.equal(isSideLink(link('a','b','parent'),positions),false);
 const labels=placeRelationLabels([link('a','b','sibling')],positions);
 assert.deepEqual(labels.get('absibling'),{x:315,y:61});
});
