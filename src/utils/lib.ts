// @ts-nocheck
/**
 * @pagehub/sdk — Utility functions (canonical shared copy)
 *
 * This is the single source of truth for shared utilities used by both
 * the SDK and the main app. The app resolves `utils/lib` to this file
 * via `tsconfig.json` paths (Turbopack / Next.js).
 */

import { ROOT_NODE } from "@craftjs/core";
import { motion } from "framer-motion";
import React, { useEffect } from "react";
import { atom } from "./atoms";
import { getCdnUrl, generateSrcSet, generateSizes } from "./cdn";
import { resolveCSSVariable } from "./design/colorSystem";
import {
  findFontFamilyClassToken,
  parseGoogleFontFromArbitraryClass,
  tailwindTokenBase,
} from "./tailwind/fontFamilyClass";

// NOTE: Do NOT add static imports for "./tailwind" or "slug" here.
// tailwind.ts imports from ./lib — a static import creates a circular dependency
// that breaks module initialization order (LazyUnifiedSettings registration fails).
// Use require() inside the functions that need them instead.

export { getCdnUrl };

export const enableContext = false;

export const siteTitle =
  "PageHub - Easy-to-Use Website Builder for Tailwind Developers – Free & SEO-Friendly";
export const siteDescription =
  "Build beautiful, responsive websites effortlessly with our free website builder, designed specifically for Tailwind CSS developers. Fast, intuitive, and SEO-optimized—create your site without writing boilerplate code";

// ─── Color Helpers (needed by generatePattern) ─────────────────────────

function extractRGBA(rgbaString) {
  const regex = /rgba\((\d{1,3}),(\d{1,3}),(\d{1,3}),(\d*(?:\.\d+)?)\)/;
  const matches = rgbaString.match(regex);

  if (!matches) {
    return null;
  }

  return {
    r: parseInt(matches[1]),
    g: parseInt(matches[2]),
    b: parseInt(matches[3]),
    a: parseFloat(matches[4]),
  };
}

function hexToHSL(H) {
  if (!H) return;

  const c = extractRGBA(H);

  if (!c) return;
  let { r, g, b, a } = c;

  let l = 0;
  r /= 255;
  g /= 255;
  b /= 255;

  const cmin = Math.min(r, g, b);
  const cmax = Math.max(r, g, b);
  const delta = cmax - cmin;
  let h = 0;
  let s = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return `hsla(${h},${s}%,${l}%,${a})`;
}

// ─── Recoil Atoms ───────────────────────────────────────────────────────

const localStorageEffect = key => ({setSelf, onSet}) => {
  if (typeof window !== 'undefined') {
    const savedValue = localStorage.getItem(key)
    if (savedValue != null) {
      setSelf(JSON.parse(savedValue));
    }
    onSet((newValue, _, isReset) => {
      isReset
        ? localStorage.removeItem(key)
        : localStorage.setItem(key, JSON.stringify(newValue));
    });
  }
};

export const IsolateAtom = atom("isolate", "");

export const ComponentsAtom = atom("components", []);

export const OnlineAtom = atom("online", true);

export const ScreenshotAtom = atom("ss", false);

export const SideBarAtom = atom("sidebar", true);

export const SideBarOpen = atom("sidebaropen", true);

export const DesignSystemSidebarAtom = atom("designSystemSidebar", false);

export const ViewModeAtom = atom("viewMode", "page");

export const OpenComponentEditorAtom = atom("openComponentEditor", null);

export const LastctiveAtom = atom("lastActive", "");

export const ActiveAtom = atom("active", "");

export const HeaderMenuAtom = atom("headerMenu", {
  isOpen: false,
  activeTab: "components",
  menuType: "",
});

export const SelectedSectionAtom = atom("selectedSection", null);

// ─── Submissions (registerable handler) ─────────────────────────────────

type SubmissionHandler = (submission: any, settings: any, additional?: any) => Promise<any> | void;
let _saveSubmissions: SubmissionHandler = () => {};
export const registerSubmissionHandler = (fn: SubmissionHandler) => { _saveSubmissions = fn; };
export const SaveSubmissions = (submission: any, settings: any, additional?: any) => _saveSubmissions(submission, settings, additional);

