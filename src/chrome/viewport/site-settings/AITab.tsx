import React from "react";
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
    <div className="space-y-6">
      <SiteAiToneForm {...props} showIntroHeading />
    </div>
  );
}
