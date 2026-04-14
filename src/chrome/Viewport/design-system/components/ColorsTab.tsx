import { TbMoon, TbMoonOff, TbPlus, TbSun, TbTrash } from "react-icons/tb";
import { toPaletteCSSVarName } from "@/utils/design/designSystemVars";
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
          <div className="border-base-300 flex items-center gap-1 rounded-lg border p-0.5">
            <button
              onClick={() => ds.toggleDarkMode()}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                ds.colorMode === "light"
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "text-neutral-content hover:text-base-content"
              }`}
            >
              <TbSun size={14} />
              Light
            </button>
            <button
              onClick={() => ds.toggleDarkMode()}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                ds.colorMode === "dark"
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "text-neutral-content hover:text-base-content"
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
          onClick={() => (ds.darkModeEnabled ? ds.disableDarkMode() : ds.toggleDarkMode())}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
            ds.darkModeEnabled
              ? "bg-violet-600/10 text-violet-700 hover:bg-violet-600/20"
              : "text-neutral-content hover:bg-neutral hover:text-base-content"
          }`}
          title={ds.darkModeEnabled ? "Disable dark mode" : "Enable dark mode"}
        >
          {ds.darkModeEnabled ? <TbMoon size={14} /> : <TbMoonOff size={14} />}
          {ds.darkModeEnabled ? "Dark mode on" : "Dark mode"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {ds.palettes.map((entry, index) => (
          <div key={index} className="group flex w-full min-w-0 items-center gap-2">
            <button
              ref={el => {
                ds.colorButtonRefs.current[index] = el;
              }}
              onClick={() => ds.openColorPicker(index)}
              className="border-base-300 hover:border-primary size-8 shrink-0 cursor-pointer rounded-lg border-2 transition-colors"
              style={{ backgroundColor: ds.getColorPreview(entry.color) }}
              title="Click to change color"
            />
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={entry.name}
                onChange={e => ds.updateColorName(index, e.target.value)}
                className="text-base-content hover:border-primary focus:border-ring w-full border-b border-transparent bg-transparent px-1 py-0.5 pb-0 text-sm font-medium focus:outline-none"
                placeholder="Color name"
              />
              <div
                className="text-neutral-content hover:text-base-content cursor-pointer px-1 text-[10px] transition-colors"
                role="button"
                tabIndex={0}
                onClick={() => navigator.clipboard.writeText(toPaletteCSSVarName(entry.name))}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigator.clipboard.writeText(toPaletteCSSVarName(entry.name));
                  }
                }}
                title="Click to copy CSS variable"
              >
                {toPaletteCSSVarName(entry.name)}
              </div>
            </div>
            <button
              onClick={() => ds.deleteColor(index)}
              className="text-error hover:text-error p-1 opacity-0 transition-opacity group-hover:opacity-100"
              title="Delete color"
            >
              <TbTrash size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={ds.addColor}
        className="btn btn-outline border-base-content/30 mt-4 flex w-full items-center justify-center gap-2 normal-case"
      >
        <TbPlus className="size-4 shrink-0" aria-hidden />
        Add color
      </button>
    </div>
  );
}
