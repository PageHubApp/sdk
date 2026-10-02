/** Pure body for Text. NO `@craftjs/core`. */
/* eslint-disable react-hooks/rules-of-hooks -- render*Body fns are invoked once from a wrapper component; hook order is preserved. Renamed to use* would change exported public-ish API across the SDK. */
import React, { useEffect, useState } from "react";
import { AutoTextSize } from "auto-text-size";
import { useRouter } from "next/router";
import { addActionHandlers } from "../../utils/actions/dispatcher";
import { addCustomHandlers } from "../../utils/actions/customHandlers";
import { applyAttrs } from "../../utils/applyAttrs";
import {
  migrateActions,
  actionToHref,
  actionTarget,
  needsJsActionDispatch,
  findLinkAction,
  type NodeAction,
} from "../../utils/action";
import NextLink from "next/link";
import { motionIt } from "../../utils/motion";
import { applyAnimation } from "../../utils/tailwind/tailwind";
import { replaceVariables } from "../../utils/design/variables";
import { unwrapP } from "../../utils/unwrapP";
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

const renderLiveMode = (
  props: any,
  rootProps: any,
  pageIndex: any,
  router: any,
  itemContext?: Record<string, any> | null,
  anchors?: Readonly<Record<string, string>> | null,
  jsDispatch = false
) => {
  const processedText = replaceVariables(props.text, rootProps, itemContext, anchors);
  let tagName = sanitizeTagName(props.tagName);
  const firstLink = findLinkAction(migrateActions(props));
  const resolvedUrl = actionToHref(firstLink, pageIndex, router?.asPath);
  if (resolvedUrl) {
    // SPA nav (next/link) for internal links; plain <a> for external. The
    // custom-domain `/` rewrite is client-replayable (`:host` captured — see
    // next.config), so even the site root "/" resolves client-side.
    // When the outer element's dispatcher owns the click (`jsDispatch`), the
    // wrapper stays a plain <a>: next/link's own handler runs first on the
    // inner element and would push the route before the dispatcher's
    // preventDefault + navigation, navigating twice.
    const isInternal = resolvedUrl.startsWith("/");
    tagName = isInternal && !jsDispatch ? (NextLink as any) : ("a" as any);
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
  // Text wraps link content in <a> via renderLiveMode; the outer element gets
  // the dispatcher onClick (see `needsJsActionDispatch`), which the inner
  // <a>'s click bubbles to.
  const liveHref = actionToHref(findLinkAction(actions), ctx.pageIndex, router?.asPath);
  const jsDispatch = needsJsActionDispatch(actions);
  if (jsDispatch) addActionHandlers(prop, actions, ctx.enabled, { resolvedLinkHref: liveHref });
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
    const liveContent = renderLiveMode(
      props,
      ctx.rootProps,
      ctx.pageIndex,
      router,
      itemContext,
      anchors,
      jsDispatch
    );
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
