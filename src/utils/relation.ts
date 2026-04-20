/**
 * Helpers for reading/writing the `relation` nested prop on CraftJS nodes.
 * Clone/save-component bookkeeping uses belongsTo/hasMany/relationType to
 * form a bidirectional graph. Always use these helpers so writes stay
 * consistent across call sites.
 */

import type { RelationProps } from "../components/types";

export function getRelation(props: any): RelationProps | undefined {
  return props?.relation;
}

export function getBelongsTo(props: any): string | undefined {
  return props?.relation?.belongsTo;
}

export function getHasMany(props: any): string[] {
  return props?.relation?.hasMany || [];
}

export function getRelationType(props: any): string | undefined {
  return props?.relation?.relationType;
}

/** Mutate a CraftJS setProp callback argument to set a relation field. */
export function setRelationField<K extends keyof RelationProps>(
  props: any,
  key: K,
  value: RelationProps[K]
): void {
  if (!props.relation) props.relation = {};
  (props.relation as any)[key] = value;
}

/** Mutate a setProp callback argument to clear the entire relation object. */
export function clearRelation(props: any): void {
  delete props.relation;
}

/** Push a child id onto the master's hasMany[]. Creates relation/hasMany if missing. */
export function addHasMany(props: any, childId: string): void {
  if (!props.relation) props.relation = {};
  if (!Array.isArray(props.relation.hasMany)) props.relation.hasMany = [];
  if (!props.relation.hasMany.includes(childId)) props.relation.hasMany.push(childId);
}

/** Remove a child id from the master's hasMany[]. */
export function removeHasMany(props: any, childId: string): void {
  const arr = props?.relation?.hasMany;
  if (!Array.isArray(arr)) return;
  props.relation.hasMany = arr.filter((id: string) => id !== childId);
}
