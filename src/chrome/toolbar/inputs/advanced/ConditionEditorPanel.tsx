/**
 * ConditionEditorPanel — FloatingPanel hosting the field editor for ONE
 * condition. Loaded lazily by `ConditionChipRow` on chip click.
 *
 * The condition itself is owned by the chip's parent (ConditionsInput); we
 * receive `cond` + `onChange` and just render the form. No node access.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { useElementPicker } from "../action/useElementPicker";
import { getConnectorData } from "../../../../utils/design/variables";
import type { Condition } from "../../../../utils/conditions/types";
import { ConditionFields } from "./ConditionsInput";

interface PanelProps {
  cond: Condition;
  onChange: (patch: Partial<Condition>) => void;
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

function useConnectorOptions() {
  const data = getConnectorData();
  if (!data) return [];
  return Object.entries(data).map(([provider, pdata]) => ({
    provider,
    collections: Object.keys(pdata?.bindings || {}),
  }));
}

export default function ConditionEditorPanel({
  cond,
  onChange,
  initialPosition,
  onClose,
}: PanelProps) {
  const rawFormElements = useElementPicker("all");
  const formElements = Array.isArray(rawFormElements) ? rawFormElements : [];
  const connectorOptions = useConnectorOptions();

  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Condition"
      storageKey="condition-editor"
      minWidth={300}
      maxWidth={480}
      minHeight={240}
      initialPosition={initialPosition}
      zIndex={1100}
      scrollable
    >
      <ConditionFields
        cond={cond}
        onChange={onChange}
        formElements={formElements}
        connectorOptions={connectorOptions}
      />
    </FloatingPanel>
  );
}