// ─── Stylesheet helpers ─────────────────────────────────────────────────

export const getStyleSheets = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const links = document.getElementsByTagName("link") || [];
  const filtered = [];
  let i = links.length;
  while (i--) {
    links[i].rel === "stylesheet" && filtered.push(links[i].href);
  }

  return filtered;
};

// ─── Pattern Generation ─────────────────────────────────────────────────

export const generatePattern = props => {
  const {
    pattern,
    patternVerticalPosition,
    patternHorizontalPosition,
    patternStroke,
    patternZoom,
    patternAngle,
    patternSpacingX,
    patternSpacingY,
  } = props.root;

  if (!pattern) return "";

  let {
    stroke,
    scale,
    spacing,
    angle,
    moveLeft,
    moveTop,
    vHeight,
    mode,
    path,
    width,
    height,
    colors: maxColors,
  } = pattern;

  const join = 1;
  stroke = patternStroke || 1;
  moveLeft = patternHorizontalPosition || 0;
  moveTop = patternVerticalPosition || 0;
  maxColors = maxColors || 0;
  scale = patternZoom || 1;
  angle = patternAngle || 0;

  const co = [
    "transparent",
    ...[...Array(maxColors - 1).keys()]
      .map(_ => hexToHSL(props.root[`patternColor${+_ + 1}`]))
      .filter(_ => _),
  ];

  spacing = spacing || [+patternSpacingX || 0, +patternSpacingY || 0];

  const svgPattern = (
    colors,
    colorCounts,
    stroke,
    scale,
    spacing,
    angle,
    join,
    moveLeft,
    moveTop
  ) => {
    function multiStroke(i) {
      let defColor = colors[i + 1];
      if (vHeight === 0 && maxColors > 2) {
        if (colorCounts === 3 && maxColors === 4 && i === 2) defColor = colors[1];
        else if (colorCounts === 4 && maxColors === 5 && i === 3) defColor = colors[1];
        else if (colorCounts === 3 && maxColors === 5 && i === 3) defColor = colors[1];
        else if (colorCounts === 3 && maxColors === 5 && i === 2) defColor = colors[1];
        else if (colorCounts === 2) defColor = colors[1];
      }
      if (mode === "stroke-join") {
        strokeFill = ` stroke='${defColor}' fill='none'`;
        joinMode =
          join === 2
            ? "stroke-linejoin='round' stroke-linecap='round' "
            : "stroke-linecap='square' ";
      } else if (mode === "stroke") {
        strokeFill = ` stroke='${defColor}' fill='none'`;
      } else strokeFill = ` stroke='none' fill='${defColor || "white"}'`;
      return path
        .split("~")
        [i].replace(
          "/>",
          ` transform='translate(${spacing[0] / 2},0)' ${
            joinMode
          }stroke-width='${stroke}'${strokeFill}/>`
        )
        .replace("transform='translate(0,0)' ", " ");
    }
    let strokeFill = "";
    let joinMode = "";
    let strokeGroup = "";
    if (vHeight === 0 && maxColors > 2) {
      for (let i = 0; i < maxColors - 1; i++) strokeGroup += multiStroke(i);
    } else {
      for (let i = 0; i < colorCounts - 1; i++) strokeGroup += multiStroke(i);
    }

    const patternNew =
      "<svg id='patternId' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg'><defs>" +
      `<pattern id='a' patternUnits='userSpaceOnUse' width='${width + spacing[0]}' height='${
        height - vHeight * (maxColors - colorCounts) + spacing[1]
      }' patternTransform='scale(${scale}) rotate(${
        angle
      })'><rect x='0' y='0' width='100%' height='100%' fill='${colors[0] || "white"}'/>${
        strokeGroup
      }</pattern></defs><rect width='800%' height='800%' transform='translate(${
        scale * moveLeft
      },${scale * moveTop})' fill='url(#a)'/></svg>`;
    return `"data:image/svg+xml,${patternNew.replace("#", "%23")}"`;
  };

  return svgPattern(co, maxColors, stroke, scale, spacing, angle, join, moveLeft, moveTop);
};

