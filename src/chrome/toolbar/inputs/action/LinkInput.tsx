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
import {
  TbArrowRight,
  TbChevronDown,
  TbExternalLink,
  TbHash,
  TbLink,
  TbMail,
  TbPhone,
  TbX,
} from "react-icons/tb";
import { useEditor, useNode } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useAtomState } from "@zedux/react";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import { useElementPicker } from "./useElementPicker";
import {
  ACTION_TYPE_OPTIONS,
  migrateAction,
  type LinkAction,
  type LinkTarget,
  type NodeAction,
} from "../../../../utils/action";
import { TabAtom } from "../../../viewport/atoms";
import { scrollToSection } from "../../UnifiedTab";

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

export function LinkInput({
  action,
  onChange,
  placeholder = "Page or URL...",
}: LinkInputProps) {
  const href = action?.href ?? "";
  const target = action?.target;
  const parsed = useMemo(() => parseHref(href), [href]);

  // Local input value — separate from `href` so users can type freely without
  // constant onChange churn. Synced when `href` changes externally.
  const [draft, setDraft] = useState(href);
  useEffect(() => setDraft(href), [href]);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

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
      {/* Combo row: trigger + text input */}
      <div className="border-base-300 bg-base-100 flex w-full items-center gap-1 rounded-md border px-1.5">
        <KindIcon className="text-neutral-content size-3.5 shrink-0" aria-hidden />
        <input
          type="text"
          value={isPage ? displayValue : draft}
          readOnly={isPage}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            } else if (e.key === "Escape") {
              setDraft(href);
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent py-1.5 text-xs outline-none"
          aria-label="Link destination"
        />
        {href && (
          <button
            type="button"
            onClick={() => writeHref("")}
            className="text-neutral-content hover:bg-error hover:text-error-content rounded p-0.5 transition-colors"
            aria-label="Clear link"
          >
            <TbX className="size-3" />
          </button>
        )}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(o => !o)}
          className="text-neutral-content hover:bg-base-200 hover:text-base-content rounded p-1 transition-colors"
          aria-label="Pick page or anchor"
          aria-expanded={open}
        >
          <TbChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Popover: Pages + Anchors */}
      {open && (
        <div
          ref={popoverRef}
          className="border-base-300 bg-base-100 absolute z-50 mt-1 max-h-64 w-72 overflow-y-auto rounded-lg border shadow-lg"
          style={{ marginTop: "2.5rem" }}
        >
          {pages.length > 0 && (
            <div>
              <div className="text-neutral-content border-base-300 border-b px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase">
                Pages
              </div>
              {pages.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePagePick(p.id)}
                  className={`hover:bg-base-200 flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${
                    parsed.pageId === p.id ? "bg-primary/10 text-primary" : "text-base-content"
                  }`}
                >
                  <TbExternalLink className="size-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{p.displayName}</span>
                </button>
              ))}
            </div>
          )}
          {anchors.length > 0 && (
            <div>
              <div className="text-neutral-content border-base-300 border-y px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase">
                Anchors
              </div>
              {anchors.map(a => (
                <button
                  key={a.nodeId}
                  type="button"
                  onClick={() => handleAnchorPick(a.anchor)}
                  className={`hover:bg-base-200 flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${
                    parsed.kind === "anchor" && href === `#${a.anchor}`
                      ? "bg-primary/10 text-primary"
                      : "text-base-content"
                  }`}
                >
                  <TbHash className="size-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{a.label}</span>
                  <span className="text-neutral-content ml-auto truncate font-mono text-[10px]">
                    #{a.anchor}
                  </span>
                </button>
              ))}
            </div>
          )}
          {pages.length === 0 && anchors.length === 0 && (
            <div className="text-neutral-content px-3 py-3 text-xs">
              No pages or anchors found. Type a URL above.
            </div>
          )}
        </div>
      )}

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

      {/* Target select — only for url/page (mailto/tel/anchor don't need it) */}
      {(parsed.kind === "url" || parsed.kind === "page") && (
        <ToolbarDropdown
          value={target || "_self"}
          onChange={(val: string) => writeTarget(val as LinkTarget)}
          propKey="linkInputTarget"
        >
          <option value="_self">Same tab</option>
          <option value="_blank">New tab</option>
        </ToolbarDropdown>
      )}
    </div>
  );
}

// ─── QuickLinkInput — wraps LinkInput for top-of-MainTab placement ─────

/**
 * Reads/writes `props.action` directly via CraftJS `useNode`. When the action
 * isn't a link (e.g. modal, cart), shows a stub with a jump button to the full
 * Actions panel in the Interactions tab.
 *
 * Drop into the `Content` slot of Button/Link MainTabs.
 */
export function QuickLinkInput() {
  const [, setTab] = useAtomState(TabAtom);
  const {
    actions: { setProp },
    action,
  } = useNode(node => {
    const props = node.data.props;
    // Run migrateAction so legacy types render as unified `link` here.
    const single = (props.action as NodeAction | undefined) ?? migrateAction(props);
    return { action: single };
  });

  const jumpToActions = () => {
    setTab("Interactions");
    setTimeout(() => scrollToSection("Interactions"), 150);
  };

  const writeAction = (next: LinkAction) => {
    setProp((props: any) => {
      props.action = next;
      // Keep `actions` array in sync (chained-actions compat).
      if (Array.isArray(props.actions) && props.actions.length > 0) {
        props.actions[0] = next;
      } else if (Array.isArray(props.actions)) {
        props.actions = [next];
      }
      // Clean up legacy props.
      delete props.click;
      delete props.url;
      delete props.urlTarget;
      delete props.clickMode;
    });
  };

  // Non-link action: show stub with jump-to-actions CTA.
  if (action && action.type !== "link") {
    const label =
      ACTION_TYPE_OPTIONS.find(opt => opt.value === action.type)?.label ?? action.type;
    return (
      <div className="border-base-300 bg-base-200/50 flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
        <TbLink className="text-neutral-content size-3.5 shrink-0" />
        <span className="text-neutral-content flex-1 truncate">
          Action: <span className="text-base-content font-medium">{label}</span>
        </span>
        <button
          type="button"
          onClick={jumpToActions}
          className="text-primary hover:bg-primary/10 inline-flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors"
        >
          Edit
          <TbArrowRight className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <LinkInput
        action={(action as LinkAction | null) ?? null}
        onChange={writeAction}
        placeholder="Page or URL..."
      />
      <button
        type="button"
        onClick={jumpToActions}
        className="text-neutral-content hover:text-primary inline-flex items-center gap-1 self-end text-[11px] transition-colors"
      >
        More actions
        <TbArrowRight className="size-3" />
      </button>
    </div>
  );
}
