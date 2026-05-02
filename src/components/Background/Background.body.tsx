/** Pure body for Background. NO `@craftjs/core`. */
import { BaseSelectorProps } from "../selectors";

export const RUNTIME_VARS_BOOTSTRAP =
  "window.PageHub=window.PageHub||{_queue:[],setVar:function(k,v){this._queue.push([k,v])},getVar:function(){}};";

export interface NamedColor {
  name: string;
  color: string;
}

export interface ContainerProps extends BaseSelectorProps {
  activeTab?: number;
  "data-renderer"?: boolean;
  theme?: {
    palette?: NamedColor[];
    darkPalette?: NamedColor[];
    darkModeEnabled?: boolean;
    styleGuide?: Record<string, any>;
    typography?: any[];
  };
  pageMedia?: Array<{
    id: string;
    type: string;
    uploadedAt: number;
    componentId?: string;
  }>;
  savedComponents?: Array<{
    rootNodeId: string;
    nodes: string;
    name: string;
  }>;
  company?: {
    name?: string;
    tagline?: string;
    type?: string;
    location?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  brandingCommitted?: boolean;
  integrations?: Record<string, Record<string, string>>;
  redirects?: Array<{ from: string; to: string; permanent?: boolean }>;
}
