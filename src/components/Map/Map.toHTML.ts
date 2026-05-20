import { ariaAttrs, handlerAttrs, staticClasses, tag, type ToHTMLFn } from "../../utils/staticHtml";

const TILE_URLS: Record<string, string> = {
  osm: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  "cartodb-positron": "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "cartodb-dark": "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  "cartodb-voyager": "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
};

function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

function getStaticTileUrl(lat: number, lng: number, zoom: number, tileStyle: string) {
  const { x, y } = latLngToTile(lat, lng, zoom);
  const url = TILE_URLS[tileStyle] || TILE_URLS.osm;
  return url.replace("{z}", String(zoom)).replace("{x}", String(x)).replace("{y}", String(y));
}

export const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const {
    lat = 51.505,
    lng = -0.09,
    zoom = 13,
    type = "interactive",
    tileStyle = "osm",
    grayscale = false,
    title = "",
  } = props;

  const cls = `overflow-hidden ${staticClasses(props, ctx) || ""}`.trim();
  cls.split(/\s+/).forEach(c => c && ctx.classes.add(c));

  // Collect MapPoint children from the serialized tree (mirrors RenderTree.tsx).
  const parentId = ctx.renderingNodeId;
  const parent = parentId ? ctx.nodes[parentId] : null;
  const childIds: string[] = parent?.nodes || [];
  const childPoints = childIds
    .map(cid => {
      const c = ctx.nodes[cid];
      const name =
        typeof c?.type === "string" ? c.type : c?.type?.resolvedName;
      if (!c || name !== "MapPoint") return null;
      return {
        id: cid,
        lat: parseFloat(c.props?.lat) || 0,
        lng: parseFloat(c.props?.lng) || 0,
        title: c.props?.title || "",
        description: c.props?.description || "",
      };
    })
    .filter(Boolean) as Array<{ id: string; lat: number; lng: number; title: string; description: string }>;

  const hasLocation = lat !== 0 || lng !== 0;
  const filterStyle = grayscale ? "filter: grayscale(1)" : "";
  const tileUrl = getStaticTileUrl(lat, lng, zoom, tileStyle);

  const config = { lat, lng, zoom, type, tileStyle, grayscale: !!grayscale, points: childPoints };

  const attrs: Record<string, any> = {
    class: cls || undefined,
    role: "region",
    "aria-label": title || "Map",
    "data-ph-map": JSON.stringify(config),
    ...ariaAttrs(props),
    ...handlerAttrs(props),
  };
  if (props.attrs && typeof props.attrs === "object") {
    for (const [k, v] of Object.entries(props.attrs)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        attrs[k] = v as any;
      }
    }
  }

  const inner = hasLocation
    ? tag("img", {
        src: tileUrl,
        alt: title || `Map at ${lat}, ${lng}`,
        class: "size-full object-cover",
        loading: "lazy",
        style: filterStyle || undefined,
      })
    : "";

  return tag("div", attrs, inner);
};
