/**
 * Shared production-mode form submission used by both Form.tsx (editor
 * runtime when previewing) and Form.render.tsx (walker). Fires the actual
 * fetch / SaveSubmissions call and the analytics events. Returns nothing —
 * caller owns loading/loaded state.
 *
 * The editor's "simulate submission" branch lives in Form.tsx only; it does
 * not touch this helper.
 */

import { SaveSubmissions } from "../../utils/submissions";

export interface FormProductionProps {
  submissionType?: string;
  action?: string;
  method?: string;
  mailto?: string;
  formName?: string;
  webhookEnabled?: boolean;
  webhookUrl?: string;
}

export async function submitFormProduction(
  formData: any,
  props: FormProductionProps,
  settings: any = null
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
      console.error("Custom form submission failed:", err);
    }
  } else {
    SaveSubmissions(formData, settings, {
      mailTo: props.mailto,
      formName: props.formName,
      webhookUrl: props.webhookEnabled ? props.webhookUrl : undefined,
    });
  }

  const w = window as any;
  w.gtag?.("event", "form_submit", {
    event_category: "forms",
    event_label: props.formName || "form",
  });
  w.fbq?.("track", "Lead");
  w.dataLayer?.push({ event: "form_submit", formName: props.formName || "form" });
}
