/**
 * Slot registry — the third primitive alongside commands + menus.
 *
 * Slots model "let the host render arbitrary React inside a specific spot
 * in editor chrome." Single-cardinality slots resolve to the winning
 * contribution (highest priority); list slots accumulate all matching
 * contributions sorted by group@order.
 */
import type { CommandContext } from "./types";
import type {
  ResolvedContribution,
  SlotContribution,
  SlotDef,
} from "./types";
import type { ContextRegistry } from "./context";
import { sdkLog } from "../utils/logger";
import { SlotRegistryError } from "../utils/errors";

export interface SlotsRegistry {
  register: (def: SlotDef) => void;
  contribute: <Ctx = unknown>(c: SlotContribution<Ctx>) => void;
  /** Remove all contributions to `slotId`. If `key` given, remove only that one. */
  remove: (slotId: string, key?: unknown) => void;
  /** Resolve contributions for `slotId` given the slot's context. */
  resolve: <Ctx = unknown>(slotId: string, ctx?: Ctx) => ResolvedContribution<Ctx>[];
  /** Read the registered slot definition. */
  getDef: (slotId: string) => SlotDef | undefined;
  list: () => SlotDef[];
  subscribe: (listener: () => void) => () => void;
}

export interface SlotsRegistryDeps {
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

export function createSlotsRegistry(deps: SlotsRegistryDeps): SlotsRegistry {
  const defs = new Map<string, SlotDef>();
  // slotId -> contributions (insertion order preserved)
  const contributions = new Map<string, SlotContribution[]>();
  const listeners = new Set<() => void>();

  const notify = () => {
    listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        sdkLog.error("[ph.slots] listener error:", err);
      }
    });
  };

  const register = (def: SlotDef) => {
    if (!def?.id) {
      throw new SlotRegistryError({
        code: "SLOTS_BAD_ID",
        message: `[ph.slots] register requires a string id`,
      });
    }
    if (defs.has(def.id)) {
      // Re-registering the same id is a noop — keeps host-boot order forgiving.
      return;
    }
    defs.set(def.id, def);
    notify();
  };

  const contribute = <Ctx = unknown>(c: SlotContribution<Ctx>) => {
    if (!c?.slot) {
      throw new SlotRegistryError({
        code: "SLOTS_BAD_CONTRIBUTION",
        message: `[ph.slots] contribute requires a slot id`,
      });
    }
    if (typeof c.render !== "function") {
      throw new SlotRegistryError({
        code: "SLOTS_NO_RENDER",
        message: `[ph.slots] contribution to "${c.slot}" requires a render function`,
      });
    }
    if (!defs.has(c.slot)) {
      throw new SlotRegistryError({
        code: "SLOTS_UNDEFINED_SLOT",
        message: `[ph.slots] contribution to undefined slot "${c.slot}"`,
        hint: `Register the slot via sdk.slots.register({ id: "${c.slot}", ... }) before contributing.`,
      });
    }
    const list = contributions.get(c.slot) ?? [];
    list.push(c as SlotContribution);
    contributions.set(c.slot, list);
    notify();
  };

  const remove = (slotId: string, key?: unknown) => {
    const list = contributions.get(slotId);
    if (!list) return;
    if (key === undefined) {
      contributions.delete(slotId);
      notify();
      return;
    }
    const next = list.filter(c => c.key !== key);
    if (next.length === list.length) return;
    if (next.length === 0) contributions.delete(slotId);
    else contributions.set(slotId, next);
    notify();
  };

  const resolve = <Ctx = unknown>(slotId: string, ctx?: Ctx): ResolvedContribution<Ctx>[] => {
    const def = defs.get(slotId);
    if (!def) return [];
    const list = contributions.get(slotId) ?? [];
    if (list.length === 0) return [];
    const appCtx: CommandContext = deps.context.getSnapshot();
    const filtered: { c: SlotContribution; group: string; order: number; idx: number }[] = [];
    list.forEach((c, idx) => {
      if (c.when) {
        try {
          if (!c.when(ctx as unknown, appCtx)) return;
        } catch (err) {
          sdkLog.error(`[ph.slots] when() threw for "${slotId}":`, err);
          return;
        }
      }
      const { group, order } = parseGroup(c.group);
      filtered.push({ c, group, order, idx });
    });
    if (filtered.length === 0) return [];
    if (def.cardinality === "single") {
      // Highest priority wins; tie -> last contribution (insertion order).
      const defaultPrio = def.defaultPriority ?? 0;
      filtered.sort((a, b) => {
        const ap = a.c.priority ?? defaultPrio;
        const bp = b.c.priority ?? defaultPrio;
        if (ap !== bp) return bp - ap;
        return b.idx - a.idx;
      });
      const winner = filtered[0]!;
      return [
        {
          slot: slotId,
          render: winner.c.render as (ctx: Ctx) => ReturnType<typeof winner.c.render>,
          priority: winner.c.priority ?? defaultPrio,
          group: winner.group,
          groupOrder: winner.order,
          key: winner.c.key,
        },
      ];
    }
    // list cardinality: sort by group@order, then insertion order
    filtered.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.idx - b.idx;
    });
    return filtered.map(({ c, group, order }) => ({
      slot: slotId,
      render: c.render as (ctx: Ctx) => ReturnType<typeof c.render>,
      priority: c.priority ?? 0,
      group,
      groupOrder: order,
      key: c.key,
    }));
  };

  const getDef = (slotId: string) => defs.get(slotId);
  const list = () => Array.from(defs.values());

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { register, contribute, remove, resolve, getDef, list, subscribe };
}
