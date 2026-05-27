import { ROOT_NODE } from "@craftjs/utils";
import { useEditor, useNode } from "@craftjs/core";
import { useCallback } from "react";
import { normalizeDesignTags } from "@/utils/normalizeDesignTags";
import { SlotRenderer } from "../../../../registry";

/**
 * Per-node AI context (designNotes / designTags). ROOT is edited in Site Settings only.
 */
export function NodeAiContextSection() {
  const { id } = useNode();
  const { actions } = useEditor();

  const { designNotes, designTags } = useEditor(state => {
    const design = state.nodes[id]?.data?.props?.design;
    const notes: string = typeof design?.notes === "string" ? design.notes : "";
    const dt = Array.isArray(design?.tags) ? design.tags : [];
    const tags: string[] = normalizeDesignTags(
      dt.filter((t: unknown): t is string => typeof t === "string")
    );
    return { designNotes: notes, designTags: tags };
  });

  const setDesignNotes = useCallback(
    (v: string) => {
      const next = v.slice(0, 1200);
      actions.setProp(id, (props: Record<string, any>) => {
        const t = next.trim();
        if (!props.design) props.design = {};
        if (t) props.design.notes = t;
        else delete props.design.notes;
        if (Object.keys(props.design).length === 0) delete props.design;
      });
    },
    [actions, id]
  );

  const setDesignTags = useCallback(
    (tags: string[]) => {
      const normalized = normalizeDesignTags(tags);
      actions.setProp(id, (props: Record<string, any>) => {
        if (!props.design) props.design = {};
        if (normalized.length) props.design.tags = normalized;
        else delete props.design.tags;
        if (Object.keys(props.design).length === 0) delete props.design;
      });
    },
    [actions, id]
  );

  if (id === ROOT_NODE) {
    return (
      <p className="text-neutral-content text-sm">
        Page-wide design notes and tags are edited in your site&apos;s settings.
      </p>
    );
  }

  return (
    <>
      <p className="text-neutral-content mb-3 text-xs">
        Optional brief for models when this node is in scope. Page-wide defaults still apply from
        your site&apos;s settings.
      </p>
      <SlotRenderer
        id="node/ai-context-editor"
        ctx={{
          designNotes,
          setDesignNotes,
          designTags,
          setDesignTags,
          fieldIdPrefix: `toolbar-ai-ctx-${id}-`,
        }}
        fallback={
          <p className="text-neutral-content text-xs italic">AI editor not available.</p>
        }
      />
    </>
  );
}
