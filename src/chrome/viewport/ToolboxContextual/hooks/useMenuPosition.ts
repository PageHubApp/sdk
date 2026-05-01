import type { CSSProperties, RefObject } from "react";
import { useLayoutEffect, useState } from "react";
import { MENU_W } from "../utils/menuClasses";

interface UseMenuPositionArgs {
  enabled: boolean;
  x: number;
  y: number;
  id: string;
  hasAnyMenuItems: boolean;
  ref: RefObject<HTMLDivElement | null>;
}

export function useMenuPosition({ enabled, x, y, id, hasAnyMenuItems, ref }: UseMenuPositionArgs) {
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!enabled) {
      setStyle({});
      return;
    }
    if (!hasAnyMenuItems) return;

    const PAD = 8;
    const winH = window.innerHeight;
    const winW = window.innerWidth;

    const clamp = (width: number, height: number) => {
      let left = x;
      let top = y;
      if (left + width > winW - PAD) left = Math.max(PAD, winW - PAD - width);
      if (top + height > winH - PAD) top = Math.max(PAD, winH - PAD - height);
      if (left < PAD) left = PAD;
      if (top < PAD) top = PAD;
      setStyle({ left, top, position: "fixed" });
    };

    const el = ref.current;
    if (el) {
      const { width, height } = el.getBoundingClientRect();
      clamp(width, height);
    } else {
      clamp(MENU_W, 280);
    }
  }, [enabled, x, y, id, hasAnyMenuItems, ref]);

  return style;
}
