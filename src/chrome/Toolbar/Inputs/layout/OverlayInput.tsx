import { useNode } from "@craftjs/core";
import { ToolbarSection } from "../../ToolbarSection";
import { ToolbarDropdown } from "../../ToolbarDropdown";

const PRESETS = [
  { label: "Dark Left", value: "dark-left" },
  { label: "Dark Right", value: "dark-right" },
  { label: "Dark Bottom", value: "dark-bottom" },
  { label: "Dark Top", value: "dark-top" },
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
];

const DIRECTIONS = [
  { label: "Top → Bottom", value: "to bottom" },
  { label: "Bottom → Top", value: "to top" },
  { label: "Left → Right", value: "to right" },
  { label: "Right → Left", value: "to left" },
  { label: "Diagonal ↘", value: "to bottom right" },
  { label: "Diagonal ↙", value: "to bottom left" },
];

export const OverlayInput = () => {
  const {
    overlay,
    actions: { setProp },
  } = useNode(node => ({
    overlay: node.data.props.backgroundOverlay,
  }));

  const isCustom = typeof overlay === "object";
  const modeValue = isCustom ? "__custom__" : (typeof overlay === "string" ? overlay : "");

  const setOverlay = (value: any) => {
    setProp((props: any) => {
      if (value === null) {
        delete props.backgroundOverlay;
      } else {
        props.backgroundOverlay = value;
      }
    });
  };

  const setCustomField = (field: string, value: any) => {
    setProp((props: any) => {
      if (!props.backgroundOverlay || typeof props.backgroundOverlay !== "object") {
        props.backgroundOverlay = {
          direction: "to bottom",
          from: { color: "#000000", opacity: 70 },
          to: { color: "#000000", opacity: 0 },
        };
      }
      const parts = field.split(".");
      if (parts.length === 2) {
        if (!props.backgroundOverlay[parts[0]]) props.backgroundOverlay[parts[0]] = {};
        props.backgroundOverlay[parts[0]][parts[1]] = value;
      } else {
        props.backgroundOverlay[field] = value;
      }
    });
  };

  const handleModeChange = (val: string) => {
    if (val === "") {
      setOverlay(null);
    } else if (val === "__custom__") {
      setOverlay({
        direction: "to bottom",
        from: { color: "#000000", opacity: 70 },
        to: { color: "#000000", opacity: 0 },
      });
    } else {
      setOverlay(val);
    }
  };

  return (
    <ToolbarSection title="Overlay" nested={true}>
      <ToolbarDropdown
        value={modeValue}
        onChange={handleModeChange}
        placeholder="None"
        propKey="backgroundOverlay"
      >
        <option value="">None</option>
        {PRESETS.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
        <option value="__custom__">Custom</option>
      </ToolbarDropdown>

      {isCustom && (
        <>
          <ToolbarDropdown
            value={overlay?.direction || "to bottom"}
            onChange={val => setCustomField("direction", val)}
            title="Direction"
            propKey="overlayDirection"
          >
            {DIRECTIONS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </ToolbarDropdown>

          <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-x-2 gap-y-2">
            <h4 className="toolbar-label mb-0">From</h4>
            <input
              type="color"
              value={overlay?.from?.color || "#000000"}
              onChange={e => setCustomField("from.color", e.target.value)}
              className="h-5 w-5 cursor-pointer rounded border border-border bg-transparent p-0"
            />
            <input
              type="range"
              min={0}
              max={100}
              value={overlay?.from?.opacity ?? 70}
              onChange={e => setCustomField("from.opacity", parseInt(e.target.value))}
              className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted"
            />
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {overlay?.from?.opacity ?? 70}%
            </span>

            <h4 className="toolbar-label mb-0">To</h4>
            <input
              type="color"
              value={overlay?.to?.color || "#000000"}
              onChange={e => setCustomField("to.color", e.target.value)}
              className="h-5 w-5 cursor-pointer rounded border border-border bg-transparent p-0"
            />
            <input
              type="range"
              min={0}
              max={100}
              value={overlay?.to?.opacity ?? 0}
              onChange={e => setCustomField("to.opacity", parseInt(e.target.value))}
              className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted"
            />
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {overlay?.to?.opacity ?? 0}%
            </span>
          </div>
        </>
      )}
    </ToolbarSection>
  );
};
