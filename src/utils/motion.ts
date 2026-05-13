import React from "react";

let motionPromise: Promise<typeof import("framer-motion")> | null = null;
const loadMotion = () => {
  if (!motionPromise) motionPromise = import("framer-motion");
  return motionPromise;
};

const wrapperCache = new WeakMap<object, React.ComponentType<any>>();
const stringWrapperCache = new Map<string, React.ComponentType<any>>();

const getWrapper = (tagOrComponent: any): React.ComponentType<any> => {
  const isString = typeof tagOrComponent === "string";
  const cached = isString
    ? stringWrapperCache.get(tagOrComponent)
    : wrapperCache.get(tagOrComponent);
  if (cached) return cached;

  const Wrapper = React.forwardRef<any, any>(function MotionLazy(props, ref) {
    const [Comp, setComp] = React.useState<any>(null);
    React.useEffect(() => {
      let active = true;
      loadMotion().then(m => {
        if (active) setComp(() => m.motion.create(tagOrComponent));
      });
      return () => {
        active = false;
      };
    }, []);
    const Rendered = Comp || tagOrComponent;
    return React.createElement(Rendered, { ...props, ref });
  }) as unknown as React.ComponentType<any>;

  if (isString) stringWrapperCache.set(tagOrComponent, Wrapper);
  else wrapperCache.set(tagOrComponent, Wrapper);
  return Wrapper;
};

/**
 * Wraps a tag/component with `motion.create()` when the node has a
 * non-CSS animation preset. CSS-only presets pass through unchanged.
 *
 * framer-motion is lazy-loaded — only fetched when a non-CSS animation
 * actually mounts, keeping ~120KB off viewer route chunks.
 */
export const motionIt = (props: any, tagOrComponent: any, enabled = false) => {
  const anim = props.root?.animation;
  if (!anim || enabled) return tagOrComponent;
  if (anim.startsWith("css")) return tagOrComponent;
  return getWrapper(tagOrComponent);
};
