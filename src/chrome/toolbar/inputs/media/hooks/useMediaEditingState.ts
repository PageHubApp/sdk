import { ROOT_NODE } from "@craftjs/utils";
import { useEffect, useMemo, useState } from "react";
import { useAtomState } from "@zedux/react";
import { AssistantMediaMetadataResultAtom } from "@/utils/atoms";
import { getCdnUrl } from "@/utils/cdn";
import { updateMediaMetadata } from "@/utils/media/media";
import type {
  PageHubMediaEditAiActionsContext,
  PageHubMediaMetadataSuggestion,
} from "@/types";
import { cleanSvg, type MediaItem } from "../utils/media-helpers";
import type { useAiGeneration } from "./useAiGeneration";
import { sdkLog } from "../../../../../utils/logger";

interface UseMediaEditingStateArgs {
  query: any;
  actions: any;
  ai: ReturnType<typeof useAiGeneration>;
  designContext: { designNotes?: string; designTags?: string[] };
  refreshMediaList: () => void;
}

export function useMediaEditingState({
  query,
  actions,
  ai,
  designContext,
  refreshMediaList,
}: UseMediaEditingStateArgs) {
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [cropMedia, setCropMedia] = useState<MediaItem | null>(null);
  const [savingMetadata, setSavingMetadata] = useState<"idle" | "saving" | "saved">("idle");
  const [assistantMediaMetadataResult, setAssistantMediaMetadataResult] = useAtomState(
    AssistantMediaMetadataResultAtom
  );

  const openEditModal = (media: MediaItem) => {
    setEditingMedia({
      ...media,
      metadata: {
        alt: media.metadata?.alt || "",
        title: media.metadata?.title || "",
        description: media.metadata?.description || "",
        url: media.metadata?.url || "",
        svg: media.metadata?.svg || "",
        folderId: media.metadata?.folderId,
      },
    });
    setSavingMetadata("idle");
    ai.setMetadataError("");
  };

  const closeEditModal = () => {
    setEditingMedia(null);
    setSavingMetadata("idle");
    ai.setMetadataError("");
  };

  const saveEditedMetadata = async () => {
    if (!editingMedia) return;
    setSavingMetadata("saving");

    try {
      const metadata = { ...editingMedia.metadata };
      if (editingMedia.type === "svg" && metadata?.svg) {
        const cleaned = cleanSvg(metadata.svg);
        metadata.svg = cleaned;
        metadata.size = new Blob([cleaned]).size;
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      updateMediaMetadata(query, actions, editingMedia.id, metadata);
      refreshMediaList();
      setSavingMetadata("saved");
      setTimeout(() => setSavingMetadata("idle"), 2000);
    } catch (error) {
      sdkLog.error("Failed to save metadata:", error);
      setSavingMetadata("idle");
    }
  };

  const applyGeneratedMetadata = (metadata: PageHubMediaMetadataSuggestion) => {
    if (!editingMedia) return;
    setEditingMedia({
      ...editingMedia,
      metadata: {
        ...editingMedia.metadata,
        ...metadata,
      },
    });
  };

  const handleSaveCroppedImage = (croppedImage: MediaItem) => {
    actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
      const pageMedia = props.pageMedia as MediaItem[] | undefined;
      if (!pageMedia) return;
      props.pageMedia = [...pageMedia, croppedImage];
    });
    refreshMediaList();
    setCropMedia(null);
  };

  const analysisImageUrl = useMemo(() => {
    if (!editingMedia || editingMedia.type === "svg") return undefined;
    if (editingMedia.type === "url") return editingMedia.metadata?.url || undefined;
    return getCdnUrl(editingMedia.cdnId || editingMedia.id, { width: 800, format: "auto" });
  }, [editingMedia]);

  const mediaEditAiActionsContext: PageHubMediaEditAiActionsContext | null = editingMedia
    ? {
        media: {
          id: editingMedia.id,
          type: editingMedia.type,
          cdnId: editingMedia.cdnId,
          metadata: editingMedia.metadata,
        },
        imageUrl: analysisImageUrl,
        isGenerating: ai.isGeneratingMetadata,
        error: ai.metadataError,
        designNotes: designContext.designNotes,
        designTags: designContext.designTags,
        setGenerating: ai.setIsGeneratingMetadata,
        setError: ai.setMetadataError,
        applyMetadata: applyGeneratedMetadata,
      }
    : null;

  useEffect(() => {
    if (!assistantMediaMetadataResult || !editingMedia) return;
    if (assistantMediaMetadataResult.mediaId !== editingMedia.id) return;
    applyGeneratedMetadata({
      title: assistantMediaMetadataResult.title,
      alt: assistantMediaMetadataResult.alt,
      description: assistantMediaMetadataResult.description,
    });
    ai.setMetadataError("");
    setAssistantMediaMetadataResult(null);
  }, [
    assistantMediaMetadataResult,
    editingMedia,
    applyGeneratedMetadata,
    ai,
    setAssistantMediaMetadataResult,
  ]);

  return {
    editingMedia,
    setEditingMedia,
    cropMedia,
    setCropMedia,
    savingMetadata,
    openEditModal,
    closeEditModal,
    saveEditedMetadata,
    applyGeneratedMetadata,
    handleSaveCroppedImage,
    analysisImageUrl,
    mediaEditAiActionsContext,
  };
}
