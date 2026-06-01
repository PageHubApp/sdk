// ── Draft helpers (derived from PAGE_SETTINGS_FIELDS) ─────────────────────────
//
// Pure transport functions — no React. Map between the page-settings draft and
// the CraftJS props / remote `PageSettingsPayload` shapes.

import type { PageSettingsPayload } from "../../../../types";
import { pageSettingsDefaults, readSettingsProps, writeSettingsProps } from "./fields";
import type { PageSettingsDraft } from "./types";

export function createEmptyPageDraft(): PageSettingsDraft {
  return {
    _remote: false,
    pageName: "",
    isHomePage: false,
    is404Page: false,
    ...pageSettingsDefaults(),
  };
}

export function createDraftFromProps(
  displayName: string,
  isHomePage: boolean,
  is404Page: boolean,
  source: Record<string, any>,
  allowCustom404Page: boolean,
  remote: boolean
): PageSettingsDraft {
  return {
    _remote: remote,
    pageName: displayName || "Untitled Page",
    isHomePage: !!isHomePage,
    is404Page: allowCustom404Page ? !!is404Page : false,
    ...readSettingsProps(source),
  };
}

export function draftToPayload(
  snapshot: PageSettingsDraft,
  allowCustom404Page: boolean
): PageSettingsPayload {
  const props: Record<string, any> = {};
  writeSettingsProps(props, snapshot);
  return {
    displayName: snapshot.pageName,
    isHomePage: snapshot.isHomePage,
    is404Page: allowCustom404Page && snapshot.is404Page,
    props,
  };
}

export function getDraftSignature(draft: PageSettingsDraft): string {
  // Exclude _remote from signature — it's metadata, not user-editable data.
  const { _remote: _, ...data } = draft;
  return JSON.stringify(data);
}
