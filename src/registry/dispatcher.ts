/**
 * Keybinding dispatcher — Phase 1 Wave B1.
 *
 * Mounts a single document-level `keydown` listener that:
 *   1. Skips events targeted inside a text-editing surface unless the
 *      matched binding's `when` is the tiptap-active variant.
 *   2. Asks the keybindings registry for the highest-priority match.
 *   3. Resolves the bound command and (a) calls `commands.execute(...)`
 *      with `trigger: "keybinding"`, (b) calls `preventDefault` +
 *      `stopPropagation` ONLY when the command is NOT a stub (so existing
 *      handlers keep owning the chord until Phase 2 deletes them).
 *
 * Coexistence: in Wave B every built-in command is `stub: true`, so this
 * dispatcher's effect is limited to noisy console.warn logs from the stub
 * `run` bodies. Real surface handlers stay in charge. Phase 2 deletes the
 * surface handlers and clears `stub` per command as each migrates.
 */
import type { CommandsRegistry } from "./commands";
import type { ContextRegistry } from "./context";
import type { KeybindingsRegistry } from "./keybindings";
import type { CommandContext, KeybindingDef } from "./types";
import { isInsideTextEditingSurface } from "../utils/keyboard";
import { sdkLog } from "../utils/logger";

export interface KeybindingDispatcherOptions {
  commands: CommandsRegistry;
  keybindings: KeybindingsRegistry;
  context: ContextRegistry;
  /** Defaults to `document` in the browser. Pass `null` to no-op (SSR). */
  target?: Document | null;
  /**
   * Optional context provider. When omitted the registry's snapshot is used.
   * Surfaces with extra runtime keys can layer a fresh snapshot per event.
   */
  getCtx?: () => CommandContext;
}

/**
 * Returns a binding's effective tiptap-gate. A binding that explicitly opts
 * in to text-editing surfaces by checking `ctx.tiptap.active` in its `when`
 * is hard to detect statically; today every text-editing-aware binding
 * checks `!ctx.tiptap?.active` (via `notInTextEditing`), so we conservatively
 * assume non-tiptap by default. The dispatcher therefore enforces the gate
 * itself: if the event target is inside a text-editing surface, the
 * dispatcher skips dispatch unless the matched command is in the "ph.text.*"
 * category — those are the only commands designed to fire inside text edit.
 */
function bindingFiresInsideTextSurface(
  def: KeybindingDef,
  commands: CommandsRegistry
): boolean {
  const cmd = commands.get(def.command);
  if (!cmd) return false;
  // Allow text-editor and tiptap-active commands inside text surfaces.
  if (cmd.category === "Text") return true;
  if (cmd.id.startsWith("ph.text.")) return true;
  return false;
}

export function mountKeybindingDispatcher(
  opts: KeybindingDispatcherOptions
): () => void {
  const doc =
    opts.target === undefined
      ? typeof document !== "undefined"
        ? document
        : null
      : opts.target;
  if (!doc) return () => {};

  const seenConflicts = new Set<string>();

  const handler = (event: KeyboardEvent) => {
    const ctx = opts.getCtx ? opts.getCtx() : opts.context.getSnapshot();

    // Gate: if focus is in a text-editing surface, only allow bindings whose
    // matched command is text-scoped. Cheap pre-check before iterating.
    const inTextSurface = isInsideTextEditingSurface(event.target);

    // Collect all matches (so we can log conflict and respect priority).
    const all = opts.keybindings.list();
    // Re-run match() once to honor existing match logic (parsing + when()).
    const best = opts.keybindings.match(event, ctx);
    if (!best) return;

    if (inTextSurface && !bindingFiresInsideTextSurface(best, opts.commands)) {
      return;
    }

    // Detect conflicts at the matched priority for an informative warning.
    // (Don't change behavior — match() already deterministically picked one.)
    let conflictCount = 0;
    const targetPriority = best.priority ?? 0;
    for (const def of all) {
      if (def === best) continue;
      if ((def.priority ?? 0) !== targetPriority) continue;
      // Cheap: only check def.key === best.key string (covers most conflicts).
      if (def.key !== best.key) continue;
      // Re-evaluate when() against the same ctx so we only count actual matches.
      if (def.when) {
        try {
          if (!def.when(ctx)) continue;
        } catch {
          continue;
        }
      }
      conflictCount++;
    }
    if (conflictCount > 0) {
      const sig = `${best.key}@${targetPriority}`;
      if (!seenConflicts.has(sig)) {
        seenConflicts.add(sig);
        sdkLog.warn(
          `[ph] keybinding conflict: ${best.key} matched ${conflictCount + 1} bindings at priority ${targetPriority}; picked "${best.command}" (first registered).`
        );
      }
    }

    const cmd = opts.commands.get(best.command);
    if (!cmd) return;

    const isStub = cmd.stub === true;

    // Fire the command (stub or real). execute() re-checks when/enablement.
    try {
      void opts.commands.execute(best.command, best.args, {
        trigger: "keybinding",
      });
    } catch (err) {
      sdkLog.error(
        `[ph.dispatcher] execute("${best.command}") threw:`,
        err
      );
    }

    // Only swallow the event when a real handler will fire from `run`. This
    // keeps existing inline handlers untouched during the Wave B coexistence
    // period — stubs warn but don't suppress browser/native behavior.
    if (!isStub) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  doc.addEventListener("keydown", handler);
  return () => {
    doc.removeEventListener("keydown", handler);
  };
}
