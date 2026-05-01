import { TbBrush, TbClipboard, TbClipboardCheck } from "react-icons/tb";
import { CTX_MENU_ITEM } from "../utils/menuClasses";
import type { ToolboxMenuModel } from "../hooks/useToolboxMenuModel";

export function CopyPasteSection({
  model,
  divider,
}: {
  model: ToolboxMenuModel;
  divider: boolean;
}) {
  if (!model.showCopyPasteSection) return null;
  return (
    <div className={divider ? "border-base-200 border-t pt-1" : ""}>
      {model.showCopyBtn && (
        <button
          type="button"
          role="menuitem"
          className={CTX_MENU_ITEM}
          onClick={() => void model.handleCopy()}
        >
          <TbClipboard className="size-4 shrink-0 opacity-80" aria-hidden />
          Copy
        </button>
      )}
      {model.showCopyClassesBtn && (
        <button
          type="button"
          role="menuitem"
          className={CTX_MENU_ITEM}
          onClick={model.handleCopyClasses}
        >
          <TbBrush className="size-4 shrink-0 opacity-80" aria-hidden />
          Copy classes
        </button>
      )}
      {model.showPaste && (
        <button
          type="button"
          role="menuitem"
          className={CTX_MENU_ITEM}
          onClick={model.handlePaste}
        >
          <TbClipboardCheck className="size-4 shrink-0 opacity-80" aria-hidden />
          Paste
        </button>
      )}
      {model.showPasteClassesBtn && (
        <button
          type="button"
          role="menuitem"
          className={CTX_MENU_ITEM}
          onClick={model.handlePasteClasses}
        >
          <TbBrush className="size-4 shrink-0 opacity-80" aria-hidden />
          Paste classes
        </button>
      )}
    </div>
  );
}
