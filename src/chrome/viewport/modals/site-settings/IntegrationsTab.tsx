import React, { useState } from "react";
import { TbInfoCircle, TbPlus, TbX } from "react-icons/tb";
import {
  SettingsCallout,
  SettingsFormCard,
  SettingsFormField,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";

interface ProviderMeta {
  label: string;
  placeholder: string;
  field: string;
  help: string;
}

export const INTEGRATION_PROVIDERS: Record<string, ProviderMeta> = {
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
  const [picking, setPicking] = useState(false);

  const connectedKeys = Object.keys(INTEGRATION_PROVIDERS).filter(key => key in integrations);
  const availableKeys = Object.keys(INTEGRATION_PROVIDERS).filter(key => !(key in integrations));

  const addProvider = (key: string) => {
    const meta = INTEGRATION_PROVIDERS[key];
    if (!meta) return;
    setIntegrations(prev => ({ ...prev, [key]: { [meta.field]: "" } }));
    setPicking(false);
  };

  const removeProvider = (key: string) => {
    setIntegrations(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Integrations"
        description="Connect analytics, verification, and tracking. Paste IDs only — no raw script tags here."
      />

      <SettingsFormCard title="Analytics and tracking">
        <div className="flex items-center justify-between gap-2">
          <p className="text-neutral-content text-sm">
            {connectedKeys.length === 0
              ? "No integrations connected yet."
              : `${connectedKeys.length} connected`}
          </p>
          {availableKeys.length > 0 ? (
            <button
              type="button"
              onClick={() => setPicking(p => !p)}
              className="btn btn-secondary btn-sm shrink-0 gap-1"
            >
              <TbPlus className="size-3.5" />
              Add integration
            </button>
          ) : null}
        </div>

        {picking && availableKeys.length > 0 ? (
          <div className="border-base-300 bg-base-200/40 flex flex-wrap gap-2 rounded-lg border p-3">
            {availableKeys.map(key => (
              <button
                key={key}
                type="button"
                onClick={() => addProvider(key)}
                className="border-base-300 bg-base-100 hover:border-primary hover:bg-base-200 text-base-content rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
              >
                {INTEGRATION_PROVIDERS[key].label}
              </button>
            ))}
          </div>
        ) : null}

        {connectedKeys.map(key => {
          const meta = INTEGRATION_PROVIDERS[key];
          const value = integrations[key]?.[meta.field] || "";
          return (
            <SettingsFormField
              key={key}
              label={meta.label}
              htmlFor={`integration-${key}`}
              hint={meta.help}
            >
              <div className="flex items-start gap-2">
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
                <button
                  type="button"
                  onClick={() => removeProvider(key)}
                  className="btn btn-outline btn-square border-base-300 hover:btn-error"
                  aria-label={`Remove ${meta.label}`}
                >
                  <TbX className="size-4" />
                </button>
              </div>
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
