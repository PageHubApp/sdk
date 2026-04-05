// @ts-nocheck
import { getRandomId, ROOT_NODE } from "@craftjs/utils";
import lz from "lzutf8";
import { twMerge } from "tailwind-merge";

import generate from "../../utils/data/nameGenerator";
import { getPageHubApiBaseUrl } from "../../runtimeApi";
import { buildVariantPrefix, getClassForView, removeClassForView } from "../../utils/tailwind/className";

const getApiBase = () => getPageHubApiBaseUrl();

export const GetHtmlToComponent = async (html) => {
  try {
    const res = await fetch(`${getApiBase()}/api/convert`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: html }),
    });

    return res.json();
  } catch (e) {
    console.error(e);
  }
};

export const GetSignedUrl = async () => {
  try {
    const res = await fetch(`${getApiBase()}/api/media/get`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`GetSignedUrl failed with status ${res.status}:`, errorText);
      throw new Error(`Failed to get signed URL: ${res.status} ${res.statusText}`);
    }

    const result = await res.json();
    console.log("GetSignedUrl response:", result);
    return result;
  } catch (e) {
    console.error("GetSignedUrl error:", e);
    throw e; // Re-throw so caller can handle it
  }
};

export const SaveMedia = async (media, url) => {
  const formData = new FormData();
  formData.append("file", media);

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`SaveMedia failed with status ${res.status}:`, errorText);
      throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
    }

    const result = await res.json();
    console.log("SaveMedia response:", result);
    return result;
  } catch (e) {
    console.error("SaveMedia error:", e);
    throw e; // Re-throw so caller can handle it
  }
};

export const DeleteMedia = async (mediaId, settings, query = null, actions = null) => {
  try {
    const res = await fetch(`${getApiBase()}/api/files`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mediaId,
        _id: settings._id,
      }),
    });

    // Also unregister from Background if query and actions are provided
    if (query && actions && mediaId) {
      const { unregisterMediaFromBackground } = await import("../../utils/lib");
      unregisterMediaFromBackground(query, actions, mediaId);
    }

    return res.json();
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const SaveToServer = async (json, draft, settings, setSettings, sessionToken = null) => {
  const content = lz.encodeBase64(lz.compress(json));

  localStorage.setItem("draft", content);

  const _id = settings?._id || "";

  const r: any = { _id };

  if (draft) {
    r.draft = content;
  } else r.content = content;

  // Include sessionToken if provided
  if (sessionToken) {
    r.sessionToken = sessionToken;
  }

  console.info("Saving...");
  const headers: any = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Also send token in header for redundancy
  if (sessionToken) {
    headers["x-pagehub-token"] = sessionToken;
  }

  const res = await fetch(`${getApiBase()}/api/save`, {
    method: "POST",
    headers,
    body: JSON.stringify(r),
  });

  let result = null;

  try {
    result = await res.json();
  } catch (e) {
    console.error(e);
  }

  if (!res.ok) {
    const msg = result?.error || `Save failed (${res.status})`;
    console.error("Save error:", msg);
    setSettings(prev => ({ ...prev, error: msg, upgrade: result?.upgrade || false }));
    return;
  }

  if (result && result._id) {
    const lsIds = JSON.parse(localStorage.getItem("history")) || [];

    if (!lsIds.find(_ => _._id === result._id)) {
      lsIds.push({
        _id: result._id,
        draftId: result?.title || result?.draftId,
      });
      localStorage.setItem("history", JSON.stringify(lsIds));
    }

    if (result._id !== _id) {
      window.history.pushState(result._id, result._id, `/build/${result._id}`);
      localStorage.setItem("_id", result._id);
      setSettings(result);
    }
  }
  // }
};

const getPropValue = ({ propKey, propItemKey, index }, _props = {}) => {
  const value = _props ? { ..._props } : {};

  if (!propItemKey && !index && index !== 0) {
    // Handle nested propKeys with dot notation (e.g., "icon.value")
    if (propKey.includes(".")) {
      const keys = propKey.split(".");
      let current = value;
      for (const key of keys) {
        if (current === undefined || current === null) return null;
        current = current[key];
      }
      return current || null;
    }
    return value[propKey] || null;
  }

  if (propItemKey && (index || index >= 0)) {
    value[propKey] = value[propKey] ? { ...value[propKey] } : {};
    value[propKey][index] = value[propKey][index] ? { ...value[propKey][index] } : {};
    return value[propKey][index][propItemKey] || null;
  }

  value[index] = value[index] ? { ...value[index] } : {};
  return value[index][propKey] || null;
};

