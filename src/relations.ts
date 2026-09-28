export type RelationKind = 'parent' | 'sibling' | 'partner';
export type FamilyRelation = { personA: string; personB: string; type: RelationKind };
export const RELATION_STYLES = {
  parent: { label: 'Parent → enfant', color: '#ffc974', symbol: '↓' },
  sibling: { label: 'Frère / sœur', color: '#79c9ff', symbol: '↔' },
  partner: { label: 'Couple', color: '#ff9bbc', symbol: '♡' },
} as const;
export function validateRelation(next: FamilyRelation, existing: FamilyRelation[], ids: string[]): string | null {
  if (!ids.includes(next.personA) || !ids.includes(next.personB)) return 'Choisissez deux personnages existants.';
  if (next.personA === next.personB) return 'Choisissez deux personnages différents.';
  if (existing.some(relation => relation.type === next.type && ((relation.personA === next.personA && relation.personB === next.personB) || (next.type !== 'parent' && relation.personB === next.personA && relation.personA === next.personB)))) return 'Ce lien existe déjà.';
  if (next.type === 'parent') {
    const seen = new Set<string>(); const queue = [next.personB];
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      if (id === next.personA) return 'Ce lien créerait une boucle de parenté.';
      if (seen.has(id)) continue;
      seen.add(id);
      existing.filter(relation => relation.type === 'parent' && relation.personA === id).forEach(relation => queue.push(relation.personB));
    }
  }
  return null;
}

export type RelationColors = Partial<Record<RelationKind, string>>;
export function getRelationColor(kind: RelationKind, colors?: RelationColors) {
  const value = colors?.[kind];
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : RELATION_STYLES[kind].color;
}
