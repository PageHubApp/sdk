import Image from "next/image";
import { TbCheck, TbLoader2, TbX } from "react-icons/tb";
import type { UseImageCropReturn } from "../hooks/useImageCrop";

const BLUR_PLACEHOLDER =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

interface CropCanvasProps {
  crop: UseImageCropReturn;
}

export function CropCanvas({ crop }: CropCanvasProps) {
  const imageUrl = crop.getImageUrl();

  return (
    <div className="relative min-h-[400px] flex-1 p-4 lg:min-h-0 lg:p-6">
      <div className="flex h-full flex-col">
        <div
          role="presentation"
          aria-hidden="true"
          className="relative flex flex-1 cursor-grab items-center justify-center overflow-hidden select-none"
          style={{
            cursor: crop.isPanning ? "grabbing" : "grab",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
          onMouseDown={crop.handleMouseDown}
          onMouseMove={crop.handleMouseMove}
          onMouseUp={crop.handleMouseUp}
          onDragStart={e => e.preventDefault()}
          onWheel={crop.handleWheel}
          onTouchStart={crop.handleTouchStart}
          onTouchMove={crop.handleTouchMove}
        >
          <div
            ref={crop.containerRef}
            className="relative"
            style={{ transform: `scale(${crop.previewScale})`, transformOrigin: "center" }}
          >
            {imageUrl && (
              <div
                className="relative inline-block"
                style={{
                  transform: `translate(${crop.viewportPosition.x}px, ${crop.viewportPosition.y}px)`,
                }}
              >
                <div
                  className="relative size-full"
                  style={{
                    width: crop.imageSize.width || 400,
                    height: crop.imageSize.height || 400,
                  }}
                >
                  <Image
                    ref={crop.imageRef}
                    src={imageUrl}
                    alt="Crop preview"
                    fill
                    className="object-contain"
                    draggable={false}
                    onLoad={crop.handleImageLoad}
                    onDragStart={e => e.preventDefault()}
                    placeholder="blur"
                    blurDataURL={BLUR_PLACEHOLDER}
                    crossOrigin="anonymous"
                  />
                </div>

                {/* Dark overlay outside crop area */}
                {crop.imageSize.width > 0 && (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: 0,
                      top: 0,
                      width: crop.imageSize.width,
                      height: crop.imageSize.height,
                      background: `linear-gradient(to right,
                        rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.5) ${crop.cropArea.x}px,
                        transparent ${crop.cropArea.x}px, transparent ${crop.cropArea.x + crop.cropArea.width}px,
                        rgba(0,0,0,0.5) ${crop.cropArea.x + crop.cropArea.width}px, rgba(0,0,0,0.5) 100%
                      ),
                      linear-gradient(to bottom,
                        rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.5) ${crop.cropArea.y}px,
                        transparent ${crop.cropArea.y}px, transparent ${crop.cropArea.y + crop.cropArea.height}px,
                        rgba(0,0,0,0.5) ${crop.cropArea.y + crop.cropArea.height}px, rgba(0,0,0,0.5) 100%
                      )`,
                    }}
                  />
                )}

                {/* Crop overlay with handles */}
                {crop.imageSize.width > 0 && (
                  <div
                    className="pointer-events-none absolute border-2 border-white bg-transparent shadow-lg"
                    style={{
                      left: crop.cropArea.x,
                      top: crop.cropArea.y,
                      width: crop.cropArea.width,
                      height: crop.cropArea.height,
                    }}
                  >
                    {/* Corner handles */}
                    <Handle position="-left-1 -top-1" cursor="nw-resize" />
                    <Handle position="-right-1 -top-1" cursor="ne-resize" />
                    <Handle position="-bottom-1 -left-1" cursor="sw-resize" />
                    <Handle position="-bottom-1 -right-1" cursor="se-resize" />
                    {/* Edge handles */}
                    <div className="pointer-events-auto absolute -top-1 left-1/2 h-3 w-2 -translate-x-1/2 cursor-n-resize rounded-full border-2 border-gray-800 bg-white shadow-lg transition-transform hover:scale-110" />
                    <div className="pointer-events-auto absolute -bottom-1 left-1/2 h-3 w-2 -translate-x-1/2 cursor-s-resize rounded-full border-2 border-gray-800 bg-white shadow-lg transition-transform hover:scale-110" />
                    <div className="pointer-events-auto absolute top-1/2 -left-1 h-2 w-3 -translate-y-1/2 cursor-w-resize rounded-full border-2 border-gray-800 bg-white shadow-lg transition-transform hover:scale-110" />
                    <div className="pointer-events-auto absolute top-1/2 -right-1 h-2 w-3 -translate-y-1/2 cursor-e-resize rounded-full border-2 border-gray-800 bg-white shadow-lg transition-transform hover:scale-110" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {crop.saveError && (
        <div className="border-error/20 bg-error/10 text-error absolute inset-x-6 top-6 rounded-lg border p-3 text-sm">
          <div className="flex items-center gap-2">
            <TbX className="size-4" />
            <span className="font-medium">Save Failed</span>
          </div>
          <p className="text-error/80 mt-1">{crop.saveError}</p>
          <button
            onClick={() => crop.setSaveError(null)}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {crop.saveSuccess && (
        <div className="absolute inset-x-6 top-6 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-600">
          <div className="flex items-center gap-2">
            <TbCheck className="size-4" />
            <span className="font-medium">Success!</span>
          </div>
          <p className="mt-1 text-green-600/80">
            {crop.saveMode === "override"
              ? `Image cropped and original file replaced on CDN (${crop.imageFormat.toUpperCase()}, ${crop.imageQuality}% quality)`
              : `Image cropped and saved as new variant on CDN (${crop.imageFormat.toUpperCase()}, ${crop.imageQuality}% quality)`}
          </p>
        </div>
      )}

      {/* Save Area */}
      <div className="border-base-300 bg-base-200/95 absolute right-3 bottom-3 rounded-lg border px-3 py-1.5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-6">
          <label className="text-neutral-content flex cursor-pointer items-center gap-2 text-sm">
            Override original
            <input
              type="checkbox"
              checked={crop.saveMode === "override"}
              onChange={e => crop.setSaveMode(e.target.checked ? "override" : "new")}
              className="border-base-300 bg-neutral text-accent focus:ring-ring size-4 rounded"
            />
          </label>
          <button
            type="button"
            onClick={crop.handleSave}
            disabled={crop.isSaving}
            className="btn btn-primary flex items-center gap-2"
          >
            {crop.isSaving ? (
              <>
                <TbLoader2 className="animate-spin" />
                Processing...
              </>
            ) : crop.saveSuccess ? (
              <>
                <TbCheck />
                Saved!
              </>
            ) : (
              <>{crop.saveMode === "new" ? "Save as New Variant" : "Override Original"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Handle({ position, cursor }: { position: string; cursor: string }) {
  return (
    <div
      className={`pointer-events-auto absolute ${position} size-3 cursor-${cursor} rounded-full border-2 border-gray-800 bg-white shadow-lg transition-transform hover:scale-110`}
      title={`Resize from ${cursor.replace("-resize", "")}`}
    />
  );
}
