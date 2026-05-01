import { useEditor, useNode } from "@craftjs/core";
import { useSDK } from "../../../../core/context";
import { SelectOptionsItem } from "../../items/SelectOptionsItem";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";
import { Chip } from "@/chrome/primitives/Chip";
import { InlineClearButton } from "@/chrome/primitives/InlineClearButton";
import { ToolbarSegmentedControl } from "../../primitives/ToolbarSegmentedControl";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { toolbarInputNoAutocompleteProps } from "../../toolbarInputAttrs";
import { PropertiesInput } from "../../inputs/form-element/PropertiesInput";
import { TextareaSettingsInput } from "../../inputs/form-element/TextareaSettingsInput";
import { NumberSettingsInput } from "../../inputs/form-element/NumberSettingsInput";
import { ValidationInput } from "../../inputs/form-element/ValidationInput";
import { TbLink } from "react-icons/tb";

// Inlined to avoid circular dep (FormElement.tsx → Inspector → registry → this file)
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

  const mode = stateBinding?.mode ?? "value";

  return (
    <ToolbarSection
      title="State Binding"
      icon={<TbLink />}
      help="Two-way bind this input's value to a state-registry key. The URL bridge picks up url:* keys automatically. Set key only — debounce / mode / defaultValue are optional."
      defaultOpen={!!stateBinding?.key}
    >
      <Chip
        label="Key"
        trailing={
          stateBinding?.key ? (
            <InlineClearButton onClick={clearBinding} tooltip="Clear binding" />
          ) : null
        }
      >
        <input
          type="text"
          className="input-plain flex-1"
          value={stateBinding?.key ?? ""}
          placeholder="e.g. url:q"
          onChange={e => update({ key: e.target.value })}
          aria-label="State binding key"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Registry key to bind. Convention: url:q for search, cart:promo for promo code, pdp:axis:Color for variant pickers."
          {...toolbarInputNoAutocompleteProps}
        />
      </Chip>

      <Chip label="Mode" frame="bare">
        <ToolbarSegmentedControl
          dense
          value={mode}
          onChange={v => update({ mode: v as "value" | "checked" })}
          tooltipId={PAGEHUB_RTT_GLOBAL_ID}
          options={[
            {
              value: "value",
              label: "Value",
              tooltip: "Sync input value (text, select, textarea)",
              ariaLabel: "Value",
            },
            {
              value: "checked",
              label: "Checked",
              tooltip: "Sync checked state (checkbox / radio)",
              ariaLabel: "Checked",
            },
          ]}
        />
      </Chip>

      <Chip label="Debounce">
        <input
          type="number"
          className="input-plain flex-1"
          value={stateBinding?.debounceMs ?? 0}
          min={0}
          max={2000}
          step={50}
          placeholder="0"
          onChange={e => update({ debounceMs: Number(e.target.value) || 0 })}
          aria-label="Debounce milliseconds"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Delay before writing to state after the user stops typing. 0 = immediate. 300 is good for live-search inputs."
          {...toolbarInputNoAutocompleteProps}
        />
        <span className="text-neutral-content shrink-0 text-[10px]">ms</span>
      </Chip>

      <Chip label="Default">
        <input
          type="text"
          className="input-plain flex-1"
          value={stateBinding?.defaultValue ?? ""}
          placeholder="(none)"
          onChange={e => update({ defaultValue: e.target.value })}
          aria-label="Default value"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Written to state on first mount if the state key has no value yet."
          {...toolbarInputNoAutocompleteProps}
        />
      </Chip>
    </ToolbarSection>
  );
};

export const FormElementMainTab = () => {
  const { query } = useEditor();
  const { config } = useSDK();

  // Get the current field type
  const selected = query.getEvent("selected").first();
  const fieldType = selected ? query.node(selected).get().data.props?.type || "" : "";

  return renderComponentSlots({
    Content: (
      <>
        <ToolbarSection>
          <ToolbarItem
            propKey="placeholder"
            propType="component"
            type="text"
            label="Placeholder"
          />
          <ToolbarItem propKey="name" propType="component" type="text" label="Name" />
          <ToolbarItem propKey="type" propType="component" type="select" label="Type">
            {inputTypes.map(_ => (
              <option key={_}>{_}</option>
            ))}
          </ToolbarItem>

          {fieldType === "select" && (
            <SelectOptionsItem
              propKey="options"
              propType="component"
              type="custom"
              label="Options"
              labelHide={false}
            />
          )}

          {fieldType === "textarea" && <TextareaSettingsInput />}

          {["number", "range", "date", "datetime-local", "time", "month", "week"].includes(
            fieldType
          ) && <NumberSettingsInput />}

          <PropertiesInput />
          <ValidationInput />

          {config.editorChromeSlots?.settingsAiButton}
        </ToolbarSection>

        {/* ── State Binding (Phase 3) ──────────────────────────────────── */}
        <StateBindingSection />
      </>
    ),
  });
};
