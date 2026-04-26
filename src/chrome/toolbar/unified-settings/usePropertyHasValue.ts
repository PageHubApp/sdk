/**
 * usePropertyHasValue — true when a property has any value set on the current node.
 *
 * Used by PropertySection to decide whether to render a non-pinned row.
 * Reads via the existing getPropFinalValue plumbing so it sees breakpoint
 * variants (sm:, md:, …) and dark variants too.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { getPropFinalValue } from "../../viewport/propSystem";
import { ViewAtom } from "../../viewport/atoms";
import { ViewSelectionAtom } from "../Label";

import type { PropertyDef } from "./registry/propertyDefs";

export function usePropertyHasValue(def: PropertyDef): boolean {
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const propsForRead = useNode(node => {
    const className = node.data?.props?.className || "";
    const componentVal =
      def.propType === "component" ? node.data?.props?.[def.propKey || def.id] : undefined;
    return { className, componentVal };
  });

  const propKey = def.propKey || def.id;
  const propType = def.propType || "class";

  // Component props: simple presence check
  if (propType === "component") {
    const v = propsForRead.componentVal;
    return v !== undefined && v !== null && v !== "";
  }

  // Class props: scan all breakpoints/dark via getPropFinalValue
  const result = getPropFinalValue(
    { propKey, propType },
    view,
    { className: propsForRead.className },
    classDark
  );
  return result.value != null && result.value !== "";
}
