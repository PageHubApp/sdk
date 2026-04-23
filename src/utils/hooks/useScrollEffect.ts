/**
 * useScrollEffect — GSAP ScrollTrigger-powered scroll effects.
 *
 * Supported effects:
 * - horizontal-scroll: Pin + translate children horizontally
 * - scroll-timeline: Pin section, each child animates independently at its own scroll progress
 *
 * GSAP is loaded dynamically inside the effect so SSR / Node tooling (e.g. registry scripts)
 * never hits static `gsap/ScrollTrigger` ESM interop issues.
 */

import { useEffect, type RefObject } from "react";

// ─── Scroll Timeline Presets ────────────────────────────────────────────────

export const SCROLL_TIMELINE_PRESETS: Record<
  string,
  { from: Record<string, unknown>; to: Record<string, unknown> }
> = {
  fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
  fadeOut: { from: { opacity: 1 }, to: { opacity: 0 } },
  scaleUp: { from: { scale: 0.3, opacity: 0 }, to: { scale: 1, opacity: 1 } },
  slideLeft: { from: { x: 200, opacity: 0 }, to: { x: 0, opacity: 1 } },
  slideRight: { from: { x: -200, opacity: 0 }, to: { x: 0, opacity: 1 } },
  slideUp: { from: { y: 100, opacity: 0 }, to: { y: 0, opacity: 1 } },
  slideDown: { from: { y: -100, opacity: 0 }, to: { y: 0, opacity: 1 } },
  rotateIn: { from: { rotation: 15, opacity: 0 }, to: { rotation: 0, opacity: 1 } },
  fadeScale: {
    from: { scale: 0.5, opacity: 0, filter: "blur(8px)" },
    to: { scale: 1, opacity: 1, filter: "blur(0px)" },
  },
  slideRotate: {
    from: { x: 200, rotation: -15, opacity: 0 },
    to: { x: 0, rotation: 0, opacity: 1 },
  },
};

type GsapRuntime = typeof import("gsap").default;

async function loadGsap(): Promise<GsapRuntime> {
  const gsap = (await import("gsap")).default;
  const stMod = await import("gsap/ScrollTrigger");
  const ScrollTrigger = (stMod as { ScrollTrigger?: unknown }).ScrollTrigger;
  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger as never);
  return gsap;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface ScrollEffectOptions {
  effect: string;
  direction?: "ltr" | "rtl";
  snap?: boolean;
  speed?: number;
  smoothing?: number;
  runway?: number;
  enabled?: boolean;
}

export function useScrollEffect(
  sectionRef: RefObject<HTMLElement | null>,
  options: ScrollEffectOptions
) {
  const {
    effect,
    direction = "ltr",
    snap = false,
    speed = 1.5,
    smoothing = 0.8,
    runway = 3,
    enabled = false,
  } = options;

  useEffect(() => {
    if (!effect || enabled || !sectionRef.current) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    void (async () => {
      const gsap = await loadGsap();
      if (cancelled || !sectionRef.current) return;
      const section = sectionRef.current;

      switch (effect) {
        case "horizontal-scroll":
          ctx = initHorizontalScroll(gsap, section, { direction, snap, speed, smoothing });
          break;
        case "scroll-timeline":
          ctx = initScrollTimeline(gsap, section, { runway, smoothing });
          break;
      }
    })();

    return () => {
      cancelled = true;
      if (ctx) ctx.revert();
    };
  }, [effect, enabled, direction, snap, speed, smoothing, runway]);
}

// ─── Horizontal Scroll ─────────────────────────────────────────────────────

function initHorizontalScroll(
  gsap: GsapRuntime,
  section: HTMLElement,
  opts: { direction: string; snap: boolean; speed: number; smoothing: number }
) {
  const sticky = section.querySelector(".ph-hscroll-sticky") as HTMLElement;
  const track = section.querySelector(".ph-hscroll-track") as HTMLElement;
  if (!sticky || !track) return;

  const overflow = track.scrollWidth - section.offsetWidth;
  if (overflow <= 0) return;

  const isRTL = opts.direction === "rtl";
  const panelCount = track.children.length;
  const snapVal =
    opts.snap && panelCount > 1
      ? { snapTo: 1 / (panelCount - 1), duration: { min: 0.2, max: 0.5 }, ease: "power1.inOut" }
      : false;

  if (isRTL) gsap.set(track, { x: -overflow });

  return gsap.context(() => {
    gsap
      .timeline({
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
      })
      .to(track, { x: isRTL ? 0 : -overflow, ease: "none" });
  }, section);
}

// ─── Scroll Timeline ────────────────────────────────────────────────────────
// Pins the section, then each child with [data-scroll-timeline] animates
// independently at its own scroll progress range.

function initScrollTimeline(
  gsap: GsapRuntime,
  section: HTMLElement,
  opts: { runway: number; smoothing: number }
) {
  const children = Array.from(section.querySelectorAll("[data-scroll-timeline]")) as HTMLElement[];
  if (children.length === 0) return;

  return gsap.context(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        pin: true,
        scrub: opts.smoothing,
        end: () => `+=${window.innerHeight * opts.runway}`,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    children.forEach(child => {
      try {
        const config = JSON.parse(child.getAttribute("data-scroll-timeline") || "{}");
        const preset = SCROLL_TIMELINE_PRESETS[config.preset];
        if (!preset) return;

        const start = (config.startProgress ?? 0) / 100;
        const end = (config.endProgress ?? 100) / 100;
        const duration = Math.max(0.01, end - start);

        gsap.set(child, preset.from);
        tl.to(child, { ...preset.to, duration, ease: "none" }, start);
      } catch {
        // Invalid JSON — skip this child
      }
    });
  }, section);
}
