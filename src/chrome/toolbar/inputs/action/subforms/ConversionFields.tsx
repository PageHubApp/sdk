/**
 * ConversionFields — author UI for `action.conversion` (and `Form.conversion`).
 *
 * Renders a collapsible "Track conversion" section. The provider dropdown is
 * gated by the site's configured integrations (read from ROOT.props.integrations
 * via Craft) so authors can't pick `google-ads` when no AW- ID is set.
 *
 * Smart presets for event name based on the action's type / href (Call,
 * Get Directions, Lead, AddToCart, Download, Click).
 */
import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { Chip } from "@/chrome/primitives/Chip";
import type { ActionConversion, ActionType } from "@/utils/action";

type Provider = ActionConversion["provider"];

interface Props {
  conversion: ActionConversion | undefined;
  onChange: (next: ActionConversion | undefined) => void;
  /** Used to seed an event-name preset when the section is first opened. */
  actionType?: ActionType;
  /** Used to seed an event-name preset (e.g. tel: → "Phone Call"). */
  href?: string;
  /** Override the default "Lead" preset (used by Form.conversion). */
  fallbackEventName?: string;
}

function presetEventName(actionType?: ActionType, href?: string, fallback = "Click"): string {
  if (href) {
    const h = href.toLowerCase();
    if (h.startsWith("tel:")) return "Phone Call";
    if (h.startsWith("mailto:")) return "Contact";
    if (/maps\.(google|apple)|google\.com\/maps/.test(h)) return "Get Directions";
  }
  if (actionType === "add-to-cart") return "AddToCart";
  if (actionType === "download-file") return "Download";
  if (actionType === "cart-checkout") return "InitiateCheckout";
  return fallback;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  "google-ads": "Google Ads",
  ga4: "Google Analytics (GA4)",
  meta: "Meta Pixel",
};

const PROVIDER_TO_INTEGRATION: Record<Provider, string> = {
  "google-ads": "googleAds",
  ga4: "googleAnalytics",
  meta: "metaPixel",
};

export function ConversionFields({
  conversion,
  onChange,
  actionType,
  href,
  fallbackEventName = "Click",
}: Props) {
  // Which providers are configured at the site level? Gates the dropdown.
  const configured = useEditor(state => {
    const integrations = state.nodes[ROOT_NODE]?.data?.props?.integrations || {};
    return {
      "google-ads": !!integrations.googleAds?.conversionId,
      ga4: !!integrations.googleAnalytics?.measurementId,
      meta: !!integrations.metaPixel?.pixelId,
    } as Record<Provider, boolean>;
  });

  const enable = () => {
    onChange({
      provider: configured.ga4 ? "ga4" : configured["google-ads"] ? "google-ads" : "ga4",
      eventName: presetEventName(actionType, href, fallbackEventName),
    });
  };

  const update = (patch: Partial<ActionConversion>) => {
    if (!conversion) return;
    onChange({ ...conversion, ...patch });
  };

  const isOpen = !!conversion;

  return (
    <details
      open={isOpen}
      className="border-base-300 mt-1 overflow-hidden rounded-md border"
      // Toggling closed clears the conversion entirely (less surprising than
      // a hidden value that still fires).
      onToggle={e => {
        const el = e.currentTarget as HTMLDetailsElement;
        if (el.open && !conversion) enable();
        else if (!el.open && conversion) onChange(undefined);
      }}
    >
      <summary className="bg-base-200/40 hover:bg-base-200 text-base-content cursor-pointer px-2 py-1.5 text-xs font-semibold select-none">
        Track conversion {conversion ? "·  on" : ""}
      </summary>
      {conversion ? (
        <div className="flex flex-col gap-1.5 p-2">
          {/* Provider */}
          <Chip>
            <select
              value={conversion.provider}
              onChange={e => {
                const next = e.target.value as Provider;
                const patch: Partial<ActionConversion> = { provider: next };
                if (next !== "google-ads") patch.sendTo = undefined;
                update(patch);
              }}
              className="h-full w-full bg-transparent px-1 text-xs outline-none"
              aria-label="Conversion provider"
            >
              {(Object.keys(PROVIDER_LABELS) as Provider[]).map(p => (
                <option key={p} value={p} disabled={!configured[p]}>
                  {PROVIDER_LABELS[p]}
                  {!configured[p] ? "  (set up first)" : ""}
                </option>
              ))}
            </select>
          </Chip>

          {/* Send-To (Google Ads only) */}
          {conversion.provider === "google-ads" ? (
            <Chip>
              <input
                type="text"
                defaultValue={conversion.sendTo || ""}
                onChange={e => update({ sendTo: e.target.value })}
                placeholder="AW-XXXXXXXXXX/AbCdEfGhIj"
                className="h-full w-full bg-transparent px-1 text-xs outline-none"
                aria-label="Conversion send-to label"
                pattern="^AW-\d+/[\w-]+$"
              />
            </Chip>
          ) : null}

          {/* Event name (ignored for google-ads, which always uses "conversion") */}
          {conversion.provider !== "google-ads" ? (
            <Chip>
              <input
                type="text"
                defaultValue={conversion.eventName}
                onChange={e => update({ eventName: e.target.value })}
                placeholder="Event name"
                className="h-full w-full bg-transparent px-1 text-xs outline-none"
                aria-label="Event name"
              />
            </Chip>
          ) : null}

          {/* Value + currency (optional) */}
          <div className="flex gap-1.5">
            <Chip>
              <input
                type="number"
                step="0.01"
                defaultValue={conversion.value ?? ""}
                onChange={e =>
                  update({
                    value: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
                placeholder="Value (optional)"
                className="h-full w-full bg-transparent px-1 text-xs outline-none"
                aria-label="Conversion value"
              />
            </Chip>
            <Chip>
              <input
                type="text"
                defaultValue={conversion.currency || ""}
                onChange={e =>
                  update({ currency: e.target.value ? e.target.value.toUpperCase() : undefined })
                }
                placeholder="USD"
                maxLength={3}
                className="h-full w-full bg-transparent px-1 text-xs uppercase outline-none"
                aria-label="Currency"
              />
            </Chip>
          </div>

          {!configured[conversion.provider] ? (
            <p className="text-warning text-[10px] leading-snug">
              {PROVIDER_LABELS[conversion.provider]} isn&rsquo;t set up at the site level. Add it
              under Site Settings → Integrations or this conversion won&rsquo;t fire.
            </p>
          ) : null}
        </div>
      ) : null}
    </details>
  );
}
