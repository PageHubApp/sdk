/**
 * LinkInput — single combo input for the unified `LinkAction` shape.
 *
 * One `href` string encodes everything (HTML-style):
 *   - https://… / //…   external URL
 *   - /relative          relative URL (host app routing)
 *   - ref:<pageId>[…]    internal page ref (resolves at render time)
 *   - #anchor            in-page anchor
 *   - mailto:…?subject=  email
 *   - tel:…              phone
 *
 * UI sub-fields (path, subject, body, target) are derived from `href` for
 * friendly editing; the stored value is always one `href` string.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TbExternalLink, TbHash, TbLink, TbMail, TbPhone } from "react-icons/tb";
import { ChevronTrigger } from "../../../primitives/ChevronTrigger";
import { InlineClearButton } from "../../../primitives/InlineClearButton";
import { Chip } from "../../../primitives/Chip";
import { AnchoredPopover } from "../../../overlays/AnchoredPopover";
import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { ToolbarSegmentedControl } from "../../primitives/ToolbarSegmentedControl";
import { useElementPicker } from "./useElementPicker";
import { type LinkAction, type LinkTarget } from "../../../../utils/action";

interface PageOption {
  id: string;
  displayName: string;
}

interface LinkInputProps {
  /** Current action — only `LinkAction` is rendered; other types render the stub. */
  action: LinkAction | null;
  /** Called with the new action whenever any sub-field or href changes. */
  onChange: (action: LinkAction) => void;
  /** Optional placeholder for the href input. */
  placeholder?: string;
}

// ─── Parsing ───────────────────────────────────────────────────────────

interface ParsedHref {
  kind: "url" | "page" | "anchor" | "email" | "phone" | "empty";
  /** Raw href stored on the action. */
  href: string;
  /** For `page`: pageId portion of `ref:<pageId>[/path]`. */
  pageId?: string;
  /** For `page`: optional path suffix after pageId (incl. leading /, ?, #). */
  path?: string;
  /** For `email`: email address (no `mailto:` prefix). */
  email?: string;
  /** For `email`: subject querystring param. */
  subject?: string;
  /** For `email`: body querystring param. */
  body?: string;
}

