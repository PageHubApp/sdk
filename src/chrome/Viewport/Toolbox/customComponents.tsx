/**
 * Toolbox rendering for custom components registered via defineComponent().
 *
 * Converts ResolvedComponentDef presets into draggable RenderToolComponent
 * entries, using the same pattern as built-in toolbox files.
 */
import React from "react";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";
import type { ResolvedComponentDef } from "../../../define";
import {
  TbAt, TbBrandTwitter, TbChevronDown, TbContainer, TbCode,
  TbDeviceMobile, TbForms, TbInputSearch, TbLayoutColumns,
  TbLayoutNavbar, TbLayoutRows, TbTextCaption,
  TbList, TbMap, TbMap2, TbMapPin, TbMinus, TbMusic, TbPhoto, TbPhotoScan, TbPill,
  TbSpace, TbVideo, TbPuzzle, TbMail, TbAppWindow, TbStar,
  TbCalendarEvent, TbCalendar, TbCalendarTime,
  TbCreditCard, TbCoffee, TbShoppingBag, TbClipboardList,
  TbBrandSpotify, TbBrandInstagram, TbBrandX,
  TbMessageCircle,
} from "react-icons/tb";
import { BsBodyText } from "react-icons/bs";
import { FaFont } from "react-icons/fa";
import { HiOutlineMinus } from "react-icons/hi";
import { LuImage } from "react-icons/lu";
import { MdShortText } from "react-icons/md";
import { RiImageAddLine } from "react-icons/ri";
import { RxButton } from "react-icons/rx";

/** Map of icon name strings → actual react-icons components */
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  TbAt, TbBrandTwitter, TbChevronDown, TbContainer, TbCode,
  TbDeviceMobile, TbForms, TbInputSearch, TbLayoutColumns,
  TbLayoutNavbar, TbLayoutRows, TbTextCaption,
  TbList, TbMap, TbMap2, TbMapPin, TbMinus, TbMusic, TbPhoto, TbPhotoScan, TbPill,
  TbSpace, TbVideo, TbPuzzle, TbMail, TbAppWindow, TbStar,
  TbCalendarEvent, TbCalendar, TbCalendarTime,
  TbCreditCard, TbCoffee, TbShoppingBag, TbClipboardList,
  TbBrandSpotify, TbBrandInstagram, TbBrandX,
  TbMessageCircle,
  BsBodyText, FaFont, HiOutlineMinus, LuImage,
  MdShortText, RiImageAddLine, RxButton,
};

/** Resolve an icon value to a React component suitable for ToolboxItemDisplay */
function resolveIcon(icon: any): React.ComponentType<any> {
  if (!icon) return TbPuzzle;
  // String name → look up in icon map
  if (typeof icon === "string" && ICON_MAP[icon]) return ICON_MAP[icon];
  // Already a component function (e.g. TbStar)
  if (typeof icon === "function") return icon;
  // React element — wrap in a component
  if (React.isValidElement(icon)) {
    const IconWrapper = () => icon;
    IconWrapper.displayName = "ResolvedIcon";
    return IconWrapper;
  }
  // Emoji or unknown string — render as text
  if (typeof icon === "string") {
    const EmojiIcon = () => <span className="text-lg">{icon}</span>;
    EmojiIcon.displayName = "EmojiIcon";
    return EmojiIcon;
  }
  return TbPuzzle;
}

/**
 * Build toolbox entries for raw extra presets (like Nav's ButtonList-based presets).
 * These specify their own `element` and don't go through defineComponent().
 */
export function buildExtraPresetEntries(
  presets: Array<{ label: string; icon?: any; element: any; props?: Record<string, any>; children?: any }>,
): React.ReactElement[] {
  return presets.map((preset, i) => {
    const IconComp = resolveIcon(preset.icon);
    const children = typeof preset.children === "function" ? preset.children() : preset.children;
    return (
      <RenderToolComponent
        key={`extra-preset-${i}`}
        element={preset.element}
        display={<ToolboxItemDisplay icon={IconComp} label={preset.label} />}
        custom={{ displayName: preset.label }}
        {...(preset.props || {})}
      >
        {children}
      </RenderToolComponent>
    );
  });
}

/**
 * Build toolbox entries for a defineComponent() definition.
 * Returns an array of React elements (one per preset, or one default).
 */
export function buildCustomToolboxEntries(def: ResolvedComponentDef): React.ReactElement[] {
  const presets = def.presets.length > 0
    ? def.presets
    : [{ label: def.displayName, icon: def.icon, props: def.defaultProps }];

  return presets.map((preset, i) => {
    const IconComp = resolveIcon(preset.icon || def.icon);
    // Resolve children — can be ReactNode or a factory function
    const children = typeof preset.children === "function"
      ? preset.children()
      : preset.children;
    return (
      <RenderToolComponent
        key={`${def.name}-preset-${i}`}
        element={def.component}
        display={<ToolboxItemDisplay icon={IconComp} label={preset.label} />}
        custom={{ displayName: preset.label }}
        {...def.defaultProps}
        {...(preset.props || {})}
      >
        {children}
      </RenderToolComponent>
    );
  });
}
