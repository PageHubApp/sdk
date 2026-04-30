import { useEditor } from "@craftjs/core";
import React, { useMemo } from "react";
import { getEditorVariableOptions } from "../../../utils/editorVariableOptions";
import { SettingsTabIntro, settingsTabFillRootClass } from "../settings/SettingsTabChrome";

const HTMLCodeInput = React.lazy(() =>
  import("../../toolbar/inputs/advanced/HTMLCodeInput").then(m => ({ default: m.HTMLCodeInput }))
);

interface HeaderCodeTabProps {
  headerCode: string;
  setHeaderCode: (v: string) => void;
}

export function HeaderCodeTab({ headerCode, setHeaderCode }: HeaderCodeTabProps) {
  const { query } = useEditor();
  const variableCompletionOptions = useMemo(() => getEditorVariableOptions(query), [query]);

  return (
    <div className={settingsTabFillRootClass}>
      <SettingsTabIntro
        title="Header code"
        description="Snippets injected into the <head> of every page. Use for verification meta tags, custom <style>, or analytics not covered in Integrations."
      />
      <HTMLCodeInput
        value={headerCode}
        onChange={setHeaderCode}
        height="100%"
        placeholder="<style>...</style>&#10;<script>...</script>"
        formatMountKey="site-settings-header-code"
        variableCompletionOptions={variableCompletionOptions}
        className="min-h-0 flex-1"
        editorContainerClassName="flex-1 min-h-0"
      />
    </div>
  );
}
