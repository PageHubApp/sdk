import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { getCdnUrl } from "@/utils/cdn";
import { getImageDimensionsFromFile, getImageDimensionsFromUrl } from "@/utils/imageDimensions";
import { registerMediaWithBackground } from "@/utils/lib";
import { getUploadAccept, MediaUploadError, uploadImageToCdn } from "@/utils/media/upload";
import { useSDK } from "@/core/context";
import { useImageDrop } from "@/chrome/hooks/useImageDrop";
import { getSiteId } from "@/utils/pageNavigation";
import { saveAndWait } from "@/utils/saveAndWait";
import {
  cleanSvg,
  type AddMode,
  type MediaItem,
  type UploadProgress,
} from "../utils/media-helpers";

interface UseMediaUploadOptions {
  isOpen: boolean;
  refreshMediaList: () => void;
  generateMetadataForImage: (mediaId: string, imageUrl: string) => void;
}

export function useMediaUpload({
  isOpen,
  refreshMediaList,
  generateMetadataForImage,
}: UseMediaUploadOptions) {
  const { query, actions } = useEditor();
  const { config, emitter } = useSDK();

  /** Ensure the current page has been persisted (has a `_id` + URL) before
   *  attaching media. On `/build` (brand new page), this triggers the host
   *  app's save flow so the resulting URL update + page record exist before
   *  we mutate `pageMedia`. No-op when already saved. Concurrent callers
   *  (e.g. multi-file upload, upload while paste pending) share one in-flight
   *  promise so we don't fire `emit("save")` multiple times in parallel. */
  const ensureSavePromiseRef = useRef<Promise<void> | null>(null);
  const ensureSavedPage = async () => {
    if (getSiteId()) return;
    if (!ensureSavePromiseRef.current) {
      ensureSavePromiseRef.current = saveAndWait(emitter)
        .catch(e => {
          if (getSiteId()) return;
          console.warn("[MediaManager] page save before upload failed:", e);
          throw e;
        })
        .finally(() => {
          ensureSavePromiseRef.current = null;
        });
    }
    await ensureSavePromiseRef.current;
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

  /** Register uploaded media and attach metadata (dimensions, title, alt).
   *
   *  Image uploads (CF Images, `destination: "cf-images"`) go through the
   *  classic pageMedia path with `type: "cdn"`, extract dimensions, and
   *  kick off AI metadata generation.
   *
   *  R2 uploads (video/audio/pdf/etc) register with `type: "r2"` and stash
   *  the `deliveryURL` + `contentType` in metadata so render sites don't
   *  need to re-derive the URL or sniff the file type. No dimension probe
   *  (would fail on non-images) and no AI metadata (vision model doesn't
   *  analyze MP4s). */
  const registerUploadedMedia = async (
    mediaId: string,
    file: File,
    source: string,
    destination: "cf-images" | "r2" = "cf-images",
    deliveryURL?: string
  ) => {
    if (destination === "r2") {
      registerMediaWithBackground(query, actions, mediaId, "r2", "media-manager");
      actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
        const pageMedia = (props.pageMedia || []) as MediaItem[];
        const existingMedia = pageMedia.find(m => m.id === mediaId);
        if (existingMedia) {
          existingMedia.metadata = {
            ...existingMedia.metadata,
            title: file.name || mediaId,
            alt: file.name?.replace(/\.[^/.]+$/, "") || mediaId,
            size: file.size,
            source,
            contentType: file.type,
            deliveryURL,
          };
        }
      });
      return;
    }

    registerMediaWithBackground(query, actions, mediaId, "cdn", "media-manager");

    try {
      const dimensions = await getImageDimensionsFromFile(file);
      actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
        const pageMedia = (props.pageMedia || []) as MediaItem[];
        const existingMedia = pageMedia.find(m => m.id === mediaId);
        if (existingMedia) {
          existingMedia.metadata = {
            ...existingMedia.metadata,
            title: file.name || "Pasted Image",
            alt: file.name?.replace(/\.[^/.]+$/, "") || "Pasted Image",
            size: file.size,
            source,
            dimensions: {
              width: dimensions.width,
              height: dimensions.height,
              aspectRatio: dimensions.aspectRatio,
            },
          };
        }
      });
    } catch {
      actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
        const pageMedia = (props.pageMedia || []) as MediaItem[];
        const existingMedia = pageMedia.find(m => m.id === mediaId);
        if (existingMedia) {
          existingMedia.metadata = {
            ...existingMedia.metadata,
            title: file.name || "Pasted Image",
            alt: file.name?.replace(/\.[^/.]+$/, "") || "Pasted Image",
            size: file.size,
            source,
          };
        }
      });
    }

    const imageUrl = getCdnUrl(mediaId, { width: 800, format: "auto" });
    generateMetadataForImage(mediaId, imageUrl);
  };

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
          const { mediaId, file: uploadedFile, destination, deliveryURL } =
            await uploadImageToCdn(file);

          setUploadProgress(prev =>
            prev ? { ...prev, completedFiles: [...prev.completedFiles, file.name] } : null
          );

          await registerUploadedMedia(mediaId, uploadedFile, "upload", destination, deliveryURL);
        } catch (error: unknown) {
          const message =
            error instanceof MediaUploadError ? error.message : (error as Error)?.message;
          failedFiles.push({ name: file.name, error: message || "Unknown error" });
        }
      }

      refreshMediaList();

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
      const { mediaId: newMediaId, file: uploaded, destination, deliveryURL } =
        await uploadImageToCdn(file);

      actions.setProp("ROOT", (props: Record<string, unknown>) => {
        const pageMedia = props.pageMedia as MediaItem[] | undefined;
        if (!pageMedia) return;
        const mediaItem = pageMedia.find(m => m.id === replacingMedia);
        if (mediaItem) {
          // Trust the destination — the replacement was really uploaded
          // there, so type must follow. Previous type ("svg" / "url" /
          // "cdn") is stale the moment the new file lands.
          const nextType: MediaItem["type"] = destination === "r2" ? "r2" : "cdn";
          mediaItem.cdnId = newMediaId;
          mediaItem.uploadedAt = Date.now();
          mediaItem.type = nextType;
          if (mediaItem.metadata) {
            mediaItem.metadata.title = uploaded.name;
            mediaItem.metadata.size = uploaded.size;
            mediaItem.metadata.contentType = uploaded.type || mediaItem.metadata.contentType;
            // Purge stale fields from the previous type so renderers don't
            // pick them up (e.g. `metadata.svg` after SVG → raster replace).
            delete mediaItem.metadata.svg;
            delete mediaItem.metadata.url;
            if (destination === "r2") {
              mediaItem.metadata.deliveryURL = deliveryURL;
            } else {
              delete mediaItem.metadata.deliveryURL;
            }
          }
        }
      });

      refreshMediaList();
      setReplacingMedia(null);
    } catch (error) {
      const message =
        error instanceof MediaUploadError ? error.message : (error as Error)?.message;
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
        registerMediaWithBackground(query, actions, mediaId, "cdn", "media-manager");

        try {
          const imageUrl = getCdnUrl(mediaId, { width: 800, format: "auto" });
          const dimensions = await getImageDimensionsFromUrl(imageUrl);

          actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
            const pageMedia = (props.pageMedia || []) as MediaItem[];
            const existingMedia = pageMedia.find(m => m.id === mediaId);
            if (existingMedia) {
              existingMedia.metadata = {
                ...existingMedia.metadata,
                title: result.filename,
                alt: result.filename.replace(/\.[^/.]+$/, ""),
                size: result.size,
                dimensions: {
                  width: dimensions.width,
                  height: dimensions.height,
                  aspectRatio: dimensions.aspectRatio,
                },
                originalUrl: urlInput,
              };
            }
          });
          generateMetadataForImage(mediaId, imageUrl);
        } catch {
          actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
            const pageMedia = (props.pageMedia || []) as MediaItem[];
            const existingMedia = pageMedia.find(m => m.id === mediaId);
            if (existingMedia) {
              existingMedia.metadata = {
                ...existingMedia.metadata,
                title: result.filename,
                alt: result.filename.replace(/\.[^/.]+$/, ""),
                size: result.size,
                originalUrl: urlInput,
              };
            }
          });
          const imageUrl = getCdnUrl(mediaId, { width: 800, format: "auto" });
          generateMetadataForImage(mediaId, imageUrl);
        }
      } else {
        const mediaId = `url-${Date.now()}`;
        registerMediaWithBackground(query, actions, mediaId, "url", "media-manager");

        try {
          const dimensions = await getImageDimensionsFromUrl(urlInput);
          actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
            const pageMedia = (props.pageMedia || []) as MediaItem[];
            const existingMedia = pageMedia.find(m => m.id === mediaId);
            if (existingMedia) {
              existingMedia.metadata = {
                ...existingMedia.metadata,
                title: urlInput.split("/").pop() || urlInput,
                url: urlInput,
                dimensions: {
                  width: dimensions.width,
                  height: dimensions.height,
                  aspectRatio: dimensions.aspectRatio,
                },
              };
            }
          });
          generateMetadataForImage(mediaId, urlInput);
        } catch {
          actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
            const pageMedia = (props.pageMedia || []) as MediaItem[];
            const existingMedia = pageMedia.find(m => m.id === mediaId);
            if (existingMedia) {
              existingMedia.metadata = {
                ...existingMedia.metadata,
                title: urlInput.split("/").pop() || urlInput,
                url: urlInput,
              };
            }
          });
          generateMetadataForImage(mediaId, urlInput);
        }
      }

      refreshMediaList();
      setUrlInput("");
      setSaveUrlToCdn(false);
      setAddMode("upload");
    } catch (error: unknown) {
      alert(`Failed to add URL: ${(error as Error).message}`);
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
      const mediaId = `svg-${Date.now()}`;
      registerMediaWithBackground(query, actions, mediaId, "svg", "media-manager");

      actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
        const pageMedia = (props.pageMedia || []) as MediaItem[];
        const existingMedia = pageMedia.find(m => m.id === mediaId);
        if (existingMedia) {
          existingMedia.metadata = {
            ...existingMedia.metadata,
            title: "SVG Image",
            svg: cleanedSvg,
            size: svgSize,
          };
        }
      });

      refreshMediaList();
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
          const { mediaId, file: uploaded } = await uploadImageToCdn(file);
          await registerUploadedMedia(mediaId, uploaded, "paste");
          refreshMediaList();
        } catch (error: unknown) {
          const message =
            error instanceof MediaUploadError ? error.message : (error as Error)?.message;
          alert(`Failed to upload pasted image: ${message}`);
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
              const { mediaId, file: uploaded } = await uploadImageToCdn(file);
              registerMediaWithBackground(query, actions, mediaId, "cdn", "media-manager");
              actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
                const pageMedia = (props.pageMedia || []) as MediaItem[];
                const existingMedia = pageMedia.find(m => m.id === mediaId);
                if (existingMedia) {
                  existingMedia.metadata = {
                    ...existingMedia.metadata,
                    title: uploaded.name,
                    alt: uploaded.name.replace(/\.[^/.]+$/, ""),
                    size: uploaded.size,
                    source: "paste",
                  };
                }
              });
              refreshMediaList();
            } catch (error: unknown) {
              const message =
                error instanceof MediaUploadError ? error.message : (error as Error)?.message;
              alert(`Failed to upload pasted image: ${message}`);
            } finally {
              setUploading(false);
            }
            return;
          }
        }
      }
    } catch {
      alert("Failed to access clipboard. Please try pasting with Ctrl+V / Cmd+V instead.");
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
        if (addMode === "url" || addMode === "svg" || addMode === "ai") {
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
