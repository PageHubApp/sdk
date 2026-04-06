import React from "react";
import { TbAlertTriangle, TbX } from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { EditorSaveBannerAtom } from "../utils/atoms";

export function EditorSaveBanner() {
  const [banner, setBanner] = useAtomState(EditorSaveBannerAtom);
  if (!banner?.message) return null;

  return (
    <div
      role="alert"
      className="flex shrink-0 items-start gap-3 border-b border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-50"
    >
      <TbAlertTriangle
        className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
        aria-hidden
      />
      <p className="min-w-0 flex-1 leading-snug">{banner.message}</p>
      <button
        type="button"
        className="shrink-0 rounded-md p-1 text-amber-800 transition-colors hover:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-400/15"
        onClick={() => setBanner(null)}
        aria-label="Dismiss notice"
      >
        <TbX className="size-4" aria-hidden />
      </button>
    </div>
  );
}