function parseHref(href: string | undefined): ParsedHref {
  const h = href ?? "";
  if (!h) return { kind: "empty", href: "" };
  if (h.startsWith("ref:")) {
    const m = h.match(/^ref:([^/?#]+)(.*)$/);
    if (m) return { kind: "page", href: h, pageId: m[1], path: m[2] || "" };
    return { kind: "page", href: h, pageId: h.slice(4), path: "" };
  }
  if (h.startsWith("#")) return { kind: "anchor", href: h };
  if (h.startsWith("mailto:")) {
    // mailto:addr?subject=…&body=…
    const rest = h.slice(7);
    const qIdx = rest.indexOf("?");
    if (qIdx === -1) return { kind: "email", href: h, email: rest };
    const email = rest.slice(0, qIdx);
    const params = new URLSearchParams(rest.slice(qIdx + 1));
    return {
      kind: "email",
      href: h,
      email,
      subject: params.get("subject") || "",
      body: params.get("body") || "",
    };
  }
  if (h.startsWith("tel:")) return { kind: "phone", href: h };
  return { kind: "url", href: h };
}

function encodeMailto(email: string, subject?: string, body?: string): string {
  if (!email) return "";
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const qs = params.toString();
  return `mailto:${email}${qs ? `?${qs}` : ""}`;
}

// ─── Component ─────────────────────────────────────────────────────────

export function LinkInput({ action, onChange, placeholder = "Page or URL..." }: LinkInputProps) {
  const href = action?.href ?? "";
  const target = action?.target;
  const parsed = useMemo(() => parseHref(href), [href]);

  // Local input value — separate from `href` so users can type freely without
  // constant onChange churn. Synced when `href` changes externally.
  const [draft, setDraft] = useState(href);
  useEffect(() => setDraft(href), [href]);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ─── Page list (CraftJS tree) ───
  const { pages } = useEditor(state => {
    const list: PageOption[] = [];
    const root = state.nodes[ROOT_NODE];
    if (root?.data?.nodes) {
      for (const childId of root.data.nodes) {
        const n = state.nodes[childId];
        if (n?.data?.props?.type === "page") {
          list.push({
            id: childId,
            displayName: (n.data.custom?.displayName as string) || "Untitled Page",
          });
        }
      }
    }
    return { pages: list };
  });

  // ─── Anchor list ───
  const anchors = useElementPicker("all");

  // ─── Selected page label (for friendly display when href is ref:) ───
  const selectedPage = parsed.kind === "page" ? pages.find(p => p.id === parsed.pageId) : null;

  // ─── Patch helpers ───
  const writeHref = (next: string) => {
    onChange({ type: "link", href: next, ...(target ? { target } : {}) });
  };
  const writeTarget = (next: LinkTarget | undefined) => {
    onChange({ type: "link", href, ...(next ? { target: next } : {}) });
  };
  const commitDraft = () => {
    if (draft !== href) writeHref(draft);
  };

  const handlePagePick = (pageId: string) => {
    writeHref(`ref:${pageId}${parsed.path ?? ""}`);
    setOpen(false);
  };
  const handleAnchorPick = (anchor: string) => {
    writeHref(`#${anchor}`);
    setOpen(false);
  };
  const handlePathChange = (path: string) => {
    if (parsed.kind !== "page" || !parsed.pageId) return;
    writeHref(`ref:${parsed.pageId}${path}`);
  };
  const handleEmailField = (field: "email" | "subject" | "body", value: string) => {
    const email = field === "email" ? value : (parsed.email ?? "");
    const subject = field === "subject" ? value : (parsed.subject ?? "");
    const body = field === "body" ? value : (parsed.body ?? "");
    writeHref(encodeMailto(email, subject, body));
  };

  // ─── Render ───
  const KindIcon =
    parsed.kind === "email"
      ? TbMail
      : parsed.kind === "phone"
        ? TbPhone
        : parsed.kind === "anchor"
          ? TbHash
          : parsed.kind === "page"
            ? TbExternalLink
            : TbLink;

  // Display value: friendly label for page refs, raw href otherwise.
  const isPage = parsed.kind === "page";
  const displayValue = isPage && selectedPage ? selectedPage.displayName : draft;

  return (
    <div className="link-input flex flex-col gap-2">
      {/* Combo row: trigger + text input. Clicking anywhere on the row (label,
          icon, or input chrome) opens the popover; the input still focuses for
          typing. The X clear and chevron stop propagation so they keep their own
          toggle/clear semantics. */}
      <Chip
        onClick={() => setOpen(o => !o)}
        trailing={
          <>
            {href && <InlineClearButton onClick={() => writeHref("")} tooltip="Clear link" />}
            <ChevronTrigger
              ref={triggerRef}
              open={open}
              onClick={() => setOpen(o => !o)}
              tooltip="Pick page or anchor"
            />
          </>
        }
      >
        <div ref={wrapperRef} className="flex h-full min-w-0 flex-1 items-center gap-1.5">
          <KindIcon className="text-neutral-content size-3.5 shrink-0" aria-hidden />
          <input
            id="ph-link-input"
            type="text"
            value={isPage ? displayValue : draft}
            readOnly={isPage}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitDraft}
            onClick={e => e.stopPropagation()}
            onFocus={() => setOpen(true)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
              } else if (e.key === "Escape") {
                setDraft(href);
              }
            }}
            placeholder={placeholder}
            className="h-full flex-1 bg-transparent px-1 text-xs outline-none"
            aria-label="Link destination"
          />
        </div>
      </Chip>

      {/* Pages + Anchors picker — AnchoredPopover + unified ph-select chrome */}
      <AnchoredPopover
        open={open}
        onOpenChange={setOpen}
        anchor={wrapperRef}
        placement="bottom-start"
        matchAnchorWidth={{ min: 240, max: 480 }}
        ignoreOutsideClicks={[wrapperRef]}
        className="pagehub-sdk-root ph-select-content max-h-64 overflow-y-auto"
      >
        {pages.length > 0 && (
          <>
            <div className="ph-select-group text-base-content px-2 pt-1 pb-1.5 font-bold">
              Pages
            </div>
            {pages.map(p => {
              const selected = parsed.pageId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePagePick(p.id)}
                  data-selected={selected || undefined}
                  className="ph-select-item data-selected:bg-primary data-selected:text-primary-content"
                >
                  <TbExternalLink className="size-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{p.displayName}</span>
                </button>
              );
            })}
          </>
        )}
        {anchors.length > 0 && (
          <>
            <div
              className={`ph-select-group text-base-content px-2 pb-1.5 font-bold ${
                pages.length > 0 ? "pt-2" : "pt-1"
              }`}
            >
              Anchors
            </div>
            {anchors.map(a => {
              const selected = parsed.kind === "anchor" && href === `#${a.anchor}`;
              return (
                <button
                  key={a.nodeId}
                  type="button"
                  onClick={() => handleAnchorPick(a.anchor)}
                  data-selected={selected || undefined}
                  className="ph-select-item data-selected:bg-primary data-selected:text-primary-content"
                >
                  <TbHash className="size-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{a.label}</span>
                  <span className="text-neutral-content ml-auto truncate font-mono text-[10px]">
                    #{a.anchor}
                  </span>
                </button>
              );
            })}
          </>
        )}
        {pages.length === 0 && anchors.length === 0 && (
          <div className="text-neutral-content px-3 py-3 text-xs">
            No pages or anchors found. Type a URL above.
          </div>
        )}
      </AnchoredPopover>

      {/* Sub-fields by kind */}
      {parsed.kind === "page" && (
        <input
          type="text"
          value={parsed.path ?? ""}
          onChange={e => handlePathChange(e.target.value)}
          placeholder="Path (optional, e.g. /{{item.slug}})"
          className="input-plain w-full"
          aria-label="Page path suffix"
        />
      )}

      {parsed.kind === "email" && (
        <>
          <input
            type="email"
            value={parsed.email ?? ""}
            onChange={e => handleEmailField("email", e.target.value)}
            placeholder="hello@example.com"
            className="input-plain w-full"
            aria-label="Email address"
          />
          <input
            type="text"
            value={parsed.subject ?? ""}
            onChange={e => handleEmailField("subject", e.target.value)}
            placeholder="Subject (optional)"
            className="input-plain w-full"
            aria-label="Email subject"
          />
          <input
            type="text"
            value={parsed.body ?? ""}
            onChange={e => handleEmailField("body", e.target.value)}
            placeholder="Body (optional)"
            className="input-plain w-full"
            aria-label="Email body"
          />
        </>
      )}

      {/* Target toggle — only for url/page (mailto/tel/anchor don't need it) */}
      {(parsed.kind === "url" || parsed.kind === "page") && (
        <ToolbarSegmentedControl<LinkTarget>
          aria-label="Link target"
          value={(target || "_self") as LinkTarget}
          onChange={writeTarget}
          options={[
            { value: "_self", label: "Same tab" },
            { value: "_blank", label: "New tab" },
          ]}
        />
      )}
    </div>
  );
}
