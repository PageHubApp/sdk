import { TbLoader2 } from "react-icons/tb";

/**
 * Centered spinner for sidebar panel loading states. `fill` stretches to the
 * available column (use inside `flex-1` parents); default is a fixed 8rem
 * inline block (use inside an already-padded scroller).
 */
export const PanelLoadingState = ({ fill = false }: { fill?: boolean }) => (
  <div className={`flex items-center justify-center ${fill ? "flex-1" : "h-32"}`}>
    <TbLoader2 className="text-neutral-content size-5 animate-spin" />
  </div>
);
