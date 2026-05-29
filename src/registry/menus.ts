/**
 * Menu registry — contributions of commands into named menu locations.
 *
 * `items(location, ctx?)` resolves group ordering ("group@order"), applies
 * `when` (both command-level and per-item), and merges `iconOverride` /
 * `titleOverride` into a final `ResolvedMenuItem[]`.
 */
import type {
  CommandContext,
  MenuItem,
  MenuLocation,
  ResolvedMenuItem,
  CommandDef,
} from "./types";
import type { CommandsRegistry } from "./commands";
import type { ContextRegistry } from "./context";
import { sdkLog } from "../utils/logger";

export interface MenusRegistry {
  contribute: <Args = unknown>(location: MenuLocation, items: MenuItem<Args>[]) => void;
  remove: (location: MenuLocation, commandId: string) => void;
  /** Resolved, sorted, when-filtered items for a location. */
  items: (location: MenuLocation, ctx?: CommandContext) => ResolvedMenuItem[];
  /** Raw (unresolved) contributions — useful for tests and debugging. */
  raw: (location: MenuLocation) => MenuItem[];
  subscribe: (listener: () => void) => () => void;
}

export interface MenusRegistryDeps {
  commands: CommandsRegistry;
  context: ContextRegistry;
}

interface ParsedGroup {
  group: string;
  order: number;
}

function parseGroup(g: string | undefined): ParsedGroup {
  if (!g) return { group: "_default", order: 0 };
  const at = g.lastIndexOf("@");
  if (at === -1) return { group: g, order: 0 };
  const name = g.slice(0, at);
  const rawOrder = g.slice(at + 1);
  const order = Number.parseInt(rawOrder, 10);
  if (Number.isNaN(order)) return { group: g, order: 0 };
  return { group: name || "_default", order };
}

function resolveValue<T>(v: T | ((ctx: CommandContext) => T) | undefined, ctx: CommandContext): T | undefined {
  if (typeof v === "function") {
    try {
      return (v as (ctx: CommandContext) => T)(ctx);
    } catch (err) {
      sdkLog.error("[ph.menus] dynamic value threw:", err);
      return undefined;
    }
  }
  return v;
}

export function createMenusRegistry(deps: MenusRegistryDeps): MenusRegistry {
  // location -> ordered array of menu items
  const map = new Map<MenuLocation, MenuItem[]>();
  const listeners = new Set<() => void>();

  const notify = () => {
    listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        sdkLog.error("[ph.menus] listener error:", err);
      }
    });
  };

  const contribute = <Args = unknown>(
    location: MenuLocation,
    items: MenuItem<Args>[]
  ) => {
    if (!Array.isArray(items)) {
      throw new Error(`[ph.menus] contribute(${String(location)}, items) — items must be an array`);
    }
    const existing = map.get(location) ?? [];
    map.set(location, existing.concat(items as MenuItem[]));
    notify();
  };

  const remove = (location: MenuLocation, commandId: string) => {
    const existing = map.get(location);
    if (!existing) return;
    const next = existing.filter(it => it.command !== commandId);
    if (next.length === existing.length) return;
    map.set(location, next);
    notify();
  };

  const raw = (location: MenuLocation) => (map.get(location) ?? []).slice();

  const items = (location: MenuLocation, ctxOverride?: CommandContext): ResolvedMenuItem[] => {
    const ctx = ctxOverride ?? deps.context.getSnapshot();
    const list = map.get(location) ?? [];
    const out: ResolvedMenuItem[] = [];
    for (const it of list) {
      const def = deps.commands.get(it.command) as CommandDef<unknown> | undefined;
      if (!def) continue;
      // command-level when
      if (def.when) {
        try {
          if (!def.when(ctx, it.args as never)) continue;
        } catch (err) {
          sdkLog.error(`[ph.menus] command when() threw for "${it.command}":`, err);
          continue;
        }
      }
      // per-item when
      if (it.when) {
        try {
          if (!it.when(ctx)) continue;
        } catch (err) {
          sdkLog.error(`[ph.menus] item when() threw for "${it.command}":`, err);
          continue;
        }
      }
      const { group, order } = parseGroup(it.group);
      const title =
        resolveValue(it.titleOverride, ctx) ??
        (typeof def.title === "function"
          ? (() => {
              try {
                return (def.title as (c: CommandContext, a?: unknown) => string)(ctx, it.args);
              } catch (err) {
                sdkLog.error(`[ph.menus] title() threw for "${it.command}":`, err);
                return String(it.command);
              }
            })()
          : def.title);
      const icon = resolveValue(it.iconOverride, ctx) ?? resolveValue(def.icon, ctx) ?? null;
      let enabled = true;
      if (def.enablement) {
        try {
          enabled = Boolean(def.enablement(ctx, it.args as never));
        } catch (err) {
          sdkLog.error(`[ph.menus] enablement() threw for "${it.command}":`, err);
          enabled = false;
        }
      }
      out.push({
        command: it.command,
        args: it.args,
        group,
        groupOrder: order,
        title: String(title ?? it.command),
        icon: icon ?? null,
        category: def.category,
        enabled,
        paletteHide: Boolean(def.paletteHide),
        def,
      });
    }
    // Sort by groupOrder ascending, then preserve insertion order within group.
    return out
      .map((entry, idx) => ({ entry, idx }))
      .sort((a, b) => {
        if (a.entry.groupOrder !== b.entry.groupOrder)
          return a.entry.groupOrder - b.entry.groupOrder;
        return a.idx - b.idx;
      })
      .map(({ entry }) => entry);
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { contribute, remove, items, raw, subscribe };
}
