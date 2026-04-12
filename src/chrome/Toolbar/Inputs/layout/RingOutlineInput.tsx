import { useNode } from "@craftjs/core";
import { ToolbarSection } from "../../ToolbarSection";
import { TbFocus2 } from "react-icons/tb";
import { TailwindInput } from "../advanced/TailwindInput";
import { ColorInput } from "../color/ColorInput";
import { UniversalInput } from "../UniversalInput";
import type { ValueType } from "../UniversalInput/types";

const RING_OUTLINE_ALLOWED_TYPES: ValueType[] = [
  "tailwind",
  "calc",
  "px",
  "%",
  "em",
  "rem",
  "vw",
  "vh",
  "vmin",
  "vmax",
];

function stripResponsivePrefix(cls: string) {
  return cls.replace(/^(sm:|md:|lg:|xl:|2xl:|hover:)/, "");
}

/** `ring-*` except `ring-offset*` (width, inset, color on the ring itself). */
function hasRingUtility(className: string) {
  if (!className) return false;
  return className.split(/\s+/).some(raw => {
    const c = stripResponsivePrefix(raw);
    if (!c.startsWith("ring")) return false;
    if (c.startsWith("ring-offset")) return false;
    return true;
  });
}

/** Any `ring-offset*` (width or offset color). */
function hasRingOffsetUtility(className: string) {
  if (!className) return false;
  return className.split(/\s+/).some(raw => {
    const c = stripResponsivePrefix(raw);
    return c.startsWith("ring-offset");
  });
}

/** `outline*` except `outline-offset*`. */
function hasOutlineUtility(className: string) {
  if (!className) return false;
  return className.split(/\s+/).some(raw => {
    const c = stripResponsivePrefix(raw);
    if (!c.startsWith("outline")) return false;
    if (c.startsWith("outline-offset")) return false;
    return true;
  });
}

export const RingOutlineInput = ({ index = "" }) => {
  const { props } = useNode(node => ({
    props: node.data.props,
  }));

  const cn = props?.className || "";

  return (
    <ToolbarSection
      title="Ring & outline"
      icon={<TbFocus2 />}
      nested={true}
      collapsible={true}
      defaultOpen={false}
    >
      <UniversalInput
        propKey="ringWidth"
        propType="class"
        propTag="ring"
        label="Ring width"
        tailwindKey="ringWidth"
        index={index}
        showVarSelector={true}
        placeholder=""
        allowedTypes={RING_OUTLINE_ALLOWED_TYPES}
        inline
        inputWidth="flex-1"
      />

      {hasRingUtility(cn) && (
        <ColorInput
          propKey="ringColor"
          label="Ring color"
          prefix="ring"
          propType="class"
          index={index}
          inline
        />
      )}

      <UniversalInput
        propKey="ringOffsetWidth"
        propType="class"
        propTag="ring-offset"
        label="Ring offset"
        tailwindKey="ringOffsetWidth"
        index={index}
        showVarSelector={true}
        placeholder=""
        allowedTypes={RING_OUTLINE_ALLOWED_TYPES}
        inline
        inputWidth="flex-1"
      />

      {hasRingOffsetUtility(cn) && (
        <ColorInput
          propKey="ringOffsetColor"
          label="Offset color"
          prefix="ring-offset"
          propType="class"
          index={index}
          inline
        />
      )}

      <UniversalInput
        propKey="outlineWidth"
        propType="class"
        propTag="outline"
        label="Outline"
        tailwindKey="outlineWidth"
        index={index}
        showVarSelector={true}
        placeholder=""
        allowedTypes={RING_OUTLINE_ALLOWED_TYPES}
        inline
        inputWidth="flex-1"
      />

      {hasOutlineUtility(cn) && (
        <ColorInput
          propKey="outlineColor"
          label="Outline color"
          prefix="outline"
          propType="class"
          index={index}
          inline
        />
      )}

      <UniversalInput
        propKey="outlineOffset"
        propType="class"
        propTag="outline-offset"
        label="Outline offset"
        tailwindKey="outlineOffset"
        index={index}
        showVarSelector={true}
        placeholder=""
        allowedTypes={RING_OUTLINE_ALLOWED_TYPES}
        inline
        inputWidth="flex-1"
      />

      <TailwindInput
        propKey="outlineStyle"
        label="Outline style"
        prop="outlineStyle"
        type="select"
      />
    </ToolbarSection>
  );
};
