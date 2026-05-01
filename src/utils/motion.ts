import { motion } from "framer-motion";

/**
 * Wraps a tag/component with `motion.create()` when the node has a
 * non-CSS animation preset. CSS-only presets pass through unchanged.
 */
export const motionIt = (props: any, tagOrComponent: any, enabled = false) => {
  const anim = props.root?.animation;
  if (!anim || enabled) return tagOrComponent;
  if (anim.startsWith("css")) return tagOrComponent;
  return motion.create(tagOrComponent);
};
