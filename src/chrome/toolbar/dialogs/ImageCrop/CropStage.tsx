import { useEffect, useRef, useState } from "react";
import ReactCrop, { type PercentCrop } from "react-image-crop";
import { TbPhotoOff } from "react-icons/tb";
import type { NaturalSize } from "./cropMath";

interface CropStageProps {
  src: string | null;
  natural: NaturalSize | null;
  loadFailed: boolean;
  crop: PercentCrop | undefined;
  aspect: number | undefined;
  onChange: (crop: PercentCrop) => void;
  disabled?: boolean;
}

/** The largest size with the image's proportions that fits inside `box`. */
function fitInside(natural: NaturalSize, box: NaturalSize): NaturalSize {
  const scale = Math.min(box.width / natural.width, box.height / natural.height, 1);
  return {
    width: Math.floor(natural.width * scale),
    height: Math.floor(natural.height * scale),
  };
}

/**
 * The image area: fills the space it's given, fits the image inside it, and
 * draws the crop box over it. A skeleton holds the same area while the
 * original loads.
 */
export function CropStage({
  src,
  natural,
  loadFailed,
  crop,
  aspect,
  onChange,
  disabled,
}: CropStageProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<NaturalSize | null>(null);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => setArea({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fit = natural && area ? fitInside(natural, area) : null;

  return (
    <div className="bg-base-200 relative min-h-0 flex-1">
      <div ref={areaRef} className="absolute inset-3 flex items-center justify-center sm:inset-5">
        {loadFailed ? (
          <div className="text-neutral-content flex flex-col items-center gap-2 text-center text-sm">
            <TbPhotoOff className="size-6" aria-hidden="true" />
            <p>{"Couldn't load this image. Close and try again."}</p>
          </div>
        ) : src && fit && crop ? (
          <ReactCrop
            crop={crop}
            aspect={aspect}
            onChange={(_, percent) => onChange(percent)}
            keepSelection
            ruleOfThirds
            minWidth={16}
            minHeight={16}
            disabled={disabled}
          >
            <img
              src={src}
              crossOrigin="anonymous"
              alt=""
              draggable={false}
              style={{ width: fit.width, height: fit.height }}
            />
          </ReactCrop>
        ) : (
          <div
            className="bg-base-content/5 size-full animate-pulse rounded"
            aria-label="Loading image"
            role="status"
          />
        )}
      </div>
    </div>
  );
}
