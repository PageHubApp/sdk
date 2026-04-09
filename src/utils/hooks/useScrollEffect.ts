/**
 * useScrollEffect — GSAP ScrollTrigger-powered scroll effects.
 *
 * Supported effects:
 *   - horizontal-scroll: Pin + translate children horizontally
 *   - parallax-stack: Children overlap and slide over each other at different speeds
 *   - scale-reveal: Section starts scaled down/blurred, grows to full on scroll
 *   - stagger-cascade: Children animate in one-by-one, scroll-linked (reverses on scroll back)
 */

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export interface ScrollEffectOptions {
  effect: string;
  direction?: "ltr" | "rtl";
  snap?: boolean;
  speed?: number;
  smoothing?: number;
  enabled?: boolean;
}

export function useScrollEffect(
  sectionRef: RefObject<HTMLElement | null>,
  options: ScrollEffectOptions,
) {
  const {
    effect,
    direction = "ltr",
    snap = false,
    speed = 1.5,
    smoothing = 0.8,
    enabled = false,
  } = options;

  useEffect(() => {
    if (!effect || enabled || !sectionRef.current) return;
    if (typeof window === "undefined") return;

    const section = sectionRef.current;
    let ctx: gsap.Context | undefined;

    switch (effect) {
      case "horizontal-scroll":
        ctx = initHorizontalScroll(section, { direction, snap, speed, smoothing });
        break;
      case "parallax-stack":
        ctx = initParallaxStack(section, { speed, smoothing });
        break;
      case "scale-reveal":
        ctx = initScaleReveal(section, { smoothing });
        break;
      case "stagger-cascade":
        ctx = initStaggerCascade(section, { speed, smoothing });
        break;
    }

    return () => { if (ctx) ctx.revert(); };
  }, [effect, enabled, direction, snap, speed, smoothing]);
}

// ─── Horizontal Scroll ─────────────────────────────────────────────────────

function initHorizontalScroll(
  section: HTMLElement,
  opts: { direction: string; snap: boolean; speed: number; smoothing: number },
) {
  const sticky = section.querySelector(".ph-hscroll-sticky") as HTMLElement;
  const track = section.querySelector(".ph-hscroll-track") as HTMLElement;
  if (!sticky || !track) return;

  const overflow = track.scrollWidth - section.offsetWidth;
  if (overflow <= 0) return;

  const isRTL = opts.direction === "rtl";
  const panelCount = track.children.length;
  const snapVal = opts.snap && panelCount > 1
    ? { snapTo: 1 / (panelCount - 1), duration: { min: 0.2, max: 0.5 }, ease: "power1.inOut" }
    : false;

  if (isRTL) gsap.set(track, { x: -overflow });

  return gsap.context(() => {
    gsap.timeline({
      scrollTrigger: {
        trigger: section,
        pin: sticky,
        scrub: opts.smoothing,
        end: () => `+=${overflow * opts.speed}`,
        snap: snapVal as any,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    }).to(track, { x: isRTL ? 0 : -overflow, ease: "none" });
  }, section);
}

// ─── Parallax Stack ─────────────────────────────────────────────────────────
// Each direct child of the section scrolls at a different speed, creating
// a layered parallax effect. Later children move slower (appear to be behind).

function initParallaxStack(
  section: HTMLElement,
  opts: { speed: number; smoothing: number },
) {
  const children = Array.from(section.children) as HTMLElement[];
  if (children.length < 2) return;

  return gsap.context(() => {
    children.forEach((child, i) => {
      // Each child gets progressively slower parallax
      // First child = normal speed, last child = much slower
      const factor = 1 - (i / children.length) * 0.6; // 1.0 → 0.4
      const yMove = 100 * factor * opts.speed;

      gsap.to(child, {
        y: -yMove,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: opts.smoothing,
          invalidateOnRefresh: true,
        },
      });
    });
  }, section);
}

// ─── Scale Reveal ───────────────────────────────────────────────────────────
// Section starts scaled down and blurred, reveals to full size as you scroll in.

function initScaleReveal(
  section: HTMLElement,
  opts: { smoothing: number },
) {
  return gsap.context(() => {
    gsap.from(section, {
      scale: 0.85,
      opacity: 0.3,
      filter: "blur(8px)",
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top 85%",
        end: "top 20%",
        scrub: opts.smoothing,
        invalidateOnRefresh: true,
      },
    });
  }, section);
}

// ─── Stagger Cascade ────────────────────────────────────────────────────────
// Direct children animate in one by one as the section scrolls through the viewport.
// Scroll-linked: they reverse if you scroll back up.

function initStaggerCascade(
  section: HTMLElement,
  opts: { speed: number; smoothing: number },
) {
  const children = Array.from(section.children) as HTMLElement[];
  if (children.length === 0) return;

  return gsap.context(() => {
    gsap.from(children, {
      y: 60,
      opacity: 0,
      filter: "blur(4px)",
      stagger: 0.15,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top 80%",
        end: () => `+=${children.length * 120 * opts.speed}`,
        scrub: opts.smoothing,
        invalidateOnRefresh: true,
      },
    });
  }, section);
}
