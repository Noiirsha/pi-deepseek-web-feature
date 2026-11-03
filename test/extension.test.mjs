import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

test("Pi loader registers both tools; missing Key returns an actionable tool error", {skip: !process.env.PI_NODE_MODULES}, async () => {
  const base = resolve(process.env.PI_NODE_MODULES, "@earendil-works/pi-coding-agent/dist");
  const { loadExtensions } = await import(pathToFileURL(resolve(base, "core/extensions/loader.js")));
  const root = fileURLToPath(new URL("../", import.meta.url));
  const loaded = await loadExtensions([resolve(root, "index.ts")], root);
  assert.deepEqual(loaded.errors, []);
  const tools = loaded.extensions[0].tools;
  assert.deepEqual([...tools.keys()], ["deepseek_web_search", "deepseek_web_fetch"]);
  const ctx = {modelRegistry: {getApiKeyForProvider: async () => undefined}};
  for (const [name, params] of [["deepseek_web_search", {query: "天气"}], ["deepseek_web_fetch", {url: "https://example.com"}]]) {
    const result = await tools.get(name).definition.execute("test", params, undefined, undefined, ctx);
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /请先在 Pi 中配置 DeepSeek provider/);
  }
});
