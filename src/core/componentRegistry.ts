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
import { Header } from "../components/Header";
import { Image } from "../components/Image";
import { ImageList } from "../components/ImageList";
import { Map } from "../components/Map";
import { MapPoint } from "../components/MapPoint";
import { Modal } from "../components/Modal";
import { Spacer } from "../components/Spacer";
import { Tabs } from "../components/Tabs";
import { Text } from "../components/Text";
import { Video } from "../components/Video";
import { SavedComponentLoader } from "../chrome/viewport/toolbox/savedComponents";

import {
  AccordionDef,
  AudioDef,
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
  ImageDef,
  ImageListDef,
  MapDef,
  MapPointDef,
  ModalDef,
  NavDef,
  SpacerDef,
  TabsDef,
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
  OnlyFormElement: cv(OnlyFormElement),
  Header: cv(Header),
  Image: cv(Image),
  ImageList: cv(ImageList),
  Map: cv(Map),
  MapPoint: cv(MapPoint),
  Modal: cv(Modal),
  Nav: cv(Nav),
  Spacer: cv(Spacer),
  Tabs: cv(Tabs),
  Text: cv(Text),
  Video: cv(Video),
  SavedComponentLoader,
};

/**
 * Built-in `defineComponent` definitions, in toolbox / static-render order.
 * Keep in sync with {@link ./components/definitions.ts}.
 */
export const BUILTIN_COMPONENT_DEFS: ResolvedComponentDef[] = [
  AccordionDef,
  AudioDef,
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
  ImageDef,
  ImageListDef,
  MapDef,
  MapPointDef,
  ModalDef,
  NavDef,
  SpacerDef,
  TabsDef,
  TextDef,
  VideoDef,
];
