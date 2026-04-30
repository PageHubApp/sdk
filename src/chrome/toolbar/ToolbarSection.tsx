import { AutoHideScrollbar } from "@/chrome/primitives/layout/AutoHideScrollbar";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { useEffect, useState } from "react";
import { TbChevronRight } from "react-icons/tb";
import { useAccordionContext } from "./AccordionContext";
import { BreakpointChip } from "./breakpoint-chip/BreakpointChip";
import { SectionOverrideDot } from "./breakpoint-chip/SectionOverrideDot";

export const ToolbarSection = ({
  title,
  icon,
  children,
  full = 1,
  enabled = true,
  onClick,
  propKey,
  propKeys,
  tabClass = true,
  className = "",
  bodyClassName = "",
  subtitle = false,
  help = "",
  collapsible = true,
  defaultOpen = true,
  footer,
  nested = false,
  scrollable = false,
  maxHeight = "150px",
  header,
  showChevron = false,
  accordionPassive = false,
  disabled = false,
}: any) => {
  // Aggregate override dot is rendered via <SectionOverrideDot/> below — a
  // sub-component that only mounts when `propKeys` is non-empty. This keeps
  // `useNode` (which is required by the override hook) out of contexts that
  // render ToolbarSection OUTSIDE an <Editor> (e.g. ThemeSettings panel).
  const accordionCtx = useAccordionContext();
  const managed = accordionCtx && collapsible && title && !accordionPassive;

  const [localIsOpen, setLocalIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (managed) {
      accordionCtx.register(title, defaultOpen, !nested);
      return () => accordionCtx.unregister(title);
    }
  }, [managed, title, defaultOpen, nested]);

  const isOpen = !enabled
    ? false
    : managed
      ? accordionCtx.getIsOpen(title, defaultOpen)
      : localIsOpen;

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    // Run consumer onClick first so it can call e.preventDefault() to override toggle.
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;
    if (collapsible) {
      if (managed) {
        accordionCtx.toggle(title, defaultOpen);
      } else {
        setLocalIsOpen(!localIsOpen);
      }
    }
  };

  const containerClasses = `w-full`;

  const cursorClass = disabled ? "cursor-default" : collapsible ? "cursor-pointer" : "";

  // Non-collapsible sections still use the same header/body chrome as collapsible ones;
  // only the chevron/toggle behavior differs (otherwise body loses p-3 and looks flush).
  // Outer row owns layout/bg/border but NOT the click handler — we attach
  // onClick to the inner title-text area only, so blank space around action
  // buttons (BreakpointChip, AccordionAddMenu, pin) doesn't accidentally
  // toggle the accordion.
  const titleClasses = nested
    ? `group/bp-row flex w-full items-center gap-1 ${collapsible ? "-mx-3 px-3 py-1.5" : "-mx-3 px-3 py-1.5"} text-[11px] font-semibold text-neutral-content transition-colors ${disabled ? "" : "hover:text-base-content"} ${className}`
    : `group group/bp-row flex w-full items-center gap-2 border-b ${isOpen ? "border-transparent" : "border-base-300/60"} bg-base-100 px-3 py-3 text-xs font-semibold text-base-content transition-colors ${className}`;

  // When non-collapsible, inherit cursor from the parent (`titleClasses`) so
  // popover-only sections that pass `cursor-pointer!` via `className` win.
  // Hardcoding `cursor-default` here would override that inheritance.
  const titleHitClasses = `flex min-w-0 flex-1 items-center gap-1.5 ${disabled ? "opacity-40" : ""} ${collapsible ? cursorClass : ""}`;

  // When scrollable, we remove padding from body and add it inside the scrollbar wrapper
  const bodyClasses = nested
    ? `grid items-end gap-2 ${scrollable ? "" : "-mx-3 px-3 pb-2"} ${bodyClassName}`
    : `grid items-end gap-3 border-b border-base-300/60 bg-base-100 text-base-content ${scrollable ? "" : "p-3 pt-2"} ${bodyClassName}`;

  // Inner padding classes for when scrollable is enabled
  const scrollableInnerClasses = nested ? "p-2" : "p-3";

  return (
    <div className={containerClasses}>
      {title &&
        (() => {
          const btn = (
            <div className={titleClasses}>
              <div
                id={title}
                role="button"
                tabIndex={disabled ? -1 : 0}
                className={titleHitClasses}
                onClick={handleClick}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClick(e as any);
                  }
                }}
                aria-label={title}
                aria-expanded={disabled ? undefined : isOpen}
                {...(help
                  ? {
                      "data-tooltip-id": PAGEHUB_RTT_GLOBAL_ID,
                      "data-tooltip-content": help,
                      "data-tooltip-place": "left",
                      "data-tooltip-delay-show": 750,
                      "data-tooltip-offset": 10,
                    }
                  : {})}
              >
                {nested && collapsible && (
                  <TbChevronRight
                    className={`size-3 transition-transform ${isOpen ? "rotate-90" : ""}`}
                  />
                )}
                {icon && <span className="text-neutral-content opacity-70">{icon}</span>}
                {title}
                {propKeys && propKeys.length > 0 && <SectionOverrideDot propKeys={propKeys} />}
                {showChevron && collapsible && (
                  <TbChevronRight
                    className={`text-neutral-content ml-auto size-4 shrink-0 transition-transform ${
                      isOpen ? "rotate-90" : ""
                    }`}
                    aria-hidden
                  />
                )}
              </div>

              {(propKey || header) && (
                <div
                  // Action area sits flush against the title hit-target (text
                  // is flex-1, so there's no blank space between them). Click
                  // on actions doesn't bubble to the row — but the row has no
                  // click handler anyway; only the title hit-target does.
                  className="flex max-w-[min(100%,20rem)] min-w-0 shrink-0 flex-nowrap items-center justify-end gap-1"
                >
                  {propKey && <BreakpointChip propKey={propKey} label={title} ghost />}
                  {header}
                </div>
              )}
            </div>
          );
          return btn;
        })()}

      {enabled && !disabled && isOpen && (
        <>
          {scrollable ? (
            <div className={bodyClasses} style={{ maxHeight, height: maxHeight }}>
              <AutoHideScrollbar className="h-full">
                <div
                  className={scrollableInnerClasses}
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${full}, minmax(0, 1fr))`,
                    gap: nested ? "0.5rem" : "0.75rem",
                    alignItems: "end",
                  }}
                  role="group"
                  aria-labelledby={title}
                >
                  {children}
                </div>
                {footer && <div className={scrollableInnerClasses}>{footer}</div>}
              </AutoHideScrollbar>
            </div>
          ) : (
            <div
              className={bodyClasses}
              style={{ gridTemplateColumns: `repeat(${full}, minmax(0, 1fr))` }}
              role="group"
              aria-labelledby={title}
            >
              {children}

              {footer}
            </div>
          )}
        </>
      )}
    </div>
  );
};
