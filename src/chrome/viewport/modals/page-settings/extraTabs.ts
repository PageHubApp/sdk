// ── Extra tabs adapter ────────────────────────────────────────────────────────

import { type SettingsTabDefinition } from "../settings/types";
import type { PageSettingsDraft, PageSettingsExtraTab, PageSettingsTabContext } from "./types";

/** Adapt the public `PageSettingsExtraTab` host-config shape to the internal
 *  `SettingsTabDefinition` consumed by SettingsTabHost. */
export function adaptExtraTabs(
  extraTabs: PageSettingsExtraTab[]
): Array<SettingsTabDefinition<PageSettingsDraft, PageSettingsTabContext>> {
  return extraTabs.map(tab => ({
    key: tab.key,
    label: tab.label,
    order: Number.isFinite(tab.order) ? tab.order : 350,
    render: ctx =>
      tab.render({
        inputClass: ctx.inputClass,
        selectClass: ctx.selectClass,
        query: ctx.query,
        actions: ctx.actions,
        pageId: ctx.pageId,
        allowCustom404Page: ctx.allowCustom404Page,
        draft: ctx.draft as Record<string, any>,
        setDraft: ctx.setDraft as React.Dispatch<React.SetStateAction<Record<string, any>>>,
        updateField: (key, value) => ctx.updateField(key as keyof PageSettingsDraft, value as any),
        requestSave: ctx.requestSave,
        flushSave: ctx.flushSave,
      }),
    onSave: ctx =>
      tab.onSave?.({
        pageId: ctx.pageId,
        setProp: ctx.setProp,
        draft: ctx.draft as Record<string, any>,
        query: ctx.query,
        actions: ctx.actions,
      }),
  }));
}
