import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

if (!process.env.PI_NODE_MODULES) throw new Error("Set PI_NODE_MODULES to the node_modules directory of your Pi installation.");
const base = resolve(process.env.PI_NODE_MODULES, "@earendil-works/pi-coding-agent/dist");
const { ModelRuntime, ModelRegistry } = await import(pathToFileURL(resolve(base, "index.js")));
const { loadExtensions } = await import(pathToFileURL(resolve(base, "core/extensions/loader.js")));
const root = fileURLToPath(new URL("../", import.meta.url));
const runtime = await ModelRuntime.create({allowModelNetwork: false});
const registry = new ModelRegistry(runtime);
const loaded = await loadExtensions([resolve(root, "index.ts")], root);
if (loaded.errors.length) throw new Error("Could not load DeepSeek web extension.");
const tool = loaded.extensions[0].tools.get("deepseek_web_search").definition;
const today = new Intl.DateTimeFormat("sv-SE", {timeZone: "Asia/Shanghai"}).format(new Date());
const result = await tool.execute("live-weather-test", {
  query: `广东江门 ${today} 天气如何`, count: 5,
}, undefined, undefined, {modelRegistry: registry});
console.log(result.content.map(item => item.type === "text" ? item.text : "").join("\n"));
if (result.isError) process.exitCode = 1;
