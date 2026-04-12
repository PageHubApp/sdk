import type { ReactNode } from "react";

/** Shared row class for editor slide-out menu buttons (Settings / View / …). */
export const EDITOR_MENU_NAV_ROW_CLASS =
  "flex w-full cursor-pointer items-center gap-1 px-3 py-3 text-neutral-content hover:bg-neutral";

export function EditorMenuSectionLabel({ children }: { children: string }) {
  return (
    <div className="text-neutral-content/60 px-3 pt-3 pb-1 text-[10px] font-medium tracking-widest uppercase">
      {children}
    </div>
  );
}

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

const formatKbd = (mac: string) => {
  if (isMac) return mac;
  return mac
    .replace(/⌘/g, "Ctrl+")
    .replace(/⇧/g, "Shift+")
    .replace(/⌥/g, "Alt+")
    .replace(/\+$/, "");
};

export function EditorMenuKbd({ children, win }: { children: string; win?: string }) {
  return (
    <kbd className="border-base-300 bg-neutral text-base-content/80 ml-auto rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide">
      {win && !isMac ? win : formatKbd(children)}
    </kbd>
  );
}

type EditorMenuNavRowProps = {
  icon: ReactNode;
  /** Primary label (plain string or e.g. `<div className="text-sm">…</div>`). */
  label: ReactNode;
  onClick: () => void;
  kbd?: ReactNode;
};

/**
 * One row in the editor menu: icon + label (+ optional shortcut chip).
 */
export function EditorMenuNavRow({ icon, label, onClick, kbd }: EditorMenuNavRowProps) {
  return (
    <button type="button" onClick={onClick} className={EDITOR_MENU_NAV_ROW_CLASS}>
      <div className="shrink-0 text-base">{icon}</div>
      <div className="min-w-0 flex-1 text-left">{label}</div>
      {kbd ?? null}
    </button>
  );
}
