import { phStorage } from "./phStorage";

export const addComponentToStorage = (data = null) => {
  data = data || phStorage.getJSON("clipboard");
  const components = phStorage.getJSON("components", []);

  if (components.find(_ => _.rootNodeId === data.rootNodeId)) return components;
  const a = [...components, data];
  phStorage.set("components", a);
  return a;
};

export const removeComponentFromStorage = (nodeId, components, setComponents) => {
  components = components.filter(_ => _.rootNodeId !== nodeId);

  const results = [...components];

  phStorage.set("components", results);

  setComponents(results);

  return results;
};

export const getAltView = view => {
  let altView;

  if (view === "desktop") {
    altView = "mobile";
  } else if (view === "mobile") {
    altView = "desktop";
  } else altView = "desktop";

  return altView;
};
