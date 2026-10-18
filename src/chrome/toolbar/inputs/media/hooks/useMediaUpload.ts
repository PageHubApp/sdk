import { useEffect, useRef, useState } from "react";
import { getCdnUrl } from "@/utils/cdn";
import { getImageDimensionsFromUrl } from "@/utils/imageDimensions";
import { getMediaLibraryStore, type MediaLibrary } from "@/utils/media/libraryStore";
import type { MediaItem } from "@/utils/media/libraryTypes";
import { getUploadAccept, MediaUploadError, uploadImageToCdn } from "@/utils/media/upload";
import { useSDK } from "@/core/context";
import { useImageDrop } from "@/chrome/hooks/useImageDrop";
import { getSiteId } from "@/utils/page/pageNavigation";
import { cleanSvg, type AddMode, type UploadProgress } from "../utils/media-helpers";
import { registerUploadedMedia, uploadedMediaItem } from "../utils/registerUpload";
import { sdkLog } from "../../../../../utils/logger";

interface UseMediaUploadOptions {
  isOpen: boolean;
  library: MediaLibrary;
}

/** Dimensions of an image at `url`, or nothing when it can't be probed. */
const probeDimensions = async (url: string) => {
  try {
    const { width, height, aspectRatio } = await getImageDimensionsFromUrl(url);
    return { dimensions: { width, height, aspectRatio } };
  } catch {
    return {};
  }
};

