/**
 * @pagehub/sdk — React context for SDK configuration
 *
 * Internal context that makes the resolved config available to all
 * SDK components without prop drilling.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import type { ResolvedConfig } from "../config";
import { EventEmitter } from "./events";
import { getSaveCoordinator } from "./saveCoordinator";
import { setPageHubApiBaseUrl } from "./apiConfig";
import {
  resetCuratedGoogleFontFamilies,
  setCuratedGoogleFontFamilies,
} from "../utils/fonts/googleFonts";
import {
  resetViewportDevicePresets,
  setViewportDevicePresets,
} from "../chrome/viewport/viewportDevicePresets";
import { EditorStoreProvider } from "./store";
import type { PageHubFeatures, PageHubTheme, SaveMeta, SaveResult, SaveStatus } from "../types";
import { Tooltip as ReactTooltip } from "react-tooltip";
import {
  PAGEHUB_RTT_GLOBAL_ID,
  REACT_TOOLTIP_SURFACE_CLASS,
} from "../chrome/primitives/layout/tooltipSurface";
import { RegistriesProvider, createRegistriesBundle } from "../registry";
import { mountKeybindingDispatcher } from "../registry/dispatcher";
import type {
  CommandsRegistry,
  MenusRegistry,
  SlotsRegistry,
  KeybindingsRegistry,
  ContextRegistry,
} from "../registry";

interface SDKContextValue {
  config: ResolvedConfig;
  emitter: EventEmitter;
  theme: Required<PageHubTheme>;
  features: Required<PageHubFeatures>;
  setTheme: (theme: Partial<PageHubTheme>) => void;
  setFeatures: (features: Partial<PageHubFeatures>) => void;
  readOnly: boolean;
  setReadOnly: (readOnly: boolean) => void;
  /**
   * Authoritative save — returns a Promise that resolves with
   * `{ pageId, updatedAt }` or rejects with `SaveConflictError` /
   * `SaveEmptyError` / `SaveFailedError`. Concurrent calls coalesce.
   */
  save: (options?: SaveMeta) => Promise<SaveResult>;
  /** Subscribe to save status (drives the editor's save indicator). */
  subscribeSaveStatus: (handler: (status: SaveStatus) => void) => () => void;
  /** Command registry — register/unregister/execute commands. */
  commands: CommandsRegistry;
  /** Menu registry — contribute commands to named menu locations. */
  menus: MenusRegistry;
  /** Slot registry — host renders arbitrary React inside named slots. */
  slots: SlotsRegistry;
  /** Keybinding registry — register keyboard shortcuts (dispatch in Wave B). */
  keybindings: KeybindingsRegistry;
  /** Context registry — single source of truth for `when` / `enablement` inputs. */
  commandContext: ContextRegistry;
}

const SDKContext = createContext<SDKContextValue | null>(null);

export function useSDK(): SDKContextValue {
  const ctx = useContext(SDKContext);
  if (!ctx) {
    throw new Error(
      "[PageHub] useSDK must be used inside <PageHubProvider>. " +
        "This usually means PageHub.init() was not called correctly."
    );
  }
  return ctx;
}

/** Returns the SDK context or null if no PageHubProvider exists above in the tree. */
export function useSDKSafe(): SDKContextValue | null {
  return useContext(SDKContext);
}

/** Returns true if a PageHubProvider exists above in the tree. */
export function useHasSDKProvider(): boolean {
  return useContext(SDKContext) !== null;
}

export interface PageHubProviderProps {
  config: ResolvedConfig;
  emitter: EventEmitter;
  /**
   * Optional pre-built registries bundle. Pass this when the host has already
   * built one via `createRegistriesBundle()` and called `slots.contribute(...)`
   * to register host chrome (AI panels, custom nav items, etc.). Omit to let
   * the Provider build a default bundle with only the SDK builtins.
   */
  registries?: Omit<import("../registry").RegistriesBundle, "tick">;
  children?: React.ReactNode;
}

