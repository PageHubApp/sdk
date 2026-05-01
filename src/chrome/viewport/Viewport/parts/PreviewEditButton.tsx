import { TbPencil } from "react-icons/tb";
import { FloatingWidget } from "../../../floating/FloatingWidget";

interface PreviewEditButtonProps {
  sideBarLeft: boolean;
  lastActive: string;
  query: any;
  actions: any;
  setOptions: (mut: (options: { enabled: boolean }) => void) => void;
  setPreview: (next: boolean) => void;
}

/**
 * Floating "Edit" button shown in preview mode (`!enabled`). Clicking it
 * re-enables the editor and re-selects the previously-active node so the
 * inspector returns to its prior context.
 */
export function PreviewEditButton({
  sideBarLeft,
  lastActive,
  query,
  actions,
  setOptions,
  setPreview,
}: PreviewEditButtonProps) {
  return (
    <FloatingWidget
      storageKey="preview-edit"
      defaultCorner={sideBarLeft ? "top-left" : "top-right"}
    >
      <button
        className="bg-neutral text-neutral-content hover:bg-neutral/90 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg transition-colors select-none [&_svg]:size-[14px]"
        aria-label="Edit page"
        onClick={() => {
          const viewport = document.getElementById("viewport");
          const scrollTop = viewport?.scrollTop ?? 0;
          const scrollLeft = viewport?.scrollLeft ?? 0;
          setOptions(options => {
            options.enabled = true;
            setPreview(false);
            setTimeout(() => {
              if (!lastActive) return;
              const node = query.node(lastActive).get();
              if (node) actions.selectNode(lastActive);
            }, 0);
          });
          requestAnimationFrame(() => {
            if (viewport) {
              viewport.scrollTop = scrollTop;
              viewport.scrollLeft = scrollLeft;
            }
          });
        }}
      >
        <TbPencil />
        Edit
      </button>
    </FloatingWidget>
  );
}
