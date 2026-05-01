/**
 * @pagehub/sdk — defineComponent()
 *
 * Unified API for registering components — used by both built-in SDK
 * components and external consumers. One definition drives the editor,
 * viewer, static renderer, and toolbox.
 *
 * Usage:
 * ```ts
 * import { defineComponent } from "@pagehub/sdk";
 * import { TbStar } from "react-icons/tb";
 *
 * const Rating = defineComponent({
 *   name: "Rating",
 *   component: RatingStars,
 *   icon: TbStar,
 *   props: {
 *     value: { type: "slider", label: "Rating", min: 0, max: 5 },
 *   },
 * });
 * ```
 */

export { BUILT_IN_NAMES } from "./builtins";
export { CustomComponentsContext, useCustomComponents } from "./context";
export { defineComponent } from "./defineComponent";
export { processForEditor } from "./processors/forEditor";
export { processForStatic } from "./processors/forStatic";
export { processForViewer } from "./processors/forViewer";
export type {
  ComponentModifier,
  ComponentPreset,
  PageHubComponentDef,
  PeerInheritConfig,
  PresetAddChildConfig,
  PropSchema,
  ResolvedComponentDef,
} from "./types";
