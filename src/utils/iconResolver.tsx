import React from "react";
import { getMediaContent } from "./lib";
import { useIconSvg, type IconSvgEntry, type IconSvgMap } from "./icons/IconSvgMapContext";

/**
 * Resolve an icon reference to a renderable node using a pre-built iconMap.
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
 * React hook form — resolves icon via context + client fetch fallback for refs
 * that aren't pre-seeded (e.g. newly picked in the editor).
 */
export function useResolvedIcon(
  value: string | undefined,
  query?: any,
): React.ReactNode {
  const iconRef = value?.startsWith("ref-icon:") ? value : undefined;
  const entry = useIconSvg(iconRef);

  if (!value || typeof value !== "string") return null;

  if (value.startsWith("ref-image:")) {
    const imageId = value.replace("ref-image:", "");
    const mediaUrl = query ? getMediaContent(query, imageId) : null;
    if (!mediaUrl) return null;
    return <img src={mediaUrl} alt="Icon" className="size-full object-contain" />;
  }

  if (value.startsWith("ref-icon:")) {
    if (!entry) return null;
    return renderIconSvg(entry);
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
