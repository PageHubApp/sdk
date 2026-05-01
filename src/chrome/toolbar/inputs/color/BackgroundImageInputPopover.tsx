/**
 * BackgroundImageInputPopover — thin trigger chip that opens a draggable
 * FloatingPanel containing the slim media picker. Mirrors PatternInputPopover /
 * GradientInputPopover exactly: row label + Chip with leading thumb /
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
import { lazy, Suspense, useState } from "react";
import { TbAdjustmentsHorizontal, TbPhoto } from "react-icons/tb";
import { getCdnUrl } from "@/utils/cdn";
import { getMediaById, getMediaContent } from "@/utils/media/media";
import { Chip } from "../../../primitives/Chip";
import { ToolbarIconButton } from "../../../primitives/ToolbarIconButton";
import { usePopoverAutoOpen } from "../../inspector/hooks/usePopoverAutoOpen";
import { usePopoverPosition } from "../../inspector/hooks/usePopoverPosition";
import type { PropertyInputProps } from "../../inspector/registry/propertyDefs";

const BackgroundImagePanel = lazy(() => import("./BackgroundImagePanel"));
const ImageSettingsPanel = lazy(() => import("./ImageSettingsPanel"));

const PANEL_WIDTH = 480;
const SETTINGS_PANEL_WIDTH = 360;

export default function BackgroundImageInputPopover({ def }: PropertyInputProps) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const main = usePopoverPosition(PANEL_WIDTH);
  const settings = usePopoverPosition(SETTINGS_PANEL_WIDTH);
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

  const openPanel = () => {
    main.setInitialPos(main.computePosition());
    setOpen(true);
  };

  const openSettingsPanel = () => {
    settings.setInitialPos(settings.computePosition());
    setShowSettings(true);
  };

  usePopoverAutoOpen({ nodeId: id, defId: def?.id, onOpen: openPanel });

  const clearImage = () => {
    setProp((p: any) => {
      if (!p.background) p.background = {};
      p.background.image = null;
      p.background.imageType = "cdn";
    });
  };

  const label = def?.label ?? "Image";

  return (
    <>
      <Chip
        mode="popover"
        ref={main.triggerRef}
        label={label}
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
              ref={settings.triggerRef}
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
          <BackgroundImagePanel initialPosition={main.initialPos} onClose={() => setOpen(false)} />
        </Suspense>
      )}
      {showSettings && (
        <Suspense fallback={null}>
          <ImageSettingsPanel
            initialPosition={settings.initialPos}
            onClose={() => setShowSettings(false)}
          />
        </Suspense>
      )}
    </>
  );
}
