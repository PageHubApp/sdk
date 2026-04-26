/**
 * Section icon registry — string keys → react-icons components.
 *
 * Schema files reference icons by string ("TbTypography") to stay JSX-free.
 * Resolved here at render time. Add new icons by importing them and adding to
 * the map. Not lazy — react-icons individual imports are tree-shaken and tiny.
 */
import React from "react";
import {
  TbAccessible,
  TbAdjustments,
  TbArrowsExchange,
  TbArrowsHorizontal,
  TbArrowsMaximize,
  TbBolt,
  TbBorderAll,
  TbBorderOuter,
  TbBoxMargin,
  TbBoxPadding,
  TbBrandTailwind,
  TbChevronsDown,
  TbCode,
  TbDatabase,
  TbEyeSearch,
  TbHandMove,
  TbLayout,
  TbLayoutAlignCenter,
  TbLock,
  TbPointer,
  TbSettings2,
  TbSparkles,
  TbStack2,
  TbTypography,
  TbWand,
} from "react-icons/tb";
import { PiImageFill } from "react-icons/pi";

const iconMap: Record<string, React.ComponentType> = {
  TbAccessible,
  TbAdjustments,
  TbArrowsExchange,
  TbArrowsHorizontal,
  TbArrowsMaximize,
  TbBolt,
  TbBorderAll,
  TbBorderOuter,
  TbBoxMargin,
  TbBoxPadding,
  TbBrandTailwind,
  TbChevronsDown,
  TbCode,
  TbDatabase,
  TbEyeSearch,
  TbHandMove,
  TbLayout,
  TbLayoutAlignCenter,
  TbLock,
  TbPointer,
  TbSettings2,
  TbSparkles,
  TbStack2,
  TbTypography,
  TbWand,
  PiImageFill,
};

export function resolveSectionIcon(ref: React.ReactNode | string | undefined): React.ReactNode {
  if (!ref) return null;
  if (typeof ref !== "string") return ref;
  const Cmp = iconMap[ref];
  if (!Cmp) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[sectionIcons] unknown icon "${ref}" — add it to iconMap`);
    }
    return null;
  }
  return <Cmp />;
}

export function registerSectionIcon(key: string, component: React.ComponentType) {
  iconMap[key] = component;
}
