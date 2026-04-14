/**
 * Viewer resolver — lightweight component map for published/view pages.
 *
 * Imports ONLY the pure rendering components (no .craft.tsx files).
 * This means zero editor chrome, toolbar, or node controller imports
 * reach the viewer bundle.
 */
import { Accordion } from "../Accordion";
import { Audio } from "../Audio";
import { Background } from "../Background";
import { Button } from "../Button";
import { ButtonList } from "../ButtonList";
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

export const viewerResolver = {
  Accordion,
  Audio,
  Background,
  Button,
  ButtonList,
  CookieConsent,
  Container,
  ContainerGroup,
  Divider,
  Dropdown,
  Embed,
  Footer,
  Form,
  FormElement,
  OnlyFormElement,
  Header,
  Image,
  ImageList,
  Map,
  MapPoint,
  Modal,
  Nav,
  Spacer,
  Tabs,
  Text,
  Video,
};
