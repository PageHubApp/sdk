/**
 * The `{{anchor.<name>}}` ids each wrapper component opens for its subtree, as a function of the wrapper's node id.
 *
 * ONE table, read by the React wrappers (`<AnchorProvider anchors={…}>`), the static walker's `staticScope`, and the
 * HTML-first converter's `resolveAnchorScopes` — so an id a trigger points at and the id its panel carries are the same
 * string on every route, unique per instance (two bubbles never collide).
 */
export type AnchorMap = Readonly<Record<string, string>>;

export const ANCHOR_SCOPES: Readonly<Record<string, (nodeId: string) => AnchorMap>> = {
  AgentChat: id => ({ chat: `agent-chat-${id}` }),
  AgentFloatingBubble: id => ({ panel: `agent-bubble-${id}`, trigger: `agent-bubble-${id}-trigger` }),
  CartDrawer: id => ({ panel: `cart-drawer-${id}`, backdrop: `cart-backdrop-${id}` }),
  CheckoutBanner: id => ({ success: `checkout-banner-${id}-success`, cancel: `checkout-banner-${id}-cancel` }),
};

/** The anchors a node of this component type opens, or null when it opens none. */
export function anchorsFor(type: string, nodeId: string): AnchorMap | null {
  return ANCHOR_SCOPES[type]?.(nodeId) ?? null;
}
