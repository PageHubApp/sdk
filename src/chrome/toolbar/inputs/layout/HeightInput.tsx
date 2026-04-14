import { atom, useAtomState } from "@zedux/react";
import { ItemToggle, sizingItems } from "../../helpers/ItemSelector";
import { UniversalInput } from "../universal-input";

// Module-level atom cache — atoms must NOT be created inside render functions
const heightAtomCache = new Map<string, any>();
const getOrCreateHeightAtom = (key: string) => {
  if (!heightAtomCache.has(key)) {
    heightAtomCache.set(key, atom(key, "select"));
  }
  return heightAtomCache.get(key);
};

export const HeightInput = ({
  propKey = "height",
  propType = "class",
  propTag = "h",
  values = "height",
  sliderValues = "height",
  label = "Height",
}) => {
  const itemListState = getOrCreateHeightAtom(propKey);

  const [state, setState] = useAtomState(itemListState);

  const toggle = (
    <ItemToggle
      selected={state}
      onChange={value => setState(value)}
      items={sizingItems}
      option={false}
    />
  );

  return (
    <UniversalInput
      propKey={propKey}
      propType={propType}
      propTag={propTag}
      label={label}
      tailwindKey={values}
      showVarSelector={true}
      placeholder=""
      allowedTypes={["tailwind", "calc", "px", "%", "em", "rem", "vw", "vh"]}
      inputWidth="flex-1"
    />
  );
};
