import { type SettingsTabDefinition, type SettingsTabRenderContext } from "./types";

interface TabEntry<TDraft, TContext> {
  tab: SettingsTabDefinition<TDraft, TContext>;
  source: "built-in" | "injected";
  index: number;
}

function warnDuplicateKey(key: string) {
  if (process.env.NODE_ENV === "production") return;
  console.warn(`[PageHub] Ignoring settings tab "${key}" because that key is already registered.`);
}

export function mergeSettingsTabs<TDraft, TContext>(
  builtInTabs: Array<SettingsTabDefinition<TDraft, TContext>>,
  injectedTabs: Array<SettingsTabDefinition<TDraft, TContext>> = []
): Array<SettingsTabDefinition<TDraft, TContext>> {
  const seen = new Set<string>();
  const merged: Array<TabEntry<TDraft, TContext>> = [];

  const append = (
    tabs: Array<SettingsTabDefinition<TDraft, TContext>>,
    source: "built-in" | "injected"
  ) => {
    for (const tab of tabs) {
      const key = tab?.key?.trim();
      if (!key) continue;
      if (seen.has(key)) {
        if (source === "injected") warnDuplicateKey(key);
        continue;
      }
      seen.add(key);
      merged.push({ tab, source, index: merged.length });
    }
  };

  append(builtInTabs, "built-in");
  append(injectedTabs, "injected");

  return merged
    .sort((a, b) => {
      const ao = Number.isFinite(a.tab.order) ? (a.tab.order as number) : 1000;
      const bo = Number.isFinite(b.tab.order) ? (b.tab.order as number) : 1000;
      if (ao !== bo) return ao - bo;
      return a.index - b.index;
    })
    .map(entry => entry.tab);
}

export function visibleSettingsTabs<TDraft, TContext>(
  tabs: Array<SettingsTabDefinition<TDraft, TContext>>,
  ctx: SettingsTabRenderContext<TDraft, TContext>
): Array<SettingsTabDefinition<TDraft, TContext>> {
  return tabs.filter(tab => (tab.isVisible ? tab.isVisible(ctx) : true));
}