// ─── Media helpers ──────────────────────────────────────────────────────

/** Bare Cloudflare-style image id when backgroundImageType was not persisted */
const looksLikeCdnImageId = (content: string): boolean => {
  if (!content || typeof content !== "string") return false;
  const s = content.trim();
  if (s.startsWith("http") || s.startsWith("/") || s.startsWith("data:")) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
};

/**
 * Calculate optimal background image size based on viewport and device pixel ratio
 */
const calculateOptimalBackgroundSize = (): number => {
  if (typeof window === "undefined") {
    return 1920;
  }

  const viewportWidth = window.innerWidth;
  const devicePixelRatio = window.devicePixelRatio || 1;

  const actualWidth = viewportWidth * devicePixelRatio;

  const breakpoints = [320, 640, 960, 1280, 1920, 2560, 3840];

  const optimalSize = breakpoints.find(size => size >= actualWidth) || 3840;

  return optimalSize;
};

// ─── Background ─────────────────────────────────────────────────────────

export const getBackgroundUrl = (props, query = null) => {
  if (props.backgroundImage) {
    const type = props.backgroundImageType;
    const content = props.backgroundImage;

    // Direct URLs bypass media lookup
    if (content.startsWith("http") || content.startsWith("/") || content.startsWith("data:")) {
      return content;
    }

    // Media library (editor): url/svg entries on ROOT.pageMedia
    if (query && content) {
      const fromLibrary = getMediaContent(query, content);
      if (fromLibrary) return fromLibrary;
    }

    // CDN id: explicit type, or UUID-shaped id when type was omitted from saved JSON
    const useCdnUrl =
      content &&
      type !== "url" &&
      type !== "svg" &&
      (type === "cdn" || ((type === undefined || type === null || type === "") && looksLikeCdnImageId(content)));
    if (useCdnUrl) {
      const optimalSize = calculateOptimalBackgroundSize();
      return getCdnUrl(content.trim(), { width: optimalSize, format: "auto" });
    }

    return content;
  }

  return null;
};

export const applyPattern = (prop, props, settings) => {
  if (props.root?.pattern) {
    const patt = generatePattern(props);

    if (patt) {
      prop.style = prop.style || {};
      prop.style.backgroundImage = `url(${patt})`;
    }
  }

  return prop;
};

/**
 * Resolve a backgroundOverlay prop into a CSS linear-gradient string.
 * Supports:
 *   - Preset strings: "dark-left", "dark-right", "dark-bottom", "dark-top", "dark", "light"
 *   - Object: { direction, from: { color, opacity }, to: { color, opacity } }
 */
export const resolveOverlayGradient = (overlay: any): string | null => {
  if (!overlay) return null;

  // Preset string shortcuts
  if (typeof overlay === "string") {
    const presets: Record<string, string> = {
      "dark-left": "linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 100%)",
      "dark-right": "linear-gradient(to left, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 100%)",
      "dark-bottom": "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 100%)",
      "dark-top": "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 100%)",
      "dark": "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6))",
      "light": "linear-gradient(rgba(255,255,255,0.6), rgba(255,255,255,0.6))",
    };
    return presets[overlay] || null;
  }

  // Object form: { direction, from: { color, opacity }, to: { color, opacity } }
  if (typeof overlay === "object" && overlay.from) {
    const dir = overlay.direction || "to bottom";
    const fromColor = overlay.from.color || "#000000";
    const fromOpacity = (overlay.from.opacity ?? 70) / 100;
    const toColor = overlay.to?.color || fromColor;
    const toOpacity = (overlay.to?.opacity ?? 0) / 100;

    // Parse hex to rgb
    const hexToRgb = (hex: string) => {
      const h = hex.replace("#", "");
      return `${parseInt(h.substring(0, 2), 16)},${parseInt(h.substring(2, 4), 16)},${parseInt(h.substring(4, 6), 16)}`;
    };

    return `linear-gradient(${dir}, rgba(${hexToRgb(fromColor)},${fromOpacity}) 0%, rgba(${hexToRgb(toColor)},${toOpacity}) 100%)`;
  }

  return null;
};

