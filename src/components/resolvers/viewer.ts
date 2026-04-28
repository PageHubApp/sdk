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
import { ButtonList } from "../ButtonList";
import { ConditionalContainer } from "../ConditionalContainer";
import { Container } from "../Container";
import { ContainerGroup } from "../ContainerGroup";
import { Data } from "../Data";
import { Divider } from "../Divider";
import { Dropdown } from "../Dropdown";
import { Embed } from "../Embed";
import { Footer } from "../Footer";
import { Form } from "../Form";
import { FormElement, OnlyFormElement } from "../FormElement";
import { Grid } from "../Grid";
import { Header } from "../Header";
import { Icon } from "../Icon";
import { Image } from "../Image";
import { ImageList } from "../ImageList";
import { Link } from "../Link";
import { List } from "../List";
import { ListItem } from "../ListItem";
import { Map } from "../Map";
import { MapPoint } from "../MapPoint";
import { Nav } from "../Nav";
import { Spacer } from "../Spacer";
import { Table } from "../Table";
import { TableSection } from "../TableSection";
import { TableRow } from "../TableRow";
import { TableCell } from "../TableCell";
import { Text } from "../Text";
import { Video } from "../Video";
import { withConditionalVisibility } from "../../utils/conditions/withConditionalVisibility";

const cv = withConditionalVisibility;

export const viewerResolver = {
  Audio: cv(Audio),
  Automatic: cv(Container),
  Background,
  Button: cv(Button),
  ButtonList: cv(ButtonList),
  ConditionalContainer: cv(ConditionalContainer),
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
  Nav: cv(Nav),
  Spacer: cv(Spacer),
  Table: cv(Table),
  TableSection: cv(TableSection),
  TableRow: cv(TableRow),
  TableCell: cv(TableCell),
  Text: cv(Text),
  Video: cv(Video),
};
