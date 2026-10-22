/** Craft `{{ … }}` binding syntax → engine Liquid. Shared by every source emitter (text, attrs, forms, media, actions). */
/**
 * Rewrite Craft's one-level `{{ a || fallback }}` binding fallback into Liquid `{{ a | default: '…' }}`
 * (the fallback is a literal string, per the resolver's `walkPath` rule). Anything without `||` passes
 * through untouched, so existing `| filter` pipes and plain `{{ item.x }}` tokens are unaffected. This
 * is the ONE place the stored rich-text binding syntax is translated for the engine.
 */
export function liquidizeBindings(s: string): string {
  // A token nested inside another (`{{state.{{anchor.chat}}:name}}`, a state key built from a binding) has
  // no Liquid form; drop the whole outer token so the lazy match below can't split it mid-way.
  s = s.replace(/\{\{(?:(?!\}\})[^{]|\{(?!\{))*\{\{[\s\S]*?\}\}[^{}]*\}\}/g, "");
  return s.replace(/\{\{-?\s*([\s\S]*?)\s*-?\}\}/g, (full, expr: string) => {
    const head = expr.split("|")[0]!.trim();
    // A client-only state binding (`state.cart:open`, `state.pdp:current:…`) has colons that aren't a
    // valid Liquid path and resolves to nothing server-side (the walker bakes it empty); blank the
    // token so the page parses. The surrounding `data-variable` span lets the runtime fill it.
    // The `|| fallback` is still the server-rendered text (the walker bakes it), so keep that literal.
    if (!/^["']/.test(head) && /[:[]/.test(head)) {
      const bar = expr.indexOf("||");
      return bar < 0 ? "" : expr.slice(bar + 2).trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
    }
    if (!expr.includes("||")) return full;
    const i = expr.indexOf("||");
    const fallback = expr.slice(i + 2).trim();
    // Always single-quoted: a double-quoted literal inside an attribute value is escaped to `&quot;` and no longer parses.
    const quoted = /^(['"])([\s\S]*)\1$/.exec(fallback);
    const lit = quoted?.[2]!.includes("'") ? fallback : "'" + (quoted ? quoted[2]! : fallback).split("'").join("\\'") + "'";
    return `{{ ${expr.slice(0, i).trim()} | default: ${lit} }}`;
  });
}

/**
 * `{{ item.<f> }}` -> `{{ item.<f> | raw }}` for every field in `rich` (the collection's rich-text field
 * keys). The static walker emits those values as markup (`RICH_HTML_KEYS`) while the engine escapes every
 * output by default, so without `| raw` a rich body shows as literal `<p>` text. Applied to element
 * content only; any filter already on the token is left alone.
 *
 * `joinParagraphs`: the Text was a TipTap `<p>`-wrapped run, so the live walker's `unwrapP` ran on the
 * INTERPOLATED body and collapsed its `</p><p>` boundaries to `<br/><br/>`. The converter drops the
 * wrapper at convert time (it can't see the body), so the same collapse is applied to the value here.
 */
export function rawRichBindings(s: string, rich: ReadonlySet<string> | undefined, joinParagraphs = false): string {
  if (!rich || rich.size === 0) return s;
  const join = joinParagraphs ? " | replace: '</p><p>', '<br/><br/>'" : "";
  return s.replace(/\{\{(-?\s*item\.([A-Za-z0-9_]+)\s*)-?\}\}/g, (full, inner: string, field: string) =>
    rich.has(field) ? `{{ item.${field}${join} | raw }}` : full
  );
}
