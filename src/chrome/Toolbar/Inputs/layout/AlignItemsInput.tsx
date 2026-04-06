import { Tooltip } from "components/layout/Tooltip";
import { TbAlignCenter, TbAlignLeft, TbAlignRight } from "react-icons/tb";
import { ToolbarItem } from "../../ToolbarItem";

export const AlignItemsInput = () => (
  <ToolbarItem
    propKey="alignItems"
    type="radio"
    label=""
    cols={true}
    options={[
      {
        label: (
          <Tooltip content="items-start" arrow={false} placement="bottom">
            <TbAlignLeft />
          </Tooltip>
        ),
        value: "items-start",
      },
      {
        label: (
          <Tooltip content="items-center" arrow={false} placement="bottom">
            <TbAlignCenter />
          </Tooltip>
        ),
        value: "items-center",
      },
      {
        label: (
          <Tooltip content="items-end" arrow={false} placement="bottom">
            <TbAlignRight />
          </Tooltip>
        ),
        value: "items-end",
      },
    ]}
  />
);
