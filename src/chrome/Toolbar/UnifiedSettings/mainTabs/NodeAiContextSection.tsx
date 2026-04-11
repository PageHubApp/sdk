import { ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import React, { useCallback } from "react";
import { TbWand } from "react-icons/tb";
import { normalizeDesignTags } from "../../../../utils/normalizeDesignTags";
import { ToolbarSection } from "../../ToolbarSection";
import { SiteAiToneForm } from "../../../Viewport/SiteSettings/SiteAiToneForm";

/**
 * Per-node AI context (designNotes / designTags). ROOT is edited in Site Settings only.
 */
export function NodeAiContextSection() {
  const { id } = useNode();
  const { actions } = useEditor();

  const designNotes = useEditor(state => {
    const p = state.nodes[id]?.data?.props;
    return typeof p?.designNotes === "string" ? p.designNotes : "";
  });

  const designTags = useEditor(state => {
    const p = state.nodes[id]?.data?.props;
    const dt = Array.isArray(p?.designTags) ? p.designTags : [];
    return normalizeDesignTags(dt.filter((t): t is string => typeof t === "string"));
  });

  const setDesignNotes = useCallback(
    (v: string) => {
      const next = v.slice(0, 1200);
      actions.setProp(id, (props: Record<string, unknown>) => {
        const t = next.trim();
        props.designNotes = t ? t : undefined;
      });
    },
    [actions, id],
  );

  const setDesignTags = useCallback(
    (tags: string[]) => {
      const normalized = normalizeDesignTags(tags);
      actions.setProp(id, (props: Record<string, unknown>) => {
        props.designTags = normalized.length ? normalized : undefined;
      });
    },
    [actions, id],
  );

  if (id === ROOT_NODE) {
    return (
      <ToolbarSection
        title="AI context"
        icon={<TbWand />}
        defaultOpen={false}
        help="Page-wide tone lives in Site Settings (AI tab)."
      >
        <p className="text-sm text-neutral-content">
          Page-wide design notes and tags are edited in{" "}
          <span className="font-medium text-base-content">Site Settings → AI</span>.
        </p>
      </ToolbarSection>
    );
  }

  return (
    <ToolbarSection
      title="AI context"
      icon={<TbWand />}
      defaultOpen={false}
      help="Describe this component for AI (assistant, fills, text tools). Not shown on the published site."
    >
      <p className="mb-3 text-xs text-neutral-content">
        Optional brief for models when this node is in scope. Page-wide defaults still apply from Site Settings →
        AI.
      </p>
      <SiteAiToneForm
        fieldIdPrefix={`toolbar-ai-ctx-${id}-`}
        designNotes={designNotes}
        setDesignNotes={setDesignNotes}
        designTags={designTags}
        setDesignTags={setDesignTags}
        showIntroHeading={false}
      />
    </ToolbarSection>
  );
}
