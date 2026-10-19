/**
 * `features.chrome` — the default column must stay what `/build` renders
 * today (the strings below are the ones the components carried before the
 * option existed), and the dashboard column must differ without any of the
 * old hard-coded palette.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { CHROME_CLASSES, resolveChromeStyle } from "./useChromeStyle";

const def = CHROME_CLASSES.default;
const dash = CHROME_CLASSES.dashboard;

test("resolveChromeStyle: only \"dashboard\" leaves the default", () => {
  assert.equal(resolveChromeStyle(undefined), "default");
  assert.equal(resolveChromeStyle("default"), "default");
  assert.equal(resolveChromeStyle("other"), "default");
  assert.equal(resolveChromeStyle("dashboard"), "dashboard");
});

test("default: the /build class strings, byte for byte", () => {
  assert.equal(def.layerRowSelected, "bg-blue-600 text-white dark:bg-blue-500");
  assert.equal(
    def.layerRowIdle,
    "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/70"
  );
  assert.equal(def.layerRowHovered, "bg-gray-100 dark:bg-gray-800/70");
  assert.equal(def.layerDropInside, "ring-1 ring-blue-500 ring-inset");
  assert.equal(def.layerDropLine, "relative h-0.5 w-full bg-blue-500");
  assert.equal(def.layerSelectedIcon, "text-white");
  assert.equal(
    def.inspectorTabRow,
    "border-base-300/60 bg-base-100 text-base-content relative flex h-10 w-full min-w-0 shrink-0 items-center gap-2 border-b px-3 py-0 text-center font-semibold"
  );
  assert.equal(
    def.inspectorTabList,
    "relative flex min-w-48 shrink-0 flex-row-reverse items-center gap-2 pr-3"
  );
  assert.equal(def.inspectorTabIndicator, "bg-primary absolute bottom-0 h-0.5 rounded-full");
  assert.equal(def.showDarkVariantToggle, true);
  assert.equal(def.dashedButton, "ph-toolbar-dashed-btn");
  assert.equal(def.sidebarTabStrip, "flex min-w-0");
  assert.equal(def.sidebarTabPills, null);
  assert.equal(def.sidebarTabActive, "bg-sidebar-accent text-sidebar-accent-foreground");
  assert.equal(
    def.floatingPanelHeader,
    "text-base-content flex touch-none items-center justify-between px-3 py-1.5"
  );
  assert.equal(
    def.floatingPanelClose,
    "text-accent-content hover:bg-accent-content/10 rounded p-0.5 transition-colors"
  );
  assert.equal(def.menuPanelFrame, "overflow-hidden rounded-xl border p-1 shadow-xl");
  assert.equal(def.selectContent, "pagehub-sdk-root ph-select-content");
  assert.equal(def.searchSlim, null);
});

test("dashboard: every class choice differs from the default", () => {
  for (const key of Object.keys(def) as Array<keyof typeof def>) {
    if (key === "style") continue;
    assert.notDeepEqual(dash[key], def[key], `${key} should change under the dashboard chrome`);
  }
});

test("dashboard: no blue, no gray scale, no dashed button", () => {
  const strings = Object.values(dash)
    .flatMap(v => (v && typeof v === "object" ? Object.values(v) : [v]))
    .filter((v): v is string => typeof v === "string");
  for (const s of strings) {
    assert.doesNotMatch(s, /\b(bg|text|ring|border)-(blue|gray)-/, s);
    assert.doesNotMatch(s, /ph-toolbar-dashed-btn|border-dashed/, s);
  }
  assert.equal(dash.layerRowSelected, "bg-base-content text-base-100");
  assert.equal(dash.showDarkVariantToggle, false);
  assert.match(dash.sidebarTabStrip, /\bpx-3\b/);
  assert.match(dash.sidebarTabBase, /\bh-8\b/);
  assert.match(dash.searchSlim?.input ?? "", /\bh-8\b.*\brounded-lg\b|\brounded-lg\b.*\bh-8\b/);
});
