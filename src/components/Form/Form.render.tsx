import React, { useEffect, useState } from "react";
import { submitFormProduction } from "./submitFormProduction";
import { useContainerRenderWalker } from "../Container/Container.render";

/**
 * Walker render path for Form. Editor-only `<Element canvas>` chrome
 * (loadingTextContainer / sentTextContainer) is intentionally dropped —
 * walker emits plain styled `<div>`s for the loading/success states.
 */
export const FormRender = ({ children, ...props }: any) => {
  const formType = props.formType || "subscribe";
  const settings = null;

  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const iframe = document.querySelector("iframe");
    if (!iframe) return;
    const fnu = () => {
      setLoaded(true);
      setLoading(false);
    };
    iframe.addEventListener("load", fnu, true);
    return () => iframe.removeEventListener("load", fnu);
  }, []);

  const handleFormSubmit = async (formData: any) => {
    setLoading(true);
    if (props.submissionType === "iframe") return;
    await submitFormProduction(formData, props, settings);
    setTimeout(() => {
      if (props.successAction === "redirect" && props.successUrl) {
        window.location.href = props.successUrl;
        return;
      }
      setLoaded(true);
      setLoading(false);
    }, 1000);
  };

  const containerProps: any = {
    action: props.action || "",
    method: props.method || "POST",
    target: props.submissionType === "iframe" ? "iframe" : undefined,
    role: "form",
    "aria-label": props.formName || "Form",
    onSubmit: async (e: any) => {
      e.preventDefault();
      setLoaded(false);
      const formElement = e.target;
      const formFields = formElement.querySelectorAll("input, select, textarea");
      const formData: any = {};
      formFields.forEach((field: any) => {
        if (field.type !== "file") formData[field.name] = field.value;
      });
      await handleFormSubmit(formData);
    },
    ...props,
    type: "form",
  };

  const containerChildren = (
    <>
      <div
        aria-hidden="true"
        tabIndex={-1}
        style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}
      >
        <input type="text" name="_ph_hp" autoComplete="off" tabIndex={-1} />
      </div>
      {!loading && !loaded && children}
      {loading && (
        <div className="flex w-full flex-col justify-center gap-3 px-6 py-6 md:flex-row" role="status" aria-live="polite">
          <p>{props.loading || "Sending..."}</p>
        </div>
      )}
      {loaded && (
        <div className="flex w-full flex-col justify-center gap-3 px-6 py-6 md:flex-row" role="status" aria-live="polite">
          <p>{props.success || "Thank you!"}</p>
        </div>
      )}
      {props.submissionType === "iframe" && (
        <iframe className="hidden" name="iframe" id="iframe" title="Submission Frame" />
      )}
    </>
  );

  return useContainerRenderWalker({ ...containerProps, children: containerChildren });
};
