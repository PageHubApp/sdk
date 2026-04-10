import React from "react";

interface NoticeProps {
  children: React.ReactNode;
  className?: string;
}

export const Notice = ({ children, className = "" }: NoticeProps) => {
  return (
    <p
      className={`w-full py-1 text-center text-xs leading-snug text-neutral-content ${className}`}
    >
      {children}
    </p>
  );
};
