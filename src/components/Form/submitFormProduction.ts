/**
 * Shared production-mode form submission used by both Form.tsx (editor
 * runtime when previewing) and Form.render.tsx (walker). Fires the actual
 * fetch / SaveSubmissions call and the analytics events. Returns nothing —
 * caller owns loading/loaded state.
 *
 * The editor's "simulate submission" branch lives in Form.tsx only; it does
 * not touch this helper.
 */

import type { ActionConversion } from "../../utils/action";
import { fireConversion } from "../../utils/actions/conversion";
import { SaveSubmissions } from "../../utils/submissions";
import { sdkLog } from "../../utils/logger";

export interface FormProductionProps {
  submissionType?: string;
  action?: string;
  method?: string;
  mailto?: string;
  formName?: string;
  webhookEnabled?: boolean;
  webhookUrl?: string;
  collectionSlug?: string;
  collectionFieldMap?: Record<string, string>;
  /** Author-set constant values written on submit (e.g. `{ public: false }`).
   *  Never sent to the server from the client — read server-authoritatively
   *  from the saved form node by node id — so they can't be spoofed. */
  collectionFieldValues?: Record<string, unknown>;
  collectionSkipEmail?: boolean;
  /** Optional Google Ads / GA4 / Meta conversion fired after a successful submit. */
  conversion?: ActionConversion;
}

export async function submitFormProduction(
  formData: any,
  props: FormProductionProps,
  settings: any = null,
  formNodeId?: string
): Promise<void> {
  if (props.submissionType === "iframe") return;

  if (props.submissionType === "custom" && props.action) {
    try {
      await fetch(props.action, {
        method: props.method || "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
    } catch (err) {
      sdkLog.error("Custom form submission failed:", err);
    }
  } else {
    SaveSubmissions(formData, settings, {
      mailTo: props.mailto,
      formName: props.formName,
      webhookUrl: props.webhookEnabled ? props.webhookUrl : undefined,
      collection: props.submissionType === "collection" ? props.collectionSlug : undefined,
      collectionFieldMap:
        props.submissionType === "collection" ? props.collectionFieldMap : undefined,
      skipEmail: props.submissionType === "collection" ? !!props.collectionSkipEmail : undefined,
      // Server reads the authoritative collection config (slug/map/fixed values)
      // from the saved node by this id — the body values above are a legacy
      // fallback for pre-upgrade sites.
      formNodeId: props.submissionType === "collection" ? formNodeId : undefined,
    });
  }

  const w = window as any;
  w.gtag?.("event", "form_submit", {
    event_category: "forms",
    event_label: props.formName || "form",
  });
  w.fbq?.("track", "Lead");
  w.dataLayer?.push({ event: "form_submit", formName: props.formName || "form" });

  // Author-configured conversion (Google Ads / GA4 / Meta) — fires on top of
  // the default form_submit / Lead events above. No navigation, fire-and-forget.
  if (props.conversion) fireConversion(props.conversion);
}
