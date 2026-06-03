/** Pure body for Text. NO `@craftjs/core`. */
/* eslint-disable react-hooks/rules-of-hooks -- render*Body fns are invoked once from a wrapper component; hook order is preserved. Renamed to use* would change exported public-ish API across the SDK. */
import React, { useEffect, useState } from "react";
import { AutoTextSize } from "auto-text-size";
import Link from "next/link";
import { useRouter } from "next/router";
import { addActionHandlers } from "../../utils/actions/dispatcher";
import { addCustomHandlers } from "../../utils/actions/customHandlers";
import { applyAttrs } from "../../utils/applyAttrs";
import {
  migrateActions,
  actionToHref,
  actionTarget,
  isLinkAction,
  isHandlerAction,
  isAnchorAction,
  findLinkAction,
  type NodeAction,
} from "../../utils/action";
import { motionIt } from "../../utils/motion";
import { applyAnimation } from "../../utils/tailwind/tailwind";
import { replaceVariables } from "../../utils/design/variables";
import { useRuntimeVarsVersion } from "../../utils/design/RuntimeVarsContext";
import { useItemContext } from "../../utils/itemContext";
import { useAnchors } from "../../utils/anchors/anchorContext";
import { useGlobalStateTick } from "../../utils/state/stateRegistry";
import type { RenderCtx } from "../../render/react/RenderCtx";
import { BaseSelectorProps, applyAriaProps } from "../selectors";

const TextEditorMode = React.lazy(() => import("../../chrome/inline-tools/TextEditor"));

export interface TextProps extends BaseSelectorProps {
  text?: string;
  tagName?: string;
  richText?: { mode?: "full" | "inline"; profile?: string };
  textFitMode?: "oneline" | "multiline" | "box" | "boxoneline";
  activeTab?: number;
  action?: NodeAction | NodeAction[];
  click?: any;
}

const sanitizeTagName = (tag: unknown): string | undefined => {
  if (typeof tag !== "string") return undefined;
  if (tag === "Textfit") return tag;
  const clean = tag.split(/[,\s]/)[0].toLowerCase();
  return /^[a-z][a-z0-9]*$/.test(clean) ? clean : undefined;
};

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

const renderLiveMode = (
  props: any,
  rootProps: any,
  pageIndex: any,
  router: any,
  itemContext?: Record<string, any> | null,
  anchors?: Readonly<Record<string, string>> | null
) => {
  const processedText = replaceVariables(props.text, rootProps, itemContext, anchors);
  let tagName = sanitizeTagName(props.tagName);
  const firstLink = findLinkAction(migrateActions(props));
  const resolvedUrl = actionToHref(firstLink, pageIndex, router?.asPath);
  if (resolvedUrl) {
    const isInternal = resolvedUrl.startsWith("/");
    tagName = isInternal ? (Link as any) : ("a" as any);
    const target = actionTarget(firstLink);
    const linkProps: any = {
      href: resolvedUrl,
      dangerouslySetInnerHTML: { __html: unwrapP(processedText) },
      className: props.className || "",
    };
    if (target) linkProps.target = target;
    if (/^https?:\/\//.test(resolvedUrl)) linkProps.rel = "noopener noreferrer";
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

export function renderTextBody(props: any, ctx: RenderCtx) {
  const router = useRouter();
  const itemContext = useItemContext();
  const anchors = useAnchors();
  useRuntimeVarsVersion();
  useGlobalStateTick();

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
    ref: (r: any) => ctx.connect(ctx.drag(r)),
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
  if (needsJsDispatch) addActionHandlers(prop, actions, ctx.enabled);
  addCustomHandlers(prop, props.handlers, ctx.enabled, (props as any).handlerOptions);

  if (ctx.enabled) {
    prop["data-bounding-box"] = ctx.enabled;
    prop["data-empty-state"] = !text;
    if (ctx.isMounted) prop["node-id"] = ctx.id;
    prop["data-gramm"] = false;
    prop.suppressContentEditableWarning = true;
  }

  if (ctx.enabled) {
    prop.children = (
      <React.Suspense
        fallback={
          <div
            dangerouslySetInnerHTML={{
              __html: replaceVariables(text || "", ctx.rootProps, itemContext, anchors),
            }}
          />
        }
      >
        <TextEditorMode
          props={props}
          id={ctx.id}
          query={ctx.query}
          enabled={ctx.enabled}
          isMounted={ctx.isMounted}
          setProp={ctx.setProp}
        />
      </React.Suspense>
    );
  } else {
    const liveContent = renderLiveMode(props, ctx.rootProps, ctx.pageIndex, router, itemContext, anchors);
    const liveLink = findLinkAction(migrateActions(props));
    const liveHref = actionToHref(liveLink, ctx.pageIndex, router?.asPath);
    if (liveHref) {
      prop.children = liveContent;
    } else if (props.tagName === "Textfit") {
      prop.children = liveContent;
    } else {
      const html = typeof liveContent === "string" ? liveContent : "";
      prop.dangerouslySetInnerHTML = { __html: unwrapP(html) };
    }
  }

  const final = applyAnimation({ ...prop, key: `${ctx.id}` }, props, null, ctx.enabled);
  const elementTag = ctx.enabled || tagName === "Textfit" ? "div" : tagName || "div";
  // Viewer mode emits raw HTML via dangerouslySetInnerHTML; the server already
  // rendered identical markup, so suppress React's hydration-mismatch warning.
  if (final.dangerouslySetInnerHTML) final.suppressHydrationWarning = true;
  return React.createElement(motionIt(props, elementTag, ctx.enabled), final);
}
