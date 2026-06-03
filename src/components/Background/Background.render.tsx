import React from "react";
import { CSStoObj, applyAnimation } from "../../utils/tailwind/tailwind";
import { applyBackgroundImage, applyLazyBackgroundImage, getBackgroundUrl } from "../../utils/background";
import { PaletteProvider } from "../../utils/design/PaletteContext";
import { RuntimeVarsProvider } from "../../utils/design/RuntimeVarsContext";
import { resolveTheme } from "../../utils/design/resolveTheme";
import { useLazyBackground } from "../../utils/hooks/useLazyBackground";
import { applyAriaProps } from "../selectors";
import { InjectedHeadTags, InjectedBodyTags } from "../../chrome/static/runtime/InjectedHeadTags";
import { useWalkerNode } from "../../render/react/contexts";
import type { ContainerProps as BackgroundContainerProps } from "./Background.body";

const RUNTIME_VARS_BOOTSTRAP =
  "window.PageHub=window.PageHub||{_queue:[],setVar:function(k,v){this._queue.push([k,v])},getVar:function(){}};";

export function BackgroundRender({
  type = "background",
  pageMedia = [],
  savedComponents = [],
  background,
  children,
  ...rest
}: Partial<BackgroundContainerProps> & { children?: React.ReactNode }) {
  const props: any = {
    type,
    pageMedia,
    savedComponents,
    children,
    ...rest,
    background: {
      fetchPriority: "low",
      placeholder: "color-mix(in oklab, currentColor 5%, transparent)",
      ...(background ?? {}),
    },
  };

  const id = useWalkerNode()?.id ?? "ROOT";
  const isRoot = id === "ROOT";
  const pageMediaList: any[] = Array.isArray(props.pageMedia) ? props.pageMedia : [];

  const {
    ref: lazyRef,
    isLoaded,
    backgroundImage,
  } = useLazyBackground(props.background?.image ? getBackgroundUrl(props, pageMediaList) : null, {
    enabled: !!props.background?.lazy,
  });

  const prop: any = {
    ref: lazyRef ?? undefined,
    style: {
      ...(props.root?.style ? CSStoObj(props.root.style) || {} : {}),
    },
    className: props.className || "",
  };
  applyAriaProps(prop, props);

  prop.children = (
    <PaletteProvider palette={resolveTheme(props).palette}>
      <RuntimeVarsProvider>
        {isRoot ? (
          <script
            key="ph-runtime-vars-bootstrap"
            dangerouslySetInnerHTML={{ __html: RUNTIME_VARS_BOOTSTRAP }}
          />
        ) : null}
        {isRoot && props.inject?.head ? <InjectedHeadTags html={props.inject.head} /> : null}
        {props.children ?? null}
        {isRoot && props.inject?.footer ? <InjectedBodyTags html={props.inject.footer} /> : null}
      </RuntimeVarsProvider>
    </PaletteProvider>
  );

  if (props.background?.lazy) {
    applyLazyBackgroundImage(prop, props, null, pageMediaList, lazyRef);
    if (isLoaded && backgroundImage) {
      prop.style = prop.style || {};
      prop.style.backgroundImage = backgroundImage;
    }
  } else {
    applyBackgroundImage(prop, props, null, pageMediaList);
  }

  applyAnimation(prop, props, null, false);
  prop["data-ph-site"] = "true";
  return React.createElement("main", prop);
}
