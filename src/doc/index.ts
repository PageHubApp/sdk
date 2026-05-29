/**
 * `@pagehub/sdk/doc` — unified document model.
 *
 * One typed `Doc` / `NodeRef` interface, two backends:
 *   - `createLiveDoc({ query, actions })` for client / editor consumers
 *   - `createStaticDoc(flat)`            for server / mcp-core
 *
 * See `./types.ts` for the surface.
 */

export type {
  ComponentTypeName,
  Doc,
  InsertTarget,
  NodeData,
  NodeInput,
  NodeRef,
} from "./types";

export { createLiveDoc } from "./liveDoc";
export type { CraftQuery, CraftActions } from "./liveDoc";

export { createStaticDoc } from "./staticDoc";
export type { FlatNodeMap } from "./staticDoc";
