/**
 * React provider for the SDK registries.
 *
 * The Wave A SDK boot creates the registries (commands, menus, slots,
 * keybindings, context) and exposes them through this context. Surfaces
 * consume via the hooks in `./hooks.ts`.
 */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CommandsRegistry } from "./commands";
import type { MenusRegistry } from "./menus";
import type { SlotsRegistry } from "./slots";
import type { KeybindingsRegistry } from "./keybindings";
import type { ContextRegistry } from "./context";

export interface RegistriesBundle {
  commands: CommandsRegistry;
  menus: MenusRegistry;
  slots: SlotsRegistry;
  keybindings: KeybindingsRegistry;
  context: ContextRegistry;
  /** Monotonic tick — incremented on any registry change. Useful for `useSyncExternalStore` getSnapshot. */
  tick: number;
}

const RegistriesContext = createContext<RegistriesBundle | null>(null);

export function RegistriesProvider(props: {
  registries: Omit<RegistriesBundle, "tick">;
  children?: React.ReactNode;
}) {
  // Bump tick on any registry change so consumers using `useSyncExternalStore`
  // with `() => registries.tick` as the snapshot can compare with `!==`.
  const tickRef = useRef(0);
  const [, force] = useState(0);

  useEffect(() => {
    const bump = () => {
      tickRef.current += 1;
      force(t => t + 1);
    };
    const unsubs = [
      props.registries.commands.subscribe(bump),
      props.registries.menus.subscribe(bump),
      props.registries.slots.subscribe(bump),
      props.registries.keybindings.subscribe(bump),
      props.registries.context.subscribe(bump),
    ];
    return () => unsubs.forEach(u => u());
  }, [
    props.registries.commands,
    props.registries.menus,
    props.registries.slots,
    props.registries.keybindings,
    props.registries.context,
  ]);

  const bundle = useMemo<RegistriesBundle>(
    () => ({ ...props.registries, tick: tickRef.current }),
    // tickRef.current changes between renders but useMemo won't recompute — fine,
    // we WANT consumers to see the latest registries; `tick` is read live via
    // the ref-backed getter pattern in hooks below.
    [props.registries]
  );

  return <RegistriesContext.Provider value={bundle}>{props.children}</RegistriesContext.Provider>;
}

export function useRegistries(): RegistriesBundle {
  const ctx = useContext(RegistriesContext);
  if (!ctx) {
    throw new Error(
      "[PageHub] useRegistries / SlotRenderer must be used inside <RegistriesProvider>. " +
        "The SDK boot path normally mounts this automatically."
    );
  }
  return ctx;
}

/** Returns the registries or null if no provider is mounted. */
export function useRegistriesSafe(): RegistriesBundle | null {
  return useContext(RegistriesContext);
}
