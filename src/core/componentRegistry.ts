/**
 * Built-in canvas components — single source of truth for:
 * - CraftJS resolver (React implementations)
 * - defineComponent() definitions live in {@link ./builtinComponentDefs.ts} (editor toolbox, static HTML, viewer)
 *
 * Consumers: {@link ./index.ts}, {@link ./editor.tsx}, {@link ./viewer.tsx}, {@link ./static-renderer.ts}
 */

import type { ComponentType } from "react";

import { Accordion } from "../components/Accordion";
import { Audio } from "../components/Audio";
import { Background } from "../components/Background";
import { Button } from "../components/Button";
import { ButtonList } from "../components/ButtonList";
import { Nav } from "../components/Nav";
import { CookieConsent } from "../components/CookieConsent";
import { ConditionalContainer } from "../components/ConditionalContainer";
import { Container } from "../components/Container";
import { ContainerGroup } from "../components/ContainerGroup";
import { Data } from "../components/Data";
import { Divider } from "../components/Divider";
import { Dropdown } from "../components/Dropdown";
import { Embed } from "../components/Embed";
import { Footer } from "../components/Footer";
import { Form } from "../components/Form";
import { FormElement, OnlyFormElement } from "../components/FormElement";
import { Grid } from "../components/Grid";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { Image } from "../components/Image";
import { ImageList } from "../components/ImageList";
import { Link } from "../components/Link";
import { List } from "../components/List";
import { ListItem } from "../components/ListItem";
import { Map } from "../components/Map";
import { MapPoint } from "../components/MapPoint";
import { Modal } from "../components/Modal";
import { Spacer } from "../components/Spacer";
import { Table } from "../components/Table";
import { TableSection } from "../components/TableSection";
import { TableRow } from "../components/TableRow";
import { TableCell } from "../components/TableCell";
import { Tabs } from "../components/Tabs";
import { Text } from "../components/Text";
import { Video } from "../components/Video";
import { SavedComponentLoader } from "../chrome/viewport/toolbox/savedComponents";

import { withConditionalVisibility } from "../utils/conditions/withConditionalVisibility";

export { BUILTIN_COMPONENT_DEFS, getBuiltinComponentDef } from "./builtinComponentDefs";

/** Craft / viewer resolver: `resolvedName` from serialized nodes → React component. */
export type BuiltInCraftResolver = Record<string, ComponentType<any>>;

/** Wrap every component with conditional visibility so it works in any CraftJS context. */
const cv = withConditionalVisibility;

export const DEFAULT_CRAFT_RESOLVER: BuiltInCraftResolver = {
  Accordion: cv(Accordion),
  Audio: cv(Audio),
  Automatic: cv(Container),
  Background,
  Button: cv(Button),
  ButtonList: cv(ButtonList),
  ConditionalContainer: cv(ConditionalContainer),
  CookieConsent: cv(CookieConsent),
  Container: cv(Container),
  ContainerGroup: cv(ContainerGroup),
  Data: cv(Data),
  Divider: cv(Divider),
  Dropdown: cv(Dropdown),
  Embed: cv(Embed),
  Footer: cv(Footer),
  Form: cv(Form),
  FormElement: cv(FormElement),
  Grid: cv(Grid),
  OnlyFormElement: cv(OnlyFormElement),
  Header: cv(Header),
  Icon: cv(Icon),
  Image: cv(Image),
  ImageList: cv(ImageList),
  Link: cv(Link),
  List: cv(List),
  ListItem: cv(ListItem),
  Map: cv(Map),
  MapPoint: cv(MapPoint),
  Modal: cv(Modal),
  Nav: cv(Nav),
  Spacer: cv(Spacer),
  Tabs: cv(Tabs),
  Table: cv(Table),
  TableSection: cv(TableSection),
  TableRow: cv(TableRow),
  TableCell: cv(TableCell),
  Text: cv(Text),
  Video: cv(Video),
  SavedComponentLoader,
};

// ─── Spatial layout hints ──────────────────────────────────────────────────
// Opt-in per-component overrides for the 2D drag algorithm. Defaults — null /
// false — fall back to DOM-derived flex direction and normal cross-axis zones.

const SPATIAL_MAIN_AXIS_BY_NAME: Record<string, "row" | "column"> = {
  Grid: "row",
  TableRow: "row",
  TableSection: "column",
  Table: "column",
};

const SUPPRESS_CROSS_AXIS_ALIGN_BY_NAME: Record<string, true> = {
  Table: true,
  TableSection: true,
  TableRow: true,
  TableCell: true,
};

export function getSpatialMainAxisForComponentName(
  name: string | undefined
): "row" | "column" | null {
  if (!name) return null;
  return SPATIAL_MAIN_AXIS_BY_NAME[name] ?? null;
}

export function getSuppressCrossAxisAlignForComponentName(
  name: string | undefined
): boolean {
  if (!name) return false;
  return SUPPRESS_CROSS_AXIS_ALIGN_BY_NAME[name] ?? false;
}
