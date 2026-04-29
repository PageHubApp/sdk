import { useEditor, useNode } from "@craftjs/core";
import { AutoTextSize } from "auto-text-size";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Text as UiText } from "@pagehub/ui";
import { addActionHandlers, addCustomHandlers } from "../utils/clickControls";
import { applyAttrs } from "../utils/applyAttrs";
import {
  migrateActions,
  actionToHref,
  actionTarget,
  isLinkAction,
  isHandlerAction,
  isAnchorAction,
  findLinkAction,
  type NodeAction,
} from "../utils/action";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { motionIt } from "../utils/lib";

import { applyAnimation } from "../utils/tailwind/tailwind";
import { replaceVariables } from "../utils/design/variables";
import { useRuntimeVarsVersion } from "../utils/design/RuntimeVarsContext";
import { useItemContext } from "../utils/itemContext";
import { useAnchors } from "../utils/anchors/anchorContext";
import { useGlobalStateTick } from "../utils/stateRegistry";
import { useScrollToSelected } from "./componentHooks";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

// Lazy-load the editor mode — keeps TipTap, chrome, etc. out of viewer bundle
const TextEditorMode = React.lazy(() => import("./TextEditor"));

export interface TextProps extends BaseSelectorProps {
  text?: string;
  tagName?: string;
  /** Rich-text editor config — `richText.mode` selects inline vs full TipTap profile. */
  richText?: { mode?: "full" | "inline"; profile?: string };
  textFitMode?: "oneline" | "multiline" | "box" | "boxoneline";
  activeTab?: number;
  action?: NodeAction | NodeAction[];
  click?: any; // Legacy — handled by migrateActions()
}

// Guard against corrupted tagName data (e.g. `p, "text": "..."` from bad MCP writes)
const sanitizeTagName = (tag: unknown): string | undefined => {
  if (typeof tag !== "string") return undefined;
  if (tag === "Textfit") return tag;
  const clean = tag.split(/[,\s]/)[0].toLowerCase();
  return /^[a-z][a-z0-9]*$/.test(clean) ? clean : undefined;
};

// Strip wrapping <p> from TipTap content to avoid invalid nesting
// (e.g. <h1><p>...</p></h1> or <p><p>...</p></p> breaks hydration).
// Multi-paragraph content (<p>A</p><p>B</p>) collapses to <br/><br/> so the
// outer tagName (often <p>) doesn't end up with invalid <p>-in-<p> nesting —
// TipTap always wraps in <p>, and we often do too, so we can't auto-promote.
const unwrapP = (html: string): string => {
  const trimmed = html.trim();
  if (!/^<p>[\s\S]*<\/p>$/.test(trimmed)) return trimmed;
  if (/<\/p>\s*<p>/.test(trimmed)) {
    return trimmed
      .replace(/^<p>/, "")
      .replace(/<\/p>$/, "")
      .replace(/<\/p>\s*<p>/g, "<br/><br/>");
  }
  return trimmed.replace(/^<p>/, "").replace(/<\/p>$/, "");
};

// RENDER MODE - Simple HTML rendering (no editor deps)
const renderLiveMode = (
  props: any,
  query: any,
  router: any,
  itemContext?: Record<string, any> | null,
  anchors?: Readonly<Record<string, string>> | null
) => {
  const processedText = replaceVariables(props.text, query, itemContext, anchors);
  let tagName = sanitizeTagName(props.tagName);

  const firstLink = findLinkAction(migrateActions(props));
  const resolvedUrl = actionToHref(firstLink, query, router?.asPath);

  if (resolvedUrl) {
    const isInternal = resolvedUrl.startsWith("/");
    tagName = isInternal ? Link : ("a" as any);
    const target = actionTarget(firstLink);
    const linkProps: any = {
      href: resolvedUrl,
      dangerouslySetInnerHTML: { __html: unwrapP(processedText) },
      // Outer tag also keeps className for layout; inner link must receive it or
      // browser / theme defaults (blue underline) override typography utilities.
      className: props.className || "",
    };
    if (target) linkProps.target = target;
    if (/^https?:\/\//.test(resolvedUrl)) {
      linkProps.rel = "noopener noreferrer";
    }
    return React.createElement(tagName, linkProps);
  }

  if (tagName === "Textfit") {
    return (
      <AutoTextSize
        mode={props.textFitMode || "oneline"}
        maxFontSizePx={800}
        style={{ width: "100%" }}
        as="div"
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
    );
  }

  return processedText;
};

