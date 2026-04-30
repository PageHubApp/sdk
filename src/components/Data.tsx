import { useContainerRender, type ContainerProps } from "./Container";
import { useDataSource, type DataSource } from "../utils/useDataSource";

/**
 * Data-aware container. Same DOM output as {@link Container} — one element,
 * no extra wrapper — but owns the `dataSource` binding: connector fetch,
 * scope/splitBy nesting, URL refetch, and per-item repeater rendering.
 *
 * Use `Data` on every block/template section whose children repeat per item
 * (Stripe product lists, customer orders, nested image galleries, etc.).
 * Plain layout containers stay on {@link Container}.
 */
export interface DataProps extends ContainerProps {
  dataSource?: DataSource;
  /** Editor-only: show read-only clones of remaining items alongside the editable first item. Default true. */
  livePreview?: boolean;
}

export const Data = (incomingProps: Partial<DataProps>) => {
  const { renderChildren } = useDataSource(incomingProps.dataSource, {
    livePreview: incomingProps.livePreview,
  });
  return useContainerRender(incomingProps, {
    renderChildren,
  });
};

Data.craft = {
  displayName: "Data",
  rules: {
    canDrag: () => true,
    canDelete: () => true,
  },
};