export const applyBackgroundImage = (prop, props, settings, query = null) => {
  if (props.backgroundImage) {
    const _imgProp = { src: getBackgroundUrl(props, query) };

    if (_imgProp.src) {
      prop.style = prop.style || {};
      const overlayGradient = resolveOverlayGradient(props.backgroundOverlay);
      prop.style.backgroundImage = overlayGradient
        ? `${overlayGradient}, url(${_imgProp.src})`
        : `url(${_imgProp.src})`;

      // Add a hidden high-priority img element to preload the image for LCP optimization
      if (props.backgroundPriority) {
        const existingChildren = prop.children;

        const preloadImageElement = React.createElement("img", {
          src: _imgProp.src,
          alt: "",
          loading: "eager",
          fetchpriority: props.backgroundFetchPriority || "high",
          style: {
            position: "absolute",
            width: "1px",
            height: "1px",
            opacity: 0,
            pointerEvents: "none",
            zIndex: -9999,
          },
          "aria-hidden": "true",
        });

        prop.children = React.createElement(
          React.Fragment,
          {},
          preloadImageElement,
          existingChildren
        );
      }
    }
  }

  return prop;
};

export const applyLazyBackgroundImage = (
  prop,
  props,
  settings,
  query = null,
  lazyRef = null
) => {
  if (props.backgroundImage) {
    const _imgProp = { src: getBackgroundUrl(props, query) };

    if (_imgProp.src) {
      prop.style = prop.style || {};

      const overlayGradient = resolveOverlayGradient(props.backgroundOverlay);

      // If lazy loading is enabled, don't set background image immediately
      if (props.backgroundLazy) {
        // Add data attribute for lazy loading
        prop["data-bg"] = _imgProp.src;
        if (overlayGradient) prop["data-bg-overlay"] = overlayGradient;
        prop["data-bg-loaded"] = "false";

        // Add placeholder background color if specified
        if (props.backgroundPlaceholder) {
          prop.style.backgroundColor = props.backgroundPlaceholder;
        }
        // Show overlay gradient immediately even while image lazy loads
        if (overlayGradient) {
          prop.style.backgroundImage = overlayGradient;
        }

        // Add ref for intersection observer
        if (lazyRef) {
          prop.ref = lazyRef;
        }
      } else {
        // Normal immediate loading
        prop.style.backgroundImage = overlayGradient
          ? `${overlayGradient}, url(${_imgProp.src})`
          : `url(${_imgProp.src})`;

        // Add preload element for priority images
        if (props.backgroundPriority) {
          const existingChildren = prop.children;

          const preloadImageElement = React.createElement("img", {
            src: _imgProp.src,
            alt: "",
            loading: "eager",
            fetchpriority: props.backgroundFetchPriority || "high",
            style: {
              position: "absolute",
              width: "1px",
              height: "1px",
              opacity: 0,
              pointerEvents: "none",
              zIndex: -9999,
            },
            "aria-hidden": "true",
          });

          prop.children = React.createElement(
            React.Fragment,
            {},
            preloadImageElement,
            existingChildren
          );
        }
      }
    }
  }

  return prop;
};

// ─── Font Loading ───────────────────────────────────────────────────────

const fontCollection = new Map<string, Set<string>>();
let isLoadingFonts = false;
/** Coalesce many `loadCombinedFonts()` calls in one React commit into one microtask flush. */
let fontFlushMicrotaskQueued = false;

export const collectFont = (fontFamily: string, fontWeight: string) => {
  if (!fontFamily || fontFamily.startsWith("style:")) {
    return;
  }

  // Skip CSS variables
  if (fontFamily.includes("var(") || fontFamily.includes("--")) {
    return;
  }

  if (!fontCollection.has(fontFamily)) {
    fontCollection.set(fontFamily, new Set());
  }

  const weights = fontCollection.get(fontFamily)!;
  weights.add(fontWeight);
};

