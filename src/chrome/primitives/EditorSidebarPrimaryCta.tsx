import type { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type EditorSidebarPrimaryCtaProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  type?: "button" | "submit";
  /** Optional leading icon (e.g. plus). */
  leading?: ReactNode;
  /**
   * `emphasis` — solid `btn btn-primary` (sidebar empty states).
   * `ghost` — primary text row for flyout footers (matches page “New …” pattern).
   */
  variant?: "emphasis" | "ghost";
};

const variantClass: Record<NonNullable<EditorSidebarPrimaryCtaProps["variant"]>, string> = {
  emphasis:
    "btn btn-primary mx-auto w-full max-w-sm inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold shadow-md transition-[transform,box-shadow] duration-200 active:scale-[0.99]",
  ghost:
    "text-primary hover:bg-primary/10 inline-flex w-full items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
};

/**
 * Primary call-to-action for editor chrome: sidebar empty states and picker footers.
 */
export function EditorSidebarPrimaryCta({
  className,
  leading,
  children,
  type = "button",
  variant = "emphasis",
  ...rest
}: EditorSidebarPrimaryCtaProps) {
  return (
    <button type={type} className={twMerge(variantClass[variant], className)} {...rest}>
      {leading}
      {children}
    </button>
  );
}
