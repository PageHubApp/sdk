/**
 * Craft-free resolver map — what each `node.type.resolvedName` from a
 * serialized NodeMap renders to. Mirrors the shape of
 * `viewerResolver` in `components/resolvers/viewer.ts`, but points at
 * `*Render.tsx` modules that don't import `@craftjs/core`.
 */
import { AudioRender } from "../components/Audio/Audio.render";
import { ButtonRender } from "../components/Button/Button.render";
import { BackgroundRender } from "../components/Background/Background.render";
import { ContainerRender } from "../components/Container/Container.render";
import { DataRender } from "../components/Data/Data.render";
import { FooterRender } from "../components/Footer/Footer.render";
import { FormRender } from "../components/Form/Form.render";
import { HeaderRender } from "../components/Header/Header.render";
import { MapRender } from "../components/Map/Map.render";
import { EmbedRender } from "../components/Embed/Embed.render";
import { FormElementRender } from "../components/FormElement/FormElement.render";
import { IconRender } from "../components/Icon/Icon.render";
import { ImageRender } from "../components/Image/Image.render";
import { LinkRender } from "../components/Link/Link.render";
import { MapPointRender } from "../components/MapPoint/MapPoint.render";
import { TextRender } from "../components/Text/Text.render";
import { VideoRender } from "../components/Video/Video.render";

export interface UiResolver {
  [resolvedName: string]: React.ComponentType<any>;
}

export const uiResolver: UiResolver = {
  Audio: AudioRender,
  Background: BackgroundRender,
  Button: ButtonRender,
  Container: ContainerRender,
  Automatic: ContainerRender,
  Data: DataRender,
  Embed: EmbedRender,
  Footer: FooterRender,
  Form: FormRender,
  FormElement: FormElementRender,
  OnlyFormElement: FormElementRender,
  Header: HeaderRender,
  Icon: IconRender,
  Image: ImageRender,
  Link: LinkRender,
  Map: MapRender,
  MapPoint: MapPointRender,
  Text: TextRender,
  Video: VideoRender,
};
