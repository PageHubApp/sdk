import { TbChevronDown, TbChevronRight } from "react-icons/tb";
import type { ReactNode } from "react";

interface DesignSystemAccordionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  icon?: ReactNode;
  rightContent?: ReactNode;
  bodyClassName?: string;
}

export function DesignSystemAccordion({
  title,
  open,
  onToggle,
  children,
  icon,
  rightContent,
  bodyClassName = "bg-base-100 text-base-content space-y-3 p-3",
}: DesignSystemAccordionProps) {
  return (
    <div className="border-base-300 border-b last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="bg-neutral hover:bg-neutral/80 flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left transition-colors"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-neutral-content flex items-center gap-2 text-sm font-semibold">
            {icon}
            {title}
          </span>
        </span>

        <span className="flex items-center gap-1">
          {rightContent}
          {open ? (
            <TbChevronDown className="text-neutral-content" size={18} />
          ) : (
            <TbChevronRight className="text-neutral-content" size={18} />
          )}
        </span>
      </div>

      {open && <div className={bodyClassName}>{children}</div>}
    </div>
  );
}
