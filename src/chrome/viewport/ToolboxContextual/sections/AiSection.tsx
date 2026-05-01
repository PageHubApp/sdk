import { CTX_MENU_ITEM } from "../utils/menuClasses";
import type { ToolboxMenuModel } from "../hooks/useToolboxMenuModel";

export function AiSection({
  model,
  divider,
}: {
  model: ToolboxMenuModel;
  divider: boolean;
}) {
  if (!model.showAi || !model.renderContext) return null;
  return (
    <div
      className={divider ? "border-base-200 border-t pt-1" : ""}
      onMouseDown={e => e.stopPropagation()}
      onMouseDownCapture={e => e.stopPropagation()}
    >
      {model.renderContext({
        onClick: model.handleAddToAi,
        className: CTX_MENU_ITEM,
        label: "Include in AI chat",
      })}
    </div>
  );
}
