import React from "react";
import { TbInfoCircle } from "react-icons/tb";

export const INTEGRATION_PROVIDERS = {
  googleAnalytics: {
    label: "Google Analytics (GA4)",
    placeholder: "G-XXXXXXXXXX",
    field: "measurementId",
    help: "GA4 Measurement ID. Find it in Admin > Data Streams.",
  },
  googleTagManager: {
    label: "Google Tag Manager",
    placeholder: "GTM-XXXXXXX",
    field: "containerId",
    help: "GTM Container ID. Covers GA, Meta Pixel, and most tags in one shot.",
  },
  googleSearchConsole: {
    label: "Google Search Console",
    placeholder: "verification code",
    field: "verificationCode",
    help: "HTML tag verification code (just the content value, not the full meta tag).",
  },
  metaPixel: {
    label: "Meta Pixel (Facebook)",
    placeholder: "XXXXXXXXXXXXXXXX",
    field: "pixelId",
    help: "Facebook/Meta Pixel ID for conversion tracking.",
  },
};

interface IntegrationsTabProps {
  inputClass: string;
  integrations: Record<string, Record<string, string>>;
  setIntegrations: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
}

export function IntegrationsTab({ inputClass, integrations, setIntegrations }: IntegrationsTabProps) {
  return (
    <div className="space-y-6">
      <div className="mb-4 space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          Analytics & Tracking
        </h3>
        <p className="text-sm text-muted-foreground">
          Connect analytics, tracking pixels, and site verification. Just paste in your ID.
        </p>
      </div>

      {Object.entries(INTEGRATION_PROVIDERS).map(([key, meta]) => {
        const value = integrations[key]?.[meta.field] || "";
        return (
          <div key={key}>
            <label htmlFor={`integration-${key}`} className="toolbar-label mb-2 block font-medium">
              {meta.label}
            </label>
            <input
              id={`integration-${key}`}
              type="text"
              value={value}
              onChange={e => {
                setIntegrations(prev => ({
                  ...prev,
                  [key]: { [meta.field]: e.target.value },
                }));
              }}
              className={inputClass}
              placeholder={meta.placeholder}
            />
            <p className="mt-1 text-xs text-muted-foreground">{meta.help}</p>
          </div>
        );
      })}

      <div className="mt-4 rounded-lg border border-border bg-muted p-4">
        <div className="flex gap-3">
          <TbInfoCircle className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="toolbar-label font-medium">
              Using Google Tag Manager?
            </p>
            <p className="text-sm text-muted-foreground">
              GTM can manage GA, Meta Pixel, and most other tags. If you use GTM, you
              only need the GTM Container ID here — configure individual tags inside GTM.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
