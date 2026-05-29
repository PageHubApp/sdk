import { TailwindStyles } from "../../../../utils/tailwind/tailwind";
import { ToolbarItem } from "../../ToolbarItem";
import { sdkLog } from "../../../../utils/logger";

function getTailwindStyleStringList(prop: string): string[] | null {
  const raw = (TailwindStyles as Record<string, unknown>)[prop];
  if (!Array.isArray(raw) || raw.length === 0) return null;
  if (!raw.every((x): x is string => typeof x === "string")) return null;
  return raw;
}

export const TailwindInput = ({ type = "select", propKey, min = 0, label, prop }) => {
  const valueLabels = getTailwindStyleStringList(prop);
  if (!valueLabels) {
    if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
      sdkLog.warn(
        `[TailwindInput] Missing or empty TailwindStyles["${String(prop)}"] (propKey=${String(propKey)})`
      );
    }
    return null;
  }

  return (
    <ToolbarItem
      propKey={propKey}
      type={type}
      label={label}
      max={valueLabels.length - 1}
      min={min}
      valueLabels={valueLabels}
      inline
    />
  );
};
