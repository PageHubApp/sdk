import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useState } from "react";
import { getCdnUrl } from "@/utils/cdn";
import { registerMediaWithBackground } from "@/utils/lib";
import { MediaUploadError, uploadImageToCdn } from "@/utils/media/upload";
import type { AiUsage, MediaItem } from "../utils/media-helpers";

interface UseAiGenerationOptions {
  refreshMediaList: () => void;
  generateMetadataForImage: (mediaId: string, imageUrl: string) => void;
  setUploading: (v: boolean) => void;
}

export function useAiGeneration({
  refreshMediaList,
  generateMetadataForImage,
  setUploading,
}: UseAiGenerationOptions) {
  const { query, actions } = useEditor();

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [aiError, setAiError] = useState("");
  const [metadataError, setMetadataError] = useState("");
  const [aiSuccess, setAiSuccess] = useState("");
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [aiOptimizedPrompt, setAiOptimizedPrompt] = useState<string | null>(null);
  const [aiClaudeUsage, setAiClaudeUsage] = useState<AiUsage | null>(null);
  const [aiModel, setAiModel] = useState("gpt-image-1");

  const [aiImageScale, setAiImageScale] = useState(100);
  const [aiImagePosition, setAiImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const applyGeneratedImage = ({
    imageUrl,
    optimizedPrompt,
    usage,
  }: {
    imageUrl: string | null;
    optimizedPrompt?: string | null;
    usage?: AiUsage | null;
  }) => {
    setAiImagePreview(imageUrl);
    setAiOptimizedPrompt(optimizedPrompt ?? null);
    setAiClaudeUsage(usage ?? null);
  };

  const handleSaveAiImage = async (input?: { imageUrl?: string | null; prompt?: string }) => {
    const imageUrl = input?.imageUrl ?? aiImagePreview;
    const prompt = (input?.prompt ?? aiPrompt).trim();
    if (!imageUrl) return;

    setUploading(true);

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `ai-generated-${Date.now()}.png`, { type: "image/png" });

      const { mediaId, file: uploaded, width, height } = await uploadImageToCdn(file);

      registerMediaWithBackground(query, actions, mediaId, "cdn", "media-manager");

      actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
        const pageMedia = (props.pageMedia || []) as MediaItem[];
        const existingMedia = pageMedia.find(m => m.id === mediaId);
        if (existingMedia) {
          existingMedia.metadata = {
            ...existingMedia.metadata,
            title: prompt ? `AI Generated: ${prompt}` : "AI Generated Image",
            alt: prompt || "AI generated image",
            size: uploaded.size,
            ...(width && height
              ? { dimensions: { width, height, aspectRatio: width / height } }
              : {}),
            aiGenerated: true,
            aiPrompt: prompt || undefined,
          };
        }
      });

      const savedImageUrl = getCdnUrl(mediaId, { width: 800, format: "auto" });
      generateMetadataForImage(mediaId, savedImageUrl);
      refreshMediaList();
      setAiError("");
      setAiSuccess("Image saved successfully!");
      setTimeout(() => setAiSuccess(""), 3000);
    } catch (error: unknown) {
      const message = error instanceof MediaUploadError ? error.message : (error as Error)?.message;
      setAiError(`Failed to save image: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - aiImagePosition.x, y: e.clientY - aiImagePosition.y });
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setAiImagePosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleImageMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    setAiImageScale(prev => Math.max(25, Math.min(300, prev + delta)));
  };

  const resetImageView = () => {
    setAiImageScale(100);
    setAiImagePosition({ x: 0, y: 0 });
  };

  return {
    aiPrompt,
    aiModel,
    aiImagePreview,
    aiOptimizedPrompt,
    aiClaudeUsage,
    aiImageScale,
    aiImagePosition,
    aiError,
    metadataError,
    aiSuccess,
    isGeneratingAi,
    isDragging,
    isGeneratingMetadata,
    setAiPrompt,
    setAiModel,
    setAiImageScale,
    setAiError,
    setMetadataError,
    setAiSuccess,
    setIsGeneratingAi,
    setIsGeneratingMetadata,
    applyGeneratedImage,
    handleSaveAiImage,
    handleImageMouseDown,
    handleImageMouseMove,
    handleImageMouseUp,
    handleWheel,
    resetImageView,
  };
}

export type UseAiGenerationReturn = ReturnType<typeof useAiGeneration>;
