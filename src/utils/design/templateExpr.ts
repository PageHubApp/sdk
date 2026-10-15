// ── Template expression parsing ───────────────────────────────────────────────

export type ParsedTemplateExpr =
  | { kind: "ternary"; lhs: string; op: "==" | "!="; rhs: string; ifTrue: string; ifFalse: string }
  | { kind: "truthy"; key: string; ifTrue: string; ifFalse: string }
  | { kind: "plain"; key: string; fallback: string | null };

const stripQuotes = (s: string): string => s.replace(/^["']|["']$/g, "");

/**
 * Parse the inner expression of a `{{...}}` token into a structured form.
 * Pure (no resolution) so it's unit-testable in isolation; the caller
 * (`replaceVariables`) resolves `lhs` / `key` and applies its own miss policy.
 * Match order is ternary, then truthy, then plain `||`. Literal branches are
 * trimmed and quote-stripped.
 */
export function parseTemplateExpr(raw: string): ParsedTemplateExpr {
  const trimmed = raw.trim();

  // ── Ternary: {{key == value ? ifTrue : ifFalse}} ──
  // Requires spaces around the else `:` to avoid matching ref: or https:
  const ternaryMatch = trimmed.match(/^(.+?)\s*(==|!=)\s*(.+?)\s*\?\s*(.+?)\s+:\s+(.+)$/);
  if (ternaryMatch) {
    const [, lhsRaw, op, rhsRaw, ifTrue, ifFalse] = ternaryMatch;
    return {
      kind: "ternary",
      lhs: lhsRaw.trim(),
      op: op as "==" | "!=",
      rhs: stripQuotes(rhsRaw.trim()),
      ifTrue: stripQuotes(ifTrue.trim()),
      ifFalse: stripQuotes(ifFalse.trim()),
    };
  }

  // ── Bare truthiness: {{auth.status ? /yes : /no}} ──
  const truthyMatch = trimmed.match(/^(.+?)\s*\?\s*(.+?)\s+:\s+(.+)$/);
  if (truthyMatch) {
    const [, keyRaw, ifTrue, ifFalse] = truthyMatch;
    return {
      kind: "truthy",
      key: keyRaw.trim(),
      ifTrue: stripQuotes(ifTrue.trim()),
      ifFalse: stripQuotes(ifFalse.trim()),
    };
  }

  // ── Standard variable with optional || fallback ──
  const pipeIdx = trimmed.indexOf("||");
  if (pipeIdx !== -1) {
    return {
      kind: "plain",
      key: trimmed.slice(0, pipeIdx).trim(),
      fallback: stripQuotes(trimmed.slice(pipeIdx + 2).trim()),
    };
  }
  return { kind: "plain", key: trimmed, fallback: null };
}
