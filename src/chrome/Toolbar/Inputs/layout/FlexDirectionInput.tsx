// @ts-nocheck
import { Tooltip } from "components/layout/Tooltip";
import { TbBoxAlignBottom, TbBoxAlignLeft, TbBoxAlignRight, TbBoxAlignTop } from "react-icons/tb";
import { ToolbarItem } from "../../ToolbarItem";

type FlexMode = "columns" | "rows" | undefined;

interface FlexDirectionInputProps {
  type?: string;
  wrap?: string;
  inline?: boolean;
  mode?: FlexMode;
}

export const FlexDirectionInput = ({
  type = "radio",
  wrap = "",
  inline = true,
  mode,
}: FlexDirectionInputProps) => {
  // Filter options based on mode
  const getOptions = () => {
    if (mode === "columns") {
      return [
        {
          label: (
            <Tooltip content="Top to Bottom">
              <TbBoxAlignTop />
            </Tooltip>
          ),
          value: "flex-col",
        },
        {
          label: (
            <Tooltip content="Bottom to Top">
              <TbBoxAlignBottom />
            </Tooltip>
          ),
          value: "flex-col-reverse",
        },
      ];
    }

    if (mode === "rows") {
      return [
        {
          label: (
            <Tooltip content="Left to Right">
              <TbBoxAlignLeft />
            </Tooltip>
          ),
          value: "flex-row",
        },
        {
          label: (
            <Tooltip content="Right to Left">
              <TbBoxAlignRight />
            </Tooltip>
          ),
          value: "flex-row-reverse",
        },
      ];
    }

    // Default: show all options (for backward compatibility)
    return [
      {
        label: (
          <Tooltip content="Top to Bottom">
            <TbBoxAlignTop />
          </Tooltip>
        ),
        value: "flex-col",
      },
      {
        label: (
          <Tooltip content="Bottom to Top">
            <TbBoxAlignBottom />
          </Tooltip>
        ),
        value: "flex-col-reverse",
      },
      {
        label: (
          <Tooltip content="Left to Right">
            <TbBoxAlignLeft />
          </Tooltip>
        ),
        value: "flex-row",
      },
      {
        label: (
          <Tooltip content="Right to Left">
            <TbBoxAlignRight />
          </Tooltip>
        ),
        value: "flex-row-reverse",
      },
    ];
  };

  return (
    <ToolbarItem
      propKey="flexDirection"
      type={type}
      label="Direction"
      cols={true}
      wrap={wrap}
      labelHide={true}
      inline={inline}
      options={getOptions()}
    />
  );
};
