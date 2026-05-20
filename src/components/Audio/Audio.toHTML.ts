import { staticClasses, tag, ariaAttrs, handlerAttrs, type ToHTMLFn } from "../../utils/staticHtml";

export const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const audioUrl = props.src ?? props.audioUrl;
  const { title, controls = true, loop = false } = props;
  if (!audioUrl) return "";

  const cls = staticClasses(props, ctx);
  const audio = tag(
    "audio",
    {
      src: audioUrl,
      class: cls || undefined,
      controls,
      loop,
      preload: "metadata",
      style: "width: 100%",
    },
    "Your browser does not support the audio element."
  );

  return tag(
    "div",
    {
      role: "region",
      "aria-label": title || `Audio: ${audioUrl}`,
      ...ariaAttrs(props),
      ...handlerAttrs(props),
    },
    audio
  );
};
