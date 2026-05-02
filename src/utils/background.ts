/**
 * Background image, overlay, and pattern utilities
 */

import React from "react";
import { getCdnUrl } from "./cdn";
import { getMediaContent, looksLikeCdnImageId, calculateOptimalBackgroundSize } from "./media/media";

// ─── Color helpers (needed by generatePattern) ───

function extractRGBA(rgbaString: string) {
  const regex = /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d*(?:\.\d+)?)\s*\)/;
  const matches = rgbaString.match(regex);
  if (!matches) return null;
  return {
    r: parseInt(matches[1]),
    g: parseInt(matches[2]),
    b: parseInt(matches[3]),
    a: parseFloat(matches[4]),
  };
}

function hexToHSL(H: string) {
  if (!H) return;
  const c = extractRGBA(H);
  if (!c) return;
  let { r, g, b, a } = c;

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

  const l = +(((cmax + cmin) / 2) * 100).toFixed(1);
  s = +((delta === 0 ? 0 : delta / (1 - Math.abs(2 * ((cmax + cmin) / 2) - 1))) * 100).toFixed(
    1
  ) as unknown as number;

  return `hsla(${h},${s}%,${l}%,${a})`;
}

// ─── Pattern Generation ───

export const generatePattern = (props: any) => {
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
    "transparent",
    ...[...Array(maxColors - 1).keys()]
      .map((_: number) => hexToHSL(props.root[`patternColor${+_ + 1}`]))
      .filter((_: string | undefined) => _),
  ];

  spacing = spacing || [+patternSpacingX || 0, +patternSpacingY || 0];

  const svgPattern = (
    colors: string[],
    colorCounts: number,
    stroke: number,
    scale: number,
    spacing: number[],
    angle: number,
    join: number,
    moveLeft: number,
    moveTop: number
  ) => {
    function multiStroke(i: number) {
      let defColor = colors[i + 1];
      if (vHeight === 0 && maxColors > 2) {
        if (colorCounts === 3 && maxColors === 4 && i === 2) defColor = colors[1];
        else if (colorCounts === 4 && maxColors === 5 && i === 3) defColor = colors[1];
        else if (colorCounts === 3 && maxColors === 5 && i === 3) defColor = colors[1];
        else if (colorCounts === 3 && maxColors === 5 && i === 2) defColor = colors[1];
        else if (colorCounts === 2) defColor = colors[1];
      }
      let strokeFill = "";
      let joinMode = "";
      if (mode === "stroke-join") {
        strokeFill = ` stroke='${defColor}' fill='none'`;
        joinMode =
          join === 2
            ? "stroke-linejoin='round' stroke-linecap='round' "
            : "stroke-linecap='square' ";
      } else if (mode === "stroke") {
        strokeFill = ` stroke='${defColor}' fill='none'`;
      } else {
        strokeFill = ` stroke='none' fill='${defColor || "white"}'`;
      }
      return path
        .split("~")
        [i].replace(
          "/>",
          ` transform='translate(${spacing[0] / 2},0)' ${joinMode}stroke-width='${stroke}'${strokeFill}/>`
        )
        .replace("transform='translate(0,0)' ", " ");
    }

    let strokeGroup = "";
    const count = vHeight === 0 && maxColors > 2 ? maxColors - 1 : colorCounts - 1;
    for (let i = 0; i < count; i++) strokeGroup += multiStroke(i);

    const patternNew =
      "<svg id='patternId' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg'><defs>" +
      `<pattern id='a' patternUnits='userSpaceOnUse' width='${width + spacing[0]}' height='${
        height - vHeight * (maxColors - colorCounts) + spacing[1]
      }' patternTransform='scale(${scale}) rotate(${angle})'><rect x='0' y='0' width='100%' height='100%' fill='${colors[0] || "white"}'/>${
        strokeGroup
      }</pattern></defs><rect width='800%' height='800%' transform='translate(${
        scale * moveLeft
      },${scale * moveTop})' fill='url(#a)'/></svg>`;
    return `data:image/svg+xml;base64,${btoa(patternNew)}`;
  };

  return svgPattern(co, maxColors, stroke, scale, spacing, angle, join, moveLeft, moveTop);
};

// ─── Background URL ───

export const getBackgroundUrl = (props: any, pageMedia: any[] | null = null) => {
  const bg = props.background;
  if (!bg?.image) return null;

  const type = bg.imageType;
  const content = bg.image;

  if (content.startsWith("http") || content.startsWith("/") || content.startsWith("data:")) {
    return content;
  }

  if (pageMedia && content) {
    const fromLibrary = getMediaContent(pageMedia, content);
    if (fromLibrary) return fromLibrary;
  }

  const useCdnUrl =
    content &&
    type !== "url" &&
    type !== "svg" &&
    (type === "cdn" ||
      ((type === undefined || type === null || type === "") && looksLikeCdnImageId(content)));
  if (useCdnUrl) {
    return getCdnUrl(content.trim(), { width: calculateOptimalBackgroundSize(), format: "auto" });
  }

  return content;
};

// ─── Apply helpers ───

export const applyPattern = (prop: any, props: any, settings: any) => {
  if (props.root?.pattern) {
    const patt = generatePattern(props);
    if (patt) {
      prop.style = prop.style || {};
      prop.style.backgroundImage = `url(${patt})`;
    }
  }
  return prop;
};

export const applyBackgroundImage = (
  prop: any,
  props: any,
  settings: any,
  pageMedia: any[] | null = null
) => {
  const bg = props.background;
  if (!bg?.image) return prop;

  const _imgProp = { src: getBackgroundUrl(props, pageMedia) };
  if (!_imgProp.src) return prop;

  prop.style = prop.style || {};
  prop.style.backgroundImage = `url(${_imgProp.src})`;

  if (bg.priority) {
    const existingChildren = prop.children;
    const preloadImageElement = React.createElement("img", {
      src: _imgProp.src,
      alt: "",
      loading: "eager",
      fetchPriority: bg.fetchPriority || "high",
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
    prop.children = React.createElement(React.Fragment, {}, preloadImageElement, existingChildren);
  }

  return prop;
};

export const applyLazyBackgroundImage = (
  prop: any,
  props: any,
  settings: any,
  pageMedia: any[] | null = null,
  lazyRef: any = null
) => {
  const bg = props.background;
  if (!bg?.image) return prop;

  const _imgProp = { src: getBackgroundUrl(props, pageMedia) };
  if (!_imgProp.src) return prop;

  prop.style = prop.style || {};

  if (bg.lazy) {
    prop["data-bg"] = _imgProp.src;
    prop["data-bg-loaded"] = "false";
    if (bg.placeholder) prop.style.backgroundColor = bg.placeholder;
    if (lazyRef) prop.ref = lazyRef;
  } else {
    prop.style.backgroundImage = `url(${_imgProp.src})`;

    if (bg.priority) {
      const existingChildren = prop.children;
      const preloadImageElement = React.createElement("img", {
        src: _imgProp.src,
        alt: "",
        loading: "eager",
        fetchPriority: bg.fetchPriority || "high",
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

  return prop;
};
