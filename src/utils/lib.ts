/**
 * @pagehub/sdk — Utility re-export barrel
 *
 * This file used to be a 1,176-line grab bag. The actual implementations
 * now live in domain-specific modules. This barrel re-exports everything
 * so existing `import { ... } from "utils/lib"` statements keep working.
 */

import { motion } from "framer-motion";
import React, { useEffect } from "react";
import { ROOT_NODE } from "@craftjs/core";
import { atom } from "./atoms";
import { getCdnUrl } from "./cdn";

// NOTE: Do NOT add static imports for "./tailwind" or "slug" here.
// tailwind.ts imports from ./lib — a static import creates a circular dependency
// that breaks module initialization order (LazyUnifiedSettings registration fails).
// Use require() inside the functions that need them instead.

// ─── Domain re-exports ──────────────────────────────────────────────────

// Media management (CRUD for pageMedia on ROOT_NODE)
export {
  registerMediaWithBackground,
  unregisterMediaFromBackground,
  getPageMedia,
  getMediaContent,
  getResponsiveImageAttrs,
  getMediaById,
  updateMediaMetadata,
  syncPageMedia,
} from "./media";

// Background image, pattern, overlay
export {
  generatePattern,
  getBackgroundUrl,
  applyPattern,
  applyBackgroundImage,
  applyLazyBackgroundImage,
} from "./background";

// Font collection & loading
export {
  collectFont,
  generateCombinedFontURL,
  clearFontCollection,
  loadCombinedFonts,
  getFontFromComp,
} from "./fontLoader";

// Craft node-map sanitization for viewer/editor safety
export { sanitizeCraftNodeReferences, sanitizeCraftSerializedContent } from "./sanitizeNodeMap";

// Page management (isolation, counting, ref resolution, variables)
export {
  EDITOR_ALL_PAGES_STORAGE,
  getDefaultEditorPageId,
  getPageCount,
  isolatePage,
  isolatePageAlt,
  listPageNodeIds,
  resolvePageRef,
  replaceVariables,
} from "./pageManagement";

// ─── CDN re-export ──────────────────────────────────────────────────────

export { getCdnUrl };

// ─── Constants ──────────────────────────────────────────────────────────

export const siteTitle =
  "PageHub - Easy-to-Use Website Builder for Tailwind Developers – Free & SEO-Friendly";
export const siteDescription =
  "Build beautiful, responsive websites effortlessly with our free website builder, designed specifically for Tailwind CSS developers. Fast, intuitive, and SEO-optimized—create your site without writing boilerplate code";

// ─── Atoms ──────────────────────────────────────────────────────────────

export const IsolateAtom = atom<string>("isolate", "");
export const ComponentsAtom = atom<any[]>("components", []);
export const OnlineAtom = atom<boolean>("online", true);
export const ScreenshotAtom = atom<boolean>("ss", false);
export const SideBarAtom = atom<boolean>("sidebar", true);
export const SideBarOpen = atom<boolean>("sidebaropen", true);
/** Canvas scope for component editor / isolation — not the same as responsive viewport `ViewMode` in store.tsx */
export type EditorCanvasViewMode = "page" | "preview" | "component";
export const ViewModeAtom = atom<EditorCanvasViewMode>("viewMode", "page");
export type OpenComponentEditorState = null | {
  componentId?: string;
  componentName?: string;
  draftId?: string;
};
export const OpenComponentEditorAtom = atom<any>("openComponentEditor", null);
export const LastctiveAtom = atom<string>("lastActive", "");
export const ActiveAtom = atom<string>("active", "");
export const SelectedSectionAtom = atom<string | null>("selectedSection", null);

// ─── Submissions (registerable handler) ─────────────────────────────────

type SubmissionHandler = (submission: any, settings: any, additional?: any) => Promise<any> | void;
let _saveSubmissions: SubmissionHandler = () => {};
export const registerSubmissionHandler = (fn: SubmissionHandler) => {
  _saveSubmissions = fn;
};
export const SaveSubmissions = (submission: any, settings: any, additional?: any) =>
  _saveSubmissions(submission, settings, additional);

// ─── Stylesheet helpers ─────────────────────────────────────────────────

export const getStyleSheets = () => {
  if (typeof window === "undefined") return [];
  const links = document.getElementsByTagName("link") || [];
  const filtered: string[] = [];
  let i = links.length;
  while (i--) {
    links[i].rel === "stylesheet" && filtered.push(links[i].href);
  }
  return filtered;
};

// ─── Motion / Animation ─────────────────────────────────────────────────

export const motionIt = (props: any, tagOrComponent: any, enabled = false) => {
  const anim = props.root?.animation;
  if (!anim || enabled) return tagOrComponent;
  if (anim.startsWith("css")) return tagOrComponent;
  return motion.create(tagOrComponent);
};

export const variants = {
  open: { opacity: 1, x: 0 },
  closed: { opacity: 0, x: "-100%" },
};

// ─── Hooks ──────────────────────────────────────────────────────────────

export const useAutoOpenMenu = (menu: any, setMenu: any, id: string, node: any) => {
  useEffect(() => {
    if (menu.id !== id) {
      setMenu({ enabled: true, id, parent: node.data.parent });
    }
  }, [menu.id, id, node.data.parent, setMenu]);
};

export const useDefaultTab = (
  head: any[],
  activeTab: string,
  setActiveTab: (t: string) => void
) => {
  useEffect(() => {
    if (!head || head.length === 0) return;
    const activeTabExists = head.some((tab: any) => tab.title === activeTab);
    if (!activeTab || !activeTabExists) {
      if (head[0]?.title) setActiveTab(head[0].title);
    }
  }, [head, activeTab, setActiveTab]);
};

export const useScrollToActiveTab = (
  activeTab: string,
  setActiveSection: any,
  nodeId: string | null = null
) => {
  const [isInitialMount, setIsInitialMount] = React.useState(true);

  useEffect(
    () => {
      setIsInitialMount(true);
      if (activeTab) {
        const timer = setTimeout(async () => {
          try {
            const { scrollToSection } = await import("../chrome/toolbar/UnifiedTab");
            scrollToSection(activeTab);
          } catch (_) {}
          setActiveSection((prev: string) => (prev !== activeTab ? activeTab : prev));
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

// ─── Validation ─────────────────────────────────────────────────────────

export const isCssValid = (code: string): boolean => {
  try {
    const { parse } = require("css-tree");
    parse(code);
    return true;
  } catch {
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

export const popupCenter = (url: string, title: string) => {
  const windowLeft = window.screenLeft ?? window.screenX ?? 0;
  const windowTop = window.screenTop ?? window.screenY ?? 0;
  const windowWidth = window.outerWidth || window.innerWidth || window.screen.availWidth;
  const windowHeight = window.outerHeight || window.innerHeight || window.screen.availHeight;
  const popupWidth = 400;
  const popupHeight = 600;
  const left = Math.round(windowLeft + (windowWidth - popupWidth) / 2);
  const top = Math.round(windowTop + (windowHeight - popupHeight) / 2);

  const newWindow = window.open(
    url,
    title,
    `width=${popupWidth},height=${popupHeight},top=${top},left=${left},scrollbars=no,resizable=no,toolbar=no,menubar=no,location=no,status=no`
  );
  newWindow?.focus();
};
