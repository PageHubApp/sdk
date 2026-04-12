import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { TbCheck, TbPhoto } from "react-icons/tb";
import { EditorEmptyLeafHint } from "../chrome/shared/EditorEmptyLeafHint";
import { Image as UiImage } from "@pagehub/ui";
import { getCdnUrl } from "../utils/cdn";
import { migrateAction, actionToHref } from "../utils/action";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { getResponsiveImageAttrs, motionIt } from "../utils/lib";
import { CSStoObj, applyAnimation } from "../utils/tailwind/tailwind";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

export const ImageDefault = ({ tab, props }) => {
  const setActiveTab = (_: any) => {};

  return (
    <button
      onClick={() => {
        setActiveTab(tab);
        // setTimeout(() => document.getElementById("files")?.click(), 50);
      }}
      className="flex size-full items-center justify-center text-3xl"
      aria-label="Add image"
    >
      {props.isLoading && (
        <div role="status" aria-live="polite">
          Loading...
        </div>
      )}
      {!props.isLoading && !props.loaded && <TbPhoto aria-label="Photo icon" />}
      {props.loaded && <TbCheck aria-label="Success" />}
    </button>
  );
};

export interface ImageProps extends BaseSelectorProps {
  videoId?: string;
  type?: string;
  content?: string;
  url?: string;
  priority?: string;
  fetchPriority?: "high" | "low" | "auto" | "";
  loading?: string;
  alt?: string;
  title?: string;
}

