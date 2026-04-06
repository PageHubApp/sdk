import { AutoHideScrollbar } from "components/layout/AutoHideScrollbar";
import { useAtomState } from "@zedux/react";
import { v4 as uuidv4 } from "uuid";
import { TabAtom } from "../Viewport/atoms";
import MenuItem from "./Helpers/MenuIcon";
import { UnifiedTab } from "./UnifiedTab";

export const Tab = ({ tabId, icon = null, title = "" }) => {
  const [activeTab, setActiveTab] = useAtomState(TabAtom);

  const isActive = activeTab === tabId;

  if (!icon) return null;

  return (
    <UnifiedTab title={title} icon={icon} isActive={isActive} onClick={() => setActiveTab(tabId)} />
  );
};

export const TabBody = ({ children = null, jumps = [] }) => {
  if (!children) return null;

  return (
    <div id="toolbarJumps" className="flex h-full flex-col">
      {jumps.length ? (
        <div className="text-xxs flex shrink-0 flex-row justify-end gap-3 border-b border-border bg-muted/80 px-3 py-0.5 text-muted-foreground drop-shadow-sm">
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
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-2"
        hideDelay={1000}
      >
        {children}
      </AutoHideScrollbar>
    </div>
  );
};

export default Tab;
