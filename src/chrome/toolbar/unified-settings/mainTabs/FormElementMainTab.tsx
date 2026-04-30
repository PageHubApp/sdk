import { useEditor, useNode } from "@craftjs/core";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { IpsumGenerator } from "../../inputs/media/IpsumGenerator";
import { SelectOptionsItem } from "../../items/SelectOptionsItem";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbLink } from "react-icons/tb";

// Inlined to avoid circular dep (FormElement.tsx → UnifiedSettings → registry → this file)
const inputTypes = [
  "text",
  "textarea",
  "email",
  "password",
  "url",
  "tel",
  "date",
  "datetime-local",
  "radio",
  "checkbox",
  "select",
  "reset",
  "hidden",
  "color",
  "file",
  "month",
  "number",
  "range",
  "search",
  "time",
  "week",
];

// ─── Inline StateBinding editor ──────────────────────────────────────────────
// Does NOT use ToolbarItem propKey magic because stateBinding is a nested object
// (not a flat scalar), so we read/write via useNode setProp directly.

const StateBindingSection = () => {
  const {
    actions: { setProp },
    stateBinding,
  } = useNode(node => ({
    stateBinding: node.data?.props?.stateBinding as
      | { key?: string; debounceMs?: number; defaultValue?: string; mode?: "value" | "checked" }
      | undefined,
  }));
  const { enabled } = useEditor(s => ({ enabled: s.options.enabled }));

  const update = (patch: Partial<NonNullable<typeof stateBinding>>) => {
    setProp((props: any) => {
      if (!props.stateBinding) props.stateBinding = {};
      Object.assign(props.stateBinding, patch);
      // If the key was cleared, remove the whole binding to keep props clean.
      if (!props.stateBinding.key) {
        delete props.stateBinding;
      }
    });
  };

  const clearBinding = () => {
    setProp((props: any) => {
      delete props.stateBinding;
    });
  };

  const modeOptions = [
    { value: "value", label: "Value", hint: "Sync input value (text, select, textarea)" },
    { value: "checked", label: "Checked", hint: "Sync checked state (checkbox / radio)" },
  ];

  return (
    <ToolbarSection
      title="State Binding"
      icon={<TbLink />}
      help="Two-way bind this input's value to a state-registry key. The URL bridge picks up url:* keys automatically. Set key only — debounce / mode / defaultValue are optional."
      defaultOpen={!!stateBinding?.key}
    >
      {/* Key */}
      <div className="col-span-full flex flex-col gap-1">
        <label className="text-neutral-content text-[10px] font-medium tracking-wider uppercase">
          State key
          <span
            className="ml-1 cursor-help opacity-60"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Registry key to bind. Convention: url:q for search, cart:promo for promo code, pdp:axis:Color for variant pickers. Supports {{anchor.X}} tokens."
            data-tooltip-place="left"
          >
            ?
          </span>
        </label>
        <div className="bg-base-200 border-base-300 flex items-center rounded border px-2 py-1">
          <input
            type="text"
            className="input-plain flex-1 text-xs"
            value={stateBinding?.key ?? ""}
            placeholder="e.g. url:q"
            onChange={e => update({ key: e.target.value })}
            aria-label="State binding key"
            autoComplete="off"
            spellCheck={false}
          />
          {stateBinding?.key && (
            <button
              className="text-neutral-content hover:text-error ml-1 shrink-0 text-xs"
              onClick={clearBinding}
              aria-label="Clear state binding"
              title="Clear binding"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Mode */}
      <div className="col-span-full flex flex-col gap-1">
        <label className="text-neutral-content text-[10px] font-medium tracking-wider uppercase">
          Mode
          <span
            className="ml-1 cursor-help opacity-60"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Value: sync the text/select value (default). Checked: sync the checked state — use for checkbox / radio inputs where you want to record which option is selected."
            data-tooltip-place="left"
          >
            ?
          </span>
        </label>
        <div className="flex gap-2">
          {modeOptions.map(opt => (
            <label
              key={opt.value}
              className={`flex flex-1 cursor-pointer items-center justify-center rounded border px-2 py-1 text-xs transition-colors ${
                (stateBinding?.mode ?? "value") === opt.value
                  ? "border-primary text-primary bg-primary/10 font-medium"
                  : "border-base-300 text-neutral-content"
              }`}
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content={opt.hint}
              data-tooltip-place="top"
            >
              <input
                type="radio"
                name="stateBindingMode"
                className="sr-only"
                checked={(stateBinding?.mode ?? "value") === opt.value}
                onChange={() => update({ mode: opt.value as "value" | "checked" })}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Debounce */}
      <div className="col-span-full flex flex-col gap-1">
        <label className="text-neutral-content text-[10px] font-medium tracking-wider uppercase">
          Debounce (ms)
          <span
            className="ml-1 cursor-help opacity-60"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Delay before writing to state after the user stops typing. 0 = immediate. 300 is good for live-search inputs (reduces refetch churn). 0 for dropdowns/checkboxes."
            data-tooltip-place="left"
          >
            ?
          </span>
        </label>
        <div className="bg-base-200 border-base-300 flex items-center rounded border px-2 py-1">
          <input
            type="number"
            className="input-plain flex-1 text-xs"
            value={stateBinding?.debounceMs ?? 0}
            min={0}
            max={2000}
            step={50}
            placeholder="0"
            onChange={e => update({ debounceMs: Number(e.target.value) || 0 })}
            aria-label="Debounce milliseconds"
            autoComplete="off"
          />
          <span className="text-neutral-content ml-1 shrink-0 text-[10px]">ms</span>
        </div>
      </div>

      {/* Default value */}
      <div className="col-span-full flex flex-col gap-1">
        <label className="text-neutral-content text-[10px] font-medium tracking-wider uppercase">
          Default value
          <span
            className="ml-1 cursor-help opacity-60"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Written to state on first mount if the state key has no value yet. Useful for seeding default filters or toggle states without a separate set-state load action."
            data-tooltip-place="left"
          >
            ?
          </span>
        </label>
        <div className="bg-base-200 border-base-300 flex items-center rounded border px-2 py-1">
          <input
            type="text"
            className="input-plain flex-1 text-xs"
            value={stateBinding?.defaultValue ?? ""}
            placeholder="(none)"
            onChange={e => update({ defaultValue: e.target.value })}
            aria-label="Default value"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </ToolbarSection>
  );
};

export const FormElementMainTab = () => {
  const { query } = useEditor();

  // Get the current field type
  const selected = query.getEvent("selected").first();
  const fieldType = selected ? query.node(selected).get().data.props?.type || "" : "";

  return renderComponentSlots({
    Content: (
      <>
        <ToolbarSection
          title="Field"
          help="The placeholder will be displayed when no text is entered. The name is how you identify this input."
        >
          <ToolbarItem
            propKey="placeholder"
            propType="component"
            type="text"
            labelHide={true}
            label="Placeholder"
          />
          <ToolbarItem
            propKey="name"
            propType="component"
            type="text"
            labelHide={true}
            label="Input Name"
          />
          <ToolbarItem
            propKey="type"
            propType="component"
            type="select"
            label="Type"
            labelHide={true}
          >
            {inputTypes.map((_, k) => (
              <option key={_}>{_}</option>
            ))}
          </ToolbarItem>
          <SettingsAiSlot />
        </ToolbarSection>

        {fieldType === "select" && (
          <ToolbarSection title="Select Options" help="Manage options for select dropdowns">
            <SelectOptionsItem
              propKey="options"
              propType="component"
              type="custom"
              label="Options"
              labelHide={false}
            />
          </ToolbarSection>
        )}

        {/* ── State Binding (Phase 3) ──────────────────────────────────── */}
        <StateBindingSection />

        <ToolbarSection
          title="Additional Properties"
          help="Required, disabled, read-only, and URL prefill."
        >
          <ToolbarItem
            propKey="required"
            propType="component"
            type="checkbox"
            label="Required"
            labelHide={true}
            labelWidth="flex-1"
            inputWidth="w-auto"
            on={true}
          />
          <ToolbarItem
            propKey="disabled"
            propType="component"
            type="checkbox"
            label="Disabled"
            labelHide={true}
            labelWidth="flex-1"
            inputWidth="w-auto"
            on={true}
          />
          <ToolbarItem
            propKey="readOnly"
            propType="component"
            type="checkbox"
            label="Read Only"
            labelHide={true}
            labelWidth="flex-1"
            inputWidth="w-auto"
            on={true}
          />
        </ToolbarSection>

        {fieldType === "textarea" && (
          <ToolbarSection title="Textarea Settings" help="Settings specific to textarea elements">
            <ToolbarItem
              propKey="rows"
              propType="component"
              type="number"
              label="Rows"
              labelHide={true}
              placeholder="4"
              min={1}
              max={20}
            />
            <ToolbarItem
              propKey="cols"
              propType="component"
              type="number"
              label="Columns"
              labelHide={true}
              placeholder="50"
              min={1}
              max={200}
            />
          </ToolbarSection>
        )}

        {["number", "range", "date", "datetime-local", "time", "month", "week"].includes(
          fieldType
        ) && (
          <ToolbarSection title="Input Settings" help="Settings for input elements">
            <ToolbarItem
              propKey="min"
              propType="component"
              type="text"
              label="Min Value"
              labelHide={true}
              placeholder="Minimum value"
            />
            <ToolbarItem
              propKey="max"
              propType="component"
              type="text"
              label="Max Value"
              labelHide={true}
              placeholder="Maximum value"
            />
            <ToolbarItem
              propKey="step"
              propType="component"
              type="text"
              label="Step"
              labelHide={true}
              placeholder="Step value"
            />
            <ToolbarItem
              propKey="pattern"
              propType="component"
              type="text"
              label="Pattern"
              labelHide={true}
              placeholder="Regex pattern"
            />
          </ToolbarSection>
        )}

        <ToolbarSection title="Validation" help="Error handling and validation for this field">
          <ToolbarItem
            propKey="pattern"
            propType="component"
            type="text"
            label="Pattern"
            labelHide={true}
            placeholder="Regex pattern (e.g. [A-Za-z]+)"
          />
          <ToolbarItem
            propKey="errorMessage"
            propType="component"
            type="text"
            label="Error Message"
            labelHide={true}
            placeholder="Please enter a valid value"
          />
          <ToolbarItem
            propKey="label"
            propType="component"
            type="text"
            label="Label"
            labelHide={true}
            placeholder="Field label"
          />
        </ToolbarSection>

        <ToolbarSection title="Auto generate content" subtitle={true}>
          <IpsumGenerator propKey="placeholder" propType="component" />
        </ToolbarSection>
      </>
    ),
  });
};
