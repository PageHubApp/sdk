import React, { useRef } from "react";

import { useScrollEffect } from "../utils/hooks/useScrollEffect";

interface ScrollEffectInputs {
  scrollEffect?: string;
  scrollDirection?: any;
  scrollSnap?: any;
  scrollSpeed?: any;
  scrollSmoothing?: any;
  scrollTimelineRunway?: any;
}

/**
 * Wires GSAP ScrollTrigger setup AND the prop-shaping bits Container needs to
 * mount the section. Returns a `wrapProp` mutator the caller invokes after
 * its `prop` object is assembled — it merges the section ref, adds the
 * horizontal-scroll sticky wrapper when needed, and is a no-op when no
 * scroll effect is configured.
 *
 * Hook stays at the top of Container's render body (Rules of Hooks); the
 * mutator runs at the same point the inline block used to.
 */
export function useContainerScrollEffect(
  props: ScrollEffectInputs,
  enabled: boolean
): { wrapProp: (prop: any) => void } {
  const sectionRef = useRef<HTMLElement>(null);
  const hasScrollEffect = !!props.scrollEffect;
  const isHScroll = props.scrollEffect === "horizontal-scroll";

  useScrollEffect(sectionRef, {
    effect: props.scrollEffect || "",
    direction: props.scrollDirection,
    snap: props.scrollSnap,
    speed: props.scrollSpeed,
    smoothing: props.scrollSmoothing,
    runway: props.scrollTimelineRunway,
    enabled,
  });

  const wrapProp = (prop: any) => {
    if (!hasScrollEffect) return;
    const origRef = prop.ref;
    prop.ref = (r: any) => {
      sectionRef.current = r;
      if (origRef) origRef(r);
    };
    // Horizontal scroll needs wrapper divs; other effects operate directly on the section.
    if (isHScroll) {
      prop.className = (prop.className || "") + " relative";
      if (!enabled) {
        prop.children = (
          <div className="ph-hscroll-sticky" style={{ height: "100vh", overflow: "hidden" }}>
            <div
              className="ph-hscroll-track"
              style={{ display: "flex", height: "100%", willChange: "transform" }}
            >
              {prop.children}
            </div>
          </div>
        );
      }
    }
  };

  return { wrapProp };
}
