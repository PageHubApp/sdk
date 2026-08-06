/**
 * Auto-generate DaisyUI 5-style content colors from surface colors.
 *
 * All output is oklch() — the same format DaisyUI 5 uses natively.
 *
 * Algorithm: parse any CSS color → oklch, check lightness against 70% threshold,
 * then generate a desaturated high-contrast color preserving the hue.
 *
 * - Surface L < 70%  → light content (L ~93%, C reduced to ~15%)
 * - Surface L >= 70% → dark content  (L ~25%, C reduced to ~15%)
 */

// ─── Color parsing (hex, rgb, rgba, hsl, hsla, oklch) ───────────────────────

function parseColor(color: string): [number, number, number] {
  const c = color.trim();

  // oklch() — already in target space
  const oklchMatch = c.match(/^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/);
  if (oklchMatch) {
    let L = parseFloat(oklchMatch[1]);
    if (L > 1) L /= 100; // handle percentage form
    return [L, parseFloat(oklchMatch[2]), parseFloat(oklchMatch[3])];
  }

  // Convert to sRGB first, then to oklch
  let r: number, g: number, b: number;

  // rgb()/rgba()
  const rgbaMatch = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (rgbaMatch) {
    r = parseFloat(rgbaMatch[1]) / 255;
    g = parseFloat(rgbaMatch[2]) / 255;
    b = parseFloat(rgbaMatch[3]) / 255;
    return srgbToOklch(r, g, b);
  }

  // hsl()/hsla()
  const hslMatch = c.match(/^hsla?\(\s*([\d.]+)\s+(?:deg\s+)?([\d.]+)%\s+([\d.]+)%/);
  if (hslMatch) {
    const [h, s, l] = [
      parseFloat(hslMatch[1]),
      parseFloat(hslMatch[2]) / 100,
      parseFloat(hslMatch[3]) / 100,
    ];
    [r, g, b] = hslToRgb(h, s, l);
    return srgbToOklch(r, g, b);
  }

  // hex
  let hex = c.replace("#", "");
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  r = parseInt(hex.slice(0, 2), 16) / 255;
  g = parseInt(hex.slice(2, 4), 16) / 255;
  b = parseInt(hex.slice(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return [0, 0, 0]; // fallback black
  }
  return srgbToOklch(r, g, b);
}

// ─── HSL → sRGB ─────────────────────────────────────────────────────────────

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

// ─── sRGB → OKLCH pipeline ──────────────────────────────────────────────────

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function srgbToOklch(r: number, g: number, b: number): [number, number, number] {
  // Achromatic shortcut: when R=G=B the result is pure grayscale (chroma=0).
  // The OKLab matrix multiply below accumulates floating-point error that
  // produces a misleading chroma ~0.015 with a yellow-green hue for pure
  // white/black inputs, which then renders the canvas cream instead of white.
  if (r === g && g === b) {
    const l = linearize(r);
    const L = Math.cbrt(l);
    return [L, 0, 0];
  }

  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);

  // Linear RGB → LMS (via OKLab matrix)
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2220049494 * lg + 0.6396926187 * lb;

  const l1 = Math.cbrt(l_);
  const m1 = Math.cbrt(m_);
  const s1 = Math.cbrt(s_);

  // LMS → OKLab
  const L = 0.2104542553 * l1 + 0.793617785 * m1 - 0.0040720468 * s1;
  const a = 1.9779984951 * l1 - 2.428592205 * m1 + 0.4505937099 * s1;
  const bk = 0.0259040371 * l1 + 0.7827717662 * m1 - 0.808675766 * s1;

  // OKLab → OKLCH
  const C = Math.sqrt(a * a + bk * bk);
  const H = (Math.atan2(bk, a) * 180) / Math.PI;

  return [L, C, H < 0 ? H + 360 : H];
}

// ─── OKLCH formatting ───────────────────────────────────────────────────────

function formatOklch(L: number, C: number, H: number): string {
  // Match DaisyUI format: oklch(L% C H) with sensible precision
  const lPct = +(L * 100).toFixed(3);
  const cVal = +C.toFixed(4);
  const hVal = +H.toFixed(3);
  // Achromatic (C ≈ 0): omit hue to avoid meaningless angle
  if (cVal < 0.0001) return `oklch(${lPct}% 0 0)`;
  return `oklch(${lPct}% ${cVal} ${hVal})`;
}

// ─── OKLCH → sRGB → Hex (for color picker display only) ────────────────────

function delinearize(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function oklchToSrgb(L: number, C: number, H: number): [number, number, number] {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l1 = L + 0.3963377774 * a + 0.2158037573 * b;
  const m1 = L - 0.1055613458 * a - 0.0638541728 * b;
  const s1 = L - 0.0894841775 * a - 1.291485548 * b;

  const lr = +4.0767416621 * l1 ** 3 - 3.3077115913 * m1 ** 3 + 0.2309699292 * s1 ** 3;
  const lg = -1.2684380046 * l1 ** 3 + 2.6097574011 * m1 ** 3 - 0.3413193965 * s1 ** 3;
  const lb = -0.0041960863 * l1 ** 3 - 0.7034186147 * m1 ** 3 + 1.707614701 * s1 ** 3;

  return [
    Math.max(0, Math.min(1, delinearize(lr))),
    Math.max(0, Math.min(1, delinearize(lg))),
    Math.max(0, Math.min(1, delinearize(lb))),
  ];
}

/**
 * Convert an oklch() string to hex. Used only at the color picker UI boundary.
 */
export function oklchToHex(oklch: string): string {
  const m = oklch.match(/^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/);
  if (!m) return oklch;
  let L = parseFloat(m[1]);
  if (L > 1) L /= 100;
  const [r, g, b] = oklchToSrgb(L, parseFloat(m[2]), parseFloat(m[3]));
  const toHex = (c: number) =>
    Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

const LIGHTNESS_THRESHOLD = 0.7;
const LIGHT_CONTENT_L = 0.93;
const DARK_CONTENT_L = 0.25;
const CONTENT_CHROMA_RATIO = 0.15; // Keep ~15% of original chroma
// WCAG AA for body text is 4.5:1. Solving for exactly that lands some pairs on
// 4.49 once the browser gamut-maps the oklch, so aim slightly past the line.
const CONTRAST_TARGET = 4.6;

// ─── WCAG contrast ──────────────────────────────────────────────────────────

function relativeLuminance(L: number, C: number, H: number): number {
  const [r, g, b] = oklchToSrgb(L, C, H);
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(lumA: number, lumB: number): number {
  const [hi, lo] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Walk the content lightness from `startL` toward `extremeL` (1 = white, 0 =
 * black), tapering chroma to 0 as it goes, and stop at the first step that
 * clears CONTRAST_TARGET. Returns the best-effort result when the extreme is
 * still short of the target.
 *
 * Starting at the DaisyUI-ish 0.93/0.25 and only moving as far as needed keeps
 * surfaces that already pass looking exactly as they did — the walk only bites
 * where contrast was actually failing.
 */
function solveContentLightness(
  startL: number,
  extremeL: number,
  chroma: number,
  hue: number,
  surfaceLum: number
): { L: number; C: number; ratio: number; ok: boolean } {
  const STEPS = 40;
  let best = { L: startL, C: chroma, ratio: -1, ok: false };
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const L = startL + (extremeL - startL) * t;
    const C = chroma * (1 - t);
    const ratio = contrastRatio(relativeLuminance(L, C, hue), surfaceLum);
    if (ratio > best.ratio) best = { L, C, ratio, ok: false };
    if (ratio >= CONTRAST_TARGET) return { L, C, ratio, ok: true };
  }
  return best;
}

/**
 * Convert any CSS color (hex, rgb, rgba, hsl, hsla, oklch) to an oklch() string.
 */
export function colorToOklch(color: string): string {
  try {
    const [L, C, H] = parseColor(color);
    return formatOklch(L, C, H);
  } catch {
    return color; // pass through if we can't parse
  }
}

/**
 * Generate a readable content color for the given surface color.
 * Accepts any CSS color format. Returns oklch() string.
 *
 * Direction comes from the surface lightness, which encodes design intent —
 * saturated mid-tones like an electric indigo button want white on them even
 * when black would score marginally higher. From there the lightness is pushed
 * only as far as WCAG AA requires.
 *
 * Fixed 0.93/0.25 endpoints alone leave a dead zone: a surface sitting near the
 * threshold (a brass gold at L 0.699) is too light for near-white content and
 * too dark to be handed dark content, so it lands around 2.2:1 either way. When
 * the preferred direction cannot reach the target even at pure white/black, the
 * other direction wins instead.
 */
export function generateContentColor(surfaceColor: string): string {
  try {
    const [L, C, H] = parseColor(surfaceColor);
    const surfaceLum = relativeLuminance(L, C, H);
    const chroma = C * CONTENT_CHROMA_RATIO;

    const light = () => solveContentLightness(LIGHT_CONTENT_L, 1, chroma, H, surfaceLum);
    const dark = () => solveContentLightness(DARK_CONTENT_L, 0, chroma, H, surfaceLum);

    const preferred = L >= LIGHTNESS_THRESHOLD ? dark() : light();
    if (preferred.ok) return formatOklch(preferred.L, preferred.C, H);

    const alternate = L >= LIGHTNESS_THRESHOLD ? light() : dark();
    const winner = alternate.ratio > preferred.ratio ? alternate : preferred;
    return formatOklch(winner.L, winner.C, H);
  } catch {
    return "oklch(100% 0 0)"; // fallback white
  }
}

/**
 * Content color pairs: surface token name → content token name.
 */
export const CONTENT_COLOR_PAIRS: Record<string, string> = {
  Primary: "Primary Content",
  Secondary: "Secondary Content",
  Accent: "Accent Content",
  Neutral: "Neutral Content",
  "Base 100": "Base Content",
  Error: "Error Content",
  Info: "Info Content",
  Success: "Success Content",
  Warning: "Warning Content",
};

/**
 * Derive the content color for every surface token that has a defined pair.
 *
 * Any `* Content` entry already in the palette is REPLACED, not respected —
 * the derived value is the single source of truth so a hand-picked pairing can
 * never silently drop below AA.
 */
export function autoGenerateContentColors(
  palette: { name: string; color: string }[]
): { name: string; color: string }[] {
  const map = new Map(palette.map(p => [p.name, p.color]));
  const result = [...palette];

  for (const [surfaceName, contentName] of Object.entries(CONTENT_COLOR_PAIRS)) {
    const surfaceColor = map.get(surfaceName);
    if (!surfaceColor) continue;

    const generated = generateContentColor(surfaceColor);
    const existingIdx = result.findIndex(p => p.name === contentName);

    if (existingIdx >= 0) {
      result[existingIdx] = { name: contentName, color: generated };
    } else {
      // Insert content color right after its surface color
      const surfaceIdx = result.findIndex(p => p.name === surfaceName);
      result.splice(surfaceIdx + 1, 0, { name: contentName, color: generated });
    }
  }

  return result;
}
