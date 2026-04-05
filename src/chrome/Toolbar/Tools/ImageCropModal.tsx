// @ts-nocheck
import { DeleteMedia, GetSignedUrl, SaveMedia } from "../../Viewport/lib";
import { motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { TbCheck, TbCrop, TbLoader2, TbLock, TbLockOpen, TbX } from "react-icons/tb";
import { getCdnUrl } from "utils/cdn";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: any;
  onSave: (croppedImage: any) => void;
  settings?: any; // For CDN operations
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PRESET_SIZES = [
  { name: "Mobile Hero", width: 375, height: 667, ratio: 0.562 },
  { name: "Desktop Hero", width: 1920, height: 1080, ratio: 1.778 },
  { name: "Square", width: 400, height: 400, ratio: 1 },
  { name: "Instagram Post", width: 1080, height: 1080, ratio: 1 },
  { name: "Instagram Story", width: 1080, height: 1920, ratio: 0.562 },
  { name: "Facebook Cover", width: 1200, height: 630, ratio: 1.905 },
  { name: "Twitter Header", width: 1500, height: 500, ratio: 3 },
  { name: "LinkedIn Cover", width: 1584, height: 396, ratio: 4 },
];

export const ImageCropModal = ({
  isOpen,
  onClose,
  media,
  onSave,
  settings,
}: ImageCropModalProps) => {
  const [cropArea, setCropArea] = useState<CropArea>({
    x: 0,
    y: 0,
    width: 200,
    height: 200,
  });
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [lockAspectRatio, setLockAspectRatio] = useState(false);
  const [customWidth, setCustomWidth] = useState(400);
  const [customHeight, setCustomHeight] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragType, setDragType] = useState<"move" | "resize" | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [previewScale, setPreviewScale] = useState(1);
  const [saveMode, setSaveMode] = useState<"new" | "override">("new");
  const [cropScale, setCropScale] = useState(1);
  const [baseCropArea, setBaseCropArea] = useState<CropArea>({
    x: 0,
    y: 0,
    width: 200,
    height: 200,
  });
  const [viewportPosition, setViewportPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPosition, setPanStartPosition] = useState({ x: 0, y: 0 });
  const [touchStartDistance, setTouchStartDistance] = useState(0);
  const [touchStartScale, setTouchStartScale] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [imageFormat, setImageFormat] = useState<"png" | "webp" | "jpeg">("webp");
  const [imageQuality, setImageQuality] = useState(90);
  const [versionName, setVersionName] = useState("");
  const [showGrid, setShowGrid] = useState(false);
  const [showRuleOfThirds, setShowRuleOfThirds] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getImageUrl = () => {
    if (media.type === "url") return media.metadata?.url;
    if (media.type === "svg") return null;
    return getCdnUrl(media.cdnId || media.id, { width: 800, format: "auto" });
  };

  const ScaleControl = ({
    title,
    value,
    onChange,
    min = 0.1,
    max = 10,
    step = 0.1,
    presets = [0.5, 1, 2],
  }: {
    title: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    presets?: number[];
  }) => (
    <Card title={title}>
      <div className="mb-3 flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Scale:</span>
        <div className="relative flex-1">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted"
          />
        </div>
        <div className="min-w-12 rounded-md bg-primary/10 px-2 py-1 text-center text-sm font-semibold text-primary">
          {Math.round(value * 100)}%
        </div>
      </div>
      <div className="flex gap-2">
        {presets.map(preset => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            {Math.round(preset * 100)}%
          </button>
        ))}
      </div>
    </Card>
  );

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <div className="h-4 w-1 rounded-full bg-primary"></div>
        {title}
      </h3>
      <div className="rounded-lg border border-border/30 bg-background p-4">{children}</div>
    </div>
  );

  const updateCropArea = useCallback(
    (newArea: Partial<CropArea>) => {
      setCropArea(prev => {
        let updated = { ...prev, ...newArea };

        // Apply aspect ratio lock first
        if (lockAspectRatio && aspectRatio) {
          if (newArea.width !== undefined) {
            updated.height = updated.width / aspectRatio;
          } else if (newArea.height !== undefined) {
            updated.width = updated.height * aspectRatio;
          }
        }

        // Ensure crop area stays within image bounds
        updated.x = Math.max(0, Math.min(updated.x, imageSize.width - updated.width));
        updated.y = Math.max(0, Math.min(updated.y, imageSize.height - updated.height));
        updated.width = Math.max(50, Math.min(updated.width, imageSize.width - updated.x));
        updated.height = Math.max(50, Math.min(updated.height, imageSize.height - updated.y));

        // Re-apply aspect ratio after bounds checking
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
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setImageSize({ width: naturalWidth, height: naturalHeight });

      // Only set initial crop area if it hasn't been set yet
      if (cropArea.width === 0 && cropArea.height === 0) {
        const initialSize = Math.min(naturalWidth, naturalHeight) * 0.5;
        const initialCropArea = {
          x: (naturalWidth - initialSize) / 2,
          y: (naturalHeight - initialSize) / 2,
          width: initialSize,
          height: initialSize,
        };
        setCropArea(initialCropArea);
        setBaseCropArea(initialCropArea);
      }

      // Reset crop scale and viewport position when image loads
      setCropScale(1);
      setViewportPosition({ x: 0, y: 0 });
      setPanStartPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || !imageRef.current) return;

    const imageRect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - imageRect.left) / previewScale;
    const y = (e.clientY - imageRect.top) / previewScale;

    // Check if clicking on a resize handle
    const handleSize = 8; // Size of resize handles
    const isOnHandle = (handle: string) => {
      switch (handle) {
        case "nw":
          return (
            x >= cropArea.x - handleSize &&
            x <= cropArea.x + handleSize &&
            y >= cropArea.y - handleSize &&
            y <= cropArea.y + handleSize
          );
        case "ne":
          return (
            x >= cropArea.x + cropArea.width - handleSize &&
            x <= cropArea.x + cropArea.width + handleSize &&
            y >= cropArea.y - handleSize &&
            y <= cropArea.y + handleSize
          );
        case "sw":
          return (
            x >= cropArea.x - handleSize &&
            x <= cropArea.x + handleSize &&
            y >= cropArea.y + cropArea.height - handleSize &&
            y <= cropArea.y + cropArea.height + handleSize
          );
        case "se":
          return (
            x >= cropArea.x + cropArea.width - handleSize &&
            x <= cropArea.x + cropArea.width + handleSize &&
            y >= cropArea.y + cropArea.height - handleSize &&
            y <= cropArea.y + cropArea.height + handleSize
          );
        default:
          return false;
      }
    };

    // Check for resize handles first
    for (const handle of ["nw", "ne", "sw", "se"]) {
      if (isOnHandle(handle)) {
        setIsDragging(true);
        setDragType("resize");
        setResizeHandle(handle);
        setDragStart({ x, y });
        return;
      }
    }

    // Check if clicking inside crop area (move crop)
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
      // Clicking outside crop area - start viewport panning
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
        updateCropArea({
          x: x - dragStart.x,
          y: y - dragStart.y,
        });
      } else if (dragType === "resize" && resizeHandle) {
        // Handle resize based on which corner is being dragged
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
      // Handle viewport panning - calculate total offset from start
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setViewportPosition({
        x: panStartPosition.x + deltaX,
        y: panStartPosition.y + deltaY,
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

    // Get mouse position relative to the container
    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    // Calculate zoom factor (positive for zoom in, negative for zoom out)
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(10, previewScale * zoomFactor));

    if (newScale !== previewScale) {
      // Calculate the point under the mouse cursor in image coordinates
      const imageRect = imageRef.current.getBoundingClientRect();
      const imageCenterX = imageRect.width / 2;
      const imageCenterY = imageRect.height / 2;

      // Calculate offset from center
      const offsetX = mouseX - imageCenterX;
      const offsetY = mouseY - imageCenterY;

      // Calculate new viewport position to zoom at cursor
      const scaleChange = newScale / previewScale;
      const newViewportX = viewportPosition.x - offsetX * (scaleChange - 1);
      const newViewportY = viewportPosition.y - offsetY * (scaleChange - 1);

      setPreviewScale(newScale);
      setViewportPosition({ x: newViewportX, y: newViewportY });
    }
  };

  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getDistance(e.touches[0], e.touches[1]);
      setTouchStartDistance(distance);
      setTouchStartScale(previewScale);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getDistance(e.touches[0], e.touches[1]);
      const scale = (distance / touchStartDistance) * touchStartScale;
      const newScale = Math.max(0.1, Math.min(10, scale));

      if (newScale !== previewScale) {
        // Calculate center point between two touches
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const mouseX = centerX - containerRect.left;
          const mouseY = centerY - containerRect.top;

          if (imageRef.current) {
            const imageRect = imageRef.current.getBoundingClientRect();
            const imageCenterX = imageRect.width / 2;
            const imageCenterY = imageRect.height / 2;

            const offsetX = mouseX - imageCenterX;
            const offsetY = mouseY - imageCenterY;

            const scaleChange = newScale / previewScale;
            const newViewportX = viewportPosition.x - offsetX * (scaleChange - 1);
            const newViewportY = viewportPosition.y - offsetY * (scaleChange - 1);

            setPreviewScale(newScale);
            setViewportPosition({ x: newViewportX, y: newViewportY });
          }
        }
      }
    }
  };

  const handlePresetSelect = (preset: (typeof PRESET_SIZES)[0]) => {
    setCustomWidth(preset.width);
    setCustomHeight(preset.height);
    setAspectRatio(preset.ratio);
    setLockAspectRatio(true);

    // Update crop area to match preset ratio
    const newWidth = Math.min(cropArea.width, imageSize.width - cropArea.x);
    const newHeight = newWidth / preset.ratio;

    const newCropArea = {
      ...cropArea,
      width: newWidth,
      height: newHeight,
    };

    updateCropArea(newCropArea);
    setBaseCropArea(newCropArea);
  };

  const handleCropScaleChange = (scale: number) => {
    setCropScale(scale);

    // Scale from the base crop area to keep it stable
    const newWidth = Math.min(baseCropArea.width * scale, imageSize.width);
    const newHeight =
      lockAspectRatio && aspectRatio
        ? newWidth / aspectRatio
        : Math.min(baseCropArea.height * scale, imageSize.height);

    // Keep the center point of the base crop area fixed
    const centerX = baseCropArea.x + baseCropArea.width / 2;
    const centerY = baseCropArea.y + baseCropArea.height / 2;

    const newX = Math.max(0, Math.min(centerX - newWidth / 2, imageSize.width - newWidth));
    const newY = Math.max(0, Math.min(centerY - newHeight / 2, imageSize.height - newHeight));

    updateCropArea({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });
  };

  const handleCustomSizeChange = (field: "width" | "height", value: number) => {
    if (field === "width") {
      setCustomWidth(value);
      if (lockAspectRatio && aspectRatio) {
        setCustomHeight(value / aspectRatio);
      }
    } else {
      setCustomHeight(value);
      if (lockAspectRatio && aspectRatio) {
        setCustomWidth(value * aspectRatio);
      }
    }
  };

  // Process and crop the image using canvas
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

      // Set canvas size to the desired crop dimensions
      canvas.width = customWidth;
      canvas.height = customHeight;

      // Calculate source coordinates - convert from display coordinates to image coordinates
      const imageRect = imageRef.current.getBoundingClientRect();
      const scaleX = imageSize.width / imageRect.width;
      const scaleY = imageSize.height / imageRect.height;

      const sourceX = cropArea.x * scaleX;
      const sourceY = cropArea.y * scaleY;
      const sourceWidth = cropArea.width * scaleX;
      const sourceHeight = cropArea.height * scaleY;

      console.log("Canvas dimensions:", customWidth, "x", customHeight);
      console.log("Source coordinates:", sourceX, sourceY, sourceWidth, sourceHeight);
      console.log("Scale factors:", scaleX, scaleY);

      // Draw the cropped portion
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        customWidth,
        customHeight
      );

      // Convert to blob
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error("Failed to create image blob"));
            return;
          }

          // Create a File object with proper name
          const baseFileName =
            versionName.trim() ||
            `${media.metadata?.title || media.id}-${customWidth}x${customHeight}`;
          const finalFileName =
            saveMode === "new"
              ? `${baseFileName}-${Date.now()}.${imageFormat}`
              : `${baseFileName}.${imageFormat}`;

          const file = new File([blob], finalFileName, {
            type: `image/${imageFormat}`,
          });
          resolve(file);
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
      // Step 1: Process the cropped image
      console.log("🖼️ Processing cropped image...");
      console.log("Crop area:", cropArea);
      console.log("Image size:", imageSize);
      console.log("Custom dimensions:", customWidth, "x", customHeight);
      const croppedFile = await processCroppedImage();
      console.log("✅ Image processed successfully, file size:", croppedFile.size);

      // Step 2: Get signed URL for upload
      console.log("🔗 Getting signed URL...");
      const geturl = await GetSignedUrl();
      const signedURL = geturl?.result?.uploadURL;

      if (!signedURL) {
        throw new Error("Failed to get upload URL");
      }
      console.log("✅ Signed URL obtained");

      // Step 3: Upload to CDN
      console.log("📤 Uploading to CDN...");
      const uploadResult = await SaveMedia(croppedFile, signedURL);

      if (!uploadResult?.result?.id) {
        throw new Error("Failed to upload image to CDN");
      }
      console.log("✅ Image uploaded successfully:", uploadResult.result.id);

      // Step 4: Handle file replacement for override mode
      let finalMediaId = uploadResult.result.id;

      if (saveMode === "override") {
        console.log("🗑️ Deleting original file:", media.id);
        try {
          // Delete the original file from CDN
          await DeleteMedia(media.id, settings);
          console.log("✅ Original file deleted successfully");
        } catch (deleteError) {
          console.warn("⚠️ Failed to delete original file:", deleteError);
          // Continue anyway - the new file is uploaded
        }
      }

      // Step 5: Create media object
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
          // For override mode, track the replacement
          ...(saveMode === "override" && {
            originalFileReplaced: true,
            replacedAt: new Date().toISOString(),
            originalDimensions: media.metadata?.dimensions,
            newCdnId: finalMediaId,
          }),
        },
      };

      // Step 6: Call the parent save handler
      onSave(croppedImage);

      // Step 7: Show success and close
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("❌ Save failed:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save image");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-9999 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="relative mx-4 max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-lg border border-border bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
              <TbCrop className="text-lg text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Image Cropper</h2>
              <p className="text-sm font-medium text-muted-foreground">
                {media.metadata?.title || media.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Close"
          >
            <TbX className="text-lg" />
          </button>
        </div>

        <div className="relative flex h-full max-h-[calc(90vh-120px)] flex-col lg:flex-row">
          {/* Left Panel - Controls */}
          <div className="scrollbar w-full overflow-y-auto border-border bg-linear-to-b from-muted/20 to-muted/40 p-4 pb-20 sm:w-64 md:w-72 lg:w-80 lg:border-r lg:p-6">
            <div className="space-y-6">
              {/* Preset Sizes */}
              <Card title="Aspect Ratios">
                <div className="scrollbar grid h-32 grid-cols-2 gap-2 overflow-y-auto">
                  {PRESET_SIZES.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => handlePresetSelect(preset)}
                      className="group rounded-lg border border-border bg-background p-2 text-left text-xs transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                    >
                      <div className="font-semibold text-foreground transition-colors group-hover:text-primary">
                        {preset.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {preset.width} × {preset.height}
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
              {/* Custom Size */}
              <Card title="Dimensions">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Width
                    </label>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={e => handleCustomSizeChange("width", parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                      placeholder="Width"
                    />
                  </div>
                  <button
                    onClick={() => setLockAspectRatio(!lockAspectRatio)}
                    className={`rounded-lg p-2 transition-all duration-200 ${
                      lockAspectRatio
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    }`}
                    title={lockAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
                  >
                    {lockAspectRatio ? (
                      <TbLock className="size-4" />
                    ) : (
                      <TbLockOpen className="size-4" />
                    )}
                  </button>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Height
                    </label>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={e =>
                        handleCustomSizeChange("height", parseInt(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                      placeholder="Height"
                    />
                  </div>
                </div>
              </Card>

              {/* Crop Scale */}
              <ScaleControl
                title="Crop Size"
                value={cropScale}
                onChange={handleCropScaleChange}
                min={0.1}
                max={3}
                presets={[0.5, 1, 2]}
              />

              {/* Zoom Control */}
              <ScaleControl
                title="Zoom"
                value={previewScale}
                onChange={value => {
                  setPreviewScale(value);
                  setViewportPosition({ x: 0, y: 0 }); // Reset viewport when zooming
                }}
                min={0.1}
                max={10}
                presets={[0.5, 1, 2]}
              />

              {/* Export Settings */}
              <Card title="Export Settings">
                {/* Version Name */}
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Version Name
                  </label>
                  <input
                    type="text"
                    value={versionName}
                    onChange={e => setVersionName(e.target.value)}
                    placeholder={`${customWidth}x${customHeight} crop`}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>

                {/* Format Selection */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-foreground">Format</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { value: "webp", label: "WebP", desc: "Best" },
                      { value: "png", label: "PNG", desc: "Lossless" },
                      { value: "jpeg", label: "JPEG", desc: "Universal" },
                    ].map(format => (
                      <button
                        key={format.value}
                        onClick={() => setImageFormat(format.value as any)}
                        className={`rounded-lg p-1.5 text-xs font-medium transition-colors ${
                          imageFormat === format.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        <div className="text-xs font-semibold">{format.label}</div>
                        <div className="text-xs opacity-70">{format.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality Slider */}
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">Quality:</span>
                    <div className="relative flex-1">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={imageQuality}
                        onChange={e => setImageQuality(parseInt(e.target.value))}
                        className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted"
                      />
                    </div>
                    <div className="min-w-12 rounded-md bg-primary/10 px-2 py-1 text-center text-sm font-semibold text-primary">
                      {imageQuality}%
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[50, 75, 90, 100].map(preset => (
                      <button
                        key={preset}
                        onClick={() => setImageQuality(preset)}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          imageQuality === preset
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Panel - Image Preview */}
          <div className="relative min-h-[400px] flex-1 p-4 lg:min-h-0 lg:p-6">
            <div className="flex h-full flex-col">
              <div
                className="relative flex flex-1 cursor-grab select-none items-center justify-center overflow-hidden"
                style={{
                  cursor: isPanning ? "grabbing" : "grab",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onDragStart={e => e.preventDefault()}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
              >
                <div
                  ref={containerRef}
                  className="relative"
                  style={{
                    transform: `scale(${previewScale})`,
                    transformOrigin: "center",
                  }}
                >
                  {getImageUrl() && (
                    <div
                      className="relative inline-block"
                      style={{
                        transform: `translate(${viewportPosition.x}px, ${viewportPosition.y}px)`,
                      }}
                    >
                      <div
                        className="relative size-full"
                        style={{ width: imageSize.width || 400, height: imageSize.height || 400 }}
                      >
                        <Image
                          ref={imageRef}
                          src={getImageUrl()}
                          alt="Crop preview"
                          fill
                          className="object-contain"
                          draggable={false}
                          onLoad={handleImageLoad}
                          onDragStart={e => e.preventDefault()}
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                          crossOrigin="anonymous"
                        />
                      </div>

                      {/* Dark overlay outside crop area - like real photo editors */}
                      {imageSize.width > 0 && (
                        <div
                          className="pointer-events-none absolute"
                          style={{
                            left: 0,
                            top: 0,
                            width: imageSize.width,
                            height: imageSize.height,
                            background: `linear-gradient(to right, 
                              rgba(0,0,0,0.5) 0%, 
                              rgba(0,0,0,0.5) ${cropArea.x}px, 
                              transparent ${cropArea.x}px, 
                              transparent ${cropArea.x + cropArea.width}px, 
                              rgba(0,0,0,0.5) ${cropArea.x + cropArea.width}px, 
                              rgba(0,0,0,0.5) 100%
                            ),
                            linear-gradient(to bottom, 
                              rgba(0,0,0,0.5) 0%, 
                              rgba(0,0,0,0.5) ${cropArea.y}px, 
                              transparent ${cropArea.y}px, 
                              transparent ${cropArea.y + cropArea.height}px, 
                              rgba(0,0,0,0.5) ${cropArea.y + cropArea.height}px, 
                              rgba(0,0,0,0.5) 100%
                            )`,
                          }}
                        />
                      )}

                      {/* Crop Overlay - positioned to match the actual image */}
                      {imageSize.width > 0 && (
                        <div
                          className="pointer-events-none absolute border-2 border-white bg-transparent shadow-lg"
                          style={{
                            left: cropArea.x,
                            top: cropArea.y,
                            width: cropArea.width,
                            height: cropArea.height,
                          }}
                        >
                          {/* Corner handles with proper cursors */}
                          <div
                            className="pointer-events-auto absolute -left-1 -top-1 size-3 cursor-nw-resize rounded-full border-2 border-gray-800 bg-white shadow-lg transition-transform hover:scale-110"
                            title="Resize from top-left"
                          />
                          <div
                            className="pointer-events-auto absolute -right-1 -top-1 size-3 cursor-ne-resize rounded-full border-2 border-gray-800 bg-white shadow-lg transition-transform hover:scale-110"
                            title="Resize from top-right"
                          />
                          <div
                            className="pointer-events-auto absolute -bottom-1 -left-1 size-3 cursor-sw-resize rounded-full border-2 border-gray-800 bg-white shadow-lg transition-transform hover:scale-110"
                            title="Resize from bottom-left"
                          />
                          <div
                            className="pointer-events-auto absolute -bottom-1 -right-1 size-3 cursor-se-resize rounded-full border-2 border-gray-800 bg-white shadow-lg transition-transform hover:scale-110"
                            title="Resize from bottom-right"
                          />

                          {/* Edge handles for more precise control */}
                          <div
                            className="pointer-events-auto absolute -top-1 left-1/2 h-3 w-2 -translate-x-1/2 cursor-n-resize rounded-full border-2 border-gray-800 bg-white shadow-lg transition-transform hover:scale-110"
                            title="Resize from top"
                          />
                          <div
                            className="pointer-events-auto absolute -bottom-1 left-1/2 h-3 w-2 -translate-x-1/2 cursor-s-resize rounded-full border-2 border-gray-800 bg-white shadow-lg transition-transform hover:scale-110"
                            title="Resize from bottom"
                          />
                          <div
                            className="pointer-events-auto absolute -left-1 top-1/2 h-2 w-3 -translate-y-1/2 cursor-w-resize rounded-full border-2 border-gray-800 bg-white shadow-lg transition-transform hover:scale-110"
                            title="Resize from left"
                          />
                          <div
                            className="pointer-events-auto absolute -right-1 top-1/2 h-2 w-3 -translate-y-1/2 cursor-e-resize rounded-full border-2 border-gray-800 bg-white shadow-lg transition-transform hover:scale-110"
                            title="Resize from right"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {saveError && (
              <div className="absolute inset-x-6 top-6 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <div className="flex items-center gap-2">
                  <TbX className="size-4" />
                  <span className="font-medium">Save Failed</span>
                </div>
                <p className="mt-1 text-destructive/80">{saveError}</p>
                <button
                  onClick={() => setSaveError(null)}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {saveSuccess && (
              <div className="absolute inset-x-6 top-6 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-600">
                <div className="flex items-center gap-2">
                  <TbCheck className="size-4" />
                  <span className="font-medium">Success!</span>
                </div>
                <p className="mt-1 text-green-600/80">
                  {saveMode === "override"
                    ? `Image cropped and original file replaced on CDN (${imageFormat.toUpperCase()}, ${imageQuality}% quality)`
                    : `Image cropped and saved as new variant on CDN (${imageFormat.toUpperCase()}, ${imageQuality}% quality)`}
                </p>
              </div>
            )}

            {/* Save Area - Absolutely positioned at bottom */}
            <div className="absolute bottom-3 right-3 rounded-lg border border-border bg-background/95 px-3 py-1.5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    Override original
                    <input
                      type="checkbox"
                      checked={saveMode === "override"}
                      onChange={e => setSaveMode(e.target.checked ? "override" : "new")}
                      className="size-4 rounded border-border bg-muted text-accent focus:ring-ring"
                    />
                  </label>
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
                    isSaving
                      ? "cursor-not-allowed bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {isSaving ? (
                    <>
                      <TbLoader2 className="animate-spin" />
                      Processing...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <TbCheck />
                      Saved!
                    </>
                  ) : (
                    <>{saveMode === "new" ? "Save as New Variant" : "Override Original"}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
};
