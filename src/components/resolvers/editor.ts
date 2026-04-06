/**
 * Editor resolver — full component map with editor chrome attached.
 *
 * Each .craft.tsx file imports its component, attaches the full .craft
 * config (toolbar, tools, related), and re-exports. This pulls in the
 * entire editor chrome tree — only used by the editor/build page.
 */
import { Audio } from "../Audio.craft";
import { Background } from "../Background.craft";
import { Button } from "../Button.craft";
import { ButtonList } from "../ButtonList.craft";
import { Container } from "../Container.craft";
import { ContainerGroup } from "../ContainerGroup.craft";
import { Divider } from "../Divider.craft";
import { Embed } from "../Embed.craft";
import { Footer } from "../Footer";
import { Form } from "../Form.craft";
import { FormElement, OnlyFormElement } from "../FormElement.craft";
import { Header } from "../Header";
import { Image } from "../Image.craft";
import { ImageList } from "../ImageList.craft";
import { Map } from "../Map.craft";
import { Modal } from "../Modal.craft";
import { MapPoint } from "../MapPoint.craft";
import { Nav } from "../Nav.craft";
import { Spacer } from "../Spacer.craft";
import { Text } from "../Text.craft";
import { Video } from "../Video.craft";

export const editorResolver = {
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
  OnlyFormElement,
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
};
