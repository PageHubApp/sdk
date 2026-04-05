// @ts-nocheck
import { ROOT_NODE, useEditor } from "@craftjs/core";
import { DeleteMedia, GetSignedUrl, SaveMedia } from "../../../Viewport/lib";
import { useSDK } from "../../../../context";
import { useImageDrop } from "../../../hooks/useImageDrop";
import { ConfirmDialog } from "components/layout/ConfirmDialog";
import { Tooltip } from "components/layout/Tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  TbAlertTriangle,
  TbArrowDown,
  TbArrowUp,
  TbCheck,
  TbChevronLeft,
  TbChevronRight,
  TbClipboard,
  TbCode,
  TbCrop,
  TbEdit,
  TbExternalLink,
  TbEye,
  TbFolder,
  TbInfoCircle,
  TbLayoutGrid,
  TbList,
  TbLoader2,
  TbPhoto,
  TbRefresh,
  TbSearch,
  TbSparkles,
  TbTrash,
  TbUpload,
  TbX,
} from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { SettingsAtom } from "utils/atoms";
import { getCdnUrl } from "utils/cdn";
import {
  formatDimensions,
  getImageDimensionsFromFile,
  getImageDimensionsFromUrl,
} from "utils/imageDimensions";
import { getPageMedia, registerMediaWithBackground, updateMediaMetadata } from "utils/lib";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { ImageCropModal } from "../../Tools/ImageCropModal";
import { useResizable } from "../../../hooks/useResizable";

interface MediaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (mediaId: string) => void; // Optional: if provided, enables selection mode
  selectionMode?: boolean; // If true, shows "Select" button on items
}

