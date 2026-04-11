import { useEditor, useNode } from "@craftjs/core";
import React from "react";
import { cssAnimationPresets, isCSSAnimation } from "utils/animations";
import { motionIt } from "utils/lib";
import { applyAnimation } from "utils/tailwind";
import { TbBolt, TbTimeline } from "react-icons/tb";
import { TbRotate } from "react-icons/tb";
import { ToolbarSegmentedControl } from "../../Helpers/ToolbarSegmentedControl";
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
  { value: "hover", label: "On Hover" },
];

const ANIMATION_PARAM_KEYS = ["animationDuration", "animationDelay", "animationEasing", "animationTrigger", "animationLoop", "animationStagger", "animationExit"];

// Group CSS presets by category
const cssGroups = Object.entries(cssAnimationPresets).reduce((acc, [key, preset]) => {
  if (!acc[preset.group]) acc[preset.group] = [];
  acc[preset.group].push({ key, ...preset });
  return acc;
}, {} as Record<string, Array<{ key: string } & typeof cssAnimationPresets[string]>>);

const SCROLL_TIMELINE_TIMING = [
  { value: "early", label: "Early (0–33%)", start: 0, end: 33 },
  { value: "middle", label: "Middle (25–66%)", start: 25, end: 66 },
  { value: "late", label: "Late (50–100%)", start: 50, end: 100 },
  { value: "full", label: "Full (0–100%)", start: 0, end: 100 },
];

/** Detects if this node's parent section uses scroll-timeline. */
function useParentScrollTimeline(): boolean {
  const { id } = useNode();
  const { query } = useEditor();
  try {
    const node = query.node(id).get();
    let parentId = node?.data?.parent;
    while (parentId) {
      const parent = query.node(parentId).get();
      if (parent?.data?.props?.scrollEffect === "scroll-timeline") return true;
      // Walk up — check if this parent's parent is a timeline section
      parentId = parent?.data?.parent;
    }
  } catch { /* node not found */ }
  return false;
}

export const AnimationsInput = () => {
  const {
    props,
    actions: { setProp },
  } = useNode(node => ({
    props: node.data.props,
  }));

  const isInScrollTimeline = useParentScrollTimeline();
  const stConfig = props.root?.scrollTimeline;

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
      {isInScrollTimeline && (
        <ToolbarSection enabled={true} title="Scroll Timeline" icon={<TbTimeline />} help="Animate this element as the parent section scrolls. Pick what happens and when.">
          <ToolbarItem propKey="root.scrollTimeline.preset" propType="component" type="select" label="Animation">
            <option value="">None</option>
            <option value="fadeIn">Fade In</option>
            <option value="fadeOut">Fade Out</option>
            <option value="scaleUp">Scale Up</option>
            <option value="slideLeft">Slide from Right</option>
            <option value="slideRight">Slide from Left</option>
            <option value="slideUp">Slide Up</option>
            <option value="slideDown">Slide Down</option>
            <option value="rotateIn">Rotate In</option>
            <option value="fadeScale">Fade + Scale</option>
            <option value="slideRotate">Slide + Rotate</option>
          </ToolbarItem>

          {stConfig?.preset && (
            <ToolbarItem propKey="root.scrollTimeline._timing" propType="component" type="select" label="Timing"
              onChange={(val: string) => {
                const timing = SCROLL_TIMELINE_TIMING.find(t => t.value === val);
                if (timing) {
                  setProp(p => {
                    if (!p.root) p.root = {};
                    if (!p.root.scrollTimeline) p.root.scrollTimeline = {};
                    p.root.scrollTimeline.startProgress = timing.start;
                    p.root.scrollTimeline.endProgress = timing.end;
                    p.root.scrollTimeline._timing = val;
                  });
                }
              }}
            >
              {SCROLL_TIMELINE_TIMING.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </ToolbarItem>
          )}
        </ToolbarSection>
      )}

      <ToolbarSection enabled={true} title="Animation" icon={<TbBolt />} help="Animate this element when it scrolls into view.">
        <div className="mb-2">
          <ToolbarSegmentedControl
            dense
            aria-label="Animation engine"
            value={engine}
            onChange={setEngine}
            options={[
              { value: "css", label: "CSS / Tailwind" },
              { value: "framer", label: "Framer Motion" },
            ]}
          />
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
              append={<span className="w-8 text-right text-[10px] text-neutral-content">{props.root?.animationDuration || "—"}s</span>}
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
                append={<span className="w-8 text-right text-[10px] text-neutral-content">{props.root?.animationDelay || "0"}s</span>}
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

            {/* Loop toggle */}
            {!isHoverPreset && (
              <ToolbarItem propType="root" propKey="animationLoop" type="select" label="Repeat">
                <option value="">Play Once</option>
                <option value="loop">Loop</option>
                <option value="2">2×</option>
                <option value="3">3×</option>
              </ToolbarItem>
            )}

            {/* Stagger children — Framer only */}
            {!isCSS && (
              <ToolbarItem
                propType="root"
                propKey="animationStagger"
                type="slider"
                label="Stagger"
                min={0}
                max={0.5}
                step={0.02}
                append={<span className="w-8 text-right text-[10px] text-neutral-content">{props.root?.animationStagger || "0"}s</span>}
              />
            )}

            {/* Exit animation — Framer only */}
            {!isCSS && !isHoverPreset && !isContinuousPreset && (
              <ToolbarItem propType="root" propKey="animationExit" type="select" label="Exit">
                <option value="">None</option>
                <option value="fadeOut">Fade Out</option>
                <option value="fadeDown">Fade Down</option>
                <option value="fadeUp">Fade Up</option>
                <option value="scaleDown">Scale Down</option>
                <option value="blurOut">Blur Out</option>
              </ToolbarItem>
            )}

            {hasOverrides && (
              <button
                type="button"
                onClick={resetParams}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-neutral-content transition-colors hover:bg-neutral hover:text-base-content"
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
            <div className="mx-auto mt-6 flex size-24 items-center justify-center rounded-2xl bg-neutral text-neutral-content">
              Test
            </div>
          );
        })()}
      </ToolbarSection>
    </>
  );
};