export const generateCombinedFontURL = () => {
  if (fontCollection.size === 0) {
    return null;
  }

  const fontParams = Array.from(fontCollection.entries())
    .map(([fontFamily, weights]) => {
      const weightStr = Array.from(weights).join(";");
      const encodedFamily = encodeURIComponent(fontFamily);
      return `family=${encodedFamily}:wght@${weightStr}`;
    })
    .join("&");

  const url = `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;
  return url;
};

export const clearFontCollection = () => {
  fontCollection.clear();
};

function finishFontBatch(totalFonts: number, loadedCountRef: { n: number }) {
  loadedCountRef.n++;
  if (loadedCountRef.n >= totalFonts) {
    isLoadingFonts = false;
    if (fontCollection.size > 0) {
      loadCombinedFonts();
    }
  }
}

/**
 * After `collectFont` calls (e.g. from many `applyAnimation` passes), schedules a single
 * microtask flush so one render pass batches families. If a network batch is already in
 * flight, new collects stay in the map and flush again when that batch completes.
 */
export const loadCombinedFonts = () => {
  if (typeof window === "undefined") {
    return;
  }

  if (fontFlushMicrotaskQueued) {
    return;
  }
  fontFlushMicrotaskQueued = true;
  queueMicrotask(() => {
    fontFlushMicrotaskQueued = false;
    runLoadCombinedFontsFlush();
  });
};

function runLoadCombinedFontsFlush() {
  if (isLoadingFonts) {
    return;
  }

  if (fontCollection.size === 0) {
    return;
  }

  isLoadingFonts = true;

  const entries = Array.from(fontCollection.entries());
  clearFontCollection();

  const totalFonts = entries.length;
  const loadedCountRef = { n: 0 };

  const onOneDone = () => finishFontBatch(totalFonts, loadedCountRef);

  entries.forEach(([fontFamily, weights]) => {
    const weightStr = Array.from(weights).join(";");
    const encodedFamily = encodeURIComponent(fontFamily);
    const fontURL = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weightStr}&display=swap`;
    const fallbackURL = `https://fonts.googleapis.com/css2?family=${encodedFamily}&display=swap`;

    const existingLink = document.querySelector(
      `link[href="${fontURL}"], link[href="${fallbackURL}"]`
    );
    if (existingLink) {
      onOneDone();
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontURL;

    link.onload = () => {
      onOneDone();
    };

    link.onerror = () => {
      const fallbackLink = document.createElement("link");
      fallbackLink.rel = "stylesheet";
      fallbackLink.href = fallbackURL;

      fallbackLink.onload = () => {
        onOneDone();
      };

      fallbackLink.onerror = () => {
        onOneDone();
      };

      document.head.appendChild(fallbackLink);
    };

    document.head.appendChild(link);
  });
}

const FONT_WEIGHT_CLASS_TO_NUM: Record<string, string> = {
  "font-thin": "100",
  "font-extralight": "200",
  "font-light": "300",
  "font-normal": "400",
  "font-medium": "500",
  "font-semibold": "600",
  "font-bold": "700",
  "font-extrabold": "800",
  "font-black": "900",
};

function flattenNodeClassName(props: { className?: unknown }): string {
  const c = props?.className;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.filter(Boolean).join(" ");
  return "";
}

