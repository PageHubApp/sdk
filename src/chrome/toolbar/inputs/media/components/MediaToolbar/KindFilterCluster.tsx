import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbFilter } from "react-icons/tb";
import { ToolbarDropdown } from "../../../../ToolbarDropdown";
import { MEDIA_KIND_LABELS, type MediaItem, type MediaKind } from "../../utils/media-helpers";
import { TOOL_CLUSTER_CLASS } from "./styles";

interface KindFilterClusterProps {
  mediaList: MediaItem[];
  kindCounts: Record<MediaKind, number>;
  onChange: (kind: MediaKind | "all") => void;
}

function KindOptions({
  total,
  counts,
}: {
  total: number;
  counts: Record<MediaKind, number>;
}) {
  return (
    <>
      <option value="all">All types ({total})</option>
      <option value="image">Image ({counts.image || 0})</option>
      <option value="video">Video ({counts.video || 0})</option>
      <option value="audio">Audio ({counts.audio || 0})</option>
      <option value="pdf">PDF ({counts.pdf || 0})</option>
      <option value="archive">Archive ({counts.archive || 0})</option>
      <option value="other">
        {MEDIA_KIND_LABELS.other} ({counts.other || 0})
      </option>
    </>
  );
}

export function KindFilterCluster({ mediaList, kindCounts, onChange }: KindFilterClusterProps) {
  return (
    <div className={`${TOOL_CLUSTER_CLASS} order-2 min-w-0`}>
      <div className="hidden h-full min-h-0 items-stretch md:flex">
        <ToolbarDropdown
          wrap="control"
          propKey="media-kind-filter"
          tooltipId={PAGEHUB_RTT_GLOBAL_ID}
          tooltipContent="Filter by media type"
          placeholder={<TbFilter className="size-4" />}
          value=""
          onChange={(val: string) => onChange(val as MediaKind | "all")}
        >
          <KindOptions total={mediaList.length} counts={kindCounts} />
        </ToolbarDropdown>
      </div>
      <div className="flex h-full min-h-0 items-stretch md:hidden">
        <ToolbarDropdown
          wrap="control"
          propKey="media-kind-filter-compact"
          tooltipId={PAGEHUB_RTT_GLOBAL_ID}
          tooltipContent="Filter by media type"
          placeholder={<TbFilter className="size-4" />}
          value=""
          onChange={(val: string) => onChange(val as MediaKind | "all")}
        >
          <KindOptions total={mediaList.length} counts={kindCounts} />
        </ToolbarDropdown>
      </div>
    </div>
  );
}
