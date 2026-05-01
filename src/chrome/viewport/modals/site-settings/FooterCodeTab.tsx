import { useEditor } from "@craftjs/core";
import React, { useMemo } from "react";
import { getEditorVariableOptions } from "../../../../utils/editorVariableOptions";
import { SettingsTabIntro, settingsTabFillRootClass } from "../settings/SettingsTabChrome";

const HTMLCodeInput = React.lazy(() =>
  import("../../../toolbar/inputs/advanced/HTMLCodeInput").then(m => ({ default: m.HTMLCodeInput }))
);

interface FooterCodeTabProps {
  footerCode: string;
  setFooterCode: (v: string) => void;
}

export function FooterCodeTab({ footerCode, setFooterCode }: FooterCodeTabProps) {
  const { query } = useEditor();
  const variableCompletionOptions = useMemo(() => getEditorVariableOptions(query), [query]);

  return (
    <div className={settingsTabFillRootClass}>
      <SettingsTabIntro
        title="Footer code"
        description="Snippets injected before the closing </body> tag of every page. Use for late-loading <script> tags."
      />
      <HTMLCodeInput
        value={footerCode}
        onChange={setFooterCode}
        height="100%"
        placeholder="<script>...</script>"
        formatMountKey="site-settings-footer-code"
        variableCompletionOptions={variableCompletionOptions}
        className="min-h-0 flex-1"
        editorContainerClassName="flex-1 min-h-0"
      />
    </div>
  );
}
