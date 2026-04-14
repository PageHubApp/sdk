import { TailwindStyles } from "@/utils/tailwind";
import { ToolbarItem } from "../../ToolbarItem";

export const OrderInput = () => (
  <ToolbarItem
    propKey="order"
    type="select"
    label="Order"
    max={TailwindStyles.order.length - 1}
    min={0}
    valueLabels={TailwindStyles.order}
    inline
  />
);
