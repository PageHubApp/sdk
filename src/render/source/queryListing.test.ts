/**
 * A Data node driven by the visitor's URL (`stateInputs: { category: "url:category", page: "url:page" }`) converts to
 * the host's `query['<slug>?<options>&in=<params>']` global, its totals to `data-state-seed`, and the element is
 * marked for the runtime's in-place refetch (`data-refetch`). Any other binding keeps its `collections.<slug>` loop.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { dataSource, queryListingKey } from "./dataSource";
import { renderNodeToSource } from "./toSource";
import type { StaticRenderContext } from "../../utils/staticHtml";

const title = { type: "Text", props: { tagName: "h3", text: "{{item.title}}" }, nodes: [] };

test("the key: the binding's own options, the URL params it reads, the catalog's facet selections", () => {
  assert.deepEqual(
    queryListingKey({
      provider: "stripe",
      collection: "products",
      limit: 12,
      sort: "newest",
      filter: { featured: "true", slug: "{{params.slug}}" },
      stateInputs: { q: "url:q", category: "url:category", page: "url:page", auth: "auth:status", session: "url:session_id" },
    }),
    { key: "products?limit=12&sort=newest&filter.featured=true&in=q,category,page,session:session_id,facet.*", params: ["q", "category", "page", "session_id", "facet.*"] }
  );
  assert.deepEqual(queryListingKey({ provider: "collection", collection: "posts", stateInputs: { page: "url:page" } }), { key: "posts?in=page", params: ["page"] });
  assert.equal(queryListingKey({ provider: "collection", collection: "posts" }), null, "no stateInputs: a plain loop");
  assert.equal(queryListingKey({ provider: "collection", collection: "posts", stateInputs: { auth: "auth:status" } }), null, "no URL input");
  assert.equal(queryListingKey({ provider: "stripe", collection: "products.facets", stateInputs: { q: "url:q" } }), null, "a facet feed keeps its fold");
});

test("the listing: rows and meta assigned ahead of the element, totals seeded, the element marked for refetch", () => {
  const nodes = {
    grid: {
      type: "Data",
      props: {
        className: "grid",
        dataSource: { provider: "collection", collection: "posts", limit: 6, stateInputs: { page: "url:page", category: "url:category" }, publishStateKeys: { totalPages: "posts:pages", count: "posts:count" } },
      },
      nodes: ["t1"],
    },
    t1: title,
  };
  const out = renderNodeToSource("grid", nodes as any, { view: "desktop" } as unknown as StaticRenderContext);
  assert.equal(
    out,
    `{% assign rows_grid = query['posts?limit=6&in=page,category'] %}{% assign meta_grid = query_meta['posts?limit=6&in=page,category'] %}` +
      `<div class="grid" id="ph-list-grid" data-refetch="page,category" data-state-seed="posts:pages={{ meta_grid.totalPages }};posts:count={{ rows_grid | size }}">` +
      `{% for item in rows_grid %}<h3>{{item.title}}</h3>{% endfor %}</div>`
  );
});

test("a route-param filter is applied in Liquid after the read; a plain binding is unchanged", () => {
  const ctx = { view: "desktop", nodes: { t1: title }, repeaterChildIds: ["t1"], renderingNodeId: "d1" } as unknown as StaticRenderContext;
  dataSource({ dataSource: { provider: "collection", collection: "posts", filter: { tag: "{{params.tag}}" }, stateInputs: { page: "url:page" } } }, "", ctx);
  assert.match(((ctx as any).pre as string[]).join(""), /query\['posts\?in=page'\] \| where: 'tag', request\.params\.tag %\}/);
  const plain = dataSource({ dataSource: { provider: "collection", collection: "posts" } }, "", { view: "desktop", nodes: { t1: title }, repeaterChildIds: ["t1"] } as unknown as StaticRenderContext);
  assert.match(plain, /\{% for item in collections\.posts %\}/);
});
