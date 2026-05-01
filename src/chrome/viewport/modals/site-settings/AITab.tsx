import React from "react";
import { settingsTabRootClass } from "../settings/SettingsTabChrome";
import { SiteAiToneForm } from "./SiteAiToneForm";

interface AITabProps {
  inputClass: string;
  designNotes: string;
  setDesignNotes: (v: string) => void;
  designTags: string[];
  setDesignTags: (v: string[]) => void;
}

export function AITab(props: AITabProps) {
  return (
    <div className={settingsTabRootClass}>
      <SiteAiToneForm {...props} showIntroHeading />
    </div>
  );
}
