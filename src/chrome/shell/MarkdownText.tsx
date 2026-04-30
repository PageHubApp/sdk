import React from "react";

/**
 * Lightweight markdown renderer for chat bubbles.
 * Handles: **bold**, *italic*, `inline code`, ```code blocks```,
 * - unordered lists, 1. ordered lists, [links](url), headings (##).
 * No dependencies — just regex + React elements.
 */

interface MarkdownTextProps {
  content: string;
  className?: string;
  onMediaClick?: (url: string) => void;
}

function parseInline(text: string, onMediaClick?: (url: string) => void): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match: **bold**, *italic*, `code`, [text](url)
  const re = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
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
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts;
}

export function MarkdownText({ content, className, onMediaClick }: MarkdownTextProps) {
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
          <li key={`li-${i}`}>
            {parseInline(lines[i].replace(/^[\s]*[-•]\s+/, ""), onMediaClick)}
          </li>
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
          <li key={`oli-${i}`}>
            {parseInline(lines[i].replace(/^[\s]*\d+[.)]\s+/, ""), onMediaClick)}
          </li>
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
