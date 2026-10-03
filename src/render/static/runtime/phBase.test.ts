/**
 * Guard: every same-origin URL the static runtime requests goes through
 * PH_BASE, so a site proxied under a host app (`window.__PH_ASSET_BASE__ =
 * "/_pagehub"`) reaches PageHub instead of the host's own `/api/*`.
 *
 * Fails on any string or template literal in runtime/chunks/* that starts
 * with "/api/" or "/_ph/" and is not the right operand of `PH_BASE + …`.
 * Author-supplied URLs (custom form actions, download links) are runtime
 * values, not literals, so they're untouched by design.
 *
 * Run: pnpm exec tsx --test packages/sdk/src/render/static/runtime/phBase.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const CHUNKS_DIR = join(import.meta.dirname, "chunks");
const ROOT_RELATIVE = /^\/(?:api|_ph)\//;

function isPrefixed(node: ts.Node): boolean {
  const parent = node.parent;
  return (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.PlusToken &&
    parent.right === node &&
    ts.isIdentifier(parent.left) &&
    parent.left.text === "PH_BASE"
  );
}

/** `file:line  literal` for each unprefixed root-relative literal in `source`. */
export function findUnprefixed(fileName: string, source: string): string[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    let literal: ts.Node | null = null;
    let text = "";
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      literal = node;
      text = node.text;
    } else if (ts.isTemplateExpression(node)) {
      literal = node;
      text = node.head.text;
    }
    if (literal && ROOT_RELATIVE.test(text) && !isPrefixed(literal)) {
      const { line } = sf.getLineAndCharacterOfPosition(literal.getStart(sf));
      hits.push(`${fileName}:${line + 1}  ${literal.getText(sf)}`);
    }
    // A template expression's head is checked above; don't revisit its spans.
    if (!ts.isTemplateExpression(node)) ts.forEachChild(node, visit);
  };
  visit(sf);
  return hits;
}

test("runtime chunks: every root-relative /api/ and /_ph/ literal is PH_BASE-prefixed", () => {
  const files = readdirSync(CHUNKS_DIR).filter(f => f.endsWith(".ts") && !f.endsWith(".d.ts"));
  assert.ok(files.length > 0, `no chunks found in ${CHUNKS_DIR}`);
  const hits = files.flatMap(f => findUnprefixed(f, readFileSync(join(CHUNKS_DIR, f), "utf8")));
  assert.deepEqual(
    hits,
    [],
    `Write these as PH_BASE + "/api/..." so mounted sites (window.__PH_ASSET_BASE__) keep working:\n  ${hits.join("\n  ")}`
  );
});

test("findUnprefixed: flags bare literals, accepts PH_BASE-prefixed ones", () => {
  const src = [
    `fetch("/api/a");`,
    `fetch('/_ph/b');`,
    "fetch(`/api/c/${id}`);",
    `fetch(PH_BASE + "/api/ok");`,
    `fetch(PH_BASE + '/_ph/ok');`,
    "fetch(PH_BASE + `/api/ok/${id}`);",
    `fetch(OTHER + "/api/d");`,
    `fetch(meta.action);`,
    `// fetch("/api/comment")`,
    `const rel = "api/not-root";`,
  ].join("\n");
  assert.deepEqual(
    findUnprefixed("sample.ts", src).map(h => h.split("  ")[0]),
    ["sample.ts:1", "sample.ts:2", "sample.ts:3", "sample.ts:7"]
  );
});
