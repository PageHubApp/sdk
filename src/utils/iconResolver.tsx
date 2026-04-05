import React from "react";
import { getMediaContent } from "./lib";

/**
 * Resolve an icon reference to a renderable component
 * Supports:
 * - ref-icon:FaFacebook - React icon reference
 * - ref-google:home - Google Material Symbol
 * - ref-image:123 - Image reference (uses media library)
 * - <svg>...</svg> - Legacy SVG HTML
 * - FaFacebook - Legacy icon name
 */
export function resolveIcon(value: string | undefined, query?: any): React.ReactNode {
  if (!value || typeof value !== "string") return null;

  // Handle ref-google: format (Google Material Symbols)
  if (value.startsWith("ref-google:")) {
    const iconName = value.replace("ref-google:", "");
    return iconName;
  }

  // Handle ref-image: format - render as img tag (supports SVG, URL, CDN)
  if (value.startsWith("ref-image:")) {
    const imageId = value.replace("ref-image:", "");
    const mediaUrl = query ? getMediaContent(query, imageId) : null;

    if (!mediaUrl) return null;

    return <img src={mediaUrl} alt="Icon" className="size-full object-contain" />;
  }

  // Handle ref-icon: format - NO LONGER SUPPORTED
  // Icons are now stored as actual SVG content
  if (value.startsWith("ref-icon:")) {
    console.warn(`ref-icon: format is deprecated. Icons should be stored as SVG content.`);
    return null;
  }

  // Legacy: Direct icon name (e.g., "FaFacebook") - NO LONGER SUPPORTED
  if (!value.startsWith("<") && !value.startsWith("ref-")) {
    console.warn(`Direct icon names are deprecated. Icons should be stored as SVG content.`);
    return null;
  }

  // Legacy: SVG HTML string
  return React.createElement("svg", {
    dangerouslySetInnerHTML: { __html: value },
    fill: "currentColor",
    width: "100%",
    height: "100%",
    viewBox: "0 0 24 24",
  });
}

/**
 * Convert icon name to ref format - DEPRECATED
 * Icons should now be stored as actual SVG content
 */
export function iconToRef(iconName: string): string {
  if (!iconName) return "";
  if (iconName.startsWith("ref-")) return iconName;
  if (iconName.startsWith("<")) return iconName; // Keep legacy SVG
  console.warn(`iconToRef is deprecated. Icons should be stored as SVG content.`);
  return iconName; // Return as-is instead of creating ref-icon: prefix
}

/**
 * Extract icon name from ref format
 */
export function refToIconName(ref: string): string {
  if (!ref || typeof ref !== "string") return "";
  if (ref.startsWith("ref-icon:")) {
    return ref.replace("ref-icon:", "");
  }
  return ref;
}
