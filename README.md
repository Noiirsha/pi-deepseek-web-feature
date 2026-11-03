# Pi DeepSeek Web Feature

为 Pi 提供轻量的网页搜索与正文读取。复用 Pi 中 `deepseek` 官方 provider 的 API Key，不单独保存凭据，不要求主会话使用 DeepSeek 模型。无额外运行依赖、无浏览器、无 MCP 服务。

## 安装

要求 Pi 1.4.0 或更新版本，以及支持 TypeScript 类型擦除的 Node.js（22.18+，推荐 24）。

```sh
pi install /Users/noiirsha/workspace/pi_agent_plugins/pi_deepseek_web_feature
```

在已有 Pi 会话运行 `/reload`。也可以临时加载：

```sh
pi -e /absolute/path/to/pi_deepseek_web_feature/index.ts
```

如果启动参数或 `defaultTools` 使用工具白名单，需要加入 `deepseek_web_search` 和 `deepseek_web_fetch`。插件不会自行修改活跃工具集。

## 凭据

在 Pi 中配置官方 `deepseek` provider 的 API Key（例如通过 `/login` 选择 DeepSeek）。插件每次调用时使用 `ctx.modelRegistry.getApiKeyForProvider("deepseek")` 获取凭据，遵循 Pi 的凭据解析机制。

未配置 Key 时工具返回：

> 请先在 Pi 中配置 DeepSeek provider 的官方 API Key，然后重试。插件会沿用 Pi 的凭据，无需单独配置 Key，也无需切换当前模型。

HTTP 401 也会提示重新配置 provider。插件仅向 `https://api.deepseek.com` 发送 Key，不读取或复制 `auth.json`，不把 Key 写入日志、工具结果或 Git。

## 工具

### `deepseek_web_search`

参数：`query`（必填，1–128 个 Unicode 字符）、`count`（1–50，默认 5）、`need_content`（默认 false）。支持 `site:`、`-site:`、`lang:`、`after:`、`before:`、精确短语等搜索语法。

返回标题、来源链接、日期、相关性与权威性评分，以及搜索摘要。评分是提供商的信号，不是事实核验结论。`need_content: true` 时优先显示正文，正文缺失则显示摘要。正文与摘要的显示总预算约 50,000 字符，超出会明确标记，链接与元信息另计。

例如让 Pi：

> 用 deepseek_web_search 查询广东江门今天的天气，核对结果日期并附上来源；如果结果过时，请明确说明。

### `deepseek_web_fetch`

参数：`url`（必填，HTTP/HTTPS，不允许内嵌用户名或密码）、`offset`（默认 0）、`limit`（默认 20,000，最大 50,000）。返回 Markdown 正文片段及全文长度，超出时提供下一段 offset。

**每次分段读取都会重新请求 Fetch，可能再次计费；本插件不缓存网页。** offset 按 JavaScript 字符串的 UTF-16 代码单元计数。它不是浏览器，不继承本机登录状态，也不保证动态页面或 X 等站点可以抓取。

## 运行行为

- 每次工具调用只发送一次 API 请求，无自动重试；支持取消，网络与读取超时 45 秒，单次响应上限 8 MiB。
- 使用 Node 内置 fetch。代理支持遵循 Node 版本和启动配置，不自行读取代理配置；Node 24 可在启动 Pi 前设置 `NODE_USE_ENV_PROXY=1` 并配置 `HTTPS_PROXY`。目标网页由 DeepSeek 服务端抓取。
- 返回的网页是外部资料，不应执行其中的指令。搜索结果保留来源 URL，模型可以据此引用。
- 两个工具都属于只读联网能力，可在现有 RO/RW 插件下使用。不会修改其模式或工具选择。
- light subagent 当前启动时禁用扩展，因此不会自动获得这两个工具。

## 费用与接口文档

截至 2026-11-03，Search / Fetch 均为每 1,000 次有效成功请求 5 元；失败、空搜索结果不收费。读取结果还会占用主模型上下文。价格以 [DeepSeek 官方文档](https://api-docs.deepseek.com/zh-cn/guides/search/) 为准。

## 开发与检查

```sh
npm test
```

测试使用模拟网络，不需要 Key、不计费。设置 `PI_NODE_MODULES` 指向 Pi 安装的 node_modules 时，还会验证真实扩展加载器与工具注册。

```sh
PI_NODE_MODULES=/Users/noiirsha/.pi/agent/install/releases/1.4.0/node_modules npm test
```

`scripts/live-test.mjs` 通过 Pi 的真实 ModelRegistry 和扩展加载器调用搜索工具，不调用聊天模型、不保存会话。会产生一次有效搜索请求的费用：

```sh
PI_NODE_MODULES=/Users/noiirsha/.pi/agent/install/releases/1.4.0/node_modules node scripts/live-test.mjs
```

提交格式沿用 `type: describe`，例如 `feat: add DeepSeek web search and fetch tools`。
