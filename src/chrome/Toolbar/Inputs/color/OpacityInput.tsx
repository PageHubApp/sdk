import { UniversalInput } from "../UniversalInput";

export const OpacityInput = ({
  propKey = "opacity",
  propType = "class",
  index = null,
  prefix = "",
  labelHide = false,
  label = "Opacity",
  inline = true,
}) => (
  <UniversalInput
    propKey={propKey}
    propType={propType}
    propTag="opacity"
    tailwindKey="opacity"
    allowedTypes={["tailwind", "calc", "%"]}
    label={label}
    labelHide={labelHide}
    index={index}
    showVarSelector={true}
    inline={inline}
  />
);
