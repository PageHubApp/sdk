import { TbComponents, TbComponentsOff, TbCopy, TbTrash } from "react-icons/tb";
import { CTX_MENU_ITEM } from "../utils/menuClasses";
import type { ToolboxMenuModel } from "../hooks/useToolboxMenuModel";

export function DupDelSection({
  model,
  divider,
}: {
  model: ToolboxMenuModel;
  divider: boolean;
}) {
  if (!model.showDupDelSection) return null;
  return (
    <div className={divider ? "border-base-200 border-t pt-1" : ""}>
      {model.showDuplicateBtn && (
        <button
          type="button"
          role="menuitem"
          className={CTX_MENU_ITEM}
          onClick={() => void model.handleDuplicate()}
        >
          <TbCopy className="size-4 shrink-0 opacity-80" aria-hidden />
          Duplicate
        </button>
      )}
      {model.showConvertRow && (
        <button
          type="button"
          role="menuitem"
          className={`${CTX_MENU_ITEM} ${!model.canMake ? "cursor-not-allowed opacity-50" : ""}`}
          disabled={!model.canMake}
          onClick={() => void model.handleConvertToComponent()}
        >
          {model.canMake ? (
            <TbComponents className="size-4 shrink-0 opacity-80" aria-hidden />
          ) : (
            <TbComponentsOff className="size-4 shrink-0 opacity-80" aria-hidden />
          )}
          {model.canMake ? "Convert to component" : "Component exists"}
        </button>
      )}
      {model.showDeleteBtn && (
        <button
          type="button"
          role="menuitem"
          className={CTX_MENU_ITEM}
          onClick={model.handleDelete}
        >
          <TbTrash className="size-4 shrink-0 opacity-80" aria-hidden />
          Delete
        </button>
      )}
    </div>
  );
}
