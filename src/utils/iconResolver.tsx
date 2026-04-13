import React from "react";
import { getMediaContent } from "./lib";
import { iconRegistry } from "./data/icon-registry";

/**
 * Resolve an icon reference to a renderable component
 * Supports:
 * - ref-icon:brands/facebook - Icon registry reference (Font Awesome)
 * - ref-google:home - Google Material Symbol
 * - ref-image:123 - Image reference (uses media library)
 * - <svg>...</svg> - Legacy SVG HTML
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

  // Handle ref-icon: format - resolve from icon registry
  if (value.startsWith("ref-icon:")) {
    const key = value.replace("ref-icon:", "");
    const entry = iconRegistry[key];
    if (!entry) {
      console.warn(`ref-icon: unknown icon "${key}"`);
      return null;
    }
    return React.createElement("svg", {
      dangerouslySetInnerHTML: { __html: entry.svg },
      fill: "currentColor",
      width: "100%",
      height: "100%",
      viewBox: entry.viewBox,
      xmlns: "http://www.w3.org/2000/svg",
    });
  }

  // Legacy: Direct icon name (e.g., "FaFacebook") - NO LONGER SUPPORTED
  if (!value.startsWith("<") && !value.startsWith("ref-")) {
    console.warn(`Direct icon names are deprecated. Use ref-icon: or ref-google: format.`);
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
 * Convert an icon path (e.g. "/icons/fa/brands/facebook.svg") to ref-icon: format.
 * Also passes through values that are already in ref- format or legacy SVG.
 */
export function iconToRef(iconName: string): string {
  if (!iconName) return "";
  if (iconName.startsWith("ref-")) return iconName;
  if (iconName.startsWith("<")) return iconName; // Keep legacy SVG
  // Convert FA path to ref-icon: key (e.g. "/icons/fa/brands/facebook.svg" → "ref-icon:brands/facebook")
  const faMatch = iconName.match(/\/icons\/fa\/(.+)\.svg$/);
  if (faMatch) return `ref-icon:${faMatch[1]}`;
  return iconName;
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
