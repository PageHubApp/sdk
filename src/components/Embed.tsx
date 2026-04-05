// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { TbCode } from "react-icons/tb";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { Box } from "@pagehub/ui";
import { motionIt } from "../utils/lib";
import { applyAnimation } from "../utils/tailwind/tailwind";
import { useScrollToSelected } from "./lib";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

export type EmbedService =
  | "custom"
  | "calendly"
  | "cal"
  | "stripe"
  | "gumroad"
  | "kofi"
  | "typeform"
  | "tally"
  | "jotform"
  | "mailchimp"
  | "convertkit"
  | "beehiiv"
  | "spotify"
  | "soundcloud"
  | "podcast"
  | "instagram"
  | "twitter"
  | "tiktok"
  | "crisp"
  | "intercom"
  | "tidio"
  | "google-calendar";

export const EMBED_SERVICES: Record<EmbedService, { label: string; placeholder: string; icon?: string }> = {
  custom:            { label: "Custom HTML",      placeholder: "Paste HTML, iframe, or script code..." },
  calendly:          { label: "Calendly",          placeholder: "https://calendly.com/your-name/meeting" },
  cal:               { label: "Cal.com",           placeholder: "https://cal.com/your-name/meeting" },
  stripe:            { label: "Stripe Buy Button", placeholder: "Paste your Stripe Buy Button code..." },
  gumroad:           { label: "Gumroad",           placeholder: "https://yourname.gumroad.com/l/product" },
  kofi:              { label: "Ko-fi",             placeholder: "https://ko-fi.com/yourname" },
  typeform:          { label: "Typeform",          placeholder: "https://yourname.typeform.com/to/formId" },
  tally:             { label: "Tally",             placeholder: "https://tally.so/r/formId" },
  jotform:           { label: "Jotform",           placeholder: "https://form.jotform.com/formId" },
  mailchimp:         { label: "Mailchimp",         placeholder: "Paste your Mailchimp embed code..." },
  convertkit:        { label: "Kit (ConvertKit)",  placeholder: "Paste your Kit/ConvertKit form code..." },
  beehiiv:           { label: "Beehiiv",           placeholder: "Paste your Beehiiv embed code..." },
  spotify:           { label: "Spotify",           placeholder: "https://open.spotify.com/track/... or /playlist/..." },
  soundcloud:        { label: "SoundCloud",        placeholder: "https://soundcloud.com/artist/track" },
  podcast:           { label: "Apple Podcasts",    placeholder: "https://podcasts.apple.com/podcast/..." },
  instagram:         { label: "Instagram",         placeholder: "https://www.instagram.com/p/postId/" },
  twitter:           { label: "Twitter / X",       placeholder: "https://twitter.com/user/status/tweetId" },
  tiktok:            { label: "TikTok",            placeholder: "https://www.tiktok.com/@user/video/videoId" },
  crisp:             { label: "Crisp Chat",        placeholder: "Your Crisp Website ID (e.g. abc12345-...)" },
  intercom:          { label: "Intercom",          placeholder: "Your Intercom App ID (e.g. abc123de)" },
  tidio:             { label: "Tidio",             placeholder: "Your Tidio Public Key" },
  "google-calendar": { label: "Google Calendar",   placeholder: "Your Google Calendar embed URL or calendar ID" },
};

/**
 * Generates embed HTML from a service type and URL/ID.
 * Returns null if the URL is empty or the service is "custom".
 */
