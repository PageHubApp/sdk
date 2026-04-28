import { useEditor } from "@craftjs/core";
import React, { useMemo } from "react";
import { getEditorVariableOptions } from "../../../utils/editorVariableOptions";
import {
  SettingsTabIntro,
  settingsTabFillRootClass,
} from "../settings/SettingsTabChrome";

const HTMLCodeInput = React.lazy(() =>
  import("../../toolbar/inputs/advanced/HTMLCodeInput").then(m => ({ default: m.HTMLCodeInput }))
);

interface HeadCodeTabProps {
  headCode: string;
  setHeadCode: (v: string) => void;
}

export function HeadCodeTab({ headCode, setHeadCode }: HeadCodeTabProps) {
  const { query } = useEditor();
  const variableCompletionOptions = useMemo(() => getEditorVariableOptions(query), [query]);

  return (
    <div className={settingsTabFillRootClass}>
      <SettingsTabIntro
        title="Custom head code"
        description="HTML injected into <head> for this page only. Use for verification meta tags, page-specific <style>, or one-off scripts."
      />
      <HTMLCodeInput
        value={headCode}
        onChange={setHeadCode}
        height="100%"
        placeholder={'<script>…</script>\n<link rel="stylesheet" href="…">'}
        formatMountKey="page-settings-head-code"
        variableCompletionOptions={variableCompletionOptions}
        className="min-h-0 flex-1"
        editorContainerClassName="flex-1 min-h-0"
      />
    </div>
  );
}
