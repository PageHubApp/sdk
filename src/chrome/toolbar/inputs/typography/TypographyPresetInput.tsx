/**
 * TypographyPresetInput — host for the Framer-style text-styles picker.
 *
 * Reads typography presets from `ROOT.props.theme.typography` and renders the
 * `TextStylePicker` chip + lazy-loaded popover panels. Owns four data-shape
 * concerns the picker shouldn't have to know about:
 *
 *  - **Apply / clear** — toggles the `ph-{slug}` class on the current node's
 *    className (the same path the inline FontPanel uses).
 *  - **Capture for "New Style"** — reads computed typography from the live
 *    DOM via `readTypographyFromDom(nodeId)` so the editor opens prefilled
 *    with what the node looks like right now.
 *  - **Persist** — writes preset definitions back to `ROOT.props.theme.typography`
 *    via `setProp(ROOT_NODE, ...)` + `writeTheme()`. Renames are handled by
 *    matching on the original name; create / update / delete each map to a
 *    single root mutation.
 *  - **Side effects of rename / delete** — when a preset is renamed, the
 *    current node's className needs the `ph-{old}` class swapped for the
 *    new one; on delete, strip the class entirely.
 */
import { ROOT_NODE } from "@craftjs/utils";
import { useEditor, useNode } from "@craftjs/core";
import { useMemo } from "react";
import { toCSSVarName } from "@/utils/design/designSystemVars";
import { resolveTheme, writeTheme } from "@/utils/design/resolveTheme";
import type { PropertyDef } from "../../unified-settings/registry/propertyDefs";
import { TextStylePicker } from "./TextStylePicker";
import { emptyDraft, presetToDraft, type TextStyleDraft } from "./textStyleDraft";
import { type TypographyPresetRow } from "./TypographyPresetSelect";

function presetClass(name: string): string {
  const slug = toCSSVarName(name);
  return slug ? `ph-${slug}` : "";
}

interface Props {
  def?: PropertyDef;
}

function stripQuotes(v: string): string {
  return v
    .split(",")[0]
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

/**
 * Reads effective typography from the selected node's DOM element.
 * Falls back to sane defaults for any property we can't resolve.
 */
function readTypographyFromDom(nodeId: string): Partial<TextStyleDraft> | null {
  const el = document.querySelector(`[node-id="${nodeId}"]`) as HTMLElement | null;
  if (!el) return null;
  const cs = window.getComputedStyle(el);
  return {
    fontFamily: stripQuotes(cs.fontFamily || "Inter"),
    fontSize: cs.fontSize || "1rem",
    fontWeight: cs.fontWeight || "400",
    lineHeight: cs.lineHeight === "normal" ? "1.5" : cs.lineHeight || "1.5",
    letterSpacing: cs.letterSpacing === "normal" ? "normal" : cs.letterSpacing,
    textTransform: cs.textTransform === "none" ? "none" : cs.textTransform,
    color: cs.color || "",
    textDecoration:
      cs.textDecorationLine && cs.textDecorationLine !== "none" ? cs.textDecorationLine : "none",
    textAlign: cs.textAlign || "left",
  };
}

/** Strip every known preset class from a className string. */
function stripPresetClasses(className: string, knownPresetClasses: Set<string>): string {
  return className
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => !knownPresetClasses.has(t))
    .join(" ");
}

