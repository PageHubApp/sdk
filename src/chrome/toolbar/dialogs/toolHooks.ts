import { useEditor, useNode } from "@craftjs/core";
import { getRect } from "../../viewport/useRect";
import { useEffect } from "react";

import { ViewSelectionAtom } from "../Label";
import { ViewAtom } from "../../viewport/atoms";
import { getProp, getPropFinalValue } from "../../viewport/viewportExports";
import throttle from "lodash.throttle";
import { useAtomValue } from "@zedux/react";

export const useTypeProps = () => {
  const {
    actions: { setProp },
    nodeProps,
  } = useNode(node => ({
    nodeProps: node.data?.props || {},
  }));

  return { setProp, nodeProps };
};

export const useGetTypeProp = (
  props: { propType?: string; [k: string]: unknown } = {},
  nodeProps
) => {
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;

  if (props.propType === "class") {
    return getPropFinalValue(props, view, nodeProps, classDark).value;
  }
  return getProp(props, view, nodeProps, classDark);
};

export const useDialog = (dialog, setDialog, ref, propKey = "") => {
  const scroll = () => {
    if (!dialog.enabled || !dialog.propKey || dialog.propKey !== propKey) return;

    setDialog({ ...dialog, e: getRect(ref.current) });
  };

  useEffect(() => {
    document
      .querySelector('[data-toolbar="true"]')
      ?.addEventListener("scroll", throttle(scroll, 20));

    return () => {
      document.querySelector('[data-toolbar="true"]')?.removeEventListener("scroll", scroll);
    };
  }, [dialog.enabled, scroll]);
};

export const useGetNode = () => {
  const { id } = useNode();

  const { query } = useEditor();

  return query.node(id).get() || ({} as any);
};
