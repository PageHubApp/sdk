/**
 * Craft-free resolver map — what each `node.type.resolvedName` from a
 * serialized NodeMap renders to. Mirrors the shape of
 * `viewerResolver` in `components/resolvers/viewer.ts`, but points at
 * `*Render.tsx` modules that don't import `@craftjs/core`.
 *
 * Heavy/optional components (Map → Leaflet, Video → media libs, Audio,
 * Embed, Form/FormElement) use `React.lazy` so their chunks only download
 * on pages that actually render those node types. The lightweight
 * baseline (Container/Text/Image/Button/Link/Header/Footer/Icon/etc.)
 * stays eagerly imported — every viewer page needs those.
 *
 * RenderTree wraps its child in `<React.Suspense fallback={null}>` so a
 * lazy chunk in flight doesn't break SSR; viewers that include zero
 * lazy components still render synchronously with no Suspense overhead.
 */
import React from "react";
import { ButtonRender } from "../components/Button/Button.render";
import { BackgroundRender } from "../components/Background/Background.render";
import { ContainerRender } from "../components/Container/Container.render";
import { FooterRender } from "../components/Footer/Footer.render";
import { HeaderRender } from "../components/Header/Header.render";
import { IconRender } from "../components/Icon/Icon.render";
import { ImageRender } from "../components/Image/Image.render";
import { LinkRender } from "../components/Link/Link.render";
import { TextRender } from "../components/Text/Text.render";

const LazyAudioRender = React.lazy(() =>
  import("../components/Audio/Audio.render").then(m => ({ default: m.AudioRender }))
);
const LazyDataRender = React.lazy(() =>
  import("../components/Data/Data.render").then(m => ({ default: m.DataRender }))
);
const LazyEmbedRender = React.lazy(() =>
  import("../components/Embed/Embed.render").then(m => ({ default: m.EmbedRender }))
);
const LazyFormRender = React.lazy(() =>
  import("../components/Form/Form.render").then(m => ({ default: m.FormRender }))
);
const LazyFormElementRender = React.lazy(() =>
  import("../components/FormElement/FormElement.render").then(m => ({ default: m.FormElementRender }))
);
const LazyMapRender = React.lazy(() =>
  import("../components/Map/Map.render").then(m => ({ default: m.MapRender }))
);
const LazyMapPointRender = React.lazy(() =>
  import("../components/MapPoint/MapPoint.render").then(m => ({ default: m.MapPointRender }))
);
const LazyVideoRender = React.lazy(() =>
  import("../components/Video/Video.render").then(m => ({ default: m.VideoRender }))
);

export interface UiResolver {
  [resolvedName: string]: React.ComponentType<any>;
}

export const uiResolver: UiResolver = {
  // Eager (every page renders these)
  Background: BackgroundRender,
  Button: ButtonRender,
  Container: ContainerRender,
  Automatic: ContainerRender,
  Footer: FooterRender,
  Header: HeaderRender,
  Icon: IconRender,
  Image: ImageRender,
  Link: LinkRender,
  Text: TextRender,

  // Lazy (per-page) — Webpack emits separate chunks
  Audio: LazyAudioRender,
  Data: LazyDataRender,
  Embed: LazyEmbedRender,
  Form: LazyFormRender,
  FormElement: LazyFormElementRender,
  OnlyFormElement: LazyFormElementRender,
  Map: LazyMapRender,
  MapPoint: LazyMapPointRender,
  Video: LazyVideoRender,
};
