import { useEffect, useId, useRef } from "react";
import ReactDOM from "react-dom";
import { TbCrop, TbX } from "react-icons/tb";
import { CropCanvas } from "./ImageCrop/components/CropCanvas";
import { CropControlsPanel } from "./ImageCrop/components/CropControlsPanel";
import { useImageCrop } from "./ImageCrop/hooks/useImageCrop";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../primitives/layout/tooltipSurface";
import { OVERLAY_Z_CRITICAL_MODAL } from "../../popovers/overlayZIndex";
import { usePortalTarget } from "../../popovers/usePortalTarget";
import { shouldCloseOnEscape } from "../../floating/modalEscape";
import { useOverlay } from "../../../registry/hooks/useOverlay";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: any;
  onSave: (croppedImage: any) => void;
  /** Stacking layer; defaults to the critical-modal layer. Raise it when opening over a higher overlay. */
  zIndex?: number;
}

export function ImageCropModal({
  isOpen,
  onClose,
  media,
  onSave,
  zIndex = OVERLAY_Z_CRITICAL_MODAL,
}: ImageCropModalProps) {
  const crop = useImageCrop({ media, onSave, onClose });
  // Not `getPortalTarget()`: outside the editor it finds this dialog's own
  // `.pagehub-sdk-root` backdrop on the next render and portals into itself.
  const portalTarget = usePortalTarget();

  // On the overlay stack like `Modal`, so Escape closes the cropper and not
  // whatever it was opened from.
  const overlayId = `image-crop:${useId()}`;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useOverlay({ id: overlayId, isOpen, onDismiss: () => onCloseRef.current() });
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldCloseOnEscape(event, overlayId)) return;
      event.preventDefault();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, overlayId]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="pagehub-sdk-root ph-modal-backdrop ph-modal-backdrop--center"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        className="pagehub-sdk-root ph-modal-surface bg-base-200! relative mx-4 max-h-[90vh] w-full max-w-6xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-base-300 bg-neutral/20 flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="border-primary/20 bg-primary/10 flex size-10 items-center justify-center rounded-lg border">
              <TbCrop className="text-primary text-lg" />
            </div>
            <div>
              <h2 className="text-base-content text-xl font-semibold">Image Cropper</h2>
              <p className="text-neutral-content text-sm font-medium">
                {media?.metadata?.title || media?.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-content hover:bg-neutral hover:text-base-content rounded-md p-2 transition-colors"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Close"
          >
            <TbX className="text-lg" />
          </button>
        </div>

        {/* Body */}
        <div className="relative flex h-full max-h-[calc(90vh-120px)] flex-col lg:flex-row">
          <CropControlsPanel crop={crop} />
          <CropCanvas crop={crop} />
        </div>
      </div>
    </div>,
    portalTarget
  );
}
