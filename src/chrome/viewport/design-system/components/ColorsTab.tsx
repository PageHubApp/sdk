import { useState, type ReactNode } from "react";
import { TbMoon, TbMoonOff, TbPlus, TbSun, TbTrash } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { toPaletteCSSVarName } from "@/utils/design/designSystemVars";
import type { UseDesignSystemReturn } from "../hooks/useDesignSystem";
import { ToolbarSection } from "../../../toolbar/ToolbarSection";

interface ColorsTabProps {
  ds: UseDesignSystemReturn;
}

type ColorMode = "light" | "dark";

export function ColorsTab({ ds }: ColorsTabProps) {
  return (
    <div className="space-y-0">
      <ColorAccordion
        title="Light"
        icon={<TbSun className="size-4" aria-hidden />}
        defaultOpen
        palette={ds.lightPalettes}
        mode="light"
        ds={ds}
      />
      <ColorAccordion
        title="Dark"
        icon={<TbMoon className="size-4" aria-hidden />}
        defaultOpen={false}
        palette={ds.darkPalettes}
        mode="dark"
        ds={ds}
      />
    </div>
  );
}

function ColorAccordion({
  title,
  icon,
  defaultOpen,
  palette,
  mode,
  ds,
}: {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  palette: { name: string; color: string }[];
  mode: ColorMode;
  ds: UseDesignSystemReturn;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const isDark = mode === "dark";
  const darkAvailable = ds.darkModeEnabled;

  const ensureMode = () => {
    if (mode === ds.colorMode) return;
    ds.toggleDarkMode();
  };

  const handleChangeColor = (index: number) => {
    ensureMode();
    ds.openColorPickerInMode(mode, index);
  };

  const handleNameChange = (index: number, name: string) => {
    ds.updateColorNameInMode(mode, index, name);
  };

  const handleAdd = () => {
    if (mode === "dark" && !ds.darkModeEnabled) {
      ds.toggleDarkMode();
    }
    if (mode !== ds.colorMode) {
      ds.toggleDarkMode();
    }
    ds.addColorInMode(mode);
  };

  const handleDelete = (index: number) => {
    ds.deleteColorInMode(mode, index);
  };

  return (
    <ToolbarSection
      key={`${mode}-${open}`}
      title={title}
      icon={icon}
      defaultOpen={open}
      showChevron
      onClick={() => setOpen(v => !v)}
      header={
        <>
          <span className="text-neutral-content/70 text-xs font-medium">{palette.length}</span>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              handleAdd();
            }}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content={`Add color to ${title.toLowerCase()} palette`}
            data-tooltip-place="bottom"
            data-tooltip-offset={10}
            className="text-neutral-content hover:bg-base-200 hover:text-base-content flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors"
            aria-label={`Add ${title.toLowerCase()} color`}
          >
            <TbPlus className="size-3.5 shrink-0" aria-hidden />
            Add
          </button>
        </>
      }
    >
      {isDark && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-base-300 bg-base-200/40 px-3 py-2 text-sm">
          <div className="text-neutral-content">
            {darkAvailable ? "Dark mode is enabled." : "Dark mode is disabled."}
          </div>
          <button
            type="button"
            onClick={() => (darkAvailable ? ds.disableDarkMode() : ds.toggleDarkMode())}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
              darkAvailable
                ? "bg-violet-600/10 text-violet-700 hover:bg-violet-600/20"
                : "text-neutral-content hover:bg-neutral hover:text-base-content"
            }`}
          >
            {darkAvailable ? <TbMoon size={14} /> : <TbMoonOff size={14} />}
            {darkAvailable ? "Disable dark mode" : "Enable dark mode"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {palette.map((entry, index) => (
          <div key={index} className="group flex w-full min-w-0 items-center gap-2">
            <button
              ref={el => {
                ds.colorButtonRefs.current[index] = el;
              }}
              onClick={() => handleChangeColor(index)}
              className="border-base-300 hover:border-primary size-8 shrink-0 cursor-pointer rounded-lg border-2 transition-colors"
              style={{ backgroundColor: ds.getColorPreview(entry.color) }}
              title="Click to change color"
            />
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={entry.name}
                onChange={e => handleNameChange(index, e.target.value)}
                className="input-dialog-sm text-base-content placeholder:text-neutral-content/60 w-full font-medium"
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
              onClick={() => handleDelete(index)}
              className="text-error hover:text-error p-1 opacity-0 transition-opacity group-hover:opacity-100"
              title="Delete color"
            >
              <TbTrash size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToolbarSection>
  );
}
