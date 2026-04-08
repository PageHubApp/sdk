import React from "react";
import type { SettingsSectionEntry } from "./registry/types";
import type { HideKey, ToolbarConfig } from "./types";

interface Props {
  sections: SettingsSectionEntry[];
  toolbar: ToolbarConfig | undefined;
  hidden: Set<HideKey>;
  override?: Record<string, React.ReactNode>;
}

/**
 * Renders an array of registry section entries.
 * Handles override substitution and disabled-section placeholders.
 */
export function RegistrySectionList({ sections, toolbar, hidden, override }: Props) {
  return (
    <>
      {sections.map((entry) => {
        // Override: swap content for matching title
        if (override?.[entry.title] !== undefined) {
          return <React.Fragment key={entry.id}>{override[entry.title]}</React.Fragment>;
        }

        // Hidden: skip entirely
        if (entry.hideKey && hidden.has(entry.hideKey)) {
          return null;
        }

        const Component = entry.component;
        return (
          <React.Fragment key={entry.id}>
            <Component toolbar={toolbar} hidden={hidden} />
          </React.Fragment>
        );
      })}
    </>
  );
}
