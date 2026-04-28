import React from "react";
import { TbPlus, TbTrash } from "react-icons/tb";
import {
  SettingsFormCard,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";

interface ThemeOverride {
  varName: string;
  value: string;
}

interface ThemeOverridesTabProps {
  inputClass: string;
  themeOverrides: ThemeOverride[];
  setThemeOverrides: (v: ThemeOverride[]) => void;
}

export function ThemeOverridesTab({
  inputClass,
  themeOverrides,
  setThemeOverrides,
}: ThemeOverridesTabProps) {
  const addOverride = () => {
    setThemeOverrides([...themeOverrides, { varName: "", value: "" }]);
  };

  const updateOverride = (index: number, field: "varName" | "value", val: string) => {
    const next = [...themeOverrides];
    next[index] = { ...next[index], [field]: val };
    setThemeOverrides(next);
  };

  const removeOverride = (index: number) => {
    setThemeOverrides(themeOverrides.filter((_, i) => i !== index));
  };

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Theme overrides"
        description="Override design tokens for this page only. Use CSS variable names without the leading --."
      />

      <SettingsFormCard title="Variables">
        <div className="flex items-center justify-between gap-2">
          <p className="text-neutral-content text-sm">
            {themeOverrides.length === 0
              ? "No overrides yet."
              : `${themeOverrides.length} ${themeOverrides.length === 1 ? "override" : "overrides"}`}
          </p>
          <button
            type="button"
            onClick={addOverride}
            className="btn btn-secondary btn-sm shrink-0 gap-1"
          >
            <TbPlus className="size-3.5" />
            Add override
          </button>
        </div>

        {themeOverrides.length > 0 ? (
          <div className="space-y-2">
            <div className="text-neutral-content grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2 text-xs font-medium">
              <span>Variable</span>
              <span>Value</span>
              <span className="size-9" aria-hidden />
            </div>
            {themeOverrides.map((override, i) => (
              <div
                key={i}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] items-center gap-2"
              >
                <label className="input flex items-center">
                  <span className="text-neutral-content shrink-0 font-mono text-xs">--</span>
                  <input
                    type="text"
                    value={override.varName}
                    onChange={e => updateOverride(i, "varName", e.target.value)}
                    className="grow font-mono text-xs"
                    placeholder="var-name"
                    aria-label="CSS variable name"
                  />
                </label>
                <input
                  type="text"
                  value={override.value}
                  onChange={e => updateOverride(i, "value", e.target.value)}
                  className={`${inputClass} font-mono text-xs`}
                  placeholder="#fff or 1rem"
                  aria-label="CSS value"
                />
                <button
                  type="button"
                  onClick={() => removeOverride(i)}
                  className="btn btn-ghost btn-square btn-sm hover:text-error"
                  aria-label="Remove override"
                >
                  <TbTrash className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </SettingsFormCard>
    </div>
  );
}
