import { useEditor, useNode } from "@craftjs/core";
import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { useState } from "react";
import { TbForms, TbLoader, TbCheck } from "react-icons/tb";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

const VIEW_STATES = [
  { value: "", label: "Form", icon: TbForms },
  { value: "loading", label: "Loading", icon: TbLoader },
  { value: "loaded", label: "Submitted", icon: TbCheck },
] as const;

export const FormMainTab = () => {
  const { id, props } = useNode(node => ({ props: node.data.props }));
  const { actions } = useEditor();
  const [formType, setFormType] = useState(props.submissionType);
  const currentView = props.view || "";

  let help = "";
  switch (formType) {
    case "iframe":
      help = "Submit your form to a hidden iframe. Define your URL and method.";
      break;
    case "save":
      help = "Save your data — view submissions when they occur.";
      break;
    case "emailSave":
      help = "Save your data and email you upon submission.";
      break;
  }

  return renderComponentSlots({
    Content: (
      <ToolbarSection title="Content" icon={SECTION_ICONS["Content"]} help="Preview the form, loading, and submitted states.">
        <div className="flex gap-1 rounded-lg bg-neutral p-1">
          {VIEW_STATES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => actions.setProp(id, (p: any) => { p.view = value; })}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                currentView === value
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "text-neutral-content hover:text-base-content"
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
        <SettingsAiSlot />
      </ToolbarSection>
    ),
    Properties: (
      <>
        <ToolbarSection
          title="Properties"
          icon={SECTION_ICONS["Properties"]}
          help={help}
        >
          <ToolbarItem
            propKey="formName"
            propType="component"
            type="text"
            label="Form Name"
            placeholder="My Form"
            labelHide={true}
          />
          <ToolbarItem
            propKey="submissionType"
            propType="component"
            type="select"
            label="Type"
            labelHide={true}
            onChange={(p: string) => setFormType(p)}
          >
            <option value=""> </option>
            <option>iframe</option>
            <option value="save">Save</option>
            <option value="emailSave">Email &amp; Save</option>
          </ToolbarItem>

          <ToolbarItem
            propKey="anchor"
            propType="component"
            type="text"
            labelHide={true}
            placeholder="Anchor Tag"
            inline
            description="Link to this section with #tag"
            label="Anchor Tag"
          />
        </ToolbarSection>

        {formType === "emailSave" && (
          <ToolbarItem
            propKey="mailto"
            propType="component"
            type="text"
            label="Mail to"
            placeholder="you@domain.com"
            labelHide={true}
          />
        )}

        {formType === "iframe" && (
          <>
            <ToolbarItem
              propKey="action"
              propType="component"
              type="text"
              label="Action"
              placeholder="https://..."
              labelHide={true}
            />
            <ToolbarItem propKey="method" propType="component" type="select" label="method">
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </ToolbarItem>
          </>
        )}

        <ToolbarSection
          title="After Submit"
          icon={SECTION_ICONS["Properties"]}
          help="What happens after the form is submitted successfully."
        >
          <ToolbarItem
            propKey="successAction"
            propType="component"
            type="select"
            label="Action"
            labelHide={true}
          >
            <option value="">Show thank you message</option>
            <option value="redirect">Redirect to URL</option>
          </ToolbarItem>
          {props.successAction === "redirect" && (
            <ToolbarItem
              propKey="successUrl"
              propType="component"
              type="text"
              label="Redirect URL"
              placeholder="https://example.com/thank-you"
              labelHide={true}
            />
          )}
        </ToolbarSection>

        {(formType === "save" || formType === "emailSave") && (
          <ToolbarSection
            title="Webhook"
            icon={SECTION_ICONS["Properties"]}
            help="Send form data to an external URL on every submission. Works with Zapier, Make, n8n, or any webhook endpoint."
          >
            <ToolbarItem
              propKey="webhookEnabled"
              propType="component"
              type="toggle"
              label="Webhook"
              option="Enable"
              on="true"
            />
            {props.webhookEnabled && (
              <ToolbarItem
                propKey="webhookUrl"
                propType="component"
                type="text"
                label="Webhook URL"
                placeholder="https://hooks.zapier.com/..."
                labelHide={true}
              />
            )}
          </ToolbarSection>
        )}
      </>
    ),
  });
};
