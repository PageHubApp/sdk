import { TbPhoto } from "react-icons/tb";
import type { UseIconDialogReturn } from "../hooks/useIconDialog";

interface MediaTabProps {
  d: UseIconDialogReturn;
}

export function MediaTab({ d }: MediaTabProps) {
  const mediaContent = d.dialog.value?.startsWith("ref-image:")
    ? d.getMediaContent(d.query, d.dialog.value.replace("ref-image:", ""))
    : null;

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 p-8"
      role="tabpanel"
      id="media-tabpanel"
      aria-labelledby="media-tab"
      aria-label="Media selection"
    >
      {mediaContent ? (
        <>
          <div className="flex flex-col items-center gap-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-base-300 bg-neutral">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaContent}
                alt="Selected media"
                className="size-full object-contain"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => d.setShowMediaBrowser(true)}
            className="btn btn-primary"
            aria-label="Change selected image"
          >
            Change Image
          </button>
        </>
      ) : (
        <>
          <TbPhoto size={48} className="text-neutral-content" />
          <p className="text-center text-sm text-neutral-content">
            Select an image from your media library
          </p>
          <button
            type="button"
            onClick={() => d.setShowMediaBrowser(true)}
            className="btn btn-primary"
            aria-label="Browse media library"
          >
            Browse Media
          </button>
        </>
      )}
    </div>
  );
}
