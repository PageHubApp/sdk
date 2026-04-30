import { useState, type ReactNode } from "react";
import { TbCheck, TbCopy } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../primitives/layout/tooltipSurface";

/** Max-width column for settings tab bodies inside SettingsShell. */
export const settingsTabRootClass = "mx-auto flex w-full max-w-3xl flex-col gap-6";

/**
 * Full-bleed, full-height tab body. Use for tabs whose primary surface is a
 * code editor / canvas / large grid that should stretch to fill the modal
 * content area. Children should use `flex-1 min-h-0` to grow into the
 * remaining space.
 */
export const settingsTabFillRootClass = "flex w-full flex-1 flex-col gap-4 min-h-0";

export function SettingsTabIntro({ title, description }: { title: string; description: string }) {
  return (
    <header className="space-y-1.5">
      <h2 className="text-base-content text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-neutral-content text-sm leading-relaxed">{description}</p>
    </header>
  );
}

export function SettingsFormCard({
  title,
  children,
  className = "",
  variant = "section",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  /**
   * Visual treatment.
   * - `"section"` (default): heading + content separated from siblings by a
   *   top divider. No background, no border box. Right for plain form
   *   groups (Identity, Search, Behavior, etc.).
   * - `"card"`: bordered, slightly tinted card. Right for sections that
   *   should visually stand apart — Danger zone, billing, plan upgrade.
   */
  variant?: "section" | "card";
}) {
  if (variant === "card") {
    return (
      <section
        className={`border-base-300 bg-base-200/25 rounded-xl border p-5 shadow-sm ${className}`.trim()}
      >
        {title ? (
          <h3 className="text-base-content mb-4 text-base font-semibold tracking-tight">{title}</h3>
        ) : null}
        <div className="space-y-4">{children}</div>
      </section>
    );
  }

  return (
    <section
      className={`border-base-300 border-t pt-6 first-of-type:border-t-0 first-of-type:pt-0 ${className}`.trim()}
    >
      {title ? (
        <h3 className="text-base-content mb-4 text-base font-semibold tracking-tight">{title}</h3>
      ) : null}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function SettingsFormField({
  label,
  htmlFor,
  hint,
  variable,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  /**
   * Template variable token this field maps to (e.g. `company.name`). When set,
   * a click-to-copy chip renders to the right of the label showing
   * `{{<variable>}}`.
   */
  variable?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-base-content block text-sm font-semibold tracking-tight"
        >
          {label}
        </label>
        {variable ? <VariableTokenChip variable={variable} /> : null}
      </div>
      {children}
      {hint ? <p className="text-neutral-content text-xs leading-relaxed">{hint}</p> : null}
    </div>
  );
}

/** Click-to-copy chip showing a `{{variable}}` token. Truncates on overflow. */
export function VariableTokenChip({ variable }: { variable: string }) {
  const [copied, setCopied] = useState(false);
  const token = `{{${variable}}}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={copied ? "Copied" : "Click to copy"}
      className="border-base-300 bg-base-200 text-neutral-content hover:border-primary hover:text-base-content flex max-w-[60%] min-w-0 items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs transition-colors"
    >
      {copied ? (
        <TbCheck className="text-success size-3 shrink-0" />
      ) : (
        <TbCopy className="size-3 shrink-0" />
      )}
      <span className="min-w-0 truncate">{token}</span>
    </button>
  );
}

export function SettingsCallout({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
}) {
  return (
    <aside className="border-base-300 bg-base-200/35 rounded-xl border p-4">
      <div className="flex gap-3">
        {icon ? (
          <span className="text-primary mt-0.5 shrink-0 [&>svg]:size-5" aria-hidden>
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 space-y-1 text-sm leading-relaxed">
          {title ? <p className="text-base-content font-semibold">{title}</p> : null}
          <div className="text-neutral-content">{children}</div>
        </div>
      </div>
    </aside>
  );
}

export const settingsCollapsibleShellClass = "border-base-300 overflow-hidden rounded-xl border";

export const settingsCollapsibleTriggerClass =
  "bg-base-200/40 hover:bg-base-200/70 flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors";
