/**
 * Command registry — register/unregister/execute commands.
 *
 * Phase 1 Wave A — pure data layer. `execute` reads a context snapshot,
 * applies `when` + `enablement`, then calls `run(ctx, args)`. No keybinding
 * dispatcher is mounted here.
 */
import type {
  CommandDef,
  CommandRunContext,
  CommandContext,
  EditorActions,
  EditorQuery,
} from "./types";
import type { ContextRegistry } from "./context";
import { getEditorActions, getEditorQuery } from "./editorBackref";
import { sdkLog } from "../utils/logger";
import { CommandRegistryError } from "../utils/errors";

export interface CommandsRegistry {
  register: <Args = void>(def: CommandDef<Args>) => void;
  unregister: (id: string) => void;
  /**
   * Replace an existing command's definition. Throws `CommandRegistryError`
   * (`COMMANDS_NOT_FOUND`) if no command with that id is registered. Use this
   * — not `register` — to override a builtin: `sdk.commands.replace({ id:
   * "ph.editor.save", run: myRun })`. `register` is strict on collision so
   * accidental dupes still surface loudly.
   */
  replace: <Args = void>(def: CommandDef<Args>) => void;
  execute: <Args = unknown>(
    id: string,
    args?: Args,
    options?: {
      trigger?: CommandRunContext["trigger"];
      query?: EditorQuery | null;
      actions?: EditorActions | null;
    }
  ) => Promise<void>;
  list: () => CommandDef<unknown>[];
  get: (id: string) => CommandDef<unknown> | undefined;
  /** Convenience read-through to underlying context. */
  isVisible: (id: string, args?: unknown) => boolean;
  isEnabled: (id: string, args?: unknown) => boolean;
  /** Subscribe to registry changes (register/unregister). */
  subscribe: (listener: () => void) => () => void;
}

export interface CommandsRegistryDeps {
  context: ContextRegistry;
}

export function createCommandsRegistry(deps: CommandsRegistryDeps): CommandsRegistry {
  const map = new Map<string, CommandDef<unknown>>();
  const listeners = new Set<() => void>();

  const notify = () => {
    listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        sdkLog.error("[ph.commands] listener error:", err);
      }
    });
  };

  const assertValidDef = (def: CommandDef<unknown> | undefined, fnName: "register" | "replace") => {
    if (!def?.id || typeof def.id !== "string") {
      throw new CommandRegistryError({
        code: "COMMANDS_BAD_ID",
        message: `[ph.commands] ${fnName} requires a string \`id\` — got ${String(def?.id)}`,
      });
    }
    if (typeof def.run !== "function") {
      throw new CommandRegistryError({
        code: "COMMANDS_NO_RUN",
        message: `[ph.commands] command ${def.id} requires a \`run\` function`,
      });
    }
  };

  const register = <Args = void>(def: CommandDef<Args>) => {
    assertValidDef(def as CommandDef<unknown>, "register");
    if (map.has(def.id)) {
      throw new CommandRegistryError({
        code: "COMMANDS_DUPLICATE",
        message: `[ph.commands] duplicate command id "${def.id}"`,
        hint: `Use sdk.commands.replace(def) to override an existing command (e.g. a builtin).`,
      });
    }
    map.set(def.id, def as CommandDef<unknown>);
    notify();
  };

  const replace = <Args = void>(def: CommandDef<Args>) => {
    assertValidDef(def as CommandDef<unknown>, "replace");
    if (!map.has(def.id)) {
      throw new CommandRegistryError({
        code: "COMMANDS_NOT_FOUND",
        message: `[ph.commands] replace("${def.id}") — no such command`,
        hint: `Use sdk.commands.register(def) to add a new command.`,
      });
    }
    map.set(def.id, def as CommandDef<unknown>);
    notify();
  };

  const unregister = (id: string) => {
    if (map.delete(id)) notify();
  };

  const get = (id: string) => map.get(id);
  const list = () => Array.from(map.values());

  const isVisible = (id: string, args?: unknown) => {
    const def = map.get(id);
    if (!def) return false;
    const ctx = deps.context.getSnapshot();
    if (!def.when) return true;
    try {
      return Boolean(def.when(ctx, args as never));
    } catch (err) {
      sdkLog.error(`[ph.commands] when() threw for "${id}":`, err);
      return false;
    }
  };

  const isEnabled = (id: string, args?: unknown) => {
    const def = map.get(id);
    if (!def) return false;
    if (!isVisible(id, args)) return false;
    if (!def.enablement) return true;
    const ctx = deps.context.getSnapshot();
    try {
      return Boolean(def.enablement(ctx, args as never));
    } catch (err) {
      sdkLog.error(`[ph.commands] enablement() threw for "${id}":`, err);
      return false;
    }
  };

  const execute = async <Args = unknown>(
    id: string,
    args?: Args,
    options: {
      trigger?: CommandRunContext["trigger"];
      query?: EditorQuery | null;
      actions?: EditorActions | null;
    } = {}
  ): Promise<void> => {
    const def = map.get(id);
    if (!def) {
      sdkLog.warn(`[ph.commands] execute("${id}") — no such command`);
      return;
    }
    const baseCtx = deps.context.getSnapshot();
    if (def.when) {
      try {
        if (!def.when(baseCtx, args as never)) {
          // Silently skip — when()===false is the "this command is not
          // applicable in the current context" outcome, not an error.
          return;
        }
      } catch (err) {
        sdkLog.error(`[ph.commands] when() threw for "${id}":`, err);
        return;
      }
    }
    if (def.enablement) {
      try {
        if (!def.enablement(baseCtx, args as never)) {
          // Enablement == disabled UI; explicit dispatch should be a no-op.
          return;
        }
      } catch (err) {
        sdkLog.error(`[ph.commands] enablement() threw for "${id}":`, err);
        return;
      }
    }
    // Fall back to the registered editor backrefs so command bodies don't
    // need a hook context to reach CraftJS. Callers that pass explicit
    // query/actions (tests, host APIs) still win.
    const resolvedQuery = options.query ?? getEditorQuery();
    const resolvedActions = options.actions ?? getEditorActions();
    if (!resolvedQuery || !resolvedActions) {
      sdkLog.warn(
        `[ph.commands] execute("${id}") — no editor mounted; pass options.query/actions if running headless.`
      );
      return;
    }
    const runCtx: CommandRunContext = {
      ...(baseCtx as CommandContext),
      query: resolvedQuery,
      actions: resolvedActions,
      trigger: options.trigger ?? "api",
    };
    try {
      await def.run(runCtx, args as never);
    } catch (err) {
      sdkLog.error(`[ph.commands] run() threw for "${id}":`, err);
      throw err;
    }
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { register, replace, unregister, execute, list, get, isVisible, isEnabled, subscribe };
}
