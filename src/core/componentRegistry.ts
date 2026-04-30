/**
 * Built-in canvas components — single source of truth for:
 * - CraftJS resolver (React implementations)
 * - defineComponent() definitions live in {@link ./builtinComponentDefs.ts} (editor toolbox, static HTML, viewer)
 *
 * Consumers: {@link ./index.ts}, {@link ./editor.tsx}, {@link ./viewer.tsx}, {@link ./static-renderer.ts}
 */

import type { ComponentType } from "react";

import { Audio } from "../components/Audio";
import { Background } from "../components/Background";
import { Button } from "../components/Button";
import { ConditionalContainer } from "../components/ConditionalContainer";
import { Container } from "../components/Container";
import { ContainerGroup } from "../components/ContainerGroup";
import { Data } from "../components/Data";
import { Embed } from "../components/Embed";
import { Footer } from "../components/Footer";
import { Form } from "../components/Form";
import { FormElement, OnlyFormElement } from "../components/FormElement";
import { Grid } from "../components/Grid";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { Image } from "../components/Image";
import { Link } from "../components/Link";
import { List } from "../components/List";
import { ListItem } from "../components/ListItem";
import { Map } from "../components/Map";
import { MapPoint } from "../components/MapPoint";
import { Table } from "../components/Table";
import { TableSection } from "../components/TableSection";
import { TableRow } from "../components/TableRow";
import { TableCell } from "../components/TableCell";
import { Text } from "../components/Text";
import { Video } from "../components/Video";
import { SavedComponentLoader } from "../chrome/viewport/toolbox/savedComponents";

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
  ConditionalContainer: cv(ConditionalContainer),
  Container: cv(Container),
  ContainerGroup: cv(ContainerGroup),
  Data: cv(Data),
  Embed: cv(Embed),
  Footer: cv(Footer),
  Form: cv(Form),
  FormElement: cv(FormElement),
  Grid: cv(Grid),
  OnlyFormElement: cv(OnlyFormElement),
  Header: cv(Header),
  Icon: cv(Icon),
  Image: cv(Image),
  Link: cv(Link),
  List: cv(List),
  ListItem: cv(ListItem),
  Map: cv(Map),
  MapPoint: cv(MapPoint),
  Table: cv(Table),
  TableSection: cv(TableSection),
  TableRow: cv(TableRow),
  TableCell: cv(TableCell),
  Text: cv(Text),
  Video: cv(Video),
  SavedComponentLoader,
};

export {
  getSpatialMainAxisForComponentName,
  getSuppressCrossAxisAlignForComponentName,
} from "./builtinDefsLookup";
