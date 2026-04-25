import React, { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

// Session-scoped: shown at most once per page load.
let alreadyShownThisSession = false;

interface Props {
  sideBarLeft: boolean;
}

export const SidebarSwipeHint: React.FC<Props> = ({ sideBarLeft }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alreadyShownThisSession) return;
    alreadyShownThisSession = true;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={twMerge(
        "pointer-events-none absolute bottom-6 z-[61]",
        "flex items-center gap-1.5 rounded-md bg-black/75 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm",
        "transition-opacity duration-500",
        sideBarLeft ? "right-2" : "left-2"
      )}
      aria-hidden="true"
    >
      <span>{sideBarLeft ? "←" : "→"}</span>
      <span>swipe to close</span>
    </div>
  );
};
