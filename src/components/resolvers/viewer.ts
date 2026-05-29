/**
 * Viewer resolver — CraftJS-shaped component map for the editor and
 * disabled-`<Editor>` viewers (`/view/`, `/static/`, side-by-side preview).
 *
 * Derived from the canonical `renderMap` in `./renders.ts`: every entry is
 * wrapped with `withConditionalVisibility` so node-level `conditions` /
 * `conditionGroups` fire inside CraftJS contexts. Names listed in
 * `SKIP_CONDITIONAL_VISIBILITY` (currently only `Background`) pass through
 * unwrapped — see `./renders.ts` for the reasoning.
 *
 * Add new components to `renderMap`, not here.
 */
import { withConditionalVisibility } from "../../utils/conditions/withConditionalVisibility";
import {
  renderMap,
  SKIP_CONDITIONAL_VISIBILITY,
  type RenderMap,
} from "./renders";

export const viewerResolver: RenderMap = Object.fromEntries(
  Object.entries(renderMap).map(([name, Render]) =>
    SKIP_CONDITIONAL_VISIBILITY.has(name)
      ? [name, Render]
      : [name, withConditionalVisibility(Render as any)]
  )
);
