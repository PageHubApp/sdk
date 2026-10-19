import { useCallback, useEffect, useState } from "react";
import type { PercentCrop } from "react-image-crop";
import {
  CROP_RATIO_PRESETS,
  clampCrop,
  initialCrop,
  isFullImageCrop,
  resolveRatio,
  type NaturalSize,
  type PixelCrop,
} from "./cropMath";
import { cropSourceUrl } from "./cropSave";

/** Natural-pixel crop → percent of the image, for display. */
function toPercent(crop: PixelCrop, natural: NaturalSize): PercentCrop {
  return {
    unit: "%",
    x: (crop.x / natural.width) * 100,
    y: (crop.y / natural.height) * 100,
    width: (crop.width / natural.width) * 100,
    height: (crop.height / natural.height) * 100,
  };
}

/** Percent of the image → natural pixels, whole and inside the image. */
function toPixels(crop: PercentCrop, natural: NaturalSize): PixelCrop {
  return clampCrop(
    {
      x: (crop.x / 100) * natural.width,
      y: (crop.y / 100) * natural.height,
      width: (crop.width / 100) * natural.width,
      height: (crop.height / 100) * natural.height,
    },
    natural
  );
}

/**
 * Loads the full-size original's dimensions and holds the crop. The crop is
 * kept as a percent of the image so the display can resize freely; `pixelCrop`
 * is the same box in the natural pixels of `cropSourceUrl(media)`, the image
 * `saveCrop` reloads. `unchanged` is true while the crop is the whole image.
 */
export function useCropState(media: any) {
  const src = cropSourceUrl(media);
  const hasMedia = !!media;
  const [natural, setNatural] = useState<NaturalSize | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [ratioKey, setRatioKey] = useState(CROP_RATIO_PRESETS[0].key);
  const [crop, setCrop] = useState<PercentCrop | undefined>();

  useEffect(() => {
    // Hosts clear `media` while the dialog fades out; keep what's on screen.
    if (!hasMedia) return;
    setNatural(null);
    setCrop(undefined);
    setRatioKey(CROP_RATIO_PRESETS[0].key);
    setLoadFailed(!src);
    if (!src) return;

    let live = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!live) return;
      const size = { width: img.naturalWidth, height: img.naturalHeight };
      setNatural(size);
      setCrop(toPercent(initialCrop(size, null), size));
    };
    img.onerror = () => {
      if (live) setLoadFailed(true);
    };
    img.src = src;
    return () => {
      live = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [src, hasMedia]);

  const preset = CROP_RATIO_PRESETS.find(p => p.key === ratioKey) ?? CROP_RATIO_PRESETS[0];
  const aspect = natural ? (resolveRatio(preset, natural) ?? undefined) : undefined;

  const selectRatio = useCallback(
    (key: string) => {
      const next = CROP_RATIO_PRESETS.find(p => p.key === key);
      if (!next || !natural) return;
      setRatioKey(key);
      setCrop(toPercent(initialCrop(natural, resolveRatio(next, natural)), natural));
    },
    [natural]
  );

  const pixelCrop = natural && crop ? toPixels(crop, natural) : null;
  const unchanged = !pixelCrop || !natural || isFullImageCrop(pixelCrop, natural);

  return {
    src,
    natural,
    loadFailed,
    crop,
    setCrop,
    aspect,
    ratioKey,
    selectRatio,
    pixelCrop,
    unchanged,
  };
}