export function generateEmbedCode(service: EmbedService, url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (service === "custom") return null; // custom uses code directly

  switch (service) {
    case "calendly": {
      const cleanUrl = trimmed.startsWith("http") ? trimmed : `https://calendly.com/${trimmed}`;
      return `<div class="calendly-inline-widget" data-url="${cleanUrl}" style="min-width:320px;height:700px;"></div>\n<script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js" async></script>`;
    }
    case "cal": {
      const slug = trimmed.replace(/^https?:\/\/(cal\.com\/)?/, "");
      return `<div id="cal-embed" style="width:100%;height:700px;overflow:auto;"></div>\n<script type="text/javascript">\n(function(C,A,L){let p=function(a,ar){a.q.push(ar)};let d=C.document;C.Cal=C.Cal||function(){let cal=C.Cal;if(!cal.loaded){cal.ns={};cal.q=cal.q||[];d.head.appendChild(d.createElement("script")).src=A;cal.loaded=true;}if(ar[0]==="init"){cal.ns[ar[1]]=cal.ns[ar[1]]||{q:[]};return void p(cal.ns[ar[1]],ar);}p(cal,ar);};})(window,"https://app.cal.com/embed/embed.js");\nCal("init",{origin:"https://cal.com"});\nCal("inline",{elementOrSelector:"#cal-embed",calLink:"${slug}",layout:"month_view"});\n</script>`;
    }
    case "stripe":
      // Stripe buy buttons are paste-in code, pass through
      return trimmed.includes("<") ? trimmed : null;
    case "gumroad": {
      const productUrl = trimmed.startsWith("http") ? trimmed : `https://gumroad.com/l/${trimmed}`;
      return `<a class="gumroad-button" href="${productUrl}">Buy on Gumroad</a>\n<script src="https://gumroad.com/js/gumroad.js"></script>`;
    }
    case "kofi": {
      const username = trimmed.replace(/^https?:\/\/(ko-fi\.com\/)?/, "").replace(/\/$/, "");
      return `<iframe id="kofiframe" src="https://ko-fi.com/${username}/?hidefeed=true&widget=true&embed=true" style="border:none;width:100%;padding:4px;background:#f9f9f9;" height="712" title="Ko-fi"></iframe>`;
    }
    case "typeform": {
      const formId = trimmed.match(/to\/([a-zA-Z0-9]+)/)?.[1] || trimmed;
      const fullUrl = trimmed.startsWith("http") ? trimmed : `https://form.typeform.com/to/${formId}`;
      return `<div data-tf-live="${formId}" style="width:100%;height:600px;"></div>\n<script src="//embed.typeform.com/next/embed.js"></script>`;
    }
    case "tally": {
      const tallyId = trimmed.match(/r\/([a-zA-Z0-9]+)/)?.[1] || trimmed;
      return `<iframe data-tally-src="https://tally.so/embed/${tallyId}?alignLeft=1&hideTitle=1&dynamicHeight=1" loading="lazy" width="100%" height="500" frameborder="0" marginheight="0" marginwidth="0" title="Tally Form"></iframe>\n<script>var d=document,w="https://tally.so/widgets/embed.js",v=function(){"undefined"!=typeof Tally?Tally.loadEmbeds():d.querySelectorAll("iframe[data-tally-src]:not([src])").forEach((function(e){e.src=e.dataset.tallySrc}))};if("undefined"!=typeof Tally)v();else if(d.querySelector('script[src="'+w+'"]')==null){var s=d.createElement("script");s.src=w;s.onload=v;s.onerror=v;d.body.appendChild(s);}</script>`;
    }
    case "jotform": {
      const jotId = trimmed.match(/(\d{10,})/)?.[1] || trimmed;
      const jotUrl = trimmed.startsWith("http") ? trimmed : `https://form.jotform.com/${jotId}`;
      return `<iframe src="${jotUrl}" style="min-width:100%;height:600px;border:none;" scrolling="no" title="Jotform Form"></iframe>`;
    }
    case "mailchimp":
      return trimmed.includes("<") ? trimmed : null;
    case "convertkit":
      return trimmed.includes("<") ? trimmed : null;
    case "beehiiv":
      return trimmed.includes("<") ? trimmed : null;
    case "spotify": {
      const match = trimmed.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
      if (match) {
        return `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator" width="100%" height="${match[1] === "track" ? 152 : 352}" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
      }
      return `<iframe style="border-radius:12px" src="${trimmed.replace("open.spotify.com", "open.spotify.com/embed")}" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    }
    case "soundcloud": {
      return `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(trimmed)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>`;
    }
    case "podcast": {
      const podMatch = trimmed.match(/podcasts\.apple\.com\/([a-z]{2})\/podcast\/[^/]+\/id(\d+)/);
      if (podMatch) {
        return `<iframe allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" frameborder="0" height="450" style="width:100%;overflow:hidden;border-radius:10px;" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation" src="https://embed.podcasts.apple.com/us/podcast/id${podMatch[2]}"></iframe>`;
      }
      return `<iframe allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" frameborder="0" height="450" style="width:100%;overflow:hidden;border-radius:10px;" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation" src="${trimmed}"></iframe>`;
    }
    case "instagram": {
      return `<blockquote class="instagram-media" data-instgrm-permalink="${trimmed}" data-instgrm-version="14" style="width:100%;"></blockquote>\n<script async src="//www.instagram.com/embed.js"></script>`;
    }
    case "twitter": {
      return `<blockquote class="twitter-tweet"><a href="${trimmed}"></a></blockquote>\n<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`;
    }
    case "tiktok": {
      const videoId = trimmed.match(/video\/(\d+)/)?.[1];
      if (videoId) {
        return `<blockquote class="tiktok-embed" cite="${trimmed}" data-video-id="${videoId}" style="max-width:605px;min-width:325px;"><section></section></blockquote>\n<script async src="https://www.tiktok.com/embed.js"></script>`;
      }
      return `<blockquote class="tiktok-embed" cite="${trimmed}" style="max-width:605px;min-width:325px;"><section></section></blockquote>\n<script async src="https://www.tiktok.com/embed.js"></script>`;
    }
    case "crisp": {
      return `<script type="text/javascript">window.$crisp=[];window.CRISP_WEBSITE_ID="${trimmed}";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();</script>`;
    }
    case "intercom": {
      return `<script>(function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/${trimmed}';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};l();}})();window.Intercom('boot',{api_base:"https://api-iam.intercom.io",app_id:"${trimmed}"});</script>`;
    }
    case "tidio": {
      return `<script src="//code.tidio.co/${trimmed}.js" async></script>`;
    }
    case "google-calendar": {
      const calUrl = trimmed.startsWith("http") ? trimmed : `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(trimmed)}`;
      return `<iframe src="${calUrl}" style="border:0" width="100%" height="600" frameborder="0" scrolling="no"></iframe>`;
    }
    default:
      return null;
  }
}

export interface EmbedProps extends BaseSelectorProps {
  service?: EmbedService;
  url?: string;
  code?: string;
  /** @deprecated Use `code` instead. Kept for backward compatibility. */
  videoId?: string;
  title?: string;
}

const defaultProps: EmbedProps = {
  canDelete: true,
  canEditName: true,
  service: "custom",
};

/**
 * Resolves the final HTML to render.
 * Priority: service-generated code > `code` prop > legacy `videoId` prop.
 */
export function resolveEmbedHTML(props: EmbedProps): string {
  const { service = "custom", url, code, videoId } = props;

  // If a service is selected and URL is provided, generate the embed code
  if (service !== "custom" && url) {
    const generated = generateEmbedCode(service, url);
    if (generated) return generated;
  }

  // Fall back to manual code, then legacy videoId
  return code || videoId || "";
}

export const Embed = (props: EmbedProps) => {
  props = {
    ...defaultProps,
    ...props,
  };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { name } = useNode(node => ({
    name: node.data.custom.displayName || node.data.displayName,
  }));

  const { query, enabled } = useEditor(state => getClonedState(props, state));

  useScrollToSelected(id, enabled);


  const ref = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  props = setClonedProps(props, query);

  const embedHTML = resolveEmbedHTML(props);

  const prop: any = {
    ref: r => {
      ref.current = r;
      connect(drag(r));
    },
    className: props.className || "",
    role: "region",
    "aria-label": props.title || EMBED_SERVICES[props.service || "custom"]?.label || "Embedded content",
  };

  applyAriaProps(prop, props);

  if (embedHTML) prop.dangerouslySetInnerHTML = { __html: embedHTML };

  if (enabled) {
    if (!embedHTML) prop.children = <TbCode aria-label="Code icon" />;
    prop["data-bounding-box"] = enabled;
    prop["data-empty-state"] = !embedHTML;
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  return React.createElement(motionIt(props, Box, enabled), applyAnimation({ ...prop, key: id }, props, null, enabled));
};

Embed.craft = {
  displayName: "Embed",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
