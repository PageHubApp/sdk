import type { ReactNode } from "react";

/** Max-width column for settings tab bodies inside SettingsShell. */
export const settingsTabRootClass = "mx-auto flex w-full max-w-3xl flex-col gap-6";

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
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border-base-300 bg-base-200/25 rounded-xl border p-5 shadow-sm ${className}`.trim()}
    >
      {title ? (
        <h3 className="text-base-content mb-4 text-sm font-semibold tracking-tight">{title}</h3>
      ) : null}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function SettingsFormField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="text-base-content block text-sm font-semibold tracking-tight"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-neutral-content text-xs leading-relaxed">{hint}</p> : null}
    </div>
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
