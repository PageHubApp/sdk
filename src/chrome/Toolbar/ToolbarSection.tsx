import { AutoHideScrollbar } from "components/layout/AutoHideScrollbar";
import { Tooltip } from "components/layout/Tooltip";
import { useEffect, useState } from "react";
import { TbChevronRight } from "react-icons/tb";
import { VIEW_BREAKPOINT_SCOPE_KEYS } from "../../utils/tailwind/className";
import { useAccordionContext } from "./AccordionContext";
import { ToolbarLabel } from "./Label";

export const ToolbarSection = ({
  title,
  icon,
  children,
  full = 1,
  enabled = true,
  onClick,
  propKey,
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
  accordionPassive = false,
  disabled = false,
}: any) => {
  const accordionCtx = useAccordionContext();
  const managed = accordionCtx && collapsible && title && !accordionPassive;

  const [localIsOpen, setLocalIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (managed) {
      accordionCtx.register(title);
      return () => accordionCtx.unregister(title);
    }
  }, [managed, title]);

  const isOpen = managed ? accordionCtx.getIsOpen(title) : localIsOpen;

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    if (collapsible) {
      if (managed) {
        accordionCtx.toggle(title);
      } else {
        setLocalIsOpen(!localIsOpen);
      }
    }
    if (onClick) {
      onClick(e);
    }
  };

  const containerClasses = `w-full`;

  const cursorClass = disabled ? "cursor-default" : collapsible ? "cursor-pointer" : "";

  const titleClasses = nested
    ? `flex w-full items-center justify-between gap-1 ${collapsible ? `${cursorClass} -mx-3 px-3 py-1.5` : "pb-2 pt-1"} text-[11px] font-semibold text-neutral-content transition-colors ${disabled ? "" : "hover:text-base-content"} ${className}`
    : `flex w-full items-center justify-between gap-2 ${collapsible ? `${cursorClass} border-b border-base-300 bg-sidebar px-3 py-2` : "pb-2 pt-1"} text-sm font-bold text-sidebar-foreground transition-colors ${className}`;

  // When scrollable, we remove padding from body and add it inside the scrollbar wrapper
  const bodyClasses = nested
    ? `grid items-end gap-2 ${collapsible ? `${scrollable ? "" : "-mx-3 px-3 pb-2"}` : ""} ${bodyClassName}`
    : `grid items-end gap-3 ${collapsible ? `border-b border-base-300 bg-base-200 text-base-content ${scrollable ? "" : "p-3 pt-2"}` : ""} ${bodyClassName}`;

  // Inner padding classes for when scrollable is enabled
  const scrollableInnerClasses = nested ? "p-2" : "p-3";

  return (
    <div className={containerClasses}>
      {title &&
        (() => {
          const btn = (
            <div
              id={title}
              role="button"
              tabIndex={disabled ? -1 : 0}
              className={titleClasses}
              onClick={handleClick}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClick(e as any);
                }
              }}
              aria-label={title}
              aria-expanded={disabled ? undefined : isOpen}
            >
              <div className={`flex items-center gap-1.5 ${disabled ? "opacity-40" : ""}`}>
                {nested && collapsible && (
                  <TbChevronRight
                    className={`size-3 transition-transform ${isOpen ? "rotate-90" : ""}`}
                  />
                )}
                {icon && <span className="text-neutral-content opacity-70">{icon}</span>}
                {title}
              </div>

              {header && <div className="flex flex-1 items-center justify-end">{header}</div>}

              {!header && (
                <div className="flex max-w-[min(100%,11rem)] flex-wrap items-center justify-end gap-1">
                  {propKey &&
                    VIEW_BREAKPOINT_SCOPE_KEYS.map(bp => (
                      <ToolbarLabel
                        key={bp}
                        lab={propKey}
                        propKey={propKey}
                        viewValue={bp}
                        iconOnly
                      />
                    ))}
                </div>
              )}
            </div>
          );
          return help ? (
            /* `full` = Tooltip layout (flex w-full), not ToolbarSection grid columns — keeps border-b full width */
            <Tooltip content={help} placement="left" className="text-xxs min-w-0" delay={750} full>
              {btn}
            </Tooltip>
          ) : (
            btn
          );
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
                    gridTemplateColumns: `repeat(${full}, 1fr)`,
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
              style={{ gridTemplateColumns: `repeat(${full}, 1fr)` }}
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
