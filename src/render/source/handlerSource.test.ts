/**
 * Craft handlers → runtime attributes (handlerSource.ts). Run: `npx tsx --test packages/sdk/src/render/source/handlerSource.test.ts`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { StaticRenderContext } from "../../utils/staticHtml";
import { buttonSource, interactiveAttrs } from "./actionSource";
import { handlerSource, liftedHandlersPartial, splitJavascriptLinks } from "./handlerSource";
import { containerSource } from "./toSource";

/** The DMV Exteriors gallery's three handlers, as the Craft tree stored them. */
const LB = JSON.parse(readFileSync(new URL("./handlerSource.lightbox.fixture.json", import.meta.url), "utf8")) as { open: string; prev: string; next: string };

/** A context where `overlay` is a show-hide target and `dlg` an open-modal target. */
function ctxWith(nodes: Record<string, any> = {}, renderingNodeId?: string): StaticRenderContext {
  return { popoverTargets: new Set(["overlay"]), dialogTargets: new Set(["dlg"]), reports: new Set<string>(), nodes, renderingNodeId } as unknown as StaticRenderContext;
}
const on = (code: string) => ({ handlers: { onClick: code } });

test("backdrop click on a popover overlay → the overlay commands itself", () => {
  const a = handlerSource({ id: "overlay", ...on("if (event.target === event.currentTarget) event.currentTarget.classList.add('hidden');") }, ctxWith());
  assert.deepEqual(a, { commandfor: "overlay", command: "hide-popover" });
});

test("backdrop click on a dialog → close", () => {
  const a = handlerSource({ id: "dlg", ...on("if(event.target===event.currentTarget){event.currentTarget.classList.add('hidden')}") }, ctxWith());
  assert.deepEqual(a, { commandfor: "dlg", command: "close" });
});

test("a link click closes a drawer; the three backdrop-or-link spellings carry both", () => {
  const drawer = { id: "overlay" };
  assert.deepEqual(handlerSource({ ...drawer, ...on("var a = event.target.closest && event.target.closest('a'); if (a) event.currentTarget.classList.add('hidden');") }, ctxWith()), { "data-close-link": "a" });
  const both = { commandfor: "overlay", command: "hide-popover", "data-close-link": "a" };
  assert.deepEqual(handlerSource({ ...drawer, ...on('if (event.target === event.currentTarget || event.target.closest("a")) event.currentTarget.classList.add("hidden");') }, ctxWith()), both);
  assert.deepEqual(handlerSource({ ...drawer, ...on("var t = event.target; if (t === event.currentTarget || t.closest('a')) event.currentTarget.classList.add('hidden');") }, ctxWith()), both);
  // The selector the author clicked on is kept: a drawer that also closes on its buttons.
  assert.deepEqual(handlerSource({ ...drawer, ...on("var a = event.target.closest('a, button[data-action]'); if (a) event.currentTarget.classList.add('hidden');") }, ctxWith()), { "data-close-link": "a, button[data-action]" });
  assert.deepEqual(handlerSource({ ...drawer, ...on("var t = event.target; if (t === event.currentTarget || t.closest('a, button')) event.currentTarget.classList.add('hidden');") }, ctxWith()), { ...both, "data-close-link": "a, button" });
});

test("a close handler on an element that is no overlay target is registered, not guessed at", () => {
  const ctx = ctxWith();
  const a = handlerSource({ id: "plain", ...on("if (event.target === event.currentTarget) event.currentTarget.classList.add('hidden');") }, ctx);
  assert.match(a["data-on"]!, /^click:ph_h_/);
  assert.equal(Object.keys(a).length, 1);
});

test("a panel's stopPropagation is dropped under a backdrop overlay or with no click listener above, kept under another", () => {
  const nodes = {
    root: { props: { id: "overlay", ...on("if (event.target === event.currentTarget) event.currentTarget.classList.add('hidden');") }, parent: null },
    panel: { props: {}, parent: "root" },
    card: { props: { action: [{ type: "link", href: "/x" }] }, parent: null },
    inner: { props: {}, parent: "card" },
    lone: { props: {}, parent: null },
    modal: { props: { id: "overlay", action: [{ type: "show-hide", target: "overlay", direction: "hide" }] }, parent: null },
    modalCard: { props: {}, parent: "modal" },
  };
  assert.deepEqual(handlerSource(on("event.stopPropagation();"), ctxWith(nodes, "panel")), {});
  assert.deepEqual(handlerSource(on("event.stopPropagation()"), ctxWith(nodes, "lone")), {});
  assert.deepEqual(handlerSource(on("event.stopPropagation()"), ctxWith(nodes, "modalCard")), {}, "an overlay whose own action closes it");
  const kept = handlerSource(on("event.stopPropagation();"), ctxWith(nodes, "inner"));
  assert.match(kept["data-on"]!, /^click:ph_h_/);
});

