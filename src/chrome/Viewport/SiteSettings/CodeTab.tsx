import React from "react";

const HTMLCodeInput = React.lazy(() => import("../../Toolbar/Inputs/advanced/HTMLCodeInput").then(m => ({ default: m.HTMLCodeInput })));

interface CodeTabProps {
  headerCode: string;
  setHeaderCode: (v: string) => void;
  footerCode: string;
  setFooterCode: (v: string) => void;
}

export function CodeTab({ headerCode, setHeaderCode, footerCode, setFooterCode }: CodeTabProps) {
  return (
    <div className="space-y-6">
      <HTMLCodeInput
        value={headerCode}
        onChange={setHeaderCode}
        label="Header Code"
        height="200px"
        placeholder="<style>...</style>&#10;<script>...</script>"
        helpText="Custom CSS and JavaScript injected into the &lt;head&gt; of every page"
      />

      <HTMLCodeInput
        value={footerCode}
        onChange={setFooterCode}
        label="Footer Code"
        height="200px"
        placeholder="<script>...</script>"
        helpText="Scripts injected before the closing &lt;/body&gt; tag"
      />
    </div>
  );
}
