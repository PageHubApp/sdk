import { useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useMemo } from "react";
import { IsolateAtom } from "../../utils/lib";

export interface ActivePage {
  pageNodeId: string;
  displayName?: string;
}

/**
 * Returns the active page node (the page the canvas is currently isolated to),
 * or undefined when the canvas is showing all pages or isolated to a component.
 */
export function useEditorActivePage(): ActivePage | undefined {
  const isolate = useAtomValue(IsolateAtom);
  const { query } = useEditor();
  return useMemo(() => {
    const raw = typeof isolate === "string" ? isolate.trim() : "";
    if (!raw) return undefined;
    try {
      let id = raw;
      for (let d = 0; d < 25; d++) {
        const node = query.node(id).get();
        if (!node?.data) return undefined;
        if (node.data.props?.type === "page") {
          return {
            pageNodeId: id,
            displayName: node.data.custom?.displayName as string | undefined,
          };
        }
        const p = node.data.parent;
        if (!p) return undefined;
        id = p;
      }
    } catch {}
    return undefined;
  }, [isolate, query]);
}
