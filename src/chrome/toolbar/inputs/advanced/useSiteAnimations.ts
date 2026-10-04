/**
 * useSiteAnimations — read + write the site's own animations
 * (`ROOT.props.theme.animations`). Nodes reference one as
 * `root.animation: "site:<key>"`.
 *
 * Writes go through `resolveTheme` → `writeTheme` so every other theme key
 * survives. Multi-node writes (save-and-assign, delete-and-unassign) share one
 * undo step via `createMergedActions`.
 */
import { useEditor, type NodeId } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useMemo } from "react";
import { createMergedActions, type MergedActions } from "@/chrome/shell/spatial/mergedActions";
import { ANIMATION_PARAM_KEYS } from "@/utils/animations/animations";
import {
  SITE_ANIMATION_PREFIX,
  sanitizeSiteAnimations,
  type SiteAnimation,
} from "@/utils/animations/siteAnimations";
import { resolveTheme, writeTheme } from "@/utils/design/resolveTheme";

type ListUpdate = (list: SiteAnimation[]) => SiteAnimation[];

function writeList(batch: MergedActions, update: ListUpdate) {
  batch.setProp(ROOT_NODE, props => {
    const current = resolveTheme(props);
    writeTheme(props, { ...current, animations: update(current.animations || []) });
  });
}

const upsert =
  (anim: SiteAnimation): ListUpdate =>
  list => {
    const idx = list.findIndex(a => a.key === anim.key);
    if (idx === -1) return [...list, anim];
    const next = [...list];
    next[idx] = anim;
    return next;
  };

export function useSiteAnimations() {
  // Collect the raw reference; sanitize once per change instead of per render.
  const { raw, actions, query } = useEditor(state => ({
    raw: state.nodes[ROOT_NODE]?.data?.props?.theme?.animations as unknown,
  }));
  const animations = useMemo(() => sanitizeSiteAnimations(raw), [raw]);

  /** Ids of every node whose `root.animation` is `site:<key>`. */
  const nodesUsing = (key: string): NodeId[] => {
    const target = `${SITE_ANIMATION_PREFIX}${key}`;
    return Object.entries(query.getNodes())
      .filter(([, node]) => (node as any)?.data?.props?.root?.animation === target)
      .map(([id]) => id);
  };

  /** Create or replace by key. Pass `assignTo` to also select it on that node. */
  const save = (anim: SiteAnimation, assignTo?: NodeId) => {
    const batch = createMergedActions(actions);
    writeList(batch, upsert(anim));
    if (!assignTo) return;
    batch.setProp(assignTo, props => {
      if (!props.root) props.root = {};
      props.root.animationEngine = "css";
      props.root.animation = `${SITE_ANIMATION_PREFIX}${anim.key}`;
    });
  };

  /** Remove the animation and clear it from every node that used it. */
  const remove = (key: string) => {
    const users = nodesUsing(key);
    const batch = createMergedActions(actions);
    writeList(batch, list => list.filter(a => a.key !== key));
    for (const id of users) {
      batch.setProp(id, props => {
        if (!props.root) return;
        props.root.animation = "";
        ANIMATION_PARAM_KEYS.forEach(k => delete props.root[k]);
      });
    }
  };

  return { animations, save, remove, nodesUsing };
}
