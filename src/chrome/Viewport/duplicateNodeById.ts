import { addHandler, buildClonedTree, saveHandler } from "./lib";

/**
 * Duplicate the subtree rooted at `id` (same sequence as DuplicateNodeButton).
 */
export async function duplicateNodeById({
  query,
  actions,
  setProp,
  id,
}: {
  query: any;
  actions: any;
  setProp: any;
  id: string;
}): Promise<void> {
  await saveHandler({ query, id, component: null, actions });
  const getCloneTree = (tree: any) => buildClonedTree({ tree, query, setProp, createLinks: false });
  await new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      addHandler({
        actions,
        query,
        getCloneTree,
        id,
        setProp,
      });
      resolve();
    });
  });
}
