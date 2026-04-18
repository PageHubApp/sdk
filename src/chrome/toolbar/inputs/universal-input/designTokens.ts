export const DESIGN_TOKEN_SUFFIXES = new Set<string>([
  "space-3xs",
  "space-2xs",
  "space-xs",
  "space-sm",
  "space-md",
  "space-lg",
  "space-xl",
  "container",
  "container-x",
  "container-y",
  "section",
  "density",
]);

export function isDesignTokenClass(fullClass: string, prefix: string): boolean {
  if (!prefix) return DESIGN_TOKEN_SUFFIXES.has(fullClass);
  const head = `${prefix}-`;
  if (!fullClass.startsWith(head)) return false;
  return DESIGN_TOKEN_SUFFIXES.has(fullClass.slice(head.length));
}
