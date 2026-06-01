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
import type { EditorActions, EditorQuery } from "./types";

export type { EditorActions, EditorQuery };

let queryRef: EditorQuery | null = null;
let actionsRef: EditorActions | null = null;
let ecosystemRef: Ecosystem | null = null;

/**
 * Input shape is intentionally loose (`unknown`) so behavior tests can pass
 * partial stubs (e.g. `{ selectNode(id) { ... } }`) without dragging the full
 * 20-method CraftJS surface into every fixture. The stored refs are strict
 * — the cast happens in exactly one place. Production callers
 * (`useRegisterEditorBackref`) pass the real `useEditor()` shape, so the cast
 * is a no-op at runtime.
 */
export function setEditorBackref(opts: {
  query?: unknown;
  actions?: unknown;
  ecosystem?: Ecosystem | null;
}): void {
  if (opts.query !== undefined) queryRef = opts.query as EditorQuery | null;
  if (opts.actions !== undefined) actionsRef = opts.actions as EditorActions | null;
  if (opts.ecosystem !== undefined) ecosystemRef = opts.ecosystem;
}

export function clearEditorBackref(): void {
  queryRef = null;
  actionsRef = null;
  ecosystemRef = null;
}

export function getEditorQuery(): EditorQuery | null {
  return queryRef;
}

export function getEditorActions(): EditorActions | null {
  return actionsRef;
}

export function getEditorEcosystem(): Ecosystem | null {
  return ecosystemRef;
}
