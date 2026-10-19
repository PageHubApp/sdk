import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { TbPlus } from "react-icons/tb";
import { twMerge } from "tailwind-merge";
import { useChromeStyle } from "../../primitives/useChromeStyle";

export type ToolbarDashedButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  /** Omit default plus: `icon={null}`. Custom leading icon: pass a node. */
  icon?: ReactNode | null;
};

/**
 * Shared dashed full-width toolbar CTA (same chrome as Actions → Add Action).
 * Styles: `.ph-toolbar-dashed-btn` in `packages/sdk/src/css/editor-partials/toolbar-forms.css`
 * (SDK `editor.css` bundle) and duplicated in root `styles/editor.css` for the Next app (which does not import SDK toolbar-forms).
 * Under `features.chrome: "dashboard"` it is a bordered secondary button instead (`useChromeStyle().dashedButton`).
 */
export const ToolbarDashedButton = forwardRef<HTMLButtonElement, ToolbarDashedButtonProps>(
  function ToolbarDashedButton({ className, children, icon, ...rest }, ref) {
    const chrome = useChromeStyle();
    return (
      <button
        ref={ref}
        type="button"
        className={twMerge(chrome.dashedButton, className)}
        {...rest}
      >
        {icon !== null && (icon ?? <TbPlus size={12} aria-hidden />)}
        {children}
      </button>
    );
  }
);
