import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbMoon, TbMoonOff } from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { EditModifiersAtom } from "./Label";

export const TabBarDarkModeToggle = () => {
  const [modifiers, setModifiers] = useAtomState(EditModifiersAtom);
  const darkOn = modifiers.dark ?? false;

  return (
    <button
      type="button"
      onClick={() => setModifiers(prev => ({ ...prev, dark: !prev.dark }))}
      className={`flex shrink-0 cursor-pointer items-center justify-center rounded p-1 transition-[color,transform] active:scale-90 ${
        darkOn
          ? "bg-violet-600/20 text-violet-800 ring-1 ring-violet-500/30 dark:text-violet-200"
          : "text-neutral-content hover:bg-accent hover:text-base-content"
      }`}
      aria-pressed={darkOn}
      aria-label={darkOn ? "Dark variant scope on" : "Dark variant scope off"}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={darkOn ? "Editing dark: variants" : "Edit dark: variants"}
      data-tooltip-place="top"
      data-tooltip-offset={10}
    >
      {darkOn ? <TbMoon className="size-4" /> : <TbMoonOff className="size-4 opacity-50" />}
    </button>
  );
};
