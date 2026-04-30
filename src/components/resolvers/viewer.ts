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
import { Audio } from "../Audio";
import { Background } from "../Background";
import { Button } from "../Button";
import { Container } from "../Container";
import { Data } from "../Data";
import { Embed } from "../Embed";
import { Footer } from "../Footer";
import { Form } from "../Form";
import { FormElement, OnlyFormElement } from "../FormElement";
import { Header } from "../Header";
import { Icon } from "../Icon";
import { Image } from "../Image";
import { Link } from "../Link";
import { Map } from "../Map";
import { MapPoint } from "../MapPoint";
import { Text } from "../Text";
import { Video } from "../Video";
import { withConditionalVisibility } from "../../utils/conditions/withConditionalVisibility";

const cv = withConditionalVisibility;

export const viewerResolver = {
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
};
