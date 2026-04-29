/**
 * ContainerStateSection — editor UI for Phase 3 Container props:
 *   - `visibilityStateKey`       : read show/hide from a named registry key
 *   - `computedStateBindings`    : declarative derived-state bindings
 *
 * Mounted inside ContainerMainTab via a slot so the section only appears when
 * the selected container is NOT an imageContainer (those get the bgImage panel).
 * For regular containers we inject this below the AI slot.
 *
 * All writes go through `useNode().actions.setProp` — no manual CraftJS query
 * manipulation needed.
 */

import { useNode } from "@craftjs/core";
import { useState } from "react";
import { TbCircuitSwitchOpen, TbMathFunction, TbPlus, TbX, TbChevronDown } from "react-icons/tb";
import { ToolbarSection } from "../../ToolbarSection";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import type { ComputedStateBinding, ComputedStateCompute } from "../../../../utils/conditions/computedState";

// ─── Compute-type picker options ────────────────────────────────────────────

const COMPUTE_TYPES: Array<{ value: ComputedStateCompute["type"]; label: string; description: string }> = [
  {
    value: "all-truthy",
    label: "All truthy",
    description: "Output 'on' when every input key has a non-empty value. Use as an Add-to-Cart gate.",
  },
  {
    value: "first-truthy",
    label: "First truthy",
    description: "Output the value of the first non-empty input. Useful for fallback copy.",
  },
  {
    value: "join",
    label: "Join",
    description: "Concatenate all input values with a separator. Default separator is ','.",
  },
  {
    value: "variant-match",
    label: "Variant match",
    description: "Match axis selections against a variant map JSON and emit the matched variant. Use on a PDP wrapper.",
  },
  {
    value: "variant-axis-availability",
    label: "Axis availability",
    description: "Emit a CSV of axis values that have no in-stock variant given the currently selected other axes.",
  },
];

// ─── Single binding editor ───────────────────────────────────────────────────

