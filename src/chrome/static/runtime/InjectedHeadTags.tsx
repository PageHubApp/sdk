/**
 * Emit parsed head/body tags into the SSR HTML response.
 *
 * `<InjectedHeadTags>` — scripts/styles/links/meta/title rendered inside next/head.
 * `<InjectedBodyTags>` — scripts/styles rendered inline where the component sits.
 *
 * Both real React elements (not dangerouslySetInnerHTML on a wrapper div), so
 * SSR output contains executable <script> tags that run at HTML-parse time.
 * next/head dedupes head entries by the `key` prop — identical snippets across
 * multiple components are emitted once.
 */

import Head from "next/head";
import React, { useMemo } from "react";
import { parseHeadHTML, hashTag, type HeadTag } from "../../../utils/parseHeadHTML";

interface Props {
  html: string | undefined | null;
  /**
   * Editor mode: only `<style>` and stylesheet `<link>`s. The editor runs
   * signed in as whoever is editing, so a site's scripts (and meta refreshes)
   * never run there — its styles still do, so the canvas looks right.
   */
  stylesOnly?: boolean;
}

function isStyleTag(t: HeadTag): boolean {
  if (t.tag === "style") return true;
  return t.tag === "link" && String(t.attrs?.rel || "").toLowerCase().split(/\s+/).includes("stylesheet");
}

function useInjectedTags(html: Props["html"], stylesOnly: boolean | undefined): HeadTag[] {
  return useMemo(() => {
    const tags = parseHeadHTML(html);
    return stylesOnly ? tags.filter(isStyleTag) : tags;
  }, [html, stylesOnly]);
}

// htmlparser2 reports boolean attributes (async, defer, nomodule) as empty
// strings. Empty string is falsy in JS, so React's spread drops them — the
// script renders WITHOUT async/defer and becomes render-blocking. Coerce
// known boolean attrs to `true` so React emits them on the element.
const BOOL_SCRIPT_ATTRS = new Set(["async", "defer", "nomodule"]);
function normalizeScriptAttrs(attrs: Record<string, string>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(attrs)) {
    out[k] = BOOL_SCRIPT_ATTRS.has(k.toLowerCase()) && v === "" ? true : v;
  }
  return out;
}

function renderScript(t: HeadTag, location: "head" | "body") {
  const key = `ph-${location}-${hashTag(t)}`;
  const reactAttrs = normalizeScriptAttrs(t.attrs || {});
  // Real <script> React elements render to raw <script> tags in SSR HTML,
  // which execute during browser HTML parse (before hydration). We render
  // them OUTSIDE <Head> to avoid Next's no-script-tags-in-head-component
  // warning — scripts emitted in body execute the same way.
  //
  // Inline scripts that mutate the DOM (e.g. "open now" hours widgets) would
  // run before React hydrates and corrupt the tree → hydration mismatch.
  // We defer inline bodies until the `pagehub:hydrated` event (dispatched
  // from useViewerSetup). External `src=` scripts pass through unchanged —
  // authors can add their own defer/async as needed.
  const hasSrc = t.attrs && (t.attrs.src || t.attrs.SRC);
  const rawType = (t.attrs && (t.attrs.type || t.attrs.TYPE)) || "";
  const type = String(rawType).toLowerCase().trim();
  // Only defer scripts the browser actually executes as JS. Non-JS types
  // (ld+json, importmap, speculationrules, etc.) are inert data — wrapping
  // them in a function would corrupt their payload.
  const isExecutableJs =
    type === "" || type === "text/javascript" || type === "application/javascript" || type === "module";
  if (hasSrc || !t.inner || !isExecutableJs) {
    return <script key={key} {...reactAttrs} dangerouslySetInnerHTML={{ __html: t.inner || "" }} />;
  }
  const deferred =
    '(function(){function r(){' + t.inner + '}' +
    'document.addEventListener("pagehub:hydrated",r,{once:true});})();';
  return <script key={key} {...reactAttrs} dangerouslySetInnerHTML={{ __html: deferred }} />;
}

export function InjectedHeadTags({ html, stylesOnly }: Props) {
  const tags = useInjectedTags(html, stylesOnly);
  if (!tags.length) return null;

  const scriptTags = tags.filter(t => t.tag === "script");
  const headTags = tags.filter(t => t.tag !== "script");

  return (
    <>
      {headTags.length > 0 && (
        <Head>
          {headTags.map(t => {
            const key = `ph-head-${hashTag(t)}`;
            switch (t.tag) {
              case "style":
                return (
                  <style key={key} {...t.attrs} dangerouslySetInnerHTML={{ __html: t.inner }} />
                );
              case "meta":
                return <meta key={key} {...t.attrs} />;
              case "link":
                return <link key={key} {...t.attrs} />;
              case "title":
                return <title key={key}>{t.inner}</title>;
            }
          })}
        </Head>
      )}
      {scriptTags.map(t => renderScript(t, "head"))}
    </>
  );
}

export function InjectedBodyTags({ html, stylesOnly }: Props) {
  const tags = useInjectedTags(html, stylesOnly);
  if (!tags.length) return null;
  return (
    <>
      {tags.map(t => {
        const key = `ph-body-${hashTag(t)}`;
        if (t.tag === "script") {
          return renderScript(t, "body");
        }
        if (t.tag === "style") {
          return <style key={key} {...t.attrs} dangerouslySetInnerHTML={{ __html: t.inner }} />;
        }
        return null;
      })}
    </>
  );
}
