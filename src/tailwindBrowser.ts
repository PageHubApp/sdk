/**
 * Runtime Tailwind CSS v4 compiler for standalone SDK usage.
 *
 * When the SDK runs outside the Next.js app (demo, viewer, 3rd-party embeds),
 * there's no build-time Tailwind pipeline to generate CSS for dynamic classes
 * like `bg-(--primary)` or `px-(--button-padding-x)`.
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

const SCRIPT_ID = "pagehub-tw-browser";
const CONFIG_ID = "pagehub-tw-config";
const LAYER_STRIP_ID = "pagehub-tw-unlayered";

/**
 * The theme CSS that @tailwindcss/browser needs to understand
 * the SDK's design tokens. Mirrors styles.css @theme inline block.
 */
const THEME_CSS = `
@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-border: var(--sidebar-border);

  --font-sans: var(--font-sans), sans-serif;
  --font-serif: var(--font-serif), serif;
  --font-mono: var(--font-mono), monospace;

  --radius-sm: 0.125rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-3xl: 1.5rem;

  --animate-float: float 6s ease-in-out infinite;
  --animate-pulse-glow: pulse-glow 2s ease-in-out infinite alternate;
  --animate-slide-up: slide-up 0.8s ease-out forwards;
  --animate-slide-down: slide-down 0.8s ease-out forwards;
  --animate-fade-in: fade-in 1s ease-out forwards;
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

  // 2. Inject the compiler script
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = "/vendor/tailwind-browser.js";
  document.head.appendChild(script);

  // 3. Watch for the runtime's output <style> tag and strip @layer wrappers.
  //    The browser runtime appends a <style> to <head> and updates its textContent.
  //    We observe mutations and rewrite the CSS to remove @layer blocks.
  layerObserver = new MutationObserver(() => {
    // Find the runtime's output style — it's the last <style> without an id
    // that contains @layer (the runtime doesn't set an id on its output tag)
    const styles = document.head.querySelectorAll("style:not([id]):not([type])");
    for (const style of styles) {
      const text = style.textContent || "";
      if (text.includes("@layer") && text.includes("--tw-")) {
        const stripped = stripLayers(text);
        if (stripped !== text) {
          style.textContent = stripped;
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

  injected = false;
}
