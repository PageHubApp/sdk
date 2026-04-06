import { useNode } from "@craftjs/core";
import React from "react";
import { cssAnimationPresets, isCSSAnimation } from "utils/animations";
import { motionIt } from "utils/lib";
import { applyAnimation } from "utils/tailwind";
import { TbBolt } from "react-icons/tb";
import { TbRotate } from "react-icons/tb";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";

const EASING_OPTIONS = [
  { value: "", label: "Default" },
  { value: "easeOut", label: "Ease Out" },
  { value: "easeIn", label: "Ease In" },
  { value: "easeInOut", label: "Ease In Out" },
  { value: "linear", label: "Linear" },
  { value: "spring", label: "Spring" },
];

const TRIGGER_OPTIONS = [
  { value: "", label: "Default" },
  { value: "scroll", label: "On Scroll" },
  { value: "load", label: "On Load" },
  { value: "hover", label: "On Hover" },
];

const CSS_TRIGGER_OPTIONS = [
  { value: "", label: "Default" },
  { value: "scroll", label: "On Scroll" },
  { value: "load", label: "On Load" },
];

const ANIMATION_PARAM_KEYS = ["animationDuration", "animationDelay", "animationEasing", "animationTrigger"];

// Group CSS presets by category
const cssGroups = Object.entries(cssAnimationPresets).reduce((acc, [key, preset]) => {
  if (!acc[preset.group]) acc[preset.group] = [];
  acc[preset.group].push({ key, ...preset });
  return acc;
}, {} as Record<string, Array<{ key: string } & typeof cssAnimationPresets[string]>>);

export const AnimationsInput = () => {
  const {
    props,
    actions: { setProp },
  } = useNode(node => ({
    props: node.data.props,
  }));

  const currentAnimation = props.root?.animation || "";
  const hasAnimation = !!currentAnimation;
  const hasOverrides = ANIMATION_PARAM_KEYS.some(k => props.root?.[k]);

  // Engine is stored on the node — defaults to "css"
  const engine = props.root?.animationEngine || "css";
  const isCSS = engine === "css";

  const setEngine = (newEngine: "framer" | "css") => {
    setProp(p => {
      if (!p.root) p.root = {};
      p.root.animationEngine = newEngine;
      p.root.animation = "";
      ANIMATION_PARAM_KEYS.forEach(k => { delete p.root[k]; });
    });
  };

  const resetParams = () => {
    setProp(p => {
      ANIMATION_PARAM_KEYS.forEach(k => { delete p.root[k]; });
    });
  };

  // Hover presets don't use @keyframes so easing/trigger don't apply
  const isHoverPreset = isCSS && cssAnimationPresets[currentAnimation]?.trigger === "hover";
  const isContinuousPreset = isCSS && cssAnimationPresets[currentAnimation]?.trigger === "continuous";

  return (
    <>
      <ToolbarSection enabled={true} title="Animation" icon={<TbBolt />} help="Animate this element when it scrolls into view.">
        {/* Engine toggle */}
        <div className="mb-2 flex gap-1 rounded-md bg-muted p-0.5">
          <button
            type="button"
            onClick={() => engine !== "css" && setEngine("css")}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${engine === "css" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            CSS / Tailwind
          </button>
          <button
            type="button"
            onClick={() => engine !== "framer" && setEngine("framer")}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${engine === "framer" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Framer Motion
          </button>
        </div>

        {engine === "css" ? (
          /* ── CSS / Tailwind presets ─────────────────────────────────── */
          <ToolbarItem propType="root" propKey="animation" type="select" label="Type">
            <option value="">None</option>
            {Object.entries(cssGroups).map(([group, presets]) => (
              <optgroup key={group} label={group}>
                {presets.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </optgroup>
            ))}
          </ToolbarItem>
        ) : (
          /* ── Framer Motion presets ──────────────────────────────────── */
          <ToolbarItem propType="root" propKey="animation" type="select" label="Type">
            <option value="">None</option>
            <optgroup label="Entrance">
              <option value="fadeIn">Fade In</option>
              <option value="fadeUp">Fade Up</option>
              <option value="fadeDown">Fade Down</option>
              <option value="fadeLeft">Fade Left</option>
              <option value="fadeRight">Fade Right</option>
              <option value="scaleUp">Scale Up</option>
              <option value="blurIn">Blur In</option>
              <option value="slideUp">Slide Up</option>
              <option value="flipIn">Flip In</option>
              <option value="spring">Spring</option>
            </optgroup>
            <optgroup label="Hover">
              <option value="hoverGrow">Grow on Hover</option>
              <option value="hoverLift">Lift on Hover</option>
              <option value="hoverGlow">Glow on Hover</option>
              <option value="press">Press</option>
            </optgroup>
            <optgroup label="Continuous">
              <option value="tween">Tween</option>
              <option value="bounce">Bounce</option>
            </optgroup>
          </ToolbarItem>
        )}

        {hasAnimation && (
          <>
            <ToolbarItem
              propType="root"
              propKey="animationDuration"
              type="slider"
              label="Duration"
              min={0.1}
              max={2}
              step={0.1}
              append={<span className="w-8 text-right text-[10px] text-muted-foreground">{props.root?.animationDuration || "—"}s</span>}
            />
            {!isHoverPreset && (
              <ToolbarItem
                propType="root"
                propKey="animationDelay"
                type="slider"
                label="Delay"
                min={0}
                max={1}
                step={0.05}
                append={<span className="w-8 text-right text-[10px] text-muted-foreground">{props.root?.animationDelay || "0"}s</span>}
              />
            )}
            {!isHoverPreset && (
              <ToolbarItem propType="root" propKey="animationEasing" type="select" label="Easing">
                {EASING_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </ToolbarItem>
            )}
            {!isHoverPreset && !isContinuousPreset && (
              <ToolbarItem propType="root" propKey="animationTrigger" type="select" label="Trigger">
                {(isCSS ? CSS_TRIGGER_OPTIONS : TRIGGER_OPTIONS).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </ToolbarItem>
            )}

            {hasOverrides && (
              <button
                type="button"
                onClick={resetParams}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <TbRotate size={12} />
                Reset to defaults
              </button>
            )}
          </>
        )}

        {/* Live preview */}
        {hasAnimation && (() => {
          const animProps = applyAnimation({}, props);
          // Force-unpause scroll animations in the preview so they play immediately
          if (animProps.className?.includes("ph-anim-scroll")) {
            animProps.className = animProps.className.replace("ph-anim-scroll", "").trim() + " ph-in-view";
            delete animProps.ref;
          }
          return React.createElement(
            motionIt(props, "div"),
            { ...animProps, key: currentAnimation },
            <div className="mx-auto mt-6 flex size-24 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              Test
            </div>
          );
        })()}
      </ToolbarSection>
    </>
  );
};