export const Text = (incomingProps: Partial<TextProps>) => {
  let props: any = { canDelete: true, ...incomingProps };

  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const router = useRouter();
  const itemContext = useItemContext();
  const anchors = useAnchors();
  useRuntimeVarsVersion();
  // Re-render when ANY state value changes — Text nodes that interpolate
  // `{{state.<key>}}` need to repaint when their key flips. Cheap (one
  // global tick per state write); the registry already debounces same-value
  // writes so idle pages don't churn.
  useGlobalStateTick();

  const {
    connectors: { connect, drag },
    id,
    actions: { setProp },
  } = useNode();

  useScrollToSelected(id, enabled);
  props = setClonedProps(props, query);

  // In view mode (enabled=false), skip mount guard — no hydration concern, prevents FOUC
  const [isMounted, setIsMounted] = useState(!enabled);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Re-render when a variable value is edited via the popover
  const [, forceUpdate] = useState(0);
  const { text } = props;
  const tagName = sanitizeTagName(props.tagName);
  const hasVariables = typeof text === "string" && text.includes("{{");

  useEffect(() => {
    if (!hasVariables) return;
    const handler = () => forceUpdate(n => n + 1);
    document.addEventListener("pagehub:variable-changed", handler);
    return () => document.removeEventListener("pagehub:variable-changed", handler);
  }, [hasVariables]);

  const prop: any = {
    ref: r => connect(drag(r)),
    className: props.className || "",
  };

  applyAriaProps(prop, props);
  // Pass through plain string attrs (data-*, role, etc.) — matches
  // Container / Button / FormElement. Author-supplied attrs only; SDK no
  // longer scrapes Text nodes for any runtime contract.
  applyAttrs(prop, props.attrs);
  const actions = migrateActions(props);
  // Text wraps in <a> via renderLiveMode for single-link cases; here we attach
  // JS handlers for chains, anchors, and non-link actions.
  const needsJsDispatch =
    actions.length > 1 ||
    actions.some(a => isHandlerAction(a) || isAnchorAction(a)) ||
    (actions.length === 1 && !isLinkAction(actions[0]));
  if (needsJsDispatch) {
    addActionHandlers(prop, actions, enabled);
  }

  addCustomHandlers(prop, props.handlers, enabled);

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    prop["data-empty-state"] = !text;
    if (isMounted) {
      prop["node-id"] = id;
    }
    prop["data-gramm"] = false;
    prop.suppressContentEditableWarning = true;
  }

  if (enabled) {
    prop.children = (
      <React.Suspense
        fallback={
          <div
            dangerouslySetInnerHTML={{ __html: replaceVariables(text || "", query, itemContext, anchors) }}
          />
        }
      >
        <TextEditorMode
          props={props}
          id={id}
          query={query}
          enabled={enabled}
          isMounted={isMounted}
          setProp={setProp}
        />
      </React.Suspense>
    );
  } else {
    const liveContent = renderLiveMode(props, query, router, itemContext, anchors);

    const liveLink = findLinkAction(migrateActions(props));
    const liveHref = actionToHref(liveLink, query, router?.asPath);
    if (liveHref) {
      // Wrap text in a link but keep the original tagName (h1, h2, etc.) as the outer element
      // so className, animations, and semantic structure are preserved.
      prop.children = liveContent;
    } else if (props.tagName === "Textfit") {
      prop.children = liveContent;
    } else {
      const html = typeof liveContent === "string" ? liveContent : "";
      prop.dangerouslySetInnerHTML = { __html: unwrapP(html) };
    }
  }

  const final = applyAnimation({ ...prop, key: `${id}` }, props, query, enabled);
  const elementTag = enabled || tagName === "Textfit" ? "div" : tagName || "div";

  // Use @pagehub/ui Text for non-editor, non-Textfit viewer renders.
  // Editor mode (TipTap) and Textfit stay on raw HTML tags.
  const useUiText = !enabled && tagName !== "Textfit";

  if (useUiText) {
    // Map dangerouslySetInnerHTML to UiText's dangerousHtml prop
    const textProps = { ...final };
    if (textProps.dangerouslySetInnerHTML) {
      textProps.dangerousHtml = textProps.dangerouslySetInnerHTML.__html;
      delete textProps.dangerouslySetInnerHTML;
    }
    // Pass the HTML tag via `as` and suppress variant classes
    textProps.as = elementTag;
    textProps.variant = null;
    return React.createElement(motionIt(props, UiText, enabled), textProps);
  }

  return React.createElement(motionIt(props, elementTag, enabled), final);
};

Text.craft = {
  displayName: "Text",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
