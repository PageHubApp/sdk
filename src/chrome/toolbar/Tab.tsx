import { AutoHideScrollbar } from "@/chrome/primitives/layout/AutoHideScrollbar";
import { useAtomState } from "@zedux/react";
import { v4 as uuidv4 } from "uuid";
import { TabAtom } from "../viewport/state/atoms";
import MenuItem from "./primitives/MenuIcon";
import { InspectorTab } from "./InspectorTab";

const Tab = ({ tabId, icon = null, title = "" }) => {
  const [activeTab, setActiveTab] = useAtomState(TabAtom);

  const isActive = activeTab === tabId;

  if (!icon) return null;

  return (
    <InspectorTab title={title} icon={icon} isActive={isActive} onClick={() => setActiveTab(tabId)} />
  );
};

export const TabBody = ({ children = null, jumps = [] }) => {
  if (!children) return null;

  return (
    <div id="toolbarJumps" className="flex h-full flex-col">
      {jumps.length ? (
        <div className="text-xxs border-base-300 bg-neutral/80 text-neutral-content flex shrink-0 flex-row justify-end gap-3 border-b px-3 py-0.5 drop-shadow-sm">
          {jumps.reverse().map(_ => (
            <MenuItem
              key={uuidv4()}
              onClick={() => {
                document.getElementById("toolbarContents").scrollTo({
                  top: document.getElementById(_.title).offsetTop,
                });
              }}
              tooltip={`Jump to ${_.title}`}
            >
              {_.content}
            </MenuItem>
          ))}
        </div>
      ) : null}

      <AutoHideScrollbar
        id="toolbarContents"
        className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pt-2"
        hideDelay={1000}
      >
        {children}
      </AutoHideScrollbar>
    </div>
  );
};

export default Tab;
