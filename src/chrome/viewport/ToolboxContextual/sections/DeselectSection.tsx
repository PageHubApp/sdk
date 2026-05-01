import { TbX } from "react-icons/tb";
import { CTX_MENU_ITEM } from "../utils/menuClasses";
import type { ToolboxMenuModel } from "../hooks/useToolboxMenuModel";

export function DeselectSection({ model }: { model: ToolboxMenuModel }) {
  if (!model.showDeselect) return null;
  return (
    <button type="button" role="menuitem" className={CTX_MENU_ITEM} onClick={model.handleDeselect}>
      <TbX className="size-4 shrink-0 opacity-80" aria-hidden />
      Deselect
    </button>
  );
}
