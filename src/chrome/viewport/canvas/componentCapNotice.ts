import type { PageHubFeatures } from "../../../types";
import { EditorSaveBannerAtom } from "../../../utils/atoms";
import { setAtomExternal } from "../../../utils/atoms/external";
import { componentCapMessage, editorAtComponentCap } from "./componentCap";

/**
 * Refuse a new reusable component at the host's cap
 * (`features.maxReusableComponents`): say why in the editor's notice banner
 * and return true. Every path that makes one calls it first.
 */
export function blockedByComponentCap(
  query: any,
  max: PageHubFeatures["maxReusableComponents"]
): boolean {
  if (!editorAtComponentCap(query, max)) return false;
  setAtomExternal(EditorSaveBannerAtom, { message: componentCapMessage(max as number) });
  return true;
}