/** Editor: preload Google fonts from `className` (`font-(--*)` or `font-['Name']` + weight utilities). */
export const getFontFromComp = (props: { className?: unknown }) => {
  const cn = flattenNodeClassName(props);
  if (!cn.trim()) return;

  const token = findFontFamilyClassToken(cn);
  if (!token) return;

  const base = tailwindTokenBase(token);
  let fontName: string | null = null;

  if (/^font-\(--/.test(base)) {
    const resolved = resolveCSSVariable(base, null);
    if (resolved && typeof resolved === "string" && !resolved.includes("var(")) {
      fontName = resolved.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
    }
  } else {
    fontName = parseGoogleFontFromArbitraryClass(base);
  }

  if (!fontName) return;

  const numericWeights = new Set<string>();
  for (const part of cn.split(/\s+/)) {
    const b = tailwindTokenBase(part);
    const n = FONT_WEIGHT_CLASS_TO_NUM[b];
    if (n) numericWeights.add(n);
  }

  if (numericWeights.size === 0) numericWeights.add("400");
  numericWeights.forEach(w => collectFont(fontName, w));
};

// ─── Motion / Animation ─────────────────────────────────────────────────

export const motionIt = (props, tagOrComponent, enabled = false) => {
  const anim = props.root?.animation;
  if (!anim || enabled) return tagOrComponent;
  // CSS animations don't need framer-motion wrappers — plain tags only
  if (anim.startsWith("css")) return tagOrComponent;
  return motion.create(tagOrComponent);
};

export const variants = {
  open: { opacity: 1, x: 0 },
  closed: { opacity: 0, x: "-100%" },
};

// ─── Hooks ──────────────────────────────────────────────────────────────

export const useAutoOpenMenu = (menu, setMenu, id, node) => {
  useEffect(() => {
    if (menu.id !== id) {
      setMenu({
        enabled: true,
        id,
        parent: node.data.parent,
      });
    }
  }, [menu.id, id, node.data.parent, setMenu]);
};

export const useDefaultTab = (head, activeTab, setActiveTab) => {
  useEffect(() => {
    if (!head || head.length === 0) return;

    const activeTabExists = head.some(tab => tab.title === activeTab);

    if (!activeTab || !activeTabExists) {
      if (head[0]?.title) {
        setActiveTab(head[0].title);
      }
    }
  }, [head, activeTab, setActiveTab]);
};

export const useScrollToActiveTab = (activeTab, setActiveSection, nodeId = null) => {
  const [isInitialMount, setIsInitialMount] = React.useState(true);

  useEffect(
    () => {
      setIsInitialMount(true);
      if (activeTab) {
        const timer = setTimeout(async () => {
          try {
            const { scrollToSection } = await import("../chrome/Toolbar/UnifiedTab");
            scrollToSection(activeTab);
          } catch (_) {}
          setActiveSection(prev => (prev !== activeTab ? activeTab : prev));
          setTimeout(() => setIsInitialMount(false), 200);
        }, 100);
        return () => clearTimeout(timer);
      } else {
        setTimeout(() => setIsInitialMount(false), 300);
      }
    },
    nodeId !== null ? [nodeId] : []
  );

  return isInitialMount;
};

// ─── Page Management ────────────────────────────────────────────────────

export const getPageCount = query => {
  const root = query.node(ROOT_NODE).get();

  const pageCount = !root
    ? []
    : root?.data?.nodes.filter(_ => query.node(_).get().data.props.type === "page") || [];

  return pageCount;
};

export const isolatePage = (isolate, query, active, actions, setIsolate, select = true) => {
  const root = query.node(ROOT_NODE).get();
  const _active = active ? active.valueOf() : null;

  root.data.nodes
    .map(_ => {
      const _props = query.node(_).get();

      if (!_props || _props?.data?.props?.type !== "page") return _;

      actions.setHidden(_, false);
      actions.setProp(_, prop => (prop.hidden = false));

      return _;
    })
    .filter(_ => _ !== _active)
    .forEach(_ => {
      const _props = query.node(_).get();

      if (!_props || _props?.data?.props?.type !== "page") return;

      actions.setHidden(_, !isolate);
      actions.setProp(_, prop => (prop.hidden = !isolate));
    });

  if (select) setTimeout(() => actions.selectNode(_active), 100);

  setIsolate(!isolate ? _active : "");
  localStorage.setItem("isolated", !isolate ? _active : "");
};

export const isolatePageAlt = (isolate, query, active, actions, setIsolate, select = true) => {
  const root = query.node(ROOT_NODE).get();
  const _active = active ? active.valueOf() : null;

  root.data.nodes
    .map(_ => {
      const _props = query.node(_).get();

      if (!_props || _props?.data?.props?.type !== "page") return _;

      actions.setHidden(_, !!active);
      actions.setProp(_, prop => (prop.hidden = !!active));

      return _;
    })
    .filter(_ => _ === _active)
    .forEach(_ => {
      const _props = query.node(_).get();

      if (!_props || _props?.data?.props?.type !== "page") return;

      actions.setHidden(_, false);
      actions.setProp(_, prop => (prop.hidden = false));
    });

  if (select && _active) {
    setTimeout(() => {
      try {
        const node = query.node(_active).get();
        if (node) {
          //actions.selectNode(_active);
        }
      } catch (e) {
        console.error("Error selecting node:", e);
      }
    }, 100);
  }

  setIsolate(active);
  localStorage.setItem("isolated", active);
};

// ─── Page Ref Resolution ────────────────────────────────────────────────

export const resolvePageRef = (url: string, query: any, currentPath?: string): string => {
  if (!url || typeof url !== "string" || !url.startsWith("ref:")) {
    return url;
  }

  try {
    const pageId = url.replace("ref:", "");

    const pageNode = query.node(pageId).get();
    if (!pageNode || pageNode.data?.props?.type !== "page") {
      return "#";
    }

    const isHomePage = pageNode.data?.props?.isHomePage;
    const displayName = pageNode.data?.custom?.displayName || "Untitled";

    let baseUrl = "";
    if (currentPath) {
      const pathParts = currentPath.split("/").filter(p => p && !p.startsWith("?"));
      if (pathParts.length >= 2 && (pathParts[0] === "build" || pathParts[0] === "view")) {
        baseUrl = `/${pathParts[0]}/${pathParts[1]}`;
      }
    }

    if (isHomePage) {
      return baseUrl || "/";
    } else {
      const pageSlug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return baseUrl ? `${baseUrl}/${pageSlug}` : `/${pageSlug}`;
    }
  } catch (e) {
    console.error("Error resolving page reference:", e);
    return "#";
  }
};

// ─── Variables ──────────────────────────────────────────────────────────

export const replaceVariables = (text: string, query: any): string => {
  if (!text || typeof text !== "string") return text || "";

  return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const trimmed = varName.trim();

    try {
      if (trimmed.startsWith("company.")) {
        const field = trimmed.replace("company.", "");
        const root = query?.node(ROOT_NODE)?.get();
        if (root?.data?.props) {
          if (field === "name" && root.data.props.pageTitle) {
            return root.data.props.pageTitle;
          }
        }
      }
    } catch (e) {
      // Silently fail
    }

    return match;
  });
};

