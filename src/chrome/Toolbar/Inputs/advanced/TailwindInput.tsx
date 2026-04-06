import { TailwindStyles } from "utils/tailwind";
import { ToolbarItem } from "../../ToolbarItem";

export const TailwindInput = ({ type = "select", propKey, min = 0, label, prop }) => (
  <ToolbarItem
    propKey={propKey}
    type={type}
    label={label}
    max={TailwindStyles[prop].length - 1}
    min={min}
    valueLabels={TailwindStyles[prop]}
    inline
  />
);
