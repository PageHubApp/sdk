/**
 * Craft-free resolver map — what each `node.type.resolvedName` from a
 * serialized NodeMap renders to inside `RenderTree`.
 *
 * Re-exports the canonical `renderMap` from
 * `../components/resolvers/renders.ts` as-is. Entries are NOT wrapped with
 * `withConditionalVisibility`: `RenderTree` evaluates `conditionGroups` in
 * the walker itself ([RenderTree.tsx](./RenderTree.tsx)), so HOC-wrapping
 * would double-evaluate conditions per node — and `cv()` pulls in
 * `@craftjs/core`, which would defeat the whole point of the Craft-free
 * render bundle.
 *
 * Add new components to `renderMap`, not here.
 */
import { renderMap, type RenderMap } from "../../components/resolvers/renders";

export type UiResolver = RenderMap;

export const uiResolver: UiResolver = renderMap;
