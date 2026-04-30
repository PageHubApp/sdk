/**
 * ShorthandInput — Framer-style "one row, multiple modes" property control.
 *
 * Each mode owns a set of Tailwind tags. The toggle on the right shows one icon
 * per mode; switching modes clears tags from every other mode so only one set
 * of classes is ever live. Initial mode = most-specific mode that has a value;
 * else the first mode (treated as default/uniform).
 *
 * Powers gap (uniform / X-Y), padding (uniform / X-Y / T-R-B-L), margin, radius,
 * border-width, inset, etc. One component, one PropertyInput shape, used everywhere.
 */
import React, { useState, useMemo } from "react";
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { UniversalInput } from "../universal-input";
import type { ValueType } from "../universal-input/types";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../primitives/layout/tooltipSurface";
import { ToolbarSegmentedControl } from "../../helpers/ToolbarSegmentedControl";
import { ViewAtom } from "../../../viewport/atoms";
import { ViewSelectionAtom } from "../../Label";
import { changeProp, getPropFinalValue } from "../../../viewport/viewportExports";
import type {
  PropertyInputProps,
  ShorthandMode,
} from "../../unified-settings/registry/propertyDefs";

export interface ShorthandInputConfig {
  modes: ShorthandMode[];
  tailwindKey?: string;
  varSelectorPrefix?: string;
  allowedTypes?: ValueType[];
}

interface Props extends PropertyInputProps {
  config: ShorthandInputConfig;
}

export function ShorthandInput({ def, config }: Props) {
  const { modes, tailwindKey, varSelectorPrefix, allowedTypes } = config;

  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;

  const {
    actions: { setProp },
    className,
  } = useNode((node: any) => ({
    className: typeof node.data?.props?.className === "string" ? node.data.props.className : "",
  }));

  const tagHasValue = (tag: string) => {
    const r = getPropFinalValue(
      { propKey: tag, propType: "class" },
      view,
      { className },
      classDark
    );
    return r.value != null && r.value !== "";
  };

  // Initial mode: walk modes from most-specific to least, pick first with any value set.
  // "Most specific" = later in the array, so we iterate in reverse.
  const initialModeId = useMemo(() => {
    for (let i = modes.length - 1; i >= 0; i--) {
      if (modes[i].tags.some(tagHasValue)) return modes[i].id;
    }
    return modes[0]?.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className, view, classDark]);

  const [activeId, setActiveId] = useState<string>(initialModeId);
  const active = modes.find(m => m.id === activeId) ?? modes[0];

  const switchTo = (next: ShorthandMode) => {
    if (next.id === activeId) return;
    // Clear tags from every OTHER mode so we don't leave stale classes around.
    const keep = new Set(next.tags);
    for (const m of modes) {
      for (const tag of m.tags) {
        if (!keep.has(tag)) {
          changeProp({ propKey: tag, value: "", propType: "class", setProp, view, classDark });
        }
      }
    }
    setActiveId(next.id);
  };

  const cols = active.columns ?? active.tags.length;
  const isSingle = active.tags.length === 1;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5">
        <span className="text-base-content w-20 shrink-0 cursor-default truncate text-xs">
          {def.label}
        </span>
        <div className="min-w-0 flex-1">
          {isSingle ? (
            <UniversalInput
              propKey={active.tags[0]}
              propTag={active.tags[0]}
              tailwindKey={active.tailwindKeys?.[0] ?? tailwindKey}
              label=""
              labelHide
              showVarSelector={!!varSelectorPrefix}
              allowedTypes={allowedTypes}
              inline
            />
          ) : (
            <div className="text-neutral-content flex h-8 items-center text-xs italic opacity-60">
              {active.ariaLabel}
            </div>
          )}
        </div>
        <ModeToggle modes={modes} activeId={activeId} onChange={switchTo} />
      </div>

      {!isSingle && (
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {active.tags.map((tag, i) => (
            <div key={tag} className="min-w-0">
              <UniversalInput
                propKey={tag}
                propTag={tag}
                tailwindKey={active.tailwindKeys?.[i] ?? tailwindKey}
                label={active.labels[i]}
                labelWidth="w-6"
                showVarSelector={!!varSelectorPrefix}
                allowedTypes={allowedTypes}
                inline
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeToggle({
  modes,
  activeId,
  onChange,
}: {
  modes: ShorthandMode[];
  activeId: string;
  onChange: (next: ShorthandMode) => void;
}) {
  return (
    <ToolbarSegmentedControl
      compact
      optionClassName="w-7"
      tooltipId={PAGEHUB_RTT_GLOBAL_ID}
      value={activeId}
      onChange={id => {
        const next = modes.find(m => m.id === id);
        if (next) onChange(next);
      }}
      options={modes.map(m => ({
        value: m.id,
        label: m.icon,
        tooltip: m.ariaLabel,
        ariaLabel: m.ariaLabel,
      }))}
    />
  );
}
