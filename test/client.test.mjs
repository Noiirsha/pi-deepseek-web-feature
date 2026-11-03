import { test } from "node:test";
import assert from "node:assert/strict";
import { search, fetchPage, formatSearch, MISSING_KEY } from "../src/client.ts";

test("missing credentials instruct users to configure the DeepSeek provider, without HTTP", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("must not send HTTP"); };
  try {
    for (const call of [() => search({getApiKeyForProvider: async () => undefined}, {query: "广东江门天气如何"}),
      () => fetchPage({getApiKeyForProvider: async () => ""}, {url: "https://example.com"})]) {
      await assert.rejects(call, {message: MISSING_KEY});
    }
  } finally { globalThis.fetch = original; }
});

test("official auth, search defaults, bounded excerpts, fetch slicing and actionable errors", async () => {
  const original = globalThis.fetch;
  const calls = [];
  let response = {results: [{title: "江门天气", url: "https://example.com/weather", summary: "晴"}]};
  let status = 200;
  const credentials = {getApiKeyForProvider: async provider => {assert.equal(provider, "deepseek"); return "test-secret";}};
  globalThis.fetch = async (url, init) => {
    calls.push({url, init});
    return new Response(JSON.stringify(response), {status});
  };
  try {
    const result = await search(credentials, {query: "广东江门天气如何"});
    assert.equal(calls[0].url, "https://api.deepseek.com/v1/tools/search");
    assert.equal(calls[0].init.headers.Authorization, "Bearer test-secret");
    assert.equal(calls[0].init.redirect, "error");
    assert.deepEqual(JSON.parse(calls[0].init.body), {query: "广东江门天气如何", count: 5, need_content: false});
    assert.match(formatSearch(result), /https:\/\/example.com\/weather/);
    assert.match(formatSearch({query: "q", results: [{title: "t", url: "u", content: "x".repeat(60000)}]}), /Truncated/);
    response = {title: "Page", content: "abcdefghij"};
    const page = await fetchPage(credentials, {url: "https://example.com", offset: 2, limit: 3});
    assert.equal(page.content, "cde"); assert.equal(page.nextOffset, 5); assert.equal(page.totalCharacters, 10);
    assert.deepEqual(JSON.parse(calls[1].init.body), {url: "https://example.com"});
    status = 401; response = {error: {message: "test-secret"}};
    await assert.rejects(() => search(credentials, {query: "q"}), error => /provider/.test(error.message) && !error.message.includes("test-secret"));
    const before = calls.length;
    await assert.rejects(() => search(credentials, {query: " "}));
    await assert.rejects(() => search(credentials, {query: "q", count: 51}));
    await assert.rejects(() => fetchPage(credentials, {url: "https://user:pass@example.com"}));
    await assert.rejects(() => fetchPage(credentials, {url: "file:///etc/passwd"}));
    assert.equal(calls.length, before);
    const abort = new AbortController(); abort.abort();
    await assert.rejects(() => search(credentials, {query: "q"}, abort.signal));
    assert.equal(calls.length, before);
    status = 200; response = {results: "wrong"};
    await assert.rejects(() => search(credentials, {query: "q"}), /invalid search response/);
  } finally { globalThis.fetch = original; }
});
