import { useEditor } from "@craftjs/core";
import { useEffect, useState } from "react";
import { TbPhoto } from "react-icons/tb";
import { getPageMedia } from "@/utils/lib";
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
          className="group border-base-300 bg-neutral text-neutral-content hover:border-primary hover:bg-neutral flex w-full items-center justify-between rounded-lg border-2 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <TbPhoto className="text-neutral-content group-hover:text-primary text-2xl" />
            <div className="text-left">
              <div className="text-base-content font-medium">Manage Media</div>
              <div className="text-neutral-content text-sm">
                {mediaCount} {mediaCount === 1 ? "item" : "items"} uploaded
              </div>
            </div>
          </div>
          <div className="text-neutral-content group-hover:text-primary">→</div>
        </button>
      </ToolbarSection>

      <MediaManagerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
