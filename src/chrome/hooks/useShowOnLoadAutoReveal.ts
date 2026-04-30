/**
 * Editor-only auto-reveal + state-seed for load-trigger actions.
 *
 * Cookie banners / popups bake `hidden` into their className so visitors
 * never see a flash on already-dismissed visits — the runtime fires a
 * `show-hide` action with `trigger: "load"` (gated by an optional
 * `gateLocalStorageKey`) on mount. In the editor that runtime path is
 * skipped (Container's mount effect early-returns when `enabled === true`),
 * which would leave the banner invisible to the author. Bad UX.
 *
 * Same problem now applies to `set-state` / `toggle-state` / `clear-state`
 * load triggers used to seed registry selection state for tab buttons,
 * drawer-open flags, etc. Without this hook, dropping a Tabs preset in the
 * editor renders all panels visible (correct) but no tab button stamps
 * "active" (wrong — the bound stateModifier never fires because state is
 * empty). This hook seeds them at edit time.
 *
 * Mounted once at viewport level. The selector return string changes only
 * when the set of matching actions changes, so the effect re-runs rarely.
 */
import { useEditor } from "@craftjs/core";
import { useEffect } from "react";
import { setShowHideState } from "@/utils/showHideStore";
import { setState as setRegistryState, deleteState } from "@/utils/stateRegistry";
import { migrateActions } from "@/utils/action";
import type { ShowHideAction } from "@/utils/action";

interface SeedShowEntry {
  kind: "show-hide";
  target: string;
}
interface SeedStateEntry {
  kind: "set-state";
  key: string;
  stateKind: string;
  value: string;
}
interface SeedToggleEntry {
  kind: "toggle-state";
  key: string;
  stateKind: string;
  values: [string, string];
}
interface SeedClearEntry {
  kind: "clear-state";
  key: string;
}
type SeedEntry = SeedShowEntry | SeedStateEntry | SeedToggleEntry | SeedClearEntry;

function isLoadShow(action: any): action is ShowHideAction {
  return (
    !!action &&
    action.type === "show-hide" &&
    action.trigger === "load" &&
    action.direction === "show" &&
    typeof action.target === "string" &&
    !!action.target
  );
}

function collectSeeds(props: any, out: SeedEntry[]): void {
  if (!props) return;
  for (const a of migrateActions(props)) {
    if (isLoadShow(a)) {
      out.push({ kind: "show-hide", target: a.target });
      continue;
    }
    if ((a as any).trigger !== "load") continue;
    if (a.type === "set-state" && (a as any).key) {
      out.push({
        kind: "set-state",
        key: (a as any).key,
        stateKind: (a as any).kind ?? "value",
        value: (a as any).value ?? "",
      });
      continue;
    }
    if (a.type === "toggle-state" && (a as any).key) {
      const k = (a as any).kind ?? "flag";
      const pair = (a as any).values ?? (k === "visibility" ? ["shown", "hidden"] : ["on", "off"]);
      out.push({
        kind: "toggle-state",
        key: (a as any).key,
        stateKind: k,
        values: pair,
      });
      continue;
    }
    if (a.type === "clear-state" && (a as any).key) {
      out.push({ kind: "clear-state", key: (a as any).key });
    }
  }
}

function seedKey(s: SeedEntry): string {
  if (s.kind === "show-hide") return `show:${s.target}`;
  if (s.kind === "set-state") return `set:${s.key}=${s.value}|${s.stateKind}`;
  if (s.kind === "toggle-state") return `toggle:${s.key}|${s.stateKind}|${s.values.join(",")}`;
  return `clear:${s.key}`;
}

export function useShowOnLoadAutoReveal() {
  // Returns a stable joined key so the effect dep stays string-stable when
  // the matching seed set hasn't changed.
  const { seeds } = useEditor(state => {
    const out: SeedEntry[] = [];
    for (const node of Object.values(state.nodes) as any[]) {
      collectSeeds(node?.data?.props, out);
    }
    return { seeds: out.map(seedKey).sort().join("\n") };
  });

  useEffect(() => {
    if (!seeds) return;
    for (const line of (seeds as string).split("\n")) {
      if (!line) continue;
      const colon = line.indexOf(":");
      const kind = line.slice(0, colon);
      const rest = line.slice(colon + 1);
      if (kind === "show") {
        setShowHideState(rest, "shown");
      } else if (kind === "set") {
        // rest = "<key>=<value>|<stateKind>"
        const pipe = rest.lastIndexOf("|");
        const left = pipe >= 0 ? rest.slice(0, pipe) : rest;
        const stateKind = (pipe >= 0 ? rest.slice(pipe + 1) : "value") as any;
        const eq = left.indexOf("=");
        const key = eq >= 0 ? left.slice(0, eq) : left;
        const value = eq >= 0 ? left.slice(eq + 1) : "";
        if (key) {
          setRegistryState(
            key,
            { kind: stateKind, value, source: "editor-preview" },
            "editor-preview"
          );
        }
      } else if (kind === "toggle") {
        // rest = "<key>|<stateKind>|<a>,<b>" — seed to first value (the "on" state)
        const parts = rest.split("|");
        const key = parts[0];
        const stateKind = (parts[1] || "flag") as any;
        const pair = (parts[2] || "").split(",");
        if (key && pair[0] !== undefined) {
          setRegistryState(
            key,
            { kind: stateKind, value: pair[0], source: "editor-preview" },
            "editor-preview"
          );
        }
      } else if (kind === "clear") {
        deleteState(rest);
      }
    }
  }, [seeds]);
}
