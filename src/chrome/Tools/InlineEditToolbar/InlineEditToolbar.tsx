import { useEditor as useCraftEditor, useNode } from "@craftjs/core";
import { Editor, useEditorState } from "@tiptap/react";
import { REACT_TOOLTIP_SURFACE_CLASS } from "components/layout/tooltipSurface";
import { Tooltip } from "components/layout/Tooltip";
import React, { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { useClampToViewport } from "../../overlays/useClampToViewport";
import {
  MdFormatBold,
  MdFormatColorFill,
  MdFormatColorText,
  MdFormatItalic,
  MdFormatUnderlined,
  MdLink,
} from "react-icons/md";
import { TbAlphabetLatin, TbChevronDown } from "react-icons/tb";
import { getMediaContent } from "utils/lib";
import { paletteToCSSVar } from "utils/design/palette";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { useAtomValue } from "@zedux/react";
import { useSDK } from "../../../context";
import { hasOverflowAncestor } from "../../hasOverflowAncestor";
import { DeviceAtom, ViewAtom } from "../../Viewport/atoms";
import { PortalToolbarBelowNode } from "./PortalToolbarBelowNode";
import { MediaManagerModal } from "../../Toolbar/Inputs/media/MediaManagerModal";
import { TokenPicker } from "../../Toolbar/Inputs/color/TokenPicker";
import { FontPanel } from "./panels/FontPanel";
import { OPEN_LINK_PANEL_EVENT } from "../openLinkPanelEvent";
import { LinkPanel } from "./panels/LinkPanel";
import { MorePanel } from "./panels/MorePanel";
import { VariableInsertPanel } from "./panels/VariableInsertPanel";

type PanelId = "font" | "link" | "more" | "bgcolor" | "textcolor" | null;

/** Checkerboard for “no explicit color / inherited” swatches (aligned with TokenPicker). */
const SWATCH_INHERIT_BG: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, var(--color-base-300, #d4d4d8) 25%, transparent 25%, transparent 75%, var(--color-base-300, #d4d4d8) 75%), linear-gradient(45deg, var(--color-base-300, #d4d4d8) 25%, transparent 25%, transparent 75%, var(--color-base-300, #d4d4d8) 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 4px 4px",
};

interface InlineEditToolbarProps {
  editor: Editor | null;
  className?: string;
  onSave?: () => void;
}

export function InlineEditToolbar({ editor, onSave }: InlineEditToolbarProps) {
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [linkPanelKey, setLinkPanelKey] = useState(0);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useClampToViewport<HTMLDivElement>();
  const { id: textNodeId } = useNode();
  const { query } = useCraftEditor();
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderCopyAi = config.editorChromeSlots?.renderInlineCopyAssistantTrigger;

  const tipTap = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) {
        return {
          selectionEmpty: true,
          textStyleColor: undefined as string | undefined,
          highlightColor: undefined as string | undefined,
          isBold: false,
          isItalic: false,
          isUnderline: false,
          isLink: false,
        };
      }
      return {
        selectionEmpty: ed.state.selection.empty,
        textStyleColor: ed.getAttributes("textStyle").color as string | undefined,
        highlightColor: ed.getAttributes("highlight").color as string | undefined,
        isBold: ed.isActive("bold"),
        isItalic: ed.isActive("italic"),
        isUnderline: ed.isActive("underline"),
        isLink: ed.isActive("link"),
      };
    },
  });

  const prevSelectionEmptyRef = useRef(true);
  useEffect(() => {
    if (tipTap.selectionEmpty && prevSelectionEmptyRef.current === false) {
      setActivePanel(null);
    }
    prevSelectionEmptyRef.current = tipTap.selectionEmpty;
  }, [tipTap.selectionEmpty]);

  // Toggle panel — same panel closes it, different panel switches
  const toggle = useCallback((id: PanelId) => {
    setActivePanel(prev => (prev === id ? null : id));
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!activePanel) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setActivePanel(null);
    };
    document.addEventListener("mousedown", handleMouseDown, true);
    return () => document.removeEventListener("mousedown", handleMouseDown, true);
  }, [activePanel]);

  // Close on Escape
  useEffect(() => {
    if (!activePanel) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePanel(null);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [activePanel]);

  useEffect(() => {
    const openLink = () => {
      setActivePanel("link");
      setLinkPanelKey(k => k + 1);
    };
    document.addEventListener(OPEN_LINK_PANEL_EVENT, openLink);
    return () => document.removeEventListener(OPEN_LINK_PANEL_EVENT, openLink);
  }, []);

  const { dom } = useNode(node => ({
    dom: (node.dom as HTMLElement | null) ?? null,
  }));
  const device = useAtomValue(DeviceAtom);
  const view = useAtomValue(ViewAtom);
  const isDeviceMode = Boolean(device && view === "mobile");
  const needsPortal = useMemo(
    () => Boolean(dom) && (hasOverflowAncestor(dom) || isDeviceMode),
    [dom, isDeviceMode]
  );
  const portalTargetId = isDeviceMode ? "device-tools-portal" : "viewport";

  if (!editor) return null;

  const innerBarClass = `pointer-events-auto relative left-1/2 z-110 w-fit -translate-x-1/2 font-sans ${needsPortal ? "" : "mt-2"}`;

  const handleButtonClick = (callback: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };

  const minimalToolbarRow = (
    <div className="tool-bg flex h-10 flex-row items-center justify-center gap-0">
      {isAiEnabled && renderCopyAi && (
        <>
          {renderCopyAi({ textNodeId, query })}
          <div className="mx-1 h-5 w-px bg-border" />
        </>
      )}
      <VariableInsertPanel editor={editor} query={query} />
    </div>
  );

  const fullToolbarRow = (
    <div className="tool-bg flex h-10 flex-row items-center justify-center gap-0">
      {isAiEnabled && renderCopyAi && (
        <>
          {renderCopyAi({ textNodeId, query })}
          <div className="mx-1 h-5 w-px bg-border" />
        </>
      )}

      <FormatButton editor={editor} command={() => editor.chain().focus().toggleBold().run()} active={tipTap.isBold} tooltip="Bold (⌘B)" icon={<MdFormatBold />} onAction={handleButtonClick} />
      <FormatButton editor={editor} command={() => editor.chain().focus().toggleItalic().run()} active={tipTap.isItalic} tooltip="Italic (⌘I)" icon={<MdFormatItalic />} onAction={handleButtonClick} />
      <FormatButton editor={editor} command={() => editor.chain().focus().toggleUnderline().run()} active={tipTap.isUnderline} tooltip="Underline (⌘U)" icon={<MdFormatUnderlined />} onAction={handleButtonClick} />

      <div className="mx-1 h-5 w-px bg-border" />

      <Tooltip content="Font" placement="top" tooltipClassName="text-xs! px-2! py-1!">
        <button
          type="button"
          aria-label="Font"
          className={`tool-button ${activePanel === "font" ? "bg-base-200 text-base-content" : ""}`}
          onClick={() => toggle("font")}
        >
          <TbAlphabetLatin aria-hidden />
        </button>
      </Tooltip>

      <div className="mx-1 h-5 w-px bg-border" />

      <Tooltip content="Insert Link (⌘K)" placement="top" tooltipClassName="text-xs! px-2! py-1!">
        <button
          className={`tool-button ${tipTap.isLink ? "bg-primary/15 text-primary" : activePanel === "link" ? "bg-base-200 text-base-content" : ""}`}
          onMouseDown={e => e.preventDefault()}
          onClick={() => toggle("link")}
        >
          <MdLink />
        </button>
      </Tooltip>

      <div className="mx-1 h-5 w-px bg-border" />

      <div className="flex items-center gap-1 px-1">
        <InlineColorSwatch
          active={activePanel === "textcolor"}
          fill={tipTap.textStyleColor}
          label={tipTap.textStyleColor ? "Text color" : "Text color (inherited)"}
          onClick={() => toggle("textcolor")}
        >
          <MdFormatColorText className="size-3" aria-hidden />
        </InlineColorSwatch>
        <InlineColorSwatch
          active={activePanel === "bgcolor"}
          fill={tipTap.highlightColor}
          label={tipTap.highlightColor ? "Highlight color" : "Highlight (none)"}
          onClick={() => toggle("bgcolor")}
        >
          <MdFormatColorFill className="size-3" aria-hidden />
        </InlineColorSwatch>
      </div>

      <div className="mx-1 h-5 w-px bg-border" />

      <Tooltip content="More" placement="top" tooltipClassName="text-xs! px-2! py-1!">
        <button className={`tool-button ${activePanel === "more" ? "bg-base-200 text-base-content" : ""}`} onClick={() => toggle("more")}>
          <TbChevronDown />
        </button>
      </Tooltip>
    </div>
  );

  const toolbarColumn = (
    <div ref={toolbarRef} className={innerBarClass}>
      {activePanel === "font" ? (
        <div className="rounded-box border border-base-300/50 bg-base-100 shadow-xl">
          <FontPanel editor={editor} onAction={handleButtonClick} onClose={() => setActivePanel(null)} />
        </div>
      ) : activePanel === "more" ? (
        <div className="tool-bg">
          <MorePanel
            editor={editor}
            query={query}
            onAction={handleButtonClick}
            onInsertImage={() => {
              setActivePanel(null);
              setShowMediaModal(true);
            }}
            onClose={() => setActivePanel(null)}
          />
        </div>
      ) : activePanel === "link" ? (
        <div className="tool-bg">
          <LinkPanel key={linkPanelKey} editor={editor} onClose={() => setActivePanel(null)} onSave={onSave} />
        </div>
      ) : (
      <>
        {tipTap.selectionEmpty ? minimalToolbarRow : fullToolbarRow}

        {/* === Dropdown panels (colors) === */}
        {(activePanel === "textcolor" || activePanel === "bgcolor") && (
          <div className="pointer-events-auto absolute left-1/2 top-full mt-2 -translate-x-1/2">
            <div className="tool-bg w-fit">
              {activePanel === "textcolor" && (
                <TokenPicker
                  value={tipTap.textStyleColor}
                  onChange={(data) => {
                    const cssVar = paletteToCSSVar(data.value);
                    editor.chain().focus().setColor(cssVar).run();
                  }}
                  onClear={() => {
                    editor.chain().focus().unsetColor().run();
                    setActivePanel(null);
                  }}
                />
              )}
              {activePanel === "bgcolor" && (
                <TokenPicker
                  value={tipTap.highlightColor}
                  onChange={(data) => {
                    const cssVar = paletteToCSSVar(data.value);
                    editor.chain().focus().setHighlight({ color: cssVar }).run();
                  }}
                  onClear={() => {
                    editor.chain().focus().unsetHighlight().run();
                    setActivePanel(null);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </>
      )}
    </div>
  );

  const modals = (
    <>
      <ReactTooltip id="iet-tip" variant="light" classNameArrow="hidden" className={REACT_TOOLTIP_SURFACE_CLASS} />

      <MediaManagerModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSelect={mediaId => {
          const imageUrl = getMediaContent(query, mediaId);
          if (imageUrl) editor?.chain().focus().setImage({ src: imageUrl }).run();
          setShowMediaModal(false);
        }}
        selectionMode={true}
      />
    </>
  );

  /** Full-width pass-through row + narrow auto layer so portaled UI actually receives hits (nested pointer-events-none was eating events). */
  const interactiveShell = (
    <div
      ref={containerRef}
      data-pagehub-canvas-chrome
      className="relative z-110 w-fit max-w-full min-w-0 cursor-default pointer-events-auto"
      onMouseDown={e => e.stopPropagation()}
      onMouseDownCapture={e => e.stopPropagation()}
    >
      {toolbarColumn}
      {modals}
    </div>
  );

  if (needsPortal && dom) {
    return (
      <PortalToolbarBelowNode dom={dom} portalTargetId={portalTargetId} measureRef={toolbarRef}>
        <div className="flex w-full justify-center pointer-events-none">
          {interactiveShell}
        </div>
      </PortalToolbarBelowNode>
    );
  }

  return (
    <div className="pointer-events-none absolute z-100 w-full">
      <div className="flex w-full justify-center pointer-events-none">{interactiveShell}</div>
    </div>
  );
}

function InlineColorSwatch({
  active,
  fill,
  label,
  onClick,
  children,
}: {
  active: boolean;
  /** Set when a TipTap mark supplies a color; omit for inherited / none. */
  fill?: string;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const explicit = Boolean(fill && String(fill).trim() !== "");
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative size-6 cursor-pointer overflow-hidden rounded border-2 transition-colors ${active ? "border-primary" : "border-base-300"} ${!explicit ? "bg-base-200/60" : ""}`}
      style={explicit ? { backgroundColor: fill } : undefined}
      data-tooltip-id="iet-tip"
      data-tooltip-content={label}
      data-tooltip-place="top"
    >
      {!explicit && (
        <span className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]" style={SWATCH_INHERIT_BG} aria-hidden />
      )}
      <span className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
        <span className="flex size-[18px] items-center justify-center rounded-full bg-base-100/90 text-base-content shadow-sm ring-1 ring-base-300/50">
          {children}
        </span>
      </span>
    </button>
  );
}

function FormatButton({ command, active, tooltip, icon, onAction }: {
  editor: Editor; command: () => void; active: boolean; tooltip: string; icon: React.ReactNode;
  onAction: (cb: () => void) => (e: React.MouseEvent) => void;
}) {
  return (
    <Tooltip content={tooltip} placement="top" tooltipClassName="text-xs! px-2! py-1!">
      <button type="button" onClick={onAction(command)} className={`tool-button ${active ? "bg-base-200 text-base-content" : ""}`}>
        {icon}
      </button>
    </Tooltip>
  );
}
