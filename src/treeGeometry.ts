export type TreePerson = { id: string; clan?: string };
export type TreeRelation = { personA: string; personB: string; type: 'parent' | 'sibling' | 'partner' };
export type Point = { x: number; y: number };
export type Bounds = Point & { width: number; height: number };
export const CARD_WIDTH = 280;
export const CARD_HEIGHT = 122;

export function seededRandom(seed: string) {
  let value = 2166136261;
  for (const character of seed) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return () => {
    value += 0x6D2B79F5;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getGenerations(persons: TreePerson[], relations: TreeRelation[]) {
  const generations = new Map<string, number>();
  const valid = new Set(persons.map(person => person.id));
  for (const seed of persons) {
    if (generations.has(seed.id)) continue;
    const component = [seed.id];
    generations.set(seed.id, 0);
    for (let i = 0; i < component.length; i++) {
      const id = component[i];
      for (const relation of relations) {
        if (relation.personA !== id && relation.personB !== id) continue;
        const next = relation.personA === id ? relation.personB : relation.personA;
        if (!valid.has(next) || generations.has(next)) continue;
        generations.set(next, generations.get(id)! + (relation.type === 'parent' ? (relation.personA === id ? 1 : -1) : 0));
        component.push(next);
      }
    }
    const min = Math.min(...component.map(id => generations.get(id)!));
    component.forEach(id => generations.set(id, generations.get(id)! - min));
  }
  return generations;
}

// Family components are independent of clans. Ancestors sit above descendants.
// Shelf packing prevents unrelated members from producing a single endless row.
export function layoutTree(persons: TreePerson[], relations: TreeRelation[]) {
  const generations = getGenerations(persons, relations);
  const positions = new Map<string, Point>();
  const visited = new Set<string>();
  const targetWidth = Math.max(1600, Math.ceil(Math.sqrt(persons.length)) * 650);
  let shelfX = 0, shelfY = 0, shelfHeight = 0;
  const valid = new Set(persons.map(person => person.id));
  for (const seed of persons) {
    if (visited.has(seed.id)) continue;
    const ids = [seed.id];
    visited.add(seed.id);
    for (let i = 0; i < ids.length; i++) {
      for (const relation of relations) {
        if (relation.personA !== ids[i] && relation.personB !== ids[i]) continue;
        const other = relation.personA === ids[i] ? relation.personB : relation.personA;
        if (!visited.has(other) && valid.has(other)) { visited.add(other); ids.push(other); }
      }
    }
    const rows = new Map<number, string[]>();
    ids.forEach(id => {
      const generation = generations.get(id)!;
      rows.set(generation, [...(rows.get(generation) ?? []), id]);
    });
    const maxGeneration = Math.max(...rows.keys());
    const width = Math.max(...[...rows.values()].map(row => row.length)) * 350;
    const height = maxGeneration * 250 + 210;
    if (shelfX && shelfX + width > targetWidth) { shelfX = 0; shelfY += shelfHeight + 90; shelfHeight = 0; }
    for (const [generation, ids] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
      const parentX = (id: string) => {
        const parent = relations.find(relation => relation.type === 'parent' && relation.personB === id);
        return parent ? positions.get(parent.personA)?.x ?? shelfX : shelfX;
      };
      ids.sort((a, b) => parentX(a) - parentX(b));
      ids.forEach((id, i) => positions.set(id, { x: shelfX + (width - ids.length * 350) / 2 + i * 350, y: shelfY + generation * 250 }));
    }
    shelfX += width + 70;
    shelfHeight = Math.max(shelfHeight, height);
  }
  return positions;
}

export function sceneBounds(positions: Map<string, Point>): Bounds {
  if (!positions.size) return { x: -500, y: -300, width: 1000, height: 900 };
  const points = [...positions.values()];
  const left = Math.min(...points.map(p => p.x));
  const right = Math.max(...points.map(p => p.x)) + CARD_WIDTH;
  const top = Math.min(...points.map(p => p.y));
  const bottom = Math.max(...points.map(p => p.y)) + CARD_HEIGHT;
  const width = Math.max(900, right - left + 260);
  return { x: (left + right - width) / 2, y: top - 230, width, height: bottom - top + 620 };
}

export function curvePoint(points: [Point, Point, Point, Point], t: number): Point {
  const u = 1 - t;
  return { x: u**3*points[0].x + 3*u*u*t*points[1].x + 3*u*t*t*points[2].x + t**3*points[3].x,
    y: u**3*points[0].y + 3*u*u*t*points[1].y + 3*u*t*t*points[2].y + t**3*points[3].y };
}
export const curvePath = (p: [Point, Point, Point, Point]) => `M${p[0].x},${p[0].y} C${p[1].x},${p[1].y} ${p[2].x},${p[2].y} ${p[3].x},${p[3].y}`;