export const getProp = (params, view, nodeProps, classDark = false) => {
  if (params.propType === "root") {
    return getPropValue(params, nodeProps.root);
  }

  if (params.propType === "component") {
    return getPropValue(params, nodeProps);
  }

  // className is the source of truth for class props
  const classView =
    params.index === "hover" && params.propType !== "root" && params.propType !== "component"
      ? "hover"
      : view;
  return getClassForView(nodeProps.className || "", params.propKey, classView, { classDark }) || null;
};

export const getPropFinalValue = (__props, view, nodeProps, classDark = false) => {
  // Full-width canvas ViewAtom is `desktop`: class props read base first, then `md:` (toolbar “desktop” scope).
  if (__props.propType === "class" && view === "desktop") {
    const sequence = classDark
      ? [
          ["mobile", true],
          ["mobile", false],
          ["md", true],
          ["md", false],
        ]
      : [
          ["mobile", false],
          ["md", false],
        ];
    for (const [v, d] of sequence) {
      const val = getProp(__props, v, nodeProps, d);
      if (val != null && val !== "") {
        return { value: val, viewValue: v };
      }
    }
    return { value: null, viewValue: "mobile" };
  }

  let value = getProp(__props, view, nodeProps, classDark);
  let viewValue = view;

  if (classDark && (value == null || value === "")) {
    value = getProp(__props, view, nodeProps, false);
  }

  if (!value) {
    if (view === "desktop" || view === "mobile") {
      const theView = view === "desktop" ? "mobile" : "desktop";
      value = getProp(__props, theView, nodeProps, classDark);
      if (classDark && (value == null || value === "")) {
        value = getProp(__props, theView, nodeProps, false);
      }
      viewValue = theView;
    } else if (["sm", "md", "lg", "xl", "2xl"].includes(view)) {
      value = getProp(__props, "mobile", nodeProps, classDark);
      if (classDark && (value == null || value === "")) {
        value = getProp(__props, "mobile", nodeProps, false);
      }
      viewValue = "mobile";
    }
  }
  return { value, viewValue };
};

// Helper to set a nested property using dot notation
const setNestedProp = (obj: any, path: string, value: any) => {
  const keys = path.split(".");
  const lastKey = keys.pop();
  let current = obj;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }

  const oldValue = current[lastKey];
  current[lastKey] = value;
  return oldValue;
};

// Helper to get a nested property using dot notation
const getNestedProp = (obj: any, path: string) => {
  const keys = path.split(".");
  let current = obj;

  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }

  return current;
};

export const setPropOnView = (
  {
    propKey,
    value,
    setProp,
    view,
    index = null,
    propItemKey = null,
    onChange = null,
    classDark = false,
  }: PropType,
  delay = 2000
) => {
  try {
    // Guard against undefined setProp (node not ready yet)
    if (!setProp) {
      return;
    }

    setProp((props: any) => {
      // className-first mode for class props (not root, not component)
      if (view !== "component" && view !== "root") {
        const prefix = buildVariantPrefix(view, classDark);

        if (!value || value === "") {
          props.className = removeClassForView(props.className || "", propKey, view, { classDark });
        } else {
          const prefixed = prefix ? `${prefix}${value}` : value;
          props.className = twMerge(props.className || "", prefixed);
        }
        return;
      }

      // root / component path (unchanged)
      const setting =
        view === "component" ? (props = props || {}) : (props[view] = props[view] || {});

      if (index >= 0 && propItemKey) {
        setting[propKey] = setting[propKey] || {};
        setting[propKey][index] = setting[propKey][index] || {};
        setting[propKey][index][propItemKey] = value;
        return;
      }

      if (index || index > 0) {
        setting[index] = setting[index] || {};
        setting[index][propKey] = value;
        return;
      }

      // Handle nested propKeys with dot notation (e.g., "icon.value")
      if (propKey.includes(".")) {
        setNestedProp(setting, propKey, value);
      } else {
        setting[propKey] = value;
      }
    }, 0);

    if (onChange) onChange(value);
  } catch (e) {
    // Silently ignore errors during component loading
    // This happens when Craft.js tries to update nodes that aren't fully registered yet
    if (e.message && e.message.includes("data")) {
      // Node not ready for prop update, skipping
    } else {
      console.error(e);
    }
  }
};

