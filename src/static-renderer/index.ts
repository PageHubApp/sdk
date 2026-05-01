/**
 * @pagehub/sdk — Static HTML Renderer
 *
 * Generic tree walker that uses each component's .toHTML.ts file.
 * No React, no DOM, no browser — runs in Node, edge workers, or build scripts.
 *
 * Usage:
 * ```ts
 * import { renderToHTML } from '@pagehub/sdk/static-renderer';
 *
 * const { html, classes, fontUrls } = renderToHTML(compressedContent);
 * const { html } = renderToHTML(jsonString, { compressed: false });
 * ```
 */

export { cachedPreviewGoogleTextFontUrlsLookInvalid } from "./fonts";
export { renderToHTML } from "./renderToHTML";
export { buildRootThemeCss } from "./themeCss";
export {
  RENDER_INVALID_TREE_MESSAGE,
  type RenderToHTMLOptions,
  type RenderToHTMLResult,
} from "./types";
export type { StaticRenderContext, ToHTMLFn } from "../utils/staticHtml";
