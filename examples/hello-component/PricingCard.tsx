// Plain React component. Zero PageHub imports.
// The same code renders in the editor canvas, the viewer, and (via toHTML)
// the static HTML renderer.

import React from "react";

export interface PricingCardProps {
  title: string;
  price: number;
  period: "mo" | "yr";
  features?: string[];
  className?: string;
}

export function PricingCard({
  title,
  price,
  period,
  features = [],
  className = "",
}: PricingCardProps) {
  return (
    <div className={`rounded-box border border-base-300 bg-base-100 p-6 ${className}`}>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-3xl font-bold">
        ${price}
        <span className="text-sm font-normal opacity-70">/{period}</span>
      </p>
      {features.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm">
          {features.map((f, i) => (
            <li key={i}>• {f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