export const Image = (incomingProps: ImageProps) => {
  let props: any = { type: "cdn", loading: "lazy", fetchPriority: "low", ...incomingProps };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();
  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const { isActive } = useEditor((_, q) => ({
    isActive: q.getEvent("selected").contains(id),
  }));

  const { videoId, content } = props;

  /** Craft / AI sometimes stores non-strings; guard before string methods. */
  const contentStr =
    content == null
      ? ""
      : typeof content === "string"
        ? content
        : typeof content === "number" || typeof content === "boolean"
          ? String(content)
          : "";

  props = setClonedProps(props, query);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const ref = useRef(null);

  // Look up media from media library at render time
  let mediaMetadata = null;
  let mediaObject = null;
  if (videoId) {
    try {
      const backgroundNode = query.node("ROOT").get();
      if (backgroundNode) {
        const pageMedia = backgroundNode.data.props.pageMedia || [];
        mediaObject = pageMedia.find((m: any) => m.id === videoId);
        if (mediaObject?.metadata) {
          mediaMetadata = mediaObject.metadata;
        }
      }
    } catch (e) {
      // Silent fail - just use props if lookup fails
    }
  }

  // Check if radius is set (for overflow-hidden)
  const cn = props.className || "";
  const hasRadius = cn.split(/\s+/).some(t => {
    const u = t.replace(/^(sm:|md:|lg:|xl:|2xl:)+/, "");
    return u === "rounded" || u.startsWith("rounded-");
  });

  const prop: any = {
    ref: r => {
      ref.current = r;
      connect(drag(r));
    },
    href: actionToHref(migrateAction(props)) || props.url,
    onClick: e => {
      enabled && e.preventDefault();
    },
    style: props.root?.style ? CSStoObj(props.root.style) || {} : {},
    // Wrapper gets ALL layout classes (sizing, spacing, borders, shadows, radius, etc.)
    // EXCEPT image-specific rendering (object-fit, object-position)
    // Add overflow-hidden if radius is set to clip image corners properly
    className: `${hasRadius ? "overflow-hidden" : ""} ${props.className || ""}`.trim(),
  };

  applyAriaProps(prop, props);

  // Use metadata from media library, fallback to props
  const altText = mediaMetadata?.alt || props.alt || mediaMetadata?.title || props.title || "";
  const titleText = mediaMetadata?.title || props.title || "";

  // Check if objectFit is set in className
  const hasObjectFit = (props.className || "").includes("object-");

  const _imgProp: any = {
    loading: props.loading || "lazy",
    alt: altText,
    title: titleText,
    role: !altText && !titleText ? "presentation" : undefined,
    // Different behavior for editor vs live view
    // Editor: img fills wrapper (w-full h-full) + gets object-fit/position classes
    // Live view: img gets sizing classes directly + gets object-fit/position classes
    className:
      `${enabled ? "w-full h-full" : ""} ${!hasObjectFit ? "object-cover" : ""} ${props.className || ""}`.trim(),
    // width: "100",
    // height: "100",
    // fill: true,
  };

  // Check if media is SVG type (either from props.type or media library)
  const isSvg = props.type === "svg" || mediaObject?.type === "svg";

  if (isSvg) {
    // Prefer library when videoId is set so stale `content` does not override a new pick
    let svgContent = null;
    if (videoId && mediaMetadata?.svg) {
      svgContent = mediaMetadata.svg;
    }
    if (!svgContent && content) {
      svgContent = content;
    }

    if (svgContent) {
      _imgProp.dangerouslySetInnerHTML = { __html: svgContent };
      // Add classes and styles to ensure SVG fits within container
      // Use Tailwind arbitrary values for the nested SVG selector
      // Note: w-full h-full already applied to base className
      _imgProp.className =
        `${_imgProp.className} [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-full [&>svg]:h-full`.trim();
      // Inline styles for flexbox centering
      _imgProp.style = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      };
    }
  } else {
    // Use responsive image system for CDN images
    if (videoId) {
      const responsiveAttrs = getResponsiveImageAttrs(query, videoId);

      _imgProp.src = responsiveAttrs.src;

      // Only add srcset/sizes if available (CDN images only)
      if (responsiveAttrs.srcset) {
        _imgProp.srcSet = responsiveAttrs.srcset;
        _imgProp.sizes = responsiveAttrs.sizes;
      }
    } else {
      if (
        props.type === "cdn" &&
        contentStr &&
        !contentStr.startsWith("http") &&
        !contentStr.startsWith("/") &&
        !contentStr.startsWith("data:")
      ) {
        _imgProp.src = getCdnUrl(contentStr, { width: 1280, format: "auto" });
      } else {
        _imgProp.src = contentStr || null;
      }
    }

    // Add fetchpriority attribute to the img element
    if (props.fetchPriority) {
      _imgProp.fetchPriority = props.fetchPriority;
    }

    // Add preload link to document head when priority is enabled
    if (props.priority && typeof document !== "undefined" && _imgProp.src) {
      const link = document.createElement("link");

      link.rel = "preload";
      link.href = _imgProp.src;
      link.as = "image";

      // Apply fetchPriority to preload link if set
      if (props.fetchPriority) {
        link.fetchPriority = props.fetchPriority as "high" | "low" | "auto";
      }

      const preloadLink = document.querySelector(
        `link[rel="preload"][href="${link.href}"][as="image"]`
      );
      if (!preloadLink) document.head.appendChild(link);
    }
  }

  const empty = !videoId && !contentStr;

  if (enabled) {
    if (empty) {
      prop.children = props.isLoading ? (
        <ImageDefault tab="Image" props={props} />
      ) : (
        <EditorEmptyLeafHint
          selected={isActive}
          icon={<TbPhoto aria-hidden />}
          idleLabel="Empty image"
          selectedDetail="Pick a file in settings"
        />
      );
    }
    prop["data-bounding-box"] = enabled;
    prop["data-empty-state"] = empty;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  let tagName;
  if (empty) {
    tagName = "div";
  } else if (isSvg) {
    // Use div wrapper for inline SVG to avoid nested svg tags
    tagName = "div";
  } else {
    tagName = "img";
  }

  // Create the actual img/svg/div element.
  // Use @pagehub/ui Image for actual <img> renders (not SVG divs or empty states).
  // Suppress UiImage's built-in variant classes — className is the source of truth.
  const createImgElement = (shouldConnectDrag: boolean) => {
    const imgTag = tagName === "img" ? UiImage : tagName;
    const imgAnimProps = applyAnimation({ ..._imgProp, key: `img-${id}` }, props, null, enabled);
    const imgFinalProps =
      tagName === "img" ? { ...imgAnimProps, ratio: null, fit: null, rounded: null } : imgAnimProps;
    return React.createElement(motionIt(props, imgTag, enabled), {
      ...imgFinalProps,
      ref: shouldConnectDrag
        ? r => {
            if (props.url) return;
            ref.current = r;
            connect(drag(r));
          }
        : undefined,
    });
  };

  // If in edit mode with inline tools, wrap in container
  if (enabled && isMounted) {
    const Img = createImgElement(false); // Don't connect drag to img, connect to wrapper

    // For all cases, wrap the image
    // Don't use dangerouslySetInnerHTML on the wrapper - it's on the SVG element itself
    prop.children = <>{empty ? prop.children : Img}</>;

    const ele = props.url ? "a" : "div";
    return React.createElement(ele, {
      ...prop,
      "aria-label": props.url ? altText || titleText || "Image link" : undefined,
    });
  }

  // Preview mode - simpler structure
  const Img = createImgElement(true); // Connect drag to img directly

  // For inline SVG or regular images, wrap in container if there's a URL
  if (!empty) {
    if (props.url) {
      prop.children = Img;
      const ele = "a";
      return React.createElement(ele, {
        ...prop,
        "aria-label": altText || titleText || "Image link",
      });
    }
    // No URL, just return the image/svg directly
    return Img;
  }

  // Empty state
  const ele = "div";
  return React.createElement(ele, prop);
};

Image.craft = {
  displayName: "Image",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
