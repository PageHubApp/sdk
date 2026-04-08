import { useEditor } from "@craftjs/core";
import { resolveIcon } from "utils/iconResolver";

const ClientIconLoader = ({ value }) => {
  const { query } = useEditor();
  return resolveIcon(value, query);
};

export default ClientIconLoader;
