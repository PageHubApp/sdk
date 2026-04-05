// @ts-nocheck
import { UniversalInput } from "../UniversalInput";

export const WidthInput = ({
  propType = "class",
  propKey = "width",
  propTag = "w",
  label = "Width",
  values = "allWidths",
  sliderValues = "width",
}) => {
  return (
    <UniversalInput
      propKey={propKey}
      propType={propType}
      propTag={propTag}
      label={label}
      tailwindKey={values}
      showVarSelector={true}
      placeholder=""
      allowedTypes={["tailwind", "calc", "px", "%", "em", "rem", "vw", "vh"]}
      inputWidth="flex-1"
    />
  );
};
