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

const mockDB = {
  "page-1": { content: window.DEMO_TEMPLATE || "" },
};

// ─── Configuration ──────────────────────────────────────────────────────────

const defaultConfig = {
  apiBaseUrl: "https://pagehub.dev",
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
  },
};

let savedConfig = {};
try {
  const stored = localStorage.getItem("pagehub-demo-config");
  if (stored) savedConfig = JSON.parse(stored);
} catch (e) {}

let currentConfig = {
  apiBaseUrl:
    savedConfig.apiBaseUrl !== undefined ? savedConfig.apiBaseUrl : defaultConfig.apiBaseUrl,
  apiKey: savedConfig.apiKey !== undefined ? savedConfig.apiKey : defaultConfig.apiKey,
  siteId: savedConfig.siteId !== undefined ? savedConfig.siteId : defaultConfig.siteId,
  theme: Object.assign({}, defaultConfig.theme, savedConfig.theme || {}),
  features: Object.assign({}, defaultConfig.features, savedConfig.features || {}),
};

function populateConfigForm() {
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
      onLoad: function (pageId) {
        log("onLoad", pageId || "new page");
        return Promise.resolve(mockDB[pageId] || null);
      },
      onChange: function () {},
    },
    theme: currentConfig.theme,
    features: currentConfig.features,
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
  currentConfig.apiBaseUrl =
    document.getElementById("cfg-apiBaseUrl").value || "https://pagehub.dev";
  currentConfig.apiKey = (document.getElementById("cfg-apiKey").value || "").trim();
  currentConfig.siteId = (document.getElementById("cfg-siteId").value || "").trim();
  currentConfig.theme.primaryColor = document.getElementById("cfg-primaryColor").value;
  currentConfig.theme.secondaryColor = document.getElementById("cfg-secondaryColor").value;
  currentConfig.theme.accentColor = document.getElementById("cfg-accentColor").value;
  currentConfig.features.aiGeneration = document.getElementById("cfg-aiGeneration").checked;
  currentConfig.features.sidebar = document.getElementById("cfg-sidebar").checked;
  currentConfig.features.toolbar = document.getElementById("cfg-toolbar").checked;
  currentConfig.features.importExport = document.getElementById("cfg-importExport").checked;

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
