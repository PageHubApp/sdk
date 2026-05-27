/**
 * Read/write Zedux atoms from outside React.
 *
 * Phase 2 C2a uses these from command `run` bodies that fire via the
 * keybinding dispatcher or the command palette — neither has a hook context.
 * Internally the helpers grab the ecosystem registered by `EditorInner` on
 * mount (see `registry/editorBackref.ts`). All calls are no-ops until the
 * editor has mounted (which is always true when a chord fires).
 */
import { getEditorEcosystem } from "../../registry/editorBackref";

type AtomTemplate<T> = any; // Zedux atom templates aren't a single shared type.

export function setAtomExternal<T>(template: AtomTemplate<T>, value: T | ((prev: T) => T)): void {
  const eco = getEditorEcosystem();
  if (!eco) return;
  try {
    const instance = eco.getInstance(template);
    instance.setState(value as any);
  } catch (err) {
    console.error("[ph.atoms] setAtomExternal failed:", err);
  }
}

export function getAtomExternal<T>(template: AtomTemplate<T>): T | undefined {
  const eco = getEditorEcosystem();
  if (!eco) return undefined;
  try {
    const instance = eco.getInstance(template);
    return instance.getState() as T;
  } catch (err) {
    console.error("[ph.atoms] getAtomExternal failed:", err);
    return undefined;
  }
}
