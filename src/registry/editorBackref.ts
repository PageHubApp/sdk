/**
 * Editor backrefs — module-level refs to the live CraftJS `query`/`actions`
 * and the Zedux `ecosystem`, captured by `EditorInner` during mount.
 *
 * Phase 2 C2a: command `run` bodies need to reach CraftJS history, the
 * selection event stream, and Zedux atom state without becoming hooks. The
 * registry never imports React, so we keep these as plain module refs that
 * `EditorInner` populates via `useRegisterEditorBackref` once the inner
 * <Editor> tree is mounted.
 *
 * Refs are intentionally not exported globally — only the registry layer
 * (commands.execute) and the few utility helpers next door (`setAtomExternal`)
 * read them. Surfaces still use the React hooks directly.
 */
import type { Ecosystem } from "@zedux/react";

let queryRef: any = null;
let actionsRef: any = null;
let ecosystemRef: Ecosystem | null = null;

export function setEditorBackref(opts: {
  query?: any;
  actions?: any;
  ecosystem?: Ecosystem | null;
}): void {
  if (opts.query !== undefined) queryRef = opts.query;
  if (opts.actions !== undefined) actionsRef = opts.actions;
  if (opts.ecosystem !== undefined) ecosystemRef = opts.ecosystem;
}

export function clearEditorBackref(): void {
  queryRef = null;
  actionsRef = null;
  ecosystemRef = null;
}

export function getEditorQuery(): any {
  return queryRef;
}

export function getEditorActions(): any {
  return actionsRef;
}

export function getEditorEcosystem(): Ecosystem | null {
  return ecosystemRef;
}
