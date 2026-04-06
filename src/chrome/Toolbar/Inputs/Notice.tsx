import React from "react";

interface NoticeProps {
  children: React.ReactNode;
  className?: string;
}

export const Notice = ({ children, className = "" }: NoticeProps) => {
  return (
    <p
      className={`mx-4 my-2 rounded-lg border border-border bg-accent p-3 text-center text-xs text-accent-foreground ${className}`}
    >
      {children}
    </p>
  );
};
