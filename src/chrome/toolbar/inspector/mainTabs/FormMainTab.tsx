import { useEditor, useNode } from "@craftjs/core";
import { SlotRenderer } from "../../../../registry";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { useState } from "react";
import { TbForms, TbLoader, TbCheck } from "react-icons/tb";
import type { ActionConversion } from "../../../../utils/action";
import { ConversionFields } from "../../inputs/action/subforms/ConversionFields";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

const VIEW_STATES = [
  { value: "", label: "Form", icon: TbForms },
  { value: "loading", label: "Loading", icon: TbLoader },
  { value: "loaded", label: "Submitted", icon: TbCheck },
] as const;

export const FormMainTab = () => {
  const { id, props } = useNode(node => ({ props: node.data?.props }));
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
    case "custom":
      help = "POST form data as JSON to a custom URL.";
      break;
    case "collection":
      help = "Save each submission as a row in a collection.";
      break;
  }

  return renderComponentSlots({
    Content: (
      <>
        <ToolbarSection collapsible={false}>
          <div className="bg-neutral flex gap-1 rounded-md p-1">
            {VIEW_STATES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  actions.setProp(id, (p: any) => {
                    p.view = value;
                  })
                }
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
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
          <SlotRenderer id="settings/ai-button" />
        </ToolbarSection>

        <ToolbarSection title="Submission" icon={SECTION_ICONS["Type"]} help={help}>
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
            <option value="custom">Custom URL</option>
            <option value="collection">Collection Row</option>
          </ToolbarItem>

          {formType === "collection" && (
            <>
              <ToolbarItem
                propKey="collectionSlug"
                propType="component"
                type="text"
                label="Collection slug"
                placeholder="staff"
                labelHide={true}
              />
              <ToolbarItem
                propKey="collectionFieldMap"
                propType="component"
                type="textarea"
                label="Field map (JSON)"
                placeholder='{"name":"name","email":"email"}'
                labelHide={true}
              />
              <ToolbarItem
                propKey="collectionSkipEmail"
                propType="component"
                type="toggle"
                label="Email"
                option="Skip email notification"
                on="true"
              />
            </>
          )}

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

          {(formType === "iframe" || formType === "custom") && (
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
        </ToolbarSection>

        <ToolbarSection
          title="After Submit"
          icon={SECTION_ICONS["Type"]}
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
            icon={SECTION_ICONS["Type"]}
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

        <ToolbarSection
          title="Conversion tracking"
          icon={SECTION_ICONS["Type"]}
          help="Fire a Google Ads / GA4 / Meta conversion when the form submits. Configure site-level integration IDs in your site's settings first."
        >
          <ConversionFields
            conversion={props.conversion}
            onChange={(conversion: ActionConversion | undefined) =>
              actions.setProp(id, (p: any) => {
                p.conversion = conversion;
              })
            }
            fallbackEventName="Lead"
          />
        </ToolbarSection>
      </>
    ),
  });
};
