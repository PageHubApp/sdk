import ReactDOM from "react-dom";
import { TbCrop, TbX } from "react-icons/tb";
import { CropCanvas } from "./ImageCrop/components/CropCanvas";
import { CropControlsPanel } from "./ImageCrop/components/CropControlsPanel";
import { useImageCrop } from "./ImageCrop/hooks/useImageCrop";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../primitives/layout/tooltipSurface";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: any;
  onSave: (croppedImage: any) => void;
  settings?: any;
}

export function ImageCropModal({ isOpen, onClose, media, onSave, settings }: ImageCropModalProps) {
  const crop = useImageCrop({ media, onSave, onClose, settings });

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="pagehub-sdk-root ph-modal-backdrop ph-modal-backdrop--center"
      style={{ zIndex: 2147483000 }}
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
            className="text-neutral-content hover:bg-neutral hover:text-base-content rounded-lg p-2 transition-colors"
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
    document.querySelector(".pagehub-sdk-root") || document.body
  );
}
