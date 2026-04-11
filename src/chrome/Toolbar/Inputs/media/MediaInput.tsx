import { useEditor, useNode } from "@craftjs/core";
import { useState } from "react";
import { TbPhoto } from "react-icons/tb";
import { getCdnUrl } from "utils/cdn";
import { getMediaById, getMediaContent, registerMediaWithBackground } from "utils/lib";
import { ToolbarDashedButton } from "../../Helpers/ToolbarDashedButton";
import { ToolbarSection } from "../../ToolbarSection";
import { TailwindInput } from "../advanced/TailwindInput";
import { MediaManagerModal } from "./MediaManagerModal";

export const MediaInput = propa => {
  const props = { ...propa };
  const { props: nodeProps, id: componentId } = useNode(node => ({
    props: node.data.props,
    id: node.id,
  }));

  const {
    actions: { setProp },
  } = useNode();

  const { query, actions } = useEditor();

  const { propKey, typeKey, contentKey = "content", title = "Media" } = props;

  const [showMediaBrowser, setShowMediaBrowser] = useState(false);

  const handleBrowseSelect = (selectedMediaId: string) => {
    if (!selectedMediaId) return;

    const selectedMedia = getMediaById(query, selectedMediaId);

    setProp(_props => {
      _props[propKey] = selectedMediaId;
      _props[typeKey] = selectedMedia?.type || "cdn";
      // Clear direct URL / inline content when switching to library (mirrors handleContentUrlChange)
      if (contentKey !== propKey) {
        _props[contentKey] = null;
      }
    });

    // Don't override the media type - it's already registered with the correct type
    // Just update the component reference
    registerMediaWithBackground(
      query,
      actions,
      selectedMediaId,
      selectedMedia?.type || "cdn",
      componentId
    );

    setShowMediaBrowser(false);
  };

  const mediaId = nodeProps[propKey];
  const contentUrl = nodeProps[contentKey];
  const hasMedia = !!mediaId;
  const hasContentUrl = !!contentUrl && typeof contentUrl === "string" && contentUrl.startsWith("http");
  const selectedMedia = hasMedia ? getMediaById(query, mediaId) : null;
  const isSvg = selectedMedia?.type === "svg";
  const svgContent = isSvg ? selectedMedia?.metadata?.svg : null;

  // For preview, use optimized size for CDN images
  let imageUrl = null;
  if (hasMedia && !isSvg) {
    if (selectedMedia?.type === "cdn") {
      const cdnId = selectedMedia.cdnId || selectedMedia.id;
      imageUrl = getCdnUrl(cdnId, { width: 600, format: "auto" });
    } else {
      imageUrl = getMediaContent(query, mediaId);
    }
  } else if (hasContentUrl) {
    // Use content URL for preview when no media library item is selected
    imageUrl = contentUrl;
  }

  const handleClear = () => {
    setProp(_props => {
      _props[propKey] = null;
      _props[typeKey] = "cdn";
      _props[contentKey] = null; // Also clear content URL
    });
  };

  const handleContentUrlChange = (newUrl: string) => {
    setProp(_props => {
      _props[contentKey] = newUrl || null;
      // Clear media library selection when setting content URL
      if (newUrl) {
        _props[propKey] = null;
        _props[typeKey] = "cdn";
      }
    });
  };

  return (
    <>
      <ToolbarSection title={title} full={1} collapsible={props.collapsible}>
        <div className="space-y-2">
          {/* Preview if media exists or content URL exists */}
          {(hasMedia && (svgContent || imageUrl)) || (hasContentUrl && imageUrl) ? (
            <div className="relative">
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-base-100 p-2">
                {svgContent ? (
                  <div
                    className="flex size-full items-center justify-center text-base-content [&>svg]:size-full [&>svg]:max-h-full [&>svg]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                  />
                ) : imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="size-full rounded-lg object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>

              {/* Clear button - only show when media is set or content URL exists */}
              <button
                onClick={handleClear}
                className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-error text-xs font-bold text-error-content hover:bg-error/90"
                title="Clear media"
              >
                ×
              </button>
            </div>
          ) : null}


          {/* URL Input Field - only show when there's a content URL */}
          {hasContentUrl && (
            <div className="space-y-2">
              <label htmlFor="media-input-url" className="toolbar-label block font-medium">
                Image URL
              </label>
              <input
                id="media-input-url"
                type="url"
                value={contentUrl || ""}
                onChange={e => handleContentUrlChange(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="input px-3! py-2! placeholder:text-neutral-content"
              />
              <p className="text-xs text-neutral-content">
                Enter a direct image URL or use the media library below
              </p>
            </div>
          )}

          {/* Browse Media Library — dashed control (matches Add Action / font preset) */}
          <ToolbarDashedButton
            onClick={() => setShowMediaBrowser(true)}
            icon={<TbPhoto size={12} aria-hidden />}
          >
            {hasMedia ? "Change Media" : "Browse Media Library"}
          </ToolbarDashedButton>
        </div>

        <ToolbarSection
          title="Object Properties"
          nested
          collapsible
          defaultOpen={false}
          accordionPassive
        >
          <TailwindInput propKey="objectFit" label="Object Fit" prop="objectFit" type="select" />
          <TailwindInput propKey="objectPosition" label="Object Position" prop="objectPosition" type="select" />
        </ToolbarSection>

        <MediaManagerModal
          isOpen={showMediaBrowser}
          onClose={() => setShowMediaBrowser(false)}
          onSelect={handleBrowseSelect}
          selectionMode={true}
        />
      </ToolbarSection>
    </>
  );
};
