import test from "node:test";
import assert from "node:assert/strict";
import { n, tree } from "./fixtures/tree";
import { validateEmailTree, type EmailIssue } from "./validate";

const codes = (issues: EmailIssue[]) => issues.map(i => `${i.severity}:${i.code}:${i.nodeId}`);

test("validateEmailTree: a clean email tree has no issues", () => {
  const nodes = tree([
    n("Container", { className: "bg-base-100 py-space-md flex flex-col md:flex-row gap-space-sm md:hidden" }, [
      n("Text", { text: "Hi", className: "text-lg font-bold text-base-content" }),
      n("Button", {
        text: "Go",
        className: "bg-primary text-primary-content px-space-md py-space-xs rounded-box",
        action: [{ type: "link", href: "https://example.com" }],
      }),
      n("Image", { src: "https://example.com/a.jpg", className: "w-full" }),
    ]),
  ]);
  assert.deepEqual(validateEmailTree(nodes), []);
});

test("validateEmailTree: ROOT is never checked", () => {
  const nodes = tree([], { className: "min-h-dvh overflow-x-hidden flex" });
  assert.deepEqual(validateEmailTree(nodes), []);
});

test("validateEmailTree: unknown components are errors unless passed as extraComponents", () => {
  const nodes = tree([n("Video", {}), n("EmailSlot", {})]);
  assert.deepEqual(codes(validateEmailTree(nodes)), ["error:component:n1", "error:component:n2"]);
  assert.deepEqual(codes(validateEmailTree(nodes, { extraComponents: ["EmailSlot"] })), [
    "error:component:n1",
  ]);
});

test("validateEmailTree: unsafe classes are errors, unknown classes are warnings", () => {
  const nodes = tree([n("Container", { className: "btn md:shadow-lg bg-primary aspect-video" })]);
  const issues = validateEmailTree(nodes);
  assert.deepEqual(codes(issues), [
    "error:unsafe-class:n1",
    "error:unsafe-class:n1",
    "warning:dropped-class:n1",
  ]);
  assert.match(issues[0].message, /“btn”/);
  assert.match(issues[2].message, /“aspect-video” is ignored/);
});

test("validateEmailTree: responsive variants other than display + layout are dropped", () => {
  const nodes = tree([n("Text", { className: "text-2xl md:text-5xl md:hidden lg:block" })]);
  assert.deepEqual(codes(validateEmailTree(nodes)), ["warning:dropped-class:n1"]);
});

test("validateEmailTree: non-link actions are errors; Button icons are warnings", () => {
  const nodes = tree([
    n("Button", { text: "Open", action: [{ type: "open-modal", target: "x" }], icon: { value: "ref-icon:tb/TbX" } }),
    n("Container", { action: [{ type: "link", href: "#a" }, { type: "copy-to-clipboard", text: "x" }] }),
  ]);
  assert.deepEqual(codes(validateEmailTree(nodes)), [
    "error:action:n1",
    "warning:icon:n1",
    "error:action:n2",
  ]);
});

test("validateEmailTree: columns nested more than two deep warn", () => {
  const cols = (kids: ReturnType<typeof n>[]) => n("Container", { className: "flex flex-row" }, kids);
  const nodes = tree([cols([cols([cols([n("Text", {}), n("Text", {})]), n("Text", {})]), n("Text", {})])]);
  assert.deepEqual(codes(validateEmailTree(nodes)), ["warning:nesting:n3"]);
});
