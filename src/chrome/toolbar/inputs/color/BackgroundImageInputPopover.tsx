/**
 * BackgroundImageInputPopover — thin trigger chip that opens a draggable
 * FloatingPanel containing the slim media picker. Mirrors PatternInputPopover /
 * GradientInputPopover exactly: row label + PopoverChip with leading thumb /
 * "Add..." + X. When an image is set, the chip's `trailingExtras` slot
 * renders a sliders icon button that opens `ImageSettingsPanel` (Focal Point
 * + the registered `image-settings` section). Same canonical pattern docs §1
 * describes for chip-tied secondary actions ("Layout chip's Add Container",
 * "show-hide chip's eye toggle").
 *
 * Listens to PopoverOpenRequestAtom + SessionAddedAtom so AccordionAddMenu /
 * PropertySection title-click can drive the picker. Receives `def` from
 * PropertyInputProps.
 */
import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { TbAdjustmentsHorizontal, TbPhoto } from "react-icons/tb";
import { getCdnUrl } from "@/utils/cdn";
import { getMediaById, getMediaContent, SideBarAtom } from "@/utils/lib";
import { PopoverChip } from "../../../primitives/PopoverChip";
import { ToolbarIconButton } from "../../../primitives/ToolbarIconButton";
import { SessionAddedAtom, sessionKey } from "../../unified-settings/sessionAddedAtom";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../unified-settings/popoverOpenRequestAtom";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";

const BackgroundImagePanel = lazy(() => import("./BackgroundImagePanel"));
const ImageSettingsPanel = lazy(() => import("./ImageSettingsPanel"));

const PANEL_WIDTH = 480;
const SETTINGS_PANEL_WIDTH = 360;

export default function BackgroundImageInputPopover({ def }: PropertyInputProps) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const [settingsPos, setSettingsPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);
  const sessionAdded = useAtomValue(SessionAddedAtom);
  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);
  const { query } = useEditor();

  const {
    actions: { setProp },
    id,
    background,
  } = useNode(node => ({
    id: node.id,
    background: node.data?.props?.background,
  }));

  const mediaId = background?.image;
  const hasImage = !!mediaId;
  const selectedMedia = hasImage ? getMediaById(query, mediaId) : null;
  const isSvg = selectedMedia?.type === "svg";
  const svgContent = isSvg ? selectedMedia?.metadata?.svg : null;

  let imageUrl: string | null = null;
  if (hasImage && !isSvg) {
    if (selectedMedia?.type === "cdn") {
      const cdnId = selectedMedia.cdnId || selectedMedia.id;
      imageUrl = getCdnUrl(cdnId, { width: 600, format: "auto" });
    } else {
      imageUrl = getMediaContent(query, mediaId);
    }
  }

  const computePosition = (anchor: HTMLElement | null, panelWidth: number) => {
    const rect = anchor?.getBoundingClientRect();
    if (!rect) return undefined;
    const x = sidebarLeft ? rect.right + 8 : rect.left - panelWidth - 8;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  };

  const openPanel = () => {
    setInitialPos(computePosition(triggerRef.current, PANEL_WIDTH));
    setOpen(true);
  };

  const openSettingsPanel = () => {
    setSettingsPos(computePosition(settingsTriggerRef.current, SETTINGS_PANEL_WIDTH));
    setShowSettings(true);
  };

  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (def && sessionAdded.has(sessionKey(id, def.id))) {
      requestAnimationFrame(() => {
        setInitialPos(computePosition(triggerRef.current, PANEL_WIDTH));
        setOpen(true);
      });
      autoOpenedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionAdded, id, def?.id]);

  const lastRequestVersion = useRef(0);
  useEffect(() => {
    if (!def) return;
    const version = popoverRequests.get(popoverRequestKey(id, def.id)) || 0;
    if (version === 0 || version === lastRequestVersion.current) return;
    lastRequestVersion.current = version;
    requestAnimationFrame(() => {
      setInitialPos(computePosition(triggerRef.current, PANEL_WIDTH));
      setOpen(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popoverRequests, id, def?.id]);

  const clearImage = () => {
    setProp((p: any) => {
      if (!p.background) p.background = {};
      p.background.image = null;
      p.background.imageType = "cdn";
    });
  };

  const label = def?.label ?? "Image";

  return (
    <div className="flex items-center gap-0.5">
      <span className="text-base-content w-20 shrink-0 truncate text-xs">{label}</span>
      <PopoverChip
        ref={triggerRef}
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          if (showSettings) setShowSettings(false);
          clearImage();
        }}
        triggerAriaLabel={hasImage ? "Change image" : "Add image"}
        clearAriaLabel="Clear image"
        variant={hasImage ? "preview" : "default"}
        leading={
          hasImage ? (
            svgContent ? (
              <span
                className="text-base-content absolute inset-0 flex items-center justify-center [&>svg]:size-full [&>svg]:max-h-full [&>svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: svgContent }}
                aria-hidden
              />
            ) : (
              <span
                className="absolute inset-0 bg-cover bg-center"
                style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
                aria-hidden
              />
            )
          ) : (
            <TbPhoto className="size-3.5" aria-hidden />
          )
        }
        summary={hasImage ? null : "Add..."}
        trailingExtras={
          hasImage ? (
            <ToolbarIconButton
              ref={settingsTriggerRef}
              ariaLabel="Image settings"
              tooltip="Image settings"
              onClick={openSettingsPanel}
            >
              <TbAdjustmentsHorizontal className="size-3.5" aria-hidden />
            </ToolbarIconButton>
          ) : null
        }
      />
      {open && (
        <Suspense fallback={null}>
          <BackgroundImagePanel initialPosition={initialPos} onClose={() => setOpen(false)} />
        </Suspense>
      )}
      {showSettings && (
        <Suspense fallback={null}>
          <ImageSettingsPanel
            initialPosition={settingsPos}
            onClose={() => setShowSettings(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
