import { useCallback, useEffect, useRef, useState } from "react";
import { getCdnUrl } from "@/utils/cdn";
import { DeleteMedia, GetSignedUrl, SaveMedia } from "@/chrome/viewport/viewportExports";

// ─── Types ───

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PresetSize {
  name: string;
  width: number;
  height: number;
  ratio: number;
}

export const PRESET_SIZES: PresetSize[] = [
  { name: "Mobile Hero", width: 375, height: 667, ratio: 0.562 },
  { name: "Desktop Hero", width: 1920, height: 1080, ratio: 1.778 },
  { name: "Square", width: 400, height: 400, ratio: 1 },
  { name: "Instagram Post", width: 1080, height: 1080, ratio: 1 },
  { name: "Instagram Story", width: 1080, height: 1920, ratio: 0.562 },
  { name: "Facebook Cover", width: 1200, height: 630, ratio: 1.905 },
  { name: "Twitter Header", width: 1500, height: 500, ratio: 3 },
  { name: "LinkedIn Cover", width: 1584, height: 396, ratio: 4 },
];

// ─── Hook ───

interface UseImageCropOptions {
  media: any;
  onSave: (croppedImage: any) => void;
  onClose: () => void;
  settings?: any;
}

export function useImageCrop({ media, onSave, onClose, settings }: UseImageCropOptions) {
  // ─── Crop state ───
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [baseCropArea, setBaseCropArea] = useState<CropArea>({
    x: 0,
    y: 0,
    width: 200,
    height: 200,
  });
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [lockAspectRatio, setLockAspectRatio] = useState(false);
  const [customWidth, setCustomWidth] = useState(400);
  const [customHeight, setCustomHeight] = useState(400);
  const [cropScale, setCropScale] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // ─── Viewport state ───
  const [previewScale, setPreviewScale] = useState(1);
  const [viewportPosition, setViewportPosition] = useState({ x: 0, y: 0 });

  // ─── Drag state ───
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragType, setDragType] = useState<"move" | "resize" | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPosition, setPanStartPosition] = useState({ x: 0, y: 0 });
  const [touchStartDistance, setTouchStartDistance] = useState(0);
  const [touchStartScale, setTouchStartScale] = useState(1);

  // ─── Save state ───
  const [saveMode, setSaveMode] = useState<"new" | "override">("new");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ─── Export state ───
  const [imageFormat, setImageFormat] = useState<"png" | "webp" | "jpeg">("webp");
  const [imageQuality, setImageQuality] = useState(90);
  const [versionName, setVersionName] = useState("");

  // ─── Refs ───
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Image URL ───
  const getImageUrl = () => {
    if (media?.type === "url") return media.metadata?.url;
    if (media?.type === "svg") return null;
    return media ? getCdnUrl(media.cdnId || media.id, { width: 800, format: "auto" }) : null;
  };

  // ─── Crop area logic ───

  const updateCropArea = useCallback(
    (newArea: Partial<CropArea>) => {
      setCropArea(prev => {
        let updated = { ...prev, ...newArea };

        if (lockAspectRatio && aspectRatio) {
          if (newArea.width !== undefined) {
            updated.height = updated.width / aspectRatio;
          } else if (newArea.height !== undefined) {
            updated.width = updated.height * aspectRatio;
          }
        }

        updated.x = Math.max(0, Math.min(updated.x, imageSize.width - updated.width));
        updated.y = Math.max(0, Math.min(updated.y, imageSize.height - updated.height));
        updated.width = Math.max(50, Math.min(updated.width, imageSize.width - updated.x));
        updated.height = Math.max(50, Math.min(updated.height, imageSize.height - updated.y));

        if (lockAspectRatio && aspectRatio) {
          if (newArea.width !== undefined) {
            updated.height = Math.min(updated.height, updated.width / aspectRatio);
            updated.width = updated.height * aspectRatio;
          } else if (newArea.height !== undefined) {
            updated.width = Math.min(updated.width, updated.height * aspectRatio);
            updated.height = updated.width / aspectRatio;
          }
        }

        return updated;
      });
    },
    [lockAspectRatio, aspectRatio, imageSize]
  );

  const handleImageLoad = () => {
    if (!imageRef.current) return;
    const { naturalWidth, naturalHeight } = imageRef.current;
    setImageSize({ width: naturalWidth, height: naturalHeight });

    if (cropArea.width === 0 && cropArea.height === 0) {
      const initialSize = Math.min(naturalWidth, naturalHeight) * 0.5;
      const initial = {
        x: (naturalWidth - initialSize) / 2,
        y: (naturalHeight - initialSize) / 2,
        width: initialSize,
        height: initialSize,
      };
      setCropArea(initial);
      setBaseCropArea(initial);
    }

    setCropScale(1);
    setViewportPosition({ x: 0, y: 0 });
    setPanStartPosition({ x: 0, y: 0 });
  };

  // ─── Mouse/touch handlers ───

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || !imageRef.current) return;
    const imageRect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - imageRect.left) / previewScale;
    const y = (e.clientY - imageRect.top) / previewScale;

    const handleSize = 8;
    const isOnHandle = (handle: string) => {
      const hx = handle.includes("w") ? cropArea.x : cropArea.x + cropArea.width;
      const hy = handle.includes("n") ? cropArea.y : cropArea.y + cropArea.height;
      return Math.abs(x - hx) <= handleSize && Math.abs(y - hy) <= handleSize;
    };

    for (const handle of ["nw", "ne", "sw", "se"]) {
      if (isOnHandle(handle)) {
        setIsDragging(true);
        setDragType("resize");
        setResizeHandle(handle);
        setDragStart({ x, y });
        return;
      }
    }

    if (
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.width &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.height
    ) {
      setIsDragging(true);
      setDragType("move");
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    } else {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setPanStartPosition(viewportPosition);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !imageRef.current) return;

    if (isDragging) {
      const imageRect = imageRef.current.getBoundingClientRect();
      const x = (e.clientX - imageRect.left) / previewScale;
      const y = (e.clientY - imageRect.top) / previewScale;

      if (dragType === "move") {
        updateCropArea({ x: x - dragStart.x, y: y - dragStart.y });
      } else if (dragType === "resize" && resizeHandle) {
        const newArea = { ...cropArea };
        switch (resizeHandle) {
          case "nw":
            newArea.width = cropArea.width + (cropArea.x - x);
            newArea.height = cropArea.height + (cropArea.y - y);
            newArea.x = x;
            newArea.y = y;
            break;
          case "ne":
            newArea.width = x - cropArea.x;
            newArea.height = cropArea.height + (cropArea.y - y);
            newArea.y = y;
            break;
          case "sw":
            newArea.width = cropArea.width + (cropArea.x - x);
            newArea.height = y - cropArea.y;
            newArea.x = x;
            break;
          case "se":
            newArea.width = x - cropArea.x;
            newArea.height = y - cropArea.y;
            break;
        }
        updateCropArea(newArea);
      }
    } else if (isPanning) {
      setViewportPosition({
        x: panStartPosition.x + (e.clientX - dragStart.x),
        y: panStartPosition.y + (e.clientY - dragStart.y),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragType(null);
    setResizeHandle(null);
    setIsPanning(false);
    setPanStartPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current || !imageRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(10, previewScale * zoomFactor));

    if (newScale !== previewScale) {
      const imageRect = imageRef.current.getBoundingClientRect();
      const offsetX = mouseX - imageRect.width / 2;
      const offsetY = mouseY - imageRect.height / 2;
      const scaleChange = newScale / previewScale;
      setPreviewScale(newScale);
      setViewportPosition({
        x: viewportPosition.x - offsetX * (scaleChange - 1),
        y: viewportPosition.y - offsetY * (scaleChange - 1),
      });
    }
  };

  const getDistance = (t1: React.Touch, t2: React.Touch) =>
    Math.sqrt((t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setTouchStartDistance(getDistance(e.touches[0], e.touches[1]));
      setTouchStartScale(previewScale);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const distance = getDistance(e.touches[0], e.touches[1]);
    const newScale = Math.max(0.1, Math.min(10, (distance / touchStartDistance) * touchStartScale));

    if (newScale !== previewScale && containerRef.current && imageRef.current) {
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const containerRect = containerRef.current.getBoundingClientRect();
      const imageRect = imageRef.current.getBoundingClientRect();
      const offsetX = centerX - containerRect.left - imageRect.width / 2;
      const offsetY = centerY - containerRect.top - imageRect.height / 2;
      const scaleChange = newScale / previewScale;
      setPreviewScale(newScale);
      setViewportPosition({
        x: viewportPosition.x - offsetX * (scaleChange - 1),
        y: viewportPosition.y - offsetY * (scaleChange - 1),
      });
    }
  };

  // ─── Preset / size handlers ───

  const handlePresetSelect = (preset: PresetSize) => {
    setCustomWidth(preset.width);
    setCustomHeight(preset.height);
    setAspectRatio(preset.ratio);
    setLockAspectRatio(true);

    const newWidth = Math.min(cropArea.width, imageSize.width - cropArea.x);
    const newCrop = { ...cropArea, width: newWidth, height: newWidth / preset.ratio };
    updateCropArea(newCrop);
    setBaseCropArea(newCrop);
  };

  const handleCropScaleChange = (scale: number) => {
    setCropScale(scale);
    const newWidth = Math.min(baseCropArea.width * scale, imageSize.width);
    const newHeight =
      lockAspectRatio && aspectRatio
        ? newWidth / aspectRatio
        : Math.min(baseCropArea.height * scale, imageSize.height);
    const centerX = baseCropArea.x + baseCropArea.width / 2;
    const centerY = baseCropArea.y + baseCropArea.height / 2;
    updateCropArea({
      x: Math.max(0, Math.min(centerX - newWidth / 2, imageSize.width - newWidth)),
      y: Math.max(0, Math.min(centerY - newHeight / 2, imageSize.height - newHeight)),
      width: newWidth,
      height: newHeight,
    });
  };

  const handleCustomSizeChange = (field: "width" | "height", value: number) => {
    if (field === "width") {
      setCustomWidth(value);
      if (lockAspectRatio && aspectRatio) setCustomHeight(value / aspectRatio);
    } else {
      setCustomHeight(value);
      if (lockAspectRatio && aspectRatio) setCustomWidth(value * aspectRatio);
    }
  };

  // ─── Save ───

  const processCroppedImage = async (): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = imageRef.current;
      if (!img || !img.complete) {
        reject(new Error("Image not loaded"));
        return;
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      canvas.width = customWidth;
      canvas.height = customHeight;

      const imageRect = imageRef.current!.getBoundingClientRect();
      const scaleX = imageSize.width / imageRect.width;
      const scaleY = imageSize.height / imageRect.height;

      ctx.drawImage(
        img,
        cropArea.x * scaleX,
        cropArea.y * scaleY,
        cropArea.width * scaleX,
        cropArea.height * scaleY,
        0,
        0,
        customWidth,
        customHeight
      );

      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error("Failed to create image blob"));
            return;
          }
          const baseName =
            versionName.trim() ||
            `${media.metadata?.title || media.id}-${customWidth}x${customHeight}`;
          const finalName =
            saveMode === "new"
              ? `${baseName}-${Date.now()}.${imageFormat}`
              : `${baseName}.${imageFormat}`;
          resolve(new File([blob], finalName, { type: `image/${imageFormat}` }));
        },
        `image/${imageFormat}`,
        imageQuality / 100
      );
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const croppedFile = await processCroppedImage();

      const geturl = await GetSignedUrl();
      const signedURL = (geturl as any)?.result?.uploadURL;
      if (!signedURL) throw new Error("Failed to get upload URL");

      const uploadResult = await SaveMedia(croppedFile, signedURL);
      if (!(uploadResult as any)?.result?.id) throw new Error("Failed to upload image to CDN");

      let finalMediaId = (uploadResult as any).result.id;

      if (saveMode === "override") {
        try {
          await DeleteMedia(media.id, settings);
        } catch {}
      }

      const croppedImage = {
        ...media,
        id: saveMode === "new" ? finalMediaId : media.id,
        metadata: {
          ...media.metadata,
          title:
            versionName.trim() ||
            `${media.metadata?.title || media.id} (${customWidth}x${customHeight})`,
          versionName: versionName.trim() || `${customWidth}x${customHeight}`,
          cropArea,
          customWidth,
          customHeight,
          aspectRatio,
          isVariant: saveMode === "new",
          parentId: saveMode === "new" ? media.id : undefined,
          dimensions: {
            width: customWidth,
            height: customHeight,
            aspectRatio: customWidth / customHeight,
          },
          ...(saveMode === "override" && {
            originalFileReplaced: true,
            replacedAt: new Date().toISOString(),
            originalDimensions: media.metadata?.dimensions,
            newCdnId: finalMediaId,
          }),
        },
      };

      onSave(croppedImage);
      setSaveSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save image");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Effects ───

  useEffect(() => {
    const up = () => setIsDragging(false);
    document.addEventListener("mouseup", up);
    return () => document.removeEventListener("mouseup", up);
  }, []);

  return {
    // Crop
    cropArea,
    imageSize,
    aspectRatio,
    lockAspectRatio,
    customWidth,
    customHeight,
    cropScale,
    baseCropArea,
    setLockAspectRatio,
    setAspectRatio,
    updateCropArea,
    handleImageLoad,
    handlePresetSelect,
    handleCropScaleChange,
    handleCustomSizeChange,
    // Viewport
    previewScale,
    setPreviewScale,
    viewportPosition,
    setViewportPosition,
    isPanning,
    // Drag
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    // Save
    saveMode,
    setSaveMode,
    isSaving,
    saveError,
    setSaveError,
    saveSuccess,
    handleSave,
    // Export
    imageFormat,
    setImageFormat,
    imageQuality,
    setImageQuality,
    versionName,
    setVersionName,
    // Refs
    imageRef,
    containerRef,
    // Image
    getImageUrl,
  };
}

export type UseImageCropReturn = ReturnType<typeof useImageCrop>;
