import { useEditor } from "@craftjs/core";
import { useResolvedIcon } from "../../../utils/icons/iconResolver";

const ClientIconLoader = ({ value }) => {
  const { query } = useEditor();
  return useResolvedIcon(value, query);
};

export default ClientIconLoader;
