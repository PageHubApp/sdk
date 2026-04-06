import { useEditor } from "@craftjs/core";
import { resolveIcon } from "utils/iconResolver";

export const ClientIconLoader = ({ value }) => {
  const { query } = useEditor();
  return resolveIcon(value, query);
};

export default ClientIconLoader;
