import type { ButtonHTMLAttributes, ReactNode } from "react";
import { TbPlus } from "react-icons/tb";
import { twMerge } from "tailwind-merge";

export type ToolbarDashedButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  /** Omit default plus: `icon={null}`. Custom leading icon: pass a node. */
  icon?: ReactNode | null;
};

/**
 * Shared dashed full-width toolbar CTA (same chrome as Actions → Add Action).
 * Styles: `.ph-toolbar-dashed-btn` in `packages/sdk/src/editor-partials/toolbar-forms.css`
 * (SDK `editor.css` bundle) and duplicated in root `styles/editor.css` for the Next app (which does not import SDK toolbar-forms).
 */
export function ToolbarDashedButton({
  className,
  children,
  icon,
  ...rest
}: ToolbarDashedButtonProps) {
  return (
    <button type="button" className={twMerge("ph-toolbar-dashed-btn", className)} {...rest}>
      {icon !== null && (icon ?? <TbPlus size={12} aria-hidden />)}
      {children}
    </button>
  );
}
