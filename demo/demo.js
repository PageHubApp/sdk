// ─── Helpers ────────────────────────────────────────────────────────────────

function log(event, detail) {
  console.log(`[Event: ${event}]`, detail || "");
}

function setStatus(text, ok) {
  if (ok === undefined) ok = true;
  document.getElementById("status-text").textContent = text;
  document.getElementById("status-dot").style.background = ok ? "#22c55e" : "#ef4444";
}

// ─── Mock database ──────────────────────────────────────────────────────────
//
// `window.DEMO_TEMPLATE` is a precompressed payload bundled with the demo. It
// can reference component names that have since been renamed/removed, in which
// case CraftJS deserialize fails with "Cannot destructure property 'type'".
// Start with a freshly-built minimal Background ROOT so the editor has a real
// drop target — without this CraftJS renders <Frame /> with zero nodes and
// dragging anything onto the canvas throws "Invariant failed".

const mockDB = {
  "page-1": null,
};

// Minimal CraftJS-shaped tree with Background ROOT + Header + Home page + Footer.
// Mirrors the structure PageHub templates seed (see scripts/seed/data/templates).
// The ROOT.props.theme is set to PageHub's actual `DEFAULT_PALETTE` + `DEFAULT_STYLE_GUIDE`
// (exposed from the SDK index) so the canvas tokens (--base-100, --primary, etc.)
// match what a fresh site in the real PageHub app gets.
const MINIMAL_TREE_JSON = JSON.stringify({
  ROOT: {
    type: { resolvedName: "Background" },
    isCanvas: true,
    props: {
      type: "background",
      pageMedia: [],
      savedComponents: [],
      className:
        "bg-base-100 text-base-content min-h-dvh w-full min-w-0 flex flex-col overflow-x-hidden overflow-y-auto",
      theme: {
        palette: PageHub.DEFAULT_PALETTE || [],
        styleGuide: PageHub.DEFAULT_STYLE_GUIDE || {},
        typography: [],
        darkModeEnabled: false,
      },
    },
    displayName: "Background",
    custom: {},
    parent: null,
    hidden: false,
    nodes: ["hdr_root", "page_home", "ftr_root"],
    linkedNodes: {},
  },
  hdr_root: {
    type: { resolvedName: "Header" },
    isCanvas: true,
    props: { type: "header", canDelete: false, canEditName: false },
    displayName: "Header",
    custom: { displayName: "Header" },
    parent: "ROOT",
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
  page_home: {
    type: { resolvedName: "Container" },
    isCanvas: true,
    props: {
      type: "page",
      canDelete: false,
      canEditName: true,
      isHomePage: true,
      hidden: false,
      className: "bg-base-100 text-base-content flex flex-col w-full flex-1 min-h-0",
    },
    displayName: "Container",
    custom: { displayName: "Home Page" },
    parent: "ROOT",
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
  ftr_root: {
    type: { resolvedName: "Footer" },
    isCanvas: true,
    props: { type: "footer", canDelete: false, canEditName: false, className: "w-full" },
    displayName: "Footer",
    custom: { displayName: "Footer" },
    parent: "ROOT",
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
});

let cachedInitialContent = null;
async function getInitialContent() {
  if (cachedInitialContent) return cachedInitialContent;
  if (typeof PageHub.compressAsync === "function") {
    cachedInitialContent = await PageHub.compressAsync(MINIMAL_TREE_JSON);
  }
  return cachedInitialContent;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const defaultConfig = {
  mode: "default",
  apiBaseUrl: "",
  apiKey: "",
  siteId: "",
  theme: {
    primaryColor: "#3b82f6",
    secondaryColor: "#8b5cf6",
    accentColor: "#06b6d4",
    colorScheme: "light",
  },
  features: {
    aiGeneration: false,
    sidebar: true,
    toolbar: true,
    multiPage: true,
    customCSS: false,
    importExport: true,
    blocksPanel: false,
  },
};

// ─── Mode presets (host-constraints.md) ────────────────────────────────────
//
// Each preset returns the feature flags + registry callbacks the SDK should
// apply BEFORE PageHub.init mounts. Registries are imperative, so each init
// resets them first, then re-applies only what the chosen mode needs.

const EMAIL_UNSAFE_CLASS_RE = /\b(backdrop-blur|animate-|transform|filter|fixed|sticky)\b/;

function applyModeRegistries(mode) {
  // Always reset — switching back to Default should leave no residue.
  if (typeof PageHub.resetComponentAllowlist === "function") {
    PageHub.resetComponentAllowlist();
  }
  if (typeof PageHub.resetCatalogFilter === "function") {
    PageHub.resetCatalogFilter();
  }
  if (typeof PageHub.resetBlocksProvider === "function") {
    PageHub.resetBlocksProvider();
  }

  // Register the in-memory fixture provider so the Blocks panel works when the
  // user toggles features.blocksPanel on. Default mode has no provider beyond
  // the SDK's HTTP fallback — and the demo has no /api/v1/components* endpoint.
  if (window.DEMO_BLOCKS_PROVIDER && typeof PageHub.registerBlocksProvider === "function") {
    PageHub.registerBlocksProvider(window.DEMO_BLOCKS_PROVIDER);
  }

  if (mode === "email") {
    if (typeof PageHub.registerComponentAllowlist === "function") {
      PageHub.registerComponentAllowlist(["Text", "Container", "Button", "Image"]);
    }
    if (typeof PageHub.registerCatalogFilter === "function") {
      PageHub.registerCatalogFilter("Button", function (entry, kind) {
        if (kind !== "modifier") return true;
        var blob = (entry.classes || "") + " " + (entry.expands || "") + " " + (entry.name || "");
        return !EMAIL_UNSAFE_CLASS_RE.test(blob);
      });
      // Container presets carry a `category` override — Image Grid, Navbar, Map,
      // Modal, Tabs, etc. surface under their own toolbox category even though
      // their host component is Container. For email mode, drop the web-only
      // ones so the toolbox shows only the basic Layout primitives (Section/Row/Column).
      var EMAIL_FORBIDDEN_PRESET_CATEGORIES = {
        Images: true,
        Forms: true,
        Media: true,
        Navigation: true,
        Interactive: true,
        Lists: true,
        Tables: true,
        Buttons: true, // (handled by the Button-component allowlist; this catches Container "Button Group" preset)
        Components: true,
      };
      PageHub.registerCatalogFilter("Container", function (entry, kind) {
        if (kind !== "preset") return true;
        if (entry.category && EMAIL_FORBIDDEN_PRESET_CATEGORIES[entry.category]) return false;
        return true;
      });
    }
  }
}

function featuresForMode(mode, base) {
  // The base form holds blocksPanel as a boolean (checkbox value). The SDK
  // expects { enabled: boolean } — normalize at the boundary.
  var baseBlocksEnabled = !!base.blocksPanel;
  var normalizedBase = Object.assign({}, base, { blocksPanel: { enabled: baseBlocksEnabled } });

  if (mode === "email") {
    return Object.assign({}, normalizedBase, {
      blocksPanel: { enabled: false },
      aiGeneration: false,
      customCSS: false,
      multiPage: false,
      seoPanel: false,
      responsivePreview: false,
      importExport: false,
      inspectorTabs: {
        Button: ["component", "design"],
        Text: ["component", "design"],
        Container: ["component", "layout", "design"],
        Image: ["component", "design"],
      },
      cssAllowlist: {
        classes: [/^(bg|text|p|m|gap|rounded|border|flex|grid|w|h|font|leading|tracking|align|justify|items)-/],
        properties: [
          "color", "background-color",
          "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
          "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
          "font-size", "font-weight", "line-height", "text-align",
        ],
      },
    });
  }
  if (mode === "minimal") {
    return Object.assign({}, normalizedBase, {
      sidebar: false,
      aiGeneration: false,
      customCSS: false,
      importExport: false,
      seoPanel: false,
      blocksPanel: { enabled: false },
    });
  }
  return normalizedBase; // default — boolean already normalized to { enabled }
}

let savedConfig = {};
try {
  const stored = localStorage.getItem("pagehub-demo-config");
  if (stored) savedConfig = JSON.parse(stored);
} catch (e) {}

let currentConfig = {
  mode: savedConfig.mode !== undefined ? savedConfig.mode : defaultConfig.mode,
  apiBaseUrl:
    savedConfig.apiBaseUrl !== undefined ? savedConfig.apiBaseUrl : defaultConfig.apiBaseUrl,
  apiKey: savedConfig.apiKey !== undefined ? savedConfig.apiKey : defaultConfig.apiKey,
  siteId: savedConfig.siteId !== undefined ? savedConfig.siteId : defaultConfig.siteId,
  theme: Object.assign({}, defaultConfig.theme, savedConfig.theme || {}),
  features: Object.assign({}, defaultConfig.features, savedConfig.features || {}),
};

function populateConfigForm() {
  document.getElementById("cfg-mode").value = currentConfig.mode || "default";
  document.getElementById("cfg-apiBaseUrl").value = currentConfig.apiBaseUrl;
  document.getElementById("cfg-apiKey").value = currentConfig.apiKey || "";
  document.getElementById("cfg-siteId").value = currentConfig.siteId || "";
  document.getElementById("cfg-primaryColor").value = currentConfig.theme.primaryColor;
  document.getElementById("cfg-secondaryColor").value = currentConfig.theme.secondaryColor;
  document.getElementById("cfg-accentColor").value = currentConfig.theme.accentColor;
  document.getElementById("cfg-aiGeneration").checked = currentConfig.features.aiGeneration;
  document.getElementById("cfg-sidebar").checked = currentConfig.features.sidebar;
  document.getElementById("cfg-toolbar").checked = currentConfig.features.toolbar;
  document.getElementById("cfg-importExport").checked = currentConfig.features.importExport;
  document.getElementById("cfg-blocksPanel").checked = !!currentConfig.features.blocksPanel;
}

// ─── API loading ────────────────────────────────────────────────────────────

async function handleLoadFromApi() {
  var siteEl = document.getElementById("cfg-siteId");
  var keyEl = document.getElementById("cfg-apiKey");
  var siteId = (siteEl && siteEl.value.trim()) || currentConfig.siteId || "";
  var apiKey = (keyEl && keyEl.value.trim()) || currentConfig.apiKey || "";
  if (!siteId) {
    setStatus("Set site ID in Configure", false);
    document.getElementById("config-modal").style.display = "flex";
    return;
  }
  if (!editor) {
    setStatus("Wait for editor to finish loading", false);
    return;
  }
  currentConfig.siteId = siteId;
  currentConfig.apiKey = apiKey;
  localStorage.setItem("pagehub-demo-config", JSON.stringify(currentConfig));
  setStatus("Loading from API...");
  try {
    var base = (currentConfig.apiBaseUrl || "").replace(/\/$/, "");
    var data;
    if (apiKey) {
      var url = base + "/api/v1/sites/" + encodeURIComponent(siteId) + "?format=raw";
      var r = await fetch(url, { headers: { Authorization: "Bearer " + apiKey } });
      if (r.status === 404) {
        var tplUrl = base + "/api/v1/templates/" + encodeURIComponent(siteId) + "?format=raw";
        var tplR = await fetch(tplUrl);
        data = await tplR.json();
        if (!tplR.ok) throw new Error(data.error || "Site not found");
      } else {
        data = await r.json();
        if (!r.ok) throw new Error(data.error || r.statusText || String(r.status));
      }
    } else {
      var tplUrl = base + "/api/v1/templates/" + encodeURIComponent(siteId) + "?format=raw";
      var tplR = await fetch(tplUrl);
      data = await tplR.json();
      if (!tplR.ok) throw new Error(data.error || "Not found (no API key for sites lookup)");
    }
    if (!data.content) throw new Error("No compressed content on site");
    mockDB["page-1"] = { content: data.content };
    if (editor) editor.load("page-1");
    setStatus("Loaded from API");
    log("loadFromApi", siteId + " (" + data.content.length + " chars)");
  } catch (e) {
    log("loadFromApi", e.message || String(e));
    setStatus("API load failed: " + (e.message || e), false);
  }
}

// ─── Editor lifecycle ───────────────────────────────────────────────────────

var editor = null;
var didAutoLoadFromUrl = false;

function initEditor() {
  if (editor) {
    editor.destroy();
    editor = null;
  }

  setStatus("Loading SDK...");

  // Mode presets override base feature flags + register host-constraints
  // registries (component allowlist, catalog filter). Run BEFORE PageHub.init
  // so the first render sees the constraints.
  var mode = currentConfig.mode || "default";
  applyModeRegistries(mode);
  var mergedFeatures = featuresForMode(mode, currentConfig.features);
  log("mode", mode);

  editor = PageHub.default.init({
    container: "#pagehub-editor",
    pageId: "page-1",
    apiBaseUrl: currentConfig.apiBaseUrl,
    callbacks: {
      onSave: function (pageData) {
        mockDB["page-1"] = pageData;
        log("onSave", pageData.content.length + " bytes");
        setStatus("Saved!");
        setTimeout(function () {
          setStatus("Ready");
        }, 2000);
        return Promise.resolve();
      },
      onLoad: async function (pageId) {
        log("onLoad", pageId || "new page");
        if (mockDB[pageId]) return mockDB[pageId];
        // First load: seed an empty Background ROOT so CraftJS has a drop target.
        // Without this, dragging a block onto the empty canvas throws Invariant.
        const content = await getInitialContent();
        return content ? { content } : null;
      },
      onChange: function () {},
    },
    theme: currentConfig.theme,
    features: mergedFeatures,
  });

  editor.on("ready", function () {
    log("ready", "Editor mounted and page loaded");
    setStatus("Ready");
    if (didAutoLoadFromUrl) return;
    didAutoLoadFromUrl = true;

    var params = new URLSearchParams(location.search);
    var q = params.get("site");
    var draftQ = params.get("draft");

    if (!currentConfig.apiKey && draftQ) {
      setStatus("Add API key in Configure to load drafts", false);
      return;
    }
    if (q) {
      q = q.trim();
      currentConfig.siteId = q;
      var siteInput = document.getElementById("cfg-siteId");
      if (siteInput) siteInput.value = q;
      handleLoadFromApi();
      return;
    }
    if (draftQ) {
      draftQ = draftQ.trim();
      setStatus("Resolving draftId…");
      var baseDraft = (currentConfig.apiBaseUrl || "").replace(/\/$/, "");
      fetch(baseDraft + "/api/v1/sites", {
        headers: { Authorization: "Bearer " + currentConfig.apiKey },
      })
        .then(function (r) {
          return r.json().then(function (data) {
            return { r: r, data: data };
          });
        })
        .then(function (o) {
          if (!o.r.ok) throw new Error(o.data.error || o.r.statusText);
          var found = (o.data.sites || []).find(function (s) {
            return s.draftId === draftQ;
          });
          if (!found) throw new Error("No site with draftId: " + draftQ);
          currentConfig.siteId = found._id;
          var si = document.getElementById("cfg-siteId");
          if (si) si.value = found._id;
          localStorage.setItem("pagehub-demo-config", JSON.stringify(currentConfig));
          handleLoadFromApi();
        })
        .catch(function (e) {
          log("draftResolve", e.message || String(e));
          setStatus("draft= resolve failed: " + (e.message || e), false);
        });
    }
  });

  editor.on("error", function (err) {
    log("error", err && err.message ? err.message : String(err));
    setStatus("Error", false);
  });

  editor.on("modeChange", function (mode) {
    log("modeChange", mode);
  });
}

// ─── Config modal ───────────────────────────────────────────────────────────

function saveConfig() {
  currentConfig.mode = document.getElementById("cfg-mode").value || "default";
  currentConfig.apiBaseUrl = document.getElementById("cfg-apiBaseUrl").value || "";
  currentConfig.apiKey = (document.getElementById("cfg-apiKey").value || "").trim();
  currentConfig.siteId = (document.getElementById("cfg-siteId").value || "").trim();
  currentConfig.theme.primaryColor = document.getElementById("cfg-primaryColor").value;
  currentConfig.theme.secondaryColor = document.getElementById("cfg-secondaryColor").value;
  currentConfig.theme.accentColor = document.getElementById("cfg-accentColor").value;
  currentConfig.features.aiGeneration = document.getElementById("cfg-aiGeneration").checked;
  currentConfig.features.sidebar = document.getElementById("cfg-sidebar").checked;
  currentConfig.features.toolbar = document.getElementById("cfg-toolbar").checked;
  currentConfig.features.importExport = document.getElementById("cfg-importExport").checked;
  currentConfig.features.blocksPanel = document.getElementById("cfg-blocksPanel").checked;

  localStorage.setItem("pagehub-demo-config", JSON.stringify(currentConfig));
  document.getElementById("config-modal").style.display = "none";
  log("config", "Reloading SDK with new settings");
  initEditor();
}

// ─── Button handlers ────────────────────────────────────────────────────────

function handleSave() {
  editor.save({ isDraft: false });
  log("save", "Manual save triggered");
}

function handleToggleMode() {
  var isReadOnly = !window._readOnly;
  window._readOnly = isReadOnly;
  editor.setReadOnly(isReadOnly);
  log("toggle", isReadOnly ? "Viewer mode" : "Editor mode");
}

function handleExport() {
  var json = editor.exportJSON();
  log("export", json.length + " chars");
  console.log("Exported JSON:", JSON.parse(json));
}

function handleLoadTemplate() {
  // Populate the mock DB with the bundled DEMO_TEMPLATE on demand. If the
  // template references stale component names the SDK will log a load error
  // (see [PageHub] Failed to load page) — that's a regeneration task, not a
  // demo bug. Leave page-1 null on first load so the canvas opens clean.
  if (window.DEMO_TEMPLATE) {
    mockDB["page-1"] = { content: window.DEMO_TEMPLATE };
  }
  editor.load("page-1");
  log("loadTemplate", "Reloading page-1");
}

function handleDestroy() {
  editor.destroy();
  log("destroy", "Editor destroyed");
  setStatus("Destroyed", false);
}

// ─── Boot ───────────────────────────────────────────────────────────────────

populateConfigForm();
initEditor();
log("init", "PageHub.init() called");
