/**
 * Device frame specs for the editor canvas Device mode.
 *
 * Each Tailwind canvas breakpoint (mobile / sm / md / lg / xl / 2xl) maps to a
 * frame "kind" — phone, tablet, laptop, monitor — with its own bezel chrome,
 * inner content dimensions, and a small decoration overlay (notch, camera dot,
 * laptop chin, monitor stand).
 *
 * Width/height are *content* dimensions; bezel padding is added around the
 * inner viewport. Auto-fit zoom uses (innerW + bezelX, innerH + bezelY).
 */

export type DeviceFrameKind = "phone" | "tablet" | "laptop" | "monitor";

export const DEVICE_FRAME_BY_VIEW: Record<string, DeviceFrameKind> = {
  mobile: "phone",
  sm: "phone",
  md: "tablet",
  lg: "tablet",
  xl: "laptop",
  "2xl": "monitor",
};

export type DeviceFrameSpec = {
  kind: DeviceFrameKind;
  /** Content (inner) width in CSS px. */
  innerWidth: number;
  /** Content (inner) height in CSS px. */
  innerHeight: number;
  /** Total horizontal bezel chrome (left + right) added to innerWidth. */
  bezelX: number;
  /** Total vertical bezel chrome (top + bottom) added to innerHeight. */
  bezelY: number;
  /** Tailwind classes for the outer frame box. */
  outerClassName: string;
  /** Tailwind classes for the inner viewport box. */
  innerClassName: string;
  /** Inline padding for the outer frame (asymmetric for laptop/monitor chins). */
  framePadding: { top: number; right: number; bottom: number; left: number };
  /** Decoration kind for the chrome overlay (notch / camera / chin / stand). */
  decoration: "notch" | "camera-top" | "camera-side" | "laptop-chin" | "monitor-stand" | null;
};

const SLAB_OUTER =
  "mx-auto flex z-2 transition overflow-hidden shrink-0 bg-[#1a1a1a] border-[3px] border-[#2a2a2a] shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_20px_60px_-10px_rgba(0,0,0,0.5),0_0_40px_-5px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] relative";

const SLAB_INNER =
  "w-full h-full flex overflow-auto relative bg-base-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function getDeviceFrameSpec(
  view: string,
  customPhone?: { width: number; height: number },
  /** Resolved breakpoint pixel widths from `getCanvasBreakpointPx(theme)`. */
  bp?: { sm: number; md: number; lg: number; xl: number; "2xl": number }
): DeviceFrameSpec {
  const kind = DEVICE_FRAME_BY_VIEW[view] ?? "phone";
  // Default to Tailwind defaults when caller doesn't pass theme breakpoints.
  const widths = bp ?? { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };

  switch (kind) {
    case "phone": {
      // Phone presets — sm width follows site `sm` (rare for phones IRL but keeps
      // Device + SM coherent across custom breakpoints).
      const w = customPhone?.width ?? (view === "sm" ? widths.sm : 390);
      const h = customPhone?.height ?? (view === "sm" ? 1024 : 844);
      return {
        kind,
        innerWidth: w,
        innerHeight: h,
        bezelX: 18,
        bezelY: 18,
        outerClassName: `${SLAB_OUTER} rounded-[44px]`,
        innerClassName: `${SLAB_INNER} rounded-[38px]`,
        framePadding: { top: 6, right: 6, bottom: 6, left: 6 },
        decoration: "notch",
      };
    }

    case "tablet": {
      // md = portrait (site `md` width × 1024); lg = landscape (site `lg` × 768).
      const isLandscape = view === "lg";
      return {
        kind,
        innerWidth: isLandscape ? widths.lg : widths.md,
        innerHeight: isLandscape ? 768 : 1024,
        bezelX: 30,
        bezelY: 30,
        outerClassName: `${SLAB_OUTER} rounded-[28px]`,
        innerClassName: `${SLAB_INNER} rounded-[16px]`,
        framePadding: { top: 14, right: 15, bottom: 14, left: 15 },
        decoration: isLandscape ? "camera-side" : "camera-top",
      };
    }

    case "laptop": {
      // xl = site `xl` × 800 (16:10 — MacBook Air-ish).
      return {
        kind,
        innerWidth: widths.xl,
        innerHeight: 800,
        bezelX: 24,
        bezelY: 48,
        outerClassName: `${SLAB_OUTER} rounded-t-[14px] rounded-b-[20px]`,
        innerClassName: `${SLAB_INNER} rounded-[5px]`,
        framePadding: { top: 14, right: 12, bottom: 32, left: 12 },
        decoration: "laptop-chin",
      };
    }

    case "monitor": {
      // 2xl = site `2xl` × 864 (16:9 — desktop monitor).
      return {
        kind,
        innerWidth: widths["2xl"],
        innerHeight: 864,
        bezelX: 24,
        bezelY: 56,
        outerClassName: `${SLAB_OUTER} rounded-[10px]`,
        innerClassName: `${SLAB_INNER} rounded-[3px]`,
        framePadding: { top: 14, right: 12, bottom: 40, left: 12 },
        decoration: "monitor-stand",
      };
    }
  }
}
