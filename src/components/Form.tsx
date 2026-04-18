import { Element, useEditor, useNode } from "@craftjs/core";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { useEffect, useState } from "react";
import { TbClipboardCheck } from "react-icons/tb";
import { SaveSubmissions } from "../utils/lib";

import { Container } from "./Container";
import { Text } from "./Text";

export const Form = ({ children, ...props }: any) => {
  const formType = props.formType || "subscribe";
  const {
    id,
    connectors: { connect, drag },
  } = useNode();

  const { enabled, query } = useEditor(state => ({
    enabled: state.options.enabled,
    ...getClonedState(props, state),
  }));

  props = setClonedProps(props, query);

  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [debugTab, setDebugTab] = useState<"data" | "config">("data");
  const settings = null;

  useEffect(() => {
    const iframe = document.querySelector("iframe");
    if (!iframe) {
      // No iframe in SDK context — nothing to wait for
      return;
    }
    const fnu = () => {
      setLoaded(true);
      setLoading(false);
    };
    iframe.addEventListener("load", fnu, true);
    return () => iframe.removeEventListener("load", fnu);
  }, []);

  // Handle form submission - called by both submit button and double-click
  const handleFormSubmit = async (formData: any) => {
    // In edit mode, just simulate submission
    if (enabled) {
      const submissionData = {
        formData,
        formType,
        formName: props.formName,
        mailto: props.mailto,
        action: props.action,
        method: props.method,
        timestamp: new Date().toLocaleString(),
      };

      setDebugData(submissionData);
      setLoading(true);

      // Show loading for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      setLoading(false);
      setLoaded(true);

      // In editor mode, automatically go back to form after showing thank you
      setTimeout(() => {
        setLoaded(false);
      }, 3000); // Show thank you for 3 seconds

      return;
    }

    // In preview mode, handle actual submission
    setLoading(true);
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
      const additional: any = {
        mailTo: props.mailto,
        formName: props.formName,
        webhookUrl: props.webhookEnabled ? props.webhookUrl : undefined,
      };

      SaveSubmissions(formData, settings, additional);
    }

    // Fire analytics events if pixels are loaded
    const w = window as any;
    w.gtag?.("event", "form_submit", {
      event_category: "forms",
      event_label: props.formName || "form",
    });
    w.fbq?.("track", "Lead");
    w.dataLayer?.push({ event: "form_submit", formName: props.formName || "form" });

    setTimeout(() => {
      if (props.successAction === "redirect" && props.successUrl) {
        window.location.href = props.successUrl;
        return;
      }
      setLoaded(true);
      setLoading(false);
    }, 1000);
  };

  // Handle double-click on form to test submission in editor mode
  const handleDoubleClick = async (e: any) => {
    if (!enabled) return; // Only work in editor mode

    e.preventDefault();
    e.stopPropagation();

    // Find the form element
    const formElement = e.currentTarget.querySelector("form") || e.currentTarget;
    const formFields = formElement.querySelectorAll("input, select, textarea");
    const formData: any = {};

    formFields.forEach(field => {
      if (field.type !== "file") {
        formData[field.name] = field.value;
      }
    });

    await handleFormSubmit(formData);
  };

  return (
    <Container
      canDelete={true}
      action={props.action || ""}
      method={props.method || "POST"}
      target={props.submissionType === "iframe" ? "iframe" : undefined}
      role="form"
      aria-label={props.formName || "Form"}
      onSubmit={async (e: any) => {
        e.preventDefault();

        // In editor mode, disable single-click submission (use double-click instead)
        if (enabled) {
          return;
        }

        setLoaded(false);

        // Extract form data for logging
        const formElement = e.target;
        const formFields = formElement.querySelectorAll("input, select, textarea");
        const formData: any = {};

        formFields.forEach(field => {
          if (field.type !== "file") {
            formData[field.name] = field.value;
          }
        });

        await handleFormSubmit(formData);
      }}
      onDoubleClick={handleDoubleClick}
      {...props}
      type="form"
    >
      {/* Honeypot — invisible field that only bots fill out */}
      {!enabled && (
        <div
          aria-hidden="true"
          tabIndex={-1}
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
            opacity: 0,
            height: 0,
            overflow: "hidden",
          }}
        >
          <input type="text" name="_ph_hp" autoComplete="off" tabIndex={-1} />
        </div>
      )}

      {!loading && !loaded && (!enabled || !props.view || props.view === "") && children}

      {(loading || (enabled && props.view === "loading")) && (
        enabled ? (
          <Element
            canvas
            id="loadingTextContainer"
            is={Container}
            role="status"
            aria-live="polite"
            canDelete={true}
            canEditName={true}
            className="flex w-full flex-col justify-center gap-3 px-6 py-6 md:flex-row"
            custom={{
              displayName: "Loading Text Container",
              id: "loadingTextContainer",
            }}
          >
            <Element
              canvas
              id="loadingText"
              is={Text}
              custom={{ displayName: "Loading Text", id: "loadingText" }}
              canDelete={true}
              canEditName={true}
              text={props.loading || "Sending..."}
            />
          </Element>
        ) : (
          <div className="flex w-full flex-col justify-center gap-3 px-6 py-6 md:flex-row" role="status" aria-live="polite">
            <p>{props.loading || "Sending..."}</p>
          </div>
        )
      )}

      {(loaded || (enabled && props.view === "loaded")) && (
        enabled ? (
          <Element
            canvas
            id="sentTextContainer"
            is={Container}
            role="status"
            aria-live="polite"
            canDelete={true}
            canEditName={true}
            className="flex w-full flex-col justify-center gap-3 px-6 py-6 md:flex-row"
            custom={{
              displayName: "Sent Text",
              id: "sentTextContainer",
            }}
          >
            <Element
              canvas
              id="sentText"
              is={Text}
              custom={{ displayName: "Text", id: "sentText" }}
              canDelete={true}
              canEditName={true}
              text={"Thank you!"}
            />
          </Element>
        ) : (
          <div className="flex w-full flex-col justify-center gap-3 px-6 py-6 md:flex-row" role="status" aria-live="polite">
            <p>{props.success || "Thank you!"}</p>
          </div>
        )
      )}

      {/* Debug panel - only shows in editor mode */}
      {enabled && debugData && (
        <div className="bg-base-200 text-base-content border-base-300 fixed right-5 bottom-5 z-9999 w-[500px] rounded-lg border shadow-lg">
          {/* Header */}
          <div className="border-base-300 flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <TbClipboardCheck className="text-lg" />
              <h3 className="text-sm font-semibold">Form Submission (Debug)</h3>
            </div>
            <button
              onClick={() => setDebugData(null)}
              className="text-neutral-content hover:text-base-content transition-colors"
              title="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="px-4 py-3">
            <div className="bg-neutral flex gap-1 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setDebugTab("data")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  debugTab === "data"
                    ? "bg-base-100 text-base-content shadow-sm"
                    : "text-neutral-content hover:text-base-content"
                }`}
              >
                Form Data
              </button>
              <button
                type="button"
                onClick={() => setDebugTab("config")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  debugTab === "config"
                    ? "bg-base-100 text-base-content shadow-sm"
                    : "text-neutral-content hover:text-base-content"
                }`}
              >
                Configuration
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-4 pb-4">
            {debugTab === "data" && (
              <pre className="bg-neutral max-h-96 overflow-auto rounded p-3 text-xs wrap-break-word whitespace-pre-wrap">
                {JSON.stringify(debugData.formData, null, 2)}
              </pre>
            )}

            {debugTab === "config" && (
              <div className="bg-neutral max-h-96 space-y-2 overflow-auto rounded p-3 text-xs">
                <div>
                  <span className="text-base-content font-semibold">Form Type:</span>{" "}
                  <span className="text-neutral-content">{debugData.formType || "N/A"}</span>
                </div>
                <div>
                  <span className="text-base-content font-semibold">Form Name:</span>{" "}
                  <span className="text-neutral-content">{debugData.formName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-base-content font-semibold">Action URL:</span>{" "}
                  <span className="text-neutral-content break-all">
                    {debugData.action || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-base-content font-semibold">Method:</span>{" "}
                  <span className="text-neutral-content">{debugData.method || "POST"}</span>
                </div>
                <div>
                  <span className="text-base-content font-semibold">Mail To:</span>{" "}
                  <span className="text-neutral-content">{debugData.mailto || "N/A"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {props.submissionType === "iframe" && (
        <iframe className="hidden" name="iframe" id="iframe" title="Submission Frame" />
      )}
    </Container>
  );
};

Form.craft = {
  displayName: "Form",
  rules: {
    canDrag: () => true,
    canMoveIn: nodes =>
      nodes.every(node => node.data?.type !== "Form" && node.data?.props?.type !== "form"),
  },
};
