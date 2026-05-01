import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { useState } from "react";
import { TbChevronDown, TbChevronRight, TbSelector } from "react-icons/tb";
import { atom, useAtomState } from "@zedux/react";

// Module-level atom cache — atoms MUST NOT be created inside component render functions
const atomCache = new Map<string, any>();
const getOrCreateAtom = (key: string, defaultValue: any) => {
  if (!atomCache.has(key)) {
    atomCache.set(key, atom(key, defaultValue));
  }
  return atomCache.get(key);
};

export const sizingItems = [
  /* {
    id: "slider",
    content: "Slider options",
    icon: <RxSlider />,
  },*/
  {
    id: "select",
    content: "List options",
    icon: <TbSelector />,
  },
  {
    id: "px",
    content: "Manual options",
    icon: "px",
  },
];

export const ItemToggle = ({ items = [], children, selected, onChange, option = true }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedItem = items.find(item => item.id === selected) || items[0];

  if (option) {
    // Dropdown mode
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex size-8 items-center justify-center rounded-lg font-sans text-xs"
        >
          <TbChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              role="presentation"
              aria-hidden="true"
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown menu */}
            <div className="border-base-300 bg-neutral text-neutral-content absolute top-full right-0 z-20 mt-1 overflow-hidden rounded-xl border font-sans shadow-lg">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    onChange(item.id);
                    setIsOpen(false);
                  }}
                  className={`hover:bg-neutral flex w-full items-center gap-2 px-3 py-2 text-left font-sans text-xs whitespace-nowrap ${
                    selected === item.id ? "bg-neutral" : ""
                  }`}
                >
                  <span className="flex size-4 items-center justify-center">{item.icon}</span>
                  {item.content}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Single button toggle mode - cycles through options
  const handleToggle = () => {
    const currentIndex = items.findIndex(item => item.id === selected);
    const nextIndex = (currentIndex + 1) % items.length;
    onChange(items[nextIndex].id);
  };

  return (
    <div className="flex flex-row items-end gap-0.5">
      {children}

      <ItemSelector {...selectedItem} onClick={handleToggle} selected={true} />
    </div>
  );
};

export const ItemSelector = ({ content = null, icon, onClick, selected = false }) => (
  <div
    role="button"
    tabIndex={0}
    className="flex cursor-pointer items-center justify-center text-xs"
    onClick={onClick}
    data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
    data-tooltip-content={content}
    data-tooltip-place="bottom"
    data-tooltip-offset={10}
  >
    {icon}
  </div>
);

export const ItemAdvanceToggle = ({
  children,
  propKey,
  title = "More Properties",
}: {
  children: React.ReactNode;
  propKey: string;
  title?: string;
}) => {
  const itemListState = getOrCreateAtom(`advancedToggle-${propKey}`, false);

  const [showAdvance, setShowAdvance] = useAtomState(itemListState);

  return (
    <>
      <button
        className="text-xxs mx-auto flex w-full items-center justify-center gap-1 rounded-lg px-2 text-center hover:underline"
        onClick={() => setShowAdvance(!showAdvance)}
      >
        {showAdvance ? <TbChevronDown className="size-3" /> : <TbChevronRight className="size-3" />}
        <span>{title}</span>
      </button>

      {showAdvance ? <div className="mt-2 flex flex-col gap-2">{children}</div> : null}
    </>
  );
};
