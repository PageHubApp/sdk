// ─── Above-the-fold entrance animations ─────────────────────────────────────
//
// An entrance animation (fade-up, blur-in, …) starts its element at frame 0 —
// usually `opacity: 0` — and a scroll-triggered one stays there, paused, until
// the IntersectionObserver script adds `.ph-in-view`. On the first screen that
// hides the headline until the page's JS has run, and Lighthouse counts
// invisible text as unpainted: FCP and LCP wait for the fade, not the HTML.
//
// Both walkers render the header and the first content section without their
// entrance animation. Hover and continuous animations stay — they don't hide
// anything at first paint.

import { ANIMATION_PARAM_KEYS, cssAnimationPresets, isSiteAnimation } from "./animations";
import { SITE_ANIMATION_PREFIX } from "./siteAnimationConstants";

type NodeMap = Record<string, any>;

const ENTRANCE_TRIGGERS = new Set(["scroll", "load"]);

/** Start-hidden overlays (modals, mobile drawers) carry a bare `hidden` class. */
function startsHidden(node: any): boolean {
  const cls = node?.props?.className;
  return typeof cls === "string" && cls.split(/\s+/).includes("hidden");
}

/** Does this node carry an animation that hides it at first paint? */
function hasEntranceAnimation(node: any, themeAnimations: any[]): boolean {
  const root = node?.props?.root;
  const key = root?.animation;
  if (typeof key !== "string" || !key) return false;

  let trigger: string | undefined;
  if (isSiteAnimation(key)) {
    const slug = key.slice(SITE_ANIMATION_PREFIX.length);
    trigger = themeAnimations.find(a => a?.key === slug)?.trigger ?? "scroll";
  } else {
    const preset = cssAnimationPresets[key];
    if (!preset || preset.group !== "Entrance") return false;
    trigger = preset.trigger;
  }
  return ENTRANCE_TRIGGERS.has(root.animationTrigger || trigger);
}

/**
 * Ids of the nodes painted on the first screen: every header subtree, plus the
 * first visible content section. On a page container that's the page's first
 * child. Positional, like the LCP image pick — node-map order means nothing.
 */
function aboveFoldNodeIds(nodes: NodeMap): Set<string> {
  const ids = new Set<string>();
  const addSubtree = (id: string) => {
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      if (ids.has(cur) || !nodes[cur]) continue;
      ids.add(cur);
      const kids = nodes[cur].nodes;
      if (Array.isArray(kids)) stack.push(...kids);
    }
  };

  let foundSection = false;
  for (const id of (nodes.ROOT?.nodes as string[]) || []) {
    const node = nodes[id];
    if (!node || startsHidden(node)) continue;
    const type = node.props?.type;
    if (type === "header") {
      addSubtree(id);
      continue;
    }
    if (type === "footer" || foundSection) continue;
    if (type === "page") {
      const first = ((node.nodes as string[]) || []).find(c => nodes[c] && !startsHidden(nodes[c]));
      if (first) addSubtree(first);
    } else {
      addSubtree(id);
    }
    foundSection = true;
  }
  return ids;
}

/**
 * The node map with entrance animations removed from the first screen. Returns
 * the input unchanged when there's nothing to strip; never mutates it — the
 * same map can be an editor's or a cache's.
 */
export function withoutAboveFoldEntrances<T extends NodeMap>(nodes: T): T {
  if (!nodes?.ROOT) return nodes;
  const themeAnimations = nodes.ROOT.props?.theme?.animations;
  const siteAnims = Array.isArray(themeAnimations) ? themeAnimations : [];

  let out: NodeMap | null = null;
  for (const id of aboveFoldNodeIds(nodes)) {
    const node = nodes[id];
    if (!hasEntranceAnimation(node, siteAnims)) continue;
    const root = { ...node.props.root };
    delete root.animation;
    for (const k of ANIMATION_PARAM_KEYS) delete root[k];
    out ??= { ...nodes };
    out[id] = { ...node, props: { ...node.props, root } };
  }
  return (out as T) ?? nodes;
}
