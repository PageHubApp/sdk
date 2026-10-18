import { decompressAsync } from "../utils/compressionAsync";
import { clearLoadedPages, listPageNodeIds, markPageLoaded } from "../utils/page/pageManagement";
import { sanitizeCraftSerializedContent } from "../utils/sanitizeNodeMap";

/**
 * Replace the editor tree with a fetched one. Page fetches hand back the
 * tree LZ-compressed (a node map is accepted too), and the loaded-pages set
 * must follow the tree so the next save describes exactly what is in it.
 */
export async function applyFetchedTree(content: unknown, query: any, actions: any): Promise<void> {
  const raw = typeof content === "string" ? content : JSON.stringify(content);
  const json = raw.trimStart().startsWith("{") ? raw : await decompressAsync(raw);
  actions.history.ignore().deserialize(sanitizeCraftSerializedContent(json) || "");
  clearLoadedPages();
  for (const id of listPageNodeIds(query)) markPageLoaded(id);
}

/** `query.serialize()`, or null when Craft throws on nodes with unresolved types. */
export function safeSerialize(query: any): string | null {
  try {
    return query.serialize();
  } catch {
    return null;
  }
}
