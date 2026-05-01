/**
 * Built-in canvas components — single source of truth for:
 * - CraftJS resolver (React implementations)
 * - defineComponent() definitions live in {@link ./builtinComponentDefs.ts} (editor toolbox, static HTML, viewer)
 *
 * Consumers: {@link ./index.ts}, {@link ./editor.tsx}, {@link ./viewer.tsx}, {@link ./static-renderer.ts}
 */

import type { ComponentType } from "react";

import { Audio } from "../components/Audio/Audio";
import { Background } from "../components/Background/Background";
import { Button } from "../components/Button/Button";
import { Container } from "../components/Container/Container";
import { Data } from "../components/Data/Data";
import { Embed } from "../components/Embed/Embed";
import { Footer } from "../components/Footer/Footer";
import { Form } from "../components/Form/Form";
import { FormElement, OnlyFormElement } from "../components/FormElement/FormElement";
import { Header } from "../components/Header/Header";
import { Icon } from "../components/Icon/Icon";
import { Image } from "../components/Image/Image";
import { Link } from "../components/Link/Link";
import { Map } from "../components/Map/Map";
import { MapPoint } from "../components/MapPoint/MapPoint";
import { Text } from "../components/Text/Text";
import { Video } from "../components/Video/Video";
import { SavedComponentLoader } from "./savedComponents";

import { withConditionalVisibility } from "../utils/conditions/withConditionalVisibility";

export { BUILTIN_COMPONENT_DEFS } from "./builtinComponentDefs";
export { getBuiltinComponentDef } from "./builtinDefsLookup";

/** Craft / viewer resolver: `resolvedName` from serialized nodes → React component. */
export type BuiltInCraftResolver = Record<string, ComponentType<any>>;

/** Wrap every component with conditional visibility so it works in any CraftJS context. */
const cv = withConditionalVisibility;

export const DEFAULT_CRAFT_RESOLVER: BuiltInCraftResolver = {
  Audio: cv(Audio),
  Automatic: cv(Container),
  Background,
  Button: cv(Button),
  Container: cv(Container),
  Data: cv(Data),
  Embed: cv(Embed),
  Footer: cv(Footer),
  Form: cv(Form),
  FormElement: cv(FormElement),
  OnlyFormElement: cv(OnlyFormElement),
  Header: cv(Header),
  Icon: cv(Icon),
  Image: cv(Image),
  Link: cv(Link),
  Map: cv(Map),
  MapPoint: cv(MapPoint),
  Text: cv(Text),
  Video: cv(Video),
  SavedComponentLoader,
};

export {
  getSpatialMainAxisForComponentName,
  getSuppressCrossAxisAlignForComponentName,
} from "./builtinDefsLookup";
