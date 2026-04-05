// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import { AutoTextSize } from "auto-text-size";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { FaFont } from "react-icons/fa";
import { Text as UiText } from "@pagehub/ui";
import { addClickControls, ClickControl } from "../utils/clickControls";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { motionIt, resolvePageRef } from "../utils/lib";

import { applyAnimation } from "../utils/tailwind/tailwind";
import { replaceVariables } from "../utils/design/variables";
import { useScrollToSelected } from "./lib";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

// Lazy-load the editor mode — keeps TipTap, chrome, etc. out of viewer bundle
const TextEditorMode = React.lazy(() => import("./TextEditor"));

export interface TextProps extends BaseSelectorProps {
  text?: string;
  tagName?: string;
  activeTab?: number;
  click?: ClickControl;
}

const defaultProps: TextProps = {
  canDelete: true,
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
  let { tagName } = props;

  if (props.url && typeof props.url === "string") {
    const resolvedUrl = resolvePageRef(props.url, query, router?.asPath);
    const isInternal = resolvedUrl && resolvedUrl.startsWith("/");
    tagName = isInternal ? Link : ("a" as any);
    const linkProps: any = {
      href: resolvedUrl || "#",
      target: props.urlTarget,
      dangerouslySetInnerHTML: { __html: processedText },
    };
    if (/^https?:\/\//.test(resolvedUrl || "")) {
      linkProps.rel = "noopener noreferrer";
    }
    return React.createElement(tagName, linkProps);
  }

  if (tagName === "Textfit") {
    return (
      <AutoTextSize
        mode="oneline"
        maxFontSizePx={800}
        style={{ width: "100%" }}
        as={props.url ? "a" : "div"}
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
    );
  }

  return processedText;
};

export const Text = (props: Partial<TextProps>) => {
  props = { ...defaultProps, ...props };

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

  const { text, tagName } = props;

  const prop: any = {
    ref: r => connect(drag(r)),
    className: props.className || "",
  };

  applyAriaProps(prop, props);
  addClickControls(prop, props.click, enabled);

  if (enabled) {
    if (!text) prop.children = <FaFont />;
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

    if (props.url && typeof props.url === "string") {
      return liveContent;
    } else if (props.tagName === "Textfit") {
      prop.children = liveContent;
    } else {
      prop.dangerouslySetInnerHTML = { __html: unwrapP(liveContent) };
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