export function useMediaUpload({ isOpen, library }: UseMediaUploadOptions) {
  const { config, save: sdkSave } = useSDK();

  /** Ensure the current page has been persisted (has a `_id` + URL) before
   *  attaching media. On `/build` (brand new page), this triggers the host
   *  app's save flow so the resulting URL update + page record exist before
   *  we mutate `pageMedia`. No-op when already saved. Concurrent callers
   *  (e.g. multi-file upload, upload while paste pending) share one in-flight
   *  promise so we don't fire `emit("save")` multiple times in parallel. */
  const ensureSavedPage = async () => {
    // A host library store is site-scoped: the site exists by construction.
    if (getMediaLibraryStore() || getSiteId()) return;
    // Coordinator already coalesces concurrent callers — no need for a
    // local in-flight ref. Just await the result.
    try {
      await sdkSave({ isDraft: true });
    } catch (e) {
      if (getSiteId()) return;
      sdkLog.warn("[MediaManager] page save before upload failed:", e);
      throw e;
    }
    if (!getSiteId()) {
      throw new Error("Site is not saved yet. Please wait for save to finish, then retry upload.");
    }
  };

  // ─── Upload state ───
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [replacingMedia, setReplacingMedia] = useState<string | null>(null);

  // ─── Input mode state ───
  const [addMode, setAddMode] = useState<AddMode>("upload");
  const [urlInput, setUrlInput] = useState("");
  const [svgInput, setSvgInput] = useState("");
  const [saveUrlToCdn, setSaveUrlToCdn] = useState(false);
  const [hasImageInClipboard, setHasImageInClipboard] = useState(false);

  // ─── Refs ───
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // ─── Shared helpers ───

  /** Put a freshly uploaded file into the library (see `registerUploadedMedia`). */
  const addUploaded = (result: Parameters<typeof uploadedMediaItem>[0], source: string) =>
    registerUploadedMedia(library, uploadedMediaItem(result, { source }));

  // ─── Upload handler ───

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);
    setUploadProgress({ current: 0, total: files.length, currentFile: "", completedFiles: [] });

    await ensureSavedPage();

    const failedFiles: Array<{ name: string; error: string }> = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => (prev ? { ...prev, current: i, currentFile: file.name } : null));

        try {
          const result = await uploadImageToCdn(file);

          setUploadProgress(prev =>
            prev ? { ...prev, completedFiles: [...prev.completedFiles, file.name] } : null
          );

          await addUploaded(result, "upload");
        } catch (error: unknown) {
          const message =
            error instanceof MediaUploadError ? error.message : (error as Error)?.message;
          failedFiles.push({ name: file.name, error: message || "Unknown error" });
        }
      }

      if (failedFiles.length > 0) {
        const errorMessage =
          failedFiles.length === 1
            ? `Failed to upload ${failedFiles[0].name}: ${failedFiles[0].error}`
            : `Failed to upload ${failedFiles.length} file(s):\n${failedFiles.map(f => `• ${f.name}: ${f.error}`).join("\n")}`;
        setUploadError(errorMessage);
      }
    } catch (error: unknown) {
      setUploadError((error as Error).message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleReplaceMedia = async (files: FileList | null) => {
    if (!files || files.length === 0 || !replacingMedia) return;
    setUploading(true);
    setUploadProgress({ current: 0, total: 1, currentFile: files[0].name, completedFiles: [] });

    await ensureSavedPage();

    try {
      const file = files[0];
      const {
        mediaId: newMediaId,
        file: uploaded,
        destination,
        deliveryURL,
      } = await uploadImageToCdn(file);

      // Trust the destination — the replacement was really uploaded there, so
      // type must follow. Fields that belong to the previous type are cleared
      // (`undefined` = remove) so renderers can't pick them up (e.g.
      // `metadata.svg` after SVG → raster replace).
      await library.update(replacingMedia, {
        cdnId: newMediaId,
        type: destination === "r2" ? "r2" : "cdn",
        metadata: {
          title: uploaded.name,
          size: uploaded.size,
          ...(uploaded.type ? { contentType: uploaded.type } : {}),
          svg: undefined,
          url: undefined,
          deliveryURL: destination === "r2" ? deliveryURL : undefined,
        },
      });

      setReplacingMedia(null);
    } catch (error) {
      const message = error instanceof MediaUploadError ? error.message : (error as Error)?.message;
      setUploadError(`Replace failed: ${message || "Unknown error"}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // ─── URL / SVG handlers ───

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    setUploading(true);
    setUploadProgress({ current: 0, total: 1, currentFile: urlInput, completedFiles: [] });

    await ensureSavedPage();

    try {
      if (saveUrlToCdn) {
        const apiUrl = config.apiBaseUrl || "";
        const response = await fetch(`${apiUrl}/api/download-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: urlInput, saveToCdn: true }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to download image");
        }

        const result = await response.json();
        const mediaId = result.mediaId;
        const imageUrl = getCdnUrl(mediaId, { width: 800, format: "auto" });
        await registerUploadedMedia(library, {
          id: mediaId,
          type: "cdn",
          uploadedAt: Date.now(),
          metadata: {
            title: result.filename,
            alt: result.filename.replace(/\.[^/.]+$/, ""),
            size: result.size,
            originalUrl: urlInput,
            ...(await probeDimensions(imageUrl)),
          },
        });
      } else {
        const item: MediaItem = {
          id: `url-${Date.now()}`,
          type: "url",
          uploadedAt: Date.now(),
          metadata: {
            title: urlInput.split("/").pop() || urlInput,
            url: urlInput,
            ...(await probeDimensions(urlInput)),
          },
        };
        await library.add([item]);
      }

      setUrlInput("");
      setSaveUrlToCdn(false);
      setAddMode("upload");
    } catch (error: unknown) {
      setUploadError(`Couldn't add that URL: ${(error as Error).message}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleAddSvg = async () => {
    if (!svgInput.trim()) return;
    setUploading(true);
    setUploadProgress({ current: 0, total: 1, currentFile: "SVG Image", completedFiles: [] });

    await ensureSavedPage();

    try {
      const cleanedSvg = cleanSvg(svgInput);
      const svgSize = new Blob([cleanedSvg]).size;
      await library.add([
        {
          id: `svg-${Date.now()}`,
          type: "svg",
          uploadedAt: Date.now(),
          metadata: { title: "SVG Image", svg: cleanedSvg, size: svgSize },
        },
      ]);
      setSvgInput("");
      setAddMode("upload");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // ─── Paste handling ───

  const checkClipboardForImages = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      setHasImageInClipboard(
        clipboardItems.some(item => item.types.some(type => type.startsWith("image/")))
      );
    } catch {
      setHasImageInClipboard(false);
    }
  };

  const handlePaste = async (e: ClipboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        setUploading(true);
        setUploadProgress({
          current: 0,
          total: 1,
          currentFile: file.name || "Pasted image",
          completedFiles: [],
        });

        await ensureSavedPage();

        try {
          await addUploaded(await uploadImageToCdn(file), "paste");
        } catch (error: unknown) {
          const message =
            error instanceof MediaUploadError ? error.message : (error as Error)?.message;
          setUploadError(`Couldn't upload the pasted image: ${message}`);
        } finally {
          setUploading(false);
          setUploadProgress(null);
        }
        break;
      }
    }
  };

  const handlePasteClick = async () => {
    if (!hasImageInClipboard) return;

    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith("image/")) {
            const blob = await clipboardItem.getType(type);
            const file = new File([blob], `pasted-image-${Date.now()}.${type.split("/")[1]}`, {
              type,
            });

            setUploading(true);
            await ensureSavedPage();
            try {
              await addUploaded(await uploadImageToCdn(file), "paste");
            } catch (error: unknown) {
              const message =
                error instanceof MediaUploadError ? error.message : (error as Error)?.message;
              setUploadError(`Couldn't upload the pasted image: ${message}`);
            } finally {
              setUploading(false);
            }
            return;
          }
        }
      }
    } catch {
      setUploadError("Couldn't read the clipboard. Try pasting with Ctrl+V / Cmd+V instead.");
    }
  };

  // ─── Drag-and-drop ───

  const { isDragOver, dropProps } = useImageDrop({
    onFiles: (files: File[]) => {
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));
      handleUpload(dt.files);
    },
    accept: getUploadAccept(),
  });

  // ─── Effects ───

  // Register/cleanup paste listener
  useEffect(() => {
    if (isOpen) {
      checkClipboardForImages();
      document.addEventListener("paste", handlePaste);
    }
    return () => document.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  // Close add mode on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as Element)?.closest("[data-ai-login-modal]")) return;
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        if (addMode === "url" || addMode === "svg") {
          setAddMode("upload");
        }
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, addMode]);

  return {
    // State
    uploading,
    uploadProgress,
    uploadError,
    addMode,
    urlInput,
    svgInput,
    saveUrlToCdn,
    hasImageInClipboard,
    isDragOver,
    dropProps,
    replacingMedia,
    // Setters
    setAddMode,
    setUrlInput,
    setSvgInput,
    setSaveUrlToCdn,
    setUploading,
    setUploadError,
    setReplacingMedia,
    // Handlers
    handleUpload,
    handleReplaceMedia,
    handleAddUrl,
    handleAddSvg,
    handlePasteClick,
    // Refs
    fileInputRef,
    replaceInputRef,
    toolbarRef,
  };
}

export type UseMediaUploadReturn = ReturnType<typeof useMediaUpload>;
