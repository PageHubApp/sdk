/**
 * Built-in canvas components — single source of truth for:
 * - CraftJS resolver (React implementations)
 * - defineComponent() definitions (editor toolbox, static HTML, viewer processing)
 *
 * Consumers: {@link ./index.ts}, {@link ./editor.tsx}, {@link ./viewer.tsx}, {@link ./static-renderer.ts}
 */

import type { ComponentType } from "react";

import { Audio } from "./components/Audio";
import { Background } from "./components/Background";
import { Button } from "./components/Button";
import { ButtonList } from "./components/ButtonList";
import { Nav } from "./components/Nav";
import { Container } from "./components/Container";
import { ContainerGroup } from "./components/ContainerGroup";
import { Divider } from "./components/Divider";
import { Embed } from "./components/Embed";
import { Footer } from "./components/Footer";
import { Form } from "./components/Form";
import { FormElement } from "./components/FormElement";
import { Header } from "./components/Header";
import { Image } from "./components/Image";
import { ImageList } from "./components/ImageList";
import { Map } from "./components/Map";
import { MapPoint } from "./components/MapPoint";
import { Modal } from "./components/Modal";
import { Spacer } from "./components/Spacer";
import { Text } from "./components/Text";
import { Video } from "./components/Video";
import { SavedComponentLoader } from "./chrome/Viewport/Toolbox/savedComponents";

import {
  AudioDef,
  BackgroundDef,
  ButtonDef,
  ButtonListDef,
  ContainerDef,
  ContainerGroupDef,
  DividerDef,
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
  TextDef,
  VideoDef,
} from "./components/definitions";

import type { ResolvedComponentDef } from "./define";

/** Craft / viewer resolver: `resolvedName` from serialized nodes → React component. */
export type BuiltInCraftResolver = Record<string, ComponentType<any>>;

export const DEFAULT_CRAFT_RESOLVER: BuiltInCraftResolver = {
  Audio,
  Background,
  Button,
  ButtonList,
  Container,
  ContainerGroup,
  Divider,
  Embed,
  Footer,
  Form,
  FormElement,
  Header,
  Image,
  ImageList,
  Map,
  MapPoint,
  Modal,
  Nav,
  Spacer,
  Text,
  Video,
  SavedComponentLoader,
};

/**
 * Built-in `defineComponent` definitions, in toolbox / static-render order.
 * Keep in sync with {@link ./components/definitions.ts}.
 */
export const BUILTIN_COMPONENT_DEFS: ResolvedComponentDef[] = [
  AudioDef,
  BackgroundDef,
  ButtonDef,
  ButtonListDef,
  ContainerDef,
  ContainerGroupDef,
  DividerDef,
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
  TextDef,
  VideoDef,
];
