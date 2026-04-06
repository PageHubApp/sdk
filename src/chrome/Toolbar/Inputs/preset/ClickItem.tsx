import { useEditor, useNode } from "@craftjs/core";
import { useState } from "react";
import { TbExternalLink, TbPlayerPlay, TbPointer } from "react-icons/tb";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import LinkSettingsInput from "./LinkSettingsInput";

export default function ClickItem() {
  const { id } = useNode();
  const { query } = useEditor();

  const { clickMode, click } = useNode(node => {
    const click = node.data.props.click;
    const hasAction = click?.type && click?.value;
    return {
      clickMode: node.data.props.clickMode || (hasAction ? "action" : "link"),
      click,
    };
  });

  const [mode, setMode] = useState(clickMode);

  const handleTestAction = () => {
    if (!click?.value || !click?.type) return;

    const element = document.getElementById(click.value);
    if (!element) {
      console.warn(`Element with id "${click.value}" not found`);
      return;
    }

    if (click.type === "click" && click.direction) {
      // Modal targets: scroll to and flash the modal container
      if (element.hasAttribute("data-modal")) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.style.outline = "2px solid var(--primary, #3b82f6)";
        setTimeout(() => { element.style.outline = ""; }, 1500);
        return;
      }

      if (click.direction === "show") {
        element.classList.remove("hidden");
      } else if (click.direction === "hide") {
        element.classList.add("hidden");
      } else if (click.direction === "toggle") {
        if (element.classList.contains("hidden")) {
          element.classList.remove("hidden");
        } else {
          element.classList.add("hidden");
        }
      }
    }
  };

  return (
    <>
      <ToolbarSection title="Click" icon={<TbPointer />} help="What happens when someone clicks this element.">
        {/* Mode Toggle Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("link")}
            className={`flex-1 rounded-lg px-3 py-2 text-xs transition-colors ${
              mode === "link"
                ? "bg-accent text-accent-foreground hover:bg-accent"
                : "bg-muted text-muted-foreground hover:bg-muted"
            }`}
          >
            <TbExternalLink className="mr-1 inline" />
            Link
          </button>
          <button
            type="button"
            onClick={() => setMode("action")}
            className={`flex-1 rounded-lg px-3 py-2 text-xs transition-colors ${
              mode === "action"
                ? "bg-accent text-accent-foreground hover:bg-accent/90"
                : "bg-muted text-muted-foreground hover:bg-muted/90"
            }`}
          >
            <TbPointer className="mr-1 inline" />
            Action
          </button>
        </div>

        {/* Link Mode */}
        {mode === "link" && <LinkSettingsInput />}

        {/* Action Mode */}
        {mode === "action" && (
          <>
            <ToolbarSection full={1} title="Action" collapsible={false}>
              <p className="text-xs">Control a components visibility.</p>

              <ToolbarItem
                propKey="click.type"
                type="select"
                labelHide={true}
                label="Type"
                cols={true}
                propType="component"
              >
                <option value=""> </option>
                {["click", "hover"].map((_, k) => (
                  <option key={_}>{_}</option>
                ))}
              </ToolbarItem>

              <ToolbarItem
                propKey="click.direction"
                type="select"
                labelHide={true}
                label="Direction"
                cols={true}
                propType="component"
              >
                {["toggle", "show", "hide"].map((_, k) => (
                  <option key={_}>{_}</option>
                ))}
              </ToolbarItem>

              <ToolbarItem
                propKey="click.value"
                propType="component"
                type="text"
                label="Component"
                placeholder="ID of a component"
                labelHide={true}
                cols={true}
              />

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleTestAction}
                  disabled={!click?.value || !click?.type}
                  className="btn w-full"
                  title="Test Action"
                >
                  <TbPlayerPlay className="size-4" />
                  Test
                </button>
              </div>
            </ToolbarSection>
          </>
        )}
      </ToolbarSection>
    </>
  );
}