export function TypographyPresetInput({ def }: Props = {}) {
  const {
    actions: editorActions,
    presets,
    presetsRaw,
  } = useEditor(state => {
    const root = state.nodes[ROOT_NODE];
    const theme = resolveTheme(root?.data?.props || {});
    const list = (theme.typography || []) as any[];
    const presetsList: TypographyPresetRow[] = list
      .filter(p => p && typeof p.name === "string" && p.name.length > 0)
      .map(p => ({
        name: p.name,
        fontFamily: p.fontFamily || "inherit",
        fontSize: p.fontSize || "1rem",
        fontWeight: p.fontWeight || "400",
        lineHeight: p.lineHeight || "1.5",
        letterSpacing: p.letterSpacing,
        textTransform: p.textTransform,
      }));
    return { presets: presetsList, presetsRaw: list };
  });

  const {
    actions: { setProp },
    classNameStr,
    nodeId,
  } = useNode(node => ({
    classNameStr: typeof node.data?.props?.className === "string" ? node.data.props.className : "",
    nodeId: node.id,
  }));

  const presetClassSet = useMemo(
    () => new Set(presets.map(p => presetClass(p.name)).filter(Boolean)),
    [presets]
  );

  const selectedName = useMemo(() => {
    if (!classNameStr || presetClassSet.size === 0) return null;
    const tokens = classNameStr.split(/\s+/).filter(Boolean);
    const hit = tokens.find(t => presetClassSet.has(t));
    if (!hit) return null;
    const preset = presets.find(p => presetClass(p.name) === hit);
    return preset?.name ?? null;
  }, [classNameStr, presets, presetClassSet]);

  /** Toggle the `ph-{name}` class on the current node. Pass `null` to clear. */
  const applyPresetToNode = (name: string | null, knownClassesOverride?: Set<string>) => {
    const known = knownClassesOverride ?? presetClassSet;
    setProp((p: any) => {
      const cleaned = stripPresetClasses(typeof p.className === "string" ? p.className : "", known);
      const cls = name ? presetClass(name) : "";
      p.className = cls ? (cleaned ? `${cleaned} ${cls}` : cls) : cleaned;
    });
  };

  const onSelect = (preset: TypographyPresetRow | null) => {
    applyPresetToNode(preset?.name ?? null);
    if (preset?.fontFamily) {
      import("@/utils/fonts/googleFonts").then(({ loadGoogleFont }) => {
        loadGoogleFont(preset.fontFamily, [preset.fontWeight || "400"]);
      });
    }
  };

  const buildNewDraft = (): TextStyleDraft => {
    const captured = readTypographyFromDom(nodeId);
    const draft = { ...emptyDraft(), ...(captured || {}) };
    // Suggest a unique name so the user can hit Save without typing first.
    let suggested = `Style ${presets.length + 1}`;
    const existing = new Set(presets.map(p => p.name.toLowerCase()));
    let i = presets.length + 1;
    while (existing.has(suggested.toLowerCase())) {
      i += 1;
      suggested = `Style ${i}`;
    }
    draft.name = suggested;
    return draft;
  };

  const buildEditDraft = (preset: TypographyPresetRow): TextStyleDraft => {
    // Pull the raw preset (may carry color / textDecoration / textAlign that
    // `TypographyPresetRow` doesn't surface) so the editor can round-trip them.
    const raw =
      presetsRaw.find(p => p && typeof p.name === "string" && p.name === preset.name) ?? preset;
    return presetToDraft({ ...preset, ...raw });
  };

  /** Persist a draft into ROOT.props.theme.typography. Pass `originalName=null` for create. */
  const persistDraft = (originalName: string | null, draft: TextStyleDraft) => {
    const cleaned: Record<string, any> = {
      name: draft.name,
      fontFamily: draft.fontFamily || "Inter",
      fontSize: draft.fontSize || "1rem",
      fontWeight: draft.fontWeight || "400",
      lineHeight: draft.lineHeight || "1.5",
      letterSpacing: draft.letterSpacing || "normal",
      textTransform: draft.textTransform || "none",
    };
    if (draft.color) cleaned.color = draft.color;
    if (draft.textDecoration && draft.textDecoration !== "none") {
      cleaned.textDecoration = draft.textDecoration;
    }
    if (draft.textAlign && draft.textAlign !== "left") cleaned.textAlign = draft.textAlign;

    editorActions.setProp(ROOT_NODE, (rootProps: Record<string, any>) => {
      const current = resolveTheme(rootProps);
      const list = ([...(current.typography || [])] as any[]).filter(
        p => p && typeof p.name === "string" && p.name.length > 0
      );
      if (originalName == null) {
        list.push(cleaned);
      } else {
        const idx = list.findIndex(p => p.name === originalName);
        if (idx === -1) list.push(cleaned);
        else list[idx] = { ...list[idx], ...cleaned };
      }
      writeTheme(rootProps, { ...current, typography: list as any });
    });
  };

  const onCreate = (draft: TextStyleDraft) => {
    persistDraft(null, draft);
    // Apply newly created preset to the current node (the "save acts as
    // assign" affordance from the previous flow).
    const newClass = presetClass(draft.name);
    if (!newClass) return;
    setProp((p: any) => {
      const cleaned = stripPresetClasses(
        typeof p.className === "string" ? p.className : "",
        presetClassSet
      );
      const tokens = cleaned ? `${cleaned} ${newClass}` : newClass;
      p.className = tokens;
    });
  };

  const onUpdate = (originalName: string, draft: TextStyleDraft) => {
    persistDraft(originalName, draft);
    if (originalName === draft.name) return;
    // Renamed — swap the class on the current node IF this node was using the
    // old preset. Other nodes referencing the old class fall through to the
    // catch-all base styles until re-applied (acceptable; matches Framer
    // behavior — renames don't auto-rewrite content).
    const oldClass = presetClass(originalName);
    const newClass = presetClass(draft.name);
    setProp((p: any) => {
      const tokens = (typeof p.className === "string" ? p.className : "")
        .split(/\s+/)
        .filter(Boolean);
      const next = tokens.map((t: string) => (t === oldClass ? newClass : t));
      p.className = next.join(" ");
    });
  };

  const onDelete = (presetName: string) => {
    editorActions.setProp(ROOT_NODE, (rootProps: Record<string, any>) => {
      const current = resolveTheme(rootProps);
      const list = ([...(current.typography || [])] as any[]).filter(
        p => p && typeof p.name === "string" && p.name !== presetName
      );
      writeTheme(rootProps, { ...current, typography: list as any });
    });
    // Strip the class from the current node so the row no longer reads as
    // "selected" — and the className isn't left referencing a phantom preset.
    const removed = presetClass(presetName);
    if (!removed) return;
    setProp((p: any) => {
      const tokens = (typeof p.className === "string" ? p.className : "")
        .split(/\s+/)
        .filter(Boolean)
        .filter((t: string) => t !== removed);
      p.className = tokens.join(" ");
    });
  };

  const label = def?.label;

  return (
    <div className="flex w-full flex-col">
      <div className="relative flex w-full items-center gap-0.5">
        {label ? (
          <div className="flex w-20 shrink-0 flex-col items-start gap-0.5">
            <label
              htmlFor="typography-preset"
              className="w-full cursor-pointer truncate text-xs whitespace-nowrap"
            >
              {label}
            </label>
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <TextStylePicker
            presets={presets}
            selectedName={selectedName}
            onSelect={onSelect}
            buildNewDraft={buildNewDraft}
            buildEditDraft={buildEditDraft}
            onCreate={onCreate}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}
