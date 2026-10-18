import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useMemo } from "react";
import type { MediaDesignContext } from "./types";

/**
 * The site's design notes / tags from `ROOT.props.design`, for the Media
 * Manager's AI metadata actions. Editor shells pass this to
 * `useMediaManager({ designContext })`; hosts outside the editor pass their own.
 */
export function useEditorDesignContext(): MediaDesignContext {
  const { notes, tags } = useEditor(state => {
    const design = state.nodes[ROOT_NODE]?.data?.props?.design as
      | { notes?: unknown; tags?: unknown }
      | undefined;
    return {
      notes: typeof design?.notes === "string" ? design.notes : undefined,
      tags: Array.isArray(design?.tags) ? (design.tags as string[]) : undefined,
    };
  });
  return useMemo(() => ({ notes, tags }), [notes, tags]);
}
