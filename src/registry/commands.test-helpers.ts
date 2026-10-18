/**
 * Headless commands registry for behavior tests.
 *
 * `commands.execute` refuses to run when no CraftJS `query`/`actions` are
 * available ("no editor mounted"). Most builtin run bodies under test never
 * touch CraftJS — they push URL params or flip atoms — so this wrapper hands
 * `execute` empty stubs as a last resort. Anything a test installed through
 * `setEditorBackref` (or passed explicitly) still wins; the fallback is read
 * at call time, so backrefs set after setup are honored.
 */
import { createCommandsRegistry, type CommandsRegistry } from "./commands";
import { getEditorActions, getEditorQuery } from "./editorBackref";
import type { EditorActions, EditorQuery } from "./types";

const STUB_QUERY = {} as EditorQuery;
const STUB_ACTIONS = {} as EditorActions;

export function createHeadlessCommandsRegistry(
  deps: Parameters<typeof createCommandsRegistry>[0]
): CommandsRegistry {
  const registry = createCommandsRegistry(deps);
  return {
    ...registry,
    execute: (id, args, options = {}) =>
      registry.execute(id, args, {
        ...options,
        query: options.query ?? getEditorQuery() ?? STUB_QUERY,
        actions: options.actions ?? getEditorActions() ?? STUB_ACTIONS,
      }),
  };
}
