import { DEFAULT_BREAKPOINTS, DENSITY_STEPS } from "@/utils/defaults";
import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useAtomState, useAtomValue } from "@zedux/react";
import { useState } from "react";
import { TbBraces, TbExternalLink } from "react-icons/tb";
import { ToolbarSection } from "../../../toolbar/ToolbarSection";
import { useDesignVars } from "../../../toolbar/inputs/universal-input/hooks/useDesignVars";
import { VarPicker } from "../../../toolbar/inputs/universal-input/VarPicker";
import type { UseDesignSystemReturn } from "../hooks/useDesignSystem";
import {
  AppliedBreakpointsAtom,
  type AppliedBreakpointsShape,
  IndicatorDensityAtom,
  type IndicatorDensity,
} from "../../state/atoms";
import { phStorage } from "../../../../utils/phStorage";
import { rewriteBreakpoints } from "../../../../utils/breakpointRewrite";

interface StylesTabProps {
  ds: UseDesignSystemReturn;
}

function DensitySlider({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const stepIndex = DENSITY_STEPS.findIndex(s => s.value === value);
  const currentIndex = stepIndex >= 0 ? stepIndex : DENSITY_STEPS.findIndex(s => s.value === "1");
  const currentLabel = DENSITY_STEPS[currentIndex].label;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-neutral-content text-xs font-medium">Spacing Density</label>
        <span className="text-neutral-content text-xs">{currentLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-neutral-content text-[10px]">Compact</span>
        <input
          type="range"
          min={0}
          max={DENSITY_STEPS.length - 1}
          step={1}
          value={currentIndex}
          onChange={e => onChange(DENSITY_STEPS[Number(e.target.value)].value)}
          className="bg-border accent-foreground h-1.5 w-full cursor-pointer appearance-none rounded-full"
        />
        <span className="text-neutral-content text-[10px]">Airy</span>
      </div>
      <p className="text-neutral-content mt-1 text-[10px] leading-snug">
        Global multiplier applied to every spatial scale token. Edit individual scale tokens via
        Manage Tokens.
      </p>
    </div>
  );
}

function TokensSection() {
  const [open, setOpen] = useState(false);
  const designVars = useDesignVars();

  const counts = designVars.reduce(
    (acc, v) => {
      acc[v.category] = (acc[v.category] || 0) + 1;
      acc.custom += v.custom ? 1 : 0;
      return acc;
    },
    { palette: 0, typography: 0, spacing: 0, colors: 0, other: 0, custom: 0 } as Record<
      string,
      number
    >
  );

  return (
    <div className="space-y-2">
      <p className="text-neutral-content text-[10px] leading-snug">
        Every design token — colors, spacing, radii, typography, custom — lives in one place. Edit
        built-ins, create your own, and pick where each one shows up.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-primary text-primary-content hover:bg-primary/90 flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors"
      >
        <TbBraces className="size-3.5" aria-hidden />
        Manage Tokens
        <TbExternalLink className="size-3" aria-hidden />
      </button>
      <div className="text-neutral-content flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
        <span>{counts.palette} palette</span>
        <span>·</span>
        <span>{counts.spacing} spacing</span>
        <span>·</span>
        <span>{counts.colors} colors</span>
        <span>·</span>
        <span>{counts.typography} typography</span>
        <span>·</span>
        <span>{counts.other} other</span>
        {counts.custom > 0 && (
          <>
            <span>·</span>
            <span className="text-primary">{counts.custom} custom</span>
          </>
        )}
      </div>

      {open && <VarPicker open onOpenChange={o => setOpen(o)} />}
    </div>
  );
}

function BreakpointsSection() {
  const { actions, themeBreakpoints } = useEditor((state, _query) => {
    const root = state.nodes[ROOT_NODE];
    return {
      themeBreakpoints: root?.data?.props?.theme?.breakpoints as
        | Partial<AppliedBreakpointsShape>
        | undefined,
    };
  });
  const appliedBreakpoints = useAtomValue(AppliedBreakpointsAtom);

  const order: Array<keyof AppliedBreakpointsShape> = ["sm", "md", "lg", "xl", "2xl"];

  const setBreakpoint = (key: keyof AppliedBreakpointsShape, raw: number) => {
    const idx = order.indexOf(key);
    const prev = idx > 0 ? order[idx - 1] : null;
    const next = idx < order.length - 1 ? order[idx + 1] : null;
    const prevPx = prev ? (themeBreakpoints?.[prev] ?? DEFAULT_BREAKPOINTS[prev]) : 240;
    const nextPx = next ? (themeBreakpoints?.[next] ?? DEFAULT_BREAKPOINTS[next]) : 3840;
    const clamped = Math.max(prevPx + 1, Math.min(nextPx - 1, raw));

    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.theme) props.theme = {};
      if (!props.theme.breakpoints) props.theme.breakpoints = {};
      props.theme.breakpoints[key] = clamped;
    });

    const styleEl = document.getElementById("tailwind-compiled") as HTMLStyleElement | null;
    if (styleEl) {
      const toBps: AppliedBreakpointsShape = { ...appliedBreakpoints, [key]: clamped };
      styleEl.textContent = rewriteBreakpoints(
        styleEl.textContent || "",
        appliedBreakpoints,
        toBps
      );
    }
  };

  const resetAll = () => {
    actions.setProp(ROOT_NODE, (props: any) => {
      if (props.theme?.breakpoints) delete props.theme.breakpoints;
    });
    const styleEl = document.getElementById("tailwind-compiled") as HTMLStyleElement | null;
    if (styleEl) {
      styleEl.textContent = rewriteBreakpoints(
        styleEl.textContent || "",
        appliedBreakpoints,
        DEFAULT_BREAKPOINTS
      );
    }
  };

  const hasOverrides = themeBreakpoints && Object.keys(themeBreakpoints).length > 0;

  return (
    <div className="space-y-2">
      <p className="text-neutral-content text-[10px] leading-snug">
        Adjust the pixel widths where <code>sm:</code> / <code>md:</code> / <code>lg:</code> /{" "}
        <code>xl:</code> / <code>2xl:</code> activate. Affects every responsive class on this site.
      </p>
      {order.map(key => {
        const px = themeBreakpoints?.[key] ?? DEFAULT_BREAKPOINTS[key];
        const isCustom = themeBreakpoints?.[key] !== undefined;
        return (
          <div key={key} className="flex items-center gap-2">
            <label
              htmlFor={`ds-bp-${key}`}
              className="text-base-content w-12 font-mono text-xs uppercase"
            >
              {key === "2xl" ? "2XL" : key.toUpperCase()}
            </label>
            <input
              id={`ds-bp-${key}`}
              type="number"
              min={241}
              max={3839}
              value={px}
              placeholder={`${DEFAULT_BREAKPOINTS[key]}`}
              onChange={e => {
                const n = parseInt(e.target.value, 10);
                if (!Number.isFinite(n)) return;
                setBreakpoint(key, n);
              }}
              className={`border-base-300 bg-base-100 w-20 rounded border px-2 py-1 text-xs ${
                isCustom ? "text-primary" : "text-base-content"
              }`}
            />
            <span className="text-neutral-content text-[10px]">px</span>
            <span className="text-neutral-content text-[10px]">
              default {DEFAULT_BREAKPOINTS[key]}
            </span>
          </div>
        );
      })}
      {hasOverrides && (
        <button
          type="button"
          onClick={resetAll}
          className="text-neutral-content hover:text-base-content mt-1 cursor-pointer text-[10px] underline transition-colors"
        >
          Reset all to defaults
        </button>
      )}
    </div>
  );
}

