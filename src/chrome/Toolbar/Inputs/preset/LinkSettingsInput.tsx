import { useNode } from "@craftjs/core";
import { changeProp } from "../../../Viewport/lib";
import { PageSelector } from "../../../Viewport/PageSelector";
import { Tooltip } from "components/layout/Tooltip";
import { useEffect, useState } from "react";
import { TbExternalLink, TbHash } from "react-icons/tb";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { Wrap } from "../../ToolbarStyle";

interface LinkSettingsInputProps {
  propKey?: string;
  index?: number;
  showAnchor?: boolean;
  suggestedPageName?: string;
  inline?: boolean;
  inputWidth?: string;
  labelWidth?: string;
}

const LinkSettingsInput = ({
  propKey = "url",
  index,
  showAnchor = true,
  suggestedPageName,
  inline = true,
  inputWidth = "",
  labelWidth = "",
}: LinkSettingsInputProps = {}) => {
  const {
    actions: { setProp },
  } = useNode(node => ({
    id: node.id,
  }));

  // If index is provided, we're working with an array item (like buttons)
  const isArrayItem = index !== undefined;

  const [linkType, setLinkType] = useState<"external" | "page">("page");
  const [selectedPageId, setSelectedPageId] = useState<string>("");

  // Get current URL value to detect if it's a page reference
  const { nodeProps } = useNode(node => ({
    nodeProps: node.data.props,
  }));

  const currentUrl = isArrayItem ? nodeProps[propKey]?.[index]?.url || "" : nodeProps.url || "";

  // Detect link type on mount and when URL changes
  useEffect(() => {
    // Treat "#" as empty/null
    const urlToCheck = currentUrl === "#" ? "" : currentUrl;

    if (urlToCheck.startsWith("ref:")) {
      const pageId = urlToCheck.replace("ref:", "");
      setSelectedPageId(prevId => (prevId !== pageId ? pageId : prevId));
      setLinkType(prevType => (prevType !== "page" ? "page" : prevType));
    } else if (urlToCheck) {
      setLinkType(prevType => (prevType !== "external" ? "external" : prevType));
    } else {
      // Default to page mode for empty URLs
      setLinkType("page");
    }
  }, [currentUrl]);

  const handlePagePick = (page: { id: string; displayName: string; isHomePage: boolean }) => {
    // Use internal page reference format: ref:<pageId>
    const pageRef = `ref:${page.id}`;

    // Update the URL field
    changeProp({
      setProp,
      propKey: isArrayItem ? propKey : "url",
      propType: "component",
      value: pageRef,
      index: isArrayItem ? index : undefined,
      propItemKey: isArrayItem ? "url" : undefined,
    });

    setSelectedPageId(page.id);
  };

  const handleClearLink = () => {
    // Clear the URL by setting it to null
    changeProp({
      setProp,
      propKey: isArrayItem ? propKey : "url",
      propType: "component",
      value: null,
      index: isArrayItem ? index : undefined,
      propItemKey: isArrayItem ? "url" : undefined,
    });
    setSelectedPageId("");
  };

  const handleUrlChange = (value: string) => {
    // Convert "#" to null/empty
    const processedValue = value === "#" ? null : value;

    changeProp({
      setProp,
      propKey: isArrayItem ? propKey : "url",
      propType: "component",
      value: processedValue,
      index: isArrayItem ? index : undefined,
      propItemKey: isArrayItem ? "url" : undefined,
    });
  };

  const toggleButton = (
    <Tooltip
      content={linkType === "page" ? "Switch to External URL" : "Switch to Page"}
      placement="top"
    >
      <button
        type="button"
        onClick={() => setLinkType(linkType === "page" ? "external" : "page")}
        className="flex items-center justify-center rounded-lg p-2 text-xs transition-colors hover:bg-muted"
      >
        {linkType === "page" ? <TbExternalLink /> : <TbHash />}
      </button>
    </Tooltip>
  );

  return (
    <>
      <ToolbarSection
        full={1}
        title="Link"
        help="Provide a valid URL or select an internal page."
        collapsible={false}
      >
        {linkType === "external" ? (
          <ToolbarItem
            propKey={isArrayItem ? propKey : "url"}
            propType="component"
            index={isArrayItem ? index : undefined}
            propItemKey={isArrayItem ? "url" : undefined}
            type="text"
            label="URL"
            labelHide={true}
            placeholder="https://...."
            inline={inline}
            inputWidth={inputWidth}
            labelWidth={labelWidth}
            append={toggleButton}
            onChange={handleUrlChange}
          />
        ) : (
          <Wrap
            props={{ label: "Page", labelHide: false }}
            inline={inline}
            inputWidth={inputWidth}
            labelWidth={labelWidth}
          >
            <div className="input-wrapper flex w-full items-center gap-2">
              <PageSelector
                pickerMode={true}
                onPagePick={handlePagePick}
                selectedPageId={selectedPageId}
                className="flex-1"
                buttonClassName="input-plain w-full flex items-center justify-between"
                suggestedPageName={suggestedPageName}
                showHashIcon={false}
              />
              {currentUrl && (
                <Tooltip content="Clear link" placement="top">
                  <button
                    type="button"
                    onClick={handleClearLink}
                    className="flex items-center justify-center rounded-lg p-2 text-xs text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  >
                    ×
                  </button>
                </Tooltip>
              )}
              {toggleButton}
            </div>
          </Wrap>
        )}

        <ToolbarItem
          propKey={isArrayItem ? propKey : "urlTarget"}
          propType="component"
          index={isArrayItem ? index : undefined}
          propItemKey={isArrayItem ? "urlTarget" : undefined}
          type="select"
          label="Target"
          inline={inline}
          inputWidth={inputWidth}
          labelWidth={labelWidth}
        >
          <option value="_self">Same tab</option>
          <option value="_blank">New tab</option>
          <option value="_parent">Parent window</option>
          <option value="_top">New window</option>
        </ToolbarItem>

        <ToolbarItem
          propKey="anchor"
          propType="component"
          type="text"
          labelHide={true}
          label="Anchor Tag"
          inline={inline}
          inputWidth={inputWidth}
          labelWidth={labelWidth}
        />
      </ToolbarSection>
    </>
  );
};

export default LinkSettingsInput;
