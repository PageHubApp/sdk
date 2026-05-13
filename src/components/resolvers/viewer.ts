/**
 * Viewer resolver — lightweight component map for published/view pages.
 *
 * Imports **only** the per-component `.render.tsx` modules (zero editor
 * chrome, no toolbar / node-controller imports reach the viewer bundle).
 *
 * Heavy / optional components (Audio, Data, Embed, Form, FormElement, Map,
 * MapPoint, Video) are `React.lazy`-loaded so Webpack emits a separate chunk
 * per component. `RenderTree` wraps its child in a `<React.Suspense>`
 * boundary, so lazy resolution is transparent — pages that don't use a
 * component never download its chunk.
 *
 * Always-on core (Container, Text, Image, Link, Button, Icon, Background,
 * Footer, Header) ships eagerly because every page renders these — lazying
 * them would just add Suspense round-trips with no payload savings.
 *
 * Every component is wrapped with conditional visibility so node-level
 * `conditions` / `conditionGroups` evaluate in any CraftJS context
 * (editor, viewer, /view/, /static/).
 */
import * as React from "react";
import { BackgroundRender } from "../Background/Background.render";
import { ButtonRender } from "../Button/Button.render";
import { ContainerRender } from "../Container/Container.render";
import { FooterRender } from "../Footer/Footer.render";
import { HeaderRender } from "../Header/Header.render";
import { IconRender } from "../Icon/Icon.render";
import { ImageRender } from "../Image/Image.render";
import { LinkRender } from "../Link/Link.render";
import { TextRender } from "../Text/Text.render";
import { withConditionalVisibility } from "../../utils/conditions/withConditionalVisibility";

const cv = withConditionalVisibility;

// Lazy-loaded optional components. Webpack emits a separate chunk per
// import() so pages without these nodes never fetch their JS.
const AudioRender = React.lazy(() =>
  import("../Audio/Audio.render").then(m => ({ default: m.AudioRender }))
);
const DataRender = React.lazy(() =>
  import("../Data/Data.render").then(m => ({ default: m.DataRender }))
);
const EmbedRender = React.lazy(() =>
  import("../Embed/Embed.render").then(m => ({ default: m.EmbedRender }))
);
const FormRender = React.lazy(() =>
  import("../Form/Form.render").then(m => ({ default: m.FormRender }))
);
const FormElementRender = React.lazy(() =>
  import("../FormElement/FormElement.render").then(m => ({ default: m.FormElementRender }))
);
const MapRender = React.lazy(() =>
  import("../Map/Map.render").then(m => ({ default: m.MapRender }))
);
const MapPointRender = React.lazy(() =>
  import("../MapPoint/MapPoint.render").then(m => ({ default: m.MapPointRender }))
);
const VideoRender = React.lazy(() =>
  import("../Video/Video.render").then(m => ({ default: m.VideoRender }))
);

export const viewerResolver = {
  // Lazy (optional)
  Audio: cv(AudioRender as any),
  Data: cv(DataRender as any),
  Embed: cv(EmbedRender as any),
  Form: cv(FormRender as any),
  FormElement: cv(FormElementRender as any),
  OnlyFormElement: cv(FormElementRender as any),
  Map: cv(MapRender as any),
  MapPoint: cv(MapPointRender as any),
  Video: cv(VideoRender as any),

  // Eager (always-on core)
  Automatic: cv(ContainerRender as any),
  Background: BackgroundRender,
  Button: cv(ButtonRender as any),
  Container: cv(ContainerRender as any),
  Footer: cv(FooterRender as any),
  Header: cv(HeaderRender as any),
  Icon: cv(IconRender as any),
  Image: cv(ImageRender as any),
  Link: cv(LinkRender as any),
  Text: cv(TextRender as any),
};
