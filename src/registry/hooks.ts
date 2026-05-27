/**
 * React hooks for the SDK registries.
 *
 * Each hook subscribes to the relevant registries via `useSyncExternalStore`
 * so consumers re-render exactly when the data they depend on changes.
 */
import { useSyncExternalStore, useMemo } from "react";
import { useRegistries } from "./provider";
import type {
  CommandContext,
  MenuLocation,
  ResolvedContribution,
  ResolvedMenuItem,
} from "./types";

/** Current command context snapshot. Re-renders on any context change. */
export function useCommandContext(): CommandContext {
  const { context } = useRegistries();
  return useSyncExternalStore(
    onChange => context.subscribe(onChange),
    () => context.getSnapshot(),
    () => context.getSnapshot()
  );
}

/** Resolved menu items for a location. */
export function useMenuItems(
  location: MenuLocation,
  ctxOverride?: CommandContext
): ResolvedMenuItem[] {
  const { menus, commands, context } = useRegistries();
  // We can't use `items()` as a snapshot directly (arrays are new each call).
  // Instead subscribe to the three sources of truth and read inside useMemo
  // keyed off a tick that we derive from `useSyncExternalStore`.
  const tick = useSyncExternalStore(
    onChange => {
      const u1 = menus.subscribe(onChange);
      const u2 = commands.subscribe(onChange);
      const u3 = context.subscribe(onChange);
      return () => {
        u1();
        u2();
        u3();
      };
    },
    () => menuTickSnapshot(menus, commands, context),
    () => 0
  );
  void tick;
  return useMemo(
    () => menus.items(location, ctxOverride),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location, ctxOverride, tick, menus]
  );
}

// Module-scoped counters so getSnapshot returns a primitive that flips
// whenever a relevant registry changes. We pair these with subscribe so
// React knows when to call getSnapshot again.
function menuTickSnapshot(
  menus: ReturnType<typeof useRegistries>["menus"],
  commands: ReturnType<typeof useRegistries>["commands"],
  context: ReturnType<typeof useRegistries>["context"]
): number {
  // Anchor a per-bundle counter on the registries themselves. We add a
  // hidden field on first call; subsequent calls return the cached counter
  // (which is bumped by subscribe callbacks below).
  const anchor = menus as unknown as { __phTick?: number };
  if (anchor.__phTick == null) {
    anchor.__phTick = 0;
    const bump = () => {
      anchor.__phTick = (anchor.__phTick ?? 0) + 1;
    };
    menus.subscribe(bump);
    commands.subscribe(bump);
    context.subscribe(bump);
  }
  return anchor.__phTick ?? 0;
}

/**
 * Single-cardinality slot — resolved winning contribution or null.
 * Returns the render function so the caller controls when it's invoked
 * (e.g. inside a portal). Use `<SlotRenderer>` for the common case.
 */
export function useSlot<Ctx = unknown>(
  slotId: string,
  ctx?: Ctx
): ResolvedContribution<Ctx> | null {
  const { slots, context } = useRegistries();
  const tick = useSyncExternalStore(
    onChange => {
      const u1 = slots.subscribe(onChange);
      const u2 = context.subscribe(onChange);
      return () => {
        u1();
        u2();
      };
    },
    () => slotTickSnapshot(slots, context),
    () => 0
  );
  void tick;
  return useMemo(() => {
    const resolved = slots.resolve<Ctx>(slotId, ctx);
    return resolved[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId, ctx, tick, slots]);
}

/** List-cardinality slot — all resolved contributions in group order. */
export function useSlotList<Ctx = unknown>(
  slotId: string,
  ctx?: Ctx
): ResolvedContribution<Ctx>[] {
  const { slots, context } = useRegistries();
  const tick = useSyncExternalStore(
    onChange => {
      const u1 = slots.subscribe(onChange);
      const u2 = context.subscribe(onChange);
      return () => {
        u1();
        u2();
      };
    },
    () => slotTickSnapshot(slots, context),
    () => 0
  );
  void tick;
  return useMemo(
    () => slots.resolve<Ctx>(slotId, ctx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slotId, ctx, tick, slots]
  );
}

function slotTickSnapshot(
  slots: ReturnType<typeof useRegistries>["slots"],
  context: ReturnType<typeof useRegistries>["context"]
): number {
  const anchor = slots as unknown as { __phSlotTick?: number };
  if (anchor.__phSlotTick == null) {
    anchor.__phSlotTick = 0;
    const bump = () => {
      anchor.__phSlotTick = (anchor.__phSlotTick ?? 0) + 1;
    };
    slots.subscribe(bump);
    context.subscribe(bump);
  }
  return anchor.__phSlotTick ?? 0;
}