function BindingEditor({
  binding,
  index,
  onChange,
  onRemove,
}: {
  binding: ComputedStateBinding;
  index: number;
  onChange: (updated: ComputedStateBinding) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(index === 0);
  const c = binding.compute;

  const setCompute = (patch: Partial<ComputedStateCompute>) => {
    onChange({ ...binding, compute: { ...c, ...patch } as ComputedStateCompute });
  };

  const setFrom = (raw: string) => {
    onChange({ ...binding, from: raw.split("\n").map(s => s.trim()).filter(Boolean) });
  };

  const isVariantType = c.type === "variant-match" || c.type === "variant-axis-availability";

  return (
    <div className="border-base-300 rounded border">
      {/* Header row */}
      <div
        className="flex cursor-pointer items-center gap-1.5 px-2 py-1.5"
        onClick={() => setOpen(o => !o)}
      >
        <TbMathFunction className="text-neutral-content size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-mono text-[10px]">
          {binding.key || "(no output key)"}
        </span>
        <span className="text-neutral-content text-[9px]">
          {COMPUTE_TYPES.find(t => t.value === c.type)?.label ?? c.type}
        </span>
        <TbChevronDown
          className={`text-neutral-content size-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="text-neutral-content hover:text-error ml-0.5 shrink-0"
          aria-label="Remove binding"
        >
          <TbX className="size-3" />
        </button>
      </div>

      {open && (
        <div className="border-base-300 space-y-2 border-t px-2 py-2">
          {/* Output key */}
          <label className="flex flex-col gap-0.5">
            <span
              className="text-neutral-content text-[10px] font-medium"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="State key to write the computed result to. Anchor tokens ({{anchor.X}}) are supported."
              data-tooltip-place="left"
            >
              Output key
            </span>
            <input
              type="text"
              className="input input-xs font-mono"
              value={binding.key}
              placeholder="pdp:matching-variant"
              onChange={e => onChange({ ...binding, key: e.target.value })}
              aria-label="Output state key"
            />
          </label>

          {/* Compute type */}
          <label className="flex flex-col gap-0.5">
            <span className="text-neutral-content text-[10px] font-medium">Compute type</span>
            <select
              className="select select-xs"
              value={c.type}
              onChange={e => {
                const type = e.target.value as ComputedStateCompute["type"];
                // Reset to sensible defaults when switching types
                const base = { ...binding, compute: { type } as ComputedStateCompute };
                onChange(base);
              }}
              aria-label="Compute type"
            >
              {COMPUTE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p className="text-neutral-content text-[9px]">
              {COMPUTE_TYPES.find(t => t.value === c.type)?.description}
            </p>
          </label>

          {/* from[] — for all-truthy / first-truthy / join */}
          {!isVariantType && (
            <label className="flex flex-col gap-0.5">
              <span
                className="text-neutral-content text-[10px] font-medium"
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Input state keys — one per line. The computer reads each key from the registry and combines them per the selected type."
                data-tooltip-place="left"
              >
                Input keys (one per line)
              </span>
              <textarea
                className="textarea textarea-xs font-mono text-[10px]"
                rows={3}
                value={(binding.from ?? []).join("\n")}
                onChange={e => setFrom(e.target.value)}
                placeholder={"url:q\nurl:category"}
                aria-label="Input state keys"
              />
            </label>
          )}

          {/* join separator */}
          {c.type === "join" && (
            <label className="flex flex-col gap-0.5">
              <span className="text-neutral-content text-[10px] font-medium">Separator</span>
              <input
                type="text"
                className="input input-xs font-mono"
                value={(c as any).separator ?? ","}
                onChange={e => setCompute({ separator: e.target.value } as any)}
                placeholder=","
                aria-label="Join separator"
              />
            </label>
          )}

          {/* variant-match fields */}
          {c.type === "variant-match" && (
            <>
              <label className="flex flex-col gap-0.5">
                <span
                  className="text-neutral-content text-[10px] font-medium"
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content="State key containing the serialised variant map JSON array. Typically {{item.variants}} inside a Data repeater."
                  data-tooltip-place="left"
                >
                  Variant map (state key or JSON)
                </span>
                <input
                  type="text"
                  className="input input-xs font-mono"
                  value={(c as any).variantMap ?? ""}
                  onChange={e => setCompute({ variantMap: e.target.value } as any)}
                  placeholder="{{item.variants}}"
                  aria-label="Variant map"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span
                  className="text-neutral-content text-[10px] font-medium"
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content='Comma-separated axis names, e.g. "Size,Color". Must match the keys in the variant map.'
                  data-tooltip-place="left"
                >
                  Axes (CSV)
                </span>
                <input
                  type="text"
                  className="input input-xs font-mono"
                  value={Array.isArray((c as any).axes) ? (c as any).axes.join(",") : ((c as any).axes ?? "")}
                  onChange={e => setCompute({ axes: e.target.value } as any)}
                  placeholder="Size,Color"
                  aria-label="Axes"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span
                  className="text-neutral-content text-[10px] font-medium"
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content="Template for the per-axis state key. %axis% is replaced with the axis name. E.g. pdp:axis:%axis% → pdp:axis:Size, pdp:axis:Color."
                  data-tooltip-place="left"
                >
                  Axis key template
                </span>
                <input
                  type="text"
                  className="input input-xs font-mono"
                  value={(c as any).axisKeyTemplate ?? ""}
                  onChange={e => setCompute({ axisKeyTemplate: e.target.value } as any)}
                  placeholder="pdp:axis:%axis%"
                  aria-label="Axis key template"
                />
              </label>
            </>
          )}

          {/* variant-axis-availability fields */}
          {c.type === "variant-axis-availability" && (
            <>
              <label className="flex flex-col gap-0.5">
                <span className="text-neutral-content text-[10px] font-medium">Variant map (state key or JSON)</span>
                <input
                  type="text"
                  className="input input-xs font-mono"
                  value={(c as any).variantMap ?? ""}
                  onChange={e => setCompute({ variantMap: e.target.value } as any)}
                  placeholder="{{item.variants}}"
                  aria-label="Variant map"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span
                  className="text-neutral-content text-[10px] font-medium"
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content="The axis whose availability you are computing, e.g. Color."
                  data-tooltip-place="left"
                >
                  Axis
                </span>
                <input
                  type="text"
                  className="input input-xs font-mono"
                  value={(c as any).axis ?? ""}
                  onChange={e => setCompute({ axis: e.target.value } as any)}
                  placeholder="Color"
                  aria-label="Axis"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span
                  className="text-neutral-content text-[10px] font-medium"
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content='CSV of the other axes to consider when determining availability, e.g. "Size".'
                  data-tooltip-place="left"
                >
                  Other axes (CSV)
                </span>
                <input
                  type="text"
                  className="input input-xs font-mono"
                  value={Array.isArray((c as any).otherAxes) ? (c as any).otherAxes.join(",") : ((c as any).otherAxes ?? "")}
                  onChange={e => setCompute({ otherAxes: e.target.value } as any)}
                  placeholder="Size"
                  aria-label="Other axes"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-neutral-content text-[10px] font-medium">Axis key template</span>
                <input
                  type="text"
                  className="input input-xs font-mono"
                  value={(c as any).axisKeyTemplate ?? ""}
                  onChange={e => setCompute({ axisKeyTemplate: e.target.value } as any)}
                  placeholder="pdp:axis:%axis%"
                  aria-label="Axis key template"
                />
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Public section component ────────────────────────────────────────────────

export const ContainerStateSection = () => {
  const { actions: { setProp }, visibilityStateKey, computedStateBindings } = useNode(node => ({
    visibilityStateKey: node.data?.props?.visibilityStateKey as string | undefined,
    computedStateBindings: node.data?.props?.computedStateBindings as
      ComputedStateBinding[] | undefined,
  }));

  const bindings: ComputedStateBinding[] = computedStateBindings ?? [];

  const addBinding = () => {
    setProp((p: any) => {
      if (!p.computedStateBindings) p.computedStateBindings = [];
      p.computedStateBindings.push({
        key: "",
        from: [],
        compute: { type: "all-truthy" },
      } satisfies ComputedStateBinding);
    });
  };

  const updateBinding = (index: number, updated: ComputedStateBinding) => {
    setProp((p: any) => {
      if (!p.computedStateBindings) return;
      p.computedStateBindings[index] = updated;
    });
  };

  const removeBinding = (index: number) => {
    setProp((p: any) => {
      if (!p.computedStateBindings) return;
      p.computedStateBindings.splice(index, 1);
      if (p.computedStateBindings.length === 0) delete p.computedStateBindings;
    });
  };

  return (
    <ToolbarSection
      title="State"
      icon={<TbCircuitSwitchOpen />}
      help="Wire this container to the state registry. Visibility state key overrides the element id for show/hide; computed bindings derive new state values from existing ones."
      defaultOpen={!!(visibilityStateKey || bindings.length > 0)}
    >
      {/* visibilityStateKey */}
      <div className="col-span-full flex flex-col gap-1">
        <label className="text-neutral-content text-[10px] font-medium">
          Visibility state key
          <span
            className="ml-1 cursor-help opacity-60"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Read show/hide from this registry key instead of the element's own DOM id. Lets multiple sibling containers (e.g. cart panel + backdrop) react to the same visibility entry. Anchor tokens ({{anchor.X}}) supported."
            data-tooltip-place="left"
          >
            ?
          </span>
        </label>
        <div className="bg-base-200 border-base-300 flex items-center rounded border px-2 py-1">
          <input
            type="text"
            className="input-plain flex-1 text-xs"
            value={visibilityStateKey ?? ""}
            placeholder="e.g. cart:open"
            onChange={e =>
              setProp((p: any) => {
                if (e.target.value) p.visibilityStateKey = e.target.value;
                else delete p.visibilityStateKey;
              })
            }
            aria-label="Visibility state key"
            autoComplete="off"
            spellCheck={false}
          />
          {visibilityStateKey && (
            <button
              className="text-neutral-content hover:text-error ml-1 shrink-0 text-xs"
              onClick={() => setProp((p: any) => { delete p.visibilityStateKey; })}
              aria-label="Clear visibility state key"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* computedStateBindings */}
      <div className="col-span-full mt-1 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span
            className="text-neutral-content text-[10px] font-medium"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Derived state: declarative replacements for inline JS handlers. Add a binding, pick a compute type, and set the output key. The runtime evaluates on every input-state change."
            data-tooltip-place="left"
          >
            Computed bindings
          </span>
          <button
            type="button"
            className="btn btn-xs btn-ghost gap-1 px-2 py-0.5"
            onClick={addBinding}
            aria-label="Add computed binding"
          >
            <TbPlus className="size-3" />
            Add
          </button>
        </div>

        {bindings.length === 0 && (
          <p className="text-neutral-content text-[10px] italic">No computed bindings yet.</p>
        )}

        <div className="space-y-1.5">
          {bindings.map((b, i) => (
            <BindingEditor
              key={i}
              binding={b}
              index={i}
              onChange={updated => updateBinding(i, updated)}
              onRemove={() => removeBinding(i)}
            />
          ))}
        </div>
      </div>
    </ToolbarSection>
  );
};