interface PropType {
  value: any;
  onChange?: any;
  propKey: string;
  setProp: any;
  view?: string;
  index?: any;
  propType?: string;
  propItemKey?: string;
  query?: any;
  actions?: any;
  nodeId?: string;
  /** When true, write/read `dark:` in the variant chain after the breakpoint (and before `hover:`). */
  classDark?: boolean;
}

export const propagatePropsToClones = (
  originalId,
  propKey,
  value,
  view,
  query,
  actions,
  index = null,
  propItemKey = null,
  classDark = false
) => {
  try {
    const original = query.node(originalId).get();
    if (!original?.data?.props?.hasMany) return;

    const clones = original.data.props.hasMany;

    clones.forEach(cloneId => {
      const clone = query.node(cloneId).get();
      if (!clone) return;

      // Check if this prop should propagate based on relationType
      const cloneRelationType = clone.data.props.relationType;

      if (cloneRelationType === "style") {
        // Toolbar view names for which breakpoint layer of className is edited (not separate persisted style objects).
        // Non-root views write prefixed utilities into `props.className` (see `changeProp` / ClassItem).
        const styleViews = ["root", "mobile", "sm", "tablet", "desktop", "md", "lg", "xl", "2xl", "hover"];
        if (view !== "component" && !styleViews.includes(view)) return;
        if (view === "component") return; // Don't propagate component props in style mode
      }

      // Apply the same change to clone
      actions.setProp(
        cloneId,
        props => {
          // For class props (style views), write to className
          if (view !== "component" && !["root"].includes(view)) {
            const prefix = buildVariantPrefix(view, classDark);
            if (!value || value === "") {
              props.className = removeClassForView(props.className || "", propKey, view, { classDark });
            } else {
              props.className = twMerge(props.className || "", prefix + value);
            }
            return;
          }
          // root/component props still write directly
          const setting = view === "component" ? props : (props[view] = props[view] || {});
          setting[propKey] = value;
        },
        0
      );
    });
  } catch (e) {
    console.error("Error propagating props to clones:", e);
  }
};

export const changeProp = (props: PropType, delay = 2000) => {
  const view =
    props.propType === "root"
      ? "root"
      : props.propType === "component"
        ? "component"
        : props.index === "hover"
          ? "hover"
          : props.view;

  const classDark = props.classDark ?? false;

  // Apply the change
  setPropOnView({ ...props, view, classDark }, delay);

  // Propagate to clones if query and actions are provided
  if (props.query && props.actions && props.nodeId) {
    const node = props.query.node(props.nodeId).get();
    if (node?.data?.props?.hasMany?.length) {
      propagatePropsToClones(
        props.nodeId,
        props.propKey,
        props.value,
        view,
        props.query,
        props.actions,
        props.index,
        props.propItemKey,
        props.classDark ?? false
      );
    }
  }
};

export const removeHasManyRelation = (node, query, actions) => {
  if (node.data.props?.belongsTo) {
    const belongsTo = query.node(node.data.props.belongsTo).get();

    if (belongsTo) {
      actions.setProp(
        node.data.props.belongsTo,
        prop => (prop.hasMany = prop.hasMany.filter(_ => _ !== node.id))
      );
    }
  }
};

export const deleteNode = async (query, actions, active, settings) => {
  const selected = active || query.getEvent("selected").first();

  if (!selected) return;
  const node = query.node(selected).get();
  if (node.data.props.canDelete === false) return;

  if (node.data.props?.hasMany?.length) {
    const many = node.data.props?.hasMany;

    many.forEach(hasId => {
      const has = query.node(hasId).get();
      if (has) {
        actions.setProp(hasId, prop => (prop.belongsTo = null));
      }
    });
  }

  removeHasManyRelation(node, query, actions);

  // Check if node is the root node
  if (!node.data.parent || selected === ROOT_NODE) {
    console.warn("Cannot delete root node:", selected);
    return;
  }

  // Store parent ID before deletion
  const parentId = node.data.parent;

  const { type, videoId, image, ico } = node.data.props || {};

  // Clean up any media associated with this node
  if (type === "cdn" && videoId) {
    DeleteMedia(videoId, settings, query, actions);
  }
  if (image) {
    DeleteMedia(image, settings, query, actions);
  }
  if (ico) {
    DeleteMedia(ico, settings, query, actions);
  }

  if (!query.node(selected).get()) return;

  actions.delete(selected);

  // Select the parent node after deletion
  actions.selectNode(parentId);
};

