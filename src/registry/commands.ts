/**
 * Command registry — register/unregister/execute commands.
 *
 * Phase 1 Wave A — pure data layer. `execute` reads a context snapshot,
 * applies `when` + `enablement`, then calls `run(ctx, args)`. No keybinding
 * dispatcher is mounted here.
 */
import type { CommandDef, CommandRunContext, CommandContext } from "./types";
import type { ContextRegistry } from "./context";

export interface CommandsRegistry {
  register: <Args = void>(def: CommandDef<Args>) => void;
  unregister: (id: string) => void;
  execute: <Args = unknown>(
    id: string,
    args?: Args,
    options?: { trigger?: CommandRunContext["trigger"]; query?: unknown; actions?: unknown }
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
        console.error("[ph.commands] listener error:", err);
      }
    });
  };

  const register = <Args = void>(def: CommandDef<Args>) => {
    if (!def?.id || typeof def.id !== "string") {
      throw new Error(`[ph.commands] register requires a string \`id\` — got ${String(def?.id)}`);
    }
    if (typeof def.run !== "function") {
      throw new Error(`[ph.commands] command ${def.id} requires a \`run\` function`);
    }
    if (map.has(def.id)) {
      throw new Error(`[ph.commands] duplicate command id "${def.id}"`);
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
      console.error(`[ph.commands] when() threw for "${id}":`, err);
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
      console.error(`[ph.commands] enablement() threw for "${id}":`, err);
      return false;
    }
  };

  const execute = async <Args = unknown>(
    id: string,
    args?: Args,
    options: {
      trigger?: CommandRunContext["trigger"];
      query?: unknown;
      actions?: unknown;
    } = {}
  ): Promise<void> => {
    const def = map.get(id);
    if (!def) {
      console.warn(`[ph.commands] execute("${id}") — no such command`);
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
        console.error(`[ph.commands] when() threw for "${id}":`, err);
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
        console.error(`[ph.commands] enablement() threw for "${id}":`, err);
        return;
      }
    }
    const runCtx: CommandRunContext = {
      ...(baseCtx as CommandContext),
      query: options.query,
      actions: options.actions,
      trigger: options.trigger ?? "api",
    };
    try {
      await def.run(runCtx, args as never);
    } catch (err) {
      console.error(`[ph.commands] run() threw for "${id}":`, err);
      throw err;
    }
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { register, unregister, execute, list, get, isVisible, isEnabled, subscribe };
}
