// ── Page settings modal — shared types ──────────────────────────────────────

export interface PageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string | null;
  extraTabs?: PageSettingsExtraTab[];
}

export interface PageSettingsDraft {
  /** True when draft was loaded from a remote shard (not in CraftJS tree). */
  _remote: boolean;
  pageName: string;
  isHomePage: boolean;
  is404Page: boolean;
  [key: string]: any; // settings props from PAGE_SETTINGS_FIELDS
}

export interface PageSettingsTabContext {
  pageId: string | null;
  allowCustom404Page: boolean;
  setProp?: (cb: (props: any) => void) => void;
}

/**
 * Public extension API — hosts pass `extraTabs={[...]}` to inject custom tabs
 * (e.g. the PageHub dashboard adds analytics / domain tabs). Keep the shape
 * stable; it's consumed through the `adaptExtraTabs` adapter.
 */
export interface PageSettingsExtraTab {
  key: string;
  label: string;
  order?: number;
  render: (ctx: {
    inputClass: string;
    selectClass: string;
    query: any;
    actions: any;
    pageId: string | null;
    allowCustom404Page: boolean;
    draft?: Record<string, any>;
    setDraft?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    updateField?: (key: string, value: any) => void;
    requestSave?: () => void;
    flushSave?: () => void;
  }) => React.ReactNode;
  onSave?: (ctx: {
    pageId: string | null;
    setProp?: (cb: (props: any) => void) => void;
    draft?: Record<string, any>;
    query: any;
    actions: any;
  }) => void;
}
