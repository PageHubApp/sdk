import type { AssistantScope } from "./atoms";

type CraftQueryLike = {
  node: (id: string) => {
    get: () =>
      | { data?: { custom?: { displayName?: string }; displayName?: string; name?: string } }
      | null
      | undefined;
  };
};

/**
 * Payload for `AssistantOpenAtom` when opening the assistant from inline Text (wand / context menu).
 * Kept in SDK so TextEditor context menu and host `InlineCopyAssistantButton` stay aligned.
 */
export function buildInlineCopyAssistantOpenState(
  query: CraftQueryLike,
  textNodeId: string
): {
  nodeId?: string;
  mode: "edit";
  assistantScope: AssistantScope;
  promptHint: string;
  freshChat: boolean;
  revealPanel: boolean;
  contextNode?: { id: string; displayName: string };
} {
  const scope: AssistantScope = "text";
  const node = textNodeId && textNodeId !== "ROOT" ? query.node(textNodeId).get() : null;
  const displayName =
    (typeof node?.data?.custom?.displayName === "string" && node.data.custom.displayName.trim()) ||
    (typeof node?.data?.displayName === "string" && node.data.displayName.trim()) ||
    (typeof node?.data?.name === "string" && node.data.name.trim()) ||
    "Text";
  return {
    nodeId: textNodeId,
    mode: "edit",
    assistantScope: scope,
    promptHint: "",
    freshChat: true,
    revealPanel: true,
    ...(textNodeId && textNodeId !== "ROOT"
      ? { contextNode: { id: textNodeId, displayName } }
      : {}),
  };
}
