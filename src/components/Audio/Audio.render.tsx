/**
 * Walker entry — calls the same body the Craft assembler uses. No Craft.
 */
import { renderAudioBody, type AudioProps } from "./Audio.body";
import { useTreeRoot, useWalkerNode } from "../../render/react/contexts";
import { makeWalkerCtx } from "../../render/react/RenderCtx";

export const AudioRender = (incomingProps: AudioProps) => {
  const props: AudioProps = {
    controls: true,
    autoPlay: false,
    loop: false,
    ...incomingProps,
  };
  const tree = useTreeRoot();
  const walker = useWalkerNode();
  const ctx = makeWalkerCtx({
    id: walker?.id ?? "",
    isCanvas: walker?.isCanvas ?? false,
    hasChildNodes: (walker?.childIds?.length ?? 0) > 0,
    displayName: walker?.displayName ?? "Audio",
    rootProps: tree?.rootProps ?? {},
    pageMedia: tree?.pageMedia ?? null,
    pageIndex: tree?.pageIndex ?? {},
  });
  return renderAudioBody(props, ctx);
};
