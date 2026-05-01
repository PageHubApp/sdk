import { ROOT_NODE } from "@craftjs/utils";
import { useEditor, useNode } from "@craftjs/core";
import React, { useCallback } from "react";
import { TbWand } from "react-icons/tb";
import { normalizeDesignTags } from "@/utils/normalizeDesignTags";
import { ToolbarSection } from "../../ToolbarSection";
import { SiteAiToneForm } from "../../../viewport/modals/site-settings/SiteAiToneForm";

/**
 * Per-node AI context (designNotes / designTags). ROOT is edited in Site Settings only.
 */
export function NodeAiContextSection() {
  const { id } = useNode();
  const { actions } = useEditor();

  const designNotes = useEditor(state => {
    const design = state.nodes[id]?.data?.props?.design;
    return typeof design?.notes === "string" ? design.notes : "";
  });

  const designTags = useEditor(state => {
    const design = state.nodes[id]?.data?.props?.design;
    const dt = Array.isArray(design?.tags) ? design.tags : [];
    return normalizeDesignTags(dt.filter((t: unknown): t is string => typeof t === "string"));
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
        Page-wide design notes and tags are edited in{" "}
        <span className="text-base-content font-medium">Site Settings → AI</span>.
      </p>
    );
  }

  return (
    <>
      <p className="text-neutral-content mb-3 text-xs">
        Optional brief for models when this node is in scope. Page-wide defaults still apply from
        Site Settings → AI.
      </p>
      <SiteAiToneForm
        fieldIdPrefix={`toolbar-ai-ctx-${id}-`}
        designNotes={designNotes}
        setDesignNotes={setDesignNotes}
        designTags={designTags}
        setDesignTags={setDesignTags}
        showIntroHeading={false}
      />
    </>
  );
}
