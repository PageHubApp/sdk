/**
 * @pagehub/sdk — React context for SDK configuration
 *
 * Internal context that makes the resolved config available to all
 * SDK components without prop drilling.
 */

import React, { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";
import type { ResolvedConfig } from "../config";
import { EventEmitter } from "./events";
import { setPageHubApiBaseUrl } from "./apiConfig";
import { EditorStoreProvider } from "./store";
import type { PageHubFeatures, PageHubTheme } from "../types";
import { Tooltip as ReactTooltip } from "react-tooltip";
import {
  PAGEHUB_RTT_GLOBAL_ID,
  REACT_TOOLTIP_SURFACE_CLASS,
} from "../chrome/primitives/layout/tooltipSurface";

interface SDKContextValue {
  config: ResolvedConfig;
  emitter: EventEmitter;
  theme: Required<PageHubTheme>;
  features: Required<PageHubFeatures>;
  setTheme: (theme: Partial<PageHubTheme>) => void;
  setFeatures: (features: Partial<PageHubFeatures>) => void;
  readOnly: boolean;
  setReadOnly: (readOnly: boolean) => void;
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
  children?: React.ReactNode;
}

export function PageHubProvider({ config, emitter, children }: PageHubProviderProps) {
  const [theme, setThemeState] = useState<Required<PageHubTheme>>(config.theme);
  const [features, setFeaturesState] = useState<Required<PageHubFeatures>>(config.features);
  const [readOnly, setReadOnly] = useState(config.readOnly ?? false);

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
    }),
    [config, emitter, theme, features, readOnly]
  );

  return (
    <SDKContext.Provider value={value}>
      <EditorStoreProvider>{children}</EditorStoreProvider>
      <ReactTooltip
        id={PAGEHUB_RTT_GLOBAL_ID}
        variant="light"
        classNameArrow="hidden"
        className={REACT_TOOLTIP_SURFACE_CLASS}
      />
    </SDKContext.Provider>
  );
}