test("Enter / Space activation, print, scroll, set-field", () => {
  const c = ctxWith();
  assert.deepEqual(handlerSource({ handlers: { onKeyDown: "if(event.key==='Enter'||event.key===' '){event.preventDefault();event.currentTarget.click();}" } }, c), { "data-key-click": "true" });
  assert.deepEqual(handlerSource(on("window.print()"), c), { "data-print": "page" });
  assert.deepEqual(handlerSource({ ...on("window.print()"), handlerOptions: { onClick: { preventDefault: true } } }, c), { "data-print": "page" });
  assert.deepEqual(
    handlerSource(on("var c = event.currentTarget.closest('[data-coupon]'); if (!c) return; c.classList.add('ph-print'); window.addEventListener('afterprint', function () { c.classList.remove('ph-print'); }, { once: true }); window.print();"), c),
    { "data-print": "[data-coupon]" }
  );
  assert.deepEqual(handlerSource(on("var t=document.getElementById('reel-track'); if(t) t.scrollBy({left:-t.clientWidth, behavior:'smooth'});"), c), { "data-scroll-by": "reel-track", "data-scroll-step": "-1" });
  assert.deepEqual(handlerSource(on("var t=document.getElementById('reel-track'); if(t) t.scrollBy({left:t.clientWidth, behavior:'smooth'});"), c), { "data-scroll-by": "reel-track", "data-scroll-step": "1" });
  assert.deepEqual(handlerSource(on("var s=document.getElementById('service');if(s)s.value='Web3 Education';"), c), { "data-set-field": "#service", "data-set-value": "Web3 Education" });
  assert.deepEqual(handlerSource(on("var s=document.querySelector('select[name=app_position]'); if(s){s.value='sales'; s.dispatchEvent(new Event('change',{bubbles:true}));}"), c), { "data-set-field": "select[name=app_position]", "data-set-value": "sales" });
});

test("the gallery lightbox: opener, prev and next map exactly; a one-character change registers a function instead", () => {
  const c = ctxWith();
  assert.deepEqual(handlerSource(on(LB.open), c), { "data-lightbox": "gal_lightbox", "data-lightbox-caption": "gal_lightbox_cap" });
  assert.deepEqual(handlerSource(on(LB.prev), c), { "data-lightbox": "gal_lightbox", "data-lightbox-step": "-1", "data-lightbox-grid": "gal_grid_el", "data-lightbox-caption": "gal_lightbox_cap" });
  assert.deepEqual(handlerSource(on(LB.next), c), { "data-lightbox": "gal_lightbox", "data-lightbox-step": "1", "data-lightbox-grid": "gal_grid_el", "data-lightbox-caption": "gal_lightbox_cap" });
  assert.match(handlerSource(on(LB.open.replace("w=1600", "w=1200")), c)["data-on"]!, /^click:ph_h_/);
});

test("a tab's aria-expanded bookkeeping is the runtime's job; its Enter key too", () => {
  const code = `var b=event.currentTarget;document.querySelectorAll('[data-k-board="'+b.getAttribute('data-k-board')+'"]').forEach(function(t){t.setAttribute('aria-expanded',t===b?'true':'false')});`;
  assert.deepEqual(handlerSource({ ...on(code), action: [{ type: "show-hide", target: "p", direction: "tab", group: "g" }] }, ctxWith()), {});
});

test("anything else is registered once as a named function and wired with data-on", () => {
  const c = ctxWith();
  const code = "try{if(typeof window.gtag==='function')window.gtag('consent','update',{ad_storage:'denied'});}catch(e){}";
  const a = handlerSource(on(code), c);
  const b = handlerSource({ handlers: { onClick: code } }, c);
  assert.equal(a["data-on"], b["data-on"], "the same code shares one function");
  const partial = liftedHandlersPartial((c as any).liftedHandlers);
  assert.match(partial, /^\{% raw %\}<script>/);
  assert.ok(partial.includes(`P.on("${a["data-on"]!.slice("click:".length)}",function(event){${code}`));
  assert.ok(!/\son(click|keydown)=/.test(partial));
});

test("code with a Liquid binding is reported, never inlined", () => {
  const c = ctxWith();
  assert.deepEqual(handlerSource(on("go('{{ item.id }}')"), c), {});
  assert.equal((c as any).reports.size, 1);
});

test("a javascript: link is a handler, not an href", () => {
  const split = splitJavascriptLinks({ action: [{ type: "link", href: "javascript:window.print()" }] });
  assert.deepEqual(split.action, []);
  assert.equal(split.handlers.onClick, "window.print()");
  const src = buttonSource({ text: "Print", action: [{ type: "link", href: "javascript:window.print()" }] }, "", ctxWith());
  assert.equal(src, '<button class="cursor-pointer" data-print="page" type="button">Print</button>');
});

test("a Button keeps its handler (it used to be dropped)", () => {
  const src = buttonSource({ text: "Next", handlers: { onClick: LB.next } }, "", ctxWith());
  assert.match(src, /data-lightbox-step="1"/);
  assert.ok(!/ onclick=/.test(src));
});

test("a Container with a backdrop handler emits no on* attribute and keeps its popover", () => {
  const src = containerSource({ id: "overlay", className: "hidden fixed inset-0", ...on("if (event.target === event.currentTarget) event.currentTarget.classList.add('hidden');") }, "", ctxWith());
  assert.match(src, /commandfor="overlay" command="hide-popover"/);
  assert.match(src, /popover="manual"/);
  assert.ok(!/ on[a-z]+=/.test(src));
  assert.deepEqual(interactiveAttrs({ ...on("window.print()") }, ctxWith()).attrs, { "data-print": "page" });
});
