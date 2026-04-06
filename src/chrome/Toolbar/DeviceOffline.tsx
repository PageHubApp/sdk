import { Tooltip } from "components/layout/Tooltip";
import { useSetAtomState } from "../../utils/atoms";
import { OnlineAtom } from "utils/lib";

export const DeviceOffline = () => {
  const setOnline = useSetAtomState(OnlineAtom);

  return (
    <div className="fixed bottom-3 left-1/2 z-50 ml-6 flex w-auto cursor-pointer select-none items-center justify-center">
      <Tooltip content="You data is saved locally" arrow={false}>
        <button
          className={
            "rounded-lg border border-border/50 bg-muted/30 p-3 text-xs font-medium text-foreground underline opacity-100 shadow-inner hover:opacity-100"
          }
          onClick={() => setOnline(window.navigator.onLine)}
        >
          No internet connection.
        </button>
      </Tooltip>
    </div>
  );
};
