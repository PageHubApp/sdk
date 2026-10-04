import { actionToHref, findLinkAction, migrateActions } from "../../utils/action";
import { getIntrinsicSizeAttrs } from "../../utils/media/media";
import { ROOT_NODE } from "../../utils/rootNode";
import { getImageSrc } from "./imageProps";
import {
  actionsAttr,
  ariaAttrs,
  attrsPassthrough,
  buildAttrs,
  getPageIndex,
  handlerAttrs,
  interpolate,
  resolveCdnResponsive,
  stateAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../../utils/staticHtml";

export const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const { videoId, type } = props;
  const rawContent = getImageSrc(props);
  const interpolated =
    typeof rawContent === "string" && rawContent.includes("{{")
      ? interpolate(rawContent, ctx)
      : rawContent;
  // A token still unresolved at export (state, filled in live by state-src)
  // must not ship as a URL — the browser would request the literal text.
  const content =
    typeof interpolated === "string" && interpolated.includes("{{") ? "" : interpolated;
  const cls = staticClasses(props, ctx);
  const alt = interpolate(props.alt || props.title || "", ctx);
  const title = interpolate(props.title || "", ctx);

  // Inline SVG
  if (type === "svg" && content) {
    const svgCls = `${cls} [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-full [&>svg]:h-full`;
    return tag(
      "div",
      {
        class: svgCls,
        style: "display: flex; align-items: center; justify-content: center",
        role: alt ? undefined : "presentation",
        "aria-label": alt || undefined,
        ...ariaAttrs(props),
        ...handlerAttrs(props),
        ...actionsAttr(props, ctx),
        ...stateAttrs(props, ctx),
      },
      content
    );
  }

  // Resolve src + responsive variants for CDN-hosted images
  let src = "";
  let srcset = "";
  let sizesAttr = "";
  let cdnId: string | null = null;
  if (videoId) {
    cdnId = videoId;
  } else if (content) {
    if (
      type === "cdn" &&
      !content.startsWith("http") &&
      !content.startsWith("/") &&
      !content.startsWith("data:")
    ) {
      cdnId = content;
    } else {
      src = content;
    }
  }
  if (cdnId) {
    const quality = typeof props.quality === "number" ? props.quality : undefined;
    // The static walker doesn't thread parent className, so `sizes` is derived
    // from the node's own classes only (covers the LCP cases: full-bleed hero
    // via `w-full`/`inset-0`, height-capped logo via `h-N`).
    const r = resolveCdnResponsive(cdnId, {
      className: cls,
      quality,
      sizesOverride: props.sizes,
    });
    src = r.src;
    srcset = r.srcSet || "";
    sizesAttr = r.sizes || "";
  }
  const stateSrc =
    typeof rawContent === "string" && rawContent.includes("{{state.") ? rawContent : "";
  // No src yet is fine when state will supply it — ship the <img> for state-src.
  if (!src && !stateSrc) return "";

  // Intrinsic size → the browser reserves the box before the bytes land (CLS).
  // Only CDN-bound images have a media-library entry to read dimensions from;
  // a full URL / data: src resolves to `cdnId === null` and gets nothing.
  const dims = cdnId
    ? getIntrinsicSizeAttrs(ctx.nodes?.[ROOT_NODE]?.props?.pageMedia, cdnId, { className: cls })
    : null;

  const imgAttrs: Record<string, any> = {
    src: src || undefined,
    srcset: srcset || undefined,
    sizes: srcset ? sizesAttr : undefined,
    width: dims?.width,
    height: dims?.height,
    alt,
    class: cls || undefined,
    title: title || undefined,
    loading: props.loading || "lazy",
    role: !alt ? "presentation" : undefined,
    fetchpriority: props.fetchPriority || undefined,
    ...ariaAttrs(props),
    ...handlerAttrs(props),
    ...actionsAttr(props, ctx),
    ...stateAttrs(props, ctx),
    ...attrsPassthrough(props),
    // `{{state.*}}` in src (e.g. the matched variant's image) can't resolve at
    // export; the runtime's state-src directive swaps it in live.
    ...(stateSrc ? { "data-state-src": stateSrc } : {}),
  };

  const imgTag = `<img${buildAttrs(imgAttrs)} />`;

  const rawHref = actionToHref(findLinkAction(migrateActions(props)), getPageIndex(ctx), ctx?.currentPath);
  const href = typeof rawHref === "string" && rawHref.includes("{{")
    ? interpolate(rawHref, ctx)
    : rawHref;
  if (href) {
    return tag(
      "a",
      {
        href,
        "aria-label": alt || title || "Image link",
      },
      imgTag
    );
  }
  return imgTag;
};
