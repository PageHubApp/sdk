import React from "react";
import { getMediaContent } from "../media/media";
import {
  useIconSvg,
  useIconSprite,
  type IconSvgEntry,
  type IconSvgMap,
} from "./IconSvgMapContext";
import { parseIconRef } from "./collectIconRefs";

/**
 * Sync resolver — used when caller already has the iconMap (SSR static HTML path).
 * Supports:
 *   ref-icon:<set>/<Name>  — e.g. ref-icon:tb/TbShoppingCart
 *   ref-image:<id>         — image from media library (requires pageMedia)
 */
export function resolveIcon(
  value: string | undefined,
  pageMedia?: any[] | null,
  iconMap?: IconSvgMap
): React.ReactNode {
  if (!value || typeof value !== "string") return null;

  if (value.startsWith("ref-image:")) {
    const imageId = value.replace("ref-image:", "");
    const mediaUrl = pageMedia ? getMediaContent(pageMedia, imageId) : null;
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

// Convert kebab-case SVG attrs (stroke-width) to React camelCase (strokeWidth).
const SVG_ATTR_MAP: Record<string, string> = {
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-miterlimit": "strokeMiterlimit",
  "stroke-dasharray": "strokeDasharray",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
};

function toReactSvgAttrs(attrs: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!attrs) return out;
  for (const [k, v] of Object.entries(attrs)) {
    out[SVG_ATTR_MAP[k] ?? k] = v;
  }
  return out;
}

export function renderIconSvg(entry: IconSvgEntry): React.ReactElement {
  // Preserved attrs (stroke/fill/stroke-width/etc.) from the original react-icons
  // component. If absent (older registry), fall back to fill="currentColor" for
  // compatibility with solid icon sets.
  const preserved = toReactSvgAttrs(entry.attrs);
  const hasPreserved = Object.keys(preserved).length > 0;
  return React.createElement("svg", {
    dangerouslySetInnerHTML: { __html: entry.svg },
    ...(hasPreserved ? preserved : { fill: "currentColor" }),
    className: "ph-icon-svg",
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
  pageMedia?: any[] | null
): React.ReactNode {
  const iconRef = value?.startsWith("ref-icon:") ? value : undefined;
  const entry = useIconSvg(iconRef);
  const spriteReady = useIconSprite(entry ? undefined : iconRef);

  if (!value || typeof value !== "string") return null;

  if (value.startsWith("ref-image:")) {
    const imageId = value.replace("ref-image:", "");
    const mediaUrl = pageMedia ? getMediaContent(pageMedia, imageId) : null;
    if (!mediaUrl) return null;
    return <img src={mediaUrl} alt="Icon" className="size-full object-contain" />;
  }

  if (value.startsWith("ref-icon:")) {
    if (entry) return renderIconSvg(entry);
    const parsed = parseIconRef(value);
    if (!parsed) return null;
    if (!spriteReady) return null;
    // Sprite sheet: the <symbol> carries the stroke/fill attrs (per updated
    // generator), so the outer <svg> here doesn't need to hardcode fill —
    // inherit from the symbol. Keep fill="currentColor" as a safe fallback for
    // older sprites rebuilt pre-fix.
    return (
      <svg className="ph-icon-svg" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
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
