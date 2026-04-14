/**
 * Viewport utilities — re-export barrel.
 *
 * The actual implementations live in domain-specific modules:
 *   - api.ts       — network operations (GetSignedUrl, SaveMedia, etc.)
 *   - propSystem.ts — prop read/write engine (changeProp, getProp, etc.)
 *   - nodeOps.tsx  — tree manipulation (deleteNode, buildClonedTree, etc.)
 *
 * This barrel re-exports everything so existing imports keep working.
 */

// API calls
export { GetHtmlToComponent, GetSignedUrl, SaveMedia, DeleteMedia } from "./api";

// Prop system
export {
  getProp,
  getPropFinalValue,
  setPropOnView,
  changeProp,
  propagatePropsToClones,
  type PropType,
} from "./propSystem";

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
