/**
 * Static evaluation of CSS math for email output.
 *
 * Email clients drop `calc()` / `clamp()` / `min()` / `max()` and handle `rem`
 * / `vw` unreliably. The email canvas has a fixed width, so every one of these
 * collapses to a literal: `1rem = 16px`, `1em = 16px`, `1vw = EMAIL_WIDTH / 100 px`.
 * Percentages (and anything else that needs layout context) can't be resolved,
 * so a value containing them inside a math function evaluates to `null` and the
 * caller drops the declaration.
 */

import { EMAIL_WIDTH } from "./profile";

const REM_PX = 16;
const VW_PX = EMAIL_WIDTH / 100;

const UNIT_TO_PX: Record<string, number> = { px: 1, rem: REM_PX, em: REM_PX, vw: VW_PX };

/** A scalar in the evaluator: `px === true` is a length in px, else unitless. */
interface Qty {
  n: number;
  px: boolean;
}

const MATH_FN_RE = /(?<![\w-])(calc|clamp|min|max)\(/gi;

function fmt(n: number): string {
  const r = Math.round(n * 10000) / 10000;
  return String(Object.is(r, -0) ? 0 : r);
}

function fmtQty(q: Qty): string {
  return q.px ? `${fmt(q.n)}px` : fmt(q.n);
}

// ─── Tokenizer + recursive-descent evaluator ───────────────────────────────

type Tok =
  | { t: "num"; q: Qty }
  | { t: "op"; v: "+" | "-" | "*" | "/" }
  | { t: "(" }
  | { t: ")" }
  | { t: "," }
  | { t: "fn"; v: "calc" | "clamp" | "min" | "max" };

function tokenize(src: string): Tok[] | null {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const fn = /^(calc|clamp|min|max)\(/i.exec(src.slice(i));
    if (fn) {
      out.push({ t: "fn", v: fn[1].toLowerCase() as "calc" });
      i += fn[0].length;
      continue;
    }
    const num = /^(\d*\.?\d+(?:e[+-]?\d+)?)([a-z%]*)/i.exec(src.slice(i));
    if (num) {
      const unit = num[2].toLowerCase();
      const value = parseFloat(num[1]);
      if (unit === "") out.push({ t: "num", q: { n: value, px: false } });
      else if (UNIT_TO_PX[unit] != null) out.push({ t: "num", q: { n: value * UNIT_TO_PX[unit], px: true } });
      else return null; // %, ch, vh, … — needs layout context
      i += num[0].length;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/") out.push({ t: "op", v: c });
    else if (c === "(") out.push({ t: "(" });
    else if (c === ")") out.push({ t: ")" });
    else if (c === ",") out.push({ t: "," });
    else return null;
    i++;
  }
  return out;
}

class Parser {
  private pos = 0;
  constructor(private toks: Tok[]) {}

  done(): boolean {
    return this.pos >= this.toks.length;
  }

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }

  private expect(t: Tok["t"]): void {
    if (this.peek()?.t !== t) throw new Error(`expected ${t}`);
    this.pos++;
  }

  sum(): Qty {
    let left = this.product();
    for (let tk = this.peek(); tk?.t === "op" && (tk.v === "+" || tk.v === "-"); tk = this.peek()) {
      this.pos++;
      const right = this.product();
      if (left.px !== right.px && left.n !== 0 && right.n !== 0) throw new Error("unit mismatch");
      const px = left.px || right.px;
      left = { n: tk.v === "+" ? left.n + right.n : left.n - right.n, px };
    }
    return left;
  }

  private product(): Qty {
    let left = this.unary();
    for (let tk = this.peek(); tk?.t === "op" && (tk.v === "*" || tk.v === "/"); tk = this.peek()) {
      this.pos++;
      const right = this.unary();
      if (tk.v === "*") {
        if (left.px && right.px) throw new Error("px * px");
        left = { n: left.n * right.n, px: left.px || right.px };
      } else {
        if (right.px || right.n === 0) throw new Error("bad divisor");
        left = { n: left.n / right.n, px: left.px };
      }
    }
    return left;
  }

  private unary(): Qty {
    const tk = this.peek();
    if (tk?.t === "op" && (tk.v === "-" || tk.v === "+")) {
      this.pos++;
      const q = this.unary();
      return tk.v === "-" ? { n: -q.n, px: q.px } : q;
    }
    return this.primary();
  }

  private primary(): Qty {
    const tk = this.peek();
    if (!tk) throw new Error("unexpected end");
    if (tk.t === "num") {
      this.pos++;
      return tk.q;
    }
    if (tk.t === "(") {
      this.pos++;
      const q = this.sum();
      this.expect(")");
      return q;
    }
    if (tk.t === "fn") {
      this.pos++;
      const args = [this.sum()];
      while (this.peek()?.t === ",") {
        this.pos++;
        args.push(this.sum());
      }
      this.expect(")");
      return applyFn(tk.v, args);
    }
    throw new Error("unexpected token");
  }
}

function applyFn(fn: "calc" | "clamp" | "min" | "max", args: Qty[]): Qty {
  const nonZero = args.filter(a => a.n !== 0);
  if (nonZero.some(a => a.px !== nonZero[0].px)) throw new Error("unit mismatch");
  const px = args.some(a => a.px);
  const ns = args.map(a => a.n);
  if (fn === "calc") {
    if (args.length !== 1) throw new Error("calc arity");
    return args[0];
  }
  if (fn === "clamp") {
    if (args.length !== 3) throw new Error("clamp arity");
    return { n: Math.max(ns[0], Math.min(ns[1], ns[2])), px };
  }
  return { n: fn === "min" ? Math.min(...ns) : Math.max(...ns), px };
}

/** Evaluate one math expression (`calc(...)`, `clamp(...)`, …) to a literal, or `null`. */
function evalExpression(expr: string): string | null {
  const toks = tokenize(expr);
  if (!toks) return null;
  try {
    const p = new Parser(toks);
    const q = p.sum();
    if (!p.done()) return null;
    return fmtQty(q);
  } catch {
    return null;
  }
}

/** Index just past the `)` that closes the `(` at `open`, or -1. */
function matchParen(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")" && --depth === 0) return i + 1;
  }
  return -1;
}

