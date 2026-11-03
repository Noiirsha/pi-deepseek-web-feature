# 验证记录

## 2026-11-03

- Node.js 24.22.1、Pi 1.4.0。
- `PI_NODE_MODULES=/Users/noiirsha/.pi/agent/install/releases/1.4.0/node_modules npm test`：3 个测试全部通过，包含真实 Pi 扩展加载器、两个工具注册、缺失凭据提示、HTTP 参数与鉴权、401、输入校验、预先取消、响应校验和正文分段。
- 通过 `scripts/live-test.mjs` 加载扩展并执行真实搜索工具，从 Pi 的 ModelRegistry 解析官方 `deepseek` 凭据，没有直接读取或输出 Key。
- 搜索词：`广东江门 2026年11月3日 天气如何`，`count: 5`，未要求正文。
- 返回 5 条结果：中央气象台、东方天气、墨迹天气预报、和风天气、墨迹天气实况。中央气象台来源为 https://www.nmc.cn/publish/forecast/AGD/jiangmen.html ，返回内容标注 12:55 更新、28℃，当天预报晴、25–29℃。
- 仅发出一次成功的真实 Search 请求；Fetch 仅进行模拟验证，没有发起付费 Fetch 请求。
- 测试使用本地 `127.0.0.1:7890` 代理，没有验证直连环境的连通性。
- 首次在受限开发沙箱中运行时，Pi 无法创建 `auth.json.lock`，其凭据接口返回无可用 Key；允许 Pi 正常创建临时凭据锁后，真实搜索成功。未修改用户凭据或 Pi 全局设置。

天气内容是本次服务返回的快照，不是持续更新的预报。
