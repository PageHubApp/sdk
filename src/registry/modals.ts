/**
 * Modal registry — the 4th primitive alongside commands + menus + slots.
 *
 * Slots render React into FIXED chrome spots; modals carry runtime open/close
 * state and render into a single central `<ModalHost>`. So this registry holds
 * BOTH a def-map (like slots) AND an open-stack (like `overlayStack.ts`).
 *
 * "Open *our* modal" (`open("ph.media")`) and "open *your* modal"
 * (`open("host.upgrade")`) are the identical call — that's the whole point.
 * Open-state lives here (not React state) so a host owning the bundle can call
 * `bundle.modals.open(...)` from OUTSIDE the editor React tree.
 */
import type { ContextRegistry } from "./context";
import type { ModalDef, OpenModal } from "./types";
import { sdkLog } from "../utils/logger";
import { ModalRegistryError } from "../utils/errors";

export interface ModalsRegistry {
  register: <P>(def: ModalDef<P>) => void;
  /** Override an existing def (throws MODALS_NOT_FOUND if absent) — mirrors commands.replace. */
  replace: <P>(def: ModalDef<P>) => void;
  unregister: (id: string) => void;

  /** Open (or re-open / bring-to-front) a modal. No-op if undefined or feature-gated off. */
  open: <P>(id: string, props?: P) => void;
  /** Close one modal (default: the top of the stack). */
  close: (id?: string) => void;
  closeAll: () => void;
  toggle: <P>(id: string, props?: P) => void;

  isOpen: (id: string) => boolean;
  /** Open instances, bottom→top (render + z order). */
  getOpen: () => OpenModal[];
  getDef: (id: string) => ModalDef | undefined;
  list: () => ModalDef[];
  subscribe: (listener: () => void) => () => void;
}

export interface ModalsRegistryDeps {
  context: ContextRegistry;
}

export function createModalsRegistry(deps: ModalsRegistryDeps): ModalsRegistry {
  const defs = new Map<string, ModalDef>();
  const open: OpenModal[] = []; // bottom→top
  const listeners = new Set<() => void>();
  let seq = 0;

  const notify = () =>
    listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        sdkLog.error("[ph.modals] listener error:", err);
      }
    });

  const register = <P>(def: ModalDef<P>) => {
    if (!def?.id)
      throw new ModalRegistryError({
        code: "MODALS_BAD_ID",
        message: "[ph.modals] register requires a string id",
      });
    if (typeof def.render !== "function")
      throw new ModalRegistryError({
        code: "MODALS_NO_RENDER",
        message: `[ph.modals] modal "${def.id}" requires a render function`,
      });
    if (defs.has(def.id))
      throw new ModalRegistryError({
        code: "MODALS_DUPLICATE",
        message: `[ph.modals] duplicate modal id "${def.id}"`,
        hint: "Use sdk.modals.replace(def) to override a builtin.",
      });
    defs.set(def.id, def as ModalDef);
    notify();
  };

  const replace = <P>(def: ModalDef<P>) => {
    if (!defs.has(def.id))
      throw new ModalRegistryError({
        code: "MODALS_NOT_FOUND",
        message: `[ph.modals] replace("${def.id}") — no such modal`,
      });
    defs.set(def.id, def as ModalDef);
    notify();
  };

  const unregister = (id: string) => {
    const had = defs.delete(id);
    const beforeOpen = open.length;
    for (let i = open.length - 1; i >= 0; i--) if (open[i]!.id === id) open.splice(i, 1);
    if (had || open.length !== beforeOpen) notify();
  };

  const openFn = <P>(id: string, props?: P) => {
    const def = defs.get(id);
    if (!def) {
      sdkLog.warn(`[ph.modals] open("${id}") — no such modal`);
      return;
    }
    if (def.feature) {
      const features = deps.context.getSnapshot().features as Record<string, unknown>;
      if (features?.[def.feature as string] === false) return; // silent feature gate
    }
    const existing = open.findIndex(o => o.id === id);
    if (existing >= 0) open.splice(existing, 1); // bring-to-front, refresh props
    open.push({ id, props: props as unknown, seq: seq++ });
    notify();
  };

  const close = (id?: string) => {
    if (open.length === 0) return;
    if (id === undefined) {
      open.pop();
      notify();
      return;
    }
    const idx = open.findIndex(o => o.id === id);
    if (idx < 0) return;
    open.splice(idx, 1);
    notify();
  };

  const closeAll = () => {
    if (open.length === 0) return;
    open.length = 0;
    notify();
  };

  const toggle = <P>(id: string, props?: P) =>
    open.some(o => o.id === id) ? close(id) : openFn(id, props);

  const isOpen = (id: string) => open.some(o => o.id === id);
  const getOpen = () => open.slice();
  const getDef = (id: string) => defs.get(id);
  const list = () => Array.from(defs.values());
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  };

  return {
    register,
    replace,
    unregister,
    open: openFn,
    close,
    closeAll,
    toggle,
    isOpen,
    getOpen,
    getDef,
    list,
    subscribe,
  };
}
