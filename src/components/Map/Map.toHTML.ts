import { ariaAttrs, handlerAttrs, staticClasses, tag, type ToHTMLFn } from "../../utils/staticHtml";
import { dashArrayFor, parseLatLngList } from "../MapPath/parsePath";
import { buildStaticMapPlan, MARKER_COLOR, PATH_COLOR, TILE_SIZE, type StaticMapPath } from "./tiles";

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

  const childPaths = childIds
    .map(cid => {
      const c = ctx.nodes[cid];
      const name =
        typeof c?.type === "string" ? c.type : c?.type?.resolvedName;
      if (!c || name !== "MapPath") return null;
      const pts = parseLatLngList(c.props?.path);
      if (pts.length < 2) return null;
      return {
        id: cid,
        points: pts,
        color: c.props?.color || PATH_COLOR,
        weight: Number(c.props?.weight) || 4,
        opacity: c.props?.opacity == null ? 1 : Number(c.props.opacity),
        dashed: c.props?.dashed !== false,
        title: c.props?.title || "",
        label: c.props?.label || "",
      };
    })
    .filter(Boolean) as StaticMapPath[];

  const hasLocation = lat !== 0 || lng !== 0;
  const filterStyle = grayscale ? "filter: grayscale(1);" : "";

  const config = {
    lat, lng, zoom, type, tileStyle,
    grayscale: !!grayscale,
    points: childPoints,
    paths: childPaths,
  };

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

  // Mirrors StaticMapGrid.tsx — real tiles at native size, grid centred on the
  // requested coordinate. All positioning is inline so the static export never
  // depends on arbitrary Tailwind classes being compiled into the page CSS.
  const inner = (() => {
    if (!hasLocation) return "";
    const plan = buildStaticMapPlan({
      lat, lng, zoom, tileStyle,
      width: props.staticWidth,
      height: props.staticHeight,
      points: type === "background" ? [] : childPoints,
      paths: type === "background" ? [] : childPaths,
    });

    const tiles = plan.tiles
      .map((t, i) =>
        tag("img", {
          src: t.url,
          alt: i === 0 ? title || `Map at ${lat}, ${lng}` : "",
          "aria-hidden": i === 0 ? undefined : "true",
          loading: "lazy",
          draggable: "false",
          style:
            `position:absolute;left:${t.left}px;top:${t.top}px;` +
            `width:${TILE_SIZE}px;height:${TILE_SIZE}px;max-width:none;user-select:none;`,
        })
      )
      .join("");

    // Route lines sit under the markers, in the same projected px frame as the
    // tile grid, so static export matches StaticMapGrid exactly.
    const routes = plan.paths.length
      ? tag(
          "svg",
          {
            width: String(plan.width),
            height: String(plan.height),
            viewBox: `0 0 ${plan.width} ${plan.height}`,
            "aria-hidden": "true",
            style: "position:absolute;left:0;top:0;pointer-events:none;",
          },
          plan.paths
            .map(p =>
              tag("polyline", {
                points: p.points.map(pt => `${pt.left},${pt.top}`).join(" "),
                fill: "none",
                stroke: p.color,
                "stroke-width": String(p.weight),
                "stroke-opacity": String(p.opacity),
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "stroke-dasharray": p.dashed ? dashArrayFor(p.weight) : undefined,
              }, "")
            )
            .join("") +
            // Step badges — same disc + glyph as StaticMapGrid.
            plan.paths
              .flatMap(p =>
                p.badges.map(b => {
                  const rx = Math.max(11, b.label.length * 4 + 8);
                  return (
                    tag("rect", {
                      x: String(b.left - rx), y: String(b.top - 11),
                      width: String(rx * 2), height: "22", rx: "11",
                      fill: p.color,
                      stroke: "var(--color-base-100)", "stroke-width": "2",
                    }, "") +
                    tag("text", {
                      x: String(b.left), y: String(b.top), dy: "4.5",
                      "text-anchor": "middle",
                      fill: "var(--color-base-100)",
                      "font-size": "12", "font-weight": "800", "font-family": "inherit",
                    }, b.label)
                  );
                })
              )
              .join("") +
            // Halo pass then fill pass — mirrors StaticMapGrid so a label stays
            // readable over dark tiles in the exported HTML too.
            plan.paths
              .filter(p => p.label)
              .map(p => {
                const base = {
                  x: String(p.labelAt.left),
                  y: String(p.labelAt.top),
                  dy: "-10",
                  "text-anchor": "middle",
                  "font-size": "13",
                  "font-weight": "700",
                  "font-family": "inherit",
                };
                return (
                  tag("text", {
                    ...base,
                    stroke: "var(--color-base-100)",
                    "stroke-width": "4",
                    "stroke-linejoin": "round",
                  }, p.label) +
                  tag("text", { ...base, fill: p.color }, p.label)
                );
              })
              .join("")
        )
      : "";

    const markers = plan.markers
      .map(m =>
        tag("div", {
          title: m.title || undefined,
          style:
            `position:absolute;left:${m.left}px;top:${m.top}px;width:12px;height:12px;` +
            `border-radius:9999px;background:${MARKER_COLOR};` +
            `transform:translate(-50%,-50%);box-shadow:0 1px 3px rgba(0,0,0,.35);`,
        }, "")
      )
      .join("");

    const grid = tag(
      "div",
      {
        style:
          `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);` +
          `width:${plan.width}px;height:${plan.height}px;`,
      },
      tiles + routes + markers
    );

    return tag(
      "div",
      { style: `position:relative;width:100%;height:100%;overflow:hidden;${filterStyle}` },
      grid
    );
  })();

  return tag("div", attrs, inner);
};
