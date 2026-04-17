import type { ReactNode } from "react";

interface ActionRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: "default" | "primary" | "destructive";
}

const variantClass = {
  default: "hover:bg-base-200",
  primary: "hover:bg-primary/10",
  destructive: "bg-error/5 hover:bg-error/10",
};

const iconVariantClass = {
  default: "text-base-content/50 group-hover:text-primary",
  primary: "text-primary",
  destructive: "text-error",
};

export function ActionRow({ icon, title, description, onClick, variant = "default" }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors active:scale-[0.99] ${variantClass[variant]}`}
    >
      <div className={`flex size-8 shrink-0 items-center justify-center transition-colors ${iconVariantClass[variant]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-base-content text-sm font-medium">{title}</h3>
        <p className="text-neutral-content truncate text-[11px]">{description}</p>
      </div>
    </button>
  );
}
