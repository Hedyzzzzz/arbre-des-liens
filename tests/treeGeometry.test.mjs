import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutTree, getGenerations, sceneBounds, seededRandom } from '../src/treeGeometry.ts';

test('un clan commun ne crée aucune génération ni parenté', () => {
  const people = Array.from({length: 8}, (_, i) => ({id: String(i), clan: 'Veilleurs'}));
  assert.deepEqual([...getGenerations(people, []).values()], Array(8).fill(0));
});

test('les descendants se placent sous leurs parents, quelle que soit la date de création', () => {
  const people = [{id:'child'}, {id:'grandparent'}, {id:'parent'}];
  const relations = [{personA:'grandparent',personB:'parent',type:'parent'}, {personA:'parent',personB:'child',type:'parent'}];
  const positions = layoutTree(people, relations);
  assert.ok(positions.get('grandparent').y < positions.get('parent').y);
  assert.ok(positions.get('parent').y < positions.get('child').y);
});

test('familles séparées et personnes isolées ne se chevauchent pas', () => {
  for (const count of [0, 1, 2, 7, 20, 60]) {
    const people = Array.from({length:count}, (_, i) => ({id:String(i)}));
    const relations = people.slice(1).filter((_,i) => i%3 === 0).map(person => ({personA:String(Number(person.id)-1),personB:person.id,type:'parent'}));
    const positions = layoutTree(people,relations);
    assert.equal(positions.size,count);
    const points = [...positions.values()];
    for(let i=0;i<points.length;i++) for(let j=i+1;j<points.length;j++) {
      assert.ok(Math.abs(points[i].x-points[j].x)>=280 || Math.abs(points[i].y-points[j].y)>=122);
    }
    const bounds = sceneBounds(positions);
    assert.ok(Number.isFinite(bounds.width) && bounds.width > 0);
    for(const point of points) {
      assert.ok(point.x >= bounds.x && point.x+280 <= bounds.x+bounds.width);
      assert.ok(point.y >= bounds.y && point.y+122 <= bounds.y+bounds.height);
    }
  }
});

test('le retrait d’un personnage recalcule les branches sans laisser de position fantôme', () => {
  const people = [{id:'a'},{id:'b'},{id:'c'}];
  const full = layoutTree(people,[]);
  const next = layoutTree(people.filter(person => person.id !== 'b'),[]);
  assert.equal(full.size,3);
  assert.equal(next.size,2);
  assert.equal(next.has('b'),false);
});

test('le dessin est déterministe et ne change pas à chaque rendu', () => {
  const randomA=seededRandom('person-42'), randomB=seededRandom('person-42');
  assert.deepEqual(Array.from({length:20},randomA),Array.from({length:20},randomB));
  const people=[{id:'a'},{id:'b'}];
  assert.deepEqual([...layoutTree(people,[])],[...layoutTree(people,[])]);
});
