/** Unified `link` action editor. */
import type { LinkAction, NodeAction } from "@/utils/action";
import { LinkInput } from "../LinkInput";

export function LinkSubForm({
  action,
  replace,
}: {
  action: LinkAction;
  replace: (next: NodeAction) => void;
}) {
  return <LinkInput action={action} onChange={replace} />;
}
