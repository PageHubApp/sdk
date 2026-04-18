import { useEditor } from "@craftjs/core";
import React, { useMemo } from "react";
import { getEditorVariableOptions } from "../../../utils/editorVariableOptions";
import { SettingsTabIntro, settingsTabRootClass } from "../settings/SettingsTabChrome";

const HTMLCodeInput = React.lazy(() =>
  import("../../toolbar/inputs/advanced/HTMLCodeInput").then(m => ({ default: m.HTMLCodeInput }))
);

interface CodeTabProps {
  headerCode: string;
  setHeaderCode: (v: string) => void;
  footerCode: string;
  setFooterCode: (v: string) => void;
}

export function CodeTab({ headerCode, setHeaderCode, footerCode, setFooterCode }: CodeTabProps) {
  const { query } = useEditor();
  const variableCompletionOptions = useMemo(() => getEditorVariableOptions(query), [query]);

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Custom code"
        description="Inject site-wide snippets into the document head or before the closing body tag. Prefer Site Settings integrations when a provider is listed there."
      />
      <HTMLCodeInput
        value={headerCode}
        onChange={setHeaderCode}
        label="Header Code"
        height="200px"
        placeholder="<style>...</style>&#10;<script>...</script>"
        helpText="Custom CSS and JavaScript injected into the &lt;head&gt; of every page"
        formatMountKey="site-settings-header-code"
        variableCompletionOptions={variableCompletionOptions}
      />

      <HTMLCodeInput
        value={footerCode}
        onChange={setFooterCode}
        label="Footer Code"
        height="200px"
        placeholder="<script>...</script>"
        helpText="Scripts injected before the closing &lt;/body&gt; tag"
        formatMountKey="site-settings-footer-code"
        variableCompletionOptions={variableCompletionOptions}
      />
    </div>
  );
}
