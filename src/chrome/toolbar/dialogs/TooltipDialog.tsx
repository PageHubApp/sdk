import { useGetRectLater } from "../../inline-tools/Dialog";
import { getRect } from "../../viewport/hooks/useRect";
import { useRef } from "react";
import { useAtomValue } from "@zedux/react";
import { ToolTipDialogAtom } from "./dialogAtoms";

export { ToolTipDialogAtom } from "./dialogAtoms";

export const ToolTipDialog = () => {
  const dialog = useAtomValue(ToolTipDialogAtom);
  const ref = useRef(null);
  const rect = getRect(dialog.e);
  const refRect = useGetRectLater(ref);

  const style = {
    top: dialog.placement === "bottom" ? rect.bottom + 10 : rect.top - refRect.height - 10,
    left: rect.left - refRect.width / 2,
    zIndex: 1000,
  } as any;

  if (!dialog.enabled) return null;

  return (
    <div
      key={`tooltip-${dialog.key}`}
      id={`tooltip-${dialog.key}`}
      data-tooltip={true}
      style={style}
      className="animate-backdrop-in pointer-events-none absolute z-20 flex"
    >
      <div
        ref={ref}
        key={`tooltip-${dialog.key}`}
        className="border-base-300 bg-neutral text-base-content pointer-events-none absolute rounded-xl border px-3 py-1.5 text-xs font-normal whitespace-nowrap drop-shadow-2xl"
      >
        {dialog.value}
      </div>
    </div>
  );
};
