/**
 * @pagehub/sdk — Internal state store
 *
 * Replaces Recoil atoms from the main app with a lightweight React context.
 * Every selector component reads `view` and `preview` from this store
 * instead of from Recoil.
 *
 * Maps from main app:
 *   ViewAtom     → store.view       (canvas + edit scope: mobile, desktop, tablet, sm–2xl)
 *   PreviewAtom  → store.preview    (boolean)
 *   IsolateAtom  → store.isolate    (string — isolated page ID)
 *   EnabledAtom  → handled by CraftJS Editor.enabled
 */

import React, { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";
import { EDITOR_ALL_PAGES_STORAGE } from "../utils/pageManagement";

export type ViewMode = "mobile" | "desktop" | "tablet" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface EditorStoreValue {
  /** Current responsive viewport */
  view: ViewMode;
  setView: (view: ViewMode) => void;

  /** Preview mode (hides editor chrome) */
  preview: boolean;
  setPreview: (preview: boolean) => void;

  /** Isolated page ID (if a specific page is focused) */
  isolate: string;
  setIsolate: (id: string) => void;

  /** Current page settings from onLoad */
  settings: Record<string, any>;
  setSettings: (settings: Record<string, any>) => void;
}

const EditorStoreContext = createContext<EditorStoreValue | null>(null);

/**
 * Hook to access the SDK editor store.
 * Drop-in replacement for `useRecoilValue(ViewAtom)` etc.
 */
export function useEditorStore(): EditorStoreValue {
  const ctx = useContext(EditorStoreContext);
  if (!ctx) {
    throw new Error("[PageHub] useEditorStore must be used inside <EditorStoreProvider>");
  }
  return ctx;
}

/**
 * Convenience hooks that mirror the Recoil atom interface.
 * These allow us to do a simple find-and-replace in extracted components:
 *
 *   BEFORE: const view = useRecoilValue(ViewAtom);
 *   AFTER:  const view = useView();
 */
export function useView(): ViewMode {
  return useEditorStore().view;
}

export function usePreview(): boolean {
  return useEditorStore().preview;
}

export function useIsolate(): string {
  return useEditorStore().isolate;
}

interface EditorStoreProviderProps {
  children?: React.ReactNode;
  initialView?: ViewMode;
  initialPreview?: boolean;
}

export function EditorStoreProvider({
  children,
  initialView = "desktop",
  initialPreview = false,
}: EditorStoreProviderProps) {
  const [view, setView] = useState<ViewMode>(initialView);
  const [preview, setPreview] = useState(initialPreview);
  const [isolate, setIsolate] = useState(EDITOR_ALL_PAGES_STORAGE);
  const [settings, setSettings] = useState<Record<string, any>>({});

  // Props like blocks library `initialView={view}` must flow into state; useState only uses the prop on first mount.
  useLayoutEffect(() => {
    setView(initialView);
  }, [initialView]);

  useLayoutEffect(() => {
    setPreview(initialPreview);
  }, [initialPreview]);

  const value = useMemo<EditorStoreValue>(
    () => ({
      view,
      setView,
      preview,
      setPreview,
      isolate,
      setIsolate,
      settings,
      setSettings,
    }),
    [view, preview, isolate, settings]
  );

  return <EditorStoreContext.Provider value={value}>{children}</EditorStoreContext.Provider>;
}
