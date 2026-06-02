import React, { useEffect } from "react";
import { submitFormProduction } from "./submitFormProduction";
import { useContainerRenderWalker } from "../Container/Container.render";
import { useWalkerNode } from "../../render/react/contexts";
import { setVisibility } from "../../utils/state/stateRegistry";

/**
 * Walker / viewer render path for Form. Children include the canvas
 * sub-trees (formFieldsContainer / loadingTextContainer / sentTextContainer)
 * passed in via Craft's render order (`nodes` + `linkedNodes`). Their
 * `visibilityStateKey` props feed through Container.viewerBody and respond
 * to the state-registry visibility toggles fired below on submit.
 */
export const FormRender = ({ children, ...props }: any) => {
  const settings = null;
  const walker = useWalkerNode();
  const formId = walker?.id ?? "";
  const fieldsKey = formId ? `form:${formId}:fields` : "";
  const loadingKey = formId ? `form:${formId}:loading` : "";
  const loadedKey = formId ? `form:${formId}:loaded` : "";

  useEffect(() => {
    const iframe = document.querySelector("iframe");
    if (!iframe) return;
    const fnu = () => {
      if (loadingKey) setVisibility(loadingKey, "hidden", "form-iframe");
      if (loadedKey) setVisibility(loadedKey, "shown", "form-iframe");
    };
    iframe.addEventListener("load", fnu, true);
    return () => iframe.removeEventListener("load", fnu);
  }, [loadingKey, loadedKey]);

  const handleFormSubmit = async (formData: any) => {
    if (fieldsKey) setVisibility(fieldsKey, "hidden", "form-submit");
    if (loadingKey) setVisibility(loadingKey, "shown", "form-submit");
    if (props.submissionType === "iframe") return;
    await submitFormProduction(formData, props, settings);
    setTimeout(() => {
      if (props.successAction === "redirect" && props.successUrl) {
        window.location.href = props.successUrl;
        return;
      }
      if (loadingKey) setVisibility(loadingKey, "hidden", "form-submit");
      if (loadedKey) setVisibility(loadedKey, "shown", "form-submit");
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
      {children}
      {props.submissionType === "iframe" && (
        <iframe className="hidden" name="iframe" id="iframe" title="Submission Frame" />
      )}
    </>
  );

  return useContainerRenderWalker({ ...containerProps, children: containerChildren });
};
