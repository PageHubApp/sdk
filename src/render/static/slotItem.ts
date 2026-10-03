/**
 * Synthetic repeater item used to render a client-side item template
 * (`<template data-item-template>`). Any property access (at any depth)
 * returns a child proxy that, when coerced to a string via interpolation,
 * resolves to `{{slot:<dot.path>}}`. The runtime later substitutes the slot
 * markers with values from the real items (`runtime/chunks/repeater.ts`).
 *
 * Walker uses `in value` so we trap `has` to always return true; `get`
 * builds up the path. `Symbol.toPrimitive` / `toString` / `valueOf` return
 * the slot string so `String(item.foo.bar)` yields `"{{slot:foo.bar}}"`.
 *
 * `id` deliberately returns a non-proxy string ("{{slot:id}}") so the
 * iteration's `data-item-id` stamp works cleanly. All other paths produce
 * recursive proxies.
 */

const SLOT_ITEM = Symbol.for("pagehub.static.slotItem");

export function makeSlotProxy(path: string[] = []): any {
  const pathStr = path.join(".");
  const slotStr = pathStr ? `{{slot:${pathStr}}}` : "";
  const handler: ProxyHandler<any> = {
    has() {
      return true;
    },
    get(_target, key) {
      if (key === SLOT_ITEM) return true;
      if (key === Symbol.toPrimitive) return () => slotStr;
      if (key === "toString" || key === "valueOf") return () => slotStr;
      if (typeof key === "symbol") return undefined;
      // Avoid wrapping JS engine introspection / array protocol props that
      // would otherwise be treated as paths.
      if (key === "constructor" || key === "then") return undefined;
      return makeSlotProxy([...path, String(key)]);
    },
  };
  // Target is an empty object so `typeof item === "object"` holds (walkPath
  // requires it). Make the target stringify to the slot too.
  const target: any = {};
  target.toString = () => slotStr;
  target.valueOf = () => slotStr;
  return new Proxy(target, handler);
}

/**
 * True when `item` is the template-render proxy — i.e. the walker is
 * producing a client template, so per-item decisions (item conditions) can't
 * be made now and have to ship to the runtime.
 */
export function isSlotItem(item: unknown): boolean {
  return !!item && typeof item === "object" && (item as any)[SLOT_ITEM] === true;
}
