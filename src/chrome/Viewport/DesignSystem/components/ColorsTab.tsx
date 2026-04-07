import { TbMoon, TbMoonOff, TbPlus, TbSun, TbTrash } from "react-icons/tb";
import { toPaletteCSSVarName } from "utils/design/designSystemVars";
import type { UseDesignSystemReturn } from "../hooks/useDesignSystem";

interface ColorsTabProps {
  ds: UseDesignSystemReturn;
}

export function ColorsTab({ ds }: ColorsTabProps) {
  return (
    <div className="space-y-3 p-6">
      {/* Dark mode toggle bar */}
      <div className="flex items-center justify-between">
        {ds.darkModeEnabled ? (
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            <button
              onClick={() => ds.toggleDarkMode()}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                ds.colorMode === "light"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TbSun size={14} />
              Light
            </button>
            <button
              onClick={() => ds.toggleDarkMode()}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                ds.colorMode === "dark"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TbMoon size={14} />
              Dark
            </button>
          </div>
        ) : (
          <div />
        )}
        <button
          onClick={() => ds.darkModeEnabled ? ds.disableDarkMode() : ds.toggleDarkMode()}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
            ds.darkModeEnabled
              ? "bg-violet-600/10 text-violet-700 hover:bg-violet-600/20"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          title={ds.darkModeEnabled ? "Disable dark mode" : "Enable dark mode"}
        >
          {ds.darkModeEnabled ? <TbMoon size={14} /> : <TbMoonOff size={14} />}
          {ds.darkModeEnabled ? "Dark mode on" : "Dark mode"}
        </button>
      </div>

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
