import ReactDOM from "react-dom";
import { TbCrop, TbX } from "react-icons/tb";
import { CropCanvas } from "./ImageCrop/components/CropCanvas";
import { CropControlsPanel } from "./ImageCrop/components/CropControlsPanel";
import { useImageCrop } from "./ImageCrop/hooks/useImageCrop";

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
      className="pagehub-sdk-root ph-modal-backdrop ph-modal-backdrop--center z-9999"
      onClick={onClose}
    >
      <div
        className="pagehub-sdk-root ph-modal-surface relative mx-4 max-h-[90vh] w-full max-w-6xl overflow-hidden bg-base-200!"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-300 bg-neutral/20 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
              <TbCrop className="text-lg text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-base-content">Image Cropper</h2>
              <p className="text-sm font-medium text-neutral-content">
                {media?.metadata?.title || media?.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-content transition-colors hover:bg-neutral hover:text-base-content"
            title="Close"
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
