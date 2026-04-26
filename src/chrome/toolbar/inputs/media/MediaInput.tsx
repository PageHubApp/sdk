import { useEditor, useNode } from "@craftjs/core";
import { useState } from "react";
import { TbPhoto } from "react-icons/tb";
import { getCdnUrl } from "@/utils/cdn";
import { getMediaById, getMediaContent, registerMediaWithBackground } from "@/utils/lib";
import { ToolbarDashedButton } from "../../helpers/ToolbarDashedButton";
import { ToolbarSection } from "../../ToolbarSection";
import { TailwindInput } from "../advanced/TailwindInput";
import { MediaManagerModal } from "./MediaManagerModal";
import { getMediaKind } from "./utils/media-helpers";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../primitives/layout/tooltipSurface";

/** Read a value by dot-path (e.g. "background.image") from an object. */
function getPath(obj: any, path: string): any {
  if (!path.includes(".")) return obj?.[path];
  return path.split(".").reduce((acc, seg) => (acc == null ? acc : acc[seg]), obj);
}

/** Write a value by dot-path, creating intermediate objects as needed. */
function setPath(obj: any, path: string, value: any): void {
  if (!path.includes(".")) {
    obj[path] = value;
    return;
  }
  const segs = path.split(".");
  let cursor = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i];
    if (cursor[seg] == null || typeof cursor[seg] !== "object") cursor[seg] = {};
    cursor = cursor[seg];
  }
  cursor[segs[segs.length - 1]] = value;
}

export const MediaInput = propa => {
  const props = { ...propa };
  const { props: nodeProps, id: componentId } = useNode(node => ({
    props: node.data?.props,
    id: node.id,
  }));

  const {
    actions: { setProp },
  } = useNode();

  const { query, actions } = useEditor();

  const {
    propKey,
    typeKey,
    contentKey = "src",
    title = "Media",
    showObjectProperties = true,
    kindFilter,
    /** Value written to `typeKey` on clear (and as the fallback when a
     *  selected item has no `type`). Defaults to "cdn" — Image's expected
     *  reset state. Video passes "r2" so clear doesn't stomp `provider` to
     *  an invalid value. */
    defaultTypeValue = "cdn",
  } = props;

  const [showMediaBrowser, setShowMediaBrowser] = useState(false);

  const handleBrowseSelect = (selectedMediaId: string) => {
    if (!selectedMediaId) return;

    const selectedMedia = getMediaById(query, selectedMediaId);

    setProp(_props => {
      setPath(_props, propKey, selectedMediaId);
      setPath(_props, typeKey, selectedMedia?.type || defaultTypeValue);
      // Clear direct URL / inline content when switching to library (mirrors handleContentUrlChange)
      if (contentKey !== propKey) {
        setPath(_props, contentKey, null);
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

  const mediaId = getPath(nodeProps, propKey);
  const contentUrl = getPath(nodeProps, contentKey);
  const hasMedia = !!mediaId;
  const hasContentUrl =
    !!contentUrl && typeof contentUrl === "string" && contentUrl.startsWith("http");
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

  const selectedKind = selectedMedia ? getMediaKind(selectedMedia) : null;
  const isVideoPreview = selectedKind === "video" && !!imageUrl;

  const handleClear = () => {
    setProp(_props => {
      setPath(_props, propKey, null);
      setPath(_props, typeKey, defaultTypeValue);
      setPath(_props, contentKey, null); // Also clear content URL
    });
  };

  const handleContentUrlChange = (newUrl: string) => {
    setProp(_props => {
      setPath(_props, contentKey, newUrl || null);
      // Clear media library selection when setting content URL
      if (newUrl) {
        setPath(_props, propKey, null);
        setPath(_props, typeKey, defaultTypeValue);
      }
    });
  };

  const body = (
    <>
      <div className="space-y-2">
        {/* Preview if media exists or content URL exists */}
        {(hasMedia && (svgContent || imageUrl)) || (hasContentUrl && imageUrl) ? (
          <div className="relative">
            <div className="bg-base-100 flex aspect-video items-center justify-center overflow-hidden rounded-lg p-2">
              {svgContent ? (
                <div
                  className="text-base-content flex size-full items-center justify-center [&>svg]:size-full [&>svg]:max-h-full [&>svg]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              ) : isVideoPreview ? (
                <video
                  src={imageUrl}
                  className="size-full rounded-lg object-cover"
                  preload="metadata"
                  muted
                  playsInline
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
              className="bg-error text-error-content hover:bg-error/90 absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-xs font-bold"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Clear media"
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
              className="input placeholder:text-neutral-content px-3! py-2!"
            />
            <p className="text-neutral-content text-xs">
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

      {showObjectProperties && (
        <ToolbarSection
          title="Object Properties"
          nested
          collapsible
          defaultOpen={false}
          accordionPassive
        >
          <TailwindInput propKey="objectFit" label="Object Fit" prop="objectFit" type="select" />
          <TailwindInput
            propKey="objectPosition"
            label="Object Position"
            prop="objectPosition"
            type="select"
          />
        </ToolbarSection>
      )}

      <MediaManagerModal
        isOpen={showMediaBrowser}
        onClose={() => setShowMediaBrowser(false)}
        onSelect={handleBrowseSelect}
        selectionMode={true}
        kindFilter={kindFilter}
      />
    </>
  );

  if (!title) return body;

  return (
    <ToolbarSection title={title} full={1} collapsible={props.collapsible}>
      {body}
    </ToolbarSection>
  );
};
