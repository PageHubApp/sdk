/**
 * Viewer resolver — lightweight component map for published/view pages.
 *
 * Imports ONLY the pure rendering components (no .craft.tsx files).
 * This means zero editor chrome, toolbar, or node controller imports
 * reach the viewer bundle.
 *
 * Every component is wrapped with conditional visibility so conditions
 * evaluate in any CraftJS context (editor, viewer, /view/, /static/).
 */
import { Accordion } from "../Accordion";
import { Audio } from "../Audio";
import { Background } from "../Background";
import { Button } from "../Button";
import { ButtonList } from "../ButtonList";
import { ConditionalContainer } from "../ConditionalContainer";
import { CookieConsent } from "../CookieConsent";
import { Container } from "../Container";
import { ContainerGroup } from "../ContainerGroup";
import { Divider } from "../Divider";
import { Dropdown } from "../Dropdown";
import { Embed } from "../Embed";
import { Footer } from "../Footer";
import { Form } from "../Form";
import { FormElement, OnlyFormElement } from "../FormElement";
import { Header } from "../Header";
import { Image } from "../Image";
import { ImageList } from "../ImageList";
import { Map } from "../Map";
import { Modal } from "../Modal";
import { MapPoint } from "../MapPoint";
import { Nav } from "../Nav";
import { Spacer } from "../Spacer";
import { Tabs } from "../Tabs";
import { Text } from "../Text";
import { Video } from "../Video";
import { withConditionalVisibility } from "../../utils/conditions/withConditionalVisibility";

const cv = withConditionalVisibility;

export const viewerResolver = {
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
};
