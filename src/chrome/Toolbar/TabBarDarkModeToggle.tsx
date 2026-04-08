import { Tooltip } from "components/layout/Tooltip";
import { TbMoon, TbMoonOff } from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { ViewSelectionAtom } from "./Label";

export const TabBarDarkModeToggle = () => {
  const [viewSelection, setViewSelection] = useAtomState(ViewSelectionAtom);
  const darkOn = viewSelection.dark ?? false;

  return (
    <Tooltip content={darkOn ? "Editing dark: variants" : "Edit dark: variants"} placement="top" arrow={false}>
      <button
        type="button"
        onClick={() => setViewSelection(prev => ({ ...prev, dark: !prev.dark }))}
        className={`flex shrink-0 cursor-pointer items-center justify-center rounded p-1 transition-colors ${
          darkOn
            ? "bg-violet-600/20 text-violet-800 ring-1 ring-violet-500/30 dark:text-violet-200"
            : "text-neutral-content hover:bg-accent hover:text-base-content"
        }`}
        aria-pressed={darkOn}
        aria-label={darkOn ? "Dark variant scope on" : "Dark variant scope off"}
      >
        {darkOn ? <TbMoon className="size-4" /> : <TbMoonOff className="size-4 opacity-50" />}
      </button>
    </Tooltip>
  );
};
