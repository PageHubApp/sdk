import { useNode } from "@craftjs/core";
import { ToolbarSection } from "../../index";
import { ToolbarItem } from "../../index";
import { ViewAtom } from "../../../Viewport/atoms";
import { useState } from "react";
import { useAtomValue } from "@zedux/react";
import { TailwindStyles } from "utils/tailwind";

/**
 * Grid input component with essential grid controls
 */
export const GridInput = ({ propType = "class" }) => {
  const view = useAtomValue(ViewAtom);
  const viewKey = propType === "root" ? "root" : propType === "component" ? "component" : view;

  const {
    actions: { setProp },
    nodeProps,
  } = useNode(node => ({
    nodeProps: node.data.props[viewKey],
  }));

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <>
      <ToolbarSection title="Grid Layout" collapsible={true} nested={true}>
        <ToolbarItem
          propKey="gridCols"
          propType={propType}
          type="dropdown"
          label="Columns"
          options={TailwindStyles.gridCols}
        />

        <ToolbarItem
          propKey="gridRows"
          propType={propType}
          type="dropdown"
          label="Rows"
          options={TailwindStyles.gridRows}
        />
      </ToolbarSection>
      <ToolbarSection title="Item" collapsible={true} nested={true}>
        <ToolbarItem
          propKey="gridColSpan"
          propType={propType}
          type="select"
          label="Col Span"
          options={TailwindStyles.gridColSpan}
        />

        <ToolbarItem
          propKey="gridRowSpan"
          propType={propType}
          type="select"
          label="Row Span"
          options={TailwindStyles.gridRowSpan}
        />

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mb-2 flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-accent"
        >
          <span>Position Controls</span>
          <span className="text-muted-foreground">{showAdvanced ? "−" : "+"}</span>
        </button>

        {showAdvanced && (
          <>
            <ToolbarItem
              propKey="gridColStart"
              propType={propType}
              type="select"
              label="Col Start"
              options={TailwindStyles.gridColStart}
            />

            <ToolbarItem
              propKey="gridColEnd"
              propType={propType}
              type="select"
              label="Col End"
              options={TailwindStyles.gridColEnd}
            />

            <ToolbarItem
              propKey="gridRowStart"
              propType={propType}
              type="select"
              label="Row Start"
              options={TailwindStyles.gridRowStart}
            />

            <ToolbarItem
              propKey="gridRowEnd"
              propType={propType}
              type="select"
              label="Row End"
              options={TailwindStyles.gridRowEnd}
            />
          </>
        )}
      </ToolbarSection>

      <ToolbarSection title="Alignment" collapsible={true} nested={true}>
        <ToolbarItem
          propKey="placeContent"
          propType={propType}
          type="select"
          label="Place Content"
          labelHide={true}
          cols={true}
          inline
        >
          <option value=""> </option>
          {TailwindStyles.placeContent.map((_, k) => (
            <option key={k}>{_}</option>
          ))}
        </ToolbarItem>

        <ToolbarItem
          propKey="placeItems"
          propType={propType}
          type="select"
          label="Place Items"
          labelHide={true}
          cols={true}
          inline
        >
          <option value=""> </option>
          {TailwindStyles.placeItems.map((_, k) => (
            <option key={k}>{_}</option>
          ))}
        </ToolbarItem>

        <ToolbarItem
          propKey="placeSelf"
          propType={propType}
          type="select"
          label="Place Self"
          labelHide={true}
          cols={true}
          inline
        >
          <option value=""> </option>
          {TailwindStyles.placeSelf.map((_, k) => (
            <option key={k}>{_}</option>
          ))}
        </ToolbarItem>
      </ToolbarSection>
    </>
  );
};

export default GridInput;
