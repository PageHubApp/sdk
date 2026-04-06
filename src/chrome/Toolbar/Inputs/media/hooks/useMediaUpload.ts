import { ROOT_NODE, useEditor } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { getCdnUrl } from "utils/cdn";
import { getImageDimensionsFromFile, getImageDimensionsFromUrl } from "utils/imageDimensions";
import { registerMediaWithBackground } from "utils/lib";
import { GetSignedUrl, SaveMedia } from "../../../../Viewport/lib";
import { useSDK } from "../../../../../context";
import { useImageDrop } from "../../../../hooks/useImageDrop";
import {
  cleanSvg,
  convertAvifToJpeg,
  resizeImageIfNeeded,
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
  const { config } = useSDK();

  // ─── Upload state ───
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [conversionDialog, setConversionDialog] = useState<{
    isOpen: boolean;
    file: File | null;
  }>({ isOpen: false, file: null });
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

  /** Register uploaded media and attach metadata (dimensions, title, alt) */
  const registerUploadedMedia = async (mediaId: string, file: File, source: string) => {
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

    const failedFiles: Array<{ name: string; error: string }> = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev =>
          prev ? { ...prev, current: i, currentFile: file.name } : null
        );

        try {
          const processedFile = file.type.startsWith("image/")
            ? await resizeImageIfNeeded(file)
            : file;

          const geturl = await GetSignedUrl();
          const signedURL = (geturl as Record<string, Record<string, string>>)?.result?.uploadURL;
          if (!signedURL) {
            failedFiles.push({ name: file.name, error: "Failed to get upload URL" });
            continue;
          }

          const res = await SaveMedia(processedFile, signedURL);
          const mediaId = (res as Record<string, Record<string, string>>)?.result?.id;
          if (!mediaId) {
            failedFiles.push({ name: file.name, error: "No media ID returned from CDN" });
            continue;
          }

          setUploadProgress(prev =>
            prev ? { ...prev, completedFiles: [...prev.completedFiles, file.name] } : null
          );

          await registerUploadedMedia(mediaId, processedFile, "upload");
        } catch (error: unknown) {
          const err = error as Error;
          if (err.message?.includes("415") && file.type === "image/avif") {
            setUploadProgress(null);
            setUploading(false);
            setConversionDialog({ isOpen: true, file });
            return;
          }
          failedFiles.push({ name: file.name, error: err.message || "Unknown error" });
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

  const handleConvertAndUpload = async () => {
    if (!conversionDialog.file) return;
    const file = conversionDialog.file;
    setConversionDialog({ isOpen: false, file: null });
    setUploading(true);
    setUploadError(null);
    setUploadProgress({ current: 0, total: 1, currentFile: file.name, completedFiles: [] });

    try {
      const convertedFile = await convertAvifToJpeg(file);
      const geturl = await GetSignedUrl();
      const signedURL = (geturl as Record<string, Record<string, string>>)?.result?.uploadURL;
      if (!signedURL) throw new Error("Failed to get upload URL");

      const res = await SaveMedia(convertedFile, signedURL);
      const mediaId = (res as Record<string, Record<string, string>>)?.result?.id;
      if (!mediaId) throw new Error("No media ID returned from CDN");

      await registerUploadedMedia(mediaId, convertedFile, "upload");
      refreshMediaList();
    } catch (error: unknown) {
      setUploadError(`Failed to convert and upload ${file.name}: ${(error as Error).message}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleReplaceMedia = async (files: FileList | null) => {
    if (!files || files.length === 0 || !replacingMedia) return;
    setUploading(true);
    setUploadProgress({ current: 0, total: 1, currentFile: files[0].name, completedFiles: [] });

    try {
      const file = files[0];
      const geturl = await GetSignedUrl();
      const signedURL = (geturl as Record<string, Record<string, string>>)?.result?.uploadURL;
      if (!signedURL) throw new Error("Failed to get upload URL");

      const res = await SaveMedia(file, signedURL);
      const newCdnId = (res as Record<string, Record<string, string>>)?.result?.id;
      if (!newCdnId) throw new Error("No media ID returned from CDN");

      actions.setProp("ROOT", (props: Record<string, unknown>) => {
        const pageMedia = props.pageMedia as MediaItem[] | undefined;
        if (!pageMedia) return;
        const mediaItem = pageMedia.find(m => m.id === replacingMedia);
        if (mediaItem) {
          mediaItem.cdnId = newCdnId;
          mediaItem.uploadedAt = Date.now();
          if (mediaItem.metadata) {
            mediaItem.metadata.title = file.name;
            mediaItem.metadata.size = file.size;
          }
        }
      });

      refreshMediaList();
      setReplacingMedia(null);
    } catch (error) {
      console.error("Replace failed:", error);
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
                dimensions: { width: dimensions.width, height: dimensions.height, aspectRatio: dimensions.aspectRatio },
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
                dimensions: { width: dimensions.width, height: dimensions.height, aspectRatio: dimensions.aspectRatio },
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

  const handleAddSvg = () => {
    if (!svgInput.trim()) return;
    setUploading(true);
    setUploadProgress({ current: 0, total: 1, currentFile: "SVG Image", completedFiles: [] });

    try {
      const cleanedSvg = cleanSvg(svgInput);
      const svgSize = new Blob([cleanedSvg]).size;
      const mediaId = `svg-${Date.now()}`;
      registerMediaWithBackground(query, actions, mediaId, "svg", "media-manager");

      actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
        const pageMedia = (props.pageMedia || []) as MediaItem[];
        const existingMedia = pageMedia.find(m => m.id === mediaId);
        if (existingMedia) {
          existingMedia.metadata = { ...existingMedia.metadata, title: "SVG Image", svg: cleanedSvg, size: svgSize };
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
      setHasImageInClipboard(clipboardItems.some(item => item.types.some(type => type.startsWith("image/"))));
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
        setUploadProgress({ current: 0, total: 1, currentFile: file.name || "Pasted image", completedFiles: [] });

        try {
          const processedFile = await resizeImageIfNeeded(file);
          const geturl = await GetSignedUrl();
          const signedURL = (geturl as Record<string, Record<string, string>>)?.result?.uploadURL;
          if (!signedURL) throw new Error("Failed to get upload URL");

          const res = await SaveMedia(processedFile, signedURL);
          const mediaId = (res as Record<string, Record<string, string>>)?.result?.id;
          if (!mediaId) throw new Error("Failed to upload to CDN");

          await registerUploadedMedia(mediaId, processedFile, "paste");
          refreshMediaList();
        } catch (error: unknown) {
          alert(`Failed to upload pasted image: ${(error as Error).message}`);
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
            const file = new File([blob], `pasted-image-${Date.now()}.${type.split("/")[1]}`, { type });

            setUploading(true);
            try {
              const geturl = await GetSignedUrl();
              const signedURL = (geturl as Record<string, Record<string, string>>)?.result?.uploadURL;
              if (!signedURL) throw new Error("Failed to get upload URL");

              const res = await SaveMedia(file, signedURL);
              const mediaId = (res as Record<string, Record<string, string>>)?.result?.id;
              if (!mediaId) throw new Error("Failed to upload to CDN");

              registerMediaWithBackground(query, actions, mediaId, "cdn", "media-manager");
              actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
                const pageMedia = (props.pageMedia || []) as MediaItem[];
                const existingMedia = pageMedia.find(m => m.id === mediaId);
                if (existingMedia) {
                  existingMedia.metadata = {
                    ...existingMedia.metadata,
                    title: file.name,
                    alt: file.name.replace(/\.[^/.]+$/, ""),
                    size: file.size,
                    source: "paste",
                  };
                }
              });
              refreshMediaList();
            } catch (error: unknown) {
              alert(`Failed to upload pasted image: ${(error as Error).message}`);
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
    accept: "*",
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
    conversionDialog,
    addMode,
    urlInput,
    svgInput,
    saveUrlToCdn,
    hasImageInClipboard,
    isDragOver,
    dropProps,
    // Setters
    setAddMode,
    setUrlInput,
    setSvgInput,
    setSaveUrlToCdn,
    setUploadError,
    setConversionDialog,
    setReplacingMedia,
    // Handlers
    handleUpload,
    handleConvertAndUpload,
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
