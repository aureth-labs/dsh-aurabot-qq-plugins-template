# 示例：探活

演示不带任何能力（`capabilities: []`）的插件怎么写：一个 AI 工具 + 一个面板路由。

- 工具 `ping_now`：返回服务器时间和模块运行时长
- 路由 `/ping`：面板上的「测一下」按钮调它

改 `package.json` 的 `name` 为 `你的GitHub用户名/ping`。
