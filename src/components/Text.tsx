import { useEditor, useNode } from "@craftjs/core";
import { AutoTextSize } from "auto-text-size";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Text as UiText } from "@pagehub/ui";
import { addActionHandlers } from "../utils/clickControls";
import { migrateAction, actionToHref, actionTarget, isHandlerAction, type NodeAction } from "../utils/action";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { motionIt } from "../utils/lib";

import { applyAnimation } from "../utils/tailwind/tailwind";
import { replaceVariables } from "../utils/design/variables";
import { useScrollToSelected } from "./lib";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

// Lazy-load the editor mode — keeps TipTap, chrome, etc. out of viewer bundle
const TextEditorMode = React.lazy(() => import("./TextEditor"));

export interface TextProps extends BaseSelectorProps {
  text?: string;
  tagName?: string;
  textFitMode?: "oneline" | "multiline" | "box" | "boxoneline";
  activeTab?: number;
  action?: NodeAction;
  click?: any; // Legacy — handled by migrateAction()
}


// Guard against corrupted tagName data (e.g. `p, "text": "..."` from bad MCP writes)
const sanitizeTagName = (tag: unknown): string | undefined => {
  if (typeof tag !== "string") return undefined;
  if (tag === "Textfit") return tag;
  const clean = tag.split(/[,\s]/)[0].toLowerCase();
  return /^[a-z][a-z0-9]*$/.test(clean) ? clean : undefined;
};

// Strip wrapping <p> from TipTap content to avoid invalid nesting
// (e.g. <h1><p>...</p></h1> or <p><p>...</p></p> breaks hydration)
const unwrapP = (html: string): string => {
  const trimmed = html.trim();
  const match = trimmed.match(/^<p>([\s\S]*)<\/p>$/);
  return match ? match[1] : trimmed;
};

// RENDER MODE - Simple HTML rendering (no editor deps)
const renderLiveMode = (props: any, query: any, router: any) => {
  const processedText = replaceVariables(props.text, query);
  let tagName = sanitizeTagName(props.tagName);

  const action = migrateAction(props);
  const resolvedUrl = actionToHref(action, query, router?.asPath);

  if (resolvedUrl) {
    const isInternal = resolvedUrl.startsWith("/");
    tagName = isInternal ? Link : ("a" as any);
    const target = actionTarget(action);
    const linkProps: any = {
      href: resolvedUrl,
      dangerouslySetInnerHTML: { __html: processedText },
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
  const action = migrateAction(props);
  if (isHandlerAction(action) || action?.type === "scroll-to") {
    addActionHandlers(prop, action, enabled);
  }

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
        fallback={<div dangerouslySetInnerHTML={{ __html: replaceVariables(text || "", query) }} />}
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
    const liveContent = renderLiveMode(props, query, router);

    const liveAction = migrateAction(props);
    const liveHref = actionToHref(liveAction, query, router?.asPath);
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
