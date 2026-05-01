import { ToolbarDropdown } from "../../../ToolbarDropdown";
import { ActionConditionsEditor } from "../../conditions/ActionConditionsEditor";
import { PeekTargetButton } from "../PeekTargetButton";
import { TargetPickerInput } from "../shared/TargetPickerInput";

export function ShowHideSubForm({
  action,
  patch,
}: {
  action: any;
  patch: (p: any) => void;
}) {
  const isLoad = action.trigger === "load";
  return (
    <>
      <div className="flex items-stretch gap-2">
        <div className="min-w-0 flex-1">
          <TargetPickerInput
            value={action.target}
            filter="all"
            label="Target"
            onChange={target => patch({ target })}
          />
        </div>
        <PeekTargetButton target={action.target} />
      </div>
      <div className="flex gap-2">
        <ToolbarDropdown
          value={action.direction || "toggle"}
          onChange={(val: string) => patch({ direction: val })}
          propKey="actionDirection"
        >
          <option value="toggle">Toggle</option>
          <option value="show">Show</option>
          <option value="hide">Hide</option>
          <option value="tab">Tab</option>
        </ToolbarDropdown>
        <ToolbarDropdown
          value={action.trigger || "click"}
          onChange={(val: string) => patch({ trigger: val })}
          propKey="actionTrigger"
        >
          <option value="click">On Click</option>
          <option value="hover">On Hover</option>
          <option value="load">On Load</option>
        </ToolbarDropdown>
      </div>
      {isLoad && (
        <ActionConditionsEditor
          value={action.conditions}
          onChange={groups => patch({ conditions: groups })}
        />
      )}
    </>
  );
}