export function PageHubProvider({
  config,
  emitter,
  registries: hostRegistries,
  children,
}: PageHubProviderProps) {
  const [theme, setThemeState] = useState<Required<PageHubTheme>>(config.theme);
  const [features, setFeaturesState] = useState<Required<PageHubFeatures>>(config.features);
  const [readOnly, setReadOnly] = useState(config.readOnly ?? false);

  // Registries are created once per provider mount when the host hasn't
  // supplied a pre-built bundle. Builtins are applied immediately so
  // menus/slots resolve correctly on first render.
  const registries = useMemo(() => {
    if (hostRegistries) return hostRegistries;
    const bundle = createRegistriesBundle();
    bundle.context.setCommandContext({ features });
    return bundle;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostRegistries]);

  // Keep features in the command context in sync as the host re-configures.
  React.useEffect(() => {
    registries.context.setCommandContext({ features });
  }, [registries, features]);

  // Mount the keybinding dispatcher exactly once per registries bundle.
  // PageHub.init() also mounts a dispatcher; when the host uses the provider
  // directly (the common path in pages/_app.tsx) we still need keyboard chords
  // to reach commands. If the host pre-built and passed `hostRegistries`, the
  // init() path already mounted — skip remounting.
  React.useEffect(() => {
    if (hostRegistries) return;
    const unmount = mountKeybindingDispatcher({
      commands: registries.commands,
      keybindings: registries.keybindings,
      context: registries.context,
    });
    return () => unmount();
  }, [registries, hostRegistries]);

  const setTheme = (patch: Partial<PageHubTheme>) => {
    setThemeState(prev => ({ ...prev, ...patch }));
  };

  const setFeatures = (patch: Partial<PageHubFeatures>) => {
    setFeaturesState(prev => ({ ...prev, ...patch }));
  };

  React.useEffect(() => {
    // Listen to the public modeChange event triggered by index.ts
    const unsub = emitter.on("modeChange", mode => {
      setReadOnly(mode === "viewer");
    });
    return () => unsub();
  }, [emitter]);

  React.useEffect(() => {
    const unsub = emitter.onInternal("_setFeatures", patch => {
      setFeaturesState(prev => ({ ...prev, ...(patch as Partial<PageHubFeatures>) }));
    });
    return () => unsub();
  }, [emitter]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setPageHubApiBaseUrl(config.apiBaseUrl);
    return () => setPageHubApiBaseUrl("");
  }, [config.apiBaseUrl]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (config.curatedGoogleFontFamilies) {
      setCuratedGoogleFontFamilies(config.curatedGoogleFontFamilies);
    } else {
      resetCuratedGoogleFontFamilies();
    }
    return () => {
      resetCuratedGoogleFontFamilies();
    };
  }, [config.curatedGoogleFontFamilies]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (config.viewportDevicePresets && config.viewportDevicePresets.length > 0) {
      setViewportDevicePresets(config.viewportDevicePresets);
    } else {
      resetViewportDevicePresets();
    }
    return () => {
      resetViewportDevicePresets();
    };
  }, [config.viewportDevicePresets]);

  const save = useCallback((opts?: SaveMeta) => getSaveCoordinator(emitter).save(opts), [emitter]);
  const subscribeSaveStatus = useCallback(
    (handler: (status: SaveStatus) => void) => getSaveCoordinator(emitter).subscribeStatus(handler),
    [emitter]
  );
  const value = useMemo<SDKContextValue>(
    () => ({
      config,
      emitter,
      theme,
      features,
      setTheme,
      setFeatures,
      readOnly,
      setReadOnly,
      save,
      subscribeSaveStatus,
      commands: registries.commands,
      menus: registries.menus,
      slots: registries.slots,
      keybindings: registries.keybindings,
      commandContext: registries.context,
    }),
    [
      config,
      emitter,
      theme,
      features,
      readOnly,
      save,
      subscribeSaveStatus,
      registries,
    ]
  );

  return (
    <SDKContext.Provider value={value}>
      <RegistriesProvider registries={registries}>
        <EditorStoreProvider>{children}</EditorStoreProvider>
        <ReactTooltip
          id={PAGEHUB_RTT_GLOBAL_ID}
          variant="light"
          classNameArrow="hidden"
          className={REACT_TOOLTIP_SURFACE_CLASS}
        />
      </RegistriesProvider>
    </SDKContext.Provider>
  );
}
