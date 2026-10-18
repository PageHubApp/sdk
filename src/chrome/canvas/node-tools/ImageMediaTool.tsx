import { useEditor, useNode } from "@craftjs/core";
import { MediaManagerModal } from "../../toolbar/inputs/media/MediaManagerModal";
import { useState } from "react";
import { getMediaById } from "../../../utils/media/media";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../primitives/layout/tooltipSurface";

export const ImageMediaTool = () => {
  const { query } = useEditor();
  const {
    actions: { setProp },
  } = useNode();

  const [showMediaModal, setShowMediaModal] = useState(false);

  const handleMediaSelect = (selectedMediaId: string) => {
    if (!selectedMediaId) return;

    const selectedMedia = getMediaById(query, selectedMediaId);

    setProp(_props => {
      _props.videoId = selectedMediaId;
      _props.type = selectedMedia?.type || "cdn";
    });

    setShowMediaModal(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMediaModal(true);
  };

  return (
    <>
      {/* Double-click overlay */}
      <div
        role="presentation"
        aria-hidden="true"
        className="absolute inset-0 z-0 cursor-pointer bg-transparent"
        onDoubleClick={handleDoubleClick}
        data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
        data-tooltip-content="Double-click to change image"
      />

      {/* Media Modal */}
      <MediaManagerModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSelect={handleMediaSelect}
        selectionMode={true}
      />
    </>
  );
};
