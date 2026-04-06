import { useEditor, useNode } from "@craftjs/core";
import { TbAppWindow, TbEye, TbEyeOff } from "react-icons/tb";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, renderAdvancedComponentSlots, SECTION_ICONS } from "../helpers";

const VIEW_STATES = [
  { value: "", label: "Edit", icon: TbAppWindow },
  { value: "preview", label: "Preview", icon: TbEye },
] as const;

export const ModalMainTab = () => {
  const { actions } = useEditor();
  const { id, props } = useNode(node => ({ props: node.data.props }));
  const currentView = props.view || "";
  const trigger = props.trigger || {};

  return renderComponentSlots({
    Content: (
      <ToolbarSection title="Content" icon={SECTION_ICONS["Content"]} help="How and when the modal opens, and close behavior.">
        {/* View toggle — collapsed/expanded in editor */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {VIEW_STATES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => actions.setProp(id, (p: any) => { p.view = value; })}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                currentView === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        <ToolbarItem
          propKey="trigger.type"
          propType="component"
          type="select"
          label="Trigger"
        >
          <option value="click">Click (via Button)</option>
          <option value="load">Page Load</option>
          <option value="delay">After Delay</option>
        </ToolbarItem>

        {trigger.type === "delay" && (
          <ToolbarItem
            propKey="trigger.delay"
            propType="component"
            type="number"
            label="Delay (seconds)"
          />
        )}

        {(trigger.type === "load" || trigger.type === "delay") && (
          <ToolbarItem
            propKey="trigger.showOnce"
            propType="component"
            type="toggle"
            label="Show Only Once"
            option="Show Only Once"
            on={true}
          />
        )}

        <ToolbarItem
          propKey="showCloseButton"
          propType="component"
          type="toggle"
          label="Close Button"
          option="Show Close Button"
          on={true}
        />

        <ToolbarItem
          propKey="closeOnBackdrop"
          propType="component"
          type="toggle"
          label="Backdrop Close"
          option="Close on Backdrop Click"
          on={true}
        />

        <ToolbarItem
          propKey="closeOnEscape"
          propType="component"
          type="toggle"
          label="Escape Close"
          option="Close on Escape Key"
          on={true}
        />
      </ToolbarSection>
    ),
    Type: (
      <ToolbarSection title="Type" icon={SECTION_ICONS["Type"]} help="Animation, size, position, and backdrop settings.">
        <ToolbarItem
          propKey="modalAnimation"
          propType="component"
          type="select"
          label="Animation"
        >
          <option value="fade">Fade</option>
          <option value="slide-up">Slide Up</option>
          <option value="slide-down">Slide Down</option>
          <option value="scale">Scale</option>
          <option value="none">None</option>
        </ToolbarItem>

        <ToolbarItem
          propKey="modalWidth"
          propType="component"
          type="select"
          label="Width"
        >
          <option value="max-w-sm">Small</option>
          <option value="max-w-md">Medium</option>
          <option value="max-w-lg">Large</option>
          <option value="max-w-xl">XL</option>
          <option value="max-w-2xl">2XL</option>
          <option value="max-w-full">Full Width</option>
        </ToolbarItem>

        <ToolbarItem
          propKey="modalPosition"
          propType="component"
          type="select"
          label="Position"
        >
          <option value="center">Center</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
        </ToolbarItem>

        <ToolbarItem
          propKey="closeButtonPosition"
          propType="component"
          type="select"
          label="Close Position"
        >
          <option value="top-right">Top Right</option>
          <option value="top-left">Top Left</option>
        </ToolbarItem>

        <ToolbarItem
          propKey="backdropBlur"
          propType="component"
          type="toggle"
          label="Backdrop Blur"
          option="Backdrop Blur"
          on={true}
        />
      </ToolbarSection>
    ),
  });
};

export const ModalMainTabAdvanced = () => {
  return renderAdvancedComponentSlots({
    Anchor: (
      <ToolbarSection title="Modal ID" icon={SECTION_ICONS["Anchor"]} help="ID that buttons use to open this modal.">
        <ToolbarItem
          propKey="anchor"
          propType="component"
          type="text"
          labelHide={true}
          placeholder="my-modal"
          inline
          description="Set this ID, then point a Button's click action to it"
          label="Modal ID"
        />
      </ToolbarSection>
    ),
  });
};
