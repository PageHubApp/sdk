import React from "react";
import { getMediaContent } from "./lib";
import {
  useIconSvg,
  useIconSprite,
  type IconSvgEntry,
  type IconSvgMap,
} from "./icons/IconSvgMapContext";
import { parseIconRef } from "./icons/collectIconRefs";

/**
 * Sync resolver — used when caller already has the iconMap (SSR static HTML path).
 * Supports:
 *   ref-icon:<set>/<Name>  — e.g. ref-icon:tb/TbShoppingCart
 *   ref-image:<id>         — image from media library (requires query)
 */
export function resolveIcon(
  value: string | undefined,
  query?: any,
  iconMap?: IconSvgMap,
): React.ReactNode {
  if (!value || typeof value !== "string") return null;

  if (value.startsWith("ref-image:")) {
    const imageId = value.replace("ref-image:", "");
    const mediaUrl = query ? getMediaContent(query, imageId) : null;
    if (!mediaUrl) return null;
    return <img src={mediaUrl} alt="Icon" className="size-full object-contain" />;
  }

  if (value.startsWith("ref-icon:")) {
    const entry = iconMap?.[value];
    if (!entry) return null;
    return renderIconSvg(entry);
  }

  return null;
}

export function renderIconSvg(entry: IconSvgEntry): React.ReactElement {
  return React.createElement("svg", {
    dangerouslySetInnerHTML: { __html: entry.svg },
    fill: "currentColor",
    width: "100%",
    height: "100%",
    viewBox: entry.viewBox,
    xmlns: "http://www.w3.org/2000/svg",
  });
}

/**
 * React hook form — prefers the SSR-seeded map (inline SVG) and falls back to
 * a sprite-sheet `<use href>` reference for icons picked post-SSR in the editor.
 */
export function useResolvedIcon(
  value: string | undefined,
  query?: any,
): React.ReactNode {
  const iconRef = value?.startsWith("ref-icon:") ? value : undefined;
  const entry = useIconSvg(iconRef);
  const spriteReady = useIconSprite(entry ? undefined : iconRef);

  if (!value || typeof value !== "string") return null;

  if (value.startsWith("ref-image:")) {
    const imageId = value.replace("ref-image:", "");
    const mediaUrl = query ? getMediaContent(query, imageId) : null;
    if (!mediaUrl) return null;
    return <img src={mediaUrl} alt="Icon" className="size-full object-contain" />;
  }

  if (value.startsWith("ref-icon:")) {
    if (entry) return renderIconSvg(entry);
    const parsed = parseIconRef(value);
    if (!parsed) return null;
    if (!spriteReady) return null;
    return (
      <svg fill="currentColor" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <use href={`#${parsed.name}`} />
      </svg>
    );
  }

  return null;
}

/**
 * Convert a legacy icon value to `ref-icon:` format. Pass-through for values
 * already in ref-* form.
 */
export function iconToRef(iconName: string): string {
  if (!iconName) return "";
  if (iconName.startsWith("ref-")) return iconName;
  return iconName;
}

/**
 * Extract the key portion of a ref (`set/Name`) from a `ref-icon:` string.
 */
export function refToIconName(ref: string): string {
  if (!ref || typeof ref !== "string") return "";
  if (ref.startsWith("ref-icon:")) return ref.replace("ref-icon:", "");
  return ref;
}
