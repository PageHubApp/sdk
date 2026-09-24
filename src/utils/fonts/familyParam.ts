/**
 * Build the `family=…` parameter of a Google Fonts css2 URL.
 *
 * Families with an optical-size axis are requested as `opsz,wght`, so the
 * browser picks the cut that matches each font-size (`font-optical-sizing:
 * auto`). Requesting `wght` alone serves one fixed optical size: display
 * headings come out in the text cut — visibly wider and heavier than the same
 * font in a design tool that loads the axis, which is enough to re-wrap a
 * headline onto an extra line.
 *
 * Only families listed here get the axis: Google answers 400 for an axis the
 * family doesn't have. Ranges are Google's published axis ranges.
 */
const OPTICAL_SIZE_RANGES: Record<string, string> = {
  "Source Serif 4": "8..60",
  Fraunces: "9..144",
  Literata: "7..72",
  Newsreader: "6..72",
  "Bodoni Moda": "6..96",
  "Roboto Serif": "8..144",
  "Roboto Flex": "8..144",
  Piazzolla: "8..30",
  Texturina: "12..72",
  "Bricolage Grotesque": "12..96",
};

export function googleFontFamilyParam(family: string, weights: Iterable<string | number>): string {
  const sorted = [...new Set([...weights].map(String))].sort((a, b) => Number(a) - Number(b));
  const name = encodeURIComponent(family);
  const opsz = OPTICAL_SIZE_RANGES[family];
  if (opsz) return `family=${name}:opsz,wght@${sorted.map(w => `${opsz},${w}`).join(";")}`;
  return `family=${name}:wght@${sorted.join(";")}`;
}
