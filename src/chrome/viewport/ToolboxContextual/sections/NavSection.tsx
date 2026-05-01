import { TbCaretUp, TbChevronDown, TbChevronUp } from "react-icons/tb";
import { CTX_MENU_ITEM } from "../utils/menuClasses";
import type { ToolboxMenuModel } from "../hooks/useToolboxMenuModel";

export function NavSection({
  model,
  divider,
}: {
  model: ToolboxMenuModel;
  divider: boolean;
}) {
  if (!model.showNavSection) return null;
  return (
    <div className={divider ? "border-base-200 border-t pt-1" : ""}>
      {model.showSelectParent && (
        <button
          type="button"
          role="menuitem"
          className={CTX_MENU_ITEM}
          onClick={model.handleSelectParent}
        >
          <TbCaretUp className="size-4 shrink-0 opacity-80" aria-hidden />
          Select parent
        </button>
      )}
      {model.showMoveUpBtn && (
        <button
          type="button"
          role="menuitem"
          className={CTX_MENU_ITEM}
          onClick={model.handleMoveUp}
        >
          <TbChevronUp className="size-4 shrink-0 opacity-80" aria-hidden />
          Move up
        </button>
      )}
      {model.showMoveDownBtn && (
        <button
          type="button"
          role="menuitem"
          className={CTX_MENU_ITEM}
          onClick={model.handleMoveDown}
        >
          <TbChevronDown className="size-4 shrink-0 opacity-80" aria-hidden />
          Move down
        </button>
      )}
    </div>
  );
}
