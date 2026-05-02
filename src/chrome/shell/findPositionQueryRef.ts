/**
 * Craft `findPosition` runs outside React — keep the latest `query` here so
 * placement coercion can walk the node tree (see coerceRootSectionDropTowardPageCanvas).
 */

let editorQuery: any = null;

export function setFindPositionEditorQuery(q: any) {
  editorQuery = q;
}

export function getFindPositionEditorQuery() {
  return editorQuery;
}
