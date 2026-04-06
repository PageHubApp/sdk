import { useEditor, useNode } from "@craftjs/core";
import debounce from "lodash.debounce";
import { useEffect, useRef, useState } from "react";
import RenderNodeControlInline from "../RenderNodeControlInline";
import { useElementColor } from "./lib";

const EditableName = () => {
  const { name, id } = useNode(node => ({
    name: node.data.custom.displayName || node.data.displayName,
  }));

  const { actions, isActive } = useEditor((_, query) => ({
    isActive: query.getEvent("selected").contains(id),
  }));

  const dom = document.querySelector(`[node-id="${id}"]`);
  const elementColor = useElementColor(dom as HTMLElement, isActive);

  const [isEditing, setIsEditing] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.focus();
      // Select all text when entering edit mode
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <div
      className={
        "fontfamily-base pointer-events-auto flex flex-row gap-3 overflow-hidden border-current bg-background px-2 text-xs! font-normal! text-foreground"
      }
    >
      <div
        ref={editableRef}
        role={isEditing ? undefined : "button"}
        tabIndex={isEditing ? undefined : 0}
        className={`${isEditing ? "cursor-text" : "cursor-grab active:cursor-grabbing"}`}
        contentEditable={isEditing}
        data-gramm="false"
        suppressContentEditableWarning={true}
        onClick={handleClick}
        onKeyDown={isEditing ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(e as any); } }}
        onBlur={handleBlur}
        onInput={debounce(e => {
          actions.setCustom(id, custom => (custom.displayName = e.target.innerText));
        }, 500)}
      >
        {name}
      </div>
    </div>
  );
};

export const NameNodeController = (props: { position; align; placement; alt?: any }) => {
  const { position, align, placement, alt } = props as any;

  const { id } = useNode();

  const { isActive } = useEditor((_, query) => ({
    isActive: query.getEvent("selected").contains(id),
  }));

  if (!isActive) return null;

  return (
    <RenderNodeControlInline
      key={`${id}-name`}
      position={position}
      align={align}
      alt={alt}
      placement={placement}
      className={`${position === "top" && align === "start" && placement === "end" ? "m-0" : ""} select-none items-center whitespace-nowrap`}
    >
      <EditableName />
    </RenderNodeControlInline>
  );
};