// ─── Validation ─────────────────────────────────────────────────────────

export const isCssValid = (code: string): boolean => {
  try {
    const { parse } = require("css-tree");
    parse(code);
    return true;
  } catch (err) {
    return false;
  }
};

export const isJsValid = (code: string): boolean => {
  const strippedCode = code.replace(/<script[^>]*>|<\/script>/gi, "");

  try {
    new Function(strippedCode);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

// ─── Popup ──────────────────────────────────────────────────────────────

export const popupCenter = (url, title) => {
  const dualScreenLeft = window.screenLeft ?? window.screenX;
  const dualScreenTop = window.screenTop ?? window.screenY;

  const screenWidth = window.screen.availWidth;
  const screenHeight = window.screen.availHeight;

  const popupWidth = 400;
  const popupHeight = 600;

  const left = (screenWidth - popupWidth) / 2 + dualScreenLeft;
  const top = (screenHeight - popupHeight) / 2 + dualScreenTop;

  const newWindow = window.open(
    url,
    title,
    `width=${popupWidth},height=${popupHeight},top=${top},left=${left},scrollbars=no,resizable=no,toolbar=no,menubar=no,location=no,status=no`
  );

  newWindow?.focus();
};

// ─── Media Management ───────────────────────────────────────────────────

export const registerMediaWithBackground = (
  query: any,
  actions: any,
  mediaId: string,
  mediaType: string = "cdn",
  componentId?: string
) => {
  try {
    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return;

    actions.setProp(ROOT_NODE, (props: any) => {
      props.pageMedia = props.pageMedia || [];

      const exists = props.pageMedia.find((m: any) => m.id === mediaId);
      if (exists) {
        exists.componentId = componentId;
        exists.type = mediaType;
      } else {
        props.pageMedia.push({
          id: mediaId,
          type: mediaType,
          uploadedAt: Date.now(),
          componentId,
        });
      }
    });
  } catch (e) {
    console.error("Failed to register media with Background:", e);
  }
};

export const unregisterMediaFromBackground = (query: any, actions: any, mediaId: string) => {
  try {
    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return;

    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.pageMedia) return;
      props.pageMedia = props.pageMedia.filter((m: any) => m.id !== mediaId);
    });
  } catch (e) {
    console.error("Failed to unregister media from Background:", e);
  }
};

