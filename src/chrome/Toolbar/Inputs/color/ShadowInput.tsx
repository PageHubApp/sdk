// @ts-nocheck
import { UniversalInput } from "../UniversalInput";

export const ShadowInput = ({
  propKey = "shadow",
  propType = "class",
  label = "Shadow",
  inline = true,
}) => (
  <UniversalInput
    propKey={propKey}
    propType={propType}
    propTag="shadow"
    tailwindKey="dropShadows"
    allowedTypes={["tailwind", "calc"]}
    label={label}
    showVarSelector={true}
    inline={inline}
  />
);
