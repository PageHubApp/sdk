// @ts-nocheck
import { ToolbarItem } from "../../ToolbarItem";

export const TypeInput = () => (
  <ToolbarItem propKey="tagName" type="select" label="Type" propType="component">
    <option value=""></option>
    <option value="span">span</option>
    <option value="article">article</option>
    <option value="section">section</option>
    <option value="header">header</option>
    <option value="footer">footer</option>
    <option value="main">main</option>
    <option value="nav">nav</option>
    <option value="aside">aside</option>
    <option value="div">div</option>
    <option value="p">p</option>
    <option value="h1">h1</option>
    <option value="h2">h2</option>
    <option value="h3">h3</option>
    <option value="h4">h4</option>
    <option value="h5">h5</option>
    <option value="h6">h6</option>
    <option value="Textfit">Full Width</option>
  </ToolbarItem>
);
