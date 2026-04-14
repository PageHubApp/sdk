import React from "react";

interface LayoutIconConfig {
  type: "flex" | "grid";
  columns: number;
  rows?: number;
  widths?: string[];
  spans?: string[];
  heights?: string[];
  className?: string;
  size?: "sm" | "md" | "lg";
}

interface LayoutIconGeneratorProps {
  config: LayoutIconConfig;
}

function LayoutIconGenerator({ config }: LayoutIconGeneratorProps) {
  const { type, columns, rows = 1, widths, spans, heights, className = "", size = "md" } = config;

  const sizeClasses = {
    sm: "h-4 w-full",
    md: "h-6 w-full",
    lg: "h-8 w-full",
  };

  if (type === "flex") {
    return (
      <div
        className={`${sizeClasses[size]} border-base-300 overflow-hidden rounded-sm border p-px ${className}`}
      >
        <div className="flex h-full gap-px">
          {Array.from({ length: columns }, (_, i) => {
            const width = widths?.[i] || "flex-1";
            const opacity = widths ? (width.includes("1/2") ? "30" : "20") : "30";
            return <div key={i} className={`${width} rounded-sm bg-primary/${opacity}`}></div>;
          })}
        </div>
      </div>
    );
  }

  if (type === "grid") {
    return (
      <div
        className={`${sizeClasses[size]} border-base-300 overflow-hidden rounded-sm border p-px ${className}`}
      >
        <div className={`grid h-full grid-cols-${columns} grid-rows-${rows} gap-px`}>
          {Array.from({ length: columns * rows }, (_, i) => {
            const span = spans?.[i] || "";
            const height = heights?.[i] || "";
            return <div key={i} className={`${span} ${height} bg-primary/30 rounded-sm`}></div>;
          })}
        </div>
      </div>
    );
  }

  return null;
}

// Convenience function for easy usage
export const generateLayoutIcon = (config: LayoutIconConfig) => {
  return <LayoutIconGenerator config={config} />;
};

export default LayoutIconGenerator;
