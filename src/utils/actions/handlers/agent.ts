import type { NodeAction } from "../../action";
import { setState } from "../../state/stateRegistry";
import { actionGatePasses } from "../gates";
import { ActionContext, chain, interpolateItem } from "../internal";

export function attachAgentSend(
  prop: any,
  action: NodeAction,
  enabled: boolean,
  context?: ActionContext
) {
  if (action.type !== "agent-send") return;
  chain(prop, "onClick", (e, run) => {
    run(e);
    if (enabled) return;
    if (!actionGatePasses(action)) return;
    e.preventDefault();
    const btn = e.currentTarget as HTMLElement | null;
    const root = btn?.closest("[data-ph-agent-chat]") as HTMLElement | null;
    if (!root) return;
    const rawFieldName = (action as any).field || "agentMessage";
    const fieldName = interpolateItem(rawFieldName, context?.itemContext) ?? rawFieldName;
    const field = root.querySelector(`[name="${fieldName}"]`) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    const value = (field?.value || "").trim();
    if (!value) return;
    // Write to the chat's outbox state slot. The chat's DOM `id` (set by
    // the wrapper from its anchor map, e.g. `ph-chat-${nodeId}`) is the
    // namespace — multiple chats on one page can coexist without collision.
    const chatId = root.id || "ph-chat-default";
    try {
      setState(
        `${chatId}:outbox`,
        {
          kind: "value",
          value: JSON.stringify({ nonce: Date.now(), value }),
        },
        "agent-send"
      );
    } catch {}
    if (field) {
      field.value = "";
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.focus();
    }
  });
}
