/**
 * ContainerStateBody — chip-list UI for Container-only state-registry props:
 *   - `visibilityStateKey`       : single chip, click → popover with key input
 *   - `computedStateBindings`    : chip per binding, click → popover with full editor
 *
 * Rendered inside the Interactions → State accordion via the
 * `containerStateWiring` property def (see registry/properties/advanced.ts).
 * Mirrors the StateBindings chip+popover pattern so all three state-registry
 * verbs (read visibility / write computed / react with modifiers) feel uniform.
 */
import { useNode } from "@craftjs/core";
import { useRef, useState } from "react";
import { TbBoltFilled, TbMathFunction } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { Chip } from "../../../primitives/Chip";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { SideBarAtom } from "../../../../utils/lib";
import type {
  ComputedStateBinding,
  ComputedStateCompute,
} from "../../../../utils/conditions/computedState";

const PANEL_WIDTH = 380;

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

// ─── Visibility key chip ────────────────────────────────────────────────────

function VisibilityKeyPanel({
  value,
  onChange,
  initialPosition,
  onClose,
}: {
  value: string;
  onChange: (next: string) => void;
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Visibility state key"
      storageKey="visibility-state-key-editor"
      minWidth={380}
      maxWidth={520}
      minHeight={180}
      initialPosition={initialPosition}
      zIndex={1100}
      scrollable
    >
      <div className="flex flex-col gap-2">
        <p className="text-neutral-content text-[11px] leading-snug">
          The key in the state registry that controls this container&apos;s
          visibility. Defaults to the container&apos;s DOM id. Anchor tokens
          like <code className="font-mono">{`{{anchor.X}}`}</code> are supported.
        </p>
        <Chip>
          <input
            type="text"
            className="input-plain w-full font-mono"
            value={value}
            placeholder="e.g. cart:open"
            onChange={e => onChange(e.target.value)}
            aria-label="Visibility state key"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </Chip>
      </div>
    </FloatingPanel>
  );
}

function VisibilityKeyChip({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (next: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);

  const computePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const x = sidebarLeft ? rect.right + 8 : rect.left - PANEL_WIDTH - 8;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  };

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  return (
    <>
      <Chip
        mode="popover"
        ref={triggerRef}
        label="Visibility"
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          onClear();
        }}
        triggerAriaLabel="Edit visibility state key"
        clearAriaLabel="Clear visibility state key"
        leading={<TbBoltFilled className="size-3.5" aria-hidden />}
        summary={value || "(uses element id)"}
      />
      {open && (
        <VisibilityKeyPanel
          value={value}
          onChange={onChange}
          initialPosition={initialPos}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── Computed binding chip + panel ──────────────────────────────────────────

function ComputedBindingPanel({
  binding,
  onChange,
  initialPosition,
  onClose,
}: {
  binding: ComputedStateBinding;
  onChange: (next: ComputedStateBinding) => void;
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}) {
  const c = binding.compute;
  const setCompute = (patch: Partial<ComputedStateCompute>) => {
    onChange({ ...binding, compute: { ...c, ...patch } as ComputedStateCompute });
  };
  const setFrom = (raw: string) => {
    onChange({ ...binding, from: raw.split("\n").map(s => s.trim()).filter(Boolean) });
  };
  const isVariantType = c.type === "variant-match" || c.type === "variant-axis-availability";

  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Computed binding"
      storageKey="computed-binding-editor"
      minWidth={320}
      maxWidth={480}
      minHeight={300}
      initialPosition={initialPosition}
      zIndex={1100}
      scrollable
    >
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-0.5">
          <span
            className="text-base-content text-[11px] font-medium"
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

        <label className="flex flex-col gap-0.5">
          <span className="text-base-content text-[11px] font-medium">Compute type</span>
          <ToolbarDropdown
            value={c.type}
            onChange={(v: string) => {
              const type = v as ComputedStateCompute["type"];
              onChange({ ...binding, compute: { type } as ComputedStateCompute });
            }}
            chevron
          >
            {COMPUTE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </ToolbarDropdown>
          <p className="text-neutral-content text-[9px]">
            {COMPUTE_TYPES.find(t => t.value === c.type)?.description}
          </p>
        </label>

        {!isVariantType && (
          <label className="flex flex-col gap-0.5">
            <span
              className="text-base-content text-[11px] font-medium"
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

        {c.type === "join" && (
          <label className="flex flex-col gap-0.5">
            <span className="text-base-content text-[11px] font-medium">Separator</span>
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

        {c.type === "variant-match" && (
          <>
            <label className="flex flex-col gap-0.5">
              <span
                className="text-base-content text-[11px] font-medium"
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
                className="text-base-content text-[11px] font-medium"
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
                className="text-base-content text-[11px] font-medium"
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

        {c.type === "variant-axis-availability" && (
          <>
            <label className="flex flex-col gap-0.5">
              <span className="text-base-content text-[11px] font-medium">Variant map (state key or JSON)</span>
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
                className="text-base-content text-[11px] font-medium"
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
                className="text-base-content text-[11px] font-medium"
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
              <span className="text-base-content text-[11px] font-medium">Axis key template</span>
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
    </FloatingPanel>
  );
}

function ComputedBindingChipRow({
  binding,
  onChange,
  onRemove,
}: {
  binding: ComputedStateBinding;
  onChange: (next: ComputedStateBinding) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);

  const computePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const x = sidebarLeft ? rect.right + 8 : rect.left - PANEL_WIDTH - 8;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  };

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  const typeLabel = COMPUTE_TYPES.find(t => t.value === binding.compute.type)?.label ?? binding.compute.type;
  const summary = `${binding.key || "(no output key)"}  ←  ${typeLabel}`;

  return (
    <>
      <Chip
        mode="popover"
        ref={triggerRef}
        label="Computed"
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          onRemove();
        }}
        triggerAriaLabel="Edit computed binding"
        clearAriaLabel="Remove computed binding"
        leading={<TbMathFunction className="size-3.5" aria-hidden />}
        summary={summary}
      />
      {open && (
        <ComputedBindingPanel
          binding={binding}
          onChange={onChange}
          initialPosition={initialPos}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── Public body component ──────────────────────────────────────────────────

export const ContainerStateBody = () => {
  const { actions: { setProp }, visibilityStateKey, computedStateBindings } = useNode(node => ({
    visibilityStateKey: node.data?.props?.visibilityStateKey as string | undefined,
    computedStateBindings: node.data?.props?.computedStateBindings as
      ComputedStateBinding[] | undefined,
  }));

  const bindings: ComputedStateBinding[] = computedStateBindings ?? [];
  const hasVisibilityKey = typeof visibilityStateKey === "string";

  const setVisibilityKey = (next: string) => {
    setProp((p: any) => {
      p.visibilityStateKey = next;
    });
  };
  const clearVisibilityKey = () => {
    setProp((p: any) => {
      delete p.visibilityStateKey;
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

  if (!hasVisibilityKey && bindings.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {hasVisibilityKey && (
        <VisibilityKeyChip
          value={visibilityStateKey ?? ""}
          onChange={setVisibilityKey}
          onClear={clearVisibilityKey}
        />
      )}
      {bindings.map((b, i) => (
        <ComputedBindingChipRow
          key={i}
          binding={b}
          onChange={next => updateBinding(i, next)}
          onRemove={() => removeBinding(i)}
        />
      ))}
    </div>
  );
};
