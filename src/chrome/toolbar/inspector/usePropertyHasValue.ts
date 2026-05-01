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
import { propertyHasValue } from "./propertyHasValue";

import type { PropertyDef } from "./registry/propertyDefs";

export function usePropertyHasValue(def: PropertyDef): boolean {
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const propsForRead = useNode(node => ({
    className: node.data?.props?.className || "",
    componentProps: node.data?.props || {},
  }));

  // Bundles + shorthand + class/component props share the same logic.
  // Delegate to the pure helper so the rules only live in one place.
  if (def.input.type === "bundle" || def.input.type === "shorthand") {
    return propertyHasValue(
      def,
      propsForRead.className,
      propsForRead.componentProps,
      view,
      classDark
    );
  }

  const propKey = def.propKey || def.id;
  const propType = def.propType || "class";

  if (propType === "component") {
    const v = propsForRead.componentProps[propKey];
    return v !== undefined && v !== null && v !== "";
  }

  const result = getPropFinalValue(
    { propKey, propType },
    view,
    { className: propsForRead.className },
    classDark
  );
  return result.value != null && result.value !== "";
}
