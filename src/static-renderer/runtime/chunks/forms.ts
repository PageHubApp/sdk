// Form submit dispatcher — routes email / webhook / collection / agent / custom.
// Toggles the three per-form visibility-state-key entries (fields / loading /
// loaded) through the state-registry chunk's `setVisibility()` so the
// `data-visibility-state-key` directive can show/hide the matching subtrees.
//
// Authored as a real TS function; `stringifyChunk` extracts the body so the
// statements execute in the runtime IIFE alongside the preamble + state chunk.
// Globals (`Alpine`, `PAGE_ID`, `setVisibility`, `fireAnalytics`, ...) are
// declared in [runtime-globals.d.ts](./runtime-globals.d.ts).

import { stringifyChunk } from "./stringifyChunk";

type FormMeta = {
  submissionType?:
    | "email"
    | "webhook"
    | "collection"
    | "agent"
    | "custom"
    | "iframe";
  formName?: string;
  successAction?: "redirect" | string;
  successUrl?: string;
  action?: string;
  method?: string;
  agentId?: string;
  mailto?: string;
  webhookUrl?: string;
  collectionSlug?: string;
  collectionFieldMap?: Record<string, string>;
  collectionSkipEmail?: boolean;
  conversion?: ConversionConfig;
};

export const FORMS_CHUNK = stringifyChunk(function $forms() {
  Alpine.directive(
    "form",
    function (
      form: HTMLFormElement,
      _meta: unknown,
      _ctx: { cleanup: (fn: () => void) => void }
    ) {
      const cleanup = _ctx.cleanup;
      const metaRaw = form.getAttribute("data-ph-form");
      let meta: FormMeta | null = null;
      if (metaRaw) {
        try {
          meta = JSON.parse(metaRaw);
        } catch (e) {}
      }
      const formId = form.getAttribute("data-ph-form-id") || "";
      const keys = formId
        ? {
            fields: "form:" + formId + ":fields",
            loading: "form:" + formId + ":loading",
            loaded: "form:" + formId + ":loaded",
          }
        : null;
      function toggle(k: "fields" | "loading" | "loaded", v: "shown" | "hidden") {
        if (keys) setVisibility(keys[k], v, "form-submit");
      }
      function showLoading() {
        toggle("fields", "hidden");
        toggle("loading", "shown");
        toggle("loaded", "hidden");
      }
      function showLoaded() {
        toggle("loading", "hidden");
        toggle("loaded", "shown");
      }
      const onSubmit = function (e: SubmitEvent) {
        e.preventDefault();
        const fd = new FormData(form);
        if (fd.get("_ph_hp")) return; // Honeypot.
        const data: Record<string, FormDataEntryValue> = {};
        fd.forEach(function (v, k) {
          if (k !== "_ph_hp") data[k] = v;
        });
        const t = (meta && meta.submissionType) || "email";
        const formName =
          (meta && meta.formName) ||
          form.getAttribute("data-form-name") ||
          "form";
        if (t === "iframe") return;
        showLoading();
        const done = function () {
          try {
            form.reset();
          } catch (e) {}
          if (
            meta &&
            meta.successAction === "redirect" &&
            meta.successUrl
          ) {
            window.location.href = meta.successUrl;
            return;
          }
          showLoaded();
        };
        const fail = function () {
          // Roll back to fields-visible on error so the visitor can retry.
          toggle("loading", "hidden");
          toggle("loaded", "hidden");
          toggle("fields", "shown");
        };
        if (t === "custom" && meta && meta.action) {
          fetch(meta.action, {
            method: meta.method || "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
            .then(done)
            .catch(fail);
        } else if (t === "agent" && meta && meta.agentId) {
          fetch(
            "/api/agents/" + encodeURIComponent(meta.agentId) + "/intake",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pageId: PAGE_ID, formData: data }),
              credentials: "include",
            }
          )
            .then(done)
            .catch(fail);
        } else {
          // email / webhook / collection — routed through /api/submissions.
          const body: Record<string, unknown> = {
            pageId: PAGE_ID,
            formData: data,
            formName: formName,
          };
          if (meta) {
            if (meta.mailto) body.mailTo = meta.mailto;
            if (t === "webhook" && meta.webhookUrl)
              body.webhookUrl = meta.webhookUrl;
            if (t === "collection" && meta.collectionSlug) {
              body.collection = meta.collectionSlug;
              if (meta.collectionFieldMap)
                body.collectionFieldMap = meta.collectionFieldMap;
              if (meta.collectionSkipEmail) body.skipEmail = true;
            }
          }
          fetch("/api/submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
            .then(done)
            .catch(fail);
        }
        fireAnalytics("form_submit", { formName: formName });
        // Author-configured conversion (Google Ads / GA4 / Meta).
        if (meta && meta.conversion) {
          try {
            fireConversion(meta.conversion);
          } catch (e) {}
        }
      };
      form.addEventListener("submit", onSubmit as EventListener);
      cleanup(function () {
        form.removeEventListener("submit", onSubmit as EventListener);
      });
    }
  );
});
