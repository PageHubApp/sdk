/** Pure body for Image. NO `@craftjs/core`. */
/* eslint-disable react-hooks/rules-of-hooks -- render*Body fns are invoked once from a wrapper component; hook order is preserved. Renamed to use* would change exported public-ish API across the SDK. */
import React, { useRef } from "react";
import { TbCheck, TbPhoto } from "../_emptyHintIcons";
import { EditorEmptyLeafHint } from "../../chrome/primitives/EditorEmptyLeafHint";
import { Image as UiImage } from "@pagehub/ui";
import { getCdnUrl, generateSrcSet, generateSizes, inferFixedSizesFromClassName } from "../../utils/cdn";

const IMAGE_RESPONSIVE_WIDTHS = [320, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const IMAGE_RESPONSIVE_SIZES = generateSizes({
  "(max-width: 640px)": "100vw",
  "(max-width: 1024px)": "50vw",
  default: "33vw",
});
import {
  migrateActions,
  actionToHref,
  isLinkAction,
  isHandlerAction,
  isAnchorAction,
  findLinkAction,
} from "../../utils/action";
import { addActionHandlers } from "../../utils/actions/dispatcher";
import { addCustomHandlers } from "../../utils/actions/customHandlers";
import { getResponsiveImageAttrs } from "../../utils/media/media";
import { motionIt } from "../../utils/motion";
import { CSStoObj, applyAnimation } from "../../utils/tailwind/tailwind";
import { replaceVariables } from "../../utils/design/variables";
import { useRuntimeVarsVersion } from "../../utils/design/RuntimeVarsContext";
import { useItemContext } from "../../utils/itemContext";
import type { RenderCtx } from "../../render/RenderCtx";
import { BaseSelectorProps, applyAriaProps } from "../selectors";
import { getImageSrcString, type ImageSrcSource } from "./imageProps";

export const ImageDefault = ({ tab, props }: any) => {
  const setActiveTab = (_: any) => {};
  return (
    <button
      onClick={() => setActiveTab(tab)}
      className="flex size-full items-center justify-center text-3xl"
      aria-label="Add image"
    >
      {props.isLoading && (
        <div role="status" aria-live="polite">Loading...</div>
      )}
      {!props.isLoading && !props.loaded && <TbPhoto aria-label="Photo icon" />}
      {props.loaded && <TbCheck aria-label="Success" />}
    </button>
  );
};

export interface ImageProps extends BaseSelectorProps, ImageSrcSource {
  videoId?: string;
  type?: string;
  src?: string;
  /**
   * @deprecated Legacy alias for `src`. Kept for back-compat reading of saved
   * pages — never write to this field. See `imageProps.ts` for context.
   */
  content?: string;
  url?: string;
  fetchPriority?: "high" | "low" | "auto" | "";
  loading?: string;
  alt?: string;
  title?: string;
  quality?: number;
}

export function renderImageBody(props: ImageProps & Record<string, any>, ctx: RenderCtx) {
  const itemContext = useItemContext();
  useRuntimeVarsVersion();

  const { videoId } = props;
  const rawSrcStr = getImageSrcString(props);
  const srcStr = rawSrcStr.includes("{{")
    ? replaceVariables(rawSrcStr, ctx.rootProps, itemContext)
    : rawSrcStr;

  const ref = useRef(null);

  let mediaMetadata: any = null;
  let mediaObject: any = null;
  if (videoId && ctx.pageMedia) {
    mediaObject = ctx.pageMedia.find((m: any) => m.id === videoId);
    if (mediaObject?.metadata) mediaMetadata = mediaObject.metadata;
  }

  const cn = props.className || "";
  const hasRadius = cn.split(/\s+/).some((t: string) => {
    const u = t.replace(/^(sm:|md:|lg:|xl:|2xl:)+/, "");
    return u === "rounded" || u.startsWith("rounded-");
  });

  const actions = migrateActions(props);
  const firstLink = findLinkAction(actions);
  const resolvedHref = actionToHref(firstLink, ctx.pageIndex) || (props as any).url;

  const prop: any = {
    ref: (r: any) => {
      ref.current = r;
      ctx.connect(ctx.drag(r));
    },
    href: resolvedHref,
    onClick: (e: any) => {
      ctx.enabled && e.preventDefault();
    },
    style: (props as any).root?.style ? CSStoObj((props as any).root.style) || {} : {},
    className: `${hasRadius ? "overflow-hidden" : ""} ${props.className || ""}`.trim(),
  };
  applyAriaProps(prop, props);

  const needsJsDispatch =
    actions.length > 1 ||
    actions.some(a => isHandlerAction(a) || isAnchorAction(a)) ||
    (actions.length === 1 && !isLinkAction(actions[0]));
  if (needsJsDispatch) {
    addActionHandlers(prop, actions, ctx.enabled, {
      resolvedLinkHref: typeof resolvedHref === "string" ? resolvedHref : null,
    });
  }
  addCustomHandlers(prop, (props as any).handlers, ctx.enabled, (props as any).handlerOptions);
  if (actions.length > 0 && !ctx.enabled) {
    prop["data-action"] = actions.map(a => a.type).join(" ");
  }

  const resolveVar = (v: string) =>
    v?.includes("{{") ? replaceVariables(v, ctx.rootProps, itemContext) : v;
  const altText =
    mediaMetadata?.alt ||
    resolveVar(props.alt as string) ||
    mediaMetadata?.title ||
    resolveVar(props.title as string) ||
    "";
  const titleText = mediaMetadata?.title || resolveVar(props.title as string) || "";
  const hasObjectFit = (props.className || "").includes("object-");

  const _imgProp: any = {
    loading: props.loading || "lazy",
    alt: altText,
    title: titleText,
    role: !altText && !titleText ? "presentation" : undefined,
    className:
      `${ctx.enabled ? "w-full h-full" : ""} ${!hasObjectFit ? "object-cover" : ""} ${props.className || ""}`.trim(),
  };

  const isSvg = props.type === "svg" || mediaObject?.type === "svg";
  if (isSvg) {
    let svgContent: string | null = null;
    if (videoId && mediaMetadata?.svg) svgContent = mediaMetadata.svg;
    if (!svgContent && srcStr) svgContent = srcStr;
    if (svgContent) {
      _imgProp.dangerouslySetInnerHTML = { __html: svgContent };
      _imgProp.className =
        `${_imgProp.className} [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-full [&>svg]:h-full`.trim();
      _imgProp.style = { display: "flex", alignItems: "center", justifyContent: "center" };
    }
  } else {
    if (videoId) {
      const r = getResponsiveImageAttrs(ctx.pageMedia, videoId);
      _imgProp.src = r.src;
      if (r.srcset) {
        _imgProp.srcSet = r.srcset;
        _imgProp.sizes = r.sizes;
      }
    } else if (
      props.type === "cdn" &&
      srcStr &&
      !srcStr.startsWith("http") &&
      !srcStr.startsWith("/") &&
      !srcStr.startsWith("data:")
    ) {
      const quality = typeof props.quality === "number" ? props.quality : undefined;
      const cdnOpts: Parameters<typeof getCdnUrl>[1] = { width: 1280, format: "auto" };
      if (quality !== undefined) cdnOpts.quality = quality;
      _imgProp.src = getCdnUrl(srcStr, cdnOpts);
      _imgProp.srcSet = generateSrcSet(srcStr, IMAGE_RESPONSIVE_WIDTHS, {
        format: "auto",
        ...(quality !== undefined ? { quality } : {}),
      });
      _imgProp.sizes =
        inferFixedSizesFromClassName(props.className, ctx.parentClassName) ||
        IMAGE_RESPONSIVE_SIZES;
    } else {
      _imgProp.src = srcStr || null;
    }
    if (props.fetchPriority) _imgProp.fetchPriority = props.fetchPriority;
  }

  const looksStyledShape = /\bbg-/.test(cn) || /\bbg-gradient-/.test(cn) || /\bbg-linear-/.test(cn);
  const empty = !videoId && !srcStr && !looksStyledShape;

  if (ctx.enabled) {
    if (empty) {
      prop.children = (props as any).isLoading ? (
        <ImageDefault tab="Image" props={props} />
      ) : (
        <EditorEmptyLeafHint
          selected={ctx.isActive}
          icon={<TbPhoto aria-hidden />}
          idleLabel="Empty image"
          selectedLabel="Drop here or right-click"
        />
      );
    }
    prop["data-bounding-box"] = ctx.enabled;
    prop["data-empty-state"] = empty;
    if (ctx.isMounted) prop["node-id"] = ctx.id;
  }

  let tagName: any;
  if (empty) tagName = "div";
  else if (isSvg) tagName = "div";
  else tagName = "img";

  const createImgElement = (shouldConnectDrag: boolean) => {
    const imgTag = tagName === "img" ? UiImage : tagName;
    const imgAnimProps = applyAnimation({ ..._imgProp, key: `img-${ctx.id}` }, props as any, null, ctx.enabled);
    const imgFinalProps =
      tagName === "img" ? { ...imgAnimProps, ratio: null, fit: null, rounded: null } : imgAnimProps;
    return React.createElement(motionIt(props as any, imgTag, ctx.enabled), {
      ...imgFinalProps,
      ref: shouldConnectDrag
        ? (r: any) => {
            if ((props as any).url) return;
            ref.current = r;
            ctx.connect(ctx.drag(r));
          }
        : undefined,
    });
  };

  if (ctx.enabled && ctx.isMounted) {
    const Img = createImgElement(false);
    prop.children = <>{empty ? prop.children : Img}</>;
    const ele = (props as any).url ? "a" : "div";
    return React.createElement(ele, {
      ...prop,
      "aria-label": (props as any).url ? altText || titleText || "Image link" : undefined,
    });
  }

  const Img = createImgElement(true);
  if (!empty) {
    if ((props as any).url) {
      prop.children = Img;
      return React.createElement("a", {
        ...prop,
        "aria-label": altText || titleText || "Image link",
      });
    }
    return Img;
  }
  return React.createElement("div", prop);
}
