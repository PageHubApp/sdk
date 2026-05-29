/**
 * Canonical name → render-component map. Single source of truth for the
 * SDK's built-in component list, consumed by both resolver maps:
 *
 *   - `viewerResolver` (CraftJS contexts: editor + disabled `<Editor>` viewers)
 *     wraps every entry in `withConditionalVisibility` except those in
 *     `SKIP_CONDITIONAL_VISIBILITY`. See `./viewer.ts`.
 *
 *   - `uiResolver` (Craft-free `RenderTree` walker) uses the map raw because
 *     `RenderTree` evaluates `conditionGroups` itself; double-wrapping would
 *     re-run conditions per node. See `../../render/resolver.ts`.
 *
 * This module is the ONE place to add a new component to the SDK runtime —
 * both maps pick it up automatically. It must not import `@craftjs/core` so
 * it stays usable from the Craft-free render bundle.
 *
 * Heavy/optional components are `React.lazy`'d here so each `import()` is
 * created once and shared by both maps. Webpack still emits one chunk per
 * lazy entry; pages that don't render a given component never fetch it.
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

const AudioRender = React.lazy(() =>
  import("../Audio/Audio.render").then((m) => ({ default: m.AudioRender }))
);
const DataRender = React.lazy(() =>
  import("../Data/Data.render").then((m) => ({ default: m.DataRender }))
);
const EmbedRender = React.lazy(() =>
  import("../Embed/Embed.render").then((m) => ({ default: m.EmbedRender }))
);
const FormRender = React.lazy(() =>
  import("../Form/Form.render").then((m) => ({ default: m.FormRender }))
);
const FormElementRender = React.lazy(() =>
  import("../FormElement/FormElement.render").then((m) => ({
    default: m.FormElementRender,
  }))
);
const MapRender = React.lazy(() =>
  import("../Map/Map.render").then((m) => ({ default: m.MapRender }))
);
const MapPointRender = React.lazy(() =>
  import("../MapPoint/MapPoint.render").then((m) => ({
    default: m.MapPointRender,
  }))
);
const VideoRender = React.lazy(() =>
  import("../Video/Video.render").then((m) => ({ default: m.VideoRender }))
);

export interface RenderMap {
  [name: string]: React.ComponentType<any>;
}

export const renderMap: RenderMap = {
  // Eager — every page renders these.
  Automatic: ContainerRender,
  Background: BackgroundRender,
  Button: ButtonRender,
  Container: ContainerRender,
  Footer: FooterRender,
  Header: HeaderRender,
  Icon: IconRender,
  Image: ImageRender,
  Link: LinkRender,
  Text: TextRender,

  // Lazy — Webpack emits a chunk per `import()`. Pages without these node
  // types never download them.
  Audio: AudioRender,
  Data: DataRender,
  Embed: EmbedRender,
  Form: FormRender,
  FormElement: FormElementRender,
  OnlyFormElement: FormElementRender,
  Map: MapRender,
  MapPoint: MapPointRender,
  Video: VideoRender,
};

/**
 * Names that must NOT be wrapped with `withConditionalVisibility`. Background
 * renders a root host element and has no `conditions`/`conditionGroups`
 * surface; wrapping it would force CraftJS hook calls in a non-node context.
 */
export const SKIP_CONDITIONAL_VISIBILITY: ReadonlySet<string> = new Set([
  "Background",
]);
