import { useEditor } from "@craftjs/core";
import { useResolvedIcon } from "../../../utils/icons/iconResolver";
import { extractRootDataFromQuery } from "../../../utils/page/pageManagement";
import { useMemo } from "react";

const ClientIconLoader = ({ value }) => {
  const { query } = useEditor();
  const { pageMedia } = useMemo(() => extractRootDataFromQuery(query), [query]);
  return useResolvedIcon(value, pageMedia);
};

export default ClientIconLoader;
