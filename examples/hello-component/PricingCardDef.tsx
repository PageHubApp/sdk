// Declarative def: name, inspector schema, defaults, static-HTML serializer.
// Pass the exported def into PageHubConfig.components.

import { defineComponent } from "@pagehub/sdk";

import { PricingCard, type PricingCardProps } from "./PricingCard";

function escape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const PricingCardDef = defineComponent<PricingCardProps>({
  name: "PricingCard",
  displayName: "Pricing Card",
  description: "A simple price tier card.",
  category: "Marketing",
  icon: "ref-icon:tb/TbCreditCard",

  component: PricingCard,

  defaultProps: {
    title: "Pro",
    price: 29,
    period: "mo",
    features: ["Unlimited projects", "Priority support"],
  },

  // Auto-generated inspector UI. For richer inputs, drop `props` and pass a
  // `settings: MyPanel` React component instead.
  props: {
    title: { type: "text", label: "Plan Name" },
    price: { type: "number", label: "Price", min: 0, step: 1 },
    period: {
      type: "select",
      label: "Period",
      options: [
        { label: "Month", value: "mo" },
        { label: "Year", value: "yr" },
      ],
    },
  },

  // Static HTML serializer. Runs in plain Node (no React, no browser) for the
  // static renderer, the viewer's SSR pass, and editor.exportHTML().
  // Escape any string interpolated into the output — the SDK does not.
  // Signature: (props, childrenHTML, ctx) — `props` is narrowed to the
  // generic param, so `props.title` is typed as `string`, not `any`.
  toHTML: (props) => {
    const features = (props.features ?? [])
      .map((f) => `<li>• ${escape(f)}</li>`)
      .join("");
    return `
      <div class="rounded-box border border-base-300 bg-base-100 p-6 ${escape(
        (props as { className?: string }).className ?? ""
      )}">
        <h3 class="text-xl font-semibold">${escape(props.title)}</h3>
        <p class="mt-2 text-3xl font-bold">
          $${Number(props.price) || 0}<span class="text-sm font-normal opacity-70">/${escape(props.period)}</span>
        </p>
        ${features ? `<ul class="mt-4 space-y-1 text-sm">${features}</ul>` : ""}
      </div>
    `;
  },
});
