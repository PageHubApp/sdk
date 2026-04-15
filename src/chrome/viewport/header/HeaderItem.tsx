import React from "react";
import { twMerge } from "tailwind-merge";

interface HeaderItemProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function HeaderItem({
  onClick,
  onMouseDown,
  children,
  disabled = false,
  className = "",
  ariaLabel = "",
  ...rest
}: HeaderItemProps & Record<string, unknown>) {
  return (
    <button
      onClick={onClick}
      onMouseDown={onMouseDown}
      disabled={disabled}
      aria-label={ariaLabel}
      className={twMerge(
        "tool-button text-base-content/70 hover:bg-transparent hover:text-base-content transition-colors",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
