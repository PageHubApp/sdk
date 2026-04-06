import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { TbX } from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { SideBarAtom } from "utils/lib";
import { useDraggableWindow } from "../../hooks/useDraggableWindow";

export const Dialog = ({
  dialogName,
  dialogAtom,
  items = [],
  height = 320,
  width = 320,
  callback = null,
  value = "",
  children = null,
  className = "",
  zIndex = 1000,
  draggable = false,
  title = null,
  icon = null,
  positioning = "dynamic", // "dynamic" follows input, "static" remembers last position
  onSearch = (_, value) =>
    _.search(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")) > -1,
  customOnSearch = null,
  customRenderer = null,
}) => {
  const [dialog, setDialog] = useAtomState(dialogAtom) as any;
  const sideBarLeft = useAtomValue(SideBarAtom);

  const ref = useRef(null);

  const rect = dialog.e;

  const [itemList, setItemList] = useState(items);
  const [searchValue, setSearchValue] = useState(null);
  const [isUpward, setIsUpward] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Draggable window functionality (optional)
  const draggableWindow = useDraggableWindow({
    initialPosition:
      positioning === "static" && rect
        ? { x: rect.left, y: rect.bottom + 6 }
        : rect
          ? { x: rect.left, y: rect.bottom + 6 }
          : { x: 100, y: 100 },
    bounds: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  const [style, setStyle] = useState({
    top: 0,
    left: 0,
    zIndex: zIndex,
  } as any);

  const [hasBeenDragged, setHasBeenDragged] = useState(false);

  useEffect(() => {
    if (!rect || !isClient) return;

    if (draggable) {
      // When draggable, positioning depends on mode and whether user has dragged
      if (positioning === "static" || hasBeenDragged) {
        // Static mode or user has dragged: keep the draggable window position (remembers last position)
        setStyle({
          position: "fixed",
          top: draggableWindow.position.y,
          left: draggableWindow.position.x,
          zIndex: zIndex,
          maxHeight: Math.min(height, window.innerHeight * 0.6),
        });
      } else {
        // Dynamic mode and not dragged yet: reset position to follow the input element
        draggableWindow.setPosition({
          x: rect.left,
          y: rect.bottom + 6,
        });
        setStyle({
          position: "fixed",
          top: rect.bottom + 6,
          left: rect.left,
          zIndex: zIndex,
          maxHeight: Math.min(height, window.innerHeight * 0.6),
        });
      }
      return;
    }

    // Original positioning logic for non-draggable dialogs
    const availableHeight = window.innerHeight - rect.bottom - 20; // Leave 20px margin
    const maxHeight = Math.min(height, availableHeight, window.innerHeight * 0.6); // Max 60% of screen height

    // Calculate horizontal position to prevent overflow
    const dialogWidth = width;
    const availableWidth = window.innerWidth - rect.left - 20; // Leave 20px margin

    // Calculate horizontal position
    let leftPosition = rect.left;
    if (availableWidth < dialogWidth) {
      // If dialog would go off-screen on the right, align to the right edge
      leftPosition = Math.max(20, window.innerWidth - dialogWidth - 20);
    }

    let newStyle: any = {
      top: rect.bottom + 6,
      left: leftPosition,
      zIndex: zIndex,
      maxHeight: maxHeight,
    };

    // If dropdown would go off-screen, position it above the trigger
    if (availableHeight < 200) {
      setIsUpward(true);
      newStyle = {
        bottom: window.innerHeight - rect.top + 6,
        left: leftPosition,
        zIndex: zIndex,
        maxHeight: Math.min(height, rect.top - 20, window.innerHeight * 0.6),
      };
    } else {
      setIsUpward(false);
    }

    setStyle(newStyle);
  }, [
    rect,
    height,
    width,
    zIndex,
    isClient,
    draggable,
    draggableWindow.position.x,
    draggableWindow.position.y,
    draggableWindow.setPosition,
    positioning,
    hasBeenDragged,
  ]);

  const closed = () => {
    setSearchValue(null);
    setItemList(items);
    setSelectedIndex(-1);
    setDialog({ ...dialog, enabled: false });
    setHasBeenDragged(false); // Reset drag state when dialog closes
  };

  const changed = value => {
    if (!dialog.changed) return;

    setDialog({ ...dialog, value, enabled: false });
    dialog.changed(value);
  };

  const search = e => {
    setSearchValue(e.target.value);
    setSelectedIndex(-1); // Reset selection when searching

    if (customOnSearch) {
      // If custom onSearch is provided, call it directly
      customOnSearch(e.target.value);
    } else {
      // Use default filtering logic
      setItemList(items.filter(_ => onSearch(_, e.target.value)));
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = event => {
      if (!ref.current) return;

      // Check if clicking on a tooltip
      const isTooltip =
        event.target.closest("[data-tooltip-id]") || event.target.closest('[role="tooltip"]');

      // Check the actual dialog content (pointer-events-auto div), not the wrapper
      const dialogContent = ref.current.querySelector(".pointer-events-auto");
      const isInside = dialogContent?.contains(event.target) || ref.current.contains(event.target);

      if (!isInside && !isTooltip) {
        closed();
      }
    };

    const handleKeyDown = event => {
      if (event.key === "Escape") {
        closed();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        const totalItems = (!searchValue ? 1 : 0) + itemList.length;
        setSelectedIndex(prev => Math.min(prev + 1, totalItems - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (selectedIndex === -1 && !searchValue) {
          changed(null); // Select "Default"
        } else if (selectedIndex >= 0 && itemList[selectedIndex]) {
          changed(itemList[selectedIndex]);
        }
      }
    };

    document.addEventListener("click", handleClickOutside, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog.enabled]);

  const refIe = useRef(null);

  useEffect(() => {
    if (dialog.value) {
      const element = document.getElementById(`${dialogName}-${value}`);
      if (element && refIe.current) refIe.current.scrollTo({ top: element.offsetTop });
    }
  }, [dialog.enabled, dialog.value, dialogName, ref, value]);

  // Don't render portal on server-side or before client hydration
  if (typeof document === "undefined" || !isClient) {
    return null;
  }

  return ReactDOM.createPortal(
    <>
      {dialog.enabled && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={dialogName || "Selection dialog"}
          key={dialogName}
          id={dialogName}
          ref={draggable ? draggableWindow.windowRef : ref}
          style={style}
          className={"pagehub-sdk-root pointer-events-none absolute z-20 flex"}
        >
          <div
            className={
              "pointer-events-auto my-auto w-full overflow-hidden ph-panel p-0"
            }
            style={{ maxHeight: style.maxHeight || height }}
          >
            {/* Draggable header (only when draggable is enabled) */}
            {draggable && (
              <div
                role="presentation"
                aria-hidden="true"
                className="flex cursor-move items-center justify-between border-b border-border bg-accent px-3 py-2 text-accent-foreground"
                onMouseDown={e => {
                  setHasBeenDragged(true);
                  draggableWindow.handleMouseDown(e);
                }}
              >
                <div className="flex items-center gap-2">
                  {icon && <span className="text-lg">{icon}</span>}
                  <span>{title || dialogName || "Dialog"}</span>
                </div>
                <button
                  onClick={closed}
                  className="flex items-center justify-center rounded-lg p-1 text-accent-foreground transition-colors hover:bg-accent-foreground/10"
                  aria-label="Close"
                >
                  <TbX />
                </button>
              </div>
            )}

            {children}

            {customRenderer && (
              <div className="flex size-full flex-col overflow-hidden rounded-lg">
                {!isUpward && !draggable && (
                  <div className="shrink-0 border-b border-border bg-muted px-2 pb-1 pt-2">
                    <input
                      type="text"
                      className="input-dialog-sm"
                      placeholder="Search fonts..."
                      onKeyUp={e => search(e)}
                      autoFocus={true}
                      defaultValue={searchValue}
                      aria-label="Search"
                    />
                  </div>
                )}
                <div className="scrollbar-light min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                  {customRenderer}
                </div>
                {isUpward && !draggable && (
                  <div className="shrink-0 border-t border-border bg-muted px-2 pb-2 pt-1">
                    <input
                      type="text"
                      className="input-dialog-sm"
                      placeholder="Search fonts..."
                      onKeyUp={e => search(e)}
                      autoFocus={true}
                      defaultValue={searchValue}
                      aria-label="Search"
                    />
                  </div>
                )}
              </div>
            )}

            {!children && !customRenderer && (
              <div className="flex size-full flex-col overflow-hidden rounded-lg">
                {!isUpward && !draggable && (
                  <div className="shrink-0 border-b border-border bg-muted px-2 pb-1 pt-2">
                    <input
                      type="text"
                      className="input-dialog-sm"
                      placeholder="Search fonts..."
                      onKeyUp={e => search(e)}
                      autoFocus={true}
                      defaultValue={searchValue}
                      aria-label="Search"
                    />
                  </div>
                )}

                <div ref={refIe} className="scrollbar-light min-h-0 flex-1 overflow-y-auto px-2 py-1">
                  {!searchValue && (
                    <button
                      className={`flex w-full cursor-pointer flex-row rounded-lg p-1 text-xs text-muted-foreground transition-colors hover:bg-muted ${selectedIndex === -1 ? "bg-primary text-primary-foreground" : ""}`}
                      onClick={e => changed(null)}
                    >
                      Default
                    </button>
                  )}

                  {!itemList.length && searchValue && (
                    <div className="flex w-full cursor-pointer flex-row rounded-lg p-1 text-xs text-muted-foreground hover:bg-muted">
                      No results.
                    </div>
                  )}

                  <div className={className}>
                    {itemList?.map((_, k) => {
                      if (callback) return callback(_, k);

                      return (
                        <button
                          id={`font-${_}`}
                          className={`flex w-full cursor-pointer flex-row rounded-lg p-1 text-xs text-muted-foreground transition-colors hover:bg-muted ${
                            dialog.value === _
                              ? "bg-primary text-primary-foreground"
                              : selectedIndex === k
                                ? "bg-muted"
                                : ""
                          }`}
                          style={{ fontFamily: (_ || []).join(", ") }}
                          key={k}
                          onClick={e => changed(_)}
                        >
                          {_.join(", ")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isUpward && !draggable && (
                  <div className="shrink-0 border-t border-border bg-muted px-2 pb-2 pt-1">
                    <input
                      type="text"
                      className="input-dialog-sm"
                      placeholder="Search fonts..."
                      onKeyUp={e => search(e)}
                      autoFocus={true}
                      defaultValue={searchValue}
                      aria-label="Search"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
};
