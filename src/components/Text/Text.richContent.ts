/**
 * Block-level styling for author-supplied rich HTML rendered inside a `Text`
 * node — collection `richText` fields, CMS body copy, imported article bodies.
 *
 * Tailwind preflight resets heading sizes, list markers, and paragraph margins,
 * and PageHub ships no `prose` layer, so saved `<h2>` / `<ul>` / `<p>` markup
 * renders as undifferentiated body text without these rules.
 *
 * Emitted as arbitrary variants inside a single className string on purpose:
 * `collectCandidates` splits `props.className` on whitespace and feeds each
 * token to the SSR + static compilers, so the rules ship on every render route
 * without a hand-written stylesheet. Keep it a plain literal — a computed or
 * templated string is invisible to Tailwind's scanner.
 *
 * ⚠️ Apply it to a Text node whose `tagName` is a block container (`div`,
 * `article`, `section`) — NOT `p`. Block HTML inside a `<p>` survives React's
 * `dangerouslySetInnerHTML` but is hoisted out by the HTML parser on statically
 * published pages, stranding the node's className on an empty paragraph.
 */
export const RICH_TEXT_BLOCK_CLASS = [
  "[&_h2]:font-heading [&_h2]:font-semibold [&_h2]:text-2xl [&_h2]:mt-space-md [&_h2]:mb-space-xs",
  "[&_h3]:font-heading [&_h3]:font-semibold [&_h3]:text-xl [&_h3]:mt-space-md [&_h3]:mb-space-xs",
  "[&_h4]:font-heading [&_h4]:font-semibold [&_h4]:text-lg [&_h4]:mt-space-sm [&_h4]:mb-space-xs",
  "[&_p]:mb-space-sm",
  "[&_ul]:mb-space-sm [&_ul]:list-disc [&_ul]:pl-6",
  "[&_ol]:mb-space-sm [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_li]:mb-space-2xs",
  "[&_a]:text-primary [&_a]:underline",
  "[&_strong]:font-semibold [&_em]:italic",
  "[&_blockquote]:my-space-sm [&_blockquote]:border-l-2 [&_blockquote]:border-base-content/20 [&_blockquote]:pl-space-sm [&_blockquote]:italic",
  "[&_code]:rounded [&_code]:bg-base-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm",
  "[&_hr]:my-space-md [&_hr]:border-base-content/15",
  "[&_img]:my-space-sm [&_img]:rounded-box",
  "[&>*:last-child]:mb-0",
].join(" ");
