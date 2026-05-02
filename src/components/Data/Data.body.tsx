/** Pure body for Data types. NO `@craftjs/core`. */
import type { ContainerProps } from "../Container/Container.body";
import type { DataSource } from "../../utils/data/useDataSource";

export interface DataProps extends ContainerProps {
  dataSource?: DataSource;
  livePreview?: boolean;
}