export const MediaManagerModal = ({
  isOpen,
  onClose,
  onSelect,
  selectionMode = false,
}: MediaManagerModalProps) => {
  const { query, actions } = useEditor();
  const { config } = useSDK();
  const { status: authStatus } = useSession();
  const analyzeImageHandler = config.aiMediaHandlers?.analyzeImage;
  const generateImageHandler = config.aiMediaHandlers?.generateImage;
  const baseAiAuth = useAiEnabled() && authStatus === "authenticated";
  const canUseImageAnalyze = baseAiAuth && !!analyzeImageHandler;
  const canUseImageGenerate = baseAiAuth && !!generateImageHandler;
  const { width: mmWidth, height: mmHeight, handleProps: mmHandleProps } = useResizable({
    storageKey: "media-manager",
    defaultWidth: 896,
    defaultHeight: Math.round(window.innerHeight * 0.9),
    minWidth: 500,
    maxWidth: 1200,
    minHeight: 400,
    maxHeight: Math.round(window.innerHeight * 0.95),
    edges: ["e", "s", "se", "w", "sw"],
  });
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [filteredMedia, setFilteredMedia] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [editingMedia, setEditingMedia] = useState<any | null>(null);
  const [cropMedia, setCropMedia] = useState<any | null>(null);
  const [replacingMedia, setReplacingMedia] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [addMode, setAddMode] = useState<"upload" | "url" | "svg" | "ai">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [svgInput, setSvgInput] = useState("");
  const [saveUrlToCdn, setSaveUrlToCdn] = useState(false);
  const [hasImageInClipboard, setHasImageInClipboard] = useState(false);
  // isDragOver + dropProps provided by useImageDrop below
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    currentFile: string;
    completedFiles: string[];
  } | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pagehub-media-manager-view");
      return saved === "list" || saved === "cards" ? saved : "cards";
    }
    return "cards";
  });
  const [sortField, setSortField] = useState<"name" | "size" | "createdAt" | "order">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [conversionDialog, setConversionDialog] = useState<{
    isOpen: boolean;
    file: File | null;
  }>({ isOpen: false, file: null });

  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState("");
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [aiOptimizedPrompt, setAiOptimizedPrompt] = useState<string | null>(null);
  const [aiClaudeUsage, setAiClaudeUsage] = useState<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    credits: number;
  } | null>(null);
  const [aiModel, setAiModel] = useState("gpt-image-1");
  const [aiImageScale, setAiImageScale] = useState(100);
  const [aiImagePosition, setAiImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    mediaId: string | null;
  }>({
    isOpen: false,
    mediaId: null,
  });
  const [deletingMedia, setDeletingMedia] = useState<string[]>([]);
  const [savingMetadata, setSavingMetadata] = useState<"idle" | "saving" | "saved">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const settings = useAtomValue(SettingsAtom);

  // Save view mode preference to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pagehub-media-manager-view", viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (addMode === "ai" && !canUseImageGenerate) {
      setAddMode("upload");
    }
  }, [addMode, canUseImageGenerate]);

  // Drag-and-drop handlers are provided by useImageDrop (after handleUpload is defined)

  // Helper function to convert AVIF to JPEG (Cloudflare upload API rejects AVIF with 415)
  const convertAvifToJpeg = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      img.onload = () => {
        // Set canvas to image dimensions
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Draw image to canvas
        ctx?.drawImage(img, 0, 0);

        // Convert to JPEG
        canvas.toBlob(
          blob => {
            if (blob) {
              const jpegFile = new File([blob], file.name.replace(/\.avif$/i, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              console.log(
                `🔄 Converted AVIF to JPEG: ${file.name} (${(file.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB)`
              );
              resolve(jpegFile);
            } else {
              reject(new Error("Failed to convert AVIF to JPEG"));
            }
          },
          "image/jpeg",
          0.92 // High quality JPEG
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load AVIF image"));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Helper function to resize large images client-side
  const resizeImageIfNeeded = async (file: File, maxWidth: number = 2680): Promise<File> => {
    return new Promise(resolve => {
      const img = document.createElement("img");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      img.onload = () => {
        // Check if image needs resizing
        if (img.width <= maxWidth) {
          resolve(file); // No resizing needed
          return;
        }

        // Calculate new dimensions maintaining aspect ratio
        const aspectRatio = img.height / img.width;
        const newWidth = maxWidth;
        const newHeight = Math.round(newWidth * aspectRatio);

        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw resized image
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert canvas to blob
        canvas.toBlob(
          blob => {
            if (blob) {
              // Create new file with resized image
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              console.log(
                `📏 Resized image from ${img.width}x${img.height} to ${newWidth}x${newHeight}`
              );
              resolve(resizedFile);
            } else {
              resolve(file); // Fallback to original if resize fails
            }
          },
          file.type,
          0.9
        ); // 90% quality
      };

      img.onerror = () => {
        resolve(file); // Fallback to original if image load fails
      };

      // Load image from file
      img.src = URL.createObjectURL(file);
    });
  };

  // handleDrop replaced by useImageDrop hook

  // Handle paste events for images (keyboard shortcut)
  const handlePaste = async (e: ClipboardEvent) => {
    // Don't handle paste if user is typing in an input or textarea
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      return;
    }

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

        try {
          // Resize image if it's too large
          const processedFile = await resizeImageIfNeeded(file);

          // Get signed URL for CDN upload
          const geturl = await GetSignedUrl();
          const signedURL = geturl?.result?.uploadURL;

          if (!signedURL) {
            throw new Error("Failed to get upload URL");
          }

          // Upload to CDN
          const res = await SaveMedia(processedFile, signedURL);
          if (!res?.result?.id) {
            throw new Error("Failed to upload to CDN");
          }

          const mediaId = res.result.id;
          registerMediaWithBackground(query, actions, mediaId, "cdn", "media-manager");

          // Extract dimensions and add metadata
          try {
            const dimensions = await getImageDimensionsFromFile(processedFile);
            console.log(`[PageHub] Extracted dimensions for pasted image:`, dimensions);

            actions.setProp(ROOT_NODE, (props: any) => {
              props.pageMedia = props.pageMedia || [];
              const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

              if (existingMedia) {
                existingMedia.metadata = {
                  ...existingMedia.metadata,
                  title: processedFile.name || "Pasted Image",
                  alt: processedFile.name?.replace(/\.[^/.]+$/, "") || "Pasted Image",
                  size: processedFile.size,
                  source: "paste",
                  dimensions: {
                    width: dimensions.width,
                    height: dimensions.height,
                    aspectRatio: dimensions.aspectRatio,
                  },
                };
              }
            });
          } catch (dimensionError) {
            console.warn(`Failed to extract dimensions for pasted image:`, dimensionError);
            // Still add basic metadata even if dimensions fail
            actions.setProp(ROOT_NODE, (props: any) => {
              props.pageMedia = props.pageMedia || [];
              const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

              if (existingMedia) {
                existingMedia.metadata = {
                  ...existingMedia.metadata,
                  title: processedFile.name || "Pasted Image",
                  alt: processedFile.name?.replace(/\.[^/.]+$/, "") || "Pasted Image",
                  size: processedFile.size,
                  source: "paste",
                };
              }
            });
          }

          refreshMediaList();
          console.log(`Pasted and uploaded image: ${file.name || "unnamed"}`);

          // Generate AI metadata for the uploaded image
          const imageUrl = getCdnUrl(mediaId, { width: 800, format: "auto" });
          generateMetadataForImage(mediaId, imageUrl);
        } catch (error) {
          console.error("Failed to upload pasted image:", error);
          alert(`Failed to upload pasted image: ${error.message}`);
        } finally {
          setUploading(false);
          setUploadProgress(null);
        }

        break; // Only handle first image
      }
    }
  };

  // Check clipboard for images
  const checkClipboardForImages = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const hasImage = clipboardItems.some(item =>
        item.types.some(type => type.startsWith("image/"))
      );
      setHasImageInClipboard(hasImage);
    } catch (error) {
      // Fallback: assume no image if clipboard access fails
      setHasImageInClipboard(false);
    }
  };

  // Handle paste button click
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

            try {
              // Get signed URL for CDN upload
              const geturl = await GetSignedUrl();
              const signedURL = geturl?.result?.uploadURL;

              if (!signedURL) {
                throw new Error("Failed to get upload URL");
              }

              // Upload to CDN
              const res = await SaveMedia(file, signedURL);
              if (!res?.result?.id) {
                throw new Error("Failed to upload to CDN");
              }

              const mediaId = res.result.id;
              registerMediaWithBackground(query, actions, mediaId, "cdn", "media-manager");

              // Add metadata
              actions.setProp(ROOT_NODE, (props: any) => {
                props.pageMedia = props.pageMedia || [];
                const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

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
              console.log(`Pasted and uploaded image: ${file.name}`);
            } catch (error) {
              console.error("Failed to upload pasted image:", error);
              alert(`Failed to upload pasted image: ${error.message}`);
            } finally {
              setUploading(false);
            }

            return; // Only handle first image
          }
        }
      }
    } catch (error) {
      console.error("Failed to read clipboard:", error);
      alert("Failed to access clipboard. Please try pasting with Ctrl+V / Cmd+V instead.");
    }
  };

  // Format file size in human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const sortMedia = (media: any[]) => {
    return [...media].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "name":
          aValue = a.metadata?.title || a.id;
          bValue = b.metadata?.title || b.id;
          break;
        case "size":
          aValue = a.metadata?.size || 0;
          bValue = b.metadata?.size || 0;
          break;
        case "createdAt":
          aValue = a.uploadedAt || a.createdAt || 0;
          bValue = b.uploadedAt || b.createdAt || 0;
          break;
        case "order":
          aValue = a.order || 0;
          bValue = b.order || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (sortDirection === "asc") {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };

  const refreshMediaList = useCallback(() => {
    const media = getPageMedia(query);
    setMediaList(media);
    setFilteredMedia(sortMedia(media));
  }, [query, sortField, sortDirection]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredMedia(sortMedia(mediaList));
      return;
    }

    const filtered = mediaList.filter(media => {
      const searchLower = query.toLowerCase();
      return (
        media.id.toLowerCase().includes(searchLower) ||
        media.metadata?.title?.toLowerCase().includes(searchLower) ||
        media.metadata?.alt?.toLowerCase().includes(searchLower) ||
        media.metadata?.description?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredMedia(sortMedia(filtered));
  };

  const handleDelete = (mediaId: string) => {
    setDeleteConfirm({ isOpen: true, mediaId });
  };

  const handlePreviewNext = () => {
    if (!previewMedia) return;
    const currentIndex = filteredMedia.findIndex(m => m.id === previewMedia);
    if (currentIndex < filteredMedia.length - 1) {
      setPreviewMedia(filteredMedia[currentIndex + 1].id);
    }
  };

  const handlePreviewPrevious = () => {
    if (!previewMedia) return;
    const currentIndex = filteredMedia.findIndex(m => m.id === previewMedia);
    if (currentIndex > 0) {
      setPreviewMedia(filteredMedia[currentIndex - 1].id);
    }
  };

  const handleReorder = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    const draggedIndex = filteredMedia.findIndex(m => m.id === draggedId);
    const targetIndex = filteredMedia.findIndex(m => m.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...filteredMedia];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    // Update order values
    const updatedMedia = newOrder.map((media, index) => ({
      ...media,
      order: index,
    }));

    // Update the media in the editor
    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.pageMedia) return;

      const updatedPageMedia = props.pageMedia.map((m: any) => {
        const updatedItem = updatedMedia.find(u => u.id === m.id);
        return updatedItem ? { ...m, order: updatedItem.order } : m;
      });

      props.pageMedia = updatedPageMedia;
    });

    setFilteredMedia(updatedMedia);
  };

  const handleSaveCroppedImage = (croppedImage: any) => {
    // Add the cropped image as a new variant
    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.pageMedia) return;
      props.pageMedia = [...props.pageMedia, croppedImage];
    });

    refreshMediaList();
    setCropMedia(null);
  };

  // Helper function to automatically generate AI metadata for any image
  const generateMetadataForImage = async (mediaId: string, imageUrl: string) => {
    if (!canUseImageAnalyze || !analyzeImageHandler) return;

    try {
      // Get AI settings from root node
      const rootNode = query.node(ROOT_NODE).get();
      const aiSettings = rootNode?.data?.props?.ai || {};

      const analysis = await analyzeImageHandler({ imageUrl, aiSettings });
      if (!analysis) {
        console.warn("AI metadata generation failed, continuing without it");
        return;
      }

      actions.setProp(ROOT_NODE, (props: any) => {
        props.pageMedia = props.pageMedia || [];
        const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

        if (existingMedia) {
          existingMedia.metadata = {
            ...existingMedia.metadata,
            title: analysis.fileName || existingMedia.metadata?.title,
            alt: analysis.altText || existingMedia.metadata?.alt,
            description: analysis.seoDescription || existingMedia.metadata?.description,
          };
        }
      });

      refreshMediaList();
      console.log("[PageHub] AI metadata generated for image:", mediaId);
    } catch (error) {
      console.warn("AI metadata generation failed:", error);
      // Don't throw - we want upload to succeed even if AI fails
    }
  };

  const handleGenerateMetadata = async () => {
    if (!editingMedia) return;

    setIsGeneratingMetadata(true);
    try {
      // Get the image URL
      let imageUrl: string;
      if (editingMedia.type === "url") {
        imageUrl = editingMedia.metadata?.url;
      } else if (editingMedia.type === "svg") {
        throw new Error("AI metadata generation is not available for SVG images");
      } else {
        // For CDN images, use the CDN URL
        imageUrl = getCdnUrl(editingMedia.cdnId || editingMedia.id, {
          width: 800,
          format: "auto",
        });
      }

      if (!imageUrl) {
        throw new Error("No image URL available for analysis");
      }

      // Get AI settings from root node
      const rootNode = query.node(ROOT_NODE).get();
      const aiSettings = rootNode?.data?.props?.ai || {};

      if (!analyzeImageHandler) {
        throw new Error("Image analysis is not configured");
      }

      const analysis = await analyzeImageHandler({ imageUrl, aiSettings });
      if (!analysis) {
        throw new Error("Failed to analyze image");
      }

      setEditingMedia({
        ...editingMedia,
        metadata: {
          ...editingMedia.metadata,
          title: analysis.fileName,
          alt: analysis.altText,
          description: analysis.seoDescription,
        },
      });
    } catch (error) {
      console.error("Metadata generation error:", error);
      // You could add a toast notification here
      alert(
        `Failed to generate metadata: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.mediaId) return;

    const mediaIdToDelete = deleteConfirm.mediaId;

    // Close dialog and show deleting state on card
    setDeleteConfirm({ isOpen: false, mediaId: null });
    setDeletingMedia(prev => [...prev, mediaIdToDelete]);

    try {
      // First, remove from CDN
      await DeleteMedia(mediaIdToDelete, settings, query, actions);

      // Then remove from local pageMedia array
      actions.setProp(ROOT_NODE, (props: any) => {
        if (!props.pageMedia) return;
        props.pageMedia = props.pageMedia.filter((m: any) => m.id !== mediaIdToDelete);
      });

      refreshMediaList();
      setSelectedMedia(null);
    } catch (error) {
      console.error("Failed to delete media:", error);
      // Still remove from local array even if CDN deletion fails
      actions.setProp(ROOT_NODE, (props: any) => {
        if (!props.pageMedia) return;
        props.pageMedia = props.pageMedia.filter((m: any) => m.id !== mediaIdToDelete);
      });
      refreshMediaList();
      setSelectedMedia(null);
    } finally {
      setDeletingMedia(prev => prev.filter(id => id !== mediaIdToDelete));
    }
  };

  const handleConvertAndUpload = async () => {
    if (!conversionDialog.file) return;

    const file = conversionDialog.file;
    setConversionDialog({ isOpen: false, file: null });
    setUploading(true);
    setUploadError(null);
    setUploadProgress({
      current: 0,
      total: 1,
      currentFile: file.name,
      completedFiles: [],
    });

    try {
      // Convert AVIF to JPEG
      console.log(`Converting ${file.name} to JPEG...`);
      const convertedFile = await convertAvifToJpeg(file);

      // Get signed URL
      const geturl = await GetSignedUrl();
      const signedURL = geturl?.result?.uploadURL;

      if (!signedURL) {
        throw new Error("Failed to get upload URL");
      }

      // Upload converted file
      const res = await SaveMedia(convertedFile, signedURL);

      if (res?.result?.id) {
        const mediaId = res.result.id;
        console.log(`[PageHub] Successfully uploaded converted file with ID: ${mediaId}`);

        // Register with page media
        registerMediaWithBackground(query, actions, mediaId, "cdn", "media-manager");

        // Extract dimensions and add metadata
        try {
          const dimensions = await getImageDimensionsFromFile(convertedFile);
          actions.setProp(ROOT_NODE, (props: any) => {
            props.pageMedia = props.pageMedia || [];
            const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

            if (existingMedia) {
              existingMedia.metadata = {
                ...existingMedia.metadata,
                title: convertedFile.name,
                alt: convertedFile.name.replace(/\.[^/.]+$/, ""),
                size: convertedFile.size,
                dimensions: {
                  width: dimensions.width,
                  height: dimensions.height,
                  aspectRatio: dimensions.aspectRatio,
                },
              };
            }
          });

          const imageUrl = getCdnUrl(mediaId, { width: 800, format: "auto" });
          generateMetadataForImage(mediaId, imageUrl);
        } catch (dimensionError) {
          console.warn("Failed to extract dimensions:", dimensionError);
        }

        refreshMediaList();
      } else {
        throw new Error("No media ID returned from CDN");
      }
    } catch (error) {
      console.error("Failed to convert and upload:", error);
      setUploadError(`Failed to convert and upload ${file.name}: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    console.log(
      `Starting upload of ${files.length} files:`,
      Array.from(files).map(f => f.name)
    );
    setUploading(true);
    setUploadError(null); // Clear previous errors
    setUploadProgress({
      current: 0,
      total: files.length,
      currentFile: "",
      completedFiles: [],
    });
    const uploadedIds: string[] = [];
    const failedFiles: Array<{ name: string; error: string }> = [];

    try {
      // Upload each file to CDN
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Uploading file ${i + 1}/${files.length}: ${file.name}`);

        // Update progress to show current file
        setUploadProgress(prev =>
          prev
            ? {
                ...prev,
                current: i,
                currentFile: file.name,
              }
            : null
        );

        try {
          // Resize if it's too large (only for image files)
          const processedFile = file.type.startsWith("image/")
            ? await resizeImageIfNeeded(file)
            : file;

          // Get signed URL for each file (in case URLs expire)
          const geturl = await GetSignedUrl();
          const signedURL = geturl?.result?.uploadURL;

          if (!signedURL) {
            const errorMsg = `Failed to get upload URL`;
            console.error(`${errorMsg} for ${file.name}`, geturl);
            failedFiles.push({ name: file.name, error: errorMsg });
            continue; // Skip this file and continue with next
          }

          // Upload to CDN and get UUID
          const res = await SaveMedia(processedFile, signedURL);

          if (res?.result?.id) {
            const mediaId = res.result.id; // This is the UUID from CDN
            uploadedIds.push(mediaId);
            console.log(`Successfully uploaded ${file.name} with ID: ${mediaId}`);

            // Update progress to show completed file
            setUploadProgress(prev =>
              prev
                ? {
                    ...prev,
                    completedFiles: [...prev.completedFiles, file.name],
                  }
                : null
            );

            // Register with page media
            registerMediaWithBackground(query, actions, mediaId, "cdn", "media-manager");

            // Extract image dimensions and add metadata
            try {
              const dimensions = await getImageDimensionsFromFile(processedFile);
              console.log(`[PageHub] Extracted dimensions for ${processedFile.name}:`, dimensions);

              actions.setProp(ROOT_NODE, (props: any) => {
                props.pageMedia = props.pageMedia || [];
                const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

                if (existingMedia) {
                  // Update existing entry with metadata including dimensions
                  existingMedia.metadata = {
                    ...existingMedia.metadata,
                    title: processedFile.name,
                    alt: processedFile.name.replace(/\.[^/.]+$/, ""), // filename without extension
                    size: processedFile.size, // Store file size in bytes
                    dimensions: {
                      width: dimensions.width,
                      height: dimensions.height,
                      aspectRatio: dimensions.aspectRatio,
                    },
                  };
                }
              });

              // Generate AI metadata for the uploaded image
              const imageUrl = getCdnUrl(mediaId, {
                width: 800,
                format: "auto",
              });
              generateMetadataForImage(mediaId, imageUrl);
            } catch (dimensionError) {
              console.warn(
                `Failed to extract dimensions for ${processedFile.name}:`,
                dimensionError
              );
              // Still save the file without dimensions
              actions.setProp(ROOT_NODE, (props: any) => {
                props.pageMedia = props.pageMedia || [];
                const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

                if (existingMedia) {
                  existingMedia.metadata = {
                    ...existingMedia.metadata,
                    title: processedFile.name,
                    alt: processedFile.name.replace(/\.[^/.]+$/, ""),
                    size: processedFile.size,
                  };
                }
              });

              // Generate AI metadata even if dimensions failed
              const imageUrl = getCdnUrl(mediaId, {
                width: 800,
                format: "auto",
              });
              generateMetadataForImage(mediaId, imageUrl);
            }
          } else {
            const errorMsg = "No media ID returned from CDN";
            console.error(`${errorMsg} for ${file.name}. Response:`, res);
            failedFiles.push({ name: file.name, error: errorMsg });
          }
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);

          // Check if it's a 415 error (Unsupported Media Type) for AVIF files
          if (error.message?.includes("415") && file.type === "image/avif") {
            // Pause the loop and ask user if they want to convert
            setUploadProgress(null);
            setUploading(false);
            setConversionDialog({ isOpen: true, file });
            return; // Stop processing other files
          }

          failedFiles.push({
            name: file.name,
            error: error.message || "Unknown error",
          });
          // Continue with next file even if one fails
        }
      }

      refreshMediaList();

      // Show success/error messages
      if (uploadedIds.length > 0) {
        console.log(`[PageHub] Uploaded ${uploadedIds.length} file(s) to CDN`);
      }

      if (failedFiles.length > 0) {
        const errorMessage =
          failedFiles.length === 1
            ? `Failed to upload ${failedFiles[0].name}: ${failedFiles[0].error}`
            : `Failed to upload ${failedFiles.length} file(s):\n${failedFiles.map(f => `• ${f.name}: ${f.error}`).join("\n")}`;
        setUploadError(errorMessage);
        console.error("Upload failures:", failedFiles);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError(error.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Shared drag-and-drop — accepts all file types, handleUpload does its own filtering
  const { isDragOver, dropProps } = useImageDrop({
    onFiles: (files) => {
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));
      handleUpload(dt.files);
    },
    accept: "*",
  });

  const cleanSvg = (svg: string): string => {
    let cleaned = svg.trim();

    // Remove XML declaration
    cleaned = cleaned.replace(/<\?xml[^?]*\?>/gi, "");

    // Remove DOCTYPE
    cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, "");

    // Remove comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

    // Extract only the SVG tag and its contents
    const svgMatch = cleaned.match(/<svg[\s\S]*<\/svg>/i);
    if (svgMatch) {
      cleaned = svgMatch[0];
    }

    // Remove width and height attributes from SVG tag
    cleaned = cleaned.replace(/\s*(width|height)\s*=\s*["'][^"']*["']/gi, "");

    // Replace black fills with currentColor to make SVG themeable
    // Handle various black color formats
    cleaned = cleaned.replace(/fill\s*=\s*["']#000000["']/gi, 'fill="currentColor"');
    cleaned = cleaned.replace(/fill\s*=\s*["']#000["']/gi, 'fill="currentColor"');
    cleaned = cleaned.replace(/fill\s*=\s*["']black["']/gi, 'fill="currentColor"');
    cleaned = cleaned.replace(/fill\s*=\s*["']rgb\(0,\s*0,\s*0\)["']/gi, 'fill="currentColor"');
    cleaned = cleaned.replace(
      /fill\s*=\s*["']rgba\(0,\s*0,\s*0,\s*1\)["']/gi,
      'fill="currentColor"'
    );

    // Trim extra whitespace
    cleaned = cleaned.trim();

    return cleaned;
  };

  const openEditModal = (media: any) => {
    setEditingMedia({
      ...media,
      metadata: {
        alt: media.metadata?.alt || "",
        title: media.metadata?.title || "",
        description: media.metadata?.description || "",
        url: media.metadata?.url || "",
        svg: media.metadata?.svg || "",
      },
    });
    setSavingMetadata("idle");
  };

  const closeEditModal = () => {
    setEditingMedia(null);
    setSavingMetadata("idle");
  };

  const saveEditedMetadata = async () => {
    if (!editingMedia) return;

    console.log("Saving metadata...");
    setSavingMetadata("saving");

    try {
      // Clean SVG if it's an SVG type and recalculate size
      const metadata = { ...editingMedia.metadata };
      if (editingMedia.type === "svg" && metadata.svg) {
        const cleanedSvg = cleanSvg(metadata.svg);
        metadata.svg = cleanedSvg;
        metadata.size = new Blob([cleanedSvg]).size; // Recalculate size
      }

      // Wait a bit to show the loading state
      await new Promise(resolve => setTimeout(resolve, 300));

      updateMediaMetadata(query, actions, editingMedia.id, metadata);
      refreshMediaList();

      console.log("Metadata saved!");
      setSavingMetadata("saved");

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSavingMetadata("idle");
      }, 2000);
    } catch (error) {
      console.error("Failed to save metadata:", error);
      setSavingMetadata("idle");
    }
  };

  const handleReplaceMedia = async (files: FileList | null) => {
    if (!files || files.length === 0 || !replacingMedia) return;

    setUploading(true);
    setUploadProgress({
      current: 0,
      total: 1,
      currentFile: files[0].name,
      completedFiles: [],
    });

    try {
      const file = files[0]; // Only take first file

      // Get signed URL for CDN upload
      const geturl = await GetSignedUrl();
      const signedURL = geturl?.result?.uploadURL;

      if (!signedURL) {
        console.error("Failed to get upload URL");
        setUploading(false);
        return;
      }

      // Upload to CDN - this will overwrite the existing file if using same ID
      // Or we can get a new ID and update the reference
      const res = await SaveMedia(file, signedURL);

      if (res?.result?.id) {
        const newCdnId = res.result.id;

        // Update the media entry to point to the new CDN file
        actions.setProp("ROOT", (props: any) => {
          if (!props.pageMedia) return;

          const mediaItem = props.pageMedia.find((m: any) => m.id === replacingMedia);
          if (mediaItem) {
            // Keep the same media library ID but update to point to new CDN file
            mediaItem.cdnId = newCdnId;
            mediaItem.uploadedAt = Date.now();

            // Update filename and size in metadata
            if (mediaItem.metadata) {
              mediaItem.metadata.title = file.name;
              mediaItem.metadata.size = file.size; // Update file size
            }
          }
        });

        refreshMediaList();
        setReplacingMedia(null);
        console.log(`Replaced media ${replacingMedia} with new file`);
      }
    } catch (error) {
      console.error("Replace failed:", error);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;

    setUploading(true);
    setUploadProgress({
      current: 0,
      total: 1,
      currentFile: urlInput,
      completedFiles: [],
    });

    try {
      if (saveUrlToCdn) {
        const apiUrl = config.apiBaseUrl || "";
        const response = await fetch(`${apiUrl}/api/download-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: urlInput,
            saveToCdn: true,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to download image");
        }

        const result = await response.json();
        const mediaId = result.mediaId;
        registerMediaWithBackground(query, actions, mediaId, "cdn", "media-manager");

        // Extract dimensions and add metadata
        try {
          // Get dimensions from the CDN URL instead of the file
          const imageUrl = getCdnUrl(mediaId, { width: 800, format: "auto" });
          const dimensions = await getImageDimensionsFromUrl(imageUrl);
          console.log(`[PageHub] Extracted dimensions for URL image ${result.filename}:`, dimensions);

          actions.setProp(ROOT_NODE, (props: any) => {
            props.pageMedia = props.pageMedia || [];
            const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

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
                originalUrl: urlInput, // Keep track of original URL
              };
            }
          });

          // Generate AI metadata for the URL image
          generateMetadataForImage(mediaId, imageUrl);
        } catch (dimensionError) {
          console.warn(
            `Failed to extract dimensions for URL image ${result.filename}:`,
            dimensionError
          );
          // Still save without dimensions
          actions.setProp(ROOT_NODE, (props: any) => {
            props.pageMedia = props.pageMedia || [];
            const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

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

          // Generate AI metadata even if dimensions failed
          const imageUrl = getCdnUrl(mediaId, { width: 800, format: "auto" });
          generateMetadataForImage(mediaId, imageUrl);
        }

        console.log(`Downloaded and uploaded URL to CDN: ${urlInput}`);
      } else {
        // Store as URL reference (existing behavior)
        const mediaId = `url-${Date.now()}`;
        registerMediaWithBackground(query, actions, mediaId, "url", "media-manager");

        // Extract dimensions from URL and add metadata
        try {
          const dimensions = await getImageDimensionsFromUrl(urlInput);
          console.log(`[PageHub] Extracted dimensions for URL reference:`, dimensions);

          actions.setProp(ROOT_NODE, (props: any) => {
            props.pageMedia = props.pageMedia || [];
            const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

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

          // Generate AI metadata for the URL reference
          generateMetadataForImage(mediaId, urlInput);
        } catch (dimensionError) {
          console.warn(`Failed to extract dimensions for URL reference:`, dimensionError);
          // Still save without dimensions
          actions.setProp(ROOT_NODE, (props: any) => {
            props.pageMedia = props.pageMedia || [];
            const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

            if (existingMedia) {
              existingMedia.metadata = {
                ...existingMedia.metadata,
                title: urlInput.split("/").pop() || urlInput,
                url: urlInput,
              };
            }
          });

          // Generate AI metadata even if dimensions failed
          generateMetadataForImage(mediaId, urlInput);
        }

        console.log(`Added URL reference: ${urlInput}`);
      }

      refreshMediaList();
      setUrlInput("");
      setSaveUrlToCdn(false);
      setAddMode("upload");
    } catch (error) {
      console.error("Failed to add URL:", error);
      alert(`Failed to add URL: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleAddSvg = () => {
    if (!svgInput.trim()) return;

    setUploading(true);
    setUploadProgress({
      current: 0,
      total: 1,
      currentFile: "SVG Image",
      completedFiles: [],
    });

    try {
      const cleanedSvg = cleanSvg(svgInput);
      const svgSize = new Blob([cleanedSvg]).size; // Get byte size of SVG

      const mediaId = `svg-${Date.now()}`;
      registerMediaWithBackground(query, actions, mediaId, "svg", "media-manager");

      // Add metadata with the SVG content
      actions.setProp(ROOT_NODE, (props: any) => {
        props.pageMedia = props.pageMedia || [];
        const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

        if (existingMedia) {
          existingMedia.metadata = {
            ...existingMedia.metadata,
            title: "SVG Image",
            svg: cleanedSvg,
            size: svgSize, // Store SVG size in bytes
          };
        }
      });

      refreshMediaList();
      setSvgInput("");
      setAddMode("upload");
      console.log(`Added SVG media`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleGenerateAiImage = async () => {
    if (!aiPrompt.trim()) return;

    setIsGeneratingAi(true);
    setAiError("");
    setAiSuccess("");
    setAiImagePreview(null);
    setAiClaudeUsage(null);

    try {
      // Get AI settings from root node
      const rootNode = query.node(ROOT_NODE).get();
      const aiSettings = rootNode?.data?.props?.ai || {};

      if (!generateImageHandler) {
        throw new Error("Image generation is not configured");
      }

      const data = await generateImageHandler({
        prompt: aiPrompt,
        width: 1024,
        height: 1024,
        model: aiModel,
        aiSettings,
      });

      if (!data?.success || !data.imageUrl) {
        throw new Error(data?.error || "No image generated");
      }

      setAiImagePreview(data.imageUrl);
      setAiOptimizedPrompt(data.optimizedPrompt);
      setAiClaudeUsage(data.claudeUsage);
      setAiSuccess("Image generated successfully!");
      console.log("AI image generated successfully");
    } catch (error) {
      console.error("AI generation error:", error);
      setAiError(error.message || "Failed to generate image");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSaveAiImage = async () => {
    if (!aiImagePreview) return;

    setUploading(true);

    try {
      // Convert base64 to blob
      const response = await fetch(aiImagePreview);
      const blob = await response.blob();
      const file = new File([blob], `ai-generated-${Date.now()}.png`, {
        type: "image/png",
      });

      // Get signed URL for CDN upload
      const geturl = await GetSignedUrl();
      const signedURL = geturl?.result?.uploadURL;

      if (!signedURL) {
        throw new Error("Failed to get upload URL");
      }

      // Upload to CDN
      const res = await SaveMedia(file, signedURL);
      if (!res?.result?.id) {
        throw new Error("Failed to upload to CDN");
      }

      const mediaId = res.result.id;
      registerMediaWithBackground(query, actions, mediaId, "cdn", "media-manager");

      // Extract dimensions and add metadata
      try {
        const dimensions = await getImageDimensionsFromFile(file);
        console.log(`[PageHub] Extracted dimensions for AI-generated image:`, dimensions);

        actions.setProp(ROOT_NODE, (props: any) => {
          props.pageMedia = props.pageMedia || [];
          const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

          if (existingMedia) {
            existingMedia.metadata = {
              ...existingMedia.metadata,
              title: `AI Generated: ${aiPrompt}`,
              alt: aiPrompt,
              size: file.size,
              dimensions: {
                width: dimensions.width,
                height: dimensions.height,
                aspectRatio: dimensions.aspectRatio,
              },
              aiGenerated: true,
              aiPrompt: aiPrompt,
            };
          }
        });

        // Generate additional AI metadata for the AI-generated image
        const imageUrl = getCdnUrl(mediaId, { width: 800, format: "auto" });
        generateMetadataForImage(mediaId, imageUrl);
      } catch (dimensionError) {
        console.warn(`Failed to extract dimensions for AI-generated image:`, dimensionError);
        // Still save without dimensions
        actions.setProp(ROOT_NODE, (props: any) => {
          props.pageMedia = props.pageMedia || [];
          const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

          if (existingMedia) {
            existingMedia.metadata = {
              ...existingMedia.metadata,
              title: `AI Generated: ${aiPrompt}`,
              alt: aiPrompt,
              size: file.size,
              aiGenerated: true,
              aiPrompt: aiPrompt,
            };
          }
        });

        // Generate additional AI metadata even if dimensions failed
        const imageUrl = getCdnUrl(mediaId, { width: 800, format: "auto" });
        generateMetadataForImage(mediaId, imageUrl);
      }

      refreshMediaList();
      // Show success feedback but keep AI generator open
      setAiError(""); // Clear any previous errors
      setAiSuccess("Image saved successfully!");
      // Clear success message after 3 seconds
      setTimeout(() => setAiSuccess(""), 3000);
      console.log(`Saved AI generated image: ${mediaId}`);
    } catch (error) {
      console.error("Failed to save AI image:", error);
      setAiError(`Failed to save image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - aiImagePosition.x,
      y: e.clientY - aiImagePosition.y,
    });
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setAiImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    const newScale = Math.max(25, Math.min(300, aiImageScale + delta));
    setAiImageScale(newScale);
  };

  const resetImageView = () => {
    setAiImageScale(100);
    setAiImagePosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (isOpen) {
      refreshMediaList();
      setSearchQuery("");
      setSelectedMedia(null);
      setEditingMedia(null);

      // Check clipboard for images when modal opens
      checkClipboardForImages();

      // Add paste event listener when modal opens
      document.addEventListener("paste", handlePaste);
    }

    // Cleanup paste event listener when modal closes
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [isOpen, refreshMediaList]);

  // Close add mode inputs when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking on AI login modal
      if ((event.target as Element)?.closest("[data-ai-login-modal]")) {
        return;
      }

      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        if (addMode === "url" || addMode === "svg" || addMode === "ai") {
          setAddMode("upload");
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, addMode]);

  // Keyboard shortcuts for preview modal
  useEffect(() => {
    if (!previewMedia) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewMedia(null);
      } else if (e.key === "ArrowLeft") {
        handlePreviewPrevious();
      } else if (e.key === "ArrowRight") {
        handlePreviewNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewMedia, filteredMedia]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-9997 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Modal */}
        <motion.div
          key="modal"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="relative border border-border bg-background shadow-xl"
          style={{ borderRadius: "12px", overflow: "hidden", width: mmWidth, height: mmHeight }}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            // Prevent backspace from closing modal when typing in inputs
            if (e.key === "Backspace" && (e.target as HTMLElement).tagName === "INPUT") {
              e.stopPropagation();
            }
            // Prevent escape from closing modal when typing in inputs
            if (e.key === "Escape" && (e.target as HTMLElement).tagName === "INPUT") {
              e.stopPropagation();
            }
          }}
        >
          {mmHandleProps.e && <div {...mmHandleProps.e} />}
          {mmHandleProps.s && <div {...mmHandleProps.s} />}
          {mmHandleProps.se && <div {...mmHandleProps.se} />}
          {mmHandleProps.w && <div {...mmHandleProps.w} />}
          {mmHandleProps.sw && <div {...mmHandleProps.sw} />}
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-accent px-3 py-1.5 text-accent-foreground">
              <div className="flex items-center gap-2">
                <TbPhoto className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  {selectionMode ? "Select Media" : "Media Manager"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {selectionMode
                    ? "Click an image to select it"
                    : `${filteredMedia.length} ${filteredMedia.length === 1 ? "item" : "items"}${searchQuery ? ` (filtered from ${mediaList.length})` : ""}`}
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Close"
              >
                <TbX className="size-3.5" />
              </button>
            </div>

            {/* Upload Error Banner */}
            {uploadError && (
              <div className="border-b border-destructive bg-destructive/10 px-6 py-3">
                <div className="flex items-start gap-3">
                  <TbAlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
                  <div className="flex-1">
                    <p className="whitespace-pre-line text-sm text-destructive">{uploadError}</p>
                  </div>
                  <button
                    onClick={() => setUploadError(null)}
                    className="shrink-0 rounded p-1 transition-colors hover:bg-destructive/20"
                  >
                    <TbX className="size-4 text-destructive" />
                  </button>
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div ref={toolbarRef} className="border-b border-border bg-muted px-4 py-1.5">
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative flex-1">
                  <TbSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Search media..."
                    className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 text-muted-foreground">
                  <Tooltip content="Card view" placement="bottom">
                    <button
                      onClick={() => setViewMode("cards")}
                      className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                        viewMode === "cards"
                          ? "bg-muted text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <TbLayoutGrid className="size-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="List view" placement="bottom">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                        viewMode === "list"
                          ? "bg-muted text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <TbList className="size-4" />
                    </button>
                  </Tooltip>
                </div>

                {/* Sort Controls */}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 text-muted-foreground">
                  <Tooltip content="Sort by" placement="bottom">
                    <select
                      value={sortField}
                      onChange={e => {
                        setSortField(e.target.value as "name" | "size" | "createdAt" | "order");
                        // Re-sort current filtered media
                        setFilteredMedia(sortMedia(filteredMedia));
                      }}
                      className="cursor-pointer border-none bg-transparent text-xs outline-none"
                    >
                      <option value="createdAt">Date</option>
                      <option value="name">Name</option>
                      <option value="size">Size</option>
                      <option value="order">Order</option>
                    </select>
                  </Tooltip>
                  <Tooltip
                    content={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
                    placement="bottom"
                  >
                    <button
                      onClick={() => {
                        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                        // Re-sort current filtered media
                        setFilteredMedia(sortMedia(filteredMedia));
                      }}
                      className="rounded-lg p-1 text-xs font-medium transition-colors hover:text-foreground"
                    >
                      {sortDirection === "asc" ? (
                        <TbArrowUp className="size-3" />
                      ) : (
                        <TbArrowDown className="size-3" />
                      )}
                    </button>
                  </Tooltip>
                </div>

                {/* Add Mode Selector - compact pills */}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 text-muted-foreground">
                  <Tooltip content="Upload files" placement="bottom">
                    <button
                      onClick={() => {
                        setAddMode("upload");
                        if (addMode === "upload") fileInputRef.current?.click();
                      }}
                      disabled={uploading}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        addMode === "upload"
                          ? "bg-muted text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <TbUpload className="inline" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Add from URL" placement="bottom">
                    <button
                      onClick={() => setAddMode("url")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        addMode === "url"
                          ? "bg-muted text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <TbExternalLink className="inline" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Add SVG code" placement="bottom">
                    <button
                      onClick={() => setAddMode("svg")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        addMode === "svg"
                          ? "bg-muted text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <TbCode className="inline" />
                    </button>
                  </Tooltip>
                  {canUseImageGenerate && (
                    <Tooltip content="Generate with AI" placement="bottom">
                      <button
                        onClick={() => setAddMode("ai")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          addMode === "ai"
                            ? "bg-muted text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <TbSparkles className="inline" />
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip
                    content={
                      hasImageInClipboard
                        ? "Paste image from clipboard (Ctrl+V / Cmd+V)"
                        : "No image in clipboard"
                    }
                    placement="bottom"
                  >
                    <button
                      onClick={handlePasteClick}
                      disabled={!hasImageInClipboard || uploading}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        hasImageInClipboard && !uploading
                          ? "text-muted-foreground hover:text-foreground"
                          : "cursor-not-allowed text-muted-foreground"
                      }`}
                    >
                      <TbClipboard className="inline" />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Inline input for URL/SVG modes */}
              {addMode === "url" && (
                <div className="mt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      onKeyDown={e => e.key === "Enter" && handleAddUrl()}
                      autoFocus
                    />
                    <button
                      onClick={handleAddUrl}
                      disabled={!urlInput.trim() || uploading}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                    >
                      Add
                    </button>
                  </div>

                  {/* Save to CDN toggle */}
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="saveUrlToCdn"
                      checked={saveUrlToCdn}
                      onChange={e => setSaveUrlToCdn(e.target.checked)}
                      className="size-4 rounded-lg border-border bg-muted text-accent focus:ring-ring"
                    />
                    <label htmlFor="saveUrlToCdn" className="text-xs text-muted-foreground">
                      Save to CDN (downloads image to your account)
                    </label>
                  </div>

                  {/* Paste hint */}
                  <div className="mt-2 text-xs text-muted-foreground">
                    <TbInfoCircle className="mr-1 inline" /> Tip: You can also paste images directly
                    (Ctrl+V / Cmd+V) or use the clipboard button above!
                  </div>
                </div>
              )}

              {addMode === "svg" && (
                <div className="mt-2">
                  <div className="flex gap-2">
                    <textarea
                      value={svgInput}
                      onChange={e => setSvgInput(e.target.value)}
                      placeholder="<svg>...</svg>"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      rows={3}
                      autoFocus
                    />
                    <button
                      onClick={handleAddSvg}
                      disabled={!svgInput.trim()}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                    >
                      Add
                    </button>
                  </div>
                  <p className="ml-0.5 mt-1.5 text-xs text-muted-foreground">
                    Find SVGs @{" "}
                    <a
                      href="https://www.svgrepo.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary"
                    >
                      svgrepo.com
                    </a>
                  </p>
                </div>
              )}

              {/* AI Generation Mode */}
              {canUseImageGenerate && addMode === "ai" && (
                <div className="mt-2">
                  <div className="grid max-h-[400px] min-h-[300px] grid-cols-2 gap-4">
                    {/* Left half - Controls */}
                    <div className="space-y-4 overflow-y-auto pr-2">
                      <div className="space-y-3 rounded-lg bg-muted/30 p-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">
                            AI Model
                          </label>
                          <select
                            value={aiModel}
                            onChange={e => setAiModel(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="gpt-image-1">
                              GPT Image 1 (Best)
                            </option>
                            <option value="dall-e-3">
                              DALL-E 3 (Creative)
                            </option>
                            <option value="dall-e-2">
                              DALL-E 2 (Fast)
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-foreground">
                            Describe your image
                          </label>
                          <textarea
                            value={aiPrompt}
                            onChange={e => setAiPrompt(e.target.value)}
                            placeholder="A modern tech startup logo with clean lines and blue colors..."
                            className="w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                            rows={2}
                            autoFocus
                            onKeyDown={e => {
                              // Stop propagation to prevent editor shortcuts
                              e.stopPropagation();
                            }}
                          />
                        </div>

                        {aiError && (
                          <div className="rounded-lg border border-destructive bg-destructive/10 px-2 py-1 text-xs text-destructive">
                            {aiError}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleGenerateAiImage}
                            disabled={!aiPrompt.trim() || isGeneratingAi}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isGeneratingAi ? (
                              <>
                                <TbRefresh className="animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <TbSparkles />
                                Generate
                              </>
                            )}
                          </button>

                          {aiImagePreview && (
                            <button
                              onClick={handleSaveAiImage}
                              disabled={uploading}
                              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                            >
                              <TbPhoto />
                              Save
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex max-h-[120px] min-h-[80px] flex-wrap gap-1 overflow-auto rounded-lg border border-border bg-popover p-2">
                          {[
                            "Professional headshot, clean background",
                            "Minimalist logo, simple design",
                            "Product photography, white background",
                            "Tech startup logo, modern",
                            "Food photography, appetizing",
                            "Nature landscape, realistic",

                            "Hero banner, abstract gradient",
                            "Hero banner, geometric shapes",
                            "Isometric illustration, tech office",
                            "Flat illustration, friendly characters",
                            "3D abstract shapes, soft lighting",
                            "Abstract waves, subtle gradient",
                            "Glassmorphism background, soft blur",
                            "Neumorphism cards, soft shadows",
                            "Gradient mesh background, vibrant",
                            "Pattern background, subtle dots",
                            "Pattern background, diagonal lines",
                            "Organic blob shapes, pastel",
                            "Minimal abstract texture, noise",
                            "Dark mode abstract background",

                            "App screenshot mockup, laptop",
                            "Mobile app mockup, phone in hand",
                            "Dashboard UI, clean analytics",
                            "SaaS dashboard, metrics and charts",
                            "Ecommerce product grid, minimal",
                            "Pricing table illustration, modern",
                            "Testimonial cards, portraits",
                            "FAQ illustration, outline style",
                            "404 illustration, playful",

                            "Team group photo, studio lighting",
                            "Founder portrait, natural light",
                            "Coworking office, bright and airy",
                            "Startup workspace, laptops and plants",
                            "Conference room, glass walls",
                            "Customer support, headset smiling",
                            "Remote work desk, aesthetic",
                            "Brainstorm session, sticky notes",
                            "Casual meeting, modern office",

                            "Fitness trainer, gym environment",
                            "Yoga class, calm studio",
                            "Healthcare doctor portrait, clinic",
                            "Dentist office, clean and bright",
                            "Real estate exterior, modern home",
                            "Real estate interior, staged living room",
                            "Construction site, safety gear",
                            "Restaurant plated dish, top down",
                            "Coffee shop, latte art",
                            "Hotel lobby, boutique style",
                            "Travel destination, scenic city",
                            "Education classroom, modern",
                            "Nonprofit volunteers, community event",
                            "Law firm, professional office",
                            "Finance advisor, trustworthy portrait",
                            "Beauty product flat lay, soft light",
                            "Barber shop, lifestyle portrait",

                            "Product hero, floating shadows",
                            "Product lifestyle, on desk",
                            "Product detail macro, texture",
                            "Clothing on mannequin, studio",
                            "Sneaker on pedestal, dramatic",
                            "Jewelry on silk, elegant",
                            "Cosmetics smear swatches, clean",
                            "Packaging box mockup, premium",
                            "Bottle mockup, glossy label",
                            "Book cover mockup, minimal",

                            "Icon set, outlined, consistent",
                            "Icon set, filled, rounded",
                            "App store badges, minimal style",
                            "Social media preview image, bold title",
                            "Email newsletter header, clean",
                            "Call to action button set, variants",
                            "Steps illustration, 1–2–3 process",
                            "Roadmap timeline, modern",
                            "Onboarding illustrations, friendly",
                            "Security shield icon, trustworthy",

                            "Map pin illustration, minimal",
                            "Location hero, aerial city",
                            "Customer collage, diverse portraits",
                            "Before and after, product result",
                            "Award badge, premium gold",
                            "Trust badges, payment logos style",
                            "Contact section, phone and chat",
                            "Newsletter signup, envelope graphic",
                            "Careers banner, happy team",
                            "Coming soon, teaser background",
                          ].map(template => (
                            <button
                              key={template}
                              onClick={() => setAiPrompt(template)}
                              className="text-xxs whitespace-nowra inline-block rounded-lg border border-border bg-background px-1 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              {template}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right half - Image Preview */}
                    <div className="flex flex-col">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-foreground">Preview</h3>
                        <div className="flex items-center gap-2">
                          {aiImagePreview && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Scale:</span>
                              <input
                                type="range"
                                min="25"
                                max="300"
                                value={aiImageScale}
                                onChange={e => setAiImageScale(Number(e.target.value))}
                                className="h-1 w-16 cursor-pointer appearance-none rounded-lg bg-muted"
                              />
                              <span className="w-8 text-xs text-muted-foreground">
                                {aiImageScale}%
                              </span>
                              <button
                                onClick={resetImageView}
                                className="px-1 text-xs text-muted-foreground hover:text-foreground"
                                title="Reset view"
                              >
                                Reset
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30"
                        onWheel={handleWheel}
                      >
                        {aiImagePreview ? (
                          <div className="relative size-full overflow-hidden rounded-lg bg-muted">
                            <Image
                              src={aiImagePreview}
                              alt="AI Generated Preview"
                              fill
                              className={`origin-center select-none rounded-lg object-contain shadow-sm ${
                                isDragging ? "cursor-grabbing" : "cursor-grab"
                              }`}
                              style={{
                                transform: `scale(${aiImageScale / 100}) translate(${aiImagePosition.x}px, ${aiImagePosition.y}px)`,
                              }}
                              onMouseDown={handleImageMouseDown}
                              onMouseMove={handleImageMouseMove}
                              onMouseUp={handleImageMouseUp}
                              onMouseLeave={handleImageMouseUp}
                              draggable={false}
                              placeholder="blur"
                              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                            />
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <div className="mx-auto mb-2 w-fit rounded-full bg-muted/50 p-3">
                              <TbPhoto className="text-4xl" />
                            </div>
                            <p className="text-base font-medium">No image generated yet</p>
                            <p className="mt-1 text-xs">Enter a prompt and click Generate</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hidden file input for upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/avif,image/svg+xml"
                multiple
                onChange={e => handleUpload(e.target.files)}
                className="hidden"
              />

              {/* Hidden file input for replace */}
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/avif,image/svg+xml"
                onChange={e => handleReplaceMedia(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Content Grid */}
            <div
              className={`scrollbar relative flex-1 overflow-y-auto bg-background transition-colors ${
                isDragOver ? "border-2 border-dashed border-accent bg-accent" : ""
              } ${uploadProgress ? "pt-16" : "p-3"}`}
              {...dropProps}
            >
              {/* Drag and drop overlay */}
              {isDragOver && (
                <div className="absolute inset-0 z-40 flex items-center justify-center rounded-lg border-2 border-dashed border-accent bg-background/75 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-4 text-accent-foreground">
                    <TbUpload className="text-6xl" />
                    <div className="text-center">
                      <p className="text-xl font-semibold">Drop files here</p>
                      <p className="text-sm opacity-75">Release to upload multiple images</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload progress bar */}
              {uploadProgress && (
                <div className="absolute inset-x-0 top-0 z-30 border-b border-border bg-background p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent"></div>
                      <span className="text-sm font-medium text-foreground">
                        Uploading {uploadProgress.current + 1} of {uploadProgress.total} files
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(((uploadProgress.current + 1) / uploadProgress.total) * 100)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-2 h-2 w-full rounded-full bg-muted text-muted-foreground">
                    <div
                      className="h-2 rounded-full bg-accent text-accent-foreground transition-all duration-300 ease-out"
                      style={{
                        width: `${((uploadProgress.current + 1) / uploadProgress.total) * 100}%`,
                      }}
                    ></div>
                  </div>

                  {/* Current file */}
                  {uploadProgress.currentFile && (
                    <div className="truncate text-xs text-muted-foreground">
                      <TbFolder className="mr-1 inline" /> {uploadProgress.currentFile}
                    </div>
                  )}

                  {/* Completed files */}
                  {uploadProgress.completedFiles.length > 0 && (
                    <div className="mt-1 text-xs text-secondary-foreground">
                      <TbCheck className="mr-1 inline" /> Completed:{" "}
                      {uploadProgress.completedFiles.join(", ")}
                    </div>
                  )}
                </div>
              )}

              {filteredMedia.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  {searchQuery ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center"
                    >
                      <div className="mb-4 rounded-full bg-muted p-6">
                        <TbSearch className="text-5xl text-muted-foreground" />
                      </div>
                      <p className="mb-2 text-xl font-semibold text-foreground">No media found</p>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your search term or filter
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex max-w-2xl flex-col items-center"
                    >
                      {/* Heading */}
                      <h3 className="mb-2 text-2xl font-bold text-foreground">
                        Your media library is empty
                      </h3>
                      <p className="mb-8 text-sm text-muted-foreground">
                        Start building your visual content collection
                      </p>

                      {/* Feature Cards */}
                      <div className="mb-8 grid w-full gap-3 sm:grid-cols-3">
                        <button
                          onClick={() => {
                            setAddMode("upload");
                            fileInputRef.current?.click();
                          }}
                          className="rounded-lg border border-border bg-card/50 p-4 text-left backdrop-blur-sm transition-all hover:scale-105 hover:border-primary hover:bg-card hover:shadow-lg active:scale-100"
                        >
                          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                            <TbUpload className="text-xl text-primary" />
                          </div>
                          <h4 className="mb-1 text-sm font-semibold text-foreground">
                            Upload Files
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Drag & drop or click to upload images
                          </p>
                        </button>

                        <button
                          onClick={() => {
                            setAddMode("url");
                          }}
                          className="rounded-lg border border-border bg-card/50 p-4 text-left backdrop-blur-sm transition-all hover:scale-105 hover:border-primary hover:bg-card hover:shadow-lg active:scale-100"
                        >
                          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                            <TbExternalLink className="text-xl text-primary" />
                          </div>
                          <h4 className="mb-1 text-sm font-semibold text-foreground">Use URLs</h4>
                          <p className="text-xs text-muted-foreground">
                            Link to images hosted anywhere
                          </p>
                        </button>

                        <button
                          onClick={() => {
                            setAddMode("svg");
                          }}
                          className="rounded-lg border border-border bg-card/50 p-4 text-left backdrop-blur-sm transition-all hover:scale-105 hover:border-primary hover:bg-card hover:shadow-lg active:scale-100"
                        >
                          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                            <TbCode className="text-xl text-primary" />
                          </div>
                          <h4 className="mb-1 text-sm font-semibold text-foreground">Paste SVG</h4>
                          <p className="text-xs text-muted-foreground">
                            Add inline SVG code directly
                          </p>
                        </button>
                      </div>

                      {/* Quick Tips */}
                      <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <TbInfoCircle className="text-base text-primary" />
                          <span>Paste images from your clipboard anywhere in this window</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TbInfoCircle className="text-base text-primary" />
                          <span>Drag and drop multiple files at once for batch upload</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div
                  className={
                    viewMode === "cards"
                      ? "grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5"
                      : "flex flex-col"
                  }
                >
                  {filteredMedia.map(media => (
                    <div
                      key={media.id}
                      className={`group relative cursor-pointer transition-all ${
                        viewMode === "cards"
                          ? `overflow-hidden rounded-lg border border-border bg-card hover:border-primary hover:shadow-md ${
                              selectedMedia === media.id
                                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                : ""
                            }`
                          : `border-b border-border hover:bg-muted/50 ${
                              selectedMedia === media.id ? "bg-primary/5" : ""
                            }`
                      } ${deletingMedia.includes(media.id) ? "pointer-events-none opacity-60" : ""}`}
                      onClick={() => {
                        setSelectedMedia(media.id);
                      }}
                      onDoubleClick={() => {
                        if (selectionMode && onSelect) {
                          onSelect(media.id);
                          onClose();
                        }
                      }}
                    >
                      {/* Deleting overlay */}
                      {deletingMedia.includes(media.id) && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-destructive/20 backdrop-blur-sm">
                          <div className="flex flex-col items-center gap-2">
                            <TbLoader2 className="size-8 animate-spin text-destructive" />
                            <span className="text-xs font-medium text-destructive">
                              Deleting...
                            </span>
                          </div>
                        </div>
                      )}
                      {viewMode === "cards" ? (
                        <div className="flex flex-col">
                          {/* Card View - Thumbnail */}
                          <motion.div
                            key={`card-${media.id}`}
                            className="relative aspect-square overflow-hidden bg-muted bg-cover bg-center"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                            style={{
                              backgroundImage:
                                media.type === "url"
                                  ? `url("${media.metadata?.url}")`
                                  : media.type === "svg"
                                    ? undefined
                                    : `url(${getCdnUrl(media.cdnId || media.id, { width: 400, format: "auto" })})`,
                            }}
                          >
                            {/* File size in bottom-right corner */}
                            {media.metadata?.size && (
                              <div className="absolute bottom-1 right-1 rounded bg-background/90 px-1 py-0.5 text-[10px] text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                                {formatFileSize(media.metadata.size)}
                              </div>
                            )}

                            {/* Dimensions in bottom-right corner */}
                            {media.metadata?.dimensions && (
                              <div className="absolute bottom-1 right-1 rounded bg-background/90 px-1 py-0.5 text-[10px] text-foreground opacity-100 transition-opacity group-hover:opacity-0">
                                {formatDimensions(media.metadata.dimensions)}
                              </div>
                            )}

                            {/* Variant indicator */}
                            {media.metadata?.isVariant && (
                              <div className="absolute bottom-1 left-1 flex items-center justify-center rounded bg-primary px-1 py-0.5 text-[10px] text-primary-foreground">
                                <TbCrop className="size-3" />
                              </div>
                            )}

                            {media.type === "svg" && (
                              <div
                                className="flex size-full items-center justify-center p-2"
                                dangerouslySetInnerHTML={{
                                  __html: media.metadata?.svg || "",
                                }}
                              />
                            )}
                          </motion.div>

                          {/* Card View - Name/Title */}
                          <div className="bg-accent p-1.5 text-accent-foreground">
                            <p className="truncate text-xs font-medium text-foreground">
                              {media.metadata?.title || media.id}
                            </p>
                            {sortField === "createdAt" && (
                              <p className="truncate text-[10px] text-muted-foreground">
                                {media.metadata?.description ||
                                  (media.uploadedAt
                                    ? new Date(media.uploadedAt).toLocaleDateString()
                                    : "Unknown")}
                              </p>
                            )}
                            {sortField === "order" && (
                              <p className="text-[10px] text-muted-foreground">
                                Order: {media.order || 0}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* List View - Horizontal Layout */}
                          <div className="flex items-center gap-4 px-3 py-2">
                            {/* Thumbnail */}
                            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted">
                              {media.type === "url" ? (
                                <div className="relative size-full bg-muted">
                                  <Image
                                    key={`${media.id}-url-${media.uploadedAt || 0}`}
                                    src={media.metadata?.url}
                                    alt={media.metadata?.alt || media.id}
                                    fill
                                    className="object-cover"
                                    onError={e => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                    placeholder="blur"
                                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                                  />
                                </div>
                              ) : media.type === "svg" ? (
                                <div
                                  className="size-full p-1"
                                  dangerouslySetInnerHTML={{
                                    __html: media.metadata?.svg || "",
                                  }}
                                />
                              ) : (
                                <div className="relative size-full bg-muted">
                                  <Image
                                    key={`${media.id}-cdn-${media.uploadedAt || 0}`}
                                    src={getCdnUrl(media.cdnId || media.id, {
                                      width: 100,
                                      format: "auto",
                                    })}
                                    alt={media.metadata?.alt || media.id}
                                    fill
                                    className="object-cover"
                                    loading="lazy"
                                    onError={e => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                    placeholder="blur"
                                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                                  />
                                </div>
                              )}
                            </div>

                            {/* File info - Name */}
                            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                                {media.metadata?.title || media.id}
                              </p>
                              {media.metadata?.isVariant && (
                                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  Variant
                                </span>
                              )}
                            </div>

                            {/* Dimensions */}
                            {media.metadata?.dimensions && (
                              <div className="hidden shrink-0 text-xs text-muted-foreground sm:block sm:w-24">
                                {formatDimensions(media.metadata.dimensions)}
                              </div>
                            )}

                            {/* File size */}
                            {media.metadata?.size && (
                              <div className="hidden shrink-0 text-xs text-muted-foreground sm:block sm:w-20">
                                {formatFileSize(media.metadata.size)}
                              </div>
                            )}

                            {/* Date/Order */}
                            <div className="hidden shrink-0 text-xs text-muted-foreground md:block md:w-24">
                              {sortField === "createdAt"
                                ? media.uploadedAt
                                  ? new Date(media.uploadedAt).toLocaleDateString()
                                  : "Unknown"
                                : sortField === "order"
                                  ? `Order: ${media.order || 0}`
                                  : ""}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Action Buttons (on hover) */}
                      <div
                        className={`absolute ${viewMode === "cards" ? "right-1 top-1" : "right-3 top-1/2 -translate-y-1/2"} flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${selectedMedia === media.id ? "opacity-100" : "opacity-0"}`}
                      >
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setPreviewMedia(media.id);
                          }}
                          className="rounded-lg border border-border bg-background p-1.5 text-primary shadow-lg transition-colors hover:bg-muted"
                          title="Preview image"
                        >
                          <TbEye className="text-sm" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setCropMedia(media);
                          }}
                          className="rounded-lg border border-border bg-background p-1.5 text-primary shadow-lg transition-colors hover:bg-muted"
                          title="Crop/Resize image"
                        >
                          <TbCrop className="text-sm" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setReplacingMedia(media.id);
                            replaceInputRef.current?.click();
                          }}
                          className="rounded-lg border border-border bg-background p-1.5 text-primary shadow-lg transition-colors hover:bg-muted"
                          title="Replace image"
                        >
                          <TbRefresh className="text-sm" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            openEditModal(media);
                          }}
                          className="rounded-lg border border-border bg-background p-1.5 text-primary shadow-lg transition-colors hover:bg-muted"
                          title="Edit metadata"
                        >
                          <TbEdit className="text-sm" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(media.id);
                          }}
                          className="rounded-lg border border-border bg-background p-1.5 text-destructive shadow-lg transition-colors hover:bg-destructive hover:text-destructive-foreground"
                          title="Delete"
                        >
                          <TbTrash className="text-sm" />
                        </button>
                      </div>

                      {/* Metadata indicator */}
                      {(media.metadata?.alt || media.metadata?.description) && (
                        <div className="absolute bottom-10 left-1">
                          <div className="size-2 rounded-full bg-secondary"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Select Button - appears when image is selected */}
              {selectedMedia && selectionMode && onSelect && (
                <div className="absolute bottom-4 right-4">
                  <button
                    onClick={() => {
                      onSelect(selectedMedia);
                      onClose();
                    }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
                  >
                    Select
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Edit Metadata Modal */}
          {editingMedia && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-background/60 text-muted-foreground backdrop-blur-sm"
              onClick={closeEditModal}
            >
              <motion.div
                key="edit-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={e => e.stopPropagation()}
                className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-border p-6">
                  <h3 className="text-xl font-bold text-foreground">Edit Media</h3>
                  <button
                    onClick={closeEditModal}
                    className="text-xl text-muted-foreground hover:text-foreground"
                  >
                    <TbX />
                  </button>
                </div>

                <div className="scrollbar relative flex-1 space-y-4 overflow-y-auto p-6">
                  {/* Preview */}
                  <div className="flex items-center gap-4 rounded-lg border border-border bg-muted p-4 text-muted-foreground">
                    {editingMedia.type === "url" ? (
                      <div className="relative size-24 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={editingMedia.metadata?.url}
                          alt={editingMedia.metadata?.alt || "Preview"}
                          width={96}
                          height={96}
                          className="object-cover"
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                        />
                      </div>
                    ) : editingMedia.type === "svg" ? (
                      <div
                        className="flex size-24 items-center justify-center rounded-lg border border-border"
                        dangerouslySetInnerHTML={{
                          __html: editingMedia.metadata?.svg || "",
                        }}
                      />
                    ) : (
                      <div className="relative size-24 overflow-hidden rounded-lg bg-muted">
                        <Image
                          key={`${editingMedia.id}-${editingMedia.uploadedAt || 0}`}
                          src={getCdnUrl(editingMedia.cdnId || editingMedia.id, {
                            width: 200,
                            format: "auto",
                          })}
                          alt={editingMedia.metadata?.alt || "Preview"}
                          width={96}
                          height={96}
                          className="object-cover"
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-mono text-sm text-muted-foreground">{editingMedia.id}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Type: {editingMedia.type || "cdn"}
                      </p>
                      {editingMedia.metadata?.size && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Size: {formatFileSize(editingMedia.metadata.size)}
                        </p>
                      )}
                      {editingMedia.metadata?.dimensions && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Dimensions: {formatDimensions(editingMedia.metadata.dimensions)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
                  {/* URL field for URL type - show first */}
                  {editingMedia.type === "url" && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        Image URL <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={editingMedia.metadata.url || ""}
                        onChange={e =>
                          setEditingMedia({
                            ...editingMedia,
                            metadata: {
                              ...editingMedia.metadata,
                              url: e.target.value,
                            },
                          })
                        }
                        placeholder="https://example.com/image.jpg"
                        className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}

                  {/* SVG field for SVG type - show first */}
                  {editingMedia.type === "svg" && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        SVG Code <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        value={editingMedia.metadata.svg || ""}
                        onChange={e =>
                          setEditingMedia({
                            ...editingMedia,
                            metadata: {
                              ...editingMedia.metadata,
                              svg: e.target.value,
                            },
                          })
                        }
                        placeholder="<svg>...</svg>"
                        className="w-full rounded-lg border border-border bg-background px-4 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        rows={6}
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      File Name
                    </label>
                    <input
                      type="text"
                      value={editingMedia.metadata.title}
                      onChange={e =>
                        setEditingMedia({
                          ...editingMedia,
                          metadata: {
                            ...editingMedia.metadata,
                            title: e.target.value,
                          },
                        })
                      }
                      placeholder="Enter file name"
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Alt Text <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingMedia.metadata.alt}
                      onChange={e =>
                        setEditingMedia({
                          ...editingMedia,
                          metadata: {
                            ...editingMedia.metadata,
                            alt: e.target.value,
                          },
                        })
                      }
                      placeholder="Describe the image for accessibility"
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Important for accessibility and SEO
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Description
                    </label>
                    <textarea
                      value={editingMedia.metadata.description}
                      onChange={e =>
                        setEditingMedia({
                          ...editingMedia,
                          metadata: {
                            ...editingMedia.metadata,
                            description: e.target.value,
                          },
                        })
                      }
                      placeholder="Additional details about this media"
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* AI Metadata Generation */}
                  {canUseImageAnalyze && editingMedia.type !== "svg" && (
                    <div className="border-t border-border pt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">
                          AI Metadata Generation
                        </label>
                        <button
                          onClick={handleGenerateMetadata}
                          disabled={isGeneratingMetadata}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isGeneratingMetadata
                              ? "cursor-not-allowed bg-muted text-muted-foreground"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          }`}
                        >
                          {isGeneratingMetadata ? (
                            <>
                              <TbLoader2 className="size-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <TbSparkles className="size-4" />
                              Generate with AI
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 border-t border-border bg-muted p-6 text-muted-foreground">
                  <button
                    onClick={closeEditModal}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Button clicked!", savingMetadata);
                      saveEditedMetadata();
                    }}
                    disabled={savingMetadata !== "idle"}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-primary-foreground transition-all ${
                      savingMetadata === "saving"
                        ? "cursor-not-allowed bg-primary/60 opacity-60"
                        : savingMetadata === "saved"
                          ? "bg-primary"
                          : "bg-primary hover:bg-primary/90"
                    }`}
                  >
                    {savingMetadata === "saving" ? (
                      <>
                        <TbLoader2 className="animate-spin" />
                        Saving...
                      </>
                    ) : savingMetadata === "saved" ? (
                      <>
                        <TbCheck />
                        Saved
                      </>
                    ) : (
                      <>
                        <TbEdit />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Image Preview Modal */}
      {previewMedia &&
        (() => {
          const media = filteredMedia.find(m => m.id === previewMedia);
          if (!media) return null;

          const currentIndex = filteredMedia.findIndex(m => m.id === previewMedia);
          const hasPrevious = currentIndex > 0;
          const hasNext = currentIndex < filteredMedia.length - 1;

          return (
            <motion.div
              key="preview-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-9999 flex items-center justify-center bg-black/90 backdrop-blur-sm"
              onClick={() => setPreviewMedia(null)}
            >
              {/* Close button */}
              <button
                onClick={() => setPreviewMedia(null)}
                className="absolute right-4 top-4 z-10 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                title="Close (ESC)"
              >
                <TbX className="size-6" />
              </button>

              {/* Previous button */}
              {hasPrevious && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handlePreviewPrevious();
                  }}
                  className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                  title="Previous (←)"
                >
                  <TbChevronLeft className="size-8" />
                </button>
              )}

              {/* Next button */}
              {hasNext && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handlePreviewNext();
                  }}
                  className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
                  title="Next (→)"
                >
                  <TbChevronRight className="size-8" />
                </button>
              )}

              {/* Image container */}
              <div
                className="relative max-h-[90vh] max-w-[90vw]"
                onClick={e => e.stopPropagation()}
              >
                {media.type === "svg" ? (
                  <div
                    className="flex max-h-[90vh] max-w-[90vw] items-center justify-center bg-white/5 p-8 backdrop-blur-sm"
                    dangerouslySetInnerHTML={{
                      __html: media.metadata?.svg || "",
                    }}
                  />
                ) : (
                  <div className="relative max-h-[90vh] max-w-[90vw]">
                    <Image
                      src={
                        media.type === "url"
                          ? media.metadata?.url
                          : getCdnUrl(media.cdnId || media.id, { width: 2000, format: "auto" })
                      }
                      alt={media.metadata?.alt || media.metadata?.title || media.id}
                      width={media.metadata?.dimensions?.width || 1200}
                      height={media.metadata?.dimensions?.height || 800}
                      className="max-h-[90vh] max-w-[90vw] object-contain"
                      quality={90}
                    />
                  </div>
                )}

                {/* Image info overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-4 text-white">
                  <h3 className="text-lg font-semibold">{media.metadata?.title || media.id}</h3>
                  {media.metadata?.description && (
                    <p className="mt-1 text-sm text-white/80">{media.metadata.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/60">
                    {media.metadata?.dimensions && (
                      <span>{formatDimensions(media.metadata.dimensions)}</span>
                    )}
                    {media.metadata?.size && <span>{formatFileSize(media.metadata.size)}</span>}
                    {media.uploadedAt && (
                      <span>{new Date(media.uploadedAt).toLocaleDateString()}</span>
                    )}
                    <span>
                      {currentIndex + 1} / {filteredMedia.length}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}

      {/* Image Crop Modal */}
      <ImageCropModal
        key="image-crop-modal"
        isOpen={cropMedia !== null}
        onClose={() => setCropMedia(null)}
        media={cropMedia}
        onSave={handleSaveCroppedImage}
        settings={settings}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        key="delete-confirm-dialog"
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, mediaId: null })}
        onConfirm={confirmDelete}
        title="Delete Media"
        message="Are you sure you want to delete this media item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* AVIF Conversion Dialog */}
      <ConfirmDialog
        key="avif-convert-dialog"
        isOpen={conversionDialog.isOpen}
        onClose={() => setConversionDialog({ isOpen: false, file: null })}
        onConfirm={handleConvertAndUpload}
        title="Convert AVIF to JPEG?"
        message={`Your CDN doesn't support AVIF uploads. Would you like to convert "${conversionDialog.file?.name}" to JPEG and upload it?`}
        confirmText="Convert & Upload"
        cancelText="Cancel"
      />
    </AnimatePresence>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
};
