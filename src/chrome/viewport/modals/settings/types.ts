import type { Dispatch, ReactNode, SetStateAction } from "react";

export type SettingsTabRenderContext<TDraft, TContext = Record<string, never>> = TContext & {
  inputClass: string;
  selectClass: string;
  query: any;
  actions: any;
  draft: TDraft;
  setDraft: Dispatch<SetStateAction<TDraft>>;
  updateField: <K extends keyof TDraft>(key: K, value: SetStateAction<TDraft[K]>) => void;
  requestSave: () => void;
  flushSave: () => void;
};

export type SettingsTabSaveContext<TDraft, TContext = Record<string, never>> = TContext & {
  query: any;
  actions: any;
  draft: TDraft;
};

export interface SettingsTabDefinition<TDraft, TContext = Record<string, never>> {
  key: string;
  label: string;
  render: (ctx: SettingsTabRenderContext<TDraft, TContext>) => ReactNode;
  icon?: ReactNode;
  order?: number;
  isVisible?: (ctx: SettingsTabRenderContext<TDraft, TContext>) => boolean;
  onSave?: (ctx: SettingsTabSaveContext<TDraft, TContext>) => void;
}
