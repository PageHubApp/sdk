import { TbAlignCenter, TbAlignLeft, TbAlignRight } from "react-icons/tb";
import { ToolbarItem } from "../../ToolbarItem";

export const AlignItemsInput = () => (
  <ToolbarItem
    propKey="alignItems"
    type="radio"
    label=""
    cols={true}
    options={[
      { label: <TbAlignLeft />, value: "items-start" },
      { label: <TbAlignCenter />, value: "items-center" },
      { label: <TbAlignRight />, value: "items-end" },
    ]}
  />
);
