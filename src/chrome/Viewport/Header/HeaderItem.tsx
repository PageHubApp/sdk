import React from "react";

interface HeaderItemProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function HeaderItem({ onClick, children, disabled = false, className = "", ariaLabel = "" }: HeaderItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`tool-button ${className}`}
    >
      {children}
    </button>
  );
}
