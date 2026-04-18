import React from "react";
import { TbInfoCircle } from "react-icons/tb";
import {
  SettingsCallout,
  SettingsFormCard,
  SettingsFormField,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";

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

export function IntegrationsTab({
  inputClass,
  integrations,
  setIntegrations,
}: IntegrationsTabProps) {
  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Integrations"
        description="Connect analytics, verification, and tracking. Paste IDs only — no raw script tags here."
      />

      <SettingsFormCard title="Analytics and tracking">
        {Object.entries(INTEGRATION_PROVIDERS).map(([key, meta]) => {
          const value = integrations[key]?.[meta.field] || "";
          return (
            <SettingsFormField
              key={key}
              label={meta.label}
              htmlFor={`integration-${key}`}
              hint={meta.help}
            >
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
            </SettingsFormField>
          );
        })}
      </SettingsFormCard>

      <SettingsCallout icon={<TbInfoCircle />} title="Using Google Tag Manager?">
        <p>
          GTM can manage GA, Meta Pixel, and most other tags. If you use GTM, you only need the GTM
          Container ID here — configure individual tags inside GTM.
        </p>
      </SettingsCallout>
    </div>
  );
}
