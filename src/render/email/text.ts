/**
 * Plain-text alternative for an email: block elements become blank lines,
 * links become `text (href)`, images their `alt`. The preheader, `<head>`,
 * `<style>` and Outlook conditional comments are skipped.
 */

import { Parser } from "htmlparser2";
import { PREHEADER_ATTR } from "./shell";

const BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "br", "div", "footer", "h1", "h2", "h3",
  "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "section", "table",
  "td", "th", "tr", "ul",
]);

const SKIP_TAGS = new Set(["head", "style", "script", "title"]);

/** Paragraph break marker, collapsed after whitespace normalization. */
const BREAK = "\u0000";

export function htmlToText(html: string): string {
  let out = "";
  let skipDepth = 0;
  const links: Array<{ href: string; start: number }> = [];
  // Tag stack mirrors open elements so skipped subtrees can be closed exactly.
  const stack: Array<{ name: string; skip: boolean }> = [];

  const parser = new Parser(
    {
      onopentag(name, attrs) {
        const skip = skipDepth > 0 || SKIP_TAGS.has(name) || PREHEADER_ATTR in attrs;
        stack.push({ name, skip });
        if (skip) {
          skipDepth++;
          return;
        }
        if (BLOCK_TAGS.has(name)) out += BREAK;
        if (name === "a") links.push({ href: attrs.href ?? "", start: out.length });
        if (name === "img" && attrs.alt) out += ` ${attrs.alt} `;
      },
      ontext(text) {
        if (skipDepth === 0) out += text;
      },
      onclosetag(name) {
        const top = stack.pop();
        if (top?.skip) {
          skipDepth--;
          return;
        }
        if (name === "a") {
          const link = links.pop();
          const label = link ? out.slice(link.start).replace(/\s+/g, " ").trim() : "";
          const href = link?.href ?? "";
          if (href && !href.startsWith("#") && href !== label) {
            out += label ? ` (${href})` : href;
          }
        }
        if (BLOCK_TAGS.has(name)) out += BREAK;
      },
    },
    { decodeEntities: true, lowerCaseTags: true }
  );
  parser.write(html);
  parser.end();

  return out
    .split(BREAK)
    .map(block => block.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}