export const addHandler = ({ actions, query, getCloneTree, id, data = null, setProp }) => {
  data = data || JSON.parse(localStorage.getItem("clipBoard"));
  const newNodes = JSON.parse(data.nodes);

  Object.keys(newNodes).forEach(_ => {
    const d = newNodes[_].props;
    // newNodes[_].props.belongsTo = _;
    // newNodes[_].props.hasMany = [];

    if (d?.type === "page") {
      if (!d.canDelete) {
        d.canDelete = true;
      }

      if (newNodes[_].custom.displayName === "Home Page") {
        newNodes[_].custom.displayName = "Page";
        newNodes[_].props.isHomePage = false;
      }

      newNodes[_].custom.displayName = generate().spaced;
    }
  });

  const nodePairs = Object.keys(newNodes).map(id => {
    const nodeId = id;

    const da = query.parseSerializedNode(newNodes[id]).toNode(node => (node.id = nodeId));

    return [nodeId, da];
  });
  const tree = { rootNodeId: data.rootNodeId, nodes: fromEntries(nodePairs) };
  const newTree = getCloneTree(tree);

  const theNode = query.node(id).get();

  const parentNode = query.node(theNode?.data?.parent || ROOT_NODE).get();
  const indexToAdd = parentNode.data.nodes.indexOf(id);

  // Batch all operations to prevent multiple saves
  // Use requestAnimationFrame to ensure all DOM updates happen in one frame
  requestAnimationFrame(() => {
    // add templates where you want
    actions.addNodeTree(newTree, parentNode.id, indexToAdd + 1);

    // Select the node after a short delay to ensure the tree is fully added
    setTimeout(() => actions.selectNode(newTree.rootNodeId), 50);
  });
};

const fromEntries = pairs => {
  if (Object.fromEntries) {
    return Object.fromEntries(pairs);
  }
  return pairs.reduce(
    (accum, [id, value]) => ({
      ...accum,
      [id]: value,
    }),
    {}
  );
};

export const saveHandler = async ({ query, id, component = null, actions = null }) => {
  const tree = query.node(id).toNodeTree();
  const nodePairs = Object.keys(tree.nodes).map(id => [id, query.node(id).toSerializedNode()]);
  const entries = fromEntries(nodePairs);

  const serializedNodesJSON = JSON.stringify(entries);

  // Get the component name from the root node
  const rootNode = query.node(tree.rootNodeId).get();
  const componentName =
    rootNode?.data?.custom?.displayName ||
    rootNode?.data?.displayName ||
    rootNode?.data?.name ||
    `Component ${Date.now()}`;

  const saveData = {
    rootNodeId: tree.rootNodeId,
    nodes: serializedNodesJSON,
    name: componentName, // Add name for linking
  };

  // save to your database

  // assign component it came froms id.. then that new comp can see if we can mod or take settings..

  if (component) {
    // NEW APPROACH: Create a real Container node with type="component"
    if (actions) {
      console.log("💾 Creating component as real node:", componentName);

      // Get the original node info before moving it
      const originalNode = query.node(id).get();
      const originalParent = originalNode.data.parent;
      const originalParentNode = query.node(originalParent).get();
      const originalIndex = originalParentNode.data.nodes.indexOf(id);

      // Dynamically import Container to avoid circular dependency
      const { Container } = await import("../../components/Container");

      // 1. Create a new Container with type="component" to store the original
      // Must be a Canvas element to accept children
      // Will be automatically hidden in preview mode by Container component
      const Element = (await import("@craftjs/core")).Element;
      const componentWrapper = query
        .parseReactElement(
          <Element
            canvas
            is={Container}
            type="component"
            custom={{ displayName: componentName }}
            className="bg-transparent flex flex-col gap-0"
          />
        )
        .toNodeTree();

      // Add the component wrapper to ROOT
      actions.addNodeTree(componentWrapper, ROOT_NODE);
      const componentId = componentWrapper.rootNodeId;
      console.log("📦 Created component container:", componentId);

      // 2. Move the ORIGINAL node into the component container
      actions.move(id, componentId, 0);
      console.log("📦 Moved original into component container");

      // 3. Create a clone from the original (now inside container)
      const tree = query.node(id).toNodeTree();
      const clonedTree = buildClonedTree({
        tree,
        query,
        setProp: actions.setProp,
        createLinks: true, // Create link between original and clone
      });

      // 4. Place the clone where the original was
      actions.addNodeTree(clonedTree, originalParent, originalIndex);
      console.log("📦 Placed clone at original location");

      // Mark the clone with belongsTo and select it
      setTimeout(async () => {
        const { setRecursiveBelongsTo } = await import("../componentUtils");

        setRecursiveBelongsTo(clonedTree.rootNodeId, id, query, actions, (clonedNodeId, prop) => {
          // Set savedComponentName only on the root node
          if (clonedNodeId === clonedTree.rootNodeId) {
            prop.savedComponentName = componentName;
          }
        });

        // Select the clone so user can see it's been created
        actions.selectNode(clonedTree.rootNodeId);
      }, 50);

      console.log("✅ Component created as real node!");

      // Serialize the tree for the component data (using original node tree)
      const componentTreePairs = Object.keys(tree.nodes).map(nodeId => [
        nodeId,
        query.node(nodeId).toSerializedNode(),
      ]);
      const componentEntries = fromEntries(componentTreePairs);
      const componentSerializedJSON = JSON.stringify(componentEntries);

      // Return the component data with the original's tree
      return {
        rootNodeId: id, // The original node in the component container is the root
        nodes: componentSerializedJSON,
        name: componentName,
      };
    }
  } else localStorage.setItem("clipBoard", JSON.stringify(saveData));

  return saveData;
};

