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

const SCRIPT_ID = "pagehub-tw-browser";
const CONFIG_ID = "pagehub-tw-config";
const LAYER_STRIP_ID = "pagehub-tw-unlayered";
const DAISYUI_ID = "pagehub-daisyui";

/**
 * The theme CSS that @tailwindcss/browser needs to understand
 * the SDK's design tokens. Mirrors styles.css @theme inline block.
 */
const THEME_CSS = `
@custom-variant dark (&:is(.dark *):not(#viewport:not(.dark) *));

@theme inline {
  /* DaisyUI 5 canonical tokens */
  --color-primary: var(--primary);
  --color-primary-content: var(--primary-content);
  --color-secondary: var(--secondary);
  --color-secondary-content: var(--secondary-content);
  --color-accent: var(--accent);
  --color-accent-content: var(--accent-content);
  --color-neutral: var(--neutral);
  --color-neutral-content: var(--neutral-content);
  --color-base-100: var(--base-100);
  --color-base-200: var(--base-200);
  --color-base-300: var(--base-300);
  --color-base-content: var(--base-content);
  --color-error: var(--error);
  --color-error-content: var(--error-content);
  --color-info: var(--info);
  --color-info-content: var(--info-content);
  --color-success: var(--success);
  --color-success-content: var(--success-content);
  --color-warning: var(--warning);
  --color-warning-content: var(--warning-content);
  --color-border: var(--base-300);
  --color-input: var(--base-300);
  --color-ring: var(--ring);
  /* Backwards-compat aliases */
  --color-background: var(--base-100);
  --color-foreground: var(--base-content);
  --color-card: var(--base-200);
  --color-card-foreground: var(--base-content);
  --color-popover: var(--base-100);
  --color-popover-foreground: var(--base-content);
  --color-primary-foreground: var(--primary-content);
  --color-secondary-foreground: var(--secondary-content);
  --color-accent-foreground: var(--accent-content);
  --color-muted: var(--neutral);
  --color-muted-foreground: var(--neutral-content);
  --color-destructive: var(--error);
  --color-destructive-foreground: var(--error-content);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-border: var(--sidebar-border);

  --font-sans: var(--font-sans), sans-serif;
  --font-serif: var(--font-serif), serif;
  --font-mono: var(--font-mono), monospace;
  --font-heading: var(--heading-font-family), sans-serif;
  --font-body: var(--body-font-family), sans-serif;
  --font-accent: var(--accent-font-family), sans-serif;

  /* Spatial scale: py-space-xl, gap-space-md, px-space-sm, etc. */
  --spacing-space-xs: var(--space-xs);
  --spacing-space-sm: var(--space-sm);
  --spacing-space-md: var(--space-md);
  --spacing-space-lg: var(--space-lg);
  --spacing-space-xl: var(--space-xl);
  --spacing-container-x: var(--container-padding-x);
  --spacing-container-y: var(--container-padding-y);
  --spacing-section: var(--section-gap);
  --spacing-container: var(--container-gap);
  --max-width-page: var(--content-width);

  /* Radius */
  --radius-box: var(--radius-box);
  --radius-field: var(--radius-field);
  --radius-selector: var(--radius-selector);
  --radius-full: var(--radius-full, 9999px);
  --radius-sm: 0.125rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-3xl: 1.5rem;


}
`;

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

/**
 * Inject the Tailwind v4 browser runtime into the page.
 *
 * Safe to call multiple times — only injects once.
 * Should be called early (before React renders) so the MutationObserver
 * is ready to pick up classes as components mount.
 */
export function injectTailwindBrowser(): void {
  if (typeof window === "undefined") return;
  if (injected) return;
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
  configStyle.textContent = THEME_CSS;
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
  layerObserver = new MutationObserver(() => {
    // Find the runtime's output style — it's the last <style> without an id
    // that contains @layer (the runtime doesn't set an id on its output tag)
    const styles = document.head.querySelectorAll("style:not([id]):not([type])");
    for (const style of styles) {
      const text = style.textContent || "";
      if (text.includes("@layer") && text.includes("--tw-")) {
        let next = stripLayers(text);
        // Only rewrite when in editor (#viewport carries the container-name).
        if (
          typeof document !== "undefined" &&
          document.getElementById("viewport") &&
          next.includes("@media")
        ) {
          next = rewriteMediaToContainer(next);
        }
        if (next !== text) {
          style.textContent = next;
        }
      }
    }
  });

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

  const script = document.getElementById(SCRIPT_ID);
  if (script) script.remove();

  const config = document.getElementById(CONFIG_ID);
  if (config) config.remove();

  const daisy = document.getElementById(DAISYUI_ID);
  if (daisy) daisy.remove();

  injected = false;
}
