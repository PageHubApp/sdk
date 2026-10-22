import { test } from "node:test";
import assert from "node:assert/strict";
import { liquidizeBindings, rawRichBindings } from "./bindings";

test("a binding nested in a state key is dropped whole", () => {
  assert.equal(liquidizeBindings("<p>{{state.{{anchor.chat}}:assistantName}}</p>"), "<p></p>");
});
test("|| fallback becomes default; quoted-literal heads survive", () => {
  assert.equal(liquidizeBindings("{{ item.a || x }}"), "{{ item.a | default: 'x' }}");
  assert.equal(liquidizeBindings('{{ "a:b" | file_url }}'), '{{ "a:b" | file_url }}');
});
test("rich-text item fields get | raw; other fields and absent sets are untouched", () => {
  const rich = new Set(["richBody"]);
  assert.equal(rawRichBindings("<p>{{item.richBody}}</p>", rich), "<p>{{ item.richBody | raw }}</p>");
  assert.equal(rawRichBindings("{{item.title}}", rich), "{{item.title}}");
  assert.equal(rawRichBindings("{{item.richBody}}", undefined), "{{item.richBody}}");
});
test("a client-only state binding keeps its || fallback as the server text, else blanks", () => {
  assert.equal(liquidizeBindings("{{state.gp:score || 5}}"), "5");
  assert.equal(liquidizeBindings("{{state.gp:score || 'a b'}}"), "a b");
  assert.equal(liquidizeBindings("{{state.cart:open}}"), "");
});
