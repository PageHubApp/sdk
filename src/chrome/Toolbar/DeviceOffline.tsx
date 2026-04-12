import { Tooltip } from "components/layout/Tooltip";
import { useSetAtomState } from "../../utils/atoms";
import { OnlineAtom } from "utils/lib";

export const DeviceOffline = () => {
  const setOnline = useSetAtomState(OnlineAtom);

  return (
    <div className="fixed bottom-3 left-1/2 z-50 ml-6 flex w-auto cursor-pointer items-center justify-center select-none">
      <Tooltip content="You data is saved locally" arrow={false}>
        <button
          className={
            "border-base-300/50 bg-neutral/30 text-base-content rounded-lg border p-3 text-xs font-medium underline opacity-100 shadow-inner hover:opacity-100"
          }
          onClick={() => setOnline(window.navigator.onLine)}
        >
          No internet connection.
        </button>
      </Tooltip>
    </div>
  );
};
