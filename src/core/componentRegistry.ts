/**
 * Built-in canvas components — single source of truth for:
 * - CraftJS resolver (React implementations)
 * - defineComponent() definitions (editor toolbox, static HTML, viewer processing)
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
import { Divider } from "../components/Divider";
import { Dropdown } from "../components/Dropdown";
import { Embed } from "../components/Embed";
import { Footer } from "../components/Footer";
import { Form } from "../components/Form";
import { FormElement, OnlyFormElement } from "../components/FormElement";
import { Grid } from "../components/Grid";
import { Header } from "../components/Header";
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

import {
  AccordionDef,
  AudioDef,
  AutomaticDef,
  BackgroundDef,
  ButtonDef,
  ButtonListDef,
  ConditionalContainerDef,
  CookieConsentDef,
  ContainerDef,
  ContainerGroupDef,
  DividerDef,
  DropdownDef,
  EmbedDef,
  FormDef,
  FormElementDef,
  GridDef,
  ImageDef,
  ImageListDef,
  LinkDef,
  ListDef,
  ListItemDef,
  MapDef,
  MapPointDef,
  ModalDef,
  NavDef,
  SpacerDef,
  TabsDef,
  TableDef,
  TableSectionDef,
  TableRowDef,
  TableCellDef,
  TextDef,
  VideoDef,
} from "../components/definitions";

import type { ResolvedComponentDef } from "../define";
import { withConditionalVisibility } from "../utils/conditions/withConditionalVisibility";

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
  Divider: cv(Divider),
  Dropdown: cv(Dropdown),
  Embed: cv(Embed),
  Footer: cv(Footer),
  Form: cv(Form),
  FormElement: cv(FormElement),
  Grid: cv(Grid),
  OnlyFormElement: cv(OnlyFormElement),
  Header: cv(Header),
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

/**
 * Built-in `defineComponent` definitions, in toolbox / static-render order.
 * Keep in sync with {@link ./components/definitions.ts}.
 */
export const BUILTIN_COMPONENT_DEFS: ResolvedComponentDef[] = [
  // Layout — structural bones (Section/Row/Column come from ContainerDef presets)
  AutomaticDef, // Smart container — morphs into Content/Card based on drop location
  ContainerDef,
  ConditionalContainerDef,
  ContainerGroupDef,
  GridDef,
  BackgroundDef, // __internal category, hidden from toolbox
  // Content — what goes inside layouts (most-used first)
  TextDef,
  ImageDef,
  ImageListDef,
  ButtonDef,
  ButtonListDef,
  LinkDef,
  ListDef,
  ListItemDef,
  TableDef,
  TableSectionDef,
  TableRowDef,
  TableCellDef,
  DividerDef,
  SpacerDef,
  // Forms — common enough to be near the top
  FormDef,
  FormElementDef,
  // Interactive
  AccordionDef,
  TabsDef,
  DropdownDef,
  ModalDef,
  CookieConsentDef,
  // Media — embeds, video, audio, maps
  VideoDef,
  AudioDef,
  EmbedDef,
  MapDef,
  MapPointDef,
  // Navigation
  NavDef,
];

/** Lookup built-in `defineComponent` descriptor by PascalCase name (e.g. `"Button"`). */
export function getBuiltinComponentDef(name: string): ResolvedComponentDef | undefined {
  if (!name) return undefined;
  return BUILTIN_COMPONENT_DEFS.find(d => d.name === name);
}

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