/** `1.5rem` → `24px`, `10vw` → `60px` outside of any function call. */
function normalizeLengths(value: string): string {
  let out = "";
  let depth = 0;
  let i = 0;
  while (i < value.length) {
    const c = value[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    if (depth === 0) {
      const m = /^(-?\d*\.?\d+)(rem|vw)\b/i.exec(value.slice(i));
      const prev = value[i - 1];
      if (m && (i === 0 || !/[\w.#-]/.test(prev))) {
        out += `${fmt(parseFloat(m[1]) * UNIT_TO_PX[m[2].toLowerCase()])}px`;
        i += m[0].length;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * Replace every top-level `calc()` / `clamp()` / `min()` / `max()` in a CSS
 * value with its literal result and convert bare `rem` / `vw` lengths to px.
 * Returns `null` when any math function can't be fully evaluated — the caller
 * drops the declaration rather than ship something an email client misreads.
 */
export function evalStaticMath(value: string): string | null {
  let out = "";
  let last = 0;
  MATH_FN_RE.lastIndex = 0;
  for (let m = MATH_FN_RE.exec(value); m; m = MATH_FN_RE.exec(value)) {
    const open = m.index + m[0].length - 1;
    const end = matchParen(value, open);
    if (end < 0) return null;
    const lit = evalExpression(value.slice(m.index, end));
    if (lit == null) return null;
    out += value.slice(last, m.index) + lit;
    last = end;
    MATH_FN_RE.lastIndex = end;
  }
  out += value.slice(last);
  return normalizeLengths(out);
}
