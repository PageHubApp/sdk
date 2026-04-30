import { useNode } from "@craftjs/core";
import { Chip } from "@/chrome/primitives/Chip";
import { ToolbarSegmentedControl } from "../../helpers/ToolbarSegmentedControl";
import { IconInput } from "../../inputs/media/IconInput";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

type ButtonType = "button" | "submit" | "reset";

const TYPE_OPTIONS: { value: ButtonType; label: string }[] = [
  { value: "button", label: "Button" },
  { value: "submit", label: "Submit" },
  { value: "reset", label: "Reset" },
];

function ButtonTypeControl() {
  const {
    actions: { setProp },
    type,
  } = useNode((node: any) => ({
    type: (node.data?.props?.type as ButtonType | undefined) || "button",
  }));

  return (
    <Chip label="Type" frame="bare">
      <div className="min-w-0 flex-1">
        <ToolbarSegmentedControl
          dense
          aria-label="Button type"
          value={type}
          onChange={next =>
            setProp((p: any) => {
              p.type = next;
            }, 0)
          }
          options={TYPE_OPTIONS}
        />
      </div>
    </Chip>
  );
}

export const ButtonMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <ToolbarItem propKey="text" type="text" label="Text" propType="component" />

        <IconInput propKey="icon" />

        <ButtonTypeControl />
      </ToolbarSection>
    ),
  });
