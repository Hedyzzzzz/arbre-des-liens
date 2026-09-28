import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRelation, RELATION_STYLES, getRelationColor } from '../src/relations.ts';
const ids=['a','b','c'];
test('les trois types de liens ont une étiquette et une couleur distinctes',()=>{
 assert.equal(new Set(Object.values(RELATION_STYLES).map(s=>s.label)).size,3);
 assert.equal(new Set(Object.values(RELATION_STYLES).map(s=>s.color)).size,3);
 assert.equal(RELATION_STYLES.sibling.label,'Frère / sœur');
});
test('on peut relier deux personnages existants sans les recréer',()=>{
 assert.equal(validateRelation({personA:'a',personB:'b',type:'sibling'},[],ids),null);
});
test('les doublons symétriques de fratrie et de couple sont rejetés',()=>{
 for(const type of ['sibling','partner']) assert.ok(validateRelation({personA:'b',personB:'a',type},[{personA:'a',personB:'b',type}],ids));
});
test('les liens vers soi-même et les personnages absents sont refusés',()=>{
 assert.ok(validateRelation({personA:'a',personB:'a',type:'sibling'},[],ids));
 assert.ok(validateRelation({personA:'a',personB:'absent',type:'parent'},[],ids));
});
test('un descendant ne peut pas devenir l’ancêtre de son propre parent',()=>{
 const existing=[{personA:'a',personB:'b',type:'parent'},{personA:'b',personB:'c',type:'parent'}];
 assert.ok(validateRelation({personA:'c',personB:'a',type:'parent'},existing,ids));
 assert.ok(validateRelation({personA:'a',personB:'b',type:'parent'},existing,ids));
});

test('couleurs personnalisées et repli pour les anciennes données',()=>{
 assert.equal(getRelationColor('sibling',{sibling:'#123abc'}),'#123abc');
 assert.equal(getRelationColor('parent',{sibling:'#123abc'}),RELATION_STYLES.parent.color);
 assert.equal(getRelationColor('partner'),RELATION_STYLES.partner.color);
 assert.equal(getRelationColor('sibling',{sibling:'invalide'}),RELATION_STYLES.sibling.color);
});
