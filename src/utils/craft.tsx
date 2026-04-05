// @ts-nocheck
export const addComponentToStorage = (data = null) => {
  data = data || JSON.parse(localStorage.getItem("clipBoard"));
  const components = JSON.parse(localStorage.getItem("components")) || [];

  if (components.find(_ => _.rootNodeId === data.rootNodeId)) return components;
  const a = [...components, data];
  const res = JSON.stringify(a);
  localStorage.setItem("components", res);
  return a;
};

export const removeComponentFromStorage = (nodeId, components, setComponents) => {
  components = components.filter(_ => _.rootNodeId !== nodeId);

  const results = [...components];

  localStorage.setItem("components", JSON.stringify(results));

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
