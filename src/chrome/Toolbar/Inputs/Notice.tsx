import React from "react";

interface NoticeProps {
  children: React.ReactNode;
  className?: string;
}

export const Notice = ({ children, className = "" }: NoticeProps) => {
  return (
    <p className={`text-neutral-content w-full py-1 text-center text-xs leading-snug ${className}`}>
      {children}
    </p>
  );
};