export const getPageMedia = (query: any) => {
  try {
    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return [];
    return backgroundNode.data.props.pageMedia || [];
  } catch (e) {
    console.error("Failed to get page media:", e);
    return [];
  }
};

export const getMediaContent = (query: any, mediaId: string): string | null => {
  try {
    if (!mediaId) return null;

    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return null;

    const pageMedia = backgroundNode.data.props.pageMedia || [];
    const media = pageMedia.find((m: any) => m.id === mediaId);

    if (!media) {
      return null;
    }

    if (media.type === "url") {
      return media.metadata?.url || null;
    }

    if (media.type === "svg") {
      const svgContent = media.metadata?.svg || "";
      return `data:image/svg+xml;base64,${btoa(svgContent)}`;
    }

    const cdnId = media.cdnId || media.id;
    const optimalSize = calculateOptimalBackgroundSize();
    return getCdnUrl(cdnId, { width: optimalSize, format: "auto" });
  } catch (e) {
    console.error("Failed to get media content:", e);
    return null;
  }
};

export const getResponsiveImageAttrs = (query: any, mediaId: string) => {
  try {
    if (!mediaId) return { src: null, srcset: null, sizes: null };

    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return { src: null, srcset: null, sizes: null };

    const pageMedia = backgroundNode.data.props.pageMedia || [];
    const media = pageMedia.find((m: any) => m.id === mediaId);

    // Non-CDN media types don't get srcset
    if (!media || media.type === "url" || media.type === "svg") {
      return {
        src: getMediaContent(query, mediaId),
        srcset: null,
        sizes: null,
      };
    }

    // CDN images get responsive srcset
    const cdnId = media.cdnId || media.id;

    return {
      src: getCdnUrl(cdnId, { width: 1280, format: "auto" }),
      srcset: generateSrcSet(cdnId, [320, 640, 960, 1280, 1920, 2560], {
        format: "auto",
      }),
      sizes: generateSizes({
        "(max-width: 640px)": "100vw",
        "(max-width: 1024px)": "50vw",
        default: "33vw",
      }),
    };
  } catch (e) {
    console.error("Failed to get responsive image attrs:", e);
    return {
      src: getMediaContent(query, mediaId),
      srcset: null,
      sizes: null,
    };
  }
};

export const getMediaById = (query: any, mediaId: string): any | null => {
  try {
    if (!mediaId) return null;

    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return null;

    const pageMedia = backgroundNode.data.props.pageMedia || [];
    return pageMedia.find((m: any) => m.id === mediaId) || null;
  } catch (e) {
    console.error("Failed to get media by ID:", e);
    return null;
  }
};

export const updateMediaMetadata = (
  query: any,
  actions: any,
  mediaId: string,
  metadata: { alt?: string; title?: string; description?: string }
) => {
  try {
    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.pageMedia) return;

      const mediaItem = props.pageMedia.find((m: any) => m.id === mediaId);
      if (mediaItem) {
        mediaItem.metadata = {
          ...mediaItem.metadata,
          ...metadata,
        };
      }
    });
  } catch (e) {
    console.error("Failed to update media metadata:", e);
  }
};

export const syncPageMedia = (query: any, actions: any) => {
  try {
    const nodes = query.getSerializedNodes();
    const usedMediaIds = new Set<string>();

    Object.keys(nodes).forEach(nodeId => {
      const node = nodes[nodeId];
      const props = node.props;

      const mediaProps = [
        "ico",
        "image",
        "videoId",
        "backgroundImage",
        "src",
        "imageDesktop",
        "imageTablet",
        "imageMobile",
      ];

      mediaProps.forEach(propKey => {
        if (props[propKey] && typeof props[propKey] === "string") {
          usedMediaIds.add(props[propKey]);
        }
      });
    });

    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.pageMedia) return;
      props.pageMedia = props.pageMedia.filter((m: any) => usedMediaIds.has(m.id));
    });

    return Array.from(usedMediaIds);
  } catch (e) {
    console.error("Failed to sync page media:", e);
    return [];
  }
};
