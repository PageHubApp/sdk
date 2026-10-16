/**
 * A client refetch carries the binding's own query under the live inputs.
 *
 *   pnpm test:data-source-scope
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { clientFetchOptions, applyDataSourceScope } from "./dataSourceScope";

test("clientFetchOptions: the binding's filter, sort, paging and facet keys ride along", () => {
  assert.deepEqual(
    clientFetchOptions({
      collection: "products",
      filter: { collection: "fashion", subcategory: "", demo: 1 as any },
      sort: "price_asc",
      limit: 12,
      offset: 0,
      facetKeys: "colors,sizes",
    }),
    { filter: { collection: "fashion" }, sort: "price_asc", limit: 12, facetKeys: "colors,sizes" }
  );
});

test("clientFetchOptions: live inputs win; blank inputs don't clear the binding's values", () => {
  assert.deepEqual(clientFetchOptions({ sort: "newest", limit: 12 }, { sort: "alpha", page: "2", q: "" }), {
    sort: "alpha",
    limit: 12,
    page: "2",
  });
  assert.deepEqual(clientFetchOptions({}), {});
});

test("applyDataSourceScope: filters product rows, leaves aggregate feeds alone", () => {
  const rows = [
    { id: "a", metadata: { collection: "fashion" } },
    { id: "b", metadata: { collection: "plants" } },
  ];
  assert.deepEqual(
    applyDataSourceScope(rows, { collection: "products", filter: { collection: "fashion" } })?.map(r => r.id),
    ["a"]
  );
  assert.equal(applyDataSourceScope(rows, { collection: "products.facets", filter: { collection: "fashion" } })?.length, 2);
});
