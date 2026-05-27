/**
 * SlotRenderer — React component that resolves and renders contributions
 * for a given slot id. Re-renders when contributions or context change.
 */
import React, { Fragment, useSyncExternalStore } from "react";
import { useRegistries } from "./provider";

export interface SlotRendererProps<Ctx = unknown> {
  id: string;
  ctx?: Ctx;
  /** Optional fallback when no contribution resolves. */
  fallback?: React.ReactNode;
}

export function SlotRenderer<Ctx = unknown>(props: SlotRendererProps<Ctx>) {
  const { id, ctx, fallback = null } = props;
  const registries = useRegistries();

  // Re-subscribe whenever the slot registry OR the context registry change.
  const tick = useSyncExternalStore(
    onChange => {
      const u1 = registries.slots.subscribe(onChange);
      const u2 = registries.context.subscribe(onChange);
      return () => {
        u1();
        u2();
      };
    },
    () => registries.tick,
    () => 0
  );
  // tick read forces re-render on subscription fire
  void tick;

  const def = registries.slots.getDef(id);
  if (!def) return <>{fallback}</>;
  const resolved = registries.slots.resolve(id, ctx);
  if (resolved.length === 0) return <>{fallback}</>;
  if (def.cardinality === "single") {
    const winner = resolved[0]!;
    try {
      return <>{winner.render(ctx as never)}</>;
    } catch (err) {
      console.error(`[ph.SlotRenderer] render threw for "${id}":`, err);
      return <>{fallback}</>;
    }
  }
  return (
    <>
      {resolved.map((c, i) => {
        try {
          return <Fragment key={i}>{c.render(ctx as never)}</Fragment>;
        } catch (err) {
          console.error(`[ph.SlotRenderer] render threw for "${id}" (idx ${i}):`, err);
          return null;
        }
      })}
    </>
  );
}
