import { useEditor } from "@craftjs/core";
import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { IpsumGenerator } from "../../Inputs/media/IpsumGenerator";
import { SelectOptionsItem } from "../../Items/SelectOptionsItem";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

// Inlined to avoid circular dep (FormElement.tsx → UnifiedSettings → registry → this file)
const inputTypes = [
  "text", "textarea", "email", "password", "url", "tel",
  "date", "datetime-local", "radio", "checkbox", "select",
  "reset", "hidden", "color", "file", "month", "number", "range",
  "search", "time", "week",
];

export const FormElementMainTab = () => {
  const { query } = useEditor();

  // Get the current field type
  const selected = query.getEvent("selected").first();
  const fieldType = selected ? query.node(selected).get().data.props?.type || "" : "";

  return renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Properties"
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
        <ToolbarItem propKey="type" propType="component" type="select" label="Type" labelHide={true}>
          {inputTypes.map((_, k) => (
            <option key={_}>{_}</option>
          ))}
        </ToolbarItem>
        <SettingsAiSlot />
      </ToolbarSection>
    ),
    Properties: (
      <>
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

        <ToolbarSection title="Additional Properties" help="Required, disabled, read-only, and URL prefill.">
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
          <ToolbarItem
            propKey="prefillFromUrl"
            propType="component"
            type="checkbox"
            label="Prefill from URL"
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
