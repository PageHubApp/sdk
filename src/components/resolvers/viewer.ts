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
import { Audio } from "../Audio/Audio";
import { Background } from "../Background/Background";
import { Button } from "../Button/Button";
import { Container } from "../Container/Container";
import { Data } from "../Data/Data";
import { Embed } from "../Embed/Embed";
import { Footer } from "../Footer/Footer";
import { Form } from "../Form/Form";
import { FormElement, OnlyFormElement } from "../FormElement/FormElement";
import { Header } from "../Header/Header";
import { Icon } from "../Icon/Icon";
import { Image } from "../Image/Image";
import { Link } from "../Link/Link";
import { Map } from "../Map/Map";
import { MapPoint } from "../MapPoint/MapPoint";
import { Text } from "../Text/Text";
import { Video } from "../Video/Video";
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
