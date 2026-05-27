/**
 * Compatibility shim — translates host-supplied
 * `config.editorChromeSlots.render*` fields into slot registry
 * contributions.
 *
 * Wave A goal: zero host breakage. Hosts continue to use the existing
 * `PageHubEditorChromeSlots` shape; under the hood every render fn becomes
 * a contribution against the corresponding slot id.
 */
import type { PageHubEditorChromeSlots } from "../types";
import type { SlotsRegistry } from "./slots";

/**
 * Mapping between `editorChromeSlots` field name and slot id.
 * (`settingsAiButton` and `pageSettingsExtraTabs` are special-cased below
 * because their shapes don't match the simple `(ctx) => ReactNode` form.)
 */
const FIELD_TO_SLOT: Record<string, string> = {
  renderToolboxAiButton: "toolbox/ai-button",
  renderInlineCopyAssistantTrigger: "tiptap/inline-copy-assistant",
  renderDataSourceSection: "node/data-source-section",
  renderNodeAiGenerateButton: "node/ai-generate-button",
  renderNodeAiContextButton: "node/ai-context-button",
  renderNodeAiContextEditor: "node/ai-context-editor",
  renderEmptyStateAiCard: "empty-state/ai-card",
  renderNavAiMenuItem: "navmenu/ai-row",
  renderNavHeaderItems: "navmenu/header-items",
  renderImportExportHandoffExtras: "import-export/handoff-extras",
  renderMediaEditAiActions: "media-edit/ai-actions",
};

/**
 * Walks `slotsField` and `contribute()`s each one to the right slot id.
 * Safe to call multiple times — duplicate contributions accumulate (caller
 * should `remove()` first if re-applying).
 */
export function applyEditorChromeSlotsShim(
  slotsField: PageHubEditorChromeSlots | undefined,
  slots: SlotsRegistry
): void {
  if (!slotsField || typeof slotsField !== "object") return;

  for (const [field, slotId] of Object.entries(FIELD_TO_SLOT)) {
    const fn = (slotsField as Record<string, unknown>)[field];
    if (typeof fn !== "function") continue;
    slots.contribute({
      slot: slotId,
      render: (ctx: unknown) => (fn as (ctx?: unknown) => unknown)(ctx) as ReturnType<
        (typeof fn) extends (...args: any[]) => infer R ? () => R : never
      >,
      // Mark these as shim-sourced so future host-side migration can
      // selectively remove them.
      key: `editorChromeSlots:${field}`,
    });
  }

  // Special case: `settingsAiButton` is a ReactNode, not a function. Wrap.
  if (slotsField.settingsAiButton != null) {
    const node = slotsField.settingsAiButton;
    slots.contribute({
      slot: "settings/ai-button",
      render: () => node,
      key: "editorChromeSlots:settingsAiButton",
    });
  }

  // Special case: `pageSettingsExtraTabs` is an array of tab objects.
  // Each becomes a list contribution. We forward the entire tab object as
  // the render result so consumers downstream can keep using the existing
  // {key,label,order,render,onSave} shape — the slot only owns placement.
  const tabs = slotsField.pageSettingsExtraTabs;
  if (Array.isArray(tabs)) {
    tabs.forEach((tab, idx) => {
      if (!tab || typeof tab !== "object") return;
      const order = typeof tab.order === "number" ? tab.order : idx;
      slots.contribute({
        slot: "page-settings/extra-tabs",
        // Render fn returns the tab descriptor itself; surface code in
        // Phase 2 will pull it out (a ReactNode of the actual tab UI is
        // produced by `tab.render(ctx)` at the call site).
        render: () => tab as unknown as React.ReactNode,
        group: `tabs@${order}`,
        key: `editorChromeSlots:pageSettingsExtraTabs:${tab.key ?? idx}`,
      });
    });
  }
}

export { FIELD_TO_SLOT };