export const getNodeTree = ({ tree, query }) => {
  const newNodes = {};
  const changeNodeId = (node: any, newParentId?: string) => {
    const newNodeId = getRandomId();
    const childNodes = node.data.nodes.map(childId => changeNodeId(tree.nodes[childId], newNodeId));
    const linkedNodes = Object.keys(node.data.linkedNodes).reduce((acc, id) => {
      const newLinkedNodeId = changeNodeId(tree.nodes[node.data.linkedNodes[id]], newNodeId);
      return {
        ...acc,
        [id]: newLinkedNodeId,
      };
    }, {});

    const tmpNode = {
      ...node,
      id: newNodeId,
      data: {
        ...node.data,
        parent: newParentId || node.data.parent,
        nodes: childNodes,
        linkedNodes,
      },
    };
    const freshNode = query.parseFreshNode(tmpNode).toNode();
    newNodes[newNodeId] = freshNode;
    return newNodeId;
  };

  const rootNodeId = changeNodeId(tree.nodes[tree.rootNodeId]);
  return {
    rootNodeId,
    nodes: newNodes,
  };
};

export const buildClonedTree = ({ tree, query, setProp, createLinks = true }) => {
  const newNodes = {};
  const linksToCreate = []; // Batch all link creations

  const changeNodeId = (node: any, newParentId?: string) => {
    const newNodeId = getRandomId();
    const childNodes = node.data.nodes.map(childId => changeNodeId(tree.nodes[childId], newNodeId));
    const linkedNodes = Object.keys(node.data.linkedNodes).reduce((acc, id) => {
      const newLinkedNodeId = changeNodeId(tree.nodes[node.data.linkedNodes[id]], newNodeId);
      return {
        ...acc,
        [id]: newLinkedNodeId,
      };
    }, {});

    const oldid = node.id;

    const tmpNode = {
      ...node,
      id: newNodeId,

      data: {
        ...node.data,
        parent: newParentId || node.data.parent,
        nodes: childNodes,
        linkedNodes,
      },
    };
    const freshNode = query.parseFreshNode(tmpNode).toNode();

    newNodes[newNodeId] = freshNode;

    // Collect link creation instead of doing it immediately
    if (createLinks && query.node(oldid).get()) {
      linksToCreate.push({ oldid, newNodeId });
    }

    return newNodeId;
  };

  const rootNodeId = changeNodeId(tree.nodes[tree.rootNodeId]);

  // Batch all link creations to prevent multiple saves
  if (linksToCreate.length > 0) {
    requestAnimationFrame(() => {
      linksToCreate.forEach(({ oldid, newNodeId }) => {
        setProp(oldid, prop => {
          prop.hasMany = prop.hasMany || [];
          prop.hasMany.push(newNodeId);
        });
      });
    });
  }

  // Store the original root ID for later use (after tree is added to editor)
  const originalRootId = tree.rootNodeId;

  return {
    rootNodeId,
    nodes: newNodes,
    originalRootId: createLinks ? originalRootId : null, // Include original ID if linking
  };
};
export type Position = "top" | "bottom" | "left" | "right";
export type Align = "start" | "middle" | "end";
