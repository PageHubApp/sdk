/**
 * TypographyPresetInput — wires `TypographyPresetSelect` into the
 * settings panel. Reads typography presets from `ROOT.props.theme`
 * and applies / clears the `ph-{name}` class on the selected node.
 *
 * No presets defined → renders nothing (the section's other fields
 * still work). Matches the inline FontPanel preset-apply logic so a
 * preset picked here looks identical to one applied via the inline
 * text toolbar.
 */
import { ROOT_NODE } from "@craftjs/utils";
import { useEditor, useNode } from "@craftjs/core";
import { useMemo } from "react";
import { TbDeviceFloppy } from "react-icons/tb";
import { toCSSVarName } from "@/utils/design/designSystemVars";
import { resolveTheme, writeTheme } from "@/utils/design/resolveTheme";
import type { PropertyDef } from "../../unified-settings/registry/propertyDefs";
import {
  TypographyPresetSelect,
  type TypographyPresetRow,
} from "./TypographyPresetSelect";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../primitives/layout/tooltipSurface";

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
function readTypographyFromDom(nodeId: string): Omit<TypographyPresetRow, "name"> | null {
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
  };
}

export function TypographyPresetInput({ def }: Props = {}) {
  const { actions: editorActions, presets } = useEditor(state => {
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
    return { presets: presetsList };
  });

  const {
    actions: { setProp },
    classNameStr,
    nodeId,
  } = useNode(node => ({
    classNameStr:
      typeof node.data?.props?.className === "string" ? node.data.props.className : "",
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

  const onSelect = (preset: TypographyPresetRow | null) => {
    setProp((p: any) => {
      const tokens = (typeof p.className === "string" ? p.className : "")
        .split(/\s+/)
        .filter(Boolean);
      const cleaned = tokens.filter((t: string) => !presetClassSet.has(t));
      if (preset) {
        const cls = presetClass(preset.name);
        if (cls) cleaned.push(cls);
      }
      p.className = cleaned.join(" ");
    });

    if (preset?.fontFamily) {
      import("@/utils/fonts/googleFonts").then(({ loadGoogleFont }) => {
        loadGoogleFont(preset.fontFamily, [preset.fontWeight || "400"]);
      });
    }
  };

  const saveAsPreset = () => {
    const suggested = `Preset ${presets.length + 1}`;
    const raw = window.prompt("Name this preset", suggested);
    const name = (raw || "").trim();
    if (!name) return;
    if (presets.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      window.alert(`A preset named "${name}" already exists.`);
      return;
    }
    const styles = readTypographyFromDom(nodeId) || {
      fontFamily: "Inter",
      fontSize: "1rem",
      fontWeight: "400",
      lineHeight: "1.5",
      letterSpacing: "normal",
      textTransform: "none",
    };

    editorActions.setProp(ROOT_NODE, (rootProps: Record<string, any>) => {
      const current = resolveTheme(rootProps);
      const nextTypography = [
        ...(current.typography || []),
        { name, ...styles },
      ];
      writeTheme(rootProps, {
        ...current,
        typography: nextTypography as any,
      });
    });

    // Apply the new preset class to the current node so the save acts as an "assign"
    const cls = presetClass(name);
    if (cls) {
      setProp((p: any) => {
        const tokens = (typeof p.className === "string" ? p.className : "")
          .split(/\s+/)
          .filter(Boolean);
        const cleaned = tokens.filter((t: string) => !presetClassSet.has(t) && t !== cls);
        cleaned.push(cls);
        p.className = cleaned.join(" ");
      });
    }
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
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <div className="min-w-0 flex-1">
            <TypographyPresetSelect
              presets={presets}
              selectedName={selectedName}
              onSelect={onSelect}
            />
          </div>
          <button
            type="button"
            onClick={saveAsPreset}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Save current typography as a preset"
            aria-label="Save as preset"
            className="border-base-300 bg-base-200 text-base-content hover:border-primary hover:bg-base-300/25 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors active:scale-95 [&_svg]:size-4"
          >
            <TbDeviceFloppy />
          </button>
        </div>
      </div>
    </div>
  );
}
