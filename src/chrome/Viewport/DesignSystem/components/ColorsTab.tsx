import { TbPlus, TbTrash } from "react-icons/tb";
import { toPaletteCSSVarName } from "utils/design/designSystemVars";
import type { UseDesignSystemReturn } from "../hooks/useDesignSystem";

interface ColorsTabProps {
  ds: UseDesignSystemReturn;
}

export function ColorsTab({ ds }: ColorsTabProps) {
  return (
    <div className="space-y-3 p-6">
      <div className="grid grid-cols-2 gap-2">
        {ds.palettes.map((pallet, index) => (
          <div key={index} className="group flex items-center gap-2">
            <button
              ref={el => {
                ds.colorButtonRefs.current[index] = el;
              }}
              onClick={() => ds.openColorPicker(index)}
              className="size-8 shrink-0 cursor-pointer rounded-lg border-2 border-border transition-colors hover:border-primary"
              style={{ backgroundColor: ds.getColorPreview(pallet.color) }}
              title="Click to change color"
            />
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={pallet.name}
                onChange={e => ds.updateColorName(index, e.target.value)}
                className="w-full border-b border-transparent bg-transparent px-1 py-0.5 pb-0 text-sm font-medium text-foreground hover:border-primary focus:border-ring focus:outline-none"
                placeholder="Color name"
              />
              <div
                className="cursor-pointer px-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                role="button"
                tabIndex={0}
                onClick={() => navigator.clipboard.writeText(toPaletteCSSVarName(pallet.name))}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigator.clipboard.writeText(toPaletteCSSVarName(pallet.name));
                  }
                }}
                title="Click to copy CSS variable"
              >
                {toPaletteCSSVarName(pallet.name)}
              </div>
            </div>
            <button
              onClick={() => ds.deleteColor(index)}
              className="p-1 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              title="Delete color"
            >
              <TbTrash size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={ds.addColor}
        className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-lg border border-border bg-accent px-3 py-2 text-sm text-accent-foreground transition-colors hover:bg-accent"
      >
        <TbPlus size={16} />
        Add Color
      </button>
    </div>
  );
}
