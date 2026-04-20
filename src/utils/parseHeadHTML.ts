/**
 * Parse a raw HTML string into a list of head-legal React-emittable tags.
 * Used by Embed.headCode/footCode and Background.props.inject.{head,footer} to
 * hoist scripts/styles/etc. into the document head via next/head during SSR.
 */

import { Parser } from "htmlparser2";

export interface HeadTag {
  tag: "script" | "style" | "meta" | "link" | "title";
  attrs: Record<string, string>;
  inner: string;
}

const ALLOWED = new Set(["script", "style", "meta", "link", "title"]);

export function parseHeadHTML(html: string | undefined | null): HeadTag[] {
  if (!html || typeof html !== "string") return [];
  const out: HeadTag[] = [];
  let current: HeadTag | null = null;
  const parser = new Parser(
    {
      onopentag(name, attrs) {
        if (ALLOWED.has(name)) {
          current = {
            tag: name as HeadTag["tag"],
            attrs: attrs as Record<string, string>,
            inner: "",
          };
        }
      },
      ontext(text) {
        if (current) current.inner += text;
      },
      onclosetag(name) {
        if (current && current.tag === name) {
          out.push(current);
          current = null;
        }
      },
    },
    { decodeEntities: true }
  );
  parser.write(html);
  parser.end();
  return out;
}

/** djb2 content hash — stable across SSR + client for next/head key dedup. */
export function hashTag(t: HeadTag): string {
  const s = `${t.tag}|${JSON.stringify(t.attrs)}|${t.inner}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}
