/**
 * Viewport utilities — re-export barrel.
 *
 * The actual implementations live in domain-specific modules:
 *   - api.ts       — network operations (GetHtmlToComponent, DeleteMedia).
 *     Image uploads go through `@/utils/media/upload` (`uploadImageToCdn`).
 *   - propSystem.ts — prop read/write engine (changeProp, getProp, etc.)
 *   - nodeOps.tsx  — tree manipulation (deleteNode, buildClonedTree, etc.)
 */

// API calls
export { GetHtmlToComponent, DeleteMedia } from "./api";

// Prop system
export { getProp, getPropFinalValue, setPropOnView, changeProp, type PropType } from "./propSystem";

// Node operations
export {
  removeHasManyRelation,
  deleteNode,
  addHandler,
  saveHandler,
  getNodeTree,
  buildClonedTree,
  type Position,
  type Align,
} from "./nodeOps";
