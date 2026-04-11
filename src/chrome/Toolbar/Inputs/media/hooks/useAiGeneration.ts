import { ROOT_NODE, useEditor } from "@craftjs/core";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { getCdnUrl } from "utils/cdn";
import { getImageDimensionsFromFile } from "utils/imageDimensions";
import { registerMediaWithBackground } from "utils/lib";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { GetSignedUrl, SaveMedia } from "../../../../Viewport/lib";
import { useSDK } from "../../../../../context";
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
  const { config } = useSDK();
  const { status: authStatus } = useSession();
  const analyzeImageHandler = config.aiMediaHandlers?.analyzeImage;
  const generateImageHandler = config.aiMediaHandlers?.generateImage;
  const baseAiAuth = useAiEnabled() && authStatus === "authenticated";
  const canUseImageAnalyze = baseAiAuth && !!analyzeImageHandler;
  const canUseImageGenerate = baseAiAuth && !!generateImageHandler;

  // ─── AI generation state ───
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState("");
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [aiOptimizedPrompt, setAiOptimizedPrompt] = useState<string | null>(null);
  const [aiClaudeUsage, setAiClaudeUsage] = useState<AiUsage | null>(null);
  const [aiModel, setAiModel] = useState("gpt-image-1");

  // ─── Preview pan/zoom state ───
  const [aiImageScale, setAiImageScale] = useState(100);
  const [aiImagePosition, setAiImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // ─── Metadata generation (for edit modal) ───
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);

  const handleGenerateMetadata = async (editingMedia: MediaItem) => {
    setIsGeneratingMetadata(true);
    try {
      let imageUrl: string;
      if (editingMedia.type === "url") {
        imageUrl = editingMedia.metadata?.url || "";
      } else if (editingMedia.type === "svg") {
        throw new Error("AI metadata generation is not available for SVG images");
      } else {
        imageUrl = getCdnUrl(editingMedia.cdnId || editingMedia.id, { width: 800, format: "auto" });
      }

      if (!imageUrl) throw new Error("No image URL available for analysis");
      if (!analyzeImageHandler) throw new Error("Image analysis is not configured");

      const rootNode = query.node(ROOT_NODE).get();
      const rp = rootNode?.data?.props as Record<string, unknown> | undefined;
      const analysis = await analyzeImageHandler({
        imageUrl,
        designNotes: typeof rp?.designNotes === "string" ? rp.designNotes : undefined,
        designTags: Array.isArray(rp?.designTags) ? (rp.designTags as string[]) : undefined,
      });
      if (!analysis) throw new Error("Failed to analyze image");

      return {
        title: (analysis as Record<string, string>).fileName,
        alt: (analysis as Record<string, string>).altText,
        description: (analysis as Record<string, string>).seoDescription,
      };
    } catch (error: unknown) {
      alert(`Failed to generate metadata: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  // ─── AI image generation ───

  const handleGenerateAiImage = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    setAiError("");
    setAiSuccess("");
    setAiImagePreview(null);
    setAiClaudeUsage(null);

    try {
      const rootNode = query.node(ROOT_NODE).get();
      const rp = rootNode?.data?.props as Record<string, unknown> | undefined;

      if (!generateImageHandler) throw new Error("Image generation is not configured");

      const data = await generateImageHandler({
        prompt: aiPrompt,
        width: 1024,
        height: 1024,
        model: aiModel,
        designNotes: typeof rp?.designNotes === "string" ? rp.designNotes : undefined,
        designTags: Array.isArray(rp?.designTags) ? (rp.designTags as string[]) : undefined,
      });

      const result = data as Record<string, unknown>;
      if (!result?.success || !result.imageUrl) {
        throw new Error((result?.error as string) || "No image generated");
      }

      setAiImagePreview(result.imageUrl as string);
      setAiOptimizedPrompt(result.optimizedPrompt as string | null);
      setAiClaudeUsage(result.claudeUsage as AiUsage | null);
      setAiSuccess("Image generated successfully!");
    } catch (error: unknown) {
      setAiError((error as Error).message || "Failed to generate image");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSaveAiImage = async () => {
    if (!aiImagePreview) return;
    setUploading(true);

    try {
      const response = await fetch(aiImagePreview);
      const blob = await response.blob();
      const file = new File([blob], `ai-generated-${Date.now()}.png`, { type: "image/png" });

      const geturl = await GetSignedUrl();
      const signedURL = (geturl as Record<string, Record<string, string>>)?.result?.uploadURL;
      if (!signedURL) throw new Error("Failed to get upload URL");

      const res = await SaveMedia(file, signedURL);
      const mediaId = (res as Record<string, Record<string, string>>)?.result?.id;
      if (!mediaId) throw new Error("Failed to upload to CDN");

      registerMediaWithBackground(query, actions, mediaId, "cdn", "media-manager");

      try {
        const dimensions = await getImageDimensionsFromFile(file);
        actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
          const pageMedia = (props.pageMedia || []) as MediaItem[];
          const existingMedia = pageMedia.find(m => m.id === mediaId);
          if (existingMedia) {
            existingMedia.metadata = {
              ...existingMedia.metadata,
              title: `AI Generated: ${aiPrompt}`,
              alt: aiPrompt,
              size: file.size,
              dimensions: { width: dimensions.width, height: dimensions.height, aspectRatio: dimensions.aspectRatio },
              aiGenerated: true,
              aiPrompt,
            };
          }
        });
        const imageUrl = getCdnUrl(mediaId, { width: 800, format: "auto" });
        generateMetadataForImage(mediaId, imageUrl);
      } catch {
        actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
          const pageMedia = (props.pageMedia || []) as MediaItem[];
          const existingMedia = pageMedia.find(m => m.id === mediaId);
          if (existingMedia) {
            existingMedia.metadata = {
              ...existingMedia.metadata,
              title: `AI Generated: ${aiPrompt}`,
              alt: aiPrompt,
              size: file.size,
              aiGenerated: true,
              aiPrompt,
            };
          }
        });
        const imageUrl = getCdnUrl(mediaId, { width: 800, format: "auto" });
        generateMetadataForImage(mediaId, imageUrl);
      }

      refreshMediaList();
      setAiError("");
      setAiSuccess("Image saved successfully!");
      setTimeout(() => setAiSuccess(""), 3000);
    } catch (error: unknown) {
      setAiError(`Failed to save image: ${(error as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  // ─── Preview pan/zoom ───

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
    // Capabilities
    canUseImageAnalyze,
    canUseImageGenerate,
    // AI state
    aiPrompt,
    aiModel,
    aiImagePreview,
    aiOptimizedPrompt,
    aiClaudeUsage,
    aiImageScale,
    aiImagePosition,
    aiError,
    aiSuccess,
    isGeneratingAi,
    isDragging,
    isGeneratingMetadata,
    // Setters
    setAiPrompt,
    setAiModel,
    setAiImageScale,
    // Handlers
    handleGenerateAiImage,
    handleSaveAiImage,
    handleGenerateMetadata,
    handleImageMouseDown,
    handleImageMouseMove,
    handleImageMouseUp,
    handleWheel,
    resetImageView,
  };
}

export type UseAiGenerationReturn = ReturnType<typeof useAiGeneration>;
