import React from "react";
import { TbChevronRight } from "react-icons/tb";

/**
 * Lightweight markdown renderer for chat bubbles.
 * Handles: **bold**, *italic*, `inline code`, ```code blocks```,
 * - unordered lists, 1. ordered lists, [links](url), bare https:// URLs, headings (##).
 * No dependencies — just regex + React elements.
 */

interface MarkdownTextProps {
  content: string;
  className?: string;
  onMediaClick?: (url: string) => void;
  /**
   * When provided, a short list item (ordered or unordered) that reads like a
   * reply renders as a button that calls this handler with the item's text,
   * markdown removed. Used by chat consumers to turn "here are 4 things you
   * could do" into one-tap actions; findings and links stay plain bullets.
   */
  onListItemClick?: (text: string) => void;
}

/** Only web and mail links become anchors: the text is model output, so `javascript:` stays text. */
function isSafeLink(url: string): boolean {
  return /^(https?:|mailto:)/i.test(url.trim());
}

function parseInline(text: string, onMediaClick?: (url: string) => void): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match: **bold**, *italic*, `code`, [text](url), bare URL (trailing punctuation stays text)
  const re =
    /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[([^\]]+)\]\(([^)]+)\))|(https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"])/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[1]) {
      parts.push(
        <strong key={match.index} className="font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[4]}</em>);
    } else if (match[5]) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-black/10 px-1 py-0.5 text-[12px] dark:bg-white/10"
        >
          {match[6]}
        </code>
      );
    } else if (match[7]) {
      const linkText = match[8];
      const linkUrl = match[9];
      const isImage =
        linkText.toLowerCase() === "view image" || /\.(png|jpe?g|gif|webp)$/i.test(linkUrl);

      if (isImage) {
        parts.push(
          <button
            key={match.index}
            onClick={() => onMediaClick?.(linkUrl)}
            className="mt-2 block overflow-hidden rounded-lg border border-black/10 transition-opacity hover:opacity-90 dark:border-white/10"
          >
            <img
              src={linkUrl}
              alt={linkText}
              className="max-h-48 max-w-full bg-black/5 object-contain dark:bg-white/5"
            />
          </button>
        );
      } else if (!isSafeLink(linkUrl)) {
        // Model output is untrusted: a `javascript:` link stays text.
        parts.push(<span key={match.index}>{linkText}</span>);
      } else {
        parts.push(
          <a
            key={match.index}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {linkText}
          </a>
        );
      }
    } else if (match[10] && !isSafeLink(match[10])) {
      parts.push(<span key={match.index}>{match[10]}</span>);
    } else if (match[10]) {
      parts.push(
        <a
          key={match.index}
          href={match[10]}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all underline underline-offset-2"
        >
          {match[10]}
        </a>
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts;
}

/** A list item as the user would type it: markdown marks and link syntax dropped. */
function plainText(raw: string): string {
  return raw
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|\*|`)/g, "")
    .trim();
}

/**
 * Whether a bullet reads like something the user would send back ("home",
 * "warm rustic", "Add a pricing section") rather than information to read.
 * A link, a labelled finding ("**Copy:** …", "Home Page: /") or a sentence or
 * two stays text.
 */
function isReplyOption(raw: string): boolean {
  if (/https?:\/\/|\]\(/.test(raw)) return false;
  if (/^\s*\*\*[^*]+:\*\*/.test(raw)) return false;
  const text = plainText(raw);
  if (/^[^:]{1,40}:\s+\S/.test(text)) return false;
  return text.length <= 60 && !/[.!?]\s/.test(text);
}

export function MarkdownText({ content, className, onMediaClick, onListItemClick }: MarkdownTextProps) {
  const renderListItem = (raw: string, key: string): React.ReactNode => {
    const parsed = parseInline(raw, onMediaClick);
    if (!onListItemClick || !isReplyOption(raw)) return <li key={key}>{parsed}</li>;
    return (
      <li key={key} className="list-none">
        <button
          type="button"
          onClick={() => onListItemClick(plainText(raw))}
          className="group border-base-300 bg-base-100 hover:border-base-content/30 hover:bg-base-200/60 my-1 flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-[13px] font-medium transition-colors"
        >
          <span className="min-w-0 flex-1">{parsed}</span>
          <TbChevronRight className="text-base-content/35 group-hover:text-base-content size-4 shrink-0 transition-colors" />
        </button>
      </li>
    );
  };
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre
          key={`code-${i}`}
          className="my-1.5 overflow-x-auto rounded bg-black/10 p-2 text-[12px] leading-snug dark:bg-white/10"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Heading (## or ###)
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const sizes = [
        "text-base font-bold",
        "text-[14px] font-bold",
        "text-[13px] font-semibold",
        "text-[13px] font-medium",
      ];
      elements.push(
        <div key={`h-${i}`} className={`${sizes[level - 1] || sizes[2]} mt-2 first:mt-0`}>
          {parseInline(headingMatch[2], onMediaClick)}
        </div>
      );
      i++;
      continue;
    }

    // Unordered list item
    if (line.match(/^[\s]*[-•]\s+/)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*[-•]\s+/)) {
        items.push(
          renderListItem(lines[i].replace(/^[\s]*[-•]\s+/, ""), `li-${i}`)
        );
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-1 ml-3.5 list-disc space-y-0.5 [&_li]:pl-0.5">
          {items}
        </ul>
      );
      continue;
    }

    // Ordered list item
    if (line.match(/^[\s]*\d+[.)]\s+/)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*\d+[.)]\s+/)) {
        items.push(
          renderListItem(lines[i].replace(/^[\s]*\d+[.)]\s+/, ""), `oli-${i}`)
        );
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-1 ml-3.5 list-decimal space-y-0.5 [&_li]:pl-0.5">
          {items}
        </ol>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={`br-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Normal paragraph
    elements.push(<div key={`p-${i}`}>{parseInline(line, onMediaClick)}</div>);
    i++;
  }

  return (
    <div className={`cursor-text text-[13px] leading-relaxed select-text ${className || ""}`}>
      {elements}
    </div>
  );
}
