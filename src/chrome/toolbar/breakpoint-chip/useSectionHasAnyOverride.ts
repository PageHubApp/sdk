import { useMemo } from "react";
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { getPropFinalValue } from "../../viewport/viewportExports";
import { IndicatorDensityAtom } from "../../viewport/atoms";
import { BP_KEYS } from "../../../utils/breakpointRewrite";

/**
 * Returns `true` when ANY of the given propKeys has at least one explicit
 * non-base override (sm | md | lg | xl | 2xl). Drives the small dot rendered
 * next to a section title — "expand to see what is overridden inside".
 *
 * Density preference is consulted: returns `false` when density is `off`.
 */
export function useSectionHasAnyOverride(
  propKeys: string[] | undefined,
  propType: string = "class"
): boolean {
  const { nodeProps } = useNode((n: any) => ({ nodeProps: n.data?.props }));
  const density = useAtomValue(IndicatorDensityAtom);

  return useMemo(() => {
    if (density === "off") return false;
    if (!propKeys || propKeys.length === 0) return false;
    for (const k of propKeys) {
      for (const bp of BP_KEYS) {
        const r = getPropFinalValue(
          { propKey: k, propType, index: null, propItemKey: null },
          bp,
          nodeProps,
          false
        );
        if (r.viewValue === bp && r.value != null && r.value !== "") return true;
      }
    }
    return false;
  }, [propKeys, propType, nodeProps, density]);
}