export function StylesTab({ ds }: StylesTabProps) {
  const { styles, updateStyle, expandedSections, toggleSection } = ds;

  return (
    <div className="space-y-0">
      <ToolbarSection
        key={`tokens-${expandedSections.spacing}`}
        title="Tokens"
        defaultOpen
        showChevron
        onClick={() => toggleSection("spacing")}
      >
        <TokensSection />
      </ToolbarSection>

      <ToolbarSection
        key={`density-${expandedSections.spatial}`}
        title="Density"
        defaultOpen={!!expandedSections.spatial}
        showChevron
        onClick={() => toggleSection("spatial")}
      >
        <DensitySlider
          value={styles.spacingDensity}
          onChange={v => updateStyle("spacingDensity", v)}
        />
      </ToolbarSection>

      <ToolbarSection
        key={`breakpoints-${expandedSections.breakpoints}`}
        title="Breakpoints (Advanced)"
        defaultOpen={!!expandedSections.breakpoints}
        showChevron
        onClick={() => toggleSection("breakpoints")}
      >
        <BreakpointsSection />
      </ToolbarSection>

      <ToolbarSection title="Editor preferences" defaultOpen={false} showChevron>
        <IndicatorDensityRow />
      </ToolbarSection>
    </div>
  );
}

function IndicatorDensityRow() {
  const [density, setDensity] = useAtomState(IndicatorDensityAtom);
  const choose = (next: IndicatorDensity) => {
    setDensity(next);
    phStorage.set("indicator-density", next);
  };
  const opts: { id: IndicatorDensity; label: string; desc: string }[] = [
    { id: "auto", label: "Auto", desc: "Show only when overridden" },
    { id: "always", label: "Always", desc: "Show on every property" },
    { id: "off", label: "Off", desc: "Hide all chips" },
  ];
  return (
    <div className="flex flex-col gap-1">
      <label className="text-base-content text-xs font-medium">Indicator density</label>
      <p className="text-neutral-content text-[10px] leading-snug">
        Per-property breakpoint chips next to labels. Right-click a chip for reset / promote / copy
        commands.
      </p>
      <div className="bg-base-200 mt-1 inline-flex gap-px rounded-md p-0.5">
        {opts.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => choose(opt.id)}
            aria-pressed={density === opt.id}
            aria-label={`${opt.label}: ${opt.desc}`}
            className={`flex-1 cursor-pointer rounded px-2 py-1 text-[11px] transition-colors ${
              density === opt.id
                ? "bg-base-100 text-base-content font-semibold shadow-sm"
                : "text-neutral-content hover:text-base-content"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
