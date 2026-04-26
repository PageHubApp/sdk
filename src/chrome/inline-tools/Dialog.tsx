import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { MdClose } from "react-icons/md";
import { useAtomState } from "@zedux/react";
import { getRect } from "../viewport/useRect";
import { useFocusTrap } from "../../utils/hooks/useAccessibility";

export const useGetRectLater = localRef => {
  const [rect, setRect] = useState({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (!localRef?.current) return;
    const originalDisplay = localRef.current.style.display;

    localRef.current.style.display = "flex";
    const rect = getRect(localRef.current);

    localRef.current.style.display = originalDisplay;

    setRect(rect);

    localRef.current.style.display = "flex";
  }, [localRef]);

  return rect;
};

function Dialog({ children, target, state, opener }: any): any {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dialogRef = useRef(null);
  const dialogContentRef = useRef(null);

  const [isOpen, setIsOpen] = useAtomState(state);
  const focusTrapRef = useFocusTrap(isOpen);

  const dialogRect = useGetRectLater(dialogRef);

  const setPosition = useCallback(
    rect => {
      if (!rect || !dialogRef.current) return;

      const dialog = dialogRef.current;

      dialog.style.top = `${rect.top}px`;
      dialog.style.left = `${rect.left}px`;
      dialog.style.right = `${rect.right}px`;
      dialog.style.width = `${rect.width}px`;
      dialog.style.height = `${rect.height}px`;
    },
    [dialogRef]
  );

  useEffect(() => {
    if (!target) return;

    const targetRect = target.getBoundingClientRect();
    const dialogContentRect = getRect(dialogContentRef.current);
    const viewportRect = getRect(document.getElementById("viewport"));
    const openerRect = getRect(opener.current);

    const dialogWidth = dialogContentRect.width;
    const dialogHeight = dialogContentRect.height;
    const targetWidth = targetRect.width;
    const targetHeight = targetRect.height;
    const viewportWidth = viewportRect.width;
    const viewportHeight = viewportRect.height;
    let top = 0;
    let left = 0;
    const right = 0;
    let alignRight = false;
    const gap = 10;

    // Vertically center the dialogContentRect element
    top = targetRect.top + targetHeight / 2 - dialogHeight / 2;
    // top = openerRect.bottom + gap;
    left = openerRect.left;

    // Check if there is enough space to align the dialogContentRect element to the left
    if (targetRect.left >= dialogWidth + gap) {
      left = targetRect.left - dialogWidth - gap;
    } else if (left + dialogWidth + gap > viewportWidth) {
      // Check if there is enough space to align the dialogContentRect element to the right
      alignRight = true;
      left = viewportWidth - dialogWidth - gap;
    } else {
      // No space to align left or right, so center the dialogContentRect element horizontally
      // left = 0;
    }

    // Check if the dialogContentRect element is out of the viewport
    if (left <= 0) {
      left = gap;
    } else if (left + dialogWidth > viewportWidth) {
      left = viewportWidth - dialogWidth;
    }

    // Check if the dialogContentRect element is out of the viewport vertically
    if (top < 0) {
      top = gap;
    } else if (top + dialogHeight + 50 > viewportHeight) {
      top = openerRect.top - dialogHeight - openerRect.height - gap;
    }

    // Update the position state with the calculated top and left values
    setPosition({ left, top, right });
  }, [isOpen, target, dialogRect, opener, setPosition]);

  function handleMouseDown(e) {
    setIsDragging(true);
    const dialogContentRect = getRect(dialogRef.current);

    setOffset({
      x: e.clientX - dialogContentRect.x,
      y: e.clientY - dialogContentRect.y,
    });
    e.preventDefault();
    e.stopPropagation();
  }

  useEffect(() => {
    function handleMouseMove(e) {
      if (isDragging) {
        setPosition({
          left: e.clientX - offset.x,
          top: e.clientY - offset.y,
          right: "",
          bottom: "",
        });
      }
    }

    function handleMouseUp(e) {
      setIsDragging(false);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, offset, setPosition]);

  const handleClickOutside = event => {
    if (dialogRef.current && !dialogRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  const handleKeyDown = event => {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [dialogRef]);

  return ReactDOM.createPortal(
    <>
      {isOpen && (
        <div className="absolute size-[350px]" ref={dialogRef}>
          <div
            ref={focusTrapRef}
            role="dialog"
            aria-modal="true"
            aria-label="Settings dialog"
            className="animate-backdrop-in border-base-300 bg-neutral text-base-content absolute max-w-[320px] flex-col gap-4 overflow-hidden rounded-xl border-2 shadow-2xl select-none"
            style={{
              zIndex: 50,
            }}
          >
            <button
              onMouseDown={handleMouseDown}
              tabIndex={0}
              className="h-8 cursor-move"
              aria-label="Drag to move dialog"
            >
              <div className="border-base-300 border-t-primary bg-primary hover:border-t-primary hover:bg-primary mx-auto mt-[-2px] h-4 w-2/3 rounded-b-md border-2 px-3 py-1.5 shadow-inner drop-shadow-lg"></div>

              <div className="flex items-center justify-between">
                <button
                  className="text-neutral-content absolute top-2.5 left-3"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close dialog"
                >
                  <span className="sr-only">Close</span>
                  <MdClose />
                </button>
              </div>
            </button>

            <div
              ref={dialogContentRef}
              className="scrollbar-light max-h-[320px] overflow-x-hidden overflow-y-auto px-3 pb-1.5"
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </>,
    document.querySelector('[data-container="true"]')
  );
}

export default Dialog;
