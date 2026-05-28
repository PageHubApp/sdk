/**
 * `ph.ai.*` commands — AI assistant entry points. The chat-attachment
 * variant for selected nodes lives on `ph.node.aiContext`.
 */
import React from "react";
import { TbWand } from "react-icons/tb";
import type { CommandDef } from "../../types";
import { setAtomExternal } from "../../../utils/atoms/external";
import { AssistantOpenAtom } from "../../../utils/atoms";
import { panelClose } from "../../../utils/usePanelUrl";
import { tiptapIncludeTextInChatRun } from "./text";

export const AI_COMMANDS: CommandDef[] = [
  {
    id: "ph.ai.openAssistant",
    title: "AI assistant",
    category: "AI",
    icon: <TbWand />,
    when: ctx => Boolean(ctx.isAiEnabled),
    run: (_ctx, args) => {
      const a = (args ?? {}) as Record<string, unknown>;
      // Default: reveal the panel. Allow callers to pass through any
      // AssistantOpen payload (mode, promptHint, scope, etc.) via `args`.
      const payload = {
        revealPanel: true,
        ...a,
      };
      setAtomExternal(AssistantOpenAtom, payload as any);
      panelClose();
    },
  },
  {
    id: "ph.ai.includeTextInChat",
    title: "Include text in AI chat",
    category: "AI",
    icon: <TbWand />,
    when: ctx => Boolean(ctx.tiptap?.active && ctx.isAiEnabled),
    run: () => tiptapIncludeTextInChatRun(),
  },
  // `ph.ai.includeNodeInChat` was a duplicate of `ph.node.aiContext` (same
  // semantics: append the selected node to AiChatAttachedNodesAtom + reveal
  // panel). Removed in Phase 2 C2i; use `ph.node.aiContext` instead.
];
