/** Pure body for Data types. NO `@craftjs/core`. */
import type { ReactNode } from "react";
import type { ContainerProps } from "../Container/Container.body";
import type { DataSource } from "../../utils/data/useDataSource";

export interface DataProps extends ContainerProps {
  dataSource?: DataSource;
  livePreview?: boolean;
  /**
   * Pre-split empty-state children (`custom.dataRole: "empty"`), injected by the
   * render walker / editor wrapper — NOT authored directly on props. Rendered
   * by `useDataSource` when the binding is definitively empty.
   */
  emptyState?: ReactNode;
}
