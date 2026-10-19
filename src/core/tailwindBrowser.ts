/**
 * Runtime Tailwind CSS v4 compiler for standalone SDK usage.
 *
 * When the SDK runs outside the Next.js app (demo, viewer, 3rd-party embeds),
 * there's no build-time Tailwind pipeline to generate CSS for dynamic classes
 * like `bg-primary` or `px-container-x`.
 *
 * This module injects @tailwindcss/browser — a v4 runtime compiler that watches
 * the DOM via MutationObserver and generates CSS on the fly for any Tailwind
 * classes it finds in `class` attributes. It also injects a <style type="text/tailwindcss">
 * block with the SDK's theme tokens so the compiler knows the design system.
 *
 * IMPORTANT: The browser runtime outputs CSS inside @layer blocks. Layered CSS
 * always loses to unlayered CSS (host page resets, etc.). We observe the runtime's
 * output <style> tag and strip @layer wrappers — same approach as the SDK's
 * build-time postcss-unwrap-layers.cjs plugin.
 */

import { rewriteMediaToContainer } from "../utils/breakpointRewrite";
import { scopeCss } from "../utils/canvasScope";
import { THEME_INLINE_CSS } from "./themeInline.generated";

const SCRIPT_ID = "pagehub-tw-browser";
const CONFIG_ID = "pagehub-tw-config";
const LAYER_STRIP_ID = "pagehub-tw-unlayered";
const DAISYUI_ID = "pagehub-daisyui";

/* Theme CSS for @tailwindcss/browser is `THEME_INLINE_CSS`, generated from
 * `packages/sdk/src/utils/design/tokenSource.ts` by `scripts/generate-theme-css.mjs`.
 * Same generator emits `packages/sdk/src/css/theme.css`. `pnpm verify:tokens`
 * blocks drift. Do not edit `themeInline.generated.ts` by hand. */

/**
 * Strip @layer wrappers from CSS text so utilities have normal (unlayered)
 * specificity. Without this, any unlayered CSS on the host page (resets,
 * frameworks, inline styles) would beat the runtime-generated utilities.
 *
 * IMPORTANT: Only strip utilities/components layers, NOT base/theme/properties.
 * Stripping the base layer makes the preflight (`* { padding: 0; border: 0 }`)
 * unlayered, which overrides the editor's @layer components styles (borders,
 * padding, radius on inputs, toolbars, dropdowns).
 */
function stripLayers(css: string): string {
  // Only unwrap utilities and components — leave base/theme/properties layered
  return css.replace(/@layer\s+(utilities|components)\s*\{([\s\S]*?)\n\}/g, "$2");
}

let injected = false;
let layerObserver: MutationObserver | null = null;
/** `@scope` selector for the runtime's output, or null for global output (a full-window editor). */
let outputScope: string | null = null;

export interface TailwindBrowserOptions {
  /**
   * Limit the generated CSS to elements inside this selector (`@scope`), for a
   * host app whose own chrome shares the document (the dashboard passes
   * `CANVAS_SCOPE_SELECTOR`). Media queries then always become canvas
   * container queries. Leave unset where the editor is the whole page.
   */
  scope?: string;
}

/** Strip layers, rewrite breakpoints and scope one runtime output sheet. */
function processRuntimeCss(text: string): string {
  if (!(text.includes("@layer") && text.includes("--tw-"))) return text;
  let next = stripLayers(text);
  // Rewrite media queries to the canvas container: always when scoped (the
  // output only reaches the canvas), else only while the editor is on the
  // page (#viewport carries the container name).
  if (next.includes("@media") && (outputScope || document.getElementById("viewport"))) {
    next = rewriteMediaToContainer(next);
  }
  return outputScope ? scopeCss(next, outputScope) : next;
}

function processRuntimeOutput(): void {
  // The runtime's output is the <style> without an id or type that holds its
  // utilities; it rewrites its textContent on every compile.
  const styles = document.head.querySelectorAll("style:not([id]):not([type])");
  for (const style of styles) {
    const text = style.textContent || "";
    const next = processRuntimeCss(text);
    if (next !== text) style.textContent = next;
  }
}

/**
 * Inject the Tailwind v4 browser runtime into the page.
 *
 * Safe to call multiple times — only injects once.
 * Should be called early (before React renders) so the MutationObserver
 * is ready to pick up classes as components mount.
 */
export function injectTailwindBrowser(options: TailwindBrowserOptions = {}): void {
  if (typeof window === "undefined") return;
  const scope = options.scope ?? null;
  const scopeChanged = scope !== outputScope;
  outputScope = scope;
  if (injected) {
    // Re-process what the runtime already emitted under the new scope.
    if (scopeChanged) processRuntimeOutput();
    return;
  }
  if (document.getElementById(SCRIPT_ID)) {
    injected = true;
    return;
  }

  // Note: We no longer skip in Next.js — the build pipeline handles static classes,
  // but dynamic classes created at runtime (e.g. drag-adjust spacing) need the
  // browser compiler to generate CSS on the fly.

  // 1. Inject theme config as <style type="text/tailwindcss">
  const configStyle = document.createElement("style");
  configStyle.id = CONFIG_ID;
  configStyle.setAttribute("type", "text/tailwindcss");
  configStyle.textContent = THEME_INLINE_CSS;
  document.head.appendChild(configStyle);

  // 2. Inject DaisyUI component CSS (cherry-picked bundle, ~50KB gzipped)
  if (!document.getElementById(DAISYUI_ID)) {
    const daisyLink = document.createElement("link");
    daisyLink.id = DAISYUI_ID;
    daisyLink.rel = "stylesheet";
    daisyLink.href = "/vendor/daisyui-blocks.css";
    document.head.appendChild(daisyLink);
  }

  // 3. Inject the compiler script
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = "/vendor/tailwind-browser.js";
  document.head.appendChild(script);

  // 3. Watch for the runtime's output <style> tag and strip @layer wrappers.
  //    The browser runtime appends a <style> to <head> and updates its textContent.
  //    We observe mutations and rewrite the CSS to remove @layer blocks.
  //
  //    PHASE 3: Also rewrite `@media` → `@container ph-editor-canvas` so any
  //    dynamic class added during editing (e.g. user types a new utility) lands
  //    in the same container-query namespace as SSR-baked CSS — required for
  //    side-by-side mirror frames to behave correctly.
  layerObserver = new MutationObserver(processRuntimeOutput);

  layerObserver.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  injected = true;
}

/**
 * Remove the Tailwind browser runtime (for cleanup/destroy).
 */
export function removeTailwindBrowser(): void {
  if (typeof window === "undefined") return;

  if (layerObserver) {
    layerObserver.disconnect();
    layerObserver = null;
  }
  outputScope = null;

  const script = document.getElementById(SCRIPT_ID);
  if (script) script.remove();

  const config = document.getElementById(CONFIG_ID);
  if (config) config.remove();

  const daisy = document.getElementById(DAISYUI_ID);
  if (daisy) daisy.remove();

  injected = false;
}
