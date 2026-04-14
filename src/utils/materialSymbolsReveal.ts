/**
 * Material Symbols (ref-google) — hide ligatures until the font is usable.
 * - React Button uses PH_MS_FONT_PENDING_CLASS until document.fonts.load + check() pass
 *   (and retries on visibility / bfcache restore when the face drops out).
 * - Static HTML from Button.craft adds data-ph-google-icon + pending; FOUC inline script reveals.
 */

export const PH_MS_FONT_PENDING_CLASS = "ph-ms-font-pending";
export const PH_GOOGLE_ICON_DATA_ATTR = "data-ph-google-icon";
export const PH_MS_PENDING_STYLE_ID = "ph-ms-font-pending-style";

/** Matches Button.tsx icon width token → px for document.fonts.load (Tailwind default scale, 16px root). */
export const ICON_SIZE_KEY_TO_MATERIAL_LOAD_PX: Record<string, number> = {
  "w-0": 1,
  "w-px": 1,
  "w-0.5": 2,
  "w-1": 4,
  "w-1.5": 6,
  "w-2": 8,
  "w-2.5": 10,
  "w-3": 12,
  "w-3.5": 14,
  "w-4": 14,
  "w-5": 16,
  "w-6": 20,
  "w-7": 24,
  "w-8": 30,
  "w-9": 36,
  "w-10": 36,
  "w-11": 44,
  "w-12": 48,
  "w-14": 56,
  "w-16": 60,
  "w-20": 72,
  "w-24": 96,
  "w-28": 112,
  "w-32": 128,
  "w-36": 144,
  "w-40": 160,
  "w-44": 176,
  "w-48": 192,
  "w-52": 208,
  "w-56": 224,
  "w-60": 240,
  "w-64": 256,
  "w-72": 288,
  "w-80": 320,
  "w-96": 384,
};

export function materialIconLoadPxForWidthClass(sizeKey: string): number {
  return ICON_SIZE_KEY_TO_MATERIAL_LOAD_PX[sizeKey] ?? 24;
}

/** Argument shape for `document.fonts.load` / `document.fonts.check` (Material Symbols Outlined). */
export function materialSymbolsOutlinedFontSpec(sizeKey: string): string {
  const px = materialIconLoadPxForWidthClass(sizeKey);
  return `400 ${px}px "Material Symbols Outlined"`;
}

/**
 * Inline IIFE for FOUC <Head>: inject pending style, non-blocking Material Symbols link,
 * then reveal [data-ph-google-icon].ph-ms-font-pending after load + fonts.ready (+ fallbacks).
 */
export function buildMaterialSymbolsFoucInlineScript(fontHref: string): string {
  const H = JSON.stringify(fontHref);
  return (
    "!function(){" +
    "var H=" +
    H +
    ";" +
    "function S(){" +
    "if(document.getElementById(" +
    JSON.stringify(PH_MS_PENDING_STYLE_ID) +
    "))return;" +
    "var e=document.createElement('style');" +
    "e.id=" +
    JSON.stringify(PH_MS_PENDING_STYLE_ID) +
    ";" +
    "e.textContent='." +
    PH_MS_FONT_PENDING_CLASS +
    "{opacity:0}';" +
    "document.head.appendChild(e)" +
    "}" +
    "function R(){" +
    "document.querySelectorAll('[" +
    PH_GOOGLE_ICON_DATA_ATTR +
    "]." +
    PH_MS_FONT_PENDING_CLASS +
    "').forEach(function(el){el.classList.remove('" +
    PH_MS_FONT_PENDING_CLASS +
    "')})" +
    "}" +
    "function C(){" +
    "R();" +
    "if(document.fonts&&document.fonts.ready){" +
    "document.fonts.ready.then(function(){" +
    "R();" +
    "requestAnimationFrame(function(){requestAnimationFrame(R)})" +
    "}).catch(function(){R()})" +
    "}" +
    "}" +
    "function L(){" +
    "S();" +
    "C();" +
    "setTimeout(R,0);" +
    "setTimeout(R,50);" +
    "setTimeout(R,2000)" +
    "}" +
    "S();" +
    "var l=document.createElement('link');" +
    "l.id='pagehub-auto-material-symbols';" +
    "l.rel='stylesheet';" +
    "l.media='print';" +
    "l.onload=function(){" +
    "l.media='all';" +
    "L();" +
    "if(typeof MutationObserver!=='undefined'){" +
    "var m=new MutationObserver(function(){R()});" +
    "m.observe(document.documentElement,{subtree:true,childList:true});" +
    "setTimeout(function(){m.disconnect()},3000)" +
    "}" +
    "};" +
    "l.href=H;" +
    "document.head.appendChild(l)" +
    "}()"
  );
}
