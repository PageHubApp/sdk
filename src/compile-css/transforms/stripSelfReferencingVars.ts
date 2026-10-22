// ── Self-referencing custom properties ─────────────────────────────────────
//
// Tailwind writes every `@theme inline` token it uses into `:root` as well as inlining it into the utilities.
// theme.css maps tokens onto the variable of the same name (`--radius-box: var(--radius-box)`), which is a cycle:
// the declaration is invalid, and once `unwrapLayerBlocks` flattens Tailwind's `@layer theme` it beats the
// site's own `--radius-box: 0.75rem` by source order, so every `rounded-box` renders square.
//
// The utilities already carry the `var(--x)` reference, so the cyclic declaration adds nothing: dropping it lets
// the site's value (or the default palette's) resolve. Matches the name anywhere in the value, so a fallback
// chain that loops back (`--font-sans: var(--sans-font-family, var(--font-sans))`) goes too.

const DECLARATION = /(^|[;{}\s])(--[\w-]+)\s*:\s*([^;{}]*);?/g;

export function stripSelfReferencingVars(css: string): string {
  return css.replace(DECLARATION, (whole, lead: string, name: string, value: string) => {
    const refs = new RegExp(`var\\(\\s*${name.replace(/[-]/g, "\\-")}\\s*[,)]`);
    return refs.test(value) ? lead : whole;
  });
}
