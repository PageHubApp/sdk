import { useEditor, useNode } from "@craftjs/core";
import { MediaManagerModal } from "../../Toolbar/Inputs/media/MediaManagerModal";
import { useState } from "react";
import { getMediaById, registerMediaWithBackground } from "utils/lib";

export const ImageMediaTool = () => {
  const { query, actions } = useEditor();
  const {
    props: nodeProps,
    id: componentId,
    actions: { setProp },
  } = useNode(node => ({
    props: node.data.props,
    id: node.id,
  }));

  const [showMediaModal, setShowMediaModal] = useState(false);

  const handleMediaSelect = (selectedMediaId: string) => {
    if (!selectedMediaId) return;

    const selectedMedia = getMediaById(query, selectedMediaId);

    setProp(_props => {
      _props.videoId = selectedMediaId;
      _props.type = selectedMedia?.type || "cdn";
    });

    // Register the media with the component
    registerMediaWithBackground(
      query,
      actions,
      selectedMediaId,
      selectedMedia?.type || "cdn",
      componentId
    );

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
        className="absolute inset-0 z-10 cursor-pointer bg-transparent"
        onDoubleClick={handleDoubleClick}
        title="Double-click to change image"
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
