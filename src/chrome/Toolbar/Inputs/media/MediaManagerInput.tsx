// @ts-nocheck
import { useEditor } from "@craftjs/core";
import { useEffect, useState } from "react";
import { TbPhoto } from "react-icons/tb";
import { getPageMedia } from "utils/lib";
import { ToolbarSection } from "../../ToolbarSection";
import { MediaManagerModal } from "./MediaManagerModal";

export const MediaManagerInput = () => {
  const { query } = useEditor();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mediaCount, setMediaCount] = useState(0);

  useEffect(() => {
    const media = getPageMedia(query);
    setMediaCount(media.length);
  }, [query]);

  return (
    <>
      <ToolbarSection title="Media Manager" full={2}>
        <button
          onClick={() => setIsModalOpen(true)}
          className="group flex w-full items-center justify-between rounded-lg border-2 border-border bg-muted px-4 py-3 text-muted-foreground transition-all hover:border-primary hover:bg-muted"
        >
          <div className="flex items-center gap-3">
            <TbPhoto className="text-2xl text-muted-foreground group-hover:text-primary" />
            <div className="text-left">
              <div className="font-medium text-foreground">Manage Media</div>
              <div className="text-sm text-muted-foreground">
                {mediaCount} {mediaCount === 1 ? "item" : "items"} uploaded
              </div>
            </div>
          </div>
          <div className="text-muted-foreground group-hover:text-primary">→</div>
        </button>
      </ToolbarSection>

      <MediaManagerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
