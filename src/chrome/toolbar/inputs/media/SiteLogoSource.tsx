import { TbCheck, TbPhoto } from "react-icons/tb";
import { previewUrlForSrc, SITE_LOGO_TOKENS, type SiteLogoVariant } from "./utils/siteLogo";

interface SiteLogoSourceProps {
  /** ROOT props — the logo lives at `company.logo` / `company.logoDark`. */
  rootProps: Record<string, any>;
  /** Which logo the Image is linked to now, if any. */
  current: SiteLogoVariant | null;
  onPick: (token: string) => void;
}

const OPTIONS: { variant: SiteLogoVariant; label: string; empty: string }[] = [
  {
    variant: "light",
    label: "Logo",
    empty: "Not set yet. Add it in Site settings → Branding.",
  },
  {
    variant: "dark",
    label: "Logo for dark backgrounds",
    empty: "Not set, so your regular logo shows here.",
  },
];

/**
 * The "Site logo" source for an Image: links it to the site-wide logo, so it
 * updates everywhere when the logo changes in Site settings.
 */
export function SiteLogoSource({ rootProps, current, onPick }: SiteLogoSourceProps) {
  const company = rootProps?.company || {};
  return (
    <div className="space-y-2 p-3">
      <p className="text-neutral-content text-xs">
        Linked images change everywhere when you update your logo in Site settings.
      </p>
      {OPTIONS.map(({ variant, label, empty }) => {
        const token = SITE_LOGO_TOKENS[variant];
        const preview = previewUrlForSrc(token, rootProps);
        const own = variant === "light" ? company.logo : company.logoDark;
        const active = current === variant;
        return (
          <button
            key={variant}
            type="button"
            onClick={() => onPick(token)}
            className={`border-base-300 hover:bg-base-200 flex w-full items-center gap-3 rounded-lg border p-2 text-left ${active ? "ring-primary ring-2" : ""}`}
          >
            <span
              className={`flex size-12 shrink-0 items-center justify-center overflow-hidden rounded ${variant === "dark" ? "bg-neutral" : "bg-base-200"}`}
            >
              {preview ? (
                <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
              ) : (
                <TbPhoto className="text-neutral-content size-5" aria-hidden />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-base-content block text-sm font-medium">{label}</span>
              {!own ? <span className="text-neutral-content block text-xs">{empty}</span> : null}
            </span>
            {active ? <TbCheck className="text-primary size-4 shrink-0" aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}
